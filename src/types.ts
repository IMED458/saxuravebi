/**
 * Georgian POS & Inventory System Type Definitions
 */

export type UserRole =
  | 'super_admin'
  | 'owner'
  | 'director'
  | 'administrator'
  | 'manager'
  | 'cashier'
  | 'head_cashier'
  | 'warehouse'
  | 'purchasing'
  | 'accountant'
  | 'view_only';

export type UserPermission =
  | 'sale'
  | 'product_add'
  | 'product_edit'
  | 'price_change'
  | 'any_price_sale'
  | 'discount'
  | 'return'
  | 'sale_cancel'
  | 'invoice_edit'
  | 'invoice_reprint'
  | 'purchase_add'
  | 'stock_add'
  | 'stock_adjust'
  | 'view_cost_price'
  | 'view_profit'
  | 'view_full_stats'
  | 'view_accounting'
  | 'user_create'
  | 'day_close';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  phone: string;
  username: string;
  passwordHash?: string;
  role: UserRole;
  permissions: UserPermission[];
  branchId?: string;
  cashRegisterId?: string;
  status: 'active' | 'disabled';
  comment?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  purchaseId?: string;
  receivedQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  receivedDate: string;
  supplierId?: string;
  supplierName?: string;
  documentNo?: string;
}

export interface PriceHistory {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changedByName: string;
  date: string;
  reason?: string;
}

export interface Product {
  id: string;
  name: string;
  code: string; // e.g. PIPE-4040-2
  categoryId: string;
  unit: string; // e.g. მეტრი, ცალი, კგ
  sellingPrice: number;
  minStock: number;
  status: 'active' | 'inactive';
  barcode?: string;
  sku?: string;
  brand?: string;
  supplierId?: string;
  color?: string;
  size?: string;
  thickness?: string;
  length?: string;
  width?: string;
  weight?: string;
  description?: string;
  note?: string;
  image?: string;
  gallery?: string[];
  currentStock: number;
  reservedStock?: number;
  averageCostPrice: number;
  lastCostPrice: number;
  totalSold: number;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  taxId?: string;
  contactPerson?: string;
  phone: string;
  address?: string;
  bank?: string;
  iban?: string;
  comment?: string;
  balance: number; // Positive means store owes supplier
  createdAt: string;
}

export interface Customer {
  id: string;
  type: 'individual' | 'company';
  name: string;
  lastName?: string;
  phone: string;
  address?: string;
  secondPhone?: string;
  comment?: string;
  companyName?: string;
  taxId?: string;
  contactPerson?: string;
  email?: string;
  legalAddress?: string;
  bank?: string;
  iban?: string;
  totalDebt: number; // Positive means customer owes store
  totalPurchased: number;
  lastPurchaseDate?: string;
  specialPrices?: Record<string, number>; // productId -> custom price
  createdAt: string;
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  cashRegisterId?: string;
  openedAt: string;
  closedAt?: string;
  startCash: number;
  endCashExpected?: number;
  endCashActual?: number;
  difference?: number;
  status: 'open' | 'closed';
  comment?: string;
}

export type PaymentMethod =
  | 'cash'
  | 'bog_card'
  | 'tbc_card'
  | 'tbc_transfer'
  | 'bog_transfer'
  | 'bank_transfer'
  | 'debt';

export interface SalePayment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
  date: string;
}

export interface DeliveryDetails {
  address: string;
  city?: string;
  recipientName: string;
  recipientPhone: string;
  recipientPhone2?: string;
  comment?: string;
  deliveryDate?: string;
  preferredTime?: string;
  fee: number;
  driverName?: string;
  carNumber?: string;
  status: 'pending' | 'in_transit' | 'delivered';
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  quantity: number;
  sellingPrice: number; // Actual price used in sale
  defaultSellingPrice: number; // Registered base price
  costPriceSnapshot: number; // Average cost price at time of sale
  lineTotal: number;
  costTotal: number;
  profitAmount: number;
}

