import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Trash2,
  User as UserIcon,
  UserPlus,
  Truck,
  CreditCard,
  DollarSign,
  Printer,
  PauseCircle,
  PlayCircle,
  PackagePlus,
  AlertCircle,
  CheckCircle2,
  Building,
  Info,
  FileText
} from 'lucide-react';
import { Product, Customer, Sale, User, PaymentMethod, Category, Unit } from '../types';
import { api } from '../lib/api';
import { formatMoney, formatNum } from '../lib/formatters';

interface CartItem {
  product: Product;
  quantity: number;
  customPrice: number; // Price for this sale only
  lineTotal: number;
}

interface Props {
  user: User;
  products: Product[];
  customers: Customer[];
  categories: Category[];
  units: Unit[];
  onSaleCompleted: (sale: Sale) => void;
  onRefreshData: () => void;
}

export const POSView: React.FC<Props> = ({
  user,
  products,
  customers,
  categories,
  units,
  onSaleCompleted,
  onRefreshData
}) => {
  // Selected Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryDetails, setDeliveryDetails] = useState({
    address: '',
    city: '',
    recipientName: '',
    recipientPhone: '',
    recipientPhone2: '',
    comment: '',
    fee: 0,
    driverName: '',
    carNumber: ''
  });

  // Product Search Input
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Split Payments
  const [payments, setPayments] = useState<{ method: PaymentMethod; amount: number }[]>([
    { method: 'cash', amount: 0 }
  ]);
  const [tenderedCash, setTenderedCash] = useState<number>(0);

  // Quick Product Add Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Error / Loading
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Held sales list
  const [heldSales, setHeldSales] = useState<Sale[]>([]);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);

  useEffect(() => {
    // Focus product search on mount
    searchInputRef.current?.focus();
    loadHeldSales();
  }, []);

  const loadHeldSales = async () => {
    try {
      const sales = await api.getSales();
      setHeldSales(sales.filter((s) => s.isHeld));
    } catch {
      // ignore
    }
  };

  // Filter products by search
  useEffect(() => {
    if (!productSearch.trim()) {
      setFilteredProducts([]);
      return;
    }
    const q = productSearch.toLowerCase();
    const res = products.filter(
      (p) =>
        p.status === 'active' &&
        (p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)))
    );
    setFilteredProducts(res.slice(0, 8));
  }, [productSearch, products]);

  // When customer changes, apply special prices if any
  useEffect(() => {
    if (selectedCustomer && selectedCustomer.specialPrices) {
      setCart((prev) =>
        prev.map((item) => {
          const specPrice = selectedCustomer.specialPrices?.[item.product.id];
          if (specPrice !== undefined) {
            return {
              ...item,
              customPrice: specPrice,
              lineTotal: Math.round(item.quantity * specPrice * 100) / 100
            };
          }
          return item;
        })
      );
    }
  }, [selectedCustomer]);

  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    // Determine default price for this customer if special price exists
    let initialPrice = product.sellingPrice;
    if (selectedCustomer?.specialPrices?.[product.id] !== undefined) {
      initialPrice = selectedCustomer.specialPrices[product.id];
    }

    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + 1;
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].lineTotal = Math.round(newQty * updated[existingIndex].customPrice * 100) / 100;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          customPrice: initialPrice,
          lineTotal: initialPrice
        }
      ]);
    }
    setProductSearch('');
    setFilteredProducts([]);
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...cart];
    updated[index].quantity = newQty;
    updated[index].lineTotal = Math.round(newQty * updated[index].customPrice * 100) / 100;
    setCart(updated);
  };

  const updateCustomPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    const updated = [...cart];
    updated[index].customPrice = newPrice;
    updated[index].lineTotal = Math.round(updated[index].quantity * newPrice * 100) / 100;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const delFee = deliveryType === 'delivery' ? Number(deliveryDetails.fee) || 0 : 0;
  const grandTotal = Math.max(0, subtotal - Number(discount) + delFee);

  // Total Payments entered
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const cashPaid = payments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const changeDue = Math.max(0, (Number(tenderedCash) || 0) - cashPaid);

  // Update payments auto-fill if single payment method
  useEffect(() => {
    if (payments.length === 1) {
      setPayments([{ method: payments[0].method, amount: grandTotal }]);
    }
  }, [grandTotal]);

  // Handle Checkout / Invoice Generation
  const handleCheckout = async () => {
    setError('');

    if (!selectedCustomer) {
      setError('კლიენტის არჩევა სავალდებულოა გაყიდვის დასასრულებლად!');
      return;
    }

    if (cart.length === 0) {
      setError('კალათა ცარიელია, დაამატეთ პროდუქტები.');
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        customerId: selectedCustomer.id,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          sellingPrice: i.customPrice
        })),
        discount,
        deliveryFee: delFee,
        deliveryType,
        deliveryDetails: deliveryType === 'delivery' ? deliveryDetails : undefined,
        payments,
        actorId: user.id,
        actorName: `${user.firstName} ${user.lastName}`
      };

      const sale = await api.createSale(saleData);
      onSaleCompleted(sale);
      onRefreshData();

      // Reset cart
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setPayments([{ method: 'cash', amount: 0 }]);
      setTenderedCash(0);
    } catch (err: any) {
      setError(err.message || 'გაყიდვის დასრულება ვერ განხორციელდა');
    } finally {
      setLoading(false);
    }
  };

  // Handle Order Creation (Stock NOT deducted)
  const handleCreateOrder = async () => {
    if (!selectedCustomer) {
      setError('გთხოვთ აირჩიოთ კლიენტი შეკვეთის გასაფორმებლად!');
      return;
    }
    if (cart.length === 0) {
      setError('კალათა ცარიელია, დაამატეთ პროდუქტები.');
      return;
    }

    setLoading(true);
    try {
      const custName =
        selectedCustomer.type === 'company'
          ? selectedCustomer.companyName || selectedCustomer.name
          : `${selectedCustomer.name} ${selectedCustomer.lastName || ''}`.trim();

      const initialPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const orderData = {
        customerId: selectedCustomer.id,
        customerName: custName,
        customerPhone: selectedCustomer.phone,
        items: cart.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          productCode: i.product.code,
          unit: i.product.unit,
          quantity: i.quantity,
          price: i.customPrice,
          total: i.lineTotal
        })),
        paidAmount: initialPaid,
        paymentMethod: payments[0]?.method || 'cash',
        deliveryAddress: deliveryType === 'delivery' ? deliveryDetails.address : undefined,
        recipientName: deliveryType === 'delivery' ? deliveryDetails.recipientName : undefined,
        recipientPhone: deliveryType === 'delivery' ? deliveryDetails.recipientPhone : undefined,
        comment: deliveryDetails.comment || '',
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`
      };

      const createdOrder = await api.createOrder(orderData);
      alert(`შეკვეთა N ${createdOrder.orderNo} წარმატებით დარეგისტრირდა! (მარაგი არ ჩამოჭრილა)`);
      onRefreshData();

      // Reset cart
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setPayments([{ method: 'cash', amount: 0 }]);
      setTenderedCash(0);
    } catch (err: any) {
      setError(err.message || 'შეკვეთის გაფორმება ვერ განხორციელდა');
    } finally {
      setLoading(false);
    }
  };

  // Handle Hold Sale
  const handleHoldSale = async () => {
    if (cart.length === 0) return;
    try {
      await api.createSale({
        customerId: selectedCustomer?.id || 'temp',
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          sellingPrice: i.customPrice
        })),
        isHeld: true,
        holdNote: `შეჩერებულია (${new Date().toLocaleTimeString('ka-GE')})`,
        actorId: user.id,
        actorName: `${user.firstName} ${user.lastName}`
      });
      setCart([]);
      setSelectedCustomer(null);
      loadHeldSales();
    } catch (e) {
      // ignore
    }
  };

  const handleResumeSale = (sale: Sale) => {
    // Restore cart
    const restoredItems: CartItem[] = sale.items.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      return {
        product: prod || {
          id: it.productId,
          name: it.productName,
          code: it.productCode,
          categoryId: '',
          unit: it.unit,
          sellingPrice: it.sellingPrice,
          minStock: 0,
          status: 'active',
          currentStock: 100,
          averageCostPrice: it.costPriceSnapshot,
          lastCostPrice: it.costPriceSnapshot,
          totalSold: 0,
          createdAt: '',
          updatedAt: ''
        },
        quantity: it.quantity,
        customPrice: it.sellingPrice,
        lineTotal: it.lineTotal
      };
    });

    setCart(restoredItems);
    const cust = customers.find((c) => c.id === sale.customerId);
    if (cust) setSelectedCustomer(cust);

    // Delete held sale record
    api.deleteHeldSale(sale.id).then(() => loadHeldSales());
    setShowHeldSalesModal(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
      {/* LEFT COL: Cart & Operations (65%) */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Customer Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                კლიენტის არჩევა <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === e.target.value);
                  setSelectedCustomer(cust || null);
                  if (cust?.address) {
                    setDeliveryDetails((prev) => ({
                      ...prev,
                      address: cust.address || '',
                      recipientName:
                        cust.type === 'company'
                          ? cust.companyName || cust.name
                          : `${cust.name} ${cust.lastName || ''}`,
                      recipientPhone: cust.phone
                    }));
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- აირჩიეთ კლიენტი (სავალდებულოა) --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type === 'company' ? `🏢 ${c.companyName || c.name}` : `👤 ${c.name} ${c.lastName || ''}`} ({c.phone})
                    {c.totalDebt > 0 ? ` - ვალი: ${formatMoney(c.totalDebt)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ ახალი კლიენტი</span>
          </button>
        </div>

        {/* Product Search Input Bar */}
        <div className="p-4 bg-white border-b border-slate-200 relative">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="ჩაწერეთ პროდუქტის სახელი, კოდი (მაგ: PIPE-4040-2) ან Barcode..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-medium placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none shadow-inner"
              />
            </div>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-3.5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="სწრაფი პროდუქტის დამატება"
            >
              <PackagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">+ პროდუქტი</span>
            </button>
          </div>

          {/* Instant Product Results Dropdown */}
          {filteredProducts.length > 0 && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-slate-300 rounded-2xl shadow-2xl z-40 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="p-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition group"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">{p.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      კოდი: <span className="font-mono text-blue-600 font-semibold">{p.code}</span> | მარაგი:{' '}
                      <span className={p.currentStock <= p.minStock ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                        {p.currentStock} {p.unit}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-blue-600">{formatMoney(p.sellingPrice)}</div>
                    <div className="text-[10px] text-slate-400">ერთეული: {p.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Search className="w-12 h-12 text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-medium">კალათა ცარიელია</p>
              <p className="text-[11px] text-slate-400">მოძებნეთ პროდუქტი კოდით ან სახელით ზედა ველში</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-5">პროდუქტი</div>
                <div className="col-span-2 text-center">რაოდენობა</div>
                <div className="col-span-2 text-center">ფასი (₾)</div>
                <div className="col-span-2 text-right">ჯამი</div>
                <div className="col-span-1 text-center">წაშლა</div>
              </div>

              {cart.map((item, idx) => {
                const isModifiedPrice = item.customPrice !== item.product.sellingPrice;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-200 transition"
                  >
                    <div className="col-span-5 flex items-center gap-3">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center">
                          {item.product.code.slice(0, 3)}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">{item.product.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {item.product.code} | მარაგში: {item.product.currentStock} {item.product.unit}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Input (Supports Decimals e.g. 2.5) */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(idx, parseFloat(e.target.value) || 0)}
                        className="w-16 py-1 px-2 text-center text-xs font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-semibold">{item.product.unit}</span>
                    </div>

                    {/* Price Override Input */}
                    <div className="col-span-2 text-center">
                      <input
                        type="number"
                        step="any"
                        value={item.customPrice}
                        onChange={(e) => updateCustomPrice(idx, parseFloat(e.target.value) || 0)}
                        className={`w-20 py-1 px-2 text-center text-xs font-bold bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                          isModifiedPrice ? 'border-amber-500 text-amber-700 bg-amber-50' : 'border-slate-300 text-slate-900'
                        }`}
                        title={isModifiedPrice ? `სტანდარტული ფასი: ${item.product.sellingPrice} ₾` : ''}
                      />
                      {isModifiedPrice && (
                        <div className="text-[9px] text-amber-600 font-bold mt-0.5">ფასი შეცვლილია</div>
                      )}
                    </div>

                    <div className="col-span-2 text-right text-xs font-extrabold text-blue-700">
                      {formatMoney(item.lineTotal)}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions & Hold Sales */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleHoldSale}
              disabled={cart.length === 0}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <PauseCircle className="w-4 h-4 text-slate-600" />
              <span>შეჩერება</span>
            </button>

            {heldSales.length > 0 && (
              <button
                onClick={() => setShowHeldSalesModal(true)}
                className="px-3 py-1.5 bg-amber-100 text-amber-800 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <PlayCircle className="w-4 h-4 text-amber-600" />
                <span>შეჩერებულები ({heldSales.length})</span>
              </button>
            )}
          </div>

          <div className="text-slate-600 font-medium">
            სულ პროდუქცია: <span className="font-bold text-slate-900">{cart.length} დასახელება</span>
          </div>
        </div>
      </div>

      {/* RIGHT COL: Summary, Delivery & Checkout (35%) */}
      <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-5 overflow-y-auto space-y-5">
        <h2 className="text-sm font-bold text-slate-900 tracking-wide border-b border-slate-200 pb-3">
          გადახდა & მიწოდება
        </h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Delivery Toggle */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">მიწოდების ტიპი</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDeliveryType('pickup')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                deliveryType === 'pickup'
                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              🏢 თვითგატანა
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType('delivery')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                deliveryType === 'delivery'
                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              🚚 მიწოდება
            </button>
          </div>
        </div>

        {/* Delivery Details Fields */}
        {deliveryType === 'delivery' && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>მიწოდების მონაცემები</span>
            </div>

            <input
              type="text"
              placeholder="მისატანი მისამართი *"
              value={deliveryDetails.address}
              onChange={(e) => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="მიმღები *"
                value={deliveryDetails.recipientName}
                onChange={(e) => setDeliveryDetails({ ...deliveryDetails, recipientName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="ტელეფონი *"
                value={deliveryDetails.recipientPhone}
                onChange={(e) => setDeliveryDetails({ ...deliveryDetails, recipientPhone: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="მძღოლი"
                value={deliveryDetails.driverName}
                onChange={(e) => setDeliveryDetails({ ...deliveryDetails, driverName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="მანქანის N"
                value={deliveryDetails.carNumber}
                onChange={(e) => setDeliveryDetails({ ...deliveryDetails, carNumber: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">მიწოდების საფასური (₾)</label>
              <input
                type="number"
                value={deliveryDetails.fee}
                onChange={(e) =>
                  setDeliveryDetails({ ...deliveryDetails, fee: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Financial Summary Box */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>პროდუქციის ჯამი:</span>
            <span className="font-semibold">{formatMoney(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span>ფასდაკლება (₾):</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-20 text-right bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2 py-1 outline-none"
            />
          </div>

          {deliveryType === 'delivery' && (
            <div className="flex justify-between text-slate-300">
              <span>მიწოდების საფასური:</span>
              <span className="font-semibold">{formatMoney(delFee)}</span>
            </div>
          )}

          <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-extrabold text-white">
            <span>საბოლოო გადასახდელი:</span>
            <span className="text-xl text-emerald-400">{formatMoney(grandTotal)}</span>
          </div>
        </div>

        {/* Split Payments Section */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">გადახდის მეთოდი (Split Payment)</label>

          {payments.map((p, pIdx) => (
            <div key={pIdx} className="flex items-center gap-2">
              <select
                value={p.method}
                onChange={(e) => {
                  const updated = [...payments];
                  updated[pIdx].method = e.target.value as PaymentMethod;
                  setPayments(updated);
                }}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 outline-none"
              >
                <option value="cash">💵 ნაღდი</option>
                <option value="bog_card">💳 BOG (POS ბარათი)</option>
                <option value="tbc_card">💳 TBC (POS ბარათი)</option>
                <option value="tbc_transfer">🏦 TBC გადარიცხვა</option>
                <option value="bog_transfer">🏦 BOG გადარიცხვა</option>
                <option value="bank_transfer">🏦 სხვა ბანკი</option>
                <option value="debt">📝 დავალიანება (ნისია)</option>
              </select>

              <input
                type="number"
                value={p.amount}
                onChange={(e) => {
                  const updated = [...payments];
                  updated[pIdx].amount = parseFloat(e.target.value) || 0;
                  setPayments(updated);
                }}
                className="w-24 bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 outline-none"
              />

              {payments.length > 1 && (
                <button
                  onClick={() => setPayments(payments.filter((_, i) => i !== pIdx))}
                  className="p-2 text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setPayments([...payments, { method: 'bog_card', amount: 0 }])}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ გადახდის მეთოდის დამატება</span>
          </button>
        </div>

        {/* Cash Tendered & Change Due */}
        {payments.some((p) => p.method === 'cash') && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">მიღებული ნაღდი (₾):</span>
              <input
                type="number"
                value={tenderedCash}
                onChange={(e) => setTenderedCash(parseFloat(e.target.value) || 0)}
                placeholder="100"
                className="w-24 text-right bg-white border border-emerald-300 font-extrabold text-sm text-emerald-800 rounded-lg px-2 py-1 outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>დასაბრუნებელი ხურდა:</span>
              <span className="text-base text-emerald-700">{formatMoney(changeDue)}</span>
            </div>
          </div>
        )}

        {/* Checkout Buttons */}
        <div className="space-y-2 mt-auto">
          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>1. გადახდა / დასრულება (სრული გაყიდვა)</span>
              </>
            )}
          </button>

          <button
            onClick={handleCreateOrder}
            disabled={loading || cart.length === 0}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>2. შეკვეთაში გადატანა / შეკვეთის გაფორმება</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL: Add Customer Modal */}
      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onCreated={(c) => {
            setSelectedCustomer(c);
            onRefreshData();
            setShowAddCustomerModal(false);
          }}
        />
      )}

      {/* MODAL: Quick Add Product Modal */}
      {showAddProductModal && (
        <QuickAddProductModal
          categories={categories}
          units={units}
          onClose={() => setShowAddProductModal(false)}
          onCreated={(p) => {
            addToCart(p);
            onRefreshData();
            setShowAddProductModal(false);
          }}
        />
      )}

      {/* MODAL: Held Sales Modal */}
      {showHeldSalesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">შეჩერებული გაყიდვები</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {heldSales.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{s.holdNote}</div>
                    <div className="text-[10px] text-slate-500">{s.date.slice(0, 16).replace('T', ' ')}</div>
                  </div>
                  <button
                    onClick={() => handleResumeSale(s)}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    გახსნა
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowHeldSalesModal(false)}
              className="w-full py-2 bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
            >
              დახურვა
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline Component: Add Customer Modal
const AddCustomerModal: React.FC<{
  onClose: () => void;
  onCreated: (c: Customer) => void;
}> = ({ onClose, onCreated }) => {
  const [type, setType] = useState<'individual' | 'company'>('individual');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const c = await api.createCustomer({
        type,
        name,
        lastName: type === 'individual' ? lastName : undefined,
        phone,
        address,
        companyName: type === 'company' ? companyName : undefined,
        taxId: type === 'company' ? taxId : undefined
      });
      onCreated(c);
    } catch (e) {
      alert('შეცდომა კლიენტის შექმნისას');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900">ახალი კლიენტის დამატება</h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('individual')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
              type === 'individual' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-slate-50 border-slate-300'
            }`}
          >
            👤 ფიზიკური პირი
          </button>
          <button
            type="button"
            onClick={() => setType('company')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
              type === 'company' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-slate-50 border-slate-300'
            }`}
          >
            🏢 კომპანია
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {type === 'individual' ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="სახელი *"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="გვარი"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="კომპანიის სახელი *"
                required
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setName(e.target.value);
                }}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="საიდენტიფიკაციო კოდი (ს/კ)"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <input
            type="text"
            placeholder="ტელეფონი *"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="მისამართი"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              შენახვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Inline Component: Quick Add Product Modal
const QuickAddProductModal: React.FC<{
  categories: Category[];
  units: Unit[];
  onClose: () => void;
  onCreated: (p: Product) => void;
}> = ({ categories, units, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat_iron');
  const [unit, setUnit] = useState('მეტრი');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [initialQuantity, setInitialQuantity] = useState<number>(0);
  const [initialCostPrice, setInitialCostPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await api.createProduct({
        name,
        code,
        categoryId,
        unit,
        sellingPrice,
        initialQuantity,
        initialCostPrice
      });
      onCreated(p);
    } catch (e: any) {
      alert(e.message || 'შეცდომა პროდუქტის დამატებისას');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900">სწრაფი პროდუქტის დამატება</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="პროდუქტის დასახელება *"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="კოდი (მაგ: PIPE-4040-2) *"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono uppercase outline-none focus:ring-1 focus:ring-blue-500"
            />

            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none"
            >
              {units.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">გასაყიდი ფასი (₾) *</label>
              <input
                type="number"
                step="any"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">კატეგორია</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="text-[11px] font-bold text-slate-700">საწყისი მარაგი (არასავალდებულო)</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                placeholder="რაოდენობა"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold outline-none"
              />
              <input
                type="number"
                step="any"
                placeholder="ასაღები ფასი (₾)"
                value={initialCostPrice}
                onChange={(e) => setInitialCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              დამატება & კალათაში
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
