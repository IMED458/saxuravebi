import React, { useState } from 'react';
import { Clock, Wallet, DollarSign, AlertCircle, CheckCircle2, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Shift, Expense, User } from '../types';
import { api } from '../lib/api';
import { formatMoney, formatDate } from '../lib/formatters';

interface Props {
  user: User;
  currentShift: Shift | null;
  shifts: Shift[];
  expenses: Expense[];
  onRefreshData: () => void;
}

export const ShiftsExpensesView: React.FC<Props> = ({
  user,
  currentShift,
  shifts,
  expenses,
  onRefreshData
}) => {
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCashInModal, setShowCashInModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Current Shift Status Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${currentShift ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">სალაროს ცვლა</div>
            <h2 className="text-xl font-bold mt-0.5">
              {currentShift ? `ცვლა ღიაა (${currentShift.cashierName})` : 'ცვლა დახურულია'}
            </h2>
            {currentShift && (
              <p className="text-xs text-slate-300 mt-1">
                გახსნის თარიღი: {formatDate(currentShift.startTime)} | საწყისი სალარო: {formatMoney(currentShift.startCash)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!currentShift ? (
            <button
              onClick={() => setShowOpenModal(true)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              + ცვლის გახსნა
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowCashInModal(true)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                <span>თანხის შეტანა</span>
              </button>

              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowUpRight className="w-4 h-4 text-red-400" />
                <span>თანხის გაცემა / ხარჯი</span>
              </button>

              <button
                onClick={() => setShowCloseModal(true)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                ცვლის დახურვა
              </button>
            </>
          )}
        </div>
      </div>

      {/* Shifts History */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">ცვლების ისტორია</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-3">მოლარე</th>
                <th className="p-3">გახსნა</th>
                <th className="p-3">დახურვა</th>
                <th className="p-3 text-right">საწყისი</th>
                <th className="p-3 text-right">ნაღდი ნაშთი</th>
                <th className="p-3 text-right">სხვავობა</th>
                <th className="p-3 text-center">სტატუსი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{s.cashierName}</td>
                  <td className="p-3 text-slate-600">{formatDate(s.startTime)}</td>
                  <td className="p-3 text-slate-600">{s.endTime ? formatDate(s.endTime) : '-'}</td>
                  <td className="p-3 text-right font-semibold">{formatMoney(s.startCash)}</td>
                  <td className="p-3 text-right font-bold">{formatMoney(s.actualEndCash || 0)}</td>
                  <td className="p-3 text-right font-extrabold">
                    {s.difference !== undefined ? (
                      <span className={s.difference < 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {formatMoney(s.difference)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {s.status === 'open' ? 'ღიაა' : 'დახურულია'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses History */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-sm">ხარჯები & თანხის გაცემები</h3>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            + ახალი ხარჯი
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-3">თარიღი</th>
                <th className="p-3">კატეგორია</th>
                <th className="p-3">აღწერა</th>
                <th className="p-3 text-right">თანხა</th>
                <th className="p-3">გამცემი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-600">{formatDate(e.date)}</td>
                  <td className="p-3 font-bold text-slate-800">{e.category}</td>
                  <td className="p-3 text-slate-600">{e.note || '-'}</td>
                  <td className="p-3 text-right font-extrabold text-red-600">-{formatMoney(e.amount)}</td>
                  <td className="p-3 text-slate-600">{e.userName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Shift Modal */}
      {showOpenModal && (
        <OpenShiftModal
          user={user}
          onClose={() => setShowOpenModal(false)}
          onSuccess={() => {
            onRefreshData();
            setShowOpenModal(false);
          }}
        />
      )}

      {/* Close Shift Modal */}
      {showCloseModal && currentShift && (
        <CloseShiftModal
          shift={currentShift}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            onRefreshData();
            setShowCloseModal(false);
          }}
        />
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <AddExpenseModal
          user={user}
          shiftId={currentShift?.id}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={() => {
            onRefreshData();
            setShowExpenseModal(false);
          }}
        />
      )}

      {/* Cash In Modal */}
      {showCashInModal && (
        <CashInModal
          user={user}
          shiftId={currentShift?.id}
          onClose={() => setShowCashInModal(false)}
          onSuccess={() => {
            onRefreshData();
            setShowCashInModal(false);
          }}
        />
      )}
    </div>
  );
};

const OpenShiftModal: React.FC<{ user: User; onClose: () => void; onSuccess: () => void }> = ({
  user,
  onClose,
  onSuccess
}) => {
  const [startCash, setStartCash] = useState<number>(100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.openShift({
        cashierId: user.id,
        cashierName: `${user.firstName} ${user.lastName}`,
        startCash
      });
      onSuccess();
    } catch {
      alert('შეცდომა ცვლის გახსნისას');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">ცვლის გახსნა</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">საწყისი თანხა სალაროში (₾)</label>
            <input
              type="number"
              step="any"
              required
              value={startCash}
              onChange={(e) => setStartCash(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl">
              გაუქმება
            </button>
            <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl">
              გახსნა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CloseShiftModal: React.FC<{ shift: Shift; onClose: () => void; onSuccess: () => void }> = ({
  shift,
  onClose,
  onSuccess
}) => {
  const [actualEndCash, setActualEndCash] = useState<number>(shift.startCash);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.closeShift({
        shiftId: shift.id,
        actualEndCash
      });
      onSuccess();
    } catch {
      alert('შეცდომა ცვლის დახურვისას');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">ცვლის დახურვა</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
              ფაქტობრივი ნაღდი სალაროში (დათვლილი) (₾)
            </label>
            <input
              type="number"
              step="any"
              required
              value={actualEndCash}
              onChange={(e) => setActualEndCash(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl">
              გაუქმება
            </button>
            <button type="submit" className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl">
              ცვლის დახურვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddExpenseModal: React.FC<{ user: User; shiftId?: string; onClose: () => void; onSuccess: () => void }> = ({
  user,
  shiftId,
  onClose,
  onSuccess
}) => {
  const [category, setCategory] = useState('კომუნალურები / იჯარა');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createExpense({
        category,
        amount,
        note,
        paymentMethod: 'cash',
        shiftId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`
      });
      onSuccess();
    } catch {
      alert('შეცდომა ხარჯის დაფიქსირებისას');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">თანხის გაცემა / ხარჯი</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">კატეგორია</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">თანხა (₾)</label>
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
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">შენიშვნა</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl">
              გაუქმება
            </button>
            <button type="submit" className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl">
              გაცემა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CashInModal: React.FC<{ user: User; shiftId?: string; onClose: () => void; onSuccess: () => void }> = ({
  user,
  shiftId,
  onClose,
  onSuccess
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.cashIn({
        amount,
        note,
        shiftId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`
      });
      onSuccess();
    } catch {
      alert('შეცდომა თანხის შეტანისას');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">თანხის შეტანა სალაროში</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">შესატანი თანხა (₾)</label>
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
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">შენიშვნა</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl">
              გაუქმება
            </button>
            <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl">
              შეტანა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
