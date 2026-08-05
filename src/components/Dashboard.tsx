import React from 'react';
import {
  ShoppingCart,
  TrendingUp,
  Boxes,
  Users,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  FileText,
  DollarSign
} from 'lucide-react';
import { Product, Sale, Customer, Supplier } from '../types';
import { formatMoney, formatDate } from '../lib/formatters';

interface Props {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  suppliers: Supplier[];
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<Props> = ({ products, sales, customers, suppliers, onNavigate }) => {
  const completedSales = sales.filter((s) => !s.isHeld);

  // Today Sales
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = completedSales.filter((s) => s.date.startsWith(todayStr));
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);

  // Month Sales
  const monthStr = todayStr.slice(0, 7);
  const monthSales = completedSales.filter((s) => s.date.startsWith(monthStr));
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.grandTotal, 0);

  // Total Stock Cost Value
  const totalStockCost = products.reduce((sum, p) => sum + p.currentStock * p.averageCostPrice, 0);
  const totalStockSalesValue = products.reduce((sum, p) => sum + p.currentStock * p.sellingPrice, 0);

  // Customer Debts Total
  const totalCustomerDebt = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);

  // Supplier Debts Total
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);

  // Low Stock Count
  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStock);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">სისტემის მიმოხილვა</h1>
          <p className="text-xs text-slate-400 mt-1">
            სამშენებლო და სამეურნეო მასალების მაღაზიის მართვა
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ ახალი გაყიდვა / POS</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>დღევანდელი გაყიდვები</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{formatMoney(todayRevenue)}</div>
          <div className="text-[11px] text-slate-400 font-semibold">{todaySales.length} ტრანზაქცია დღეს</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>თვიური შემოსავალი</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700">{formatMoney(monthRevenue)}</div>
          <div className="text-[11px] text-slate-400 font-semibold">{monthSales.length} გაყიდვა ამ თვეში</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>მარაგის თვითღირებულება</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{formatMoney(totalStockCost)}</div>
          <div className="text-[11px] text-slate-400 font-semibold">
            გასაყიდი ღირებულება: {formatMoney(totalStockSalesValue)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>კლიენტების ნისიები</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-red-600">{formatMoney(totalCustomerDebt)}</div>
          <div className="text-[11px] text-slate-400 font-semibold">
            მომწოდებლის ვალი: {formatMoney(totalSupplierDebt)}
          </div>
        </div>
      </div>

      {/* Grid: Recent Sales & Low Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Sales (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">ბოლო გაყიდვები</h3>
            <button
              onClick={() => onNavigate('sales_history')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              ყველას ნახვა →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-3">ინვოისი</th>
                  <th className="p-3">თარიღი</th>
                  <th className="p-3">კლიენტი</th>
                  <th className="p-3 text-right">თანხა</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {completedSales.slice(0, 6).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{s.invoiceNo}</td>
                    <td className="p-3 text-slate-500">{formatDate(s.date)}</td>
                    <td className="p-3 font-bold text-slate-900">{s.customerName}</td>
                    <td className="p-3 text-right font-extrabold text-blue-700">{formatMoney(s.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warning Box (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>დაბალი მარაგი ({lowStockProducts.length})</span>
            </h3>
            <button
              onClick={() => onNavigate('low_stock')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              ნახვა →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {lowStockProducts.slice(0, 5).map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{p.code}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[11px]">
                    {p.currentStock} {p.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
