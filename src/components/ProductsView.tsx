import React, { useState } from 'react';
import {
  Search,
  Plus,
  Package,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Edit,
  Eye,
  TrendingUp,
  AlertTriangle,
  Boxes,
  DollarSign,
  History,
  X
} from 'lucide-react';
import { Product, Category, Unit, Supplier } from '../types';
import { api } from '../lib/api';
import { formatMoney, formatNum, formatDate } from '../lib/formatters';
import { exportToExcel } from '../lib/exportUtils';

interface Props {
  products: Product[];
  categories: Category[];
  units: Unit[];
  suppliers: Supplier[];
  onRefreshData: () => void;
  onNavigateAddProduct?: () => void;
}

export const ProductsView: React.FC<Props> = ({
  products,
  categories,
  units,
  suppliers,
  onRefreshData
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddStockModal, setShowAddStockModal] = useState<Product | null>(null);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.currentStock <= p.minStock && p.currentStock > 0;
    if (stockFilter === 'out') matchesStock = p.currentStock <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Export
  const handleExport = () => {
    const exportData = filteredProducts.map((p) => ({
      კოდი: p.code,
      დასახელება: p.name,
      მარაგი: p.currentStock,
      ერთეული: p.unit,
      'ასაღები ფასი (საშუალო)': p.averageCostPrice,
      'გასაყიდი ფასი': p.sellingPrice,
      'მარაგის თვითღირებულება': p.currentStock * p.averageCostPrice,
      'მარაგის გასაყიდი ღირებულება': p.currentStock * p.sellingPrice
    }));
    exportToExcel(exportData, 'პროდუქტები_მარაგები');
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">პროდუქტების კატალოგი</h1>
          <p className="text-xs text-slate-500 mt-0.5">სულ რეგისტრირებულია: {products.length} დასახელება</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddProductModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ ახალი პროდუქტი</span>
          </button>

          <button
            onClick={() => setShowBulkPriceModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-slate-600" />
            <span>ფასების მასობრივი განახლება</span>
          </button>

          <button
            onClick={handleExport}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel ექსპორტი</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძებნა დასახელებით, კოდით (მაგ: PIPE-4040-2)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
          >
            <option value="all">ყველა კატეგორია ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setStockFilter('all')}
            className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
              stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            ყველა
          </button>
          <button
            onClick={() => setStockFilter('low')}
            className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
              stockFilter === 'low' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            დაბალი
          </button>
          <button
            onClick={() => setStockFilter('out')}
            className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
              stockFilter === 'out' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            ამოწურული
          </button>
        </div>
      </div>

      {/* Table Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">კოდი</th>
                <th className="p-3">პროდუქტი</th>
                <th className="p-3">კატეგორია</th>
                <th className="p-3 text-center">მიმდინარე მარაგი</th>
                <th className="p-3 text-right">საშ. ასაღები ფასი</th>
                <th className="p-3 text-right">გასაყიდი ფასი</th>
                <th className="p-3 text-right">მარჟა / მოგება</th>
                <th className="p-3 text-center">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    პროდუქტები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  const margin = p.sellingPrice - p.averageCostPrice;
                  const marginPct = p.averageCostPrice > 0 ? (margin / p.averageCostPrice) * 100 : 100;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-blue-700">{p.code}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400">ერთეული: {p.unit}</div>
                      </td>
                      <td className="p-3 text-slate-600 font-semibold">{cat?.name || 'სხვა'}</td>

                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            p.currentStock <= 0
                              ? 'bg-red-100 text-red-700'
                              : p.currentStock <= p.minStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                      </td>

                      <td className="p-3 text-right font-semibold text-slate-600">
                        {formatMoney(p.averageCostPrice)}
                      </td>
                      <td className="p-3 text-right font-extrabold text-blue-700">
                        {formatMoney(p.sellingPrice)}
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-bold text-emerald-700">+{formatMoney(margin)}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{marginPct.toFixed(1)}%</div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedProduct(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="დეტალები"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowAddStockModal(p)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer font-bold text-xs flex items-center gap-1"
                            title="მარაგის დამატება"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Product Detail View Card */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          categories={categories}
          onClose={() => setSelectedProduct(null)}
          onAddStock={() => {
            const p = selectedProduct;
            setSelectedProduct(null);
            setShowAddStockModal(p);
          }}
        />
      )}

      {/* MODAL: Add Stock Modal */}
      {showAddStockModal && (
        <AddStockModal
          product={showAddStockModal}
          suppliers={suppliers}
          onClose={() => setShowAddStockModal(null)}
          onSuccess={() => {
            onRefreshData();
            setShowAddStockModal(null);
          }}
        />
      )}

      {/* MODAL: Bulk Price Update Modal */}
      {showBulkPriceModal && (
        <BulkPriceModal
          categories={categories}
          onClose={() => setShowBulkPriceModal(false)}
          onSuccess={() => {
            onRefreshData();
            setShowBulkPriceModal(false);
          }}
        />
      )}

      {/* MODAL: Add Product Modal */}
      {showAddProductModal && (
        <AddProductModal
          categories={categories}
          units={units}
          suppliers={suppliers}
          onClose={() => setShowAddProductModal(false)}
          onSuccess={() => {
            onRefreshData();
            setShowAddProductModal(false);
          }}
        />
      )}
    </div>
  );
};

