import React, { useState, useEffect } from 'react';
import { User, Product, Category, Unit, Customer, Supplier, Sale, Shift, Expense, Settings, Order } from './types';
import { api } from './lib/api';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { POSView } from './components/POSView';
import { ProductsView } from './components/ProductsView';
import { StockView } from './components/StockView';
import { SuppliersView } from './components/SuppliersView';
import { CustomersView } from './components/CustomersView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { ShiftsExpensesView } from './components/ShiftsExpensesView';
import { ReportsAccountingView } from './components/ReportsAccountingView';
import { AdminView } from './components/AdminView';
import { OrdersView } from './components/OrdersView';
import { FinancialReportView } from './components/FinancialReportView';
import { PrintInvoiceModal } from './components/PrintInvoiceModal';
import { PrintOrderModal } from './components/PrintOrderModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<string>('pos');

  // Master Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Settings>({
    companyName: 'სამშენებლო & სამეურნეო მარკეტი',
    taxId: '204998877',
    address: 'თბილისი, ქსნის ქ. N12',
    phone: '+995 599 12 34 56',
    email: 'info@hardware-store.ge',
    bankName: '',
    bankAccount: '',
    allowNegativeStock: false,
    defaultCurrency: '₾',
    invoiceHeader: 'გმადლობთ თანამშრომლობისთვის!',
    invoiceFooter: 'საქონელი მიღებულია სრულად და უდეფექტო მდგომარეობაში.'
  });

  // Modal print target
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load all master data
  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [
        prodsRes,
        catsRes,
        unitsRes,
        custsRes,
        supsRes,
        salesRes,
        ordersRes,
        shiftsRes,
        curShiftRes,
        expensesRes,
        usersRes,
        settingsRes
      ] = await Promise.all([
        api.getProducts().catch(() => []),
        api.getCategories().catch(() => []),
        api.getUnits().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getSales().catch(() => []),
        api.getOrders().catch(() => []),
        api.getShifts().catch(() => []),
        api.getCurrentShift().catch(() => null),
        api.getExpenses().catch(() => []),
        api.getUsers().catch(() => []),
        api.getSettings().catch(() => settings)
      ]);

      setProducts(prodsRes);
      setCategories(catsRes);
      setUnits(unitsRes);
      setCustomers(custsRes);
      setSuppliers(supsRes);
      setSales(salesRes);
      setOrders(ordersRes);
      setShifts(shiftsRes);
      setCurrentShift(curShiftRes);
      setExpenses(expensesRes);
      setUsers(usersRes);
      if (settingsRes) setSettings(settingsRes);
    } catch (e) {
      console.error('Failed to load system data', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        user={currentUser}
        currentShift={currentShift}
        onLogout={() => setCurrentUser(null)}
        onOpenShiftModal={() => setActivePage('shift_current')}
        onSelectProduct={(p) => setActivePage('products_list')}
        onSelectCustomer={(c) => setActivePage('customers_list')}
        onSelectSale={(s) => setPrintSale(s)}
        onNavigate={(p) => setActivePage(p)}
      />

      <div className="flex flex-1 w-full">
        {/* Left Sidebar */}
        <Sidebar activePage={activePage} onNavigate={(p) => setActivePage(p)} user={currentUser} />

        {/* Main Workspace Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activePage === 'dashboard' && (
            <Dashboard
              products={products}
              sales={sales}
              customers={customers}
              suppliers={suppliers}
              onNavigate={(p) => setActivePage(p)}
            />
          )}

          {activePage === 'pos' && (
            <POSView
              user={currentUser}
              products={products}
              customers={customers}
              categories={categories}
              units={units}
              onSaleCompleted={(s) => setPrintSale(s)}
              onOrderCompleted={(o) => setPrintOrder(o)}
              onRefreshData={loadData}
            />
          )}

          {(activePage === 'products_list' ||
            activePage === 'product_add' ||
            activePage === 'categories' ||
            activePage === 'price_management') && (
            <ProductsView
              products={products}
              categories={categories}
              units={units}
              suppliers={suppliers}
              onRefreshData={loadData}
              activePage={activePage}
              user={currentUser}
            />
          )}

          {(activePage === 'stock_list' ||
            activePage === 'stock_intake' ||
            activePage === 'stock_movements' ||
            activePage === 'stocktakes' ||
            activePage === 'stock_transfers' ||
            activePage === 'low_stock') && (
            <StockView products={products} onRefreshData={loadData} activePage={activePage} user={currentUser} />
          )}

          {(activePage === 'suppliers_list' || activePage === 'supplier_debts') && (
            <SuppliersView suppliers={suppliers} onRefreshData={loadData} />
          )}

          {(activePage === 'customers_list' || activePage === 'customer_debts') && (
            <CustomersView customers={customers} onRefreshData={loadData} />
          )}

          {(activePage === 'sales_history' ||
            activePage === 'invoices' ||
            activePage === 'held_sales' ||
            activePage === 'returns' ||
            activePage === 'quotes') && (
            <SalesHistoryView sales={sales} settings={settings} onRefreshData={loadData} activePage={activePage} user={currentUser} />
          )}

          {activePage === 'orders' && (
            <OrdersView
              user={currentUser}
              orders={orders}
              products={products}
              settings={settings}
              onRefreshData={loadData}
            />
          )}

          {(activePage === 'shift_current' ||
            activePage === 'cash_out' ||
            activePage === 'cash_in' ||
            activePage === 'shifts_history') && (
            <ShiftsExpensesView
              user={currentUser}
              currentShift={currentShift}
              shifts={shifts}
              expenses={expenses}
              onRefreshData={loadData}
              activePage={activePage}
            />
          )}

          {(activePage === 'report_profit' || activePage === 'accounting') && (
            <FinancialReportView
              sales={sales}
              products={products}
              customers={customers}
              suppliers={suppliers}
              expenses={expenses}
            />
          )}

          {(activePage === 'report_sales' ||
            activePage === 'report_stock' ||
            activePage === 'transactions' ||
            activePage === 'expenses_list') && (
            <ReportsAccountingView sales={sales} expenses={expenses} products={products} />
          )}

          {(activePage === 'users_admin' || activePage === 'audit_logs' || activePage === 'settings') && (
            <AdminView user={currentUser} users={users} settings={settings} onRefreshData={loadData} activePage={activePage} />
          )}

          {(activePage === 'purchase_new' || activePage === 'purchases_history') && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
              <h2 className="text-lg font-bold text-slate-900 mb-2">შესყიდვების მოდული</h2>
              <p className="text-sm text-slate-500">
                მარაგის შემოსვლა და ასაღები ფასი ამ ეტაპზე ხდება „მარაგი → ახალი შემოსვლა" გვერდიდან.
                სრული შესყიდვების დოკუმენტი (მომწოდებელი + რამდენიმე პოზიცია) მალე დაემატება.
              </p>
              <button
                onClick={() => setActivePage('stock_intake')}
                className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold"
              >
                მარაგის დამატებაზე გადასვლა
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Print / View Invoice Modal */}
      {printSale && (
        <PrintInvoiceModal sale={printSale} settings={settings} onClose={() => setPrintSale(null)} />
      )}

      {printOrder && (
        <PrintOrderModal order={printOrder} settings={settings} onClose={() => setPrintOrder(null)} />
      )}
    </div>
  );
};

export default App;
