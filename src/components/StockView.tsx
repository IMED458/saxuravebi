import React, { useState, useEffect } from 'react';
import { Boxes, ArrowRightLeft, AlertTriangle, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { Product, StockMovement } from '../types';
import { api } from '../lib/api';
import { formatMoney, formatDate } from '../lib/formatters';

interface Props {
  products: Product[];
  onRefreshData: () => void;
  activePage?: string;
}

export const StockView: React.FC<Props> = ({ products, onRefreshData, activePage }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'low' | 'movements'>('current');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activePage === 'low_stock') setActiveTab('low');
    else if (activePage === 'stock_movements') setActiveTab('movements');
    else if (activePage === 'stock_list' || activePage === 'stock_intake' || activePage === 'stocktakes' || activePage === 'stock_transfers') setActiveTab('current');
  }, [activePage]);

  useEffect(() => {
    loadMovements();
  }, []);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const data = await api.getStockMovements();
      setMovements(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStock);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">მარაგების მართვა & საწყობი</h1>
          <p className="text-xs text-slate-500 mt-0.5">ნაშთების კონტროლი, მოძრაობა და შეტყობინებები</p>
        </div>

        <button
          onClick={() => {
            onRefreshData();
            loadMovements();
          }}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
          title="განახლება"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-2xl shadow-sm text-xs font-bold">
        <button
          onClick={() => setActiveTab('current')}
          className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${
            activeTab === 'current' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          📦 მიმდინარე ნაშთები ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('low')}
          className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${
            activeTab === 'low' ? 'border-amber-500 text-amber-600 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          ⚠️ დაბალი მარაგი ({lowStockProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${
            activeTab === 'movements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          🔄 მოძრაობის ისტორია
        </button>
      </div>

      {/* Tab 1: Current Stock */}
      {activeTab === 'current' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-3">კოდი</th>
                <th className="p-3">პროდუქტი</th>
                <th className="p-3 text-center">ნაშთი</th>
                <th className="p-3 text-right">საშ. თვითღირებულება</th>
                <th className="p-3 text-right">მარაგის სულ თვითღირებულება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-blue-700">{p.code}</td>
                  <td className="p-3 font-bold text-slate-900">{p.name}</td>
                  <td className="p-3 text-center font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        p.currentStock <= p.minStock ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {p.currentStock} {p.unit}
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-600">{formatMoney(p.averageCostPrice)}</td>
                  <td className="p-3 text-right font-extrabold text-slate-900">
                    {formatMoney(p.currentStock * p.averageCostPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Low Stock */}
      {activeTab === 'low' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {lowStockProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              ყველა პროდუქტის მარაგი ნორმაშია!
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-200 text-amber-900 font-bold uppercase text-[10px]">
                  <th className="p-3">კოდი</th>
                  <th className="p-3">პროდუქტი</th>
                  <th className="p-3 text-center">დარჩენილი მარაგი</th>
                  <th className="p-3 text-center">მინიმალური ზღვარი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/50">
                    <td className="p-3 font-mono font-bold text-blue-700">{p.code}</td>
                    <td className="p-3 font-bold text-slate-900">{p.name}</td>
                    <td className="p-3 text-center font-extrabold text-amber-700">
                      {p.currentStock} {p.unit}
                    </td>
                    <td className="p-3 text-center text-slate-500 font-semibold">
                      {p.minStock} {p.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Movements History */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-3">თარიღი</th>
                <th className="p-3">პროდუქტი</th>
                <th className="p-3 text-center">ტიპი</th>
                <th className="p-3 text-center">ცვლილება</th>
                <th className="p-3">შენიშვნა</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-500">{formatDate(m.date)}</td>
                  <td className="p-3 font-bold text-slate-900">{m.productName}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.type === 'intake'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.type === 'sale'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {m.type === 'intake' ? 'შემოსვლა' : m.type === 'sale' ? 'გაყიდვა' : 'დაბრუნება'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-extrabold">
                    <span className={m.quantityChange > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{m.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
