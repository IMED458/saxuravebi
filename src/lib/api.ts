/**
 * Client-side data API backed by Firestore.
 *
 * This module preserves the exact method surface the UI used to call against
 * the Express backend, but every operation now runs in the browser against the
 * Firestore-backed `store`. All business logic (weighted-average cost, batch
 * deduction, stock movements, customer/supplier debt, cash transactions,
 * atomic-style multi-write operations) is ported 1:1 from the old server.
 */
import bcrypt from 'bcryptjs';
import { store } from './store';
import {
  User,
  Product,
  Category,
  Unit,
  Supplier,
  Customer,
  Shift,
  Sale,
  SaleItem,
  Purchase,
  ProductBatch,
  ReturnDoc,
  Expense,
  CashTransaction,
  AuditLog,
  Settings,
  Quote,
  Order,
  StockMovement
} from '../types';

async function ready() {
  await store.init();
  return store.getData();
}

const uid = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

const round2 = (n: number) => Math.round(n * 100) / 100;

function stripHash(u: User): User {
  const copy = { ...u };
  delete copy.passwordHash;
  return copy;
}

export const api = {
  // ---------------------------------------------------------------- AUTH ----
  async login(username: string, password: string): Promise<{ user: User }> {
    const data = await ready();
    if (!username || !password) {
      throw new Error('გთხოვთ შეიყვანოთ მომხმარებლის სახელი და პაროლი');
    }
    const user = data.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.status === 'active'
    );
    if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new Error('არასწორი მომხმარებლის სახელი ან პაროლი');
    }
    await store.logAudit(user.id, `${user.firstName} ${user.lastName}`, 'სისტემაში შესვლა', 'ავტორიზაცია წარმატებით გაიარა');
    return { user: stripHash(user) };
  },

  // --------------------------------------------------------------- USERS ----
  async getUsers(): Promise<User[]> {
    const data = await ready();
    return data.users.map(stripHash);
  },

  async createUser(userData: any): Promise<User> {
    const data = await ready();
    const { firstName, lastName, position, phone, username, password, role, permissions, comment, actorName, actorId } = userData;
    if (!username || !password || !firstName || !lastName) {
      throw new Error('შევსება სავალდებულოა: სახელი, გვარი, მომხმარებელი, პაროლი');
    }
    if (data.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('ამ მომხმარებლის სახელით უკვე არსებობს ჩანაწერი');
    }
    const newUser: User = {
      id: uid('user'),
      firstName,
      lastName,
      position: position || 'თანამშრომელი',
      phone: phone || '',
      username,
      passwordHash: bcrypt.hashSync(password, 10),
      role: role || 'cashier',
      permissions: permissions && permissions.length ? permissions : ['sale'],
      status: 'active',
      comment,
      createdAt: new Date().toISOString()
    };
    await store.set('users', newUser);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'მომხმარებლის შექმნა', `შეიქმნა მომხმარებელი ${username}`);
    return stripHash(newUser);
  },

  async updateUser(id: string, userData: any): Promise<User> {
    const data = await ready();
    const user = data.users.find((u) => u.id === id);
    if (!user) throw new Error('მომხმარებელი ვერ მოიძებნა');
    const { firstName, lastName, position, phone, username, role, permissions, status, comment, newPassword, actorName, actorId } = userData;

    if (username && username.toLowerCase() !== user.username.toLowerCase()) {
      if (data.users.some((u) => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('ეს მომხმარებლის სახელი უკვე დაკავებულია');
      }
      user.username = username;
    }
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (position !== undefined) user.position = position;
    if (phone !== undefined) user.phone = phone;
    if (role) user.role = role;
    if (permissions) user.permissions = permissions;
    if (status) user.status = status;
    if (comment !== undefined) user.comment = comment;
    if (newPassword) user.passwordHash = bcrypt.hashSync(newPassword, 10);

    await store.set('users', user);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'მომხმარებლის რედაქტირება', `განახლდა მომხმარებელი ${user.username}`);
    return stripHash(user);
  },

  // ------------------------------------------------------------ PRODUCTS ----
  async getProducts(): Promise<Product[]> {
    const data = await ready();
    return data.products;
  },

  async createProduct(payload: any): Promise<Product> {
    const data = await ready();
    const {
      name, code, categoryId, unit, sellingPrice, minStock, status, barcode, sku, brand,
      supplierId, color, size, thickness, length, width, weight, description, note, image,
      gallery, initialQuantity, initialStock, initialCostPrice, actorName, actorId
    } = payload;

    if (!name || !code || !categoryId || !unit || sellingPrice === undefined) {
      throw new Error('შეავსეთ სავალდებულო ველები: დასახელება, კოდი, კატეგორია, ერთეული, გასაყიდი ფასი');
    }
    if (data.products.some((p) => p.code.toLowerCase() === code.trim().toLowerCase())) {
      throw new Error('ამ კოდით პროდუქტი უკვე არსებობს!');
    }

    const nowIso = new Date().toISOString();
    const newProd: Product = {
      id: uid('prod'),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      categoryId,
      unit,
      sellingPrice: Number(sellingPrice),
      minStock: Number(minStock) || 0,
      status: status || 'active',
      barcode: barcode?.trim(),
      sku: sku?.trim(),
      brand: brand?.trim(),
      supplierId,
      color, size, thickness, length, width, weight, description, note, image,
      gallery: gallery || [],
      currentStock: 0,
      averageCostPrice: 0,
      lastCostPrice: 0,
      totalSold: 0,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const initQty = Number(initialQuantity ?? initialStock) || 0;
    const initCost = Number(initialCostPrice) || 0;
    if (initQty > 0) {
      newProd.currentStock = initQty;
      newProd.averageCostPrice = initCost;
      newProd.lastCostPrice = initCost;

      const batch: ProductBatch = {
        id: uid('batch'),
        productId: newProd.id,
        receivedQuantity: initQty,
        remainingQuantity: initQty,
        unitCost: initCost,
        receivedDate: nowIso,
        documentNo: 'INIT-STOCK'
      };
      await store.set('productBatches', batch);

      const mov: StockMovement = {
        id: uid('mov'),
        productId: newProd.id,
        productName: newProd.name,
        changeQuantity: initQty,
        previousStock: 0,
        newStock: initQty,
        type: 'purchase',
        referenceNo: 'INIT-STOCK',
        note: 'საწყისი მარაგის დამატება',
        date: nowIso,
        userId: actorId || 'system',
        userName: actorName || 'სისტემა'
      };
      data.stockMovements.unshift(mov);
      await store.set('stockMovements', mov);
    }

    await store.set('products', newProd);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'პროდუქტის დამატება', `დაემატა ${newProd.name} (${newProd.code})`);
    return newProd;
  },

  async updateProduct(id: string, payload: any): Promise<Product> {
    const data = await ready();
    const prod = data.products.find((p) => p.id === id);
    if (!prod) throw new Error('პროდუქტი ვერ მოიძებნა');
    const {
      name, code, categoryId, unit, sellingPrice, minStock, status, barcode, sku, brand,
      supplierId, color, size, thickness, length, width, weight, description, note, image,
      gallery, actorName, actorId, reason
    } = payload;

    if (code && code.trim().toUpperCase() !== prod.code) {
      if (data.products.some((p) => p.id !== prod.id && p.code.toLowerCase() === code.trim().toLowerCase())) {
        throw new Error('ეს კოდი უკვე დაკავებულია სხვა პროდუქტის მიერ');
      }
      prod.code = code.trim().toUpperCase();
    }

    if (sellingPrice !== undefined && Number(sellingPrice) !== prod.sellingPrice) {
      const oldPrice = prod.sellingPrice;
      const newPrice = Number(sellingPrice);
      prod.sellingPrice = newPrice;
      const ph = {
        id: uid('ph'),
        productId: prod.id,
        oldPrice,
        newPrice,
        changedBy: actorId || 'system',
        changedByName: actorName || 'ადმინი',
        date: new Date().toISOString(),
        reason: reason || 'ძირითადი ფასის განახლება'
      };
      data.priceHistories.unshift(ph);
      await store.set('priceHistories', ph);
    }

    if (name) prod.name = name.trim();
    if (categoryId) prod.categoryId = categoryId;
    if (unit) prod.unit = unit;
    if (minStock !== undefined) prod.minStock = Number(minStock);
    if (status) prod.status = status;
    if (barcode !== undefined) prod.barcode = barcode;
    if (sku !== undefined) prod.sku = sku;
    if (brand !== undefined) prod.brand = brand;
    if (supplierId !== undefined) prod.supplierId = supplierId;
    if (color !== undefined) prod.color = color;
    if (size !== undefined) prod.size = size;
    if (thickness !== undefined) prod.thickness = thickness;
    if (length !== undefined) prod.length = length;
    if (width !== undefined) prod.width = width;
    if (weight !== undefined) prod.weight = weight;
    if (description !== undefined) prod.description = description;
    if (note !== undefined) prod.note = note;
    if (image !== undefined) prod.image = image;
    if (gallery !== undefined) prod.gallery = gallery;
    prod.updatedAt = new Date().toISOString();

    await store.set('products', prod);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'პროდუქტის განახლება', `განახლდა პროდუქტი ${prod.code}`);
    return prod;
  },

  async addStock(id: string, payload: any): Promise<{ product: Product; batch: ProductBatch }> {
    const data = await ready();
    const prod = data.products.find((p) => p.id === id);
    if (!prod) throw new Error('პროდუქტი ვერ მოიძებნა');
    const { quantity, unitCost, costPrice, supplierId, documentNo, docNumber, comment, actorId, actorName } = payload;
    const qty = Number(quantity);
    const cost = Number(unitCost ?? costPrice);
    const docNo = documentNo ?? docNumber;
    if (!qty || qty <= 0 || cost === undefined || cost < 0) {
      throw new Error('გთხოვთ მიუთითოთ ვალიდური რაოდენობა და ასაღები ფასი');
    }

    const prevStock = prod.currentStock;
    const newStock = prevStock + qty;
    const totalCostValue = prevStock * prod.averageCostPrice + qty * cost;
    prod.currentStock = newStock;
    prod.averageCostPrice = round2(newStock > 0 ? totalCostValue / newStock : cost);
    prod.lastCostPrice = cost;
    prod.updatedAt = new Date().toISOString();

    const supplier = data.suppliers.find((s) => s.id === supplierId);
    const batch: ProductBatch = {
      id: uid('batch'),
      productId: prod.id,
      receivedQuantity: qty,
      remainingQuantity: qty,
      unitCost: cost,
      receivedDate: new Date().toISOString(),
      supplierId: supplierId || undefined,
      supplierName: supplier ? supplier.name : undefined,
      documentNo: docNo || undefined
    };
    const mov: StockMovement = {
      id: uid('mov'),
      productId: prod.id,
      productName: prod.name,
      changeQuantity: qty,
      previousStock: prevStock,
      newStock,
      type: 'purchase',
      referenceNo: docNo || 'INTAKE',
      note: comment || 'მარაგის დამატება',
      date: new Date().toISOString(),
      userId: actorId || 'admin',
      userName: actorName || 'ადმინი'
    };
    data.productBatches.push(batch);
    data.stockMovements.unshift(mov);

    await store.set('products', prod);
    await store.set('productBatches', batch);
    await store.set('stockMovements', mov);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'მარაგის შევსება', `დაემატა ${qty} ${prod.unit} ${prod.name}, ასაღები ფასი: ${cost} ₾`);
    return { product: prod, batch };
  },

  async bulkPriceUpdate(payload: any): Promise<{ updatedCount: number }> {
    const data = await ready();
    const { categoryId, percentage, mode, actorId, actorName } = payload;
    const pct = Number(percentage);
    if (!pct || pct <= 0) throw new Error('მიუთითეთ პროცენტი');

    let updatedCount = 0;
    const changed: Product[] = [];
    const histories: any[] = [];
    data.products.forEach((p) => {
      if (!categoryId || p.categoryId === categoryId) {
        const oldPrice = p.sellingPrice;
        const newPrice =
          mode === 'percent_increase'
            ? round2(oldPrice * (1 + pct / 100))
            : round2(oldPrice * (1 - pct / 100));
        if (newPrice !== oldPrice) {
          p.sellingPrice = newPrice;
          const ph = {
            id: uid('ph'),
            productId: p.id,
            oldPrice,
            newPrice,
            changedBy: actorId || 'admin',
            changedByName: actorName || 'ადმინი',
            date: new Date().toISOString(),
            reason: `ჯგუფური ფასის ცვლილება (${mode === 'percent_increase' ? '+' : '-'}${pct}%)`
          };
          data.priceHistories.unshift(ph);
          histories.push(ph);
          changed.push(p);
          updatedCount++;
        }
      }
    });
    await store.setMany('products', changed);
    await store.setMany('priceHistories', histories);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'ჯგუფური ფასის ცვლილება', `განახლდა ${updatedCount} პროდუქტი`);
    return { updatedCount };
  },

  // ----------------------------------------------------------- SUPPLIERS ----
  async getSuppliers(): Promise<Supplier[]> {
    const data = await ready();
    return data.suppliers;
  },

  async createSupplier(payload: any): Promise<Supplier> {
    const data = await ready();
    const { name, taxId, contactPerson, phone, address, bank, iban, comment, actorId, actorName } = payload;
    if (!name || !phone) throw new Error('სახელი და ტელეფონი სავალდებულოა');
    const newSup: Supplier = {
      id: uid('sup'),
      name: name.trim(),
      taxId: taxId?.trim(),
      contactPerson: contactPerson?.trim(),
      phone: phone.trim(),
      address: address?.trim(),
      bank: bank?.trim(),
      iban: iban?.trim(),
      comment: comment?.trim(),
      balance: 0,
      createdAt: new Date().toISOString()
    };
    await store.set('suppliers', newSup);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'მომწოდებლის შექმნა', `დაემატა ${newSup.name}`);
    return newSup;
  },

  async updateSupplier(id: string, payload: any): Promise<Supplier> {
    const data = await ready();
    const sup = data.suppliers.find((s) => s.id === id);
    if (!sup) throw new Error('მომწოდებელი ვერ მოიძებნა');
    const { name, taxId, contactPerson, phone, address, bank, iban, comment } = payload;
    if (name) sup.name = name.trim();
    if (taxId !== undefined) sup.taxId = taxId;
    if (contactPerson !== undefined) sup.contactPerson = contactPerson;
    if (phone) sup.phone = phone.trim();
    if (address !== undefined) sup.address = address;
    if (bank !== undefined) sup.bank = bank;
    if (iban !== undefined) sup.iban = iban;
    if (comment !== undefined) sup.comment = comment;
    await store.set('suppliers', sup);
    return sup;
  },

  async paySupplier(id: string, payload: any): Promise<Supplier> {
    const data = await ready();
    const sup = data.suppliers.find((s) => s.id === id);
    if (!sup) throw new Error('მომწოდებელი ვერ მოიძებნა');
    const { amount, method, comment, actorId, actorName } = payload;
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error('მიუთითეთ ვალიდური თანხა');
    sup.balance = Math.max(0, sup.balance - amt);
    const tx: CashTransaction = {
      id: uid('tx'),
      type: 'supplier_payment',
      amount: amt,
      method: method || 'cash',
      description: `მომწოდებლის გადახდა: ${sup.name}${comment ? ` (${comment})` : ''}`,
      date: new Date().toISOString(),
      userId: actorId || 'admin',
      userName: actorName || 'ადმინი'
    };
    data.cashTransactions.unshift(tx);
    await store.set('suppliers', sup);
    await store.set('cashTransactions', tx);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'მომწოდებლის გადახდა', `გადაეხადა ${amt} ₾ - ${sup.name}`);
    return sup;
  },

  // ----------------------------------------------------------- PURCHASES ----
  async getPurchases(): Promise<Purchase[]> {
    const data = await ready();
    return data.purchases;
  },

  async createPurchase(payload: any): Promise<Purchase> {
    const data = await ready();
    const { supplierId, documentNo, date, items, paidAmount, actorId, actorName } = payload;
    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error('აირჩიეთ მომწოდებელი და დაამატეთ პროდუქტები');
    }
    const supplier = data.suppliers.find((s) => s.id === supplierId);
    if (!supplier) throw new Error('მომწოდებელი ვერ მოიძებნა');

    const pDocNo = documentNo?.trim() || `PUR-${data.counters.purchase++}`;
    let totalAmount = 0;
    const purchaseItems: any[] = [];
    const changedProducts: Product[] = [];
    const newBatches: ProductBatch[] = [];
    const newMovements: StockMovement[] = [];

    for (const item of items) {
      const prod = data.products.find((p) => p.id === item.productId);
      if (!prod) continue;
      const qty = Number(item.quantity);
      const cost = Number(item.unitCost);
      const lineTotal = qty * cost;
      totalAmount += lineTotal;

      purchaseItems.push({
        id: uid('pitem'),
        purchaseId: '',
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        quantity: qty,
        unitCost: cost,
        total: lineTotal
      });

      const prevStock = prod.currentStock;
      const newStock = prevStock + qty;
      const totalCostVal = prevStock * prod.averageCostPrice + qty * cost;
      prod.currentStock = newStock;
      prod.averageCostPrice = round2(newStock > 0 ? totalCostVal / newStock : cost);
      prod.lastCostPrice = cost;
      prod.updatedAt = new Date().toISOString();
      changedProducts.push(prod);

      const batch: ProductBatch = {
        id: uid('batch'),
        productId: prod.id,
        receivedQuantity: qty,
        remainingQuantity: qty,
        unitCost: cost,
        receivedDate: date || new Date().toISOString(),
        supplierId: supplier.id,
        supplierName: supplier.name,
        documentNo: pDocNo
      };
      data.productBatches.push(batch);
      newBatches.push(batch);

      const mov: StockMovement = {
        id: uid('mov'),
        productId: prod.id,
        productName: prod.name,
        changeQuantity: qty,
        previousStock: prevStock,
        newStock,
        type: 'purchase',
        referenceNo: pDocNo,
        note: `შესყიდვა მომწოდებლისგან: ${supplier.name}`,
        date: date || new Date().toISOString(),
        userId: actorId || 'admin',
        userName: actorName || 'ადმინი'
      };
      data.stockMovements.unshift(mov);
      newMovements.push(mov);
    }

    const paid = Number(paidAmount) || 0;
    const balanceDue = Math.max(0, totalAmount - paid);
    const pStatus: 'paid' | 'partial' | 'unpaid' = paid >= totalAmount ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    const newPurchase: Purchase = {
      id: uid('pur'),
      documentNo: pDocNo,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: date || new Date().toISOString(),
      totalAmount,
      paidAmount: paid,
      balanceDue,
      paymentStatus: pStatus,
      status: 'completed',
      userId: actorId || 'admin',
      userName: actorName || 'ადმინი',
      items: purchaseItems,
      createdAt: new Date().toISOString()
    };
    purchaseItems.forEach((pi) => (pi.purchaseId = newPurchase.id));
    data.purchases.unshift(newPurchase);

    if (balanceDue > 0) supplier.balance += balanceDue;

    const writes: Promise<any>[] = [
      store.setMany('products', changedProducts),
      store.setMany('productBatches', newBatches),
      store.setMany('stockMovements', newMovements),
      store.set('purchases', newPurchase),
      store.set('suppliers', supplier),
      store.saveCounters()
    ];
    if (paid > 0) {
      const tx: CashTransaction = {
        id: uid('tx'),
        type: 'purchase',
        amount: paid,
        method: 'cash',
        description: `შესყიდვის გადახდა (#${pDocNo}, მომწოდებელი: ${supplier.name})`,
        referenceNo: pDocNo,
        date: new Date().toISOString(),
        userId: actorId || 'admin',
        userName: actorName || 'ადმინი'
      };
      data.cashTransactions.unshift(tx);
      writes.push(store.set('cashTransactions', tx));
    }
    await Promise.all(writes);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'ახალი შესყიდვა', `შესყიდვა #${pDocNo}, ჯამი: ${totalAmount} ₾, მომწოდებელი: ${supplier.name}`);
    return newPurchase;
  },

  // ----------------------------------------------------------- CUSTOMERS ----
  async getCustomers(): Promise<Customer[]> {
    const data = await ready();
    return data.customers;
  },

  async createCustomer(payload: any): Promise<Customer> {
    const data = await ready();
    const {
      type, name, lastName, phone, address, secondPhone, comment, companyName, taxId,
      contactPerson, email, legalAddress, bank, iban, actorId, actorName
    } = payload;
    if (!name || !phone) throw new Error('სახელი და ტელეფონი სავალდებულოა');
    const newCust: Customer = {
      id: uid('cust'),
      type: type || 'individual',
      name: name.trim(),
      lastName: lastName?.trim(),
      phone: phone.trim(),
      address: address?.trim(),
      secondPhone: secondPhone?.trim(),
      comment: comment?.trim(),
      companyName: companyName?.trim(),
      taxId: taxId?.trim(),
      contactPerson: contactPerson?.trim(),
      email: email?.trim(),
      legalAddress: legalAddress?.trim(),
      bank: bank?.trim(),
      iban: iban?.trim(),
      totalDebt: 0,
      totalPurchased: 0,
      createdAt: new Date().toISOString()
    };
    await store.set('customers', newCust);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'კლიენტის შექმნა', `დაემატა ${newCust.name}`);
    return newCust;
  },

  async updateCustomer(id: string, payload: any): Promise<Customer> {
    const data = await ready();
    const cust = data.customers.find((c) => c.id === id);
    if (!cust) throw new Error('კლიენტი ვერ მოიძებნა');
    const {
      type, name, lastName, phone, address, secondPhone, comment, companyName, taxId,
      contactPerson, email, legalAddress, bank, iban, specialPrices
    } = payload;
    if (type) cust.type = type;
    if (name) cust.name = name.trim();
    if (lastName !== undefined) cust.lastName = lastName;
    if (phone) cust.phone = phone.trim();
    if (address !== undefined) cust.address = address;
    if (secondPhone !== undefined) cust.secondPhone = secondPhone;
    if (comment !== undefined) cust.comment = comment;
    if (companyName !== undefined) cust.companyName = companyName;
    if (taxId !== undefined) cust.taxId = taxId;
    if (contactPerson !== undefined) cust.contactPerson = contactPerson;
    if (email !== undefined) cust.email = email;
    if (legalAddress !== undefined) cust.legalAddress = legalAddress;
    if (bank !== undefined) cust.bank = bank;
    if (iban !== undefined) cust.iban = iban;
    if (specialPrices !== undefined) cust.specialPrices = specialPrices;
    await store.set('customers', cust);
    return cust;
  },

  async payCustomerDebt(id: string, payload: any): Promise<Customer> {
    const data = await ready();
    const cust = data.customers.find((c) => c.id === id);
    if (!cust) throw new Error('კლიენტი ვერ მოიძებნა');
    const { amount, method, comment, actorId, actorName } = payload;
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error('მიუთითეთ ვალიდური თანხა');
    cust.totalDebt = Math.max(0, cust.totalDebt - amt);
    const tx: CashTransaction = {
      id: uid('tx'),
      type: 'customer_payment',
      amount: amt,
      method: method || 'cash',
      description: `კლიენტის დავალიანების დაფარვა: ${cust.name}${cust.companyName ? ` (${cust.companyName})` : ''}${comment ? ` — ${comment}` : ''}`,
      date: new Date().toISOString(),
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე'
    };
    data.cashTransactions.unshift(tx);
    await store.set('customers', cust);
    await store.set('cashTransactions', tx);
    await store.logAudit(actorId || 'cashier', actorName || 'მოლარე', 'დავალიანების დაფარვა', `${cust.name} - დაფარა ${amt} ₾`);
    return cust;
  },

  // --------------------------------------------------------------- SALES ----
  async getSales(): Promise<Sale[]> {
    const data = await ready();
    return data.sales;
  },

  async createSale(payload: any): Promise<Sale> {
    const data = await ready();
    const {
      customerId, items, discount, deliveryFee, deliveryType, deliveryDetails,
      payments, holdNote, isHeld, actorId, actorName
    } = payload;

    if (isHeld) {
      const heldSale: Sale = {
        id: uid('sale_held'),
        invoiceNo: 'HELD-' + Date.now().toString().slice(-6),
        customerId: customerId || 'temp',
        customerName: 'შეჩერებული გაყიდვა',
        customerPhone: '',
        userId: actorId || 'cashier',
        userName: actorName || 'მოლარე',
        date: new Date().toISOString(),
        subtotal: 0, discount: 0, deliveryFee: 0, grandTotal: 0, paidAmount: 0, balanceDue: 0,
        paymentStatus: 'unpaid',
        deliveryType: 'pickup',
        status: 'active',
        items: items || [],
        payments: [],
        holdNote: holdNote || 'შეჩერებული გაყიდვა',
        isHeld: true,
        createdAt: new Date().toISOString()
      };
      data.sales.unshift(heldSale);
      await store.set('sales', heldSale);
      return heldSale;
    }

    if (!customerId) throw new Error('კლიენტის არჩევა სავალდებულოა!');
    const customer = data.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('არჩეული კლიენტი ვერ მოიძებნა');
    if (!items || !Array.isArray(items) || items.length === 0) throw new Error('კალათა ცარიელია');

    // Pre-validate stock before mutating anything.
    if (!data.settings.allowNegativeStock) {
      for (const rawItem of items) {
        const prod = data.products.find((p) => p.id === rawItem.productId);
        const qty = Number(rawItem.quantity);
        if (prod && qty > 0 && prod.currentStock < qty) {
          throw new Error(`მარაგში არ არის საკმარისი რაოდენობა: ${prod.name} (ხელმისაწვდომია: ${prod.currentStock} ${prod.unit})`);
        }
      }
    }

    const invSeq = String(data.counters.invoice++).padStart(6, '0');
    const invoiceNo = `INV-2026-${invSeq}`;
    const nowIso = new Date().toISOString();

    let subtotal = 0;
    const saleItems: SaleItem[] = [];
    const changedProducts: Product[] = [];
    const changedBatches: ProductBatch[] = [];
    const newMovements: StockMovement[] = [];

    for (const rawItem of items) {
      const prod = data.products.find((p) => p.id === rawItem.productId);
      if (!prod) continue;
      const qty = Number(rawItem.quantity);
      if (!qty || qty <= 0) continue;

      const actualSellingPrice = rawItem.sellingPrice !== undefined ? Number(rawItem.sellingPrice) : prod.sellingPrice;
      const lineTotal = round2(qty * actualSellingPrice);
      subtotal += lineTotal;
      const costSnapshot = prod.averageCostPrice || prod.lastCostPrice || 0;
      const costTotal = round2(qty * costSnapshot);

      saleItems.push({
        id: uid('sitem'),
        saleId: '',
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        unit: prod.unit,
        quantity: qty,
        sellingPrice: actualSellingPrice,
        defaultSellingPrice: prod.sellingPrice,
        costPriceSnapshot: costSnapshot,
        lineTotal,
        costTotal,
        profitAmount: lineTotal - costTotal
      });

      const prevStock = prod.currentStock;
      const newStock = prevStock - qty;
      prod.currentStock = newStock;
      prod.totalSold = (prod.totalSold || 0) + qty;
      prod.updatedAt = nowIso;
      changedProducts.push(prod);

      let qtyToDeduct = qty;
      for (const batch of data.productBatches.filter((b) => b.productId === prod.id && b.remainingQuantity > 0)) {
        if (qtyToDeduct <= 0) break;
        const deduct = Math.min(batch.remainingQuantity, qtyToDeduct);
        batch.remainingQuantity -= deduct;
        qtyToDeduct -= deduct;
        changedBatches.push(batch);
      }

      const mov: StockMovement = {
        id: uid('mov'),
        productId: prod.id,
        productName: prod.name,
        changeQuantity: -qty,
        previousStock: prevStock,
        newStock,
        type: 'sale',
        referenceNo: invoiceNo,
        note: `გაყიდვა კლიენტზე: ${customer.name}`,
        date: nowIso,
        userId: actorId || 'cashier',
        userName: actorName || 'მოლარე'
      };
      data.stockMovements.unshift(mov);
      newMovements.push(mov);
    }

    const disc = Number(discount) || 0;
    const delFee = deliveryType === 'delivery' ? Number(deliveryFee) || 0 : 0;
    const grandTotal = Math.max(0, subtotal - disc + delFee);

    let totalPaid = 0;
    const salePayments: any[] = [];
    const newTxns: CashTransaction[] = [];
    if (payments && Array.isArray(payments)) {
      for (const p of payments) {
        const pAmt = Number(p.amount) || 0;
        if (pAmt > 0) {
          totalPaid += pAmt;
          salePayments.push({ id: uid('spay'), saleId: '', method: p.method, amount: pAmt, date: nowIso });
          const tx: CashTransaction = {
            id: uid('tx'),
            type: 'sale',
            amount: pAmt,
            method: p.method,
            description: `გაყიდვა #${invoiceNo} (${customer.name})`,
            referenceNo: invoiceNo,
            date: nowIso,
            userId: actorId || 'cashier',
            userName: actorName || 'მოლარე'
          };
          data.cashTransactions.unshift(tx);
          newTxns.push(tx);
        }
      }
    }

    const balanceDue = Math.max(0, grandTotal - totalPaid);
    const paymentStatus: 'paid' | 'partial' | 'unpaid' = totalPaid >= grandTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

    if (balanceDue > 0) customer.totalDebt += balanceDue;
    customer.totalPurchased += grandTotal;
    customer.lastPurchaseDate = nowIso;

    const customerFullName =
      customer.type === 'company'
        ? customer.companyName || customer.name
        : `${customer.name} ${customer.lastName || ''}`.trim();

    const newSale: Sale = {
      id: uid('sale'),
      invoiceNo,
      customerId: customer.id,
      customerName: customerFullName,
      customerPhone: customer.phone,
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე',
      date: nowIso,
      subtotal,
      discount: disc,
      deliveryFee: delFee,
      grandTotal,
      paidAmount: totalPaid,
      balanceDue,
      paymentStatus,
      deliveryType: deliveryType || 'pickup',
      deliveryDetails: deliveryType === 'delivery' ? deliveryDetails : undefined,
      status: 'active',
      items: saleItems,
      payments: salePayments,
      createdAt: nowIso
    };
    saleItems.forEach((si) => (si.saleId = newSale.id));
    salePayments.forEach((sp) => (sp.saleId = newSale.id));
    data.sales.unshift(newSale);

    await Promise.all([
      store.setMany('products', changedProducts),
      store.setMany('productBatches', changedBatches),
      store.setMany('stockMovements', newMovements),
      store.setMany('cashTransactions', newTxns),
      store.set('customers', customer),
      store.set('sales', newSale),
      store.saveCounters()
    ]);
    await store.logAudit(actorId || 'cashier', actorName || 'მოლარე', 'ახალი გაყიდვა', `ინვოისი #${invoiceNo}, კლიენტი: ${customerFullName}, სულ: ${grandTotal} ₾`);
    return newSale;
  },

  async deleteHeldSale(id: string): Promise<{ success: boolean }> {
    const data = await ready();
    const sale = data.sales.find((s) => s.id === id && s.isHeld);
    if (sale) await store.del('sales', id);
    return { success: true };
  },

  // ------------------------------------------------------------- RETURNS ----
  async createReturn(payload: any): Promise<ReturnDoc> {
    const data = await ready();
    const { saleId, items, reason, actorId, actorName } = payload;
    const sale = data.sales.find((s) => s.id === saleId);
    if (!sale) throw new Error('გაყიდვა ვერ მოიძებნა');
    if (!items || !Array.isArray(items) || items.length === 0) throw new Error('აირჩიეთ დასაბრუნებელი საქონელი');

    const retSeq = String(data.counters.return++).padStart(6, '0');
    const returnNo = `RET-2026-${retSeq}`;
    const nowIso = new Date().toISOString();
    let totalRefund = 0;
    const returnItems: any[] = [];
    const changedProducts: Product[] = [];
    const newMovements: StockMovement[] = [];

    for (const rItem of items) {
      const saleItem = sale.items.find((si) => si.productId === rItem.productId);
      if (!saleItem) continue;
      const qty = Number(rItem.quantityReturned);
      if (!qty || qty <= 0) continue;
      const lineRefund = round2(qty * saleItem.sellingPrice);
      totalRefund += lineRefund;
      returnItems.push({
        id: uid('ritem'),
        returnId: '',
        productId: saleItem.productId,
        productName: saleItem.productName,
        productCode: saleItem.productCode,
        unit: saleItem.unit,
        quantityReturned: qty,
        unitPrice: saleItem.sellingPrice,
        totalRefunded: lineRefund
      });
      const prod = data.products.find((p) => p.id === saleItem.productId);
      if (prod) {
        const prevStock = prod.currentStock;
        const newStock = prevStock + qty;
        prod.currentStock = newStock;
        prod.updatedAt = nowIso;
        changedProducts.push(prod);
        const mov: StockMovement = {
          id: uid('mov'),
          productId: prod.id,
          productName: prod.name,
          changeQuantity: qty,
          previousStock: prevStock,
          newStock,
          type: 'return',
          referenceNo: returnNo,
          note: `დაბრუნება ინვოისიდან #${sale.invoiceNo}`,
          date: nowIso,
          userId: actorId || 'cashier',
          userName: actorName || 'მოლარე'
        };
        data.stockMovements.unshift(mov);
        newMovements.push(mov);
      }
    }

    const newReturn: ReturnDoc = {
      id: uid('ret'),
      returnNo,
      saleId: sale.id,
      invoiceNo: sale.invoiceNo,
      customerId: sale.customerId,
      customerName: sale.customerName,
      date: nowIso,
      totalAmount: totalRefund,
      reason: reason || 'კლიენტის მიერ დაბრუნება',
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე',
      items: returnItems
    };
    returnItems.forEach((ri) => (ri.returnId = newReturn.id));
    data.returns.unshift(newReturn);
    sale.status = 'returned';

    const cust = data.customers.find((c) => c.id === sale.customerId);
    if (cust && cust.totalDebt > 0) cust.totalDebt = Math.max(0, cust.totalDebt - totalRefund);

    const tx: CashTransaction = {
      id: uid('tx'),
      type: 'return',
      amount: totalRefund,
      method: 'cash',
      description: `თანხის დაბრუნება (დოკუმენტი #${returnNo}, ინვოისი #${sale.invoiceNo})`,
      referenceNo: returnNo,
      date: nowIso,
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე'
    };
    data.cashTransactions.unshift(tx);

    await Promise.all([
      store.setMany('products', changedProducts),
      store.setMany('stockMovements', newMovements),
      store.set('returns', newReturn),
      store.set('sales', sale),
      cust ? store.set('customers', cust) : Promise.resolve(),
      store.set('cashTransactions', tx),
      store.saveCounters()
    ]);
    await store.logAudit(actorId || 'cashier', actorName || 'მოლარე', 'საქონლის დაბრუნება', `დაბრუნების დოკუმენტი #${returnNo}, ინვოისი #${sale.invoiceNo}, თანხა: ${totalRefund} ₾`);
    return newReturn;
  },

  // ------------------------------------------------------ QUOTES & ORDERS ----
  async getQuotes(): Promise<Quote[]> {
    const data = await ready();
    return data.quotes;
  },

  async createQuote(payload: any): Promise<Quote> {
    const data = await ready();
    const { customerId, items, note } = payload;
    const customer = data.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('აირჩიეთ კლიენტი');
    const qSeq = String(data.counters.quote++).padStart(6, '0');
    const quoteNo = `QT-2026-${qSeq}`;
    let grandTotal = 0;
    const qItems = (items || []).map((it: any) => {
      const line = Number(it.quantity) * Number(it.price);
      grandTotal += line;
      return {
        id: uid('qitem'),
        productId: it.productId,
        productName: it.productName,
        productCode: it.productCode,
        unit: it.unit,
        quantity: Number(it.quantity),
        price: Number(it.price),
        total: line
      };
    });
    const custName = customer.type === 'company' ? customer.companyName || customer.name : `${customer.name} ${customer.lastName || ''}`.trim();
    const newQuote: Quote = {
      id: uid('quote'),
      quoteNo,
      customerId: customer.id,
      customerName: custName,
      date: new Date().toISOString(),
      items: qItems,
      grandTotal,
      note,
      status: 'active'
    };
    data.quotes.unshift(newQuote);
    await store.set('quotes', newQuote);
    await store.saveCounters();
    return newQuote;
  },

  async getOrders(): Promise<Order[]> {
    const data = await ready();
    return data.orders || [];
  },

  async createOrder(payload: any): Promise<Order> {
    const data = await ready();
    const {
      customerId, customerName, customerPhone, items, paidAmount = 0, paymentMethod = 'cash',
      deliveryAddress, recipientName, recipientPhone, comment, userId, userName
    } = payload;
    const customer = data.customers.find((c) => c.id === customerId);
    if (!customer && !customerName) throw new Error('აირჩიეთ ან მიუთითეთ კლიენტი');

    const oSeq = String(data.counters.order++).padStart(6, '0');
    const orderNo = `ORD-2026-${oSeq}`;
    let grandTotal = 0;
    const oItems = (items || []).map((it: any) => {
      const line = Number(it.quantity) * Number(it.price || it.sellingPrice);
      grandTotal += line;
      return {
        id: uid('oitem'),
        productId: it.productId,
        productName: it.productName,
        productCode: it.productCode,
        unit: it.unit,
        quantity: Number(it.quantity),
        price: Number(it.price || it.sellingPrice),
        total: line
      };
    });
    const custName =
      customerName ||
      (customer?.type === 'company' ? customer.companyName || customer.name : `${customer?.name || ''} ${customer?.lastName || ''}`.trim());

    const initialPaid = Math.min(Number(paidAmount) || 0, grandTotal);
    const balanceDue = Math.max(0, grandTotal - initialPaid);
    const paymentStatus = initialPaid >= grandTotal ? 'fully_paid' : initialPaid > 0 ? 'partially_paid' : 'unpaid';

    const payments: any[] = [];
    const newTxns: CashTransaction[] = [];
    if (initialPaid > 0) {
      const opay = {
        id: uid('opay'),
        orderId: '',
        amount: initialPaid,
        method: paymentMethod,
        date: new Date().toISOString(),
        userId: userId || 'user',
        userName: userName || 'ოპერატორი',
        comment: 'პირველადი ავანსი / გადახდა შეკვეთის გაფორმებისას'
      };
      payments.push(opay);
    }

    const newOrder: Order = {
      id: uid('ord'),
      orderNo,
      customerId: customerId || customer?.id || 'temp',
      customerName: custName,
      customerPhone: customerPhone || customer?.phone || '',
      date: new Date().toISOString(),
      items: oItems,
      grandTotal,
      paidAmount: initialPaid,
      balanceDue,
      paymentStatus,
      deliveryAddress,
      recipientName,
      recipientPhone,
      comment,
      status: 'new',
      payments,
      isFulfilled: false,
      createdAt: new Date().toISOString(),
      userId,
      userName
    };
    newOrder.payments.forEach((p) => (p.orderId = newOrder.id));

    if (initialPaid > 0) {
      const tx: CashTransaction = {
        id: uid('tx'),
        type: 'customer_payment',
        amount: initialPaid,
        method: paymentMethod as any,
        description: `ავანსი შეკვეთაზე ${orderNo} (${custName})`,
        referenceNo: orderNo,
        date: new Date().toISOString(),
        userId: userId || 'user',
        userName: userName || 'ოპერატორი'
      };
      data.cashTransactions.unshift(tx);
      newTxns.push(tx);
    }

    data.orders.unshift(newOrder);
    await Promise.all([
      store.set('orders', newOrder),
      store.setMany('cashTransactions', newTxns),
      store.saveCounters()
    ]);
    await store.logAudit(userId || 'user', userName || 'ოპერატორი', 'ახალი შეკვეთა', `შეკვეთა #${orderNo}, კლიენტი: ${custName}, სულ: ${grandTotal} ₾`);
    return newOrder;
  },

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const data = await ready();
    const ord = data.orders.find((o) => o.id === id);
    if (!ord) throw new Error('შეკვეთა ვერ მოიძებნა');
    if (status) ord.status = status as any;
    await store.set('orders', ord);
    return ord;
  },

  async addOrderPayment(id: string, payload: any): Promise<Order> {
    const data = await ready();
    const ord = data.orders.find((o) => o.id === id);
    if (!ord) throw new Error('შეკვეთა ვერ მოიძებნა');
    const { amount, method = 'cash', comment, userId, userName } = payload;
    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) throw new Error('შეიყვანეთ ვალიდური თანხა');

    const newPayment = {
      id: uid('opay'),
      orderId: ord.id,
      amount: paymentAmount,
      method,
      date: new Date().toISOString(),
      userId: userId || 'user',
      userName: userName || 'ოპერატორი',
      comment
    };
    if (!ord.payments) ord.payments = [];
    ord.payments.push(newPayment);
    ord.paidAmount = round2(ord.payments.reduce((sum, p) => sum + p.amount, 0));
    ord.balanceDue = Math.max(0, round2(ord.grandTotal - ord.paidAmount));
    ord.paymentStatus = ord.paidAmount >= ord.grandTotal ? 'fully_paid' : ord.paidAmount > 0 ? 'partially_paid' : 'unpaid';

    const tx: CashTransaction = {
      id: uid('tx'),
      date: new Date().toISOString(),
      type: 'customer_payment',
      amount: paymentAmount,
      method: method as any,
      description: `გადახდა შეკვეთაზე ${ord.orderNo} (${ord.customerName})`,
      referenceNo: ord.orderNo,
      userId: userId || 'user',
      userName: userName || 'ოპერატორი'
    };
    data.cashTransactions.unshift(tx);

    const writes: Promise<any>[] = [store.set('orders', ord), store.set('cashTransactions', tx)];
    // If goods were already handed out, this payment pays down the customer's debt.
    const cust = data.customers.find((c) => c.id === ord.customerId);
    if (ord.isFulfilled && cust && cust.totalDebt > 0) {
      cust.totalDebt = Math.max(0, round2(cust.totalDebt - paymentAmount));
      writes.push(store.set('customers', cust));
    }
    await Promise.all(writes);
    await store.logAudit(userId || 'user', userName || 'ოპერატორი', 'შეკვეთაზე გადახდა', `${ord.orderNo} - დაემატა ${paymentAmount} ₾ (${method})`);
    return ord;
  },

  // Admin: delete a single order payment and recompute totals/debt/transactions.
  async deleteOrderPayment(orderId: string, paymentId: string, actor?: { userId?: string; userName?: string }): Promise<Order> {
    const data = await ready();
    const ord = data.orders.find((o) => o.id === orderId);
    if (!ord) throw new Error('შეკვეთა ვერ მოიძებნა');
    const payment = (ord.payments || []).find((p) => p.id === paymentId);
    if (!payment) throw new Error('გადახდა ვერ მოიძებნა');

    ord.payments = ord.payments.filter((p) => p.id !== paymentId);
    ord.paidAmount = round2(ord.payments.reduce((sum, p) => sum + p.amount, 0));
    ord.balanceDue = Math.max(0, round2(ord.grandTotal - ord.paidAmount));
    ord.paymentStatus = ord.paidAmount >= ord.grandTotal ? 'fully_paid' : ord.paidAmount > 0 ? 'partially_paid' : 'unpaid';

    // Remove the matching cash transaction so reports/stats stay correct.
    const txIdx = data.cashTransactions.findIndex(
      (tx) => tx.referenceNo === ord.orderNo && tx.type === 'customer_payment' && Math.abs(tx.amount - payment.amount) < 0.001 && tx.method === payment.method
    );
    const writes: Promise<any>[] = [store.set('orders', ord)];
    if (txIdx !== -1) {
      const txId = data.cashTransactions[txIdx].id;
      data.cashTransactions.splice(txIdx, 1);
      writes.push(store.del('cashTransactions', txId));
    }
    // If goods were handed out, removing a payment restores the customer's debt.
    const cust = data.customers.find((c) => c.id === ord.customerId);
    if (ord.isFulfilled && cust) {
      cust.totalDebt = round2(cust.totalDebt + payment.amount);
      writes.push(store.set('customers', cust));
    }
    await Promise.all(writes);
    await store.logAudit(actor?.userId || 'admin', actor?.userName || 'ადმინი', 'გადახდის წაშლა', `${ord.orderNo} - წაიშალა გადახდა ${payment.amount} ₾ (${payment.method})`);
    return ord;
  },

  // Admin: delete an entire order, reversing stock, debt and cash transactions.
  async deleteOrder(orderId: string, actor?: { userId?: string; userName?: string }): Promise<{ success: boolean }> {
    const data = await ready();
    const ord = data.orders.find((o) => o.id === orderId);
    if (!ord) throw new Error('შეკვეთა ვერ მოიძებნა');
    const nowIso = new Date().toISOString();
    const changedProducts: Product[] = [];
    const newMovements: StockMovement[] = [];

    // Restore stock if the order had been fulfilled.
    if (ord.isFulfilled) {
      for (const item of ord.items) {
        const prod = data.products.find((p) => p.id === item.productId);
        if (!prod) continue;
        const qty = Number(item.quantity);
        if (!qty || qty <= 0) continue;
        const prevStock = prod.currentStock;
        prod.currentStock = round2(prevStock + qty);
        prod.totalSold = Math.max(0, (prod.totalSold || 0) - qty);
        prod.updatedAt = nowIso;
        changedProducts.push(prod);
        const mov: StockMovement = {
          id: uid('mov'),
          productId: prod.id,
          productName: prod.name,
          changeQuantity: qty,
          previousStock: prevStock,
          newStock: prod.currentStock,
          type: 'adjustment',
          referenceNo: ord.orderNo,
          note: `შეკვეთის წაშლა (${ord.orderNo}) — მარაგის დაბრუნება`,
          date: nowIso,
          userId: actor?.userId || 'admin',
          userName: actor?.userName || 'ადმინი'
        };
        data.stockMovements.unshift(mov);
        newMovements.push(mov);
      }
    }

    const writes: Promise<any>[] = [];
    // Reverse customer debt attributed to a fulfilled, not-fully-paid order.
    const cust = data.customers.find((c) => c.id === ord.customerId);
    if (ord.isFulfilled && cust) {
      if (ord.balanceDue > 0) cust.totalDebt = Math.max(0, round2(cust.totalDebt - ord.balanceDue));
      cust.totalPurchased = Math.max(0, round2((cust.totalPurchased || 0) - ord.grandTotal));
      writes.push(store.set('customers', cust));
    }

    // Remove all cash transactions tied to this order.
    const relatedTx = data.cashTransactions.filter((tx) => tx.referenceNo === ord.orderNo);
    for (const tx of relatedTx) {
      const idx = data.cashTransactions.findIndex((t) => t.id === tx.id);
      if (idx !== -1) data.cashTransactions.splice(idx, 1);
      writes.push(store.del('cashTransactions', tx.id));
    }

    writes.push(store.setMany('products', changedProducts));
    writes.push(store.setMany('stockMovements', newMovements));
    writes.push(store.del('orders', ord.id));
    await Promise.all(writes);
    await store.logAudit(actor?.userId || 'admin', actor?.userName || 'ადმინი', 'შეკვეთის წაშლა', `წაიშალა შეკვეთა ${ord.orderNo} (${ord.customerName}), ჯამი: ${ord.grandTotal} ₾`);
    return { success: true };
  },

  async fulfillOrder(id: string): Promise<Order> {
    const data = await ready();
    const ord = data.orders.find((o) => o.id === id);
    if (!ord) throw new Error('შეკვეთა ვერ მოიძებნა');
    if (ord.isFulfilled) throw new Error('შეკვეთა უკვე გაცემულია!');

    const nowIso = new Date().toISOString();
    const changedProducts: Product[] = [];
    const changedBatches: ProductBatch[] = [];
    const newMovements: StockMovement[] = [];

    for (const item of ord.items) {
      const prod = data.products.find((p) => p.id === item.productId);
      if (!prod) continue;
      const qty = Number(item.quantity);
      if (!qty || qty <= 0) continue;
      const prevStock = prod.currentStock;
      const newStock = prevStock - qty;
      prod.currentStock = newStock;
      prod.totalSold = (prod.totalSold || 0) + qty;
      prod.updatedAt = nowIso;
      changedProducts.push(prod);

      let qtyToDeduct = qty;
      for (const batch of data.productBatches.filter((b) => b.productId === prod.id && b.remainingQuantity > 0)) {
        if (qtyToDeduct <= 0) break;
        const deduct = Math.min(batch.remainingQuantity, qtyToDeduct);
        batch.remainingQuantity -= deduct;
        qtyToDeduct -= deduct;
        changedBatches.push(batch);
      }

      const mov: StockMovement = {
        id: uid('mov'),
        productId: prod.id,
        productName: prod.name,
        changeQuantity: -qty,
        previousStock: prevStock,
        newStock,
        type: 'sale',
        referenceNo: ord.orderNo,
        note: `შეკვეთის გაცემა/შესრულება: ${ord.customerName}`,
        date: nowIso,
        userId: ord.userId || 'user',
        userName: ord.userName || 'ოპერატორი'
      };
      data.stockMovements.unshift(mov);
      newMovements.push(mov);
    }

    ord.isFulfilled = true;
    ord.fulfilledAt = nowIso;
    ord.status = 'fulfilled';

    // Goods handed over → any unpaid balance becomes a real customer receivable,
    // regardless of payment status (credit sale). Stock decrease is independent
    // of whether the client has paid.
    const writes: Promise<any>[] = [
      store.setMany('products', changedProducts),
      store.setMany('productBatches', changedBatches),
      store.setMany('stockMovements', newMovements),
      store.set('orders', ord)
    ];
    const cust = data.customers.find((c) => c.id === ord.customerId);
    if (cust && ord.balanceDue > 0) {
      cust.totalDebt = round2(cust.totalDebt + ord.balanceDue);
      cust.totalPurchased = round2((cust.totalPurchased || 0) + ord.grandTotal);
      cust.lastPurchaseDate = nowIso;
      writes.push(store.set('customers', cust));
    }
    await Promise.all(writes);
    await store.logAudit(ord.userId || 'user', ord.userName || 'ოპერატორი', 'შეკვეთის გაცემა', `${ord.orderNo} - საქონელი გაიცა, მარაგი ჩამოიჭრა${ord.balanceDue > 0 ? `, დავალიანება: ${ord.balanceDue} ₾` : ''}`);
    return ord;
  },

  // -------------------------------------------------------------- SHIFTS ----
  async getCurrentShift(): Promise<Shift | null> {
    const data = await ready();
    return data.shifts.find((s) => s.status === 'open') || null;
  },

  async getShifts(): Promise<Shift[]> {
    const data = await ready();
    return data.shifts;
  },

  async openShift(payload: any): Promise<Shift> {
    const data = await ready();
    if (data.shifts.find((s) => s.status === 'open')) throw new Error('მიმდინარე ცვლა უკვე გახსნილია');
    const { startCash, userId, userName } = payload;
    const newShift: Shift = {
      id: uid('shift'),
      userId: userId || 'cashier',
      userName: userName || 'მოლარე',
      openedAt: new Date().toISOString(),
      startCash: Number(startCash) || 0,
      status: 'open'
    };
    data.shifts.unshift(newShift);
    await store.set('shifts', newShift);
    await store.logAudit(userId || 'cashier', userName || 'მოლარე', 'ცვლის გახსნა', `საწყისი ნაღდი: ${newShift.startCash} ₾`);
    return newShift;
  },

  async closeShift(payload: any): Promise<Shift> {
    const data = await ready();
    const currentShift = data.shifts.find((s) => s.status === 'open');
    if (!currentShift) throw new Error('ღია ცვლა ვერ მოიძებნა');
    const { endCashActual, comment } = payload;
    const actual = Number(endCashActual);
    const shiftStart = currentShift.openedAt;
    const cashTxs = data.cashTransactions.filter((tx) => tx.date >= shiftStart && tx.method === 'cash');
    let cashSales = 0;
    let cashOuts = 0;
    cashTxs.forEach((tx) => {
      if (tx.type === 'sale' || tx.type === 'customer_payment' || tx.type === 'cash_in') cashSales += tx.amount;
      else if (tx.type === 'expense' || tx.type === 'return' || tx.type === 'purchase' || tx.type === 'cash_out') cashOuts += tx.amount;
    });
    const expected = currentShift.startCash + cashSales - cashOuts;
    currentShift.closedAt = new Date().toISOString();
    currentShift.endCashExpected = round2(expected);
    currentShift.endCashActual = actual;
    currentShift.difference = round2(actual - expected);
    currentShift.status = 'closed';
    currentShift.comment = comment;
    await store.set('shifts', currentShift);
    await store.logAudit(currentShift.userId, currentShift.userName, 'ცვლის დახურვა', `მოსალოდნელი: ${expected} ₾, რეალური: ${actual} ₾, სხვაობა: ${currentShift.difference} ₾`);
    return currentShift;
  },

  // -------------------------------------------------- EXPENSES & CASH ----
  async getExpenses(): Promise<Expense[]> {
    const data = await ready();
    return data.expenses;
  },

  async createExpense(payload: any): Promise<Expense> {
    const data = await ready();
    const { category, amount, receiptImage, actorId, actorName, userId, userName } = payload;
    const reason = payload.reason ?? payload.note;
    const recipient = payload.recipient ?? payload.recipientName;
    const comment = payload.comment ?? payload.note;
    const amt = Number(amount);
    if (!amt || amt <= 0 || !reason) throw new Error('მიუთითეთ თანხა და ხარჯის მიზეზი');
    const newExpense: Expense = {
      id: uid('exp'),
      category: category || 'საოპერაციო ხარჯი',
      amount: amt,
      reason: reason.trim(),
      recipient: recipient?.trim() || '',
      userId: actorId || userId || 'cashier',
      userName: actorName || userName || 'მოლარე',
      date: new Date().toISOString(),
      receiptImage,
      comment
    };
    data.expenses.unshift(newExpense);
    const tx: CashTransaction = {
      id: uid('tx'),
      type: 'expense',
      amount: amt,
      method: 'cash',
      description: `თანხის გაცემა / ხარჯი: ${reason} (მიმღები: ${recipient || 'N/A'})`,
      date: new Date().toISOString(),
      userId: actorId || userId || 'cashier',
      userName: actorName || userName || 'მოლარე'
    };
    data.cashTransactions.unshift(tx);
    await Promise.all([store.set('expenses', newExpense), store.set('cashTransactions', tx)]);
    await store.logAudit(actorId || userId || 'cashier', actorName || userName || 'მოლარე', 'თანხის გაცემა', `გაიცა ${amt} ₾, მიზეზი: ${reason}`);
    return newExpense;
  },

  async cashIn(payload: any): Promise<{ success: boolean }> {
    const data = await ready();
    const { amount, description, actorId, actorName, userId, userName } = payload;
    const desc = description ?? payload.note;
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error('მიუთითეთ თანხა');
    const tx: CashTransaction = {
      id: uid('tx'),
      type: 'cash_in',
      amount: amt,
      method: 'cash',
      description: `სალაროში თანხის შეტანა: ${desc || 'შეტანა'}`,
      date: new Date().toISOString(),
      userId: actorId || userId || 'admin',
      userName: actorName || userName || 'ადმინი'
    };
    data.cashTransactions.unshift(tx);
    await store.set('cashTransactions', tx);
    await store.logAudit(actorId || userId || 'admin', actorName || userName || 'ადმინი', 'სალაროში შეტანა', `შეიტანა ${amt} ₾`);
    return { success: true };
  },

  async getTransactions(): Promise<CashTransaction[]> {
    const data = await ready();
    return data.cashTransactions;
  },

  // --------------------------------------------------------------- STOCK ----
  async getStockMovements(): Promise<StockMovement[]> {
    const data = await ready();
    return data.stockMovements;
  },

  async createStocktake(payload: any): Promise<any> {
    const data = await ready();
    const { items, actorId, actorName } = payload;
    if (!items || !Array.isArray(items)) throw new Error('არ არის მონაცემები');
    const nowIso = new Date().toISOString();
    const stocktakeItems: any[] = [];
    const changedProducts: Product[] = [];
    const newMovements: StockMovement[] = [];
    for (const it of items) {
      const prod = data.products.find((p) => p.id === it.productId);
      if (!prod) continue;
      const expected = prod.currentStock;
      const actual = Number(it.actualQty);
      const diff = actual - expected;
      stocktakeItems.push({
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        expectedQty: expected,
        actualQty: actual,
        diff,
        costPrice: prod.averageCostPrice
      });
      if (diff !== 0) {
        prod.currentStock = actual;
        prod.updatedAt = nowIso;
        changedProducts.push(prod);
        const mov: StockMovement = {
          id: uid('mov'),
          productId: prod.id,
          productName: prod.name,
          changeQuantity: diff,
          previousStock: expected,
          newStock: actual,
          type: 'adjustment',
          note: `ინვენტარიზაციის კორექტირება (${diff > 0 ? '+' : ''}${diff})`,
          date: nowIso,
          userId: actorId || 'admin',
          userName: actorName || 'ადმინი'
        };
        data.stockMovements.unshift(mov);
        newMovements.push(mov);
      }
    }
    const newStocktake = {
      id: uid('st'),
      date: nowIso,
      status: 'completed' as const,
      items: stocktakeItems,
      userId: actorId || 'admin',
      userName: actorName || 'ადმინი',
      confirmedBy: actorName || 'ადმინი'
    };
    data.stocktakes.unshift(newStocktake);
    await Promise.all([
      store.setMany('products', changedProducts),
      store.setMany('stockMovements', newMovements),
      store.set('stocktakes', newStocktake)
    ]);
    await store.logAudit(actorId || 'admin', actorName || 'ადმინი', 'ინვენტარიზაცია', 'შესრულდა მარაგის ინვენტარიზაცია');
    return newStocktake;
  },

  // ------------------------------------------------------ CATEGORIES/UNITS ----
  async getCategories(): Promise<Category[]> {
    const data = await ready();
    return data.categories;
  },

  async createCategory(payload: any): Promise<Category> {
    const data = await ready();
    const { name, code, description } = payload;
    if (!name) throw new Error('სახელი სავალდებულოა');
    const newCat: Category = {
      id: uid('cat'),
      name: name.trim(),
      code: code?.trim().toUpperCase() || 'CAT' + Date.now().toString().slice(-4),
      description: description?.trim()
    };
    data.categories.push(newCat);
    await store.set('categories', newCat);
    return newCat;
  },

  async getUnits(): Promise<Unit[]> {
    const data = await ready();
    return data.units;
  },

  async createUnit(payload: any): Promise<Unit> {
    const data = await ready();
    const { name, symbol } = payload;
    if (!name || !symbol) throw new Error('სახელი და სიმბოლო სავალდებულოა');
    const newUnit: Unit = { id: uid('u'), name: name.trim(), symbol: symbol.trim() };
    data.units.push(newUnit);
    await store.set('units', newUnit);
    return newUnit;
  },

  // ---------------------------------------------------- AUDIT & SETTINGS ----
  async getAuditLogs(): Promise<AuditLog[]> {
    const data = await ready();
    return data.auditLogs;
  },

  async getSettings(): Promise<Settings> {
    const data = await ready();
    return data.settings;
  },

  async updateSettings(payload: any): Promise<Settings> {
    const data = await ready();
    const s = data.settings;
    const keys: (keyof Settings)[] = [
      'companyName', 'taxId', 'address', 'phone', 'email', 'bankName', 'bankAccount',
      'logo', 'invoiceHeader', 'invoiceFooter', 'defaultCurrency'
    ];
    keys.forEach((k) => {
      if (payload[k] !== undefined) (s as any)[k] = payload[k];
    });
    if (payload.allowNegativeStock !== undefined) s.allowNegativeStock = Boolean(payload.allowNegativeStock);
    await store.saveSettings();
    return s;
  },

  // -------------------------------------------------------------- SEARCH ----
  async search(q: string): Promise<{ products: Product[]; customers: Customer[]; sales: Sale[]; suppliers: Supplier[] }> {
    const data = await ready();
    const query = String(q || '').trim().toLowerCase();
    if (!query) return { products: [], customers: [], sales: [], suppliers: [] };
    const products = data.products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query))
    );
    const customers = data.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.lastName && c.lastName.toLowerCase().includes(query)) ||
        c.phone.includes(query) ||
        (c.companyName && c.companyName.toLowerCase().includes(query)) ||
        (c.taxId && c.taxId.includes(query))
    );
    const sales = data.sales.filter(
      (s) =>
        s.invoiceNo.toLowerCase().includes(query) ||
        s.customerName.toLowerCase().includes(query) ||
        s.customerPhone.includes(query)
    );
    const suppliers = data.suppliers.filter(
      (sup) => sup.name.toLowerCase().includes(query) || sup.phone.includes(query) || (sup.taxId && sup.taxId.includes(query))
    );
    return {
      products: products.slice(0, 10),
      customers: customers.slice(0, 10),
      sales: sales.slice(0, 10),
      suppliers: suppliers.slice(0, 10)
    };
  }
};
