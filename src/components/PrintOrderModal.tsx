import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { Order, Settings } from '../types';
import { formatMoney, formatDate } from '../lib/formatters';

interface Props {
  order: Order;
  settings: Settings;
  onClose: () => void;
}

export const PrintOrderModal: React.FC<Props> = ({ order, settings, onClose }) => {
  const [docType, setDocType] = useState<'a4' | 'thermal'>('a4');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Top Actions Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDocType('a4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                docType === 'a4' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              📄 შეკვეთის დოკუმენტი (A4)
            </button>
            <button
              onClick={() => setDocType('thermal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                docType === 'thermal' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              🧾 ქვითარი (80მმ)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>დაბეჭდვა</span>
            </button>

            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Content View */}
        <div className="print-area p-8 overflow-y-auto bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {docType === 'a4' ? (
            <A4OrderDocument order={order} settings={settings} />
          ) : (
            <ThermalOrderReceipt order={order} settings={settings} />
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-Component: A4 Order Document
const A4OrderDocument: React.FC<{ order: Order; settings: Settings }> = ({ order, settings }) => {
  return (
    <div className="bg-white p-10 max-w-[800px] w-full border border-slate-200 shadow-lg text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6 mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{settings.companyName}</h1>
          <div className="text-xs text-slate-600 space-y-0.5 mt-2">
            <p>
              საიდენტიფიკაციო კოდი (ს/კ): <span className="font-bold text-slate-900">{settings.taxId}</span>
            </p>
            <p>მისამართი: {settings.address}</p>
            <p>ტელეფონი: {settings.phone}</p>
            {settings.bankAccount && (
              <p>ანგარიშის ნომერი: <span className="font-bold text-slate-900">{settings.bankAccount}</span>{settings.bankName ? ` (${settings.bankName})` : ''}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block px-4 py-2 bg-blue-700 text-white font-extrabold text-sm rounded-xl mb-2">
            შეკვეთა N: {order.orderNo}
          </div>
          <p className="text-xs text-slate-500 font-medium">თარიღი: {formatDate(order.date || order.createdAt)}</p>
          <p className="text-xs text-slate-500 font-medium">ოპერატორი: {order.userName || 'N/A'}</p>
        </div>
      </div>

      {/* Status & Customer Info */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
        <div>
          <h3 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">დამკვეთი / კლიენტი</h3>
          <p className="text-sm font-bold text-slate-900">{order.customerName}</p>
          {order.customerPhone && <p className="text-slate-600 mt-0.5">ტელეფონი: {order.customerPhone}</p>}
        </div>

        <div>
          <h3 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">მიწოდების დეტალები</h3>
          <p className="font-semibold text-slate-800">მისამართი: {order.deliveryAddress || 'ადგილზე გატანა'}</p>
          {order.recipientName && (
            <p className="text-slate-600 mt-0.5">
              მიმღები: {order.recipientName} ({order.recipientPhone || 'N/A'})
            </p>
          )}
          {order.comment && <p className="text-slate-500 italic mt-0.5">შენიშვნა: {order.comment}</p>}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-xs border-collapse mb-6">
        <thead>
          <tr className="bg-slate-900 text-white font-bold border-b border-slate-900">
            <th className="p-2.5 text-left w-10">№</th>
            <th className="p-2.5 text-left">დასახელება</th>
            <th className="p-2.5 text-left font-mono">კოდი</th>
            <th className="p-2.5 text-center">რაოდენობა</th>
            <th className="p-2.5 text-center">ერთეული</th>
            <th className="p-2.5 text-right">ფასი (₾)</th>
            <th className="p-2.5 text-right">ჯამი (₾)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {order.items.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="p-2.5 text-slate-500 font-semibold">{idx + 1}</td>
              <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
              <td className="p-2.5 font-mono text-blue-700 font-semibold">{item.productCode}</td>
              <td className="p-2.5 text-center font-bold text-slate-800">{item.quantity}</td>
              <td className="p-2.5 text-center text-slate-600">{item.unit}</td>
              <td className="p-2.5 text-right font-semibold text-slate-800">{formatMoney(item.price)}</td>
              <td className="p-2.5 text-right font-extrabold text-slate-900">{formatMoney(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Financial Summary */}
      <div className="flex justify-between items-start border-t-2 border-slate-900 pt-4 text-xs">
        <div className="space-y-1.5 text-slate-600 max-w-xs">
          <p className="font-bold text-slate-800">სტატუსი:</p>
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                order.isFulfilled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.isFulfilled ? '✓ საქონელი გაცემულია (მარაგი ჩამოიჭრა)' : '⏳ საქონელი გაუცემელია (მარაგშია)'}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                order.paymentStatus === 'fully_paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.paymentStatus === 'partially_paid'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {order.paymentStatus === 'fully_paid'
                ? 'სრულად გადახდილი'
                : order.paymentStatus === 'partially_paid'
                ? 'ნაწილობრივ გადახდილი'
                : 'გადაუხდელი'}
            </span>
          </div>
        </div>

        <div className="w-64 space-y-1.5 text-right">
          <div className="flex justify-between text-sm font-extrabold text-slate-900">
            <span>შეკვეთის ჯამი:</span>
            <span className="text-base text-blue-700">{formatMoney(order.grandTotal)}</span>
          </div>

          <div className="flex justify-between text-emerald-700 font-bold">
            <span>გადახდილი:</span>
            <span>{formatMoney(order.paidAmount)}</span>
          </div>

          {order.balanceDue > 0 && (
            <div className="flex justify-between text-red-600 font-bold">
              <span>დარჩენილი დავალიანება:</span>
              <span>{formatMoney(order.balanceDue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payments History on Document if exists */}
      {order.payments && order.payments.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <h4 className="font-bold text-slate-700 text-[11px] mb-2">გადახდების ისტორია:</h4>
          <div className="space-y-1 text-[11px]">
            {order.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-slate-600 bg-slate-50 p-2 rounded">
                <span>
                  {formatDate(p.date)} - {p.method === 'cash' ? 'ნაღდი' : p.method === 'bog' ? 'BOG' : p.method === 'tbc' ? 'TBC' : 'გადარიცხვა'} ({p.userName})
                </span>
                <span className="font-bold text-emerald-700">+{formatMoney(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-slate-200 text-xs text-slate-500">
        <div>
          <p className="font-bold text-slate-700 mb-6">ჩააბარა (გამყიდველი):</p>
          <div className="border-b border-slate-400 w-full mb-1"></div>
          <p className="text-[10px]">ხელმოწერა / ბეჭდის ადგილი</p>
        </div>

        <div>
          <p className="font-bold text-slate-700 mb-6">ჩაიბარა (მყიდველი):</p>
          <div className="border-b border-slate-400 w-full mb-1"></div>
          <p className="text-[10px]">ხელმოწერა / მიღებაზე პასუხისმგებელი</p>
        </div>
      </div>
    </div>
  );
};

// Sub-Component: Thermal Order Receipt (80mm)
const ThermalOrderReceipt: React.FC<{ order: Order; settings: Settings }> = ({ order, settings }) => {
  return (
    <div className="bg-white p-4 w-[300px] border border-slate-300 shadow-md text-slate-900 font-mono text-[11px] leading-tight print:shadow-none print:border-none print:p-0">
      <div className="text-center space-y-1 mb-3">
        <h2 className="font-extrabold text-sm uppercase">{settings.companyName}</h2>
        <p>ს/კ: {settings.taxId}</p>
        <p>{settings.address}</p>
        <div className="border-b border-dashed border-slate-400 my-2"></div>
        <p className="font-bold text-blue-700">შეკვეთა N: {order.orderNo}</p>
        <p>{formatDate(order.date || order.createdAt)}</p>
      </div>

      <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
        <p className="font-bold">მყიდველი: {order.customerName}</p>
        {order.customerPhone && <p>ტელ: {order.customerPhone}</p>}
      </div>

      <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-2 mb-2">
        {order.items.map((item, i) => (
          <div key={i}>
            <div className="font-bold">{item.productName}</div>
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>
                {item.quantity} {item.unit} × {item.price} ₾
              </span>
              <span className="font-bold text-slate-900">{formatMoney(item.total)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-right font-bold">
        <div className="flex justify-between">
          <span>სულ:</span>
          <span>{formatMoney(order.grandTotal)}</span>
        </div>
        <div className="flex justify-between text-emerald-700">
          <span>გადახდილი:</span>
          <span>{formatMoney(order.paidAmount)}</span>
        </div>
        {order.balanceDue > 0 && (
          <div className="flex justify-between text-red-600">
            <span>ვალი:</span>
            <span>{formatMoney(order.balanceDue)}</span>
          </div>
        )}
      </div>

      <div className="text-center mt-4 text-[10px] text-slate-500 space-y-0.5">
        <p>გმადლობთ შეკვეთისთვის!</p>
      </div>
    </div>
  );
};
