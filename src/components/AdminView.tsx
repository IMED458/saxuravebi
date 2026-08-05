import React, { useState, useEffect } from 'react';
import { User, AuditLog, Settings, UserRole, UserPermission } from '../types';
import { api } from '../lib/api';
import { formatDate } from '../lib/formatters';

interface Props {
  user: User;
  users: User[];
  settings: Settings;
  onRefreshData: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'სუპერ ადმინისტრატორი',
  owner: 'მფლობელი',
  director: 'დირექტორი',
  administrator: 'ადმინისტრატორი',
  manager: 'მენეჯერი',
  cashier: 'მოლარე',
  head_cashier: 'უფროსი მოლარე',
  warehouse: 'საწყობის თანამშრომელი',
  purchasing: 'შესყიდვების თანამშრომელი',
  accountant: 'ბუღალტერი',
  view_only: 'მხოლოდ ნახვის უფლება'
};

const ALL_PERMISSIONS: { id: UserPermission; label: string }[] = [
  { id: 'sale', label: 'გაყიდვა' },
  { id: 'product_add', label: 'პროდუქტის დამატება' },
  { id: 'product_edit', label: 'პროდუქტის რედაქტირება' },
  { id: 'price_change', label: 'ფასის შეცვლა' },
  { id: 'any_price_sale', label: 'გაყიდვაზე ფასის შეცვლა' },
  { id: 'discount', label: 'ფასდაკლება' },
  { id: 'return', label: 'დაბრუნება' },
  { id: 'sale_cancel', label: 'გაყიდვის გაუქმება' },
  { id: 'invoice_edit', label: 'ინვოისის რედაქტირება' },
  { id: 'invoice_reprint', label: 'ინვოისის ბეჭდვა' },
  { id: 'purchase_add', label: 'შესყიდვის დამატება' },
  { id: 'stock_add', label: 'მარაგის დამატება' },
  { id: 'stock_adjust', label: 'მარაგის კორექტირება' },
  { id: 'view_cost_price', label: 'ასაღები ფასის ნახვა' },
  { id: 'view_profit', label: 'მოგების ნახვა' },
  { id: 'view_full_stats', label: 'სრული სტატისტიკა' },
  { id: 'view_accounting', label: 'ბუღალტერიის ნახვა' },
  { id: 'user_create', label: 'მომხმარებლების მართვა' },
  { id: 'day_close', label: 'დღის დახურვა' }
];

const ALL_PERM_IDS = ALL_PERMISSIONS.map((p) => p.id);

function defaultPermsForRole(role: UserRole): UserPermission[] {
  switch (role) {
    case 'super_admin':
    case 'owner':
    case 'director':
    case 'administrator':
      return [...ALL_PERM_IDS];
    case 'manager':
      return ['sale', 'product_add', 'product_edit', 'price_change', 'any_price_sale', 'discount', 'return', 'stock_add', 'stock_adjust', 'view_cost_price', 'view_profit', 'invoice_reprint'];
    case 'head_cashier':
      return ['sale', 'discount', 'any_price_sale', 'return', 'invoice_reprint', 'day_close'];
    case 'cashier':
      return ['sale', 'discount', 'invoice_reprint', 'day_close'];
    case 'warehouse':
      return ['stock_add', 'stock_adjust', 'product_add'];
    case 'purchasing':
      return ['purchase_add', 'stock_add', 'view_cost_price'];
    case 'accountant':
      return ['view_accounting', 'view_profit', 'view_cost_price', 'view_full_stats'];
    case 'view_only':
    default:
      return [];
  }
}

