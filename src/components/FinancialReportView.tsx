import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  Wallet,
  ShoppingCart,
  Package,
  DollarSign,
  Receipt,
  Users,
  Building2,
  Boxes,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { Sale, Product, Customer, Supplier, Expense, Purchase, CashTransaction, ReturnDoc, PaymentMethod } from '../types';
import { api } from '../lib/api';
import { formatMoney, formatNum } from '../lib/formatters';
import { exportSheets } from '../lib/exportUtils';

interface Props {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
}

type PeriodKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom';

const PERIOD_LABELS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'დღეს' },
  { key: 'yesterday', label: 'გუშინ' },
  { key: 'this_week', label: 'ეს კვირა' },
  { key: 'last_week', label: 'წინა კვირა' },
  { key: 'this_month', label: 'ეს თვე' },
  { key: 'last_month', label: 'წინა თვე' },
  { key: 'this_year', label: 'ეს წელი' },
  { key: 'last_year', label: 'წინა წელი' },
  { key: 'custom', label: 'პერიოდი' }
];

const METHOD_LABELS: Record<string, string> = {
  cash: 'ნაღდი',
  tbc_card: 'TBC',
  bog_card: 'BOG',
  tbc_transfer: 'TBC გადარიცხვა',
  bog_transfer: 'BOG გადარიცხვა',
  bank_transfer: 'სხვა გადარიცხვა',
  debt: 'დავალიანება',
  bog: 'BOG',
  tbc: 'TBC',
  transfer: 'გადარიცხვა'
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function computeRange(period: PeriodKey, customFrom: string, customTo: string): { start: Date; end: Date } {
  const now = new Date();
  const today = startOfDay(now);
  switch (period) {
    case 'today':
      return { start: today, end: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: y, end: endOfDay(y) };
    }
    case 'this_week': {
      const day = (today.getDay() + 6) % 7; // Monday-based
      const s = new Date(today);
      s.setDate(s.getDate() - day);
      return { start: s, end: endOfDay(now) };
    }
    case 'last_week': {
      const day = (today.getDay() + 6) % 7;
      const s = new Date(today);
      s.setDate(s.getDate() - day - 7);
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      return { start: s, end: endOfDay(e) };
    }
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case 'last_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
      };
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
    case 'last_year':
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: endOfDay(new Date(now.getFullYear() - 1, 11, 31))
      };
    case 'custom':
      return {
        start: customFrom ? startOfDay(new Date(customFrom)) : new Date(0),
        end: customTo ? endOfDay(new Date(customTo)) : endOfDay(now)
      };
  }
}