// Sub-Component: Product Detail Modal
const ProductDetailModal: React.FC<{
  product: Product;
  categories: Category[];
  onClose: () => void;
  onAddStock: () => void;
}> = ({ product, categories, onClose, onAddStock }) => {
  const [tab, setTab] = useState<'financials' | 'intakes' | 'priceHistory'>('financials');

  const cat = categories.find((c) => c.id === product.categoryId);
  const totalStockCostValue = product.currentStock * product.averageCostPrice;
  const totalStockSalesValue = product.currentStock * product.sellingPrice;
  const totalStockPotentialProfit = totalStockSalesValue - totalStockCostValue;
  const marginPerUnit = product.sellingPrice - product.averageCostPrice;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-400 font-mono font-bold">{product.code}</div>
            <h2 className="text-lg font-bold">{product.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 text-xs font-bold">
          <button
            onClick={() => setTab('financials')}
            className={`py-3 px-4 border-b-2 cursor-pointer transition ${
              tab === 'financials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            📊 ფინანსური & მარაგი
          </button>
          <button
            onClick={() => setTab('intakes')}
            className={`py-3 px-4 border-b-2 cursor-pointer transition ${
              tab === 'intakes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            📦 შემოსვლების ისტორია (პარტიები)
          </button>
          <button
            onClick={() => setTab('priceHistory')}
            className={`py-3 px-4 border-b-2 cursor-pointer transition ${
              tab === 'priceHistory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            📈 ფასის ცვლილებები
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {tab === 'financials' && (
            <div className="space-y-6">
              {/* Financial Metrics Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">მიმდინარე მარაგი</div>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {product.currentStock} {product.unit}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">საშუალო თვითღირებულება</div>
                  <div className="text-lg font-black text-slate-800 mt-1">
                    {formatMoney(product.averageCostPrice)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">გასაყიდი ფასი</div>
                  <div className="text-lg font-black text-blue-700 mt-1">{formatMoney(product.sellingPrice)}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">მოგება ერთეულზე</div>
                  <div className="text-lg font-black text-emerald-700 mt-1">+{formatMoney(marginPerUnit)}</div>
                </div>
              </div>

              {/* Total Inventory Value Section */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-300 text-xs border-b border-slate-800 pb-2">
                  მარაგის ჯამური ფინანსური შეფასება
                </h4>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <div className="text-[10px] text-slate-400">მარაგის თვითღირებულება:</div>
                    <div className="text-sm font-bold">{formatMoney(totalStockCostValue)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">გასაყიდი ღირებულება:</div>
                    <div className="text-sm font-bold text-blue-300">{formatMoney(totalStockSalesValue)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-400 font-bold">პოტენციური სუფთა მოგება:</div>
                    <div className="text-sm font-extrabold text-emerald-400">
                      +{formatMoney(totalStockPotentialProfit)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'intakes' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800">პარტიები და შემოსვლის ისტორია</h4>
              {product.intakeBatches && product.intakeBatches.length > 0 ? (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {product.intakeBatches.map((b, i) => (
                    <div key={i} className="p-3 bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">
                          {b.quantity} {product.unit} @ {formatMoney(b.costPrice)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          მომწოდებელი: {b.supplierName || 'N/A'} | თარიღი: {formatDate(b.intakeDate)}
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-blue-600">
                        დარჩენილი: {b.remainingQuantity} {product.unit}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 py-4 text-center">შემოსვლების ისტორია არ არის</p>
              )}
            </div>
          )}

          {tab === 'priceHistory' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800">ფასების ცვლილების ისტორია</h4>
              {product.priceHistory && product.priceHistory.length > 0 ? (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {product.priceHistory.map((h, i) => (
                    <div key={i} className="p-3 bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">
                          ძველი: {formatMoney(h.oldPrice)} → ახალი: {formatMoney(h.newPrice)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          შემცვლელი: {h.changedBy} | თარიღი: {formatDate(h.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 py-4 text-center">ფასის ცვლილება არ დაფიქსირებულა</p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between">
          <button
            onClick={onAddStock}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ მარაგის დამატება</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-Component: Add Stock Modal
const AddStockModal: React.FC<{
  product: Product;
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ product, suppliers, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(product.averageCostPrice || 0);
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [docNumber, setDocNumber] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0 || costPrice < 0) {
      alert('გთხოვთ მიუთითოთ ვალიდური რაოდენობა და ფასი');
      return;
    }

    setLoading(true);
    try {
      const sup = suppliers.find((s) => s.id === supplierId);
      await api.addStock(product.id, {
        quantity,
        costPrice,
        supplierId,
        supplierName: sup?.name || 'N/A',
        docNumber,
        comment
      });
      onSuccess();
    } catch (e: any) {
      alert('შეცდომა მარაგის დამატებისას: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          მარაგის მიღება: <span className="text-blue-600">{product.name}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">რაოდენობა ({product.unit}) *</label>
              <input
                type="number"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ასაღები ფასი (₾) *</label>
              <input
                type="number"
                step="any"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">მომწოდებელი</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            >
              <option value="">-- აირჩიეთ მომწოდებელი --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.companyName || s.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ზედნადების / დოკუმენტის N</label>
            <input
              type="text"
              placeholder="მაგ: DOC-9901"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold cursor-pointer"
            >
              მიღება & შენახვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-Component: Bulk Price Modal
const BulkPriceModal: React.FC<{
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ categories, onClose, onSuccess }) => {
  const [categoryId, setCategoryId] = useState<string>('all');
  const [percentage, setPercentage] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.bulkPriceUpdate({ categoryId, percentage });
      alert(`წარმატებით განახლდა ${res.updatedCount} პროდუქტის ფასი`);
      onSuccess();
    } catch (e) {
      alert('შეცდომა მასობრივი განახლებისას');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900">ფასების მასობრივი განახლება (%)</h3>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">კატეგორია</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            >
              <option value="all">ყველა კატეგორია</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
              ცვლილების პროცენტი (+ მომატება, - შემცირება)
            </label>
            <input
              type="number"
              step="any"
              required
              value={percentage}
              onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold cursor-pointer"
            >
              განახლება
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-Component: Add New Product Modal
const AddProductModal: React.FC<{
  categories: Category[];
  units: Unit[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ categories, units, suppliers, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [unit, setUnit] = useState(units[0]?.name || 'ცალი');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(5);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [initialCostPrice, setInitialCostPrice] = useState<number>(0);
  const [supplierId, setSupplierId] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || sellingPrice <= 0) {
      alert('გთხოვთ შეავსოთ აუცილებელი ველები: დასახელება, კოდი, გასაყიდი ფასი!');
      return;
    }

    setLoading(true);
    try {
      await api.createProduct({
        name,
        code,
        categoryId,
        unit,
        sellingPrice,
        minStock,
        initialStock,
        initialCostPrice,
        supplierId,
        barcode,
        comment
      });
      onSuccess();
    } catch (err: any) {
      alert('შეცდომა პროდუქტის დამატებისას: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            ახალი პროდუქტის რეგისტრაცია
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">პროდუქტის დასახელება *</label>
              <input
                type="text"
                required
                placeholder="მაგ: მილ-კვადრატი 40x40 2მმ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">არტიკული / კოდი *</label>
              <input
                type="text"
                required
                placeholder="მაგ: PIPE-4040-2"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">კატეგორია *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 outline-none font-semibold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ზომის ერთეული *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 outline-none font-semibold"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
                <option value="ცალი">ცალი</option>
                <option value="მეტრი">მეტრი</option>
                <option value="კგ">კგ</option>
                <option value="კვ.მ">კვ.მ</option>
                <option value="ტონა">ტონა</option>
                <option value="შეფუთვა">შეფუთვა</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">გასაყიდი ფასი (₾) *</label>
              <input
                type="number"
                step="any"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-blue-700 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">საწყისი ასაღები ფასი (₾)</label>
              <input
                type="number"
                step="any"
                value={initialCostPrice}
                onChange={(e) => setInitialCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">საწყისი ნაშთი/მარაგი</label>
              <input
                type="number"
                step="any"
                value={initialStock}
                onChange={(e) => setInitialStock(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-emerald-700 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">მინიმალური მარაგი</label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl p-2.5 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">მომწოდებელი</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
              >
                <option value="">-- აირჩიეთ --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">შტრიხკოდი (Barcode)</label>
              <input
                type="text"
                placeholder="869000000000"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">შენიშვნა / აღწერა</label>
            <textarea
              rows={2}
              placeholder="დამატებითი ინფორმაცია პროდუქტზე..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
            >
              დამატება & შენახვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
