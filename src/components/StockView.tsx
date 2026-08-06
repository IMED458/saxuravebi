import React, { useState, useEffect } from 'react';
import { Boxes, ArrowRightLeft, AlertTriangle, FileText, CheckCircle, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Product, StockMovement, ProductBatch, User } from '../types';
import { api } from '../lib/api';
import { formatMoney, formatDate } from '../lib/formatters';

interface Props {
  products: Product[];
  onRefreshData: () => void;
  activePage?: string;
  user?: User;
}

const canManageStock = (u?: User) =>
  !!u && ['super_admin', 'owner', 'director', 'administrator', 'manager', 'warehouse'].includes(u.role);

export const StockView: React.FC<Props> = ({ products, onRefreshData, activePage, user }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'low' | 'intakes' | 'movements'>('current');
  const [loading, setLoading] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  const actor = { actorId: user?.id, actorName: user ? `${user.firstName} ${user.lastName}` : 'ადმინი' };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`ნამდვილად გსურთ პროდუქტის "${p.name}" (${p.code}) წაშლა მარაგებიდან?`)) return;
    try {
      await api.deleteProduct(p.id, actor);
      onRefreshData();
    } catch (e: any) {
      alert(e?.message || 'წაშლა ვერ განხორციელდა');
    }
  };

  useEffect(() => {
    if (activePage === 'low_stock') setActiveTab('low');
    else if (activePage === 'stock_movements') setActiveTab('movements');
    else if (activePage === 'stock_intake') setActiveTab('intakes');
    else if (activePage === 'stock_list' || activePage === 'stocktakes' || activePage === 'stock_transfers') setActiveTab('current');
  }, [activePage]);

  useEffect(() => {
    loadMovements();
    api.getProductBatches().then(setBatches).catch(() => {});
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
          onClick={() => setActiveTab('intakes')}
          className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${
            activeTab === 'intakes' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          📥 შემოსვლები ({batches.length})
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

      {/* Tab: Intakes / purchase history (what was bought, when, from whom, at what cost) */}
      {activeTab === 'intakes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-3">თარიღი</th>
                  <th className="p-3">პროდუქტი</th>
                  <th className="p-3">მომწოდებელი</th>
                  <th className="p-3">დოკუმენტი</th>
                  <th className="p-3 text-center">რაოდენობა</th>
                  <th className="p-3 text-right">ასაღები ფასი</th>
                  <th className="p-3 text-right">ჯამური ღირებულება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {batches.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">შემოსვლები ჯერ არ არის</td></tr>
                ) : (
                  [...batches]
                    .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime())
                    .map((b) => {
                      const prod = products.find((p) => p.id === b.productId);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(b.receivedDate)}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{prod?.name || '—'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{prod?.code || ''}</div>
                          </td>
                          <td className="p-3 text-slate-600">{b.supplierName || '—'}</td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{b.documentNo || '—'}</td>
                          <td className="p-3 text-center font-bold text-emerald-700">{b.receivedQuantity} {prod?.unit || ''}</td>
                          <td className="p-3 text-right font-semibold text-slate-700">{formatMoney(b.unitCost)}</td>
                          <td className="p-3 text-right font-extrabold text-slate-900">{formatMoney(b.receivedQuantity * b.unitCost)}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                {canManageStock(user) && <th className="p-3 text-center">მოქმედება</th>}
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
                  {canManageStock(user) && (
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setAdjustProduct(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="მარაგის კორექტირება"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="პროდუქტის წაშლა"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
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
                        m.type === 'purchase'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.type === 'sale'
                          ? 'bg-blue-100 text-blue-800'
                          : m.type === 'return'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.type === 'purchase' ? 'შემოსვლა' : m.type === 'sale' ? 'გაყიდვა' : m.type === 'return' ? 'დაბრუნება' : 'კორექტირება'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-extrabold">
                    <span className={m.changeQuantity > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {m.changeQuantity > 0 ? `+${m.changeQuantity}` : m.changeQuantity}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{m.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustProduct && (
        <AdjustStockModal
          product={adjustProduct}
          actor={actor}
          onClose={() => setAdjustProduct(null)}
          onSaved={() => { onRefreshData(); setAdjustProduct(null); }}
        />
      )}
    </div>
  );
};

const AdjustStockModal: React.FC<{
  product: Product;
  actor: { actorId?: string; actorName: string };
  onClose: () => void;
  onSaved: () => void;
}> = ({ product, actor, onClose, onSaved }) => {
  const [newQty, setNewQty] = useState<string>(String(product.currentStock));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newQty === '' || isNaN(parseFloat(newQty))) { alert('მიუთითეთ ახალი რაოდენობა'); return; }
    setSaving(true);
    try {
      await api.adjustStock(product.id, { newQty: parseFloat(newQty), reason, ...actor });
      onSaved();
    } catch (e: any) {
      alert(e?.message || 'კორექტირება ვერ განხორციელდა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">მარაგის კორექტირება</h3>
        <div className="text-slate-600">
          <div className="font-bold text-slate-900">{product.name}</div>
          <div className="font-mono text-blue-700">{product.code}</div>
          <div className="mt-2">მიმდინარე მარაგი: <span className="font-bold text-slate-900">{product.currentStock} {product.unit}</span></div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ახალი რაოდენობა *</label>
          <input
            type="text"
            inputMode="decimal"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="შეიყვანეთ რაოდენობა"
            className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">მიზეზი</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="მაგ: ინვენტარიზაციის სხვაობა"
            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer">გაუქმება</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-60">
            {saving ? 'ინახება...' : 'შენახვა'}
          </button>
        </div>
      </form>
    </div>
  );
};