export const FinancialReportView: React.FC<Props> = ({ sales, products, customers, suppliers, expenses }) => {
  const [period, setPeriod] = useState<PeriodKey>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [returns, setReturns] = useState<ReturnDoc[]>([]);

  useEffect(() => {
    api.getPurchases().then(setPurchases).catch(() => {});
    api.getTransactions().then(setTransactions).catch(() => {});
    api.getReturns().then(setReturns).catch(() => {});
  }, []);

  const range = useMemo(() => computeRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= range.start.getTime() && t <= range.end.getTime();
  };

  const report = useMemo(() => {
    // --- Sales (accrued / value of goods sold) ---
    const periodSales = sales.filter((s) => !s.isHeld && s.status !== 'cancelled' && inRange(s.date));
    let salesValue = 0; // grand total billed
    let itemsRevenue = 0;
    let cogs = 0;
    let discounts = 0;
    let deliveryFees = 0;
    let soldUnits = 0;
    periodSales.forEach((s) => {
      salesValue += s.grandTotal;
      discounts += s.discount || 0;
      deliveryFees += s.deliveryFee || 0;
      s.items.forEach((it) => {
        itemsRevenue += it.lineTotal;
        cogs += it.costTotal;
        soldUnits += it.quantity;
      });
    });
    const goodsProfit = itemsRevenue - cogs;

    // --- Money actually received (cash flow in) ---
    const periodTx = transactions.filter((t) => inRange(t.date));
    const byMethod: Record<string, number> = {};
    let receivedTotal = 0;
    let returnsRefunded = 0;
    let expensesOut = 0;
    let supplierPaid = 0;
    periodTx.forEach((t) => {
      if (t.type === 'sale' || t.type === 'customer_payment' || t.type === 'cash_in') {
        byMethod[t.method] = (byMethod[t.method] || 0) + t.amount;
        receivedTotal += t.amount;
      } else if (t.type === 'return') {
        returnsRefunded += t.amount;
      } else if (t.type === 'expense' || t.type === 'cash_out') {
        expensesOut += t.amount;
      } else if (t.type === 'purchase' || t.type === 'supplier_payment') {
        supplierPaid += t.amount;
      }
    });

    // --- Purchases ---
    const periodPurchases = purchases.filter((p) => inRange(p.date) && p.status !== 'cancelled');
    let purchaseTotal = 0;
    let purchaseUnits = 0;
    let purchasePaid = 0;
    periodPurchases.forEach((p) => {
      purchaseTotal += p.totalAmount;
      purchasePaid += p.paidAmount;
      p.items.forEach((it) => (purchaseUnits += it.quantity));
    });

    // --- Returns ---
    const periodReturns = returns.filter((r) => inRange(r.date));
    let returnsTotal = 0;
    periodReturns.forEach((r) => (returnsTotal += r.totalAmount));

    // --- Expenses by category ---
    const periodExpenses = expenses.filter((e) => inRange(e.date));
    const expByCat: Record<string, number> = {};
    let expensesTotal = 0;
    periodExpenses.forEach((e) => {
      expByCat[e.category] = (expByCat[e.category] || 0) + e.amount;
      expensesTotal += e.amount;
    });

    const netProfit = goodsProfit - expensesTotal - returnsTotal;

    // --- Snapshots (not period-bound) ---
    const stockValue = products.reduce((sum, p) => sum + p.currentStock * p.averageCostPrice, 0);
    const customerDebt = customers.reduce((sum, c) => sum + Math.max(0, c.totalDebt), 0);
    const supplierDebt = suppliers.reduce((sum, s) => sum + Math.max(0, s.balance), 0);

    // --- Per-product breakdown ---
    const prodMap: Record<string, any> = {};
    const ensure = (id: string, name: string, code: string) => {
      if (!prodMap[id])
        prodMap[id] = {
          id, name, code,
          purchasedQty: 0, purchaseAmount: 0,
          soldQty: 0, salesAmount: 0, cogs: 0, profit: 0,
          returnedQty: 0
        };
      return prodMap[id];
    };
    periodPurchases.forEach((p) =>
      p.items.forEach((it) => {
        const r = ensure(it.productId, it.productName, it.productCode);
        r.purchasedQty += it.quantity;
        r.purchaseAmount += it.total;
      })
    );
    periodSales.forEach((s) =>
      s.items.forEach((it) => {
        const r = ensure(it.productId, it.productName, it.productCode);
        r.soldQty += it.quantity;
        r.salesAmount += it.lineTotal;
        r.cogs += it.costTotal;
        r.profit += it.profitAmount;
      })
    );
    periodReturns.forEach((r) =>
      r.items.forEach((it) => {
        const row = ensure(it.productId, it.productName, it.productCode);
        row.returnedQty += it.quantityReturned;
      })
    );
    const productRows = Object.values(prodMap).map((r: any) => {
      const prod = products.find((p) => p.id === r.id);
      return {
        ...r,
        avgPurchase: r.purchasedQty > 0 ? r.purchaseAmount / r.purchasedQty : 0,
        avgSell: r.soldQty > 0 ? r.salesAmount / r.soldQty : 0,
        remainingStock: prod ? prod.currentStock : 0,
        category: prod ? prod.categoryId : ''
      };
    }).sort((a, b) => b.salesAmount - a.salesAmount);

    return {
      periodSales, salesValue, itemsRevenue, cogs, goodsProfit, discounts, deliveryFees, soldUnits,
      receivedTotal, byMethod, returnsRefunded, expensesOut, supplierPaid,
      purchaseTotal, purchaseUnits, purchasePaid, purchaseCount: periodPurchases.length,
      returnsTotal, expensesTotal, expByCat, netProfit,
      stockValue, customerDebt, supplierDebt,
      productRows,
      creditSales: salesValue - (byMethod['debt'] ? 0 : 0) // placeholder; credit = unpaid part below
    };
  }, [sales, purchases, transactions, returns, expenses, products, customers, suppliers, range]);

  // Money still owed from period sales (accrued - received on those sales)
  const unpaidFromSales = useMemo(() => {
    return report.periodSales.reduce((sum, s) => sum + Math.max(0, s.balanceDue), 0);
  }, [report.periodSales]);

  const handleExport = () => {
    const money = (n: number) => Math.round(n * 100) / 100;
    exportSheets(
      [
        {
          name: 'Summary',
          rows: [
            { მაჩვენებელი: 'გაყიდვების ღირებულება', თანხა: money(report.salesValue) },
            { მაჩვენებელი: 'მიღებული თანხა', თანხა: money(report.receivedTotal) },
            { მაჩვენებელი: 'დარჩენილი მისაღები (გაყიდვებიდან)', თანხა: money(unpaidFromSales) },
            { მაჩვენებელი: 'შესყიდვები', თანხა: money(report.purchaseTotal) },
            { მაჩვენებელი: 'გაყიდული საქონლის თვითღირებულება', თანხა: money(report.cogs) },
            { მაჩვენებელი: 'საქონლიდან მოგება', თანხა: money(report.goodsProfit) },
            { მაჩვენებელი: 'ხარჯები', თანხა: money(report.expensesTotal) },
            { მაჩვენებელი: 'დაბრუნებები', თანხა: money(report.returnsTotal) },
            { მაჩვენებელი: 'სუფთა მოგება', თანხა: money(report.netProfit) },
            { მაჩვენებელი: 'კლიენტების დავალიანება (სულ)', თანხა: money(report.customerDebt) },
            { მაჩვენებელი: 'მომწოდებლების დავალიანება (სულ)', თანხა: money(report.supplierDebt) },
            { მაჩვენებელი: 'მარაგის თვითღირებულება', თანხა: money(report.stockValue) }
          ]
        },
        {
          name: 'Products',
          rows: report.productRows.map((r: any) => ({
            კოდი: r.code, პროდუქტი: r.name,
            შესყიდული: r.purchasedQty, 'საშ.ასაღები': money(r.avgPurchase), 'შესყიდვის ჯამი': money(r.purchaseAmount),
            გაყიდული: r.soldQty, 'საშ.გასაყიდი': money(r.avgSell), 'გაყიდვების თანხა': money(r.salesAmount),
            თვითღირებულება: money(r.cogs), მოგება: money(r.profit),
            დაბრუნებული: r.returnedQty, 'დარჩ.მარაგი': r.remainingStock
          }))
        },
        {
          name: 'Payments',
          rows: Object.entries(report.byMethod).map(([m, amt]) => ({ მეთოდი: METHOD_LABELS[m] || m, თანხა: money(amt as number) }))
        },
        {
          name: 'Expenses',
          rows: Object.entries(report.expByCat).map(([c, amt]) => ({ კატეგორია: c, თანხა: money(amt as number) }))
        },
        {
          name: 'CustomerDebts',
          rows: customers.filter((c) => c.totalDebt > 0).map((c) => ({
            კლიენტი: c.companyName || `${c.name} ${c.lastName || ''}`.trim(), ტელეფონი: c.phone, დავალიანება: money(c.totalDebt), 'ბოლო შენაძენი': c.lastPurchaseDate || ''
          }))
        },
        {
          name: 'SupplierDebts',
          rows: suppliers.filter((s) => s.balance > 0).map((s) => ({ მომწოდებელი: s.name, ტელეფონი: s.phone, დავალიანება: money(s.balance) }))
        }
      ],
      'ფინანსური_ანგარიში'
    );
  };

  const cards = [
    { label: 'გაყიდვების ღირებულება', value: report.salesValue, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'მიღებული თანხა', value: report.receivedTotal, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'შესყიდვები', value: report.purchaseTotal, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'საქონლის თვითღირებულება', value: report.cogs, icon: Boxes, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'საქონლიდან მოგება', value: report.goodsProfit, icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'ხარჯები', value: report.expensesTotal, icon: Receipt, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'სუფთა მოგება', value: report.netProfit, icon: DollarSign, color: report.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600', bg: report.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
    { label: 'კლიენტის დავალიანება', value: report.customerDebt, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'მომწოდებლის დავალიანება', value: report.supplierDebt, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'მარაგის თვითღირებულება', value: report.stockValue, icon: Boxes, color: 'text-indigo-600', bg: 'bg-indigo-50' }
  ];

  return (
    <div className="space-y-5">
      {/* Header + period selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">ფინანსური ანგარიშგება</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {range.start.toLocaleDateString('ka-GE')} — {range.end.toLocaleDateString('ka-GE')}
            </p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer self-start"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel ექსპორტი
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {PERIOD_LABELS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                period === p.key ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="border border-slate-300 rounded-lg p-2 text-xs outline-none" />
            <span className="text-slate-400 text-xs">→</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="border border-slate-300 rounded-lg p-2 text-xs outline-none" />
          </div>
        )}
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${c.bg} ${c.color} flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-[11px] text-slate-500 font-semibold leading-tight">{c.label}</div>
              <div className={`text-lg font-black mt-0.5 ${c.color}`}>{formatMoney(c.value)}</div>
            </div>
          );
        })}
      </div>

      {/* Net profit breakdown + payment methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">მოგების ანალიზი</h3>
          <div className="space-y-2 text-xs">
            <Row label="გაყიდვების შემოსავალი (საქონელი)" value={report.itemsRevenue} />
            <Row label="− გაყიდული საქონლის თვითღირებულება" value={-report.cogs} />
            <Row label="= საქონლიდან მოგება" value={report.goodsProfit} bold />
            <Row label="− ხარჯები" value={-report.expensesTotal} />
            <Row label="− დაბრუნებების გავლენა" value={-report.returnsTotal} />
            <div className="border-t border-slate-200 pt-2">
              <Row label="= სუფთა საოპერაციო მოგება" value={report.netProfit} bold big />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
            <Row label="გაყიდვების ღირებულება (დარიცხული)" value={report.salesValue} />
            <Row label="რეალურად მიღებული თანხა" value={report.receivedTotal} pos />
            <Row label="დარჩენილი მისაღები ამ პერიოდის გაყიდვებზე" value={unpaidFromSales} warn />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">მიღებული თანხა მეთოდების მიხედვით</h3>
          {Object.keys(report.byMethod).length === 0 ? (
            <p className="text-xs text-slate-400">ამ პერიოდში მიღებული თანხა არ არის.</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(report.byMethod).map(([m, amt]) => (
                <div key={m} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-700">{METHOD_LABELS[m] || m}</span>
                  <span className="font-bold text-emerald-700">{formatMoney(amt as number)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-3 py-2 text-xs border-t border-slate-200 mt-1">
                <span className="font-bold text-slate-900">სულ მიღებული</span>
                <span className="font-black text-emerald-700">{formatMoney(report.receivedTotal)}</span>
              </div>
            </div>
          )}

          <h3 className="text-sm font-bold text-slate-900 mt-4 mb-2">ხარჯები კატეგორიების მიხედვით</h3>
          {Object.keys(report.expByCat).length === 0 ? (
            <p className="text-xs text-slate-400">ხარჯები არ არის.</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(report.expByCat).map(([c, amt]) => (
                <div key={c} className="flex justify-between items-center bg-red-50 rounded-lg px-3 py-1.5 text-xs">
                  <span className="font-semibold text-slate-700">{c}</span>
                  <span className="font-bold text-red-600">{formatMoney(amt as number)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Per-product detail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">პროდუქტების დეტალიზაცია (რა ვიყიდე / რა გავყიდე)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-2.5">კოდი</th>
                <th className="p-2.5">პროდუქტი</th>
                <th className="p-2.5 text-center">შესყ.</th>
                <th className="p-2.5 text-right">საშ.ასაღები</th>
                <th className="p-2.5 text-center">გაყ.</th>
                <th className="p-2.5 text-right">საშ.გასაყიდი</th>
                <th className="p-2.5 text-right">გაყ.თანხა</th>
                <th className="p-2.5 text-right">თვითღირ.</th>
                <th className="p-2.5 text-right">მოგება</th>
                <th className="p-2.5 text-center">დაბრ.</th>
                <th className="p-2.5 text-center">ნაშთი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {report.productRows.length === 0 ? (
                <tr><td colSpan={11} className="p-6 text-center text-slate-400">ამ პერიოდში მოძრაობა არ ყოფილა</td></tr>
              ) : (
                report.productRows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-blue-700">{r.code}</td>
                    <td className="p-2.5 font-bold text-slate-900">{r.name}</td>
                    <td className="p-2.5 text-center">{formatNum(r.purchasedQty)}</td>
                    <td className="p-2.5 text-right text-slate-600">{r.avgPurchase ? formatMoney(r.avgPurchase) : '—'}</td>
                    <td className="p-2.5 text-center">{formatNum(r.soldQty)}</td>
                    <td className="p-2.5 text-right text-slate-600">{r.avgSell ? formatMoney(r.avgSell) : '—'}</td>
                    <td className="p-2.5 text-right font-bold text-blue-700">{formatMoney(r.salesAmount)}</td>
                    <td className="p-2.5 text-right text-slate-600">{formatMoney(r.cogs)}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-700">{formatMoney(r.profit)}</td>
                    <td className="p-2.5 text-center text-red-600">{r.returnedQty || '—'}</td>
                    <td className="p-2.5 text-center font-semibold">{formatNum(r.remainingStock)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Debts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">კლიენტების დავალიანებები</h3>
            <span className="text-xs font-bold text-amber-600">{formatMoney(report.customerDebt)}</span>
          </div>
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-slate-200">
              {customers.filter((c) => c.totalDebt > 0).length === 0 ? (
                <tr><td className="p-4 text-slate-400">დავალიანება არ არის</td></tr>
              ) : (
                customers.filter((c) => c.totalDebt > 0).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{c.companyName || `${c.name} ${c.lastName || ''}`.trim()}</td>
                    <td className="p-2.5 text-slate-500">{c.phone}</td>
                    <td className="p-2.5 text-right font-bold text-amber-600">{formatMoney(c.totalDebt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">მომწოდებლების დავალიანებები</h3>
            <span className="text-xs font-bold text-orange-600">{formatMoney(report.supplierDebt)}</span>
          </div>
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-slate-200">
              {suppliers.filter((s) => s.balance > 0).length === 0 ? (
                <tr><td className="p-4 text-slate-400">დავალიანება არ არის</td></tr>
              ) : (
                suppliers.filter((s) => s.balance > 0).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                    <td className="p-2.5 text-slate-500">{s.phone}</td>
                    <td className="p-2.5 text-right font-bold text-orange-600">{formatMoney(s.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: number; bold?: boolean; big?: boolean; pos?: boolean; warn?: boolean }> = ({ label, value, bold, big, pos, warn }) => (
  <div className="flex justify-between items-center">
    <span className={`${bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{label}</span>
    <span className={`${big ? 'text-base' : ''} ${bold ? 'font-black' : 'font-semibold'} ${warn ? 'text-amber-600' : pos ? 'text-emerald-700' : value < 0 ? 'text-red-600' : 'text-slate-900'}`}>
      {formatMoney(value)}
    </span>
  </div>
);
