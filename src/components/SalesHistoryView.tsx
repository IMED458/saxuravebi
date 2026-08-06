import React, { useState } from 'react';
import { FileText, Printer, RotateCcw, Search, Eye, Download, Calendar, Trash2 } from 'lucide-react';
import { Sale, Settings, User } from '../types';
import { api } from '../lib/api';
import { formatMoney, formatDate } from '../lib/formatters';
import { exportToExcel } from '../lib/exportUtils';
import { PrintInvoiceModal } from './PrintInvoiceModal';

interface Props {
  sales: Sale[];
  settings: Settings;
  onRefreshData: () => void;
  activePage?: string;
  user?: User;
}

const canManage = (u?: User) =>
  !!u && ['super_admin', 'owner', 'director', 'administrator'].includes(u.role);

function saleStatusLabel(s: Sale): { text: string; cls: string } {
  if (s.status === 'cancelled') return { text: 'გაუქმებული', cls: 'bg-slate-200 text-slate-600' };
  if (s.status === 'returned') return { text: 'დაბრუნებული', cls: 'bg-red-100 text-red-700' };
  return { text: 'გაყიდული', cls: 'bg-emerald-100 text-emerald-800' };
}

const SECTION_TITLES: Record<string, string> = {
  sales_history: 'გაყიდვების ისტორია',
  invoices: 'ინვოისები',
  held_sales: 'შეჩერებული გაყიდვები',
  returns: 'დაბრუნებები',
  quotes: 'ფასის შეთავაზებები'
};

export const SalesHistoryView: React.FC<Props> = ({ sales, settings, onRefreshData, activePage = 'sales_history', user }) => {
  const [search, setSearch] = useState('');
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
  const [showReturnModal, setShowReturnModal] = useState<Sale | null>(null);
  const [deleting, setDeleting] = useState('');

  const handleDelete = async (s: Sale) => {
    const reason = window.prompt(
      `ნამდვილად გსურთ გაყიდვა #${s.invoiceNo}-ის წაშლა?\nმარაგი და ფინანსური მონაცემები ავტომატურად დაკორექტირდება.\n\nმიუთითეთ წაშლის მიზეზი:`
    );
    if (reason === null) return;
    if (!reason.trim()) { alert('წაშლის მიზეზი სავალდებულოა'); return; }
    setDeleting(s.id);
    try {
      await api.deleteSale(s.id, {
        reason,
        actorId: user?.id,
        actorName: user ? `${user.firstName} ${user.lastName}` : 'ადმინი'
      });
      onRefreshData();
    } catch (e: any) {
      alert(e?.message || 'წაშლა ვერ განხორციელდა');
    } finally {
      setDeleting('');
    }
  };

  const baseSales =
    activePage === 'held_sales'
      ? sales.filter((s) => s.isHeld)
      : activePage === 'returns'
      ? sales.filter((s) => s.status === 'returned')
      : sales.filter((s) => !s.isHeld && s.status !== 'cancelled');

  const filtered = baseSales.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.invoiceNo.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.userName.toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    const data = filtered.map((s) => ({
      'ინვოისის N': s.invoiceNo,
      თარიღი: formatDate(s.date),
      კლიენტი: s.customerName,
      მოლარე: s.userName,
      'ჯამური თანხა': s.grandTotal,
      გადახდილი: s.paidAmount,
      დავალიანება: s.balanceDue,
      სტატუსი: s.status === 'completed' ? 'დასრულებული' : 'დაბრუნებული'
    }));
    exportToExcel(data, 'გაყიდვების_ისტორია');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{SECTION_TITLES[activePage] || 'გაყიდვების ისტორია'}</h1>
          <p className="text-xs text-slate-500 mt-0.5">სულ ჩანაწერი: {baseSales.length}</p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Excel ექსპორტი</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძებნა ინვოისის N-ით (INV-2026-...), კლიენტით ან მოლარით..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <th className="p-3">ინვოისი N</th>
              <th className="p-3">თარიღი</th>
              <th className="p-3">კლიენტი</th>
              <th className="p-3">მოლარე</th>
              <th className="p-3 text-right">ჯამი</th>
              <th className="p-3 text-center">სტატუსი</th>
              <th className="p-3 text-center">მოქმედება</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-blue-700">{s.invoiceNo}</td>
                <td className="p-3 text-slate-600">{formatDate(s.date)}</td>
                <td className="p-3 font-bold text-slate-900">{s.customerName}</td>
                <td className="p-3 text-slate-600">{s.userName}</td>
                <td className="p-3 text-right font-extrabold text-blue-700">{formatMoney(s.grandTotal)}</td>
                <td className="p-3 text-center">
                  {(() => { const st = saleStatusLabel(s); return (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.text}</span>
                  ); })()}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setSelectedSaleForPrint(s)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="ინვოისის ნახვა / ბეჭდვა"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {s.status === 'active' && (
                      <button
                        onClick={() => setShowReturnModal(s)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                        title="დაბრუნება"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    {canManage(user) && !s.isHeld && (
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={deleting === s.id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer disabled:opacity-50"
                        title="გაყიდვის წაშლა"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print Modal */}
      {selectedSaleForPrint && (
        <PrintInvoiceModal
          sale={selectedSaleForPrint}
          settings={settings}
          onClose={() => setSelectedSaleForPrint(null)}
        />
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <ReturnModal
          sale={showReturnModal}
          onClose={() => setShowReturnModal(null)}
          onSuccess={() => {
            onRefreshData();
            setShowReturnModal(null);
          }}
        />
      )}
    </div>
  );
};

const ReturnModal: React.FC<{ sale: Sale; onClose: () => void; onSuccess: () => void }> = ({
  sale,
  onClose,
  onSuccess
}) => {
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [reason, setReason] = useState('წუნდებული / კლიენტის მოთხოვნა');
  const [refundMethod, setRefundMethod] = useState('cash');

  const handleReturn = async () => {
    const itemsToReturn = sale.items
      .filter((it) => (returnItems[it.productId] || 0) > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: returnItems[it.productId]
      }));

    if (itemsToReturn.length === 0) {
      alert('აირჩიეთ დასაბრუნებელი პროდუქტები');
      return;
    }

    try {
      await api.createReturn({
        saleId: sale.id,
        items: itemsToReturn,
        reason,
        refundMethod,
        actorId: 'user_admin',
        actorName: 'Super Admin'
      });
      alert('დაბრუნების დოკუმენტი წარმატებით შეიქმნა!');
      onSuccess();
    } catch {
      alert('შეცდომა დაბრუნების გაფორმებისას');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">
          პროდუქციის დაბრუნება: <span className="text-blue-600">{sale.invoiceNo}</span>
        </h3>

        <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">აირჩიეთ რაოდენობები</label>
          {sale.items.map((it) => (
            <div key={it.productId} className="flex items-center justify-between text-xs py-1">
              <div>
                <div className="font-bold">{it.productName}</div>
                <div className="text-[10px] text-slate-400">სულ გაყიდული: {it.quantity} {it.unit}</div>
              </div>
              <input
                type="number"
                min="0"
                max={it.quantity}
                value={returnItems[it.productId] || 0}
                onChange={(e) =>
                  setReturnItems({ ...returnItems, [it.productId]: parseFloat(e.target.value) || 0 })
                }
                className="w-16 p-1 text-center font-bold border border-slate-300 rounded-lg bg-white"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">დაბრუნების მიზეზი</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold">
            გაუქმება
          </button>
          <button onClick={handleReturn} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold">
            დაბრუნების გაფორმება
          </button>
        </div>
      </div>
    </div>
  );
};
