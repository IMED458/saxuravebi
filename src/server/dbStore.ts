import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Category,
  Unit,
  Product,
  ProductBatch,
  PriceHistory,
  Supplier,
  Customer,
  Shift,
  Sale,
  Purchase,
  ReturnDoc,
  StockMovement,
  StockTransfer,
  Stocktake,
  Expense,
  CashTransaction,
  AuditLog,
  Settings,
  Quote,
  Order
} from '../types';

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  units: Unit[];
  products: Product[];
  productBatches: ProductBatch[];
  priceHistories: PriceHistory[];
  suppliers: Supplier[];
  customers: Customer[];
  shifts: Shift[];
  sales: Sale[];
  purchases: Purchase[];
  returns: ReturnDoc[];
  stockMovements: StockMovement[];
  stockTransfers: StockTransfer[];
  stocktakes: Stocktake[];
  expenses: Expense[];
  cashTransactions: CashTransaction[];
  auditLogs: AuditLog[];
  quotes: Quote[];
  orders: Order[];
  settings: Settings;
  counters: {
    invoice: number;
    quote: number;
    order: number;
    return: number;
    purchase: number;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

function getDefaultData(): DatabaseSchema {
  const adminPasswordHash = bcrypt.hashSync('imed458', 10);

  return {
    users: [
      {
        id: 'user_admin_1',
        firstName: 'იმედო',
        lastName: 'იმედაშვილი',
        position: 'სუპერ ადმინისტრატორი',
        phone: '599000000',
        username: 'imed',
        passwordHash: adminPasswordHash,
        role: 'super_admin',
        permissions: [
          'sale',
          'product_add',
          'product_edit',
          'price_change',
          'any_price_sale',
          'discount',
          'return',
          'sale_cancel',
          'invoice_edit',
          'invoice_reprint',
          'purchase_add',
          'stock_add',
          'stock_adjust',
          'view_cost_price',
          'view_profit',
          'view_full_stats',
          'view_accounting',
          'user_create',
          'day_close'
        ],
        status: 'active',
        comment: 'მთავარი სუპერ ადმინისტრატორი',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_cashier_1',
        firstName: 'გიორგი',
        lastName: 'მოლარე',
        position: 'მოლარე',
        phone: '555112233',
        username: 'cashier',
        passwordHash: bcrypt.hashSync('cashier123', 10),
        role: 'cashier',
        permissions: ['sale', 'discount', 'invoice_reprint', 'day_close'],
        status: 'active',
        comment: 'მთავარი სალაროს მოლარე',
        createdAt: new Date().toISOString()
      }
    ],
    categories: [
      { id: 'cat_iron', name: 'რკინა-ფოლადი', code: 'IRON', description: 'მილები, არმატურა, პროფილი, კუთხოვანა' },
      { id: 'cat_roofing', name: 'სახურავი', code: 'ROOF', description: 'შეღებილი, მოთუთიებული, თუნუქი' },
      { id: 'cat_wood', name: 'ხე-მასალა', code: 'WOOD', description: 'ფიცარი, ძელი, რეიკა' },
      { id: 'cat_fasteners', name: 'სამაგრები', code: 'FAST', description: 'ლურსმანი, შურუპი, დუბელი, ჭანჭიკი' },
      { id: 'cat_building', name: 'სამშენებლო ქიმია', code: 'CHEM', description: 'ცემენტი, საღებავი, წებო, ქაფი' },
      { id: 'cat_tools', name: 'ხელსაწყოები', code: 'TOOL', description: 'ელექტრო და ხელის ინსტრუმენტები' }
    ],
    units: [
      { id: 'u_m', name: 'მეტრი', symbol: 'მ' },
      { id: 'u_pcs', name: 'ცალი', symbol: 'ც' },
      { id: 'u_sqm', name: 'კვადრატული მეტრი', symbol: 'მ²' },
      { id: 'u_cum', name: 'კუბური მეტრი', symbol: 'მ³' },
      { id: 'u_kg', name: 'კილოგრამი', symbol: 'კგ' },
      { id: 'u_ton', name: 'ტონა', symbol: 'ტ' },
      { id: 'u_liter', name: 'ლიტრი', symbol: 'ლ' },
      { id: 'u_sheet', name: 'ფურცელი', symbol: 'ფურც' },
      { id: 'u_pack', name: 'შეკვრა', symbol: 'შეკ' },
      { id: 'u_box', name: 'ყუთი', symbol: 'ყუთი' }
    ],
    products: [
      {
        id: 'prod_1',
        name: 'კვადრატული მილი 40×40×2',
        code: 'PIPE-4040-2',
        categoryId: 'cat_iron',
        unit: 'მეტრი',
        sellingPrice: 15,
        minStock: 50,
        status: 'active',
        brand: 'Rustavi Steel',
        color: 'შავი',
        thickness: '2მმ',
        size: '40x40',
        currentStock: 0,
        averageCostPrice: 0,
        lastCostPrice: 0,
        totalSold: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod_2',
        name: 'არმატურა 12მმ A500C',
        code: 'REBAR-12',
        categoryId: 'cat_iron',
        unit: 'მეტრი',
        sellingPrice: 3.5,
        minStock: 100,
        status: 'active',
        brand: 'GeoSteel',
        thickness: '12მმ',
        currentStock: 150,
        averageCostPrice: 2.2,
        lastCostPrice: 2.2,
        totalSold: 40,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod_3',
        name: 'სახურავის თუნუქი RAL3005 (0.45მმ)',
        code: 'ROOF-RAL3005',
        categoryId: 'cat_roofing',
        unit: 'მ²',
        sellingPrice: 22,
        minStock: 30,
        status: 'active',
        brand: 'Metaksa',
        color: 'ალუბლისფერი',
        thickness: '0.45მმ',
        currentStock: 80,
        averageCostPrice: 16.5,
        lastCostPrice: 16.5,
        totalSold: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod_4',
        name: 'ხის ფიცარი 25×100×4000',
        code: 'WOOD-25-100',
        categoryId: 'cat_wood',
        unit: 'ცალი',
        sellingPrice: 12,
        minStock: 20,
        status: 'active',
        currentStock: 45,
        averageCostPrice: 8.5,
        lastCostPrice: 8.5,
        totalSold: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod_5',
        name: 'ლურსმანი 70მმ',
        code: 'LURS-70',
        categoryId: 'cat_fasteners',
        unit: 'კგ',
        sellingPrice: 5.5,
        minStock: 25,
        status: 'active',
        currentStock: 60,
        averageCostPrice: 3.8,
        lastCostPrice: 3.8,
        totalSold: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    productBatches: [
      {
        id: 'batch_2',
        productId: 'prod_2',
        receivedQuantity: 190,
        remainingQuantity: 150,
        unitCost: 2.2,
        receivedDate: new Date().toISOString(),
        supplierName: 'შპს გეოსტილი'
      },
      {
        id: 'batch_3',
        productId: 'prod_3',
        receivedQuantity: 95,
        remainingQuantity: 80,
        unitCost: 16.5,
        receivedDate: new Date().toISOString(),
        supplierName: 'შპს მეტაქსა'
      }
    ],
    priceHistories: [],
    suppliers: [
      {
        id: 'sup_1',
        name: 'შპს რუსთავის ფოლადი',
        taxId: '204987654',
        contactPerson: 'დავით კობახიძე',
        phone: '599112233',
        address: 'რუსთავი, მშენებელთა ქ. 12',
        bank: 'თიბისი ბანკი',
        iban: 'GE12TB7788990011223344',
        comment: 'მილებისა და პროფილების ძირითადი მომწოდებელი',
        balance: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sup_2',
        name: 'შპს მეტაქსა ჯორჯია',
        taxId: '205123456',
        contactPerson: 'ზურაბ გიორგაძე',
        phone: '595445566',
        address: 'თბილისი, კახეთის გზატკეცილი 4',
        bank: 'საქართველოს ბანკი',
        iban: 'GE88BG0000000123456789',
        comment: 'სახურავის მასალები',
        balance: 0,
        createdAt: new Date().toISOString()
      }
    ],
    customers: [
      {
        id: 'cust_1',
        type: 'individual',
        name: 'გიორგი',
        lastName: 'მაისურაძე',
        phone: '555987654',
        address: 'თელავი, ჭავჭავაძის ქ. 20',
        comment: 'რეგულარული მყიდველი',
        totalDebt: 0,
        totalPurchased: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cust_2',
        type: 'company',
        name: 'შპს მშენებელი 2026',
        companyName: 'შპს მშენებელი 2026',
        taxId: '404555666',
        contactPerson: 'ნიკოლოზ ბერიძე',
        phone: '599334455',
        email: 'info@mshenebeli.ge',
        legalAddress: 'თბილისი, ვაჟა-ფშაველას 45',
        bank: 'თიბისი ბანკი',
        iban: 'GE44TB0011223344556677',
        totalDebt: 0,
        totalPurchased: 0,
        createdAt: new Date().toISOString()
      }
    ],
    shifts: [],
    sales: [],
    purchases: [],
    returns: [],
    stockMovements: [],
    stockTransfers: [],
    stocktakes: [],
    expenses: [],
    cashTransactions: [],
    auditLogs: [],
    quotes: [],
    orders: [],
    settings: {
      companyName: 'შპს სამშენებლო და სამეურნეო მასალების მაღაზია',
      taxId: '405000111',
      address: 'თელავი, რუსთაველის გამზირი 10',
      phone: '599 12 34 56',
      email: 'info@construction-store.ge',
      invoiceHeader: 'მადლობას გიხდით შენაძენისთვის!',
      invoiceFooter: 'საქონელი მიღებულია უდეფექტო მდგომარეობაში.',
      allowNegativeStock: false,
      defaultCurrency: '₾'
    },
    counters: {
      invoice: 1,
      quote: 1,
      order: 1,
      return: 1,
      purchase: 1
    }
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadData();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('Failed to load database, creating fresh one:', e);
    }
    const defaultData = getDefaultData();
    this.saveDataDirect(defaultData);
    return defaultData;
  }

  private saveDataDirect(data: DatabaseSchema) {
    this.ensureDirectory();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  public save() {
    this.saveDataDirect(this.data);
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public logAudit(userId: string, userName: string, action: string, details: string) {
    this.data.auditLogs.unshift({
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      details
    });
    this.save();
  }
}

export const db = new Database();
