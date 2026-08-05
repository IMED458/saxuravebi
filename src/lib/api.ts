import {
  User,
  Product,
  Category,
  Unit,
  Supplier,
  Customer,
  Shift,
  Sale,
  Purchase,
  ReturnDoc,
  Expense,
  CashTransaction,
  AuditLog,
  Settings,
  Quote,
  Order,
  StockMovement
} from '../types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'შეცდომა სერვერთან კავშირისას');
  }
  return data as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    fetchJson<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  // Users
  getUsers: () => fetchJson<User[]>('/api/users'),
  createUser: (userData: any) =>
    fetchJson<User>('/api/users', { method: 'POST', body: JSON.stringify(userData) }),
  updateUser: (id: string, userData: any) =>
    fetchJson<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),

  // Products
  getProducts: () => fetchJson<Product[]>('/api/products'),
  createProduct: (data: any) =>
    fetchJson<Product>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) =>
    fetchJson<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addStock: (id: string, data: any) =>
    fetchJson<{ product: Product; batch: any }>(`/api/products/${id}/add-stock`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  bulkPriceUpdate: (data: any) =>
    fetchJson<{ updatedCount: number }>('/api/products/bulk-price-update', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Suppliers
  getSuppliers: () => fetchJson<Supplier[]>('/api/suppliers'),
  createSupplier: (data: any) =>
    fetchJson<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) =>
    fetchJson<Supplier>(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  paySupplier: (id: string, data: any) =>
    fetchJson<Supplier>(`/api/suppliers/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),

  // Purchases
  getPurchases: () => fetchJson<Purchase[]>('/api/purchases'),
  createPurchase: (data: any) =>
    fetchJson<Purchase>('/api/purchases', { method: 'POST', body: JSON.stringify(data) }),

  // Customers
  getCustomers: () => fetchJson<Customer[]>('/api/customers'),
  createCustomer: (data: any) =>
    fetchJson<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) =>
    fetchJson<Customer>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  payCustomerDebt: (id: string, data: any) =>
    fetchJson<Customer>(`/api/customers/${id}/pay-debt`, { method: 'POST', body: JSON.stringify(data) }),

  // Sales
  getSales: () => fetchJson<Sale[]>('/api/sales'),
  createSale: (data: any) =>
    fetchJson<Sale>('/api/sales', { method: 'POST', body: JSON.stringify(data) }),
  deleteHeldSale: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/sales/held/${id}`, { method: 'DELETE' }),

  // Returns
  createReturn: (data: any) =>
    fetchJson<ReturnDoc>('/api/returns', { method: 'POST', body: JSON.stringify(data) }),

  // Quotes & Orders
  getQuotes: () => fetchJson<Quote[]>('/api/quotes'),
  createQuote: (data: any) =>
    fetchJson<Quote>('/api/quotes', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: () => fetchJson<Order[]>('/api/orders'),
  createOrder: (data: any) =>
    fetchJson<Order>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id: string, status: string) =>
    fetchJson<Order>(`/api/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  addOrderPayment: (id: string, data: any) =>
    fetchJson<Order>(`/api/orders/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  fulfillOrder: (id: string) =>
    fetchJson<Order>(`/api/orders/${id}/fulfill`, { method: 'POST' }),

  // Shifts
  getCurrentShift: () => fetchJson<Shift | null>('/api/shifts/current'),
  getShifts: () => fetchJson<Shift[]>('/api/shifts'),
  openShift: (data: any) =>
    fetchJson<Shift>('/api/shifts/open', { method: 'POST', body: JSON.stringify(data) }),
  closeShift: (data: any) =>
    fetchJson<Shift>('/api/shifts/close', { method: 'POST', body: JSON.stringify(data) }),

  // Expenses & Cash Transactions
  getExpenses: () => fetchJson<Expense[]>('/api/expenses'),
  createExpense: (data: any) =>
    fetchJson<Expense>('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
  cashIn: (data: any) =>
    fetchJson<{ success: boolean }>('/api/cash-in', { method: 'POST', body: JSON.stringify(data) }),
  getTransactions: () => fetchJson<CashTransaction[]>('/api/transactions'),

  // Stock
  getStockMovements: () => fetchJson<StockMovement[]>('/api/stock-movements'),
  createStocktake: (data: any) =>
    fetchJson<any>('/api/stocktakes', { method: 'POST', body: JSON.stringify(data) }),

  // Categories & Units
  getCategories: () => fetchJson<Category[]>('/api/categories'),
  createCategory: (data: any) =>
    fetchJson<Category>('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  getUnits: () => fetchJson<Unit[]>('/api/units'),
  createUnit: (data: any) =>
    fetchJson<Unit>('/api/units', { method: 'POST', body: JSON.stringify(data) }),

  // Audit Logs & Settings
  getAuditLogs: () => fetchJson<AuditLog[]>('/api/audit-logs'),
  getSettings: () => fetchJson<Settings>('/api/settings'),
  updateSettings: (data: any) =>
    fetchJson<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Search
  search: (q: string) =>
    fetchJson<{ products: Product[]; customers: Customer[]; sales: Sale[]; suppliers: Supplier[] }>(
      `/api/search?q=${encodeURIComponent(q)}`
    )
};
