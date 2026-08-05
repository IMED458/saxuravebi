import React, { useState, useEffect } from 'react';
import { BarChart3, Download, DollarSign, TrendingUp, BookOpen, Layers } from 'lucide-react';
import { Sale, Expense, Product } from '../types';
import { api } from '../lib/api';
import { formatMoney } from '../lib/formatters';
import { exportToExcel } from '../lib/exportUtils';

interface Props {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
}

export const ReportsAccountingView: React.FC<Props> = ({ sales, expenses, products }) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'transactions'>('financial');
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    api.getTransactions().then((t) => setTransactions(t)).catch(() => {});
  }, []);

  const completedSales = sales.filter((s) => !s.isHeld);

  // Profit Calculation
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.grandTotal, 0);

  // COGS Calculation (Cost Of Goods Sold)
  const totalCogs = completedSales.reduce((sum, s) => {
    const saleCogs = s.items.reduce((iSum, item) => iSum + item.costPriceSnapshot * item.quantity, 0);
    return sum + saleCogs;
  }, 0);

  const grossProfit = totalRevenue - totalCogs;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  const handleExport = () => {
    const data = transactions.map((t) => ({
      თარიღი: t.date,
      ტიპი: t.type,
      კატეგორია: t.category,
      თანხა: t.amount,
      მეთოდი: t.method,
      აღწერა: t.description
    }));
    exportToExcel(data, 'ბუღალტრული_ტრანზაქციები');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">რეპორტები & ბუღალტერია</h1>
          <p className="text-xs text-slate-500 mt-0.5">მოგება-ზარალის უწყისი (P&L) და ფინანსური ანალიზი</p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>ტრანზაქციების ექსპორტი (Excel)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-2xl shadow-sm text-xs font-bold">
        <button
          onClick={() => setActiveTab('financial')}
          className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${
            activeTab === 'financial' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          📊 მოგება-ზარალის უწყისი (P&L)
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${
            activeTab === 'transactions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          📖 ტრანზაქციების ჟურნალი ({transactions.length})
        </button>
      </div>

      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* P&L Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase">სულ შემოსავალი (Revenue)</div>
              <div className="text-2xl font-black text-slate-900 mt-2">{formatMoney(totalRevenue)}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase">თვითღირებულება (COGS)</div>
              <div className="text-2xl font-black text-slate-700 mt-2">{formatMoney(totalCogs)}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase">საოპერაციო ხარჯები</div>
              <div className="text-2xl font-black text-red-600 mt-2">-{formatMoney(totalExpenses)}</div>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
              <div className="text-xs font-bold text-emerald-400 uppercase">სუფთა მოგება (Net Profit)</div>
              <div className="text-2xl font-black text-emerald-400 mt-2">+{formatMoney(netProfit)}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-3">თარიღი</th>
                <th className="p-3">ტიპი</th>
                <th className="p-3">კატეგორია</th>
                <th className="p-3 text-right">თანხა</th>
                <th className="p-3">აღწერა</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-500">{t.date}</td>
                  <td className="p-3 font-bold">{t.type}</td>
                  <td className="p-3 text-slate-700">{t.category}</td>
                  <td
                    className={`p-3 text-right font-extrabold ${
                      t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {formatMoney(t.amount)}
                  </td>
                  <td className="p-3 text-slate-500">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