export const AdminView: React.FC<Props> = ({ user, users, settings, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'settings'>('users');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [settingsForm, setSettingsForm] = useState<Settings>(settings);

  const actor = { actorId: user.id, actorName: `${user.firstName} ${user.lastName}` };

  useEffect(() => {
    api.getAuditLogs().then(setAuditLogs).catch(() => {});
  }, [users]);

  useEffect(() => setSettingsForm(settings), [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings(settingsForm);
      alert('პარამეტრები წარმატებით შენახულია');
      onRefreshData();
    } catch {
      alert('შეცდომა პარამეტრების შენახვისას');
    }
  };

  const input = 'w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:border-blue-500';
  const label = 'block text-[10px] font-bold text-slate-500 mb-0.5';

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">ადმინისტრირება & პარამეტრები</h1>
        <p className="text-xs text-slate-500 mt-0.5">მომხმარებლები, უფლებები, Audit Log და პარამეტრები</p>
      </div>

      <div className="flex border-b border-slate-200 bg-white px-4 rounded-2xl shadow-sm text-xs font-bold">
        <button onClick={() => setActiveTab('users')} className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
          👤 მომხმარებლები ({users.length})
        </button>
        <button onClick={() => setActiveTab('audit')} className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
          🛡️ Audit Log ({auditLogs.length})
        </button>
        <button onClick={() => setActiveTab('settings')} className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
          ⚙️ სისტემის პარამეტრები
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">მომხმარებლების სია</h3>
            <button onClick={() => setShowAddUserModal(true)} className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer">
              + ახალი მომხმარებელი
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-3">Username</th>
                  <th className="p-3">სახელი / გვარი</th>
                  <th className="p-3">როლი</th>
                  <th className="p-3 text-center">სტატუსი</th>
                  <th className="p-3 text-right">მოქმედება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{u.username}</td>
                    <td className="p-3 font-bold text-slate-900">{u.firstName} {u.lastName}</td>
                    <td className="p-3 text-slate-600 font-semibold">{ROLE_LABELS[u.role] || u.role}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {u.status === 'active' ? 'აქტიური' : 'გათიშული'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => setEditingUser(u)} className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer">
                        ✏️ რედაქტირება
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-3">თარიღი</th>
                <th className="p-3">მომხმარებელი</th>
                <th className="p-3">მოქმედება</th>
                <th className="p-3">დეტალები</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                  <td className="p-3 font-bold text-slate-900">{log.userName}</td>
                  <td className="p-3 font-bold text-blue-700">{log.action}</td>
                  <td className="p-3 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-xl text-xs">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">მაღაზიის პარამეტრები</h3>

          <div>
            <label className={label}>კომპანიის დასახელება</label>
            <input type="text" value={settingsForm.companyName} onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })} className={`${input} font-bold`} />
          </div>
          <div>
            <label className={label}>საიდენტიფიკაციო კოდი (ს/კ)</label>
            <input type="text" value={settingsForm.taxId} onChange={(e) => setSettingsForm({ ...settingsForm, taxId: e.target.value })} className={`${input} font-mono`} />
          </div>
          <div>
            <label className={label}>მისამართი</label>
            <input type="text" value={settingsForm.address} onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>ტელეფონი</label>
              <input type="text" value={settingsForm.phone} onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })} className={input} />
            </div>
            <div>
              <label className={label}>ელფოსტა</label>
              <input type="text" value={settingsForm.email} onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })} className={input} />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="font-bold text-slate-800 text-xs mb-2">საბანკო რეკვიზიტები (გადადის ინვოისზე)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>ბანკის დასახელება</label>
                <input type="text" value={settingsForm.bankName || ''} onChange={(e) => setSettingsForm({ ...settingsForm, bankName: e.target.value })} placeholder="მაგ: თიბისი ბანკი" className={input} />
              </div>
              <div>
                <label className={label}>ანგარიშის ნომერი (IBAN)</label>
                <input type="text" value={settingsForm.bankAccount || ''} onChange={(e) => setSettingsForm({ ...settingsForm, bankAccount: e.target.value })} placeholder="GE00XX0000000000000000" className={`${input} font-mono`} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 flex items-center gap-2">
            <input id="negstock" type="checkbox" checked={settingsForm.allowNegativeStock} onChange={(e) => setSettingsForm({ ...settingsForm, allowNegativeStock: e.target.checked })} className="w-4 h-4" />
            <label htmlFor="negstock" className="text-xs font-semibold text-slate-700">მინუს მარაგის დაშვება</label>
          </div>

          <div className="pt-2">
            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer">
              პარამეტრების შენახვა
            </button>
          </div>
        </form>
      )}

      {showAddUserModal && (
        <UserFormModal
          actor={actor}
          onClose={() => setShowAddUserModal(false)}
          onSaved={() => { onRefreshData(); setShowAddUserModal(false); }}
        />
      )}
      {editingUser && (
        <UserFormModal
          actor={actor}
          editUser={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { onRefreshData(); setEditingUser(null); }}
        />
      )}
    </div>
  );
};

