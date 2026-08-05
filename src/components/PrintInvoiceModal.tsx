import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Truck,
  CheckCircle2,
  Package,
  Building,
  User,
  Phone,
  MapPin
} from 'lucide-react';
import { Sale, Settings } from '../types';
import { formatMoney, formatDate } from '../lib/formatters';

interface Props {
  sale: Sale;
  settings: Settings;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<Props> = ({ sale, settings, onClose }) => {
  const [docType, setDocType] = useState<'a4' | 'thermal' | 'warehouse' | 'delivery'>('a4');

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
              📄 A4 ინვოისი
            </button>
            <button
              onClick={() => setDocType('thermal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                docType === 'thermal' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              🧾 ქვითარი (80მმ)
            </button>
            <button
              onClick={() => setDocType('warehouse')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                docType === 'warehouse' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              📦 საწყობის სია
            </button>
            <button
              onClick={() => setDocType('delivery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                docType === 'delivery' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              🚚 მიწოდების ფურცელი
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
        <div className="p-8 overflow-y-auto bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {docType === 'a4' && <A4Invoice sale={sale} settings={settings} />}
          {docType === 'thermal' && <ThermalReceipt sale={sale} settings={settings} />}
          {docType === 'warehouse' && <WarehousePickList sale={sale} settings={settings} />}
          {docType === 'delivery' && <DeliverySheet sale={sale} settings={settings} />}
        </div>
      </div>
    </div>
  );
};

// Component 1: A4 Invoice
const A4Invoice: React.FC<{ sale: Sale; settings: Settings }> = ({ sale, settings }) => {
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
            <p>ელფოსტა: {settings.email}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block px-4 py-2 bg-slate-900 text-white font-extrabold text-sm rounded-xl mb-2">
            ინვოისი N: {sale.invoiceNo}
          </div>
          <p className="text-xs text-slate-500 font-medium">თარიღი: {formatDate(sale.date)}</p>
          <p className="text-xs text-slate-500 font-medium">მოლარე: {sale.userName}</p>
        </div>
      </div>

      {/* Customer & Delivery Section */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
        <div>
          <h3 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">მყიდველი / კლიენტი</h3>
          <p className="text-sm font-bold text-slate-900">{sale.customerName}</p>
          <p className="text-slate-600 mt-0.5">ტელეფონი: {sale.customerPhone}</p>
        </div>

        {sale.deliveryType === 'delivery' && sale.deliveryDetails && (
          <div>
            <h3 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">მიწოდების მისამართი</h3>
            <p className="font-semibold text-slate-800">{sale.deliveryDetails.address}</p>
            <p className="text-slate-600 mt-0.5">
              მიმღები: {sale.deliveryDetails.recipientName} ({sale.deliveryDetails.recipientPhone})
            </p>
            {sale.deliveryDetails.comment && (
              <p className="text-slate-500 italic mt-0.5">შენიშვნა: {sale.deliveryDetails.comment}</p>
            )}
          </div>
        )}
      </div>

      {/* Itemized Table */}
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
          {sale.items.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="p-2.5 text-slate-500 font-semibold">{idx + 1}</td>
              <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
              <td className="p-2.5 font-mono text-blue-700 font-semibold">{item.productCode}</td>
              <td className="p-2.5 text-center font-bold text-slate-800">{item.quantity}</td>
              <td className="p-2.5 text-center text-slate-600">{item.unit}</td>
              <td className="p-2.5 text-right font-semibold text-slate-800">{formatMoney(item.sellingPrice)}</td>
              <td className="p-2.5 text-right font-extrabold text-slate-900">{formatMoney(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Financial Summary */}
      <div className="flex justify-between items-start border-t-2 border-slate-900 pt-4 text-xs">
        <div className="space-y-1 text-slate-600 max-w-xs">
          <p className="font-semibold text-slate-800">{settings.invoiceHeader}</p>
          <p>{settings.invoiceFooter}</p>
        </div>

        <div className="w-64 space-y-1.5 text-right">
          <div className="flex justify-between text-slate-600">
            <span>პროდუქციის ჯამი:</span>
            <span className="font-semibold text-slate-900">{formatMoney(sale.subtotal)}</span>
          </div>

          {sale.discount > 0 && (
            <div className="flex justify-between text-amber-700 font-semibold">
              <span>ფასდაკლება:</span>
              <span>-{formatMoney(sale.discount)}</span>
            </div>
          )}

          {sale.deliveryFee > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>მიწოდება:</span>
              <span>+{formatMoney(sale.deliveryFee)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-300 pt-1.5">
            <span>სულ გადასახდელი:</span>
            <span className="text-base text-blue-700">{formatMoney(sale.grandTotal)}</span>
          </div>

          <div className="flex justify-between text-emerald-700 font-bold">
            <span>გადახდილი:</span>
            <span>{formatMoney(sale.paidAmount)}</span>
          </div>

          {sale.balanceDue > 0 && (
            <div className="flex justify-between text-red-600 font-bold">
              <span>დარჩენილი დავალიანება:</span>
              <span>{formatMoney(sale.balanceDue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-slate-200 text-xs text-slate-500">
        <div>
          <p className="font-bold text-slate-700 mb-6">ჩააბარა (გამყიდველი):</p>
          <div className="border-b border-slate-400 w-full mb-1"></div>
          <p className="text-[10px]">ხელმოწერა / ბეჭდის ადგილი</p>
        </div>

        <div>
          <p className="font-bold text-slate-700 mb-6">იბარა (მყიდველი):</p>
          <div className="border-b border-slate-400 w-full mb-1"></div>
          <p className="text-[10px]">ხელმოწერა / მიღებაზე პასუხისმგებელი</p>
        </div>
      </div>
    </div>
  );
};

// Component 2: Thermal POS Receipt (80mm)
const ThermalReceipt: React.FC<{ sale: Sale; settings: Settings }> = ({ sale, settings }) => {
  return (
    <div className="bg-white p-4 w-[300px] border border-slate-300 shadow-md text-slate-900 font-mono text-[11px] leading-tight print:shadow-none print:border-none print:p-0">
      <div className="text-center space-y-1 mb-3">
        <h2 className="font-extrabold text-sm uppercase">{settings.companyName}</h2>
        <p>ს/კ: {settings.taxId}</p>
        <p>{settings.address}</p>
        <p>ტელ: {settings.phone}</p>
        <div className="border-b border-dashed border-slate-400 my-2"></div>
        <p className="font-bold">ქვითარი N: {sale.invoiceNo}</p>
        <p>{formatDate(sale.date)}</p>
      </div>

      <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
        <p className="font-bold">მყიდველი: {sale.customerName}</p>
      </div>

      <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-2 mb-2">
        {sale.items.map((item, i) => (
          <div key={i}>
            <div className="font-bold">{item.productName}</div>
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>
                {item.quantity} {item.unit} × {item.sellingPrice} ₾
              </span>
              <span className="font-bold text-slate-900">{formatMoney(item.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-right font-bold">
        <div className="flex justify-between">
          <span>სულ:</span>
          <span>{formatMoney(sale.grandTotal)}</span>
        </div>
        <div className="flex justify-between text-emerald-700">
          <span>გადახდილი:</span>
          <span>{formatMoney(sale.paidAmount)}</span>
        </div>
        {sale.balanceDue > 0 && (
          <div className="flex justify-between text-red-600">
            <span>ვალი:</span>
            <span>{formatMoney(sale.balanceDue)}</span>
          </div>
        )}
      </div>

      <div className="text-center mt-4 text-[10px] text-slate-500 space-y-0.5">
        <p>გმადლობთ შენაძენისთვის!</p>
      </div>
    </div>
  );
};

// Component 3: Warehouse Pick List (საწყობის გასაცემი სია)
const WarehousePickList: React.FC<{ sale: Sale; settings: Settings }> = ({ sale, settings }) => {
  return (
    <div className="bg-white p-8 max-w-[800px] w-full border border-slate-200 shadow-lg text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-lg font-black uppercase text-slate-900">საწყობის გასაცემი სია (Pick List)</h1>
          <p className="text-xs text-slate-500">ინვოისი N: {sale.invoiceNo}</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-bold">{formatDate(sale.date)}</p>
          <p className="text-slate-600">კლიენტი: {sale.customerName}</p>
        </div>
      </div>

      <table className="w-full text-xs border-collapse mb-8">
        <thead>
          <tr className="bg-slate-900 text-white font-bold">
            <th className="p-2.5 text-left w-10">№</th>
            <th className="p-2.5 text-left">პროდუქტის დასახელება</th>
            <th className="p-2.5 text-left font-mono">კოდი</th>
            <th className="p-2.5 text-center">გასაცემი რაოდენობა</th>
            <th className="p-2.5 text-center">ერთეული</th>
            <th className="p-2.5 text-center w-20">შემოწმება (✓)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sale.items.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="p-3 text-slate-500 font-semibold">{idx + 1}</td>
              <td className="p-3 font-bold text-slate-900 text-sm">{item.productName}</td>
              <td className="p-3 font-mono text-blue-700 font-bold text-sm">{item.productCode}</td>
              <td className="p-3 text-center font-extrabold text-blue-700 text-base">{item.quantity}</td>
              <td className="p-3 text-center text-slate-600 font-semibold">{item.unit}</td>
              <td className="p-3 text-center">
                <div className="w-6 h-6 border-2 border-slate-400 rounded mx-auto"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-12 border-t border-slate-300 flex justify-between text-xs text-slate-600">
        <div>
          <p className="font-bold text-slate-800">საწყობის პასუხისმგებელი პირის ხელმოწერა:</p>
          <div className="border-b border-slate-400 w-64 mt-8"></div>
        </div>
        <div>
          <p className="font-bold text-slate-800">მძღოლის/მიმღების ხელმოწერა:</p>
          <div className="border-b border-slate-400 w-64 mt-8"></div>
        </div>
      </div>
    </div>
  );
};

// Component 4: Driver Delivery Sheet (მიწოდების ფურცელი)
const DeliverySheet: React.FC<{ sale: Sale; settings: Settings }> = ({ sale, settings }) => {
  const del = sale.deliveryDetails;
  return (
    <div className="bg-white p-8 max-w-[800px] w-full border border-slate-200 shadow-lg text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
      <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black uppercase text-slate-900">მიწოდების ფურცელი (მძღოლისთვის)</h1>
          <p className="text-xs text-slate-500">ინვოისი N: {sale.invoiceNo}</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-bold">{settings.companyName}</p>
          <p>{settings.phone}</p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mb-6 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-bold text-slate-400 uppercase text-[10px]">მისატანი მისამართი:</p>
            <p className="text-sm font-black text-slate-900">{del?.address || 'N/A'}</p>
          </div>
          <div>
            <p className="font-bold text-slate-400 uppercase text-[10px]">მიმღები პირი:</p>
            <p className="text-sm font-bold text-slate-900">
              {del?.recipientName || sale.customerName} ({del?.recipientPhone || sale.customerPhone})
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-2">
          <div>
            <p className="font-bold text-slate-400 uppercase text-[10px]">მძღოლი / მანქანა:</p>
            <p className="font-semibold text-slate-800">
              {del?.driverName || 'N/A'} ({del?.carNumber || 'N/A'})
            </p>
          </div>
          <div>
            <p className="font-bold text-slate-400 uppercase text-[10px]">შენიშვნა:</p>
            <p className="font-medium text-slate-700 italic">{del?.comment || 'შენიშვნა არ არის'}</p>
          </div>
        </div>
      </div>

      <table className="w-full text-xs border-collapse mb-8">
        <thead>
          <tr className="bg-slate-900 text-white font-bold">
            <th className="p-2.5 text-left w-10">№</th>
            <th className="p-2.5 text-left">პროდუქცია</th>
            <th className="p-2.5 text-left font-mono">კოდი</th>
            <th className="p-2.5 text-center">რაოდენობა</th>
            <th className="p-2.5 text-center">ერთეული</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sale.items.map((item, idx) => (
            <tr key={idx}>
              <td className="p-3 font-semibold">{idx + 1}</td>
              <td className="p-3 font-bold text-slate-900">{item.productName}</td>
              <td className="p-3 font-mono text-blue-700 font-bold">{item.productCode}</td>
              <td className="p-3 text-center font-extrabold text-slate-900 text-sm">{item.quantity}</td>
              <td className="p-3 text-center text-slate-600 font-semibold">{item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-12 border-t border-slate-300 flex justify-between text-xs text-slate-600">
        <div>
          <p className="font-bold text-slate-800">ჩაბარების თარიღი და დრო:</p>
          <div className="border-b border-slate-400 w-48 mt-8"></div>
        </div>
        <div>
          <p className="font-bold text-slate-800">მიმღების ხელმოწერა:</p>
          <div className="border-b border-slate-400 w-48 mt-8"></div>
        </div>
      </div>
    </div>
  );
};
