import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  User as UserIcon,
  LogOut,
  Clock,
  Package,
  Users,
  FileText,
  Truck,
  X
} from 'lucide-react';
import { User, Shift, Product, Customer, Sale, Supplier } from '../types';
import { api } from '../lib/api';
import { formatMoney } from '../lib/formatters';

interface Props {
  user: User;
  currentShift: Shift | null;
  onLogout: () => void;
  onOpenShiftModal: () => void;
  onSelectProduct: (p: Product) => void;
  onSelectCustomer: (c: Customer) => void;
  onSelectSale: (s: Sale) => void;
  onNavigate: (page: string) => void;
}

export const Header: React.FC<Props> = ({
  user,
  currentShift,
  onLogout,
  onOpenShiftModal,
  onSelectProduct,
  onSelectCustomer,
  onSelectSale,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    products: Product[];
    customers: Customer[];
    sales: Sale[];
    suppliers: Supplier[];
  }>({ products: [], customers: [], sales: [], suppliers: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults({ products: [], customers: [], sales: [], suppliers: [] });
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);
    try {
      const res = await api.search(val);
      setSearchResults(res);
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  const hasResults =
    searchResults.products.length > 0 ||
    searchResults.customers.length > 0 ||
    searchResults.sales.length > 0 ||
    searchResults.suppliers.length > 0;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="w-full px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            POS
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-sm tracking-wide">სამშენებლო POS</h1>
            <p className="text-xs text-slate-400">მარაგები & ფინანსები</p>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-xl relative" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="გლობალური ძებნა (პროდუქტი, კოდი, კლიენტი, ინვოისი)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto p-2">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-slate-400">ძებნა...</div>
              ) : !hasResults ? (
                <div className="p-4 text-center text-xs text-slate-400">შედეგი ვერ მოიძებნა</div>
              ) : (
                <div className="space-y-3">
                  {/* Products */}
                  {searchResults.products.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-blue-400" />
                        პროდუქტები
                      </div>
                      <div className="space-y-1">
                        {searchResults.products.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setShowDropdown(false);
                              onSelectProduct(p);
                            }}
                            className="px-3 py-2 hover:bg-slate-700/60 rounded-xl cursor-pointer flex items-center justify-between transition"
                          >
                            <div>
                              <div className="text-xs font-medium text-white">{p.name}</div>
                              <div className="text-[10px] text-slate-400">
                                კოდი: <span className="font-mono text-blue-300">{p.code}</span> | მარაგი: {p.currentStock} {p.unit}
                              </div>
                            </div>
                            <div className="text-xs font-bold text-emerald-400">{formatMoney(p.sellingPrice)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customers */}
                  {searchResults.customers.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-emerald-400" />
                        კლიენტები
                      </div>
                      <div className="space-y-1">
                        {searchResults.customers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setShowDropdown(false);
                              onSelectCustomer(c);
                            }}
                            className="px-3 py-2 hover:bg-slate-700/60 rounded-xl cursor-pointer flex items-center justify-between transition"
                          >
                            <div>
                              <div className="text-xs font-medium text-white">
                                {c.type === 'company' ? c.companyName || c.name : `${c.name} ${c.lastName || ''}`}
                              </div>
                              <div className="text-[10px] text-slate-400">ტელ: {c.phone}</div>
                            </div>
                            {c.totalDebt > 0 && (
                              <div className="text-xs font-bold text-amber-400">ვალი: {formatMoney(c.totalDebt)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sales */}
                  {searchResults.sales.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-purple-400" />
                        ინვოისები
                      </div>
                      <div className="space-y-1">
                        {searchResults.sales.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setShowDropdown(false);
                              onSelectSale(s);
                            }}
                            className="px-3 py-2 hover:bg-slate-700/60 rounded-xl cursor-pointer flex items-center justify-between transition"
                          >
                            <div>
                              <div className="text-xs font-mono font-bold text-blue-300">{s.invoiceNo}</div>
                              <div className="text-[10px] text-slate-400">კლიენტი: {s.customerName}</div>
                            </div>
                            <div className="text-xs font-bold text-white">{formatMoney(s.grandTotal)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: User Account */}
        <div className="flex items-center gap-3">
          {/* User Profile Info */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
              {user.firstName[0]}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold leading-none text-slate-100">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{user.position || user.role}</div>
            </div>
            <button
              onClick={onLogout}
              title="სისტემიდან გამოსვლა"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition cursor-pointer ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
