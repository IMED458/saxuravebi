import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  Building2,
  Wallet,
  DollarSign,
  BarChart3,
  BookOpen,
  Settings,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  FileText,
  History,
  RotateCcw,
  Tag,
  ArrowRightLeft,
  AlertTriangle,
  ClipboardList,
  UserCheck,
  ShieldCheck,
  ListFilter
} from 'lucide-react';
import { User } from '../types';

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
  user: User;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  children?: { id: string; label: string; icon?: any }[];
}

export const Sidebar: React.FC<Props> = ({ activePage, onNavigate, user }) => {
  const [openSection, setOpenSection] = useState<string | null>('sales');

  const menu: MenuItem[] = [
    { id: 'dashboard', label: 'მთავარი', icon: LayoutDashboard },
    {
      id: 'sales',
      label: 'გაყიდვები / POS',
      icon: ShoppingCart,
      children: [
        { id: 'pos', label: 'ახალი გაყიდვა / POS', icon: PlusCircle },
        { id: 'sales_history', label: 'გაყიდვების ისტორია', icon: History },
        { id: 'invoices', label: 'ინვოისები', icon: FileText },
        { id: 'orders', label: 'შეკვეთები', icon: ClipboardList },
        { id: 'quotes', label: 'ფასის შეთავაზებები', icon: Tag },
        { id: 'held_sales', label: 'შეჩერებული გაყიდვები', icon: ListFilter },
        { id: 'returns', label: 'დაბრუნებები', icon: RotateCcw }
      ]
    },
    {
      id: 'products',
      label: 'პროდუქტები',
      icon: Package,
      children: [
        { id: 'products_list', label: 'ყველა პროდუქტი' },
        { id: 'product_add', label: 'ახალი პროდუქტი' },
        { id: 'categories', label: 'კატეგორიები' },
        { id: 'price_management', label: 'ფასების მართვა' }
      ]
    },
    {
      id: 'inventory',
      label: 'მარაგი',
      icon: Boxes,
      children: [
        { id: 'stock_list', label: 'მიმდინარე მარაგი' },
        { id: 'stock_intake', label: 'ახალი შემოსვლა' },
        { id: 'stock_movements', label: 'მარაგის მოძრაობა' },
        { id: 'stocktakes', label: 'ინვენტარიზაცია' },
        { id: 'stock_transfers', label: 'საწყობებს შორის გადატანა' },
        { id: 'low_stock', label: 'დაბალი მარაგი', icon: AlertTriangle }
      ]
    },
    {
      id: 'purchases',
      label: 'შესყიდვები',
      icon: Truck,
      children: [
        { id: 'purchase_new', label: 'ახალი შესყიდვა' },
        { id: 'purchases_history', label: 'შესყიდვების ისტორია' }
      ]
    },
    {
      id: 'suppliers',
      label: 'მომწოდებლები',
      icon: Building2,
      children: [
        { id: 'suppliers_list', label: 'ყველა მომწოდებელი' },
        { id: 'supplier_debts', label: 'დავალიანებები' }
      ]
    },
    {
      id: 'customers',
      label: 'კლიენტები',
      icon: Users,
      children: [
        { id: 'customers_list', label: 'ყველა კლიენტი' },
        { id: 'customer_debts', label: 'დავალიანებები' }
      ]
    },
    {
      id: 'cash',
      label: 'სალარო',
      icon: Wallet,
      children: [
        { id: 'cash_out', label: 'თანხის გაცემა / ხარჯი' },
        { id: 'cash_in', label: 'თანხის შეტანა' }
      ]
    },
    {
      id: 'finances',
      label: 'ფინანსები',
      icon: DollarSign,
      children: [
        { id: 'transactions', label: 'ტრანზაქციების ჟურნალი' },
        { id: 'expenses_list', label: 'ხარჯები' }
      ]
    },
    {
      id: 'reports',
      label: 'რეპორტები',
      icon: BarChart3,
      children: [
        { id: 'report_sales', label: 'გაყიდვების რეპორტი' },
        { id: 'report_profit', label: 'მოგების რეპორტი' },
        { id: 'report_stock', label: 'ნაშთების რეპორტი' }
      ]
    },
    { id: 'accounting', label: 'ბუღალტერია', icon: BookOpen },
    {
      id: 'admin',
      label: 'ადმინისტრაცია',
      icon: Settings,
      children: [
        { id: 'users_admin', label: 'მომხმარებლები & უფლებები' },
        { id: 'audit_logs', label: 'Audit Log' },
        { id: 'settings', label: 'პარამეტრები & ბექაფი' }
      ]
    }
  ];

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto">
      <div className="p-3 space-y-1">
        {menu.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openSection === item.id;
          const isDirectActive = activePage === item.id;

          return (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => {
                  if (hasChildren) {
                    toggleSection(item.id);
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                  isDirectActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isDirectActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {hasChildren && (
                  <div>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                )}
              </button>

              {/* Submenu Children */}
              {hasChildren && isOpen && (
                <div className="pl-4 border-l border-slate-800 ml-3 space-y-1 py-1">
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = activePage === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                          isChildActive
                            ? 'bg-blue-500/10 text-blue-400 font-bold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        {ChildIcon && <ChildIcon className="w-3.5 h-3.5" />}
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
