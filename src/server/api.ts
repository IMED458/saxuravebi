import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './dbStore';
import {
  User,
  Product,
  ProductBatch,
  Sale,
  SaleItem,
  Purchase,
  ReturnDoc,
  Customer,
  Supplier,
  Shift,
  Expense,
  StockMovement,
  Quote,
  Order
} from '../types';

export function setupApiRoutes(app: Express) {
  // --- AUTH ---
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'გთხოვთ შეიყვანოთ მომხმარებლის სახელი და პაროლი' });
    }

    const data = db.getData();
    const user = data.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.status === 'active'
    );

    if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'არასწორი მომხმარებლის სახელი ან პაროლი' });
    }

    db.logAudit(user.id, `${user.firstName} ${user.lastName}`, 'სისტემაში შესვლა', 'ავტორიზაცია წარმატებით გაიარა');

    const safeUser = { ...user };
    delete safeUser.passwordHash;
    res.json({ user: safeUser });
  });

  // --- USERS ---
  app.get('/api/users', (req: Request, res: Response) => {
    const data = db.getData();
    const safeUsers = data.users.map((u) => {
      const copy = { ...u };
      delete copy.passwordHash;
      return copy;
    });
    res.json(safeUsers);
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const data = db.getData();
    const { firstName, lastName, position, phone, username, password, role, permissions, comment, actorName, actorId } = req.body;

    if (!username || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'შევსება სავალდებულოა: სახელი, გვარი, მომხმარებელი, პაროლი' });
    }

    const exists = data.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'ამ მომხმარებლის სახელით უკვე არსებობს ჩანაწერი' });
    }

    const newUser: User = {
      id: 'user_' + Date.now(),
      firstName,
      lastName,
      position: position || 'თანამშრომელი',
      phone: phone || '',
      username,
      passwordHash: bcrypt.hashSync(password, 10),
      role: role || 'cashier',
      permissions: permissions || ['sale'],
      status: 'active',
      comment,
      createdAt: new Date().toISOString()
    };

    data.users.push(newUser);
    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'მომხმარებლის შექმნა', `შეიქმნა მომხმარებელი ${username}`);

    const safe = { ...newUser };
    delete safe.passwordHash;
    res.json(safe);
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const data = db.getData();
    const user = data.users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'მომხმარებელი ვერ მოიძებნა' });

    const { firstName, lastName, position, phone, role, permissions, status, comment, newPassword, actorName, actorId } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (position !== undefined) user.position = position;
    if (phone !== undefined) user.phone = phone;
    if (role) user.role = role;
    if (permissions) user.permissions = permissions;
    if (status) user.status = status;
    if (comment !== undefined) user.comment = comment;
    if (newPassword) {
      user.passwordHash = bcrypt.hashSync(newPassword, 10);
    }

    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'მომხმარებლის რედაქტირება', `განახლდა მომხმარებელი ${user.username}`);

    const safe = { ...user };
    delete safe.passwordHash;
    res.json(safe);
  });

  // --- PRODUCTS ---
  app.get('/api/products', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.products);
  });

  app.post('/api/products', (req: Request, res: Response) => {
    const data = db.getData();
    const {
      name,
      code,
      categoryId,
      unit,
      sellingPrice,
      minStock,
      status,
      barcode,
      sku,
      brand,
      supplierId,
      color,
      size,
      thickness,
      length,
      width,
      weight,
      description,
      note,
      image,
      gallery,
      initialQuantity,
      initialCostPrice,
      actorName,
      actorId
    } = req.body;

    if (!name || !code || !categoryId || !unit || sellingPrice === undefined) {
      return res.status(400).json({ error: 'შეავსეთ სავალდებულო ველები: დასახელება, კოდი, კატეგორია, ერთეული, გასაყიდი ფასი' });
    }

    const codeExists = data.products.some((p) => p.code.toLowerCase() === code.trim().toLowerCase());
    if (codeExists) {
      return res.status(400).json({ error: 'ამ კოდით პროდუქტი უკვე არსებობს!' });
    }

    const newProd: Product = {
      id: 'prod_' + Date.now(),
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
      color,
      size,
      thickness,
      length,
      width,
      weight,
      description,
      note,
      image,
      gallery: gallery || [],
      currentStock: 0,
      averageCostPrice: 0,
      lastCostPrice: 0,
      totalSold: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.products.push(newProd);

    // Initial stock if provided
    const initQty = Number(initialQuantity) || 0;
    const initCost = Number(initialCostPrice) || 0;
    if (initQty > 0) {
      newProd.currentStock = initQty;
      newProd.averageCostPrice = initCost;
      newProd.lastCostPrice = initCost;

      const newBatch: ProductBatch = {
        id: 'batch_' + Date.now(),
        productId: newProd.id,
        receivedQuantity: initQty,
        remainingQuantity: initQty,
        unitCost: initCost,
        receivedDate: new Date().toISOString(),
        documentNo: 'INIT-STOCK'
      };
      data.productBatches.push(newBatch);

      data.stockMovements.unshift({
        id: 'mov_' + Date.now(),
        productId: newProd.id,
        productName: newProd.name,
        changeQuantity: initQty,
        previousStock: 0,
        newStock: initQty,
        type: 'purchase',
        referenceNo: 'INIT-STOCK',
        note: 'საწყისი მარაგის დამატება',
        date: new Date().toISOString(),
        userId: actorId || 'system',
        userName: actorName || 'სისტემა'
      });
    }

    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'პროდუქტის დამატება', `დაემატა ${newProd.name} (${newProd.code})`);
    res.json(newProd);
  });

  app.put('/api/products/:id', (req: Request, res: Response) => {
    const data = db.getData();
    const prod = data.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'პროდუქტი ვერ მოიძებნა' });

    const {
      name,
      code,
      categoryId,
      unit,
      sellingPrice,
      minStock,
      status,
      barcode,
      sku,
      brand,
      supplierId,
      color,
      size,
      thickness,
      length,
      width,
      weight,
      description,
      note,
      image,
      gallery,
      actorName,
      actorId,
      reason
    } = req.body;

    if (code && code.trim().toUpperCase() !== prod.code) {
      const exists = data.products.some((p) => p.id !== prod.id && p.code.toLowerCase() === code.trim().toLowerCase());
      if (exists) return res.status(400).json({ error: 'ეს კოდი უკვე დაკავებულია სხვა პროდუქტის მიერ' });
      prod.code = code.trim().toUpperCase();
    }

    if (sellingPrice !== undefined && Number(sellingPrice) !== prod.sellingPrice) {
      const oldPrice = prod.sellingPrice;
      const newPrice = Number(sellingPrice);
      prod.sellingPrice = newPrice;

      data.priceHistories.unshift({
        id: 'ph_' + Date.now(),
        productId: prod.id,
        oldPrice,
        newPrice,
        changedBy: actorId || 'system',
        changedByName: actorName || 'ადმინი',
        date: new Date().toISOString(),
        reason: reason || 'ძირითადი ფასის განახლება'
      });
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

    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'პროდუქტის განახლება', `განახლდა პროდუქტი ${prod.code}`);
    res.json(prod);
  });

  // Direct Stock Intake / Purchase Intake
  app.post('/api/products/:id/add-stock', (req: Request, res: Response) => {
    const data = db.getData();
    const prod = data.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'პროდუქტი ვერ მოიძებნა' });

    const { quantity, unitCost, supplierId, documentNo, comment, actorId, actorName } = req.body;

    const qty = Number(quantity);
    const cost = Number(unitCost);

    if (!qty || qty <= 0 || cost === undefined || cost < 0) {
      return res.status(400).json({ error: 'გთხოვთ მიუთითოთ ვალიდური რაოდენობა და ასაღები ფასი' });
    }

    const prevStock = prod.currentStock;
    const newStock = prevStock + qty;

    // Recalculate average cost price
    const totalCostValue = prevStock * prod.averageCostPrice + qty * cost;
    const newAvgCost = newStock > 0 ? totalCostValue / newStock : cost;

    prod.currentStock = newStock;
    prod.averageCostPrice = Math.round(newAvgCost * 100) / 100;
    prod.lastCostPrice = cost;
    prod.updatedAt = new Date().toISOString();

    // Create Batch record
    const supplier = data.suppliers.find((s) => s.id === supplierId);
    const newBatch: ProductBatch = {
      id: 'batch_' + Date.now(),
      productId: prod.id,
      receivedQuantity: qty,
      remainingQuantity: qty,
      unitCost: cost,
      receivedDate: new Date().toISOString(),
      supplierId: supplierId || undefined,
      supplierName: supplier ? supplier.name : undefined,
      documentNo: documentNo || undefined
    };
    data.productBatches.push(newBatch);

    // Stock movement log
    data.stockMovements.unshift({
      id: 'mov_' + Date.now(),
      productId: prod.id,
      productName: prod.name,
      changeQuantity: qty,
      previousStock: prevStock,
      newStock: newStock,
      type: 'purchase',
      referenceNo: documentNo || 'INTAKE',
      note: comment || 'მარაგის დამატება',
      date: new Date().toISOString(),
      userId: actorId || 'admin',
      userName: actorName || 'ადმინი'
    });

    db.save();
    db.logAudit(
      actorId || 'admin',
      actorName || 'ადმინი',
      'მარაგის შევსება',
      `დაემატა ${qty} ${prod.unit} ${prod.name}, ასაღები ფასი: ${cost} ₾`
    );

    res.json({ product: prod, batch: newBatch });
  });

  // Bulk price update
  app.post('/api/products/bulk-price-update', (req: Request, res: Response) => {
    const data = db.getData();
    const { categoryId, percentage, mode, actorId, actorName } = req.body;
    // mode: 'percent_increase' | 'percent_decrease'

    const pct = Number(percentage);
    if (!pct || pct <= 0) return res.status(400).json({ error: 'მიუთითეთ პროცენტი' });

    let updatedCount = 0;
    data.products.forEach((p) => {
      if (!categoryId || p.categoryId === categoryId) {
        const oldPrice = p.sellingPrice;
        let newPrice = oldPrice;
        if (mode === 'percent_increase') {
          newPrice = Math.round(oldPrice * (1 + pct / 100) * 100) / 100;
        } else {
          newPrice = Math.round(oldPrice * (1 - pct / 100) * 100) / 100;
        }

        if (newPrice !== oldPrice) {
          p.sellingPrice = newPrice;
          data.priceHistories.unshift({
            id: 'ph_' + Date.now() + '_' + updatedCount,
            productId: p.id,
            oldPrice,
            newPrice,
            changedBy: actorId || 'admin',
            changedByName: actorName || 'ადმინი',
            date: new Date().toISOString(),
            reason: `ჯგუფური ფასის ცვლილება (${mode === 'percent_increase' ? '+' : '-'}${pct}%)`
          });
          updatedCount++;
        }
      }
    });

    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'ჯგუფური ფასის ცვლილება', `განახლდა ${updatedCount} პროდუქტი`);
    res.json({ updatedCount });
  });

  // --- SUPPLIERS ---
  app.get('/api/suppliers', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.suppliers);
  });

  app.post('/api/suppliers', (req: Request, res: Response) => {
    const data = db.getData();
    const { name, taxId, contactPerson, phone, address, bank, iban, comment, actorId, actorName } = req.body;

    if (!name || !phone) return res.status(400).json({ error: 'სახელი და ტელეფონი სავალდებულოა' });

    const newSup: Supplier = {
      id: 'sup_' + Date.now(),
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

    data.suppliers.push(newSup);
    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'მომწოდებლის შექმნა', `დაემატა ${newSup.name}`);
    res.json(newSup);
  });

  app.put('/api/suppliers/:id', (req: Request, res: Response) => {
    const data = db.getData();
    const sup = data.suppliers.find((s) => s.id === req.params.id);
    if (!sup) return res.status(404).json({ error: 'მომწოდებელი ვერ მოიძებნა' });

    const { name, taxId, contactPerson, phone, address, bank, iban, comment } = req.body;
    if (name) sup.name = name.trim();
    if (taxId !== undefined) sup.taxId = taxId;
    if (contactPerson !== undefined) sup.contactPerson = contactPerson;
    if (phone) sup.phone = phone.trim();
    if (address !== undefined) sup.address = address;
    if (bank !== undefined) sup.bank = bank;
    if (iban !== undefined) sup.iban = iban;
    if (comment !== undefined) sup.comment = comment;

    db.save();
    res.json(sup);
  });

  // Supplier Payment
  app.post('/api/suppliers/:id/pay', (req: Request, res: Response) => {
    const data = db.getData();
    const sup = data.suppliers.find((s) => s.id === req.params.id);
    if (!sup) return res.status(404).json({ error: 'მომწოდებელი ვერ მოიძებნა' });

    const { amount, method, comment, actorId, actorName } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'მიუთითეთ ვალიდური თანხა' });

    sup.balance = Math.max(0, sup.balance - amt);

    data.cashTransactions.unshift({
      id: 'tx_' + Date.now(),
      type: 'supplier_payment',
      amount: amt,
      method: method || 'cash',
      description: `მომწოდებლის გადახდა: ${sup.name}${comment ? ` (${comment})` : ''}`,
      date: new Date().toISOString(),
      userId: actorId || 'admin',
      userName: actorName || 'ადმინი'
    });

    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'მომწოდებლის გადახდა', `გადაეხადა ${amt} ₾ - ${sup.name}`);
    res.json(sup);
  });

  // --- PURCHASES (Full Invoice Stock Intake) ---
  app.get('/api/purchases', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.purchases);
  });

  app.post('/api/purchases', (req: Request, res: Response) => {
    const data = db.getData();
    const { supplierId, documentNo, date, items, paidAmount, actorId, actorName } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'აირჩიეთ მომწოდებელი და დაამატეთ პროდუქტები' });
    }

    const supplier = data.suppliers.find((s) => s.id === supplierId);
    if (!supplier) return res.status(400).json({ error: 'მომწოდებელი ვერ მოიძებნა' });

    const pDocNo = documentNo?.trim() || `PUR-${data.counters.purchase++}`;

    let totalAmount = 0;
    const purchaseItems: any[] = [];

    // Process each item
    for (const item of items) {
      const prod = data.products.find((p) => p.id === item.productId);
      if (!prod) continue;

      const qty = Number(item.quantity);
      const cost = Number(item.unitCost);
      const lineTotal = qty * cost;
      totalAmount += lineTotal;

      purchaseItems.push({
        id: 'pitem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        purchaseId: '',
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        quantity: qty,
        unitCost: cost,
        total: lineTotal
      });

      // Update product stock and average cost
      const prevStock = prod.currentStock;
      const newStock = prevStock + qty;
      const totalCostVal = prevStock * prod.averageCostPrice + qty * cost;
      const newAvgCost = newStock > 0 ? totalCostVal / newStock : cost;

      prod.currentStock = newStock;
      prod.averageCostPrice = Math.round(newAvgCost * 100) / 100;
      prod.lastCostPrice = cost;
      prod.updatedAt = new Date().toISOString();

      // Create Product Batch
      data.productBatches.push({
        id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId: prod.id,
        receivedQuantity: qty,
        remainingQuantity: qty,
        unitCost: cost,
        receivedDate: date || new Date().toISOString(),
        supplierId: supplier.id,
        supplierName: supplier.name,
        documentNo: pDocNo
      });

      // Stock movement log
      data.stockMovements.unshift({
        id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId: prod.id,
        productName: prod.name,
        changeQuantity: qty,
        previousStock: prevStock,
        newStock: newStock,
        type: 'purchase',
        referenceNo: pDocNo,
        note: `შესყიდვა მომწოდებლისგან: ${supplier.name}`,
        date: date || new Date().toISOString(),
        userId: actorId || 'admin',
        userName: actorName || 'ადმინი'
      });
    }

    const paid = Number(paidAmount) || 0;
    const balanceDue = Math.max(0, totalAmount - paid);
    let pStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (paid >= totalAmount) pStatus = 'paid';
    else if (paid > 0) pStatus = 'partial';

    const newPurchase: Purchase = {
      id: 'pur_' + Date.now(),
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

    // Update supplier debt balance
    if (balanceDue > 0) {
      supplier.balance += balanceDue;
    }

    // Cash transaction if paid
    if (paid > 0) {
      data.cashTransactions.unshift({
        id: 'tx_' + Date.now(),
        type: 'purchase',
        amount: paid,
        method: 'cash',
        description: `შესყიდვის გადახდა (#${pDocNo}, მომწოდებელი: ${supplier.name})`,
        referenceNo: pDocNo,
        date: new Date().toISOString(),
        userId: actorId || 'admin',
        userName: actorName || 'ადმინი'
      });
    }

    db.save();
    db.logAudit(
      actorId || 'admin',
      actorName || 'ადმინი',
      'ახალი შესყიდვა',
      `შესყიდვა #${pDocNo}, ჯამი: ${totalAmount} ₾, მომწოდებელი: ${supplier.name}`
    );

    res.json(newPurchase);
  });

  // --- CUSTOMERS ---
  app.get('/api/customers', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.customers);
  });

  app.post('/api/customers', (req: Request, res: Response) => {
    const data = db.getData();
    const {
      type,
      name,
      lastName,
      phone,
      address,
      secondPhone,
      comment,
      companyName,
      taxId,
      contactPerson,
      email,
      legalAddress,
      bank,
      iban,
      actorId,
      actorName
    } = req.body;

    if (!name || !phone) return res.status(400).json({ error: 'სახელი და ტელეფონი სავალდებულოა' });

    const newCust: Customer = {
      id: 'cust_' + Date.now(),
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

    data.customers.push(newCust);
    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'კლიენტის შექმნა', `დაემატა ${newCust.name}`);
    res.json(newCust);
  });

  app.put('/api/customers/:id', (req: Request, res: Response) => {
    const data = db.getData();
    const cust = data.customers.find((c) => c.id === req.params.id);
    if (!cust) return res.status(404).json({ error: 'კლიენტი ვერ მოიძებნა' });

    const {
      type,
      name,
      lastName,
      phone,
      address,
      secondPhone,
      comment,
      companyName,
      taxId,
      contactPerson,
      email,
      legalAddress,
      bank,
      iban,
      specialPrices
    } = req.body;

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

    db.save();
    res.json(cust);
  });

  // Customer Debt Payment
  app.post('/api/customers/:id/pay-debt', (req: Request, res: Response) => {
    const data = db.getData();
    const cust = data.customers.find((c) => c.id === req.params.id);
    if (!cust) return res.status(404).json({ error: 'კლიენტი ვერ მოიძებნა' });

    const { amount, method, comment, actorId, actorName } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'მიუთითეთ ვალიდური თანხა' });

    cust.totalDebt = Math.max(0, cust.totalDebt - amt);

    data.cashTransactions.unshift({
      id: 'tx_' + Date.now(),
      type: 'customer_payment',
      amount: amt,
      method: method || 'cash',
      description: `კლიენტის დავალიანების დაფარვა: ${cust.name}${cust.companyName ? ` (${cust.companyName})` : ''}`,
      date: new Date().toISOString(),
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე'
    });

    db.save();
    db.logAudit(actorId || 'cashier', actorName || 'მოლარე', 'დავალიანების დაფარვა', `${cust.name} - დაფარა ${amt} ₾`);
    res.json(cust);
  });

  // --- POS & SALES (CRITICAL ATOMIC TRANSACTION) ---
  app.get('/api/sales', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.sales);
  });

  app.post('/api/sales', (req: Request, res: Response) => {
    const data = db.getData();
    const {
      customerId,
      items,
      discount,
      deliveryFee,
      deliveryType,
      deliveryDetails,
      payments,
      holdNote,
      isHeld,
      actorId,
      actorName
    } = req.body;

    if (isHeld) {
      // Held sale logic
      const heldSale: Sale = {
        id: 'sale_held_' + Date.now(),
        invoiceNo: 'HELD-' + Date.now().toString().slice(-6),
        customerId: customerId || 'temp',
        customerName: 'შეჩერებული გაყიდვა',
        customerPhone: '',
        userId: actorId || 'cashier',
        userName: actorName || 'მოლარე',
        date: new Date().toISOString(),
        subtotal: 0,
        discount: 0,
        deliveryFee: 0,
        grandTotal: 0,
        paidAmount: 0,
        balanceDue: 0,
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
      db.save();
      return res.json(heldSale);
    }

    if (!customerId) {
      return res.status(400).json({ error: 'კლიენტის არჩევა სავალდებულოა!' });
    }

    const customer = data.customers.find((c) => c.id === customerId);
    if (!customer) {
      return res.status(400).json({ error: 'არჩეული კლიენტი ვერ მოიძებნა' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'კალათა ცარიელია' });
    }

    // Generate Invoice Number INV-2026-000001
    const invSeq = String(data.counters.invoice++).padStart(6, '0');
    const invoiceNo = `INV-2026-${invSeq}`;

    let subtotal = 0;
    const saleItems: SaleItem[] = [];

    // Process items and check stock
    for (const rawItem of items) {
      const prod = data.products.find((p) => p.id === rawItem.productId);
      if (!prod) continue;

      const qty = Number(rawItem.quantity);
      if (!qty || qty <= 0) continue;

      if (!data.settings.allowNegativeStock && prod.currentStock < qty) {
        return res
          .status(400)
          .json({ error: `მარაგში არ არის საკმარისი რაოდენობა: ${prod.name} (ხელმისაწვდომია: ${prod.currentStock} ${prod.unit})` });
      }

      // Price override logic
      const actualSellingPrice =
        rawItem.sellingPrice !== undefined ? Number(rawItem.sellingPrice) : prod.sellingPrice;
      const lineTotal = Math.round(qty * actualSellingPrice * 100) / 100;
      subtotal += lineTotal;

      // Cost price snapshot (important for history)
      const costSnapshot = prod.averageCostPrice || prod.lastCostPrice || 0;
      const costTotal = Math.round(qty * costSnapshot * 100) / 100;
      const profitAmount = lineTotal - costTotal;

      saleItems.push({
        id: 'sitem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
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
        profitAmount
      });

      // Deduct stock
      const prevStock = prod.currentStock;
      const newStock = prevStock - qty;
      prod.currentStock = newStock;
      prod.totalSold = (prod.totalSold || 0) + qty;
      prod.updatedAt = new Date().toISOString();

      // Deduct from batches (FIFO or proportion)
      let qtyToDeduct = qty;
      for (const batch of data.productBatches.filter((b) => b.productId === prod.id && b.remainingQuantity > 0)) {
        if (qtyToDeduct <= 0) break;
        const deduct = Math.min(batch.remainingQuantity, qtyToDeduct);
        batch.remainingQuantity -= deduct;
        qtyToDeduct -= deduct;
      }

      // Record stock movement
      data.stockMovements.unshift({
        id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId: prod.id,
        productName: prod.name,
        changeQuantity: -qty,
        previousStock: prevStock,
        newStock: newStock,
        type: 'sale',
        referenceNo: invoiceNo,
        note: `გაყიდვა კლიენტზე: ${customer.name}`,
        date: new Date().toISOString(),
        userId: actorId || 'cashier',
        userName: actorName || 'მოლარე'
      });
    }

    const disc = Number(discount) || 0;
    const delFee = deliveryType === 'delivery' ? Number(deliveryFee) || 0 : 0;
    const grandTotal = Math.max(0, subtotal - disc + delFee);

    // Process payments (Split payment supported)
    let totalPaid = 0;
    const salePayments: any[] = [];

    if (payments && Array.isArray(payments)) {
      for (const p of payments) {
        const pAmt = Number(p.amount) || 0;
        if (pAmt > 0) {
          totalPaid += pAmt;
          salePayments.push({
            id: 'spay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            saleId: '',
            method: p.method,
            amount: pAmt,
            date: new Date().toISOString()
          });

          // Log cash transaction
          data.cashTransactions.unshift({
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            type: 'sale',
            amount: pAmt,
            method: p.method,
            description: `გაყიდვა #${invoiceNo} (${customer.name})`,
            referenceNo: invoiceNo,
            date: new Date().toISOString(),
            userId: actorId || 'cashier',
            userName: actorName || 'მოლარე'
          });
        }
      }
    }

    const balanceDue = Math.max(0, grandTotal - totalPaid);
    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (totalPaid >= grandTotal) paymentStatus = 'paid';
    else if (totalPaid > 0) paymentStatus = 'partial';

    // If there is debt balance due, add to customer debt
    if (balanceDue > 0) {
      customer.totalDebt += balanceDue;
    }
    customer.totalPurchased += grandTotal;
    customer.lastPurchaseDate = new Date().toISOString();

    const customerFullName =
      customer.type === 'company'
        ? customer.companyName || customer.name
        : `${customer.name} ${customer.lastName || ''}`.trim();

    const newSale: Sale = {
      id: 'sale_' + Date.now(),
      invoiceNo,
      customerId: customer.id,
      customerName: customerFullName,
      customerPhone: customer.phone,
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე',
      date: new Date().toISOString(),
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
      createdAt: new Date().toISOString()
    };

    saleItems.forEach((si) => (si.saleId = newSale.id));
    salePayments.forEach((sp) => (sp.saleId = newSale.id));

    data.sales.unshift(newSale);
    db.save();

    db.logAudit(
      actorId || 'cashier',
      actorName || 'მოლარე',
      'ახალი გაყიდვა',
      `ინვოისი #${invoiceNo}, კლიენტი: ${customerFullName}, სულ: ${grandTotal} ₾`
    );

    res.json(newSale);
  });

  // Unhold or Delete Held Sale
  app.delete('/api/sales/held/:id', (req: Request, res: Response) => {
    const data = db.getData();
    const idx = data.sales.findIndex((s) => s.id === req.params.id && s.isHeld);
    if (idx !== -1) {
      data.sales.splice(idx, 1);
      db.save();
    }
    res.json({ success: true });
  });

  // --- RETURNS ---
  app.post('/api/returns', (req: Request, res: Response) => {
    const data = db.getData();
    const { saleId, items, reason, actorId, actorName } = req.body;

    const sale = data.sales.find((s) => s.id === saleId);
    if (!sale) return res.status(404).json({ error: 'გაყიდვა ვერ მოიძებნა' });

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'აირჩიეთ დასაბრუნებელი საქონელი' });
    }

    const retSeq = String(data.counters.return++).padStart(6, '0');
    const returnNo = `RET-2026-${retSeq}`;

    let totalRefund = 0;
    const returnItems: any[] = [];

    for (const rItem of items) {
      const saleItem = sale.items.find((si) => si.productId === rItem.productId);
      if (!saleItem) continue;

      const qty = Number(rItem.quantityReturned);
      if (!qty || qty <= 0) continue;

      const lineRefund = Math.round(qty * saleItem.sellingPrice * 100) / 100;
      totalRefund += lineRefund;

      returnItems.push({
        id: 'ritem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        returnId: '',
        productId: saleItem.productId,
        productName: saleItem.productName,
        productCode: saleItem.productCode,
        unit: saleItem.unit,
        quantityReturned: qty,
        unitPrice: saleItem.sellingPrice,
        totalRefunded: lineRefund
      });

      // Restore product stock
      const prod = data.products.find((p) => p.id === saleItem.productId);
      if (prod) {
        const prevStock = prod.currentStock;
        const newStock = prevStock + qty;
        prod.currentStock = newStock;
        prod.updatedAt = new Date().toISOString();

        data.stockMovements.unshift({
          id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          productId: prod.id,
          productName: prod.name,
          changeQuantity: qty,
          previousStock: prevStock,
          newStock: newStock,
          type: 'return',
          referenceNo: returnNo,
          note: `დაბრუნება ინვოისიდან #${sale.invoiceNo}`,
          date: new Date().toISOString(),
          userId: actorId || 'cashier',
          userName: actorName || 'მოლარე'
        });
      }
    }

    const newReturn: ReturnDoc = {
      id: 'ret_' + Date.now(),
      returnNo,
      saleId: sale.id,
      invoiceNo: sale.invoiceNo,
      customerId: sale.customerId,
      customerName: sale.customerName,
      date: new Date().toISOString(),
      totalAmount: totalRefund,
      reason: reason || 'კლიენტის მიერ დაბრუნება',
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე',
      items: returnItems
    };

    returnItems.forEach((ri) => (ri.returnId = newReturn.id));
    data.returns.unshift(newReturn);

    // Update sale status if fully or partially returned
    sale.status = 'returned';

    // Financial adjustment: register negative cash flow or reduce debt
    const cust = data.customers.find((c) => c.id === sale.customerId);
    if (cust && cust.totalDebt > 0) {
      cust.totalDebt = Math.max(0, cust.totalDebt - totalRefund);
    }

    data.cashTransactions.unshift({
      id: 'tx_' + Date.now(),
      type: 'return',
      amount: totalRefund,
      method: 'cash',
      description: `თანხის დაბრუნება (დოკუმენტი #${returnNo}, ინვოისი #${sale.invoiceNo})`,
      referenceNo: returnNo,
      date: new Date().toISOString(),
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე'
    });

    db.save();
    db.logAudit(
      actorId || 'cashier',
      actorName || 'მოლარე',
      'საქონლის დაბრუნება',
      `დაბრუნების დოკუმენტი #${returnNo}, ინვოისი #${sale.invoiceNo}, თანხა: ${totalRefund} ₾`
    );

    res.json(newReturn);
  });

  // --- QUOTES & ORDERS ---
  app.get('/api/quotes', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.quotes);
  });

  app.post('/api/quotes', (req: Request, res: Response) => {
    const data = db.getData();
    const { customerId, items, note } = req.body;

    const customer = data.customers.find((c) => c.id === customerId);
    if (!customer) return res.status(400).json({ error: 'აირჩიეთ კლიენტი' });

    const qSeq = String(data.counters.quote++).padStart(6, '0');
    const quoteNo = `QT-2026-${qSeq}`;

    let grandTotal = 0;
    const qItems = (items || []).map((it: any) => {
      const line = Number(it.quantity) * Number(it.price);
      grandTotal += line;
      return {
        id: 'qitem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId: it.productId,
        productName: it.productName,
        productCode: it.productCode,
        unit: it.unit,
        quantity: Number(it.quantity),
        price: Number(it.price),
        total: line
      };
    });

    const custName =
      customer.type === 'company'
        ? customer.companyName || customer.name
        : `${customer.name} ${customer.lastName || ''}`.trim();

    const newQuote: Quote = {
      id: 'quote_' + Date.now(),
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
    db.save();
    res.json(newQuote);
  });

  app.get('/api/orders', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.orders || []);
  });

  app.post('/api/orders', (req: Request, res: Response) => {
    const data = db.getData();
    const {
      customerId,
      customerName,
      customerPhone,
      items,
      paidAmount = 0,
      paymentMethod = 'cash',
      deliveryAddress,
      recipientName,
      recipientPhone,
      comment,
      userId,
      userName
    } = req.body;

    const customer = data.customers.find((c) => c.id === customerId);
    if (!customer && !customerName) return res.status(400).json({ error: 'აირჩიეთ ან მიუთითეთ კლიენტი' });

    const oSeq = String(data.counters.order++).padStart(6, '0');
    const orderNo = `ORD-2026-${oSeq}`;

    let grandTotal = 0;
    const oItems = (items || []).map((it: any) => {
      const line = Number(it.quantity) * Number(it.price || it.sellingPrice);
      grandTotal += line;
      return {
        id: 'oitem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
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
      (customer?.type === 'company'
        ? customer.companyName || customer.name
        : `${customer?.name || ''} ${customer?.lastName || ''}`.trim());

    const initialPaid = Math.min(Number(paidAmount) || 0, grandTotal);
    const balanceDue = Math.max(0, grandTotal - initialPaid);
    const paymentStatus =
      initialPaid >= grandTotal ? 'fully_paid' : initialPaid > 0 ? 'partially_paid' : 'unpaid';

    const payments: any[] = [];
    if (initialPaid > 0) {
      payments.push({
        id: 'opay_' + Date.now(),
        orderId: '',
        amount: initialPaid,
        method: paymentMethod,
        date: new Date().toISOString(),
        userId: userId || 'user',
        userName: userName || 'ოპერატორი',
        comment: 'პირველადი ავანსი / გადახდა შეკვეთის გაფორმებისას'
      });
    }

    const newOrder: Order = {
      id: 'ord_' + Date.now(),
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

    // Ensure link in payments
    newOrder.payments.forEach((p) => (p.orderId = newOrder.id));

    data.orders.unshift(newOrder);
    db.save();
    res.json(newOrder);
  });

  app.put('/api/orders/:id/status', (req: Request, res: Response) => {
    const data = db.getData();
    const ord = data.orders.find((o) => o.id === req.params.id);
    if (!ord) return res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა' });

    const { status } = req.body;
    if (status) ord.status = status as any;

    db.save();
    res.json(ord);
  });

  app.post('/api/orders/:id/payments', (req: Request, res: Response) => {
    const data = db.getData();
    const ord = data.orders.find((o) => o.id === req.params.id);
    if (!ord) return res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა' });

    const { amount, method = 'cash', comment, userId, userName } = req.body;
    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'შეიყვანეთ ვალიდური თანხა' });
    }

    const newPayment = {
      id: 'opay_' + Date.now(),
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

    ord.paidAmount = ord.payments.reduce((sum, p) => sum + p.amount, 0);
    ord.balanceDue = Math.max(0, ord.grandTotal - ord.paidAmount);
    ord.paymentStatus =
      ord.paidAmount >= ord.grandTotal
        ? 'fully_paid'
        : ord.paidAmount > 0
        ? 'partially_paid'
        : 'unpaid';

    // Log transaction
    data.cashTransactions.unshift({
      id: 'tx_' + Date.now(),
      date: new Date().toISOString(),
      type: 'customer_payment',
      amount: paymentAmount,
      method: method as any,
      description: `გადახდა შეკვეთაზე ${ord.orderNo} (${ord.customerName})`,
      referenceNo: ord.orderNo,
      userId: userId || 'user',
      userName: userName || 'ოპერატორი'
    });

    db.save();
    res.json(ord);
  });

  app.post('/api/orders/:id/fulfill', (req: Request, res: Response) => {
    const data = db.getData();
    const ord = data.orders.find((o) => o.id === req.params.id);
    if (!ord) return res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა' });

    if (ord.isFulfilled) {
      return res.status(400).json({ error: 'შეკვეთა უკვე გაცემულია!' });
    }

    // Process stock deduction for each item in the order
    for (const item of ord.items) {
      const prod = data.products.find((p) => p.id === item.productId);
      if (!prod) continue;

      const qty = Number(item.quantity);
      if (!qty || qty <= 0) continue;

      const prevStock = prod.currentStock;
      const newStock = prevStock - qty;
      prod.currentStock = newStock;
      prod.totalSold = (prod.totalSold || 0) + qty;
      prod.updatedAt = new Date().toISOString();

      // Deduct from batches
      let qtyToDeduct = qty;
      for (const batch of data.productBatches.filter((b) => b.productId === prod.id && b.remainingQuantity > 0)) {
        if (qtyToDeduct <= 0) break;
        const deduct = Math.min(batch.remainingQuantity, qtyToDeduct);
        batch.remainingQuantity -= deduct;
        qtyToDeduct -= deduct;
      }

      // Record stock movement
      data.stockMovements.unshift({
        id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId: prod.id,
        productName: prod.name,
        changeQuantity: -qty,
        previousStock: prevStock,
        newStock: newStock,
        type: 'sale',
        referenceNo: ord.orderNo,
        note: `შეკვეთის გაცემა/შესრულება: ${ord.customerName}`,
        date: new Date().toISOString(),
        userId: ord.userId || 'user',
        userName: ord.userName || 'ოპერატორი'
      });
    }

    ord.isFulfilled = true;
    ord.fulfilledAt = new Date().toISOString();
    ord.status = 'fulfilled';

    db.save();
    res.json(ord);
  });

  // --- SHIFTS (სალაროს ცვლები) ---
  app.get('/api/shifts/current', (req: Request, res: Response) => {
    const data = db.getData();
    const openShift = data.shifts.find((s) => s.status === 'open');
    res.json(openShift || null);
  });

  app.get('/api/shifts', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.shifts);
  });

  app.post('/api/shifts/open', (req: Request, res: Response) => {
    const data = db.getData();
    const existing = data.shifts.find((s) => s.status === 'open');
    if (existing) {
      return res.status(400).json({ error: 'მიმდინარე ცვლა უკვე გახსნილია' });
    }

    const { startCash, userId, userName } = req.body;

    const newShift: Shift = {
      id: 'shift_' + Date.now(),
      userId: userId || 'cashier',
      userName: userName || 'მოლარე',
      openedAt: new Date().toISOString(),
      startCash: Number(startCash) || 0,
      status: 'open'
    };

    data.shifts.unshift(newShift);
    db.save();
    db.logAudit(userId || 'cashier', userName || 'მოლარე', 'ცვლის გახსნა', `საწყისი ნაღდი: ${newShift.startCash} ₾`);
    res.json(newShift);
  });

  app.post('/api/shifts/close', (req: Request, res: Response) => {
    const data = db.getData();
    const currentShift = data.shifts.find((s) => s.status === 'open');
    if (!currentShift) return res.status(400).json({ error: 'ღია ცვლა ვერ მოიძებნა' });

    const { endCashActual, comment } = req.body;
    const actual = Number(endCashActual);

    // Calculate cash in system during shift
    const shiftStart = currentShift.openedAt;
    const cashTxs = data.cashTransactions.filter((tx) => tx.date >= shiftStart && tx.method === 'cash');

    let cashSales = 0;
    let cashOuts = 0;
    let cashIns = 0;

    cashTxs.forEach((tx) => {
      if (tx.type === 'sale' || tx.type === 'customer_payment' || tx.type === 'cash_in') {
        cashSales += tx.amount;
      } else if (tx.type === 'expense' || tx.type === 'return' || tx.type === 'purchase' || tx.type === 'cash_out') {
        cashOuts += tx.amount;
      }
    });

    const expected = currentShift.startCash + cashSales - cashOuts;
    const diff = Math.round((actual - expected) * 100) / 100;

    currentShift.closedAt = new Date().toISOString();
    currentShift.endCashExpected = Math.round(expected * 100) / 100;
    currentShift.endCashActual = actual;
    currentShift.difference = diff;
    currentShift.status = 'closed';
    currentShift.comment = comment;

    db.save();
    db.logAudit(
      currentShift.userId,
      currentShift.userName,
      'ცვლის დახურვა',
      `მოსალოდნელი: ${expected} ₾, რეალური: ${actual} ₾, სხვაობა: ${diff} ₾`
    );

    res.json(currentShift);
  });

  // --- EXPENSES & CASH IN/OUT ---
  app.get('/api/expenses', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.expenses);
  });

  app.post('/api/expenses', (req: Request, res: Response) => {
    const data = db.getData();
    const { category, amount, reason, recipient, receiptImage, comment, actorId, actorName } = req.body;

    const amt = Number(amount);
    if (!amt || amt <= 0 || !reason) {
      return res.status(400).json({ error: 'მიუთითეთ თანხა და ხარჯის მიზეზი' });
    }

    const newExpense: Expense = {
      id: 'exp_' + Date.now(),
      category: category || 'საოპერაციო ხარჯი',
      amount: amt,
      reason: reason.trim(),
      recipient: recipient?.trim() || '',
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე',
      date: new Date().toISOString(),
      receiptImage,
      comment
    };

    data.expenses.unshift(newExpense);

    data.cashTransactions.unshift({
      id: 'tx_' + Date.now(),
      type: 'expense',
      amount: amt,
      method: 'cash',
      description: `თანხის გაცემა / ხარჯი: ${reason} (მიმღები: ${recipient || 'N/A'})`,
      date: new Date().toISOString(),
      userId: actorId || 'cashier',
      userName: actorName || 'მოლარე'
    });

    db.save();
    db.logAudit(actorId || 'cashier', actorName || 'მოლარე', 'თანხის გაცემა', `გაიცა ${amt} ₾, მიზეზი: ${reason}`);
    res.json(newExpense);
  });

  app.post('/api/cash-in', (req: Request, res: Response) => {
    const data = db.getData();
    const { amount, description, actorId, actorName } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'მიუთითეთ თანხა' });

    data.cashTransactions.unshift({
      id: 'tx_' + Date.now(),
      type: 'cash_in',
      amount: amt,
      method: 'cash',
      description: `სალაროში თანხის შეტანა: ${description || 'შეტანა'}`,
      date: new Date().toISOString(),
      userId: actorId || 'admin',
      userName: actorName || 'ადმინი'
    });

    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'სალაროში შეტანა', `შეიტანა ${amt} ₾`);
    res.json({ success: true, amount: amt });
  });

  // --- TRANSACTIONS ---
  app.get('/api/transactions', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.cashTransactions);
  });

  // --- STOCK MOVEMENTS, STOCKTAKES & TRANSFERS ---
  app.get('/api/stock-movements', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.stockMovements);
  });

  app.post('/api/stocktakes', (req: Request, res: Response) => {
    const data = db.getData();
    const { items, actorId, actorName } = req.body;

    if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'არ არის მონაცემები' });

    const stocktakeItems: any[] = [];
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

      // Update product stock if adjusted
      if (diff !== 0) {
        prod.currentStock = actual;
        prod.updatedAt = new Date().toISOString();

        data.stockMovements.unshift({
          id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          productId: prod.id,
          productName: prod.name,
          changeQuantity: diff,
          previousStock: expected,
          newStock: actual,
          type: 'adjustment',
          note: `ინვენტარიზაციის კორექტირება (${diff > 0 ? '+' : ''}${diff})`,
          date: new Date().toISOString(),
          userId: actorId || 'admin',
          userName: actorName || 'ადმინი'
        });
      }
    }

    const newStocktake = {
      id: 'st_' + Date.now(),
      date: new Date().toISOString(),
      status: 'completed' as const,
      items: stocktakeItems,
      userId: actorId || 'admin',
      userName: actorName || 'ადმინი',
      confirmedBy: actorName || 'ადმინი'
    };

    data.stocktakes.unshift(newStocktake);
    db.save();
    db.logAudit(actorId || 'admin', actorName || 'ადმინი', 'ინვენტარიზაცია', 'შესრულდა მარაგის ინვენტარიზაცია');
    res.json(newStocktake);
  });

  // --- CATEGORIES & UNITS ---
  app.get('/api/categories', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.categories);
  });

  app.post('/api/categories', (req: Request, res: Response) => {
    const data = db.getData();
    const { name, code, description } = req.body;
    if (!name) return res.status(400).json({ error: 'სახელი სავალდებულოა' });

    const newCat = {
      id: 'cat_' + Date.now(),
      name: name.trim(),
      code: code?.trim().toUpperCase() || 'CAT' + Date.now().toString().slice(-4),
      description: description?.trim()
    };
    data.categories.push(newCat);
    db.save();
    res.json(newCat);
  });

  app.get('/api/units', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.units);
  });

  app.post('/api/units', (req: Request, res: Response) => {
    const data = db.getData();
    const { name, symbol } = req.body;
    if (!name || !symbol) return res.status(400).json({ error: 'სახელი და სიმბოლო სავალდებულოა' });

    const newUnit = {
      id: 'u_' + Date.now(),
      name: name.trim(),
      symbol: symbol.trim()
    };
    data.units.push(newUnit);
    db.save();
    res.json(newUnit);
  });

  // --- AUDIT LOGS ---
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.auditLogs);
  });

  // --- SETTINGS ---
  app.get('/api/settings', (req: Request, res: Response) => {
    const data = db.getData();
    res.json(data.settings);
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    const data = db.getData();
    const { companyName, taxId, address, phone, email, logo, invoiceHeader, invoiceFooter, allowNegativeStock } = req.body;

    if (companyName) data.settings.companyName = companyName;
    if (taxId !== undefined) data.settings.taxId = taxId;
    if (address !== undefined) data.settings.address = address;
    if (phone !== undefined) data.settings.phone = phone;
    if (email !== undefined) data.settings.email = email;
    if (logo !== undefined) data.settings.logo = logo;
    if (invoiceHeader !== undefined) data.settings.invoiceHeader = invoiceHeader;
    if (invoiceFooter !== undefined) data.settings.invoiceFooter = invoiceFooter;
    if (allowNegativeStock !== undefined) data.settings.allowNegativeStock = Boolean(allowNegativeStock);

    db.save();
    res.json(data.settings);
  });

  // --- GLOBAL SEARCH ---
  app.get('/api/search', (req: Request, res: Response) => {
    const query = String(req.query.q || '').trim().toLowerCase();
    if (!query) return res.json({ products: [], customers: [], sales: [], suppliers: [] });

    const data = db.getData();

    const matchedProducts = data.products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query))
    );

    const matchedCustomers = data.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.lastName && c.lastName.toLowerCase().includes(query)) ||
        c.phone.includes(query) ||
        (c.companyName && c.companyName.toLowerCase().includes(query)) ||
        (c.taxId && c.taxId.includes(query))
    );

    const matchedSales = data.sales.filter(
      (s) =>
        s.invoiceNo.toLowerCase().includes(query) ||
        s.customerName.toLowerCase().includes(query) ||
        s.customerPhone.includes(query)
    );

    const matchedSuppliers = data.suppliers.filter(
      (sup) =>
        sup.name.toLowerCase().includes(query) ||
        sup.phone.includes(query) ||
        (sup.taxId && sup.taxId.includes(query))
    );

    res.json({
      products: matchedProducts.slice(0, 10),
      customers: matchedCustomers.slice(0, 10),
      sales: matchedSales.slice(0, 10),
      suppliers: matchedSuppliers.slice(0, 10)
    });
  });

  // Backup & Restore
  app.get('/api/admin/backup', (req: Request, res: Response) => {
    const data = db.getData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="pos_backup.json"');
    res.send(JSON.stringify(data, null, 2));
  });

  app.post('/api/admin/restore', (req: Request, res: Response) => {
    try {
      const backupData = req.body;
      if (!backupData || !backupData.users || !backupData.products) {
        return res.status(400).json({ error: 'არასწორი ბექაფის ფაილის ფორმატი' });
      }
      Object.assign(db.getData(), backupData);
      db.save();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'აღდგენა ვერ განხორციელდა' });
    }
  });
}