// ------------------------------------------------------------------ Modal ----
interface ModalProps {
  actor: { actorId: string; actorName: string };
  editUser?: User;
  onClose: () => void;
  onSaved: () => void;
}

const UserFormModal: React.FC<ModalProps> = ({ actor, editUser, onClose, onSaved }) => {
  const isEdit = !!editUser;
  const [firstName, setFirstName] = useState(editUser?.firstName || '');
  const [lastName, setLastName] = useState(editUser?.lastName || '');
  const [position, setPosition] = useState(editUser?.position || '');
  const [phone, setPhone] = useState(editUser?.phone || '');
  const [username, setUsername] = useState(editUser?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(editUser?.role || 'cashier');
  const [status, setStatus] = useState<'active' | 'disabled'>(editUser?.status || 'active');
  const [permissions, setPermissions] = useState<UserPermission[]>(editUser?.permissions || defaultPermsForRole('cashier'));
  const [comment, setComment] = useState(editUser?.comment || '');
  const [saving, setSaving] = useState(false);

  const onRoleChange = (r: UserRole) => {
    setRole(r);
    if (!isEdit) setPermissions(defaultPermsForRole(r));
  };

  const togglePerm = (p: UserPermission) => {
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateUser(editUser!.id, {
          firstName, lastName, position, phone, username, role, status, permissions, comment,
          newPassword: password || undefined,
          ...actor
        });
      } else {
        if (!password) { alert('ახალი მომხმარებლისთვის პაროლი სავალდებულოა'); setSaving(false); return; }
        await api.createUser({
          firstName, lastName, position, phone, username, password, role, permissions, comment, ...actor
        });
      }
      onSaved();
    } catch (err: any) {
      alert(err?.message || 'შეცდომა შენახვისას');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:border-blue-500';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs my-8">
        <h3 className="text-base font-bold text-slate-900">{isEdit ? `მომხმარებლის რედაქტირება — ${editUser!.username}` : 'ახალი მომხმარებელი'}</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="სახელი *" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={input} />
            <input type="text" placeholder="გვარი *" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="პოზიცია" value={position} onChange={(e) => setPosition(e.target.value)} className={input} />
            <input type="text" placeholder="ტელეფონი" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
          </div>
          <input type="text" placeholder="Username *" required value={username} onChange={(e) => setUsername(e.target.value)} className={`${input} font-mono`} />
          <input
            type="password"
            placeholder={isEdit ? 'ახალი პაროლი (დატოვეთ ცარიელი უცვლელად)' : 'პაროლი *'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
            required={!isEdit}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">როლი</label>
              <select value={role} onChange={(e) => onRoleChange(e.target.value as UserRole)} className={input}>
                {Object.entries(ROLE_LABELS).map(([id, lbl]) => (
                  <option key={id} value={id}>{lbl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">სტატუსი</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={input}>
                <option value="active">აქტიური</option>
                <option value="disabled">გათიშული</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">უფლებები</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2">
              {ALL_PERMISSIONS.map((p) => (
                <label key={p.id} className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input type="checkbox" checked={permissions.includes(p.id)} onChange={() => togglePerm(p.id)} className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <input type="text" placeholder="კომენტარი" value={comment} onChange={(e) => setComment(e.target.value)} className={input} />

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer">გაუქმება</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-60">
              {saving ? 'ინახება...' : 'შენახვა'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