export interface Sale {
  id: string;
  invoiceNo: string; // e.g. INV-2026-000001
  customerId: string;
  customerName: string;
  customerPhone: string;
  userId: string;
  userName: string;
  date: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  deliveryType: 'pickup' | 'delivery';
  deliveryDetails?: DeliveryDetails;
  status: 'active' | 'cancelled' | 'returned';
  items: SaleItem[];
  payments: SalePayment[];
  holdNote?: string;
  isHeld?: boolean;
  isAnonymous?: boolean;
  sourceOrderId?: string;
  receivedByName?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Quote {
  id: string;
  quoteNo: string; // QT-2026-000001
  customerId: string;
  customerName: string;
  date: string;
  items: QuoteItem[];
  grandTotal: number;
  note?: string;
  status: 'active' | 'converted' | 'expired';
}

export interface OrderPayment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  userId: string;
  userName: string;
  comment?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  quantity: number;
  price: number;
  total: number;
}

export type OrderStatus =
  | 'new'
  | 'preparing'
  | 'ready'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'cancelled';

export type OrderPaymentStatus = 'unpaid' | 'partially_paid' | 'fully_paid';

export interface Order {
  id: string;
  orderNo: string; // ORD-2026-000001
  customerId: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  items: OrderItem[];
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: OrderPaymentStatus;
  itemsTotal?: number;
  deliveryType?: 'pickup' | 'delivery';
  deliveryFee?: number;
  deliveryAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  comment?: string;
  status: OrderStatus;
  payments: OrderPayment[];
  isFulfilled?: boolean;
  fulfilledAt?: string;
  createdAt: string;
  userId?: string;
  userName?: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface Purchase {
  id: string;
  documentNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  status: 'completed' | 'cancelled';
  userId: string;
  userName: string;
  items: PurchaseItem[];
  createdAt: string;
}

export interface ReturnItem {
  id: string;
  returnId: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  quantityReturned: number;
  unitPrice: number;
  totalRefunded: number;
}

export interface ReturnDoc {
  id: string;
  returnNo: string; // RET-2026-000001
  saleId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  date: string;
  totalAmount: number;
  reason: string;
  userId: string;
  userName: string;
  items: ReturnItem[];
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  changeQuantity: number;
  previousStock: number;
  newStock: number;
  type: 'purchase' | 'sale' | 'return' | 'damage' | 'transfer' | 'adjustment';
  referenceNo?: string;
  note?: string;
  date: string;
  userId: string;
  userName: string;
}

export interface StockTransfer {
  id: string;
  fromWarehouse: string;
  toWarehouse: string;
  productId: string;
  productName: string;
  quantity: number;
  date: string;
  status: 'pending' | 'completed';
  userId: string;
  userName: string;
}

export interface StocktakeItem {
  productId: string;
  productName: string;
  productCode: string;
  expectedQty: number;
  actualQty: number;
  diff: number;
  costPrice: number;
}

export interface Stocktake {
  id: string;
  date: string;
  status: 'draft' | 'completed';
  items: StocktakeItem[];
  userId: string;
  userName: string;
  confirmedBy?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  reason: string;
  recipient: string;
  userId: string;
  userName: string;
  date: string;
  receiptImage?: string;
  comment?: string;
}

export interface CashTransaction {
  id: string;
  shiftId?: string;
  type:
    | 'sale'
    | 'customer_payment'
    | 'return'
    | 'purchase'
    | 'supplier_payment'
    | 'expense'
    | 'cash_in'
    | 'cash_out';
  amount: number;
  method: PaymentMethod;
  description: string;
  referenceNo?: string;
  date: string;
  userId: string;
  userName: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ip?: string;
}

export interface Settings {
  companyName: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  bankName?: string;
  bankAccount?: string; // ანგარიშის ნომერი (IBAN) — გადადის ინვოისზეც
  logo?: string;
  invoiceHeader?: string;
  invoiceFooter?: string;
  allowNegativeStock: boolean;
  defaultCurrency: string;
}
