import React, { useState } from 'react';
import { Users, Plus, Phone, Search, DollarSign, Building } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../lib/api';
import { formatMoney } from '../lib/formatters';

interface Props {
  customers: Customer[];
  onRefreshData: () => void;
}

export const CustomersView: React.FC<Props> = ({ customers, onRefreshData }) => {
  const [search, setSearch] = useState('');
  const [showPayModal, setShowPayModal] = useState<Customer | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(search.toLowerCase())) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">კლიენტები & ნისიები</h1>
          <p className="text-xs text-slate-500 mt-0.5">სულ: {customers.length} კლიენტი</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძებნა კლიენტის სახელით, ს/კ ან ტელეფონით..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {c.type === 'company' ? '🏢 კომპანია' : '👤 ფიზიკური პირი'}
                </span>
                <h3 className="font-bold text-sm text-slate-900">
                  {c.type === 'company' ? c.companyName || c.name : `${c.name} ${c.lastName || ''}`}
                </h3>
                {c.taxId && <p className="text-[10px] text-slate-400 font-mono mt-0.5">ს/კ: {c.taxId}</p>}
              </div>

              {c.totalDebt > 0 ? (
                <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold text-xs rounded-full">
                  ვალი: {formatMoney(c.totalDebt)}
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                  ვალი: 0 ₾
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600">
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{c.phone}</span>
              </p>
            </div>

            {c.totalDebt > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowPayModal(c)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  ნისიის დაფარვა
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pay Debt Modal */}
      {showPayModal && (
        <PayCustomerDebtModal
          customer={showPayModal}
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

const PayCustomerDebtModal: React.FC<{ customer: Customer; onClose: () => void; onSuccess: () => void }> = ({
  customer,
  onClose,
  onSuccess
}) => {
  const [amount, setAmount] = useState<number>(customer.totalDebt || 0);
  const [method, setMethod] = useState('cash');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.payCustomerDebt(customer.id, { amount, method });
      onSuccess();
    } catch {
      alert('შეცდომა ნისიის დაფარვისას');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">
          კლიენტის ნისიის დაფარვა: {customer.name}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">შემოტანილი თანხა (₾)</label>
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
              <option value="cash">💵 სალაროში (ნაღდი)</option>
              <option value="bog_card">💳 BOG ბარათი</option>
              <option value="tbc_card">💳 TBC ბარათი</option>
              <option value="tbc_transfer">🏦 TBC გადარიცხვა</option>
              <option value="bog_transfer">🏦 BOG გადარიცხვა</option>
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
              შენახვა & სალაროში ასახვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
