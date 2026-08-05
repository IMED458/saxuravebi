import React, { useState } from 'react';
import { Building2, Plus, DollarSign, Phone, Mail, FileText, Search } from 'lucide-react';
import { Supplier } from '../types';
import { api } from '../lib/api';
import { formatMoney } from '../lib/formatters';

interface Props {
  suppliers: Supplier[];
  onRefreshData: () => void;
}

export const SuppliersView: React.FC<Props> = ({ suppliers, onRefreshData }) => {
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<Supplier | null>(null);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.companyName && s.companyName.toLowerCase().includes(search.toLowerCase())) ||
      s.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">მომწოდებლები & დავალიანებები</h1>
          <p className="text-xs text-slate-500 mt-0.5">სულ რეგისტრირებულია: {suppliers.length} მომწოდებელი</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ ახალი მომწოდებელი</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძებნა მომწოდებლის სახელით, ს/კ ან ტელეფონით..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{s.name}</h3>
                {s.companyName && <p className="text-xs text-slate-500 font-semibold">{s.companyName}</p>}
                {s.taxId && <p className="text-[10px] text-slate-400 font-mono mt-0.5">ს/კ: {s.taxId}</p>}
              </div>

              {s.totalDebt > 0 && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
                  ვალი: {formatMoney(s.totalDebt)}
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{s.phone}</span>
              </p>
              {s.email && (
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.email}</span>
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setShowPayModal(s)}
                className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                გადახდა
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddSupplierModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            onRefreshData();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <PaySupplierModal
          supplier={showPayModal}
          onClose={() => setShowPayModal(null)}
          onSuccess={() => {
            onRefreshData();
            setShowPayModal(null);
          }}
        />
      )}
    </div>
  );
};

const AddSupplierModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSupplier({ name, companyName, taxId, phone, email });
      onCreated();
    } catch {
      alert('შეცდომა მომწოდებლის შექმნისას');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">ახალი მომწოდებელი</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="სახელი *"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
          />
          <input
            type="text"
            placeholder="კომპანიის სახელი"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
          />
          <input
            type="text"
            placeholder="ს/კ"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
          />
          <input
            type="text"
            placeholder="ტელეფონი *"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold cursor-pointer"
            >
              შენახვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PaySupplierModal: React.FC<{ supplier: Supplier; onClose: () => void; onSuccess: () => void }> = ({
  supplier,
  onClose,
  onSuccess
}) => {
  const [amount, setAmount] = useState<number>(supplier.totalDebt || 0);
  const [method, setMethod] = useState('tbc_transfer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.paySupplier(supplier.id, { amount, method });
      onSuccess();
    } catch {
      alert('შეცდომა გადახდისას');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">
          მომწოდებლის დავალიანების დაფარვა: {supplier.name}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">გადასახდელი თანხა (₾)</label>
            <input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">გადახდის მეთოდი</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            >
              <option value="tbc_transfer">🏦 TBC გადარიცხვა</option>
              <option value="bog_transfer">🏦 BOG გადარიცხვა</option>
              <option value="cash">💵 სალაროდან (ნაღდი)</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold cursor-pointer"
            >
              დაფარვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
