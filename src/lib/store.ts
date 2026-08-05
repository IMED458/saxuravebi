/**
 * Firestore-backed data store.
 *
 * Replaces the old in-memory / server sql.js store. On startup the whole
 * database is hydrated from Firestore into an in-memory cache (so the existing
 * synchronous business logic keeps working), and every mutation is written
 * back to Firestore immediately. Nothing is kept in localStorage — Firestore
 * is the single source of truth.
 */
import bcrypt from 'bcryptjs';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { firestore } from './firebase';
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

// Collection keys that map 1:1 to a Firestore collection.
const COLLECTIONS: (keyof DatabaseSchema)[] = [
  'users',
  'categories',
  'units',
  'products',
  'productBatches',
  'priceHistories',
  'suppliers',
  'customers',
  'shifts',
  'sales',
  'purchases',
  'returns',
  'stockMovements',
  'stockTransfers',
  'stocktakes',
  'expenses',
  'cashTransactions',
  'auditLogs',
  'quotes',
  'orders'
];

/** Firestore rejects `undefined`; recursively strip it out. */
function clean<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => clean(v)) as unknown as T;
  }
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = clean(v as any);
    }
    return out;
  }
  return obj;
}

function getDefaultData(): DatabaseSchema {
  const now = new Date().toISOString();
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
          'sale', 'product_add', 'product_edit', 'price_change', 'any_price_sale',
          'discount', 'return', 'sale_cancel', 'invoice_edit', 'invoice_reprint',
          'purchase_add', 'stock_add', 'stock_adjust', 'view_cost_price',
          'view_profit', 'view_full_stats', 'view_accounting', 'user_create', 'day_close'
        ],
        status: 'active',
        comment: 'მთავარი სუპერ ადმინისტრატორი',
        createdAt: now
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
    products: [],
    productBatches: [],
    priceHistories: [],
    suppliers: [],
    customers: [],
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
      bankName: '',
      bankAccount: '',
      invoiceHeader: 'მადლობას გიხდით შენაძენისთვის!',
      invoiceFooter: 'საქონელი მიღებულია უდეფექტო მდგომარეობაში.',
      allowNegativeStock: false,
      defaultCurrency: '₾'
    },
    counters: { invoice: 1, quote: 1, order: 1, return: 1, purchase: 1 }
  };
}

class FirestoreStore {
  private data: DatabaseSchema = getDefaultData();
  private ready = false;
  private initPromise: Promise<void> | null = null;

  /** Hydrate the in-memory cache from Firestore. Seeds defaults on first run. */
  async init(): Promise<void> {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    // Load meta docs
    const metaSettings = await getDoc(doc(firestore, 'meta', 'settings'));
    const metaCounters = await getDoc(doc(firestore, 'meta', 'counters'));

    // Load every collection in parallel
    const results = await Promise.all(
      COLLECTIONS.map((name) => getDocs(collection(firestore, name as string)))
    );

    const fresh = getDefaultData();
    let hasAnyUser = false;

    COLLECTIONS.forEach((name, idx) => {
      const snap = results[idx];
      if (!snap.empty) {
        (this.data as any)[name] = snap.docs.map((d) => d.data());
      } else {
        (this.data as any)[name] = [];
      }
    });

    hasAnyUser = this.data.users.length > 0;

    if (metaSettings.exists()) {
      this.data.settings = { ...fresh.settings, ...(metaSettings.data() as Settings) };
    } else {
      this.data.settings = fresh.settings;
    }
    if (metaCounters.exists()) {
      this.data.counters = { ...fresh.counters, ...(metaCounters.data() as any) };
    } else {
      this.data.counters = fresh.counters;
    }

    if (!hasAnyUser) {
      // First launch — seed base data into Firestore.
      await this.seed(fresh);
    }

    this.ready = true;
  }

  private async seed(fresh: DatabaseSchema): Promise<void> {
    const batch = writeBatch(firestore);
    (['users', 'categories', 'units'] as (keyof DatabaseSchema)[]).forEach((name) => {
      (fresh[name] as any[]).forEach((item) => {
        batch.set(doc(firestore, name as string, item.id), clean(item));
      });
      (this.data as any)[name] = fresh[name];
    });
    batch.set(doc(firestore, 'meta', 'settings'), clean(fresh.settings));
    batch.set(doc(firestore, 'meta', 'counters'), fresh.counters);
    await batch.commit();
    this.data.settings = fresh.settings;
    this.data.counters = fresh.counters;
  }

  isReady(): boolean {
    return this.ready;
  }

  getData(): DatabaseSchema {
    return this.data;
  }

  /** Upsert a single document into a collection (cache + Firestore). */
  async set(coll: keyof DatabaseSchema, item: any): Promise<void> {
    const arr = this.data[coll] as any[];
    const idx = arr.findIndex((x) => x.id === item.id);
    if (idx === -1) arr.push(item);
    else arr[idx] = item;
    await setDoc(doc(firestore, coll as string, item.id), clean(item));
  }

  /** Upsert many documents at once. */
  async setMany(coll: keyof DatabaseSchema, items: any[]): Promise<void> {
    if (!items.length) return;
    const batch = writeBatch(firestore);
    const arr = this.data[coll] as any[];
    items.forEach((item) => {
      const idx = arr.findIndex((x) => x.id === item.id);
      if (idx === -1) arr.push(item);
      else arr[idx] = item;
      batch.set(doc(firestore, coll as string, item.id), clean(item));
    });
    await batch.commit();
  }

  async del(coll: keyof DatabaseSchema, id: string): Promise<void> {
    const arr = this.data[coll] as any[];
    const idx = arr.findIndex((x) => x.id === id);
    if (idx !== -1) arr.splice(idx, 1);
    await deleteDoc(doc(firestore, coll as string, id));
  }

  async saveCounters(): Promise<void> {
    await setDoc(doc(firestore, 'meta', 'counters'), this.data.counters);
  }

  async saveSettings(): Promise<void> {
    await setDoc(doc(firestore, 'meta', 'settings'), clean(this.data.settings));
  }

  async logAudit(userId: string, userName: string, action: string, details: string): Promise<void> {
    const entry: AuditLog = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      details
    };
    this.data.auditLogs.unshift(entry);
    await setDoc(doc(firestore, 'auditLogs', entry.id), clean(entry));
  }
}

export const store = new FirestoreStore();
