import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Trash2,
  User as UserIcon,
  UserPlus,
  Truck,
  Printer,
  PauseCircle,
  PlayCircle,
  PackagePlus,
  AlertCircle,
  FileText,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  X,
  ArrowLeft,
  Delete,
  ImageIcon,
  ChevronUp
} from 'lucide-react';
import { Product, Customer, Sale, User, PaymentMethod, Category, Unit, Order } from '../types';
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
  onOrderCompleted?: (order: Order) => void;
  onRefreshData: () => void;
}

export const POSView: React.FC<Props> = ({
  user,
  products,
  customers,
  categories,
  units,
  onSaleCompleted,
  onOrderCompleted,
  onRefreshData
}) => {
  // Selected Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [custQuery, setCustQuery] = useState('');
  const [custOpen, setCustOpen] = useState(false);

  const custDisplay = (c: Customer) =>
    c.type === 'company' ? c.companyName || c.name : `${c.name} ${c.lastName || ''}`.trim();

  // Keep the search box text in sync with the chosen customer (unless actively typing).
  useEffect(() => {
    if (!custOpen) setCustQuery(selectedCustomer ? custDisplay(selectedCustomer) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  const customerResults = customers
    .filter((c) => {
      const q = custQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.lastName || '').toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.taxId || '').includes(q)
      );
    })
    .slice(0, 40);

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

  // OPTIMO-style UI state
  const [productTab, setProductTab] = useState<'main' | 'categories' | 'suppliers'>('main');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [numMode, setNumMode] = useState<'qty' | 'discount' | 'price'>('qty');
  const [numBuffer, setNumBuffer] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);

  // Payment screen state
  const [cashInput, setCashInput] = useState<string>('');
  const [printReceipt, setPrintReceipt] = useState(true);
  const [bankMethod, setBankMethod] = useState<PaymentMethod | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

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
    if (newQty < 0 || isNaN(newQty)) return;
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

  // Handle Checkout / Invoice Generation. Customer is optional (anonymous sale).
  const handleCheckout = async (paymentsArg?: { method: PaymentMethod; amount: number }[]) => {
    setError('');

    if (cart.length === 0) {
      setError('კალათა ცარიელია, დაამატეთ პროდუქტები.');
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        customerId: selectedCustomer?.id,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          sellingPrice: i.customPrice
        })),
        discount,
        deliveryFee: delFee,
        deliveryType,
        deliveryDetails: deliveryType === 'delivery' ? deliveryDetails : undefined,
        payments: paymentsArg || payments,
        actorId: user.id,
        actorName: `${user.firstName} ${user.lastName}`
      };

      const sale = await api.createSale(saleData);
      onSaleCompleted(sale);
      onRefreshData();

      // Reset
      resetSaleState();
    } catch (err: any) {
      setError(err.message || 'გაყიდვის დასრულება ვერ განხორციელდა');
    } finally {
      setLoading(false);
    }
  };

  const resetSaleState = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setPayments([{ method: 'cash', amount: 0 }]);
    setTenderedCash(0);
    setShowPayment(false);
    setCashInput('');
    setBankMethod(null);
    setActiveIndex(null);
    setNumBuffer('');
  };

  // Assemble payments from the payment screen (cash + optional bank) and finalize.
  const confirmPayment = () => {
    const cash = parseFloat(cashInput) || 0;
    const cashPortion = Math.min(cash, grandTotal);
    const remaining = Math.round((grandTotal - cashPortion) * 100) / 100;
    const assembled: { method: PaymentMethod; amount: number }[] = [];
    if (cashPortion > 0) assembled.push({ method: 'cash', amount: cashPortion });
    if (remaining > 0) assembled.push({ method: bankMethod || 'debt', amount: remaining });
    if (assembled.length === 0) assembled.push({ method: 'cash', amount: 0 });
    setTenderedCash(cash);
    handleCheckout(assembled);
  };

  const pushCash = (d: string) => {
    if (d === 'back') setCashInput((s) => s.slice(0, -1));
    else if (d === '.') setCashInput((s) => (s.includes('.') ? s : (s || '0') + '.'));
    else setCashInput((s) => s + d);
  };
  const addCash = (n: number) => setCashInput((s) => String(Math.round(((parseFloat(s) || 0) + n) * 100) / 100));

  // Numpad on the main screen edits the selected cart line or the global discount.
  const applyNumpad = (digit: string) => {
    let buf = numBuffer;
    if (digit === 'C') buf = '';
    else if (digit === 'back') buf = buf.slice(0, -1);
    else if (digit === '.') buf = buf.includes('.') ? buf : buf + '.';
    else buf = buf + digit;
    setNumBuffer(buf);
    const val = parseFloat(buf) || 0;
    if (numMode === 'discount') {
      setDiscount(val);
    } else if (activeIndex !== null && cart[activeIndex]) {
      if (numMode === 'qty' && val > 0) updateQuantity(activeIndex, val);
      if (numMode === 'price') updateCustomPrice(activeIndex, val);
    }
  };

  // When switching the numpad target, seed the buffer with the current value.
  const setNumTarget = (mode: 'qty' | 'discount' | 'price') => {
    setNumMode(mode);
    if (mode === 'discount') setNumBuffer(discount ? String(discount) : '');
    else if (activeIndex !== null && cart[activeIndex]) {
      setNumBuffer(String(mode === 'qty' ? cart[activeIndex].quantity : cart[activeIndex].customPrice));
    } else setNumBuffer('');
  };

  // Handle Order Creation (Stock NOT deducted). Payment is explicit (unpaid by default).
  const handleCreateOrder = async (paidAmount: number, method: PaymentMethod) => {
    if (cart.length === 0) {
      setError('კალათა ცარიელია, დაამატეთ პროდუქტები.');
      return;
    }

    setLoading(true);
    try {
      const custName = selectedCustomer
        ? selectedCustomer.type === 'company'
          ? selectedCustomer.companyName || selectedCustomer.name
          : `${selectedCustomer.name} ${selectedCustomer.lastName || ''}`.trim()
        : 'ანონიმური კლიენტი';

      const initialPaid = paidAmount;

      const orderData = {
        customerId: selectedCustomer?.id,
        customerName: custName,
        customerPhone: selectedCustomer?.phone,
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
        paymentMethod: method,
        deliveryAddress: deliveryType === 'delivery' ? deliveryDetails.address : undefined,
        recipientName: deliveryType === 'delivery' ? deliveryDetails.recipientName : undefined,
        recipientPhone: deliveryType === 'delivery' ? deliveryDetails.recipientPhone : undefined,
        comment: deliveryDetails.comment || '',
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`
      };

      const createdOrder = await api.createOrder(orderData);
      onRefreshData();
      setShowOrderModal(false);

      // Open the print panel for the order (same behaviour as a completed sale).
      if (onOrderCompleted) onOrderCompleted(createdOrder);

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

  const activeProducts = products.filter((p) => p.status === 'active');
  const gridProducts = activeProducts.filter((p) => {
    const q = productSearch.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
    return matchSearch && matchCat;
  });

  const custName = selectedCustomer
    ? selectedCustomer.type === 'company'
      ? selectedCustomer.companyName || selectedCustomer.name
      : `${selectedCustomer.name} ${selectedCustomer.lastName || ''}`.trim()
    : '';

  const cashNum = parseFloat(cashInput) || 0;
  const changeAmount = Math.round((cashNum - grandTotal) * 100) / 100;

  const digitBtn =
    'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg rounded-xl flex items-center justify-center transition cursor-pointer select-none';

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6rem)] relative">
      {/* ============================= LEFT: CART + KEYPAD ============================= */}
      <div className="w-full lg:w-[40%] lg:min-w-[380px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Customer bar */}
        <div className="p-3 border-b border-slate-200 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={custQuery}
              onFocus={() => { setCustOpen(true); setCustQuery(''); }}
              onChange={(e) => { setCustQuery(e.target.value); setCustOpen(true); }}
              onBlur={() => setTimeout(() => setCustOpen(false), 150)}
              placeholder="👤 კლიენტის ძებნა (სახელი / ტელეფონი) — ან ანონიმური"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
            {custOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 max-h-72 overflow-y-auto">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setSelectedCustomer(null); setCustOpen(false); setCustQuery(''); }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 border-b border-slate-100 ${!selectedCustomer ? 'text-blue-600' : 'text-slate-600'}`}
                >
                  👤 კლიენტის გარეშე (ანონიმური)
                </button>
                {customerResults.length === 0 ? (
                  <div className="px-3 py-3 text-[11px] text-slate-400">კლიენტი ვერ მოიძებნა — გამოიყენეთ „+ ახალი კლიენტი"</div>
                ) : (
                  customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustQuery(custDisplay(c));
                        setCustOpen(false);
                        if (c.address) {
                          setDeliveryDetails((prev) => ({
                            ...prev,
                            address: c.address || '',
                            recipientName: custDisplay(c),
                            recipientPhone: c.phone
                          }));
                        }
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-0 flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-slate-900 truncate">
                          {c.type === 'company' ? `🏢 ${c.companyName || c.name}` : `👤 ${c.name} ${c.lastName || ''}`}
                        </span>
                        <span className="block text-[10px] text-slate-500">{c.phone}{c.totalDebt > 0 ? ` · ვალი: ${formatMoney(c.totalDebt)}` : ''}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition cursor-pointer"
            title="ახალი კლიენტი"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Cart list */}
        <div className="flex-1 overflow-y-auto p-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
              <div className="w-16 h-16 rounded-2xl border-2 border-slate-200 flex items-center justify-center">
                <FileText className="w-8 h-8 stroke-[1.5]" />
              </div>
              <p className="text-sm font-semibold text-slate-400">კალათა ცარიელია</p>
              <p className="text-[11px] text-slate-400">აირჩიეთ პროდუქტი მარჯვენა მხრიდან</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {cart.map((item, idx) => {
                const isActive = activeIndex === idx;
                const isModified = item.customPrice !== item.product.sellingPrice;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveIndex(idx);
                      setNumMode('qty');
                      setNumBuffer(String(item.quantity));
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition ${
                      isActive ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">{item.product.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.product.code}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCart(idx);
                          if (activeIndex === idx) setActiveIndex(null);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">რაოდ.</span>
                          <div className="flex items-center gap-1">
                            <EditableNumber
                              value={item.quantity}
                              onChange={(v) => updateQuantity(idx, v)}
                              placeholder="რაოდ."
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 py-1 px-1.5 text-center text-xs font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="text-[10px] text-slate-500 font-semibold">{item.product.unit}</span>
                          </div>
                        </div>
                        <span className="text-slate-300 mt-3">×</span>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">ფასი (₾)</span>
                          <EditableNumber
                            value={item.customPrice}
                            onChange={(v) => updateCustomPrice(idx, v)}
                            placeholder="ფასი"
                            onClick={(e) => e.stopPropagation()}
                            className={`w-20 py-1 px-1.5 text-center text-xs font-bold bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                              isModified ? 'border-amber-500 text-amber-700 bg-amber-50' : 'border-slate-300 text-slate-900'
                            }`}
                            title={isModified ? `სტანდარტული ფასი: ${formatMoney(item.product.sellingPrice)}` : ''}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">ჯამი</span>
                        <span className="text-sm font-extrabold text-blue-700">{formatMoney(item.lineTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-2 mb-1 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Secondary actions */}
        <div className="px-2 pt-1 flex items-center gap-1.5">
          <button
            onClick={handleHoldSale}
            disabled={cart.length === 0}
            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <PauseCircle className="w-3.5 h-3.5" /> შეჩერება
          </button>
          {heldSales.length > 0 && (
            <button
              onClick={() => setShowHeldSalesModal(true)}
              className="flex-1 py-1.5 bg-amber-100 text-amber-800 font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5" /> ({heldSales.length})
            </button>
          )}
          <button
            onClick={() => {
              if (cart.length === 0) { setError('კალათა ცარიელია'); return; }
              setError('');
              setShowOrderModal(true);
            }}
            disabled={loading || cart.length === 0}
            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> შეკვეთა
          </button>
        </div>

        {/* Totals + checkout (physical keyboard only — no on-screen keypad) */}
        <div className="p-2.5 border-t border-slate-200 mt-1 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold">ფასდაკლება (₾):</span>
            <EditableNumber
              value={discount}
              onChange={setDiscount}
              placeholder="0"
              className="w-28 text-right bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-3 py-2.5">
            <span className="text-xs text-slate-300 font-semibold">სულ გადასახდელი:</span>
            <span className="text-xl font-extrabold text-emerald-400">{formatMoney(grandTotal)}</span>
          </div>
          <button
            onClick={() => {
              if (cart.length === 0) { setError('კალათა ცარიელია'); return; }
              setError('');
              setShowPayment(true);
              setCashInput('');
              setBankMethod(null);
            }}
            disabled={loading || cart.length === 0}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm transition cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            გადახდა / გაყიდვის დასრულება
          </button>
        </div>
      </div>

      {/* ============================= RIGHT: PRODUCT GRID ============================= */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-slate-200 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="პროდუქტის ძიება..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs + view toggle */}
        <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {([['main', 'მთავარი'], ['categories', 'კატეგორიები'], ['suppliers', 'მომწოდებლები']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setProductTab(id)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${productTab === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition cursor-pointer ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition cursor-pointer ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category chips */}
        {productTab === 'categories' && (
          <div className="px-3 py-2 border-b border-slate-200 flex flex-wrap gap-1.5">
            <button onClick={() => setCategoryFilter('all')} className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${categoryFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>ყველა</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setCategoryFilter(c.id)} className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${categoryFilter === c.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{c.name}</button>
            ))}
          </div>
        )}

        {/* Grid / list */}
        <div className="flex-1 overflow-y-auto p-3">
          {gridProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Search className="w-10 h-10 text-slate-300" />
              <p className="text-xs">პროდუქტი ვერ მოიძებნა</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {gridProducts.map((p) => {
                const out = p.currentStock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-md transition cursor-pointer group"
                  >
                    <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-slate-300" />
                      )}
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-white/90 backdrop-blur text-slate-900 text-xs font-extrabold rounded-lg shadow-sm">
                        {formatMoney(p.sellingPrice)}
                      </span>
                      <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md ${out ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {formatNum(p.currentStock)}
                      </span>
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-blue-600">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.code}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {gridProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full text-left bg-white border border-slate-200 rounded-xl p-2.5 flex items-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-lg" /> : <ImageIcon className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.code} · {formatNum(p.currentStock)} {p.unit}</div>
                  </div>
                  <div className="text-sm font-extrabold text-blue-700">{formatMoney(p.sellingPrice)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================= PAYMENT SCREEN ============================= */}
      {showPayment && (
        <div className="fixed inset-0 z-40 bg-slate-50 flex flex-col">
          <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
            <button onClick={() => setShowPayment(false)} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h2 className="text-sm font-bold text-slate-900">გადახდა{custName ? ` — ${custName}` : ''}</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto">
            <div className="grid grid-cols-2 gap-6 text-center mb-6">
              <div>
                <div className="text-xs text-slate-500 font-semibold">სულ გადასახდელი (₾)</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">{formatMoney(grandTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold">ხურდა (₾)</div>
                <div className={`text-3xl font-extrabold mt-1 ${changeAmount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMoney(changeAmount)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: cash + banks */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ნაღდი ანგარიშსწორება</label>
                  <div className="flex items-stretch border-2 border-blue-500 rounded-xl overflow-hidden">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cashInput}
                      onChange={(e) => setCashInput(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="შეიყვანეთ თანხა"
                      autoFocus
                      className="flex-1 px-4 py-3 text-lg font-bold text-slate-900 outline-none"
                    />
                    <button
                      onClick={() => setCashInput(String(grandTotal))}
                      className="px-4 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer whitespace-nowrap"
                    >
                      სრული თანხა
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setPrintReceipt((v) => !v)}
                  className="w-full flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3 cursor-pointer"
                >
                  <span className="text-sm font-semibold text-slate-800">ქვითრის ამობეჭდვა</span>
                  <span className={`w-11 h-6 rounded-full transition relative ${printReceipt ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${printReceipt ? 'left-[22px]' : 'left-0.5'}`} />
                  </span>
                </button>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">უნაღდო ანგარიშსწორება</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([['bog_card', 'BOG ბარათი'], ['tbc_card', 'TBC ბარათი'], ['bog_transfer', 'BOG გადარიცხვა'], ['tbc_transfer', 'TBC გადარიცხვა'], ['bank_transfer', 'სხვა ბანკი'], ['debt', 'დავალიანება']] as const).map(([m, label]) => (
                      <button
                        key={m}
                        onClick={() => setBankMethod(bankMethod === m ? null : m)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${bankMethod === m ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: quick cash tender buttons (no on-screen keypad) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">სწრაფი თანხა</label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 20, 50, 100, 200, 500].map((n) => (
                    <button key={n} onClick={() => addCash(n)} className="py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-base font-bold cursor-pointer">+{n}</button>
                  ))}
                </div>
                <button onClick={() => setCashInput('')} className="w-full mt-2 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-bold cursor-pointer">გასუფთავება</button>
              </div>
            </div>
          </div>

          <div className="bg-white border-t border-slate-200 p-4 flex items-center gap-3 max-w-5xl w-full mx-auto">
            <button
              onClick={() => { setPayments([...payments, { method: 'bog_card', amount: 0 }]); }}
              className="px-5 py-3.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              ქვითრის გაყოფა
            </button>
            <button
              onClick={confirmPayment}
              disabled={loading}
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>დადასტურება <span>»</span></>}
            </button>
          </div>
        </div>
      )}

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
                <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{s.holdNote}</div>
                    <div className="text-[10px] text-slate-500">{s.date.slice(0, 16).replace('T', ' ')}</div>
                  </div>
                  <button onClick={() => handleResumeSale(s)} className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg text-xs cursor-pointer">გახსნა</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowHeldSalesModal(false)} className="w-full py-2 bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer">დახურვა</button>
          </div>
        </div>
      )}

      {/* MODAL: Order payment-status selection (#9-11) */}
      {showOrderModal && (
        <OrderPaymentModal
          grandTotal={grandTotal}
          loading={loading}
          onClose={() => setShowOrderModal(false)}
          onConfirm={(paid, method) => handleCreateOrder(paid, method)}
        />
      )}
    </div>
  );
};

// Inline Component: Order Payment Status Modal
const OrderPaymentModal: React.FC<{
  grandTotal: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: (paidAmount: number, method: PaymentMethod) => void;
}> = ({ grandTotal, loading, onClose, onConfirm }) => {
  const [status, setStatus] = useState<'unpaid' | 'partial' | 'paid'>('unpaid');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('cash');

  const paid = status === 'unpaid' ? 0 : status === 'paid' ? grandTotal : Math.min(amount, grandTotal);
  const remaining = Math.max(0, grandTotal - paid);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">შეკვეთის გაფორმება — გადახდის სტატუსი</h3>

        <div className="bg-slate-900 text-white rounded-xl p-3 space-y-1">
          <div className="flex justify-between"><span className="text-slate-300">შეკვეთის სრული თანხა:</span><span className="font-bold">{formatMoney(grandTotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-300">გადახდილი:</span><span className="font-bold text-emerald-400">{formatMoney(paid)}</span></div>
          <div className="flex justify-between"><span className="text-slate-300">დარჩენილი:</span><span className="font-bold text-amber-400">{formatMoney(remaining)}</span></div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">გადახდის მდგომარეობა *</label>
          <div className="grid grid-cols-3 gap-2">
            {([['unpaid', 'გადაუხდელი'], ['partial', 'ნაწილობრივ'], ['paid', 'სრულად']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => { setStatus(id); if (id === 'paid') setAmount(grandTotal); if (id === 'unpaid') setAmount(0); }}
                className={`py-2 rounded-xl font-bold border transition cursor-pointer ${status === id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {status !== 'unpaid' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ახლა გადასახდელი (₾)</label>
              <EditableNumber
                value={amount}
                onChange={(v) => setAmount(Math.min(v, grandTotal))}
                placeholder="შეიყვანეთ თანხა"
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">გადახდის მეთოდი</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full border border-slate-300 rounded-xl p-2.5 outline-none">
                <option value="cash">ნაღდი</option>
                <option value="tbc_card">TBC</option>
                <option value="bog_card">BOG</option>
                <option value="tbc_transfer">TBC გადარიცხვა</option>
                <option value="bog_transfer">BOG გადარიცხვა</option>
                <option value="bank_transfer">სხვა გადარიცხვა</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer">გაუქმება</button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm(paid, method)}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-60"
          >
            {loading ? 'ინახება...' : 'შეკვეთის შენახვა'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Reusable numeric input that starts EMPTY and can be fully cleared (no auto-0).
const EditableNumber: React.FC<{
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ value, onChange, placeholder, className, title, onClick }) => {
  const [str, setStr] = useState<string>(value ? String(value) : '');

  useEffect(() => {
    const cur = str === '' ? NaN : parseFloat(str);
    if (cur !== value) setStr(value ? String(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={str}
      title={title}
      placeholder={placeholder}
      onClick={onClick}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        setStr(raw);
        const n = raw === '' ? 0 : parseFloat(raw);
        onChange(isNaN(n) ? 0 : n);
      }}
      className={className}
    />
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
