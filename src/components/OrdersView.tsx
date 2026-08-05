import React, { useState } from 'react';
import {
  Search,
  Plus,
  FileText,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Package,
  Truck,
  X,
  CreditCard,
  Building,
  Filter,
  Check
} from 'lucide-react';
import { Order, OrderStatus, PaymentMethod, Settings, Product } from '../types';
import { api } from '../lib/api';
import { formatMoney, formatDate } from '../lib/formatters';
import { PrintOrderModal } from './PrintOrderModal';

interface Props {
  orders: Order[];
  products: Product[];
  settings: Settings;
  onRefreshData: () => void;
}

export const OrdersView: React.FC<Props> = ({ orders, products, settings, onRefreshData }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');

  // Modals
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [fulfillModalOrder, setFulfillModalOrder] = useState<Order | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      o.orderNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || o.paymentStatus === paymentFilter;
    let matchesFulfillment = true;
    if (fulfillmentFilter === 'fulfilled') matchesFulfillment = !!o.isFulfilled;
    if (fulfillmentFilter === 'unfulfilled') matchesFulfillment = !o.isFulfilled;

    return matchesSearch && matchesStatus && matchesPayment && matchesFulfillment;
  });

  // Calculate stats
  const totalOrders = orders.length;
  const newOrdersCount = orders.filter((o) => !o.isFulfilled && o.status !== 'cancelled').length;
  const totalSum = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalDue = orders.reduce((sum, o) => sum + o.balanceDue, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Stats */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">შეკვეთების მართვა</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            სულ შეკვეთები: {totalOrders} | გაუცემელი შეკვეთები: {newOrdersCount}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">სულ ჯამი: </span>
            <span className="font-extrabold text-slate-900">{formatMoney(totalSum)}</span>
          </div>
          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-xs">
            <span className="text-emerald-700 font-medium">გადახდილი: </span>
            <span className="font-extrabold text-emerald-800">{formatMoney(totalPaid)}</span>
          </div>
          <div className="bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 text-xs">
            <span className="text-amber-800 font-medium">მისაღები დავალიანება: </span>
            <span className="font-extrabold text-amber-900">{formatMoney(totalDue)}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძებნა შეკვეთის N, კლიენტის სახელით, ტელეფონით..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
          >
            <option value="all">ყველა სტატუსი</option>
            <option value="new">ახალი</option>
            <option value="preparing">მზადდება</option>
            <option value="ready">მზადაა</option>
            <option value="fulfilled">შესრულებული / გაცემული</option>
            <option value="cancelled">გაუქმებული</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
          >
            <option value="all">ყველა გადახდა</option>
            <option value="unpaid">გადაუხდელი</option>
            <option value="partially_paid">ნაწილობრივ</option>
            <option value="fully_paid">სრულად გადახდილი</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
          >
            <option value="all">ყველა საქონელი</option>
            <option value="unfulfilled">მარაგშია (გაუცემელი)</option>
            <option value="fulfilled">გაცემული (ჩამოჭრილი)</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">შეკვეთის N</th>
                <th className="p-3">თარიღი</th>
                <th className="p-3">კლიენტი</th>
                <th className="p-3">მისამართი / მიმღები</th>
                <th className="p-3 text-right">ჯამი (₾)</th>
                <th className="p-3 text-right">გადახდილი</th>
                <th className="p-3 text-center">გადახდის სტატუსი</th>
                <th className="p-3 text-center">საქონლის გაცემა</th>
                <th className="p-3 text-center">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    შეკვეთები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-blue-700">{o.orderNo}</td>
                    <td className="p-3 text-slate-500">{formatDate(o.date || o.createdAt)}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{o.customerName}</div>
                      {o.customerPhone && <div className="text-[10px] text-slate-400">{o.customerPhone}</div>}
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">
                      {o.deliveryAddress || 'ადგილზე გატანა'}
                      {o.recipientName && (
                        <div className="text-[10px] text-slate-400">
                          მიმღები: {o.recipientName} ({o.recipientPhone})
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">{formatMoney(o.grandTotal)}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">{formatMoney(o.paidAmount)}</td>

                    {/* Payment Status Badge */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          o.paymentStatus === 'fully_paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.paymentStatus === 'partially_paid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {o.paymentStatus === 'fully_paid'
                          ? 'სრულად'
                          : o.paymentStatus === 'partially_paid'
                          ? `ნაწილობრივ (${formatMoney(o.balanceDue)} დარჩ)`
                          : 'გადაუხდელი'}
                      </span>
                    </td>

                    {/* Stock Fulfillment Badge */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          o.isFulfilled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {o.isFulfilled ? '✓ გაცემულია' : '⏳ მარაგშია'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPrintOrder(o)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="ბეჭდვა / ნახვა"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setPaymentModalOrder(o)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="+ გადახდის დამატება"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>

                        {!o.isFulfilled && o.status !== 'cancelled' && (
                          <button
                            onClick={() => setFulfillModalOrder(o)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"
                            title="საქონლის გაცემა (მარაგის ჩამოჭრა)"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>გაცემა</span>
                          </button>
                        )}

                        <button
                          onClick={() => setStatusModalOrder(o)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="სტატუსის შეცვლა"
                        >
                          <Filter className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Print Order */}
      {printOrder && (
        <PrintOrderModal order={printOrder} settings={settings} onClose={() => setPrintOrder(null)} />
      )}

      {/* MODAL: Add Payment */}
      {paymentModalOrder && (
        <AddPaymentModal
          order={paymentModalOrder}
          onClose={() => setPaymentModalOrder(null)}
          onSuccess={() => {
            onRefreshData();
            setPaymentModalOrder(null);
          }}
        />
      )}

      {/* MODAL: Fulfill Order (Stock Deduction) */}
      {fulfillModalOrder && (
        <FulfillOrderModal
          order={fulfillModalOrder}
          products={products}
          onClose={() => setFulfillModalOrder(null)}
          onSuccess={() => {
            onRefreshData();
            setFulfillModalOrder(null);
          }}
        />
      )}

      {/* MODAL: Change Status */}
      {statusModalOrder && (
        <ChangeStatusModal
          order={statusModalOrder}
          onClose={() => setStatusModalOrder(null)}
          onSuccess={() => {
            onRefreshData();
            setStatusModalOrder(null);
          }}
        />
      )}
    </div>
  );
};

// Sub-Component: Add Payment Modal
const AddPaymentModal: React.FC<{
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ order, onClose, onSuccess }) => {
  const [amount, setAmount] = useState<number>(order.balanceDue > 0 ? order.balanceDue : 0);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('გთხოვთ შეიყვანოთ ვალიდური თანხა');
      return;
    }

    setLoading(true);
    try {
      await api.addOrderPayment(order.id, {
        amount,
        method,
        comment
      });
      onSuccess();
    } catch (err: any) {
      alert('შეცდომა გადახდის დამატებისას: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          გადახდის მიღება შეკვეთაზე: <span className="text-blue-700">{order.orderNo}</span>
        </h3>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">შეკვეთის სულ ჯამი:</span>
            <span className="font-bold">{formatMoney(order.grandTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">უკვე გადახდილი:</span>
            <span className="font-bold text-emerald-700">{formatMoney(order.paidAmount)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-slate-700">დარჩენილი დავალიანება:</span>
            <span className="text-red-600">{formatMoney(order.balanceDue)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">გადახდის თანხა (₾) *</label>
            <input
              type="number"
              step="any"
              required
              max={order.balanceDue > 0 ? order.balanceDue : undefined}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none text-base text-emerald-700"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">გადახდის მეთოდი *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold outline-none"
            >
              <option value="cash">💵 ნაღდი ანგარიშსწორება</option>
              <option value="bog">🏛️ საქართველოს ბანკი (BOG)</option>
              <option value="tbc">🏦 თიბისი ბანკი (TBC)</option>
              <option value="transfer">💳 საბანკო გადარიცხვა</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">კომენტარი / შენიშვნა</label>
            <input
              type="text"
              placeholder="მაგ: ჩარიცხვა ტერმინალით..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
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
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
            >
              გადახდის შენახვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-Component: Fulfill Order Modal
const FulfillOrderModal: React.FC<{
  order: Order;
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ order, products, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  // Check stock availability
  const stockCheck = order.items.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const available = prod ? prod.currentStock : 0;
    const isEnough = available >= item.quantity;
    return {
      ...item,
      available,
      isEnough
    };
  });

  const allAvailable = stockCheck.every((i) => i.isEnough);

  const handleFulfill = async () => {
    if (!allAvailable) {
      if (!confirm('ზოგიერთ პროდუქტზე მარაგი არ არის საკმარისი! მაინც გსურთ გაცემა? (მარაგი წავა უარყოფითში)')) {
        return;
      }
    }

    setLoading(true);
    try {
      await api.fulfillOrder(order.id);
      alert('შეკვეთა წარმატებით შესრულდა და საქონელი ჩამოიჭრა მარაგებიდან!');
      onSuccess();
    } catch (err: any) {
      alert('შეცდომა შეკვეთის გაცემისას: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          საქონლის გაცემა & მარაგის ჩამოჭრა: <span className="text-blue-700">{order.orderNo}</span>
        </h3>

        <p className="text-xs text-slate-600">
          გთხოვთ შეამოწმოთ პროდუქტების ნაშთი. გაცემისას მარაგები ავტომატურად შემცირდება.
        </p>

        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-2">პროდუქტი</th>
                <th className="p-2 text-center">მოთხოვნილი</th>
                <th className="p-2 text-center">ხელმისაწვდომი</th>
                <th className="p-2 text-center">სტატუსი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {stockCheck.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2">
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-[10px] font-mono text-blue-600">{item.productCode}</div>
                  </td>
                  <td className="p-2 text-center font-bold">{item.quantity} {item.unit}</td>
                  <td className="p-2 text-center font-bold text-slate-700">{item.available} {item.unit}</td>
                  <td className="p-2 text-center">
                    {item.isEnough ? (
                      <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full">
                        ✓ არის
                      </span>
                    ) : (
                      <span className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded-full">
                        ⚠️ ნაკლებობა
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={handleFulfill}
            disabled={loading}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>საქონლის გაცემა & ჩამოჭრა</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-Component: Change Status Modal
const ChangeStatusModal: React.FC<{
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ order, onClose, onSuccess }) => {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateOrderStatus(order.id, status);
      onSuccess();
    } catch (err: any) {
      alert('შეცდომა სტატუსის განახლებისას: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          სტატუსის შეცვლა: <span className="text-blue-700">{order.orderNo}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ახალი სტატუსი *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold outline-none"
            >
              <option value="new">🆕 ახალი</option>
              <option value="preparing">⚙️ მზადდება</option>
              <option value="ready">✅ მზადაა გასაცემად</option>
              <option value="fulfilled">🚚 შესრულებული / გაცემული</option>
              <option value="cancelled">❌ გაუქმებული</option>
            </select>
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
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
            >
              განახლება
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
