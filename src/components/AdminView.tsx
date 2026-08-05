import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, UserCheck, Plus, History, Database, Download, Upload } from 'lucide-react';
import { User, AuditLog, Settings } from '../types';
import { api } from '../lib/api';
import { formatDate } from '../lib/formatters';

interface Props {
  user: User;
  users: User[];
  settings: Settings;
  onRefreshData: () => void;
}

export const AdminView: React.FC<Props> = ({ user, users, settings, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'settings'>('users');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState<Settings>(settings);

  useEffect(() => {
    api.getAuditLogs().then((logs) => setAuditLogs(logs)).catch(() => {});
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">ადმინისტრირება & პარამეტრები</h1>
        <p className="text-xs text-slate-500 mt-0.5">მომხმარებლები, უფლებები, Audit Log და პარამეტრები</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-2xl shadow-sm text-xs font-bold">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${
            activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          👤 მომხმარებლები ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${
            activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          🛡️ Audit Log ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3.5 px-4 border-b-2 cursor-pointer transition ${
            activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          ⚙️ სისტემის პარამეტრები
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">მომხმარებლების სია</h3>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{u.username}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="p-3 text-slate-600 font-semibold">{u.role}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status === 'active' ? 'აქტიური' : 'חסლული'}
                      </span>
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
                  <td className="p-3 text-slate-500">{formatDate(log.timestamp)}</td>
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
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">კომპანიის დასახელება</label>
            <input
              type="text"
              value={settingsForm.companyName}
              onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
              className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">საიდენტიფიკაციო კოდი (ს/კ)</label>
            <input
              type="text"
              value={settingsForm.taxId}
              onChange={(e) => setSettingsForm({ ...settingsForm, taxId: e.target.value })}
              className="w-full border border-slate-300 rounded-xl p-2.5 font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">მისამართი</label>
            <input
              type="text"
              value={settingsForm.address}
              onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ტელეფონი</label>
            <input
              type="text"
              value={settingsForm.phone}
              onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer"
            >
              პარამეტრების შენახვა
            </button>
          </div>
        </form>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onCreated={() => {
            onRefreshData();
            setShowAddUserModal(false);
          }}
        />
      )}
    </div>
  );
};

const AddUserModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier' | 'warehouse_manager' | 'accountant'>('cashier');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({ username, password, firstName, lastName, role, permissions: [] });
      onCreated();
    } catch {
      alert('შეცდომა მომხმარებლის შექმნისას');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900">ახალი მომხმარებელი</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Username *"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
          />
          <input
            type="password"
            placeholder="პაროლი *"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="სახელი *"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            />
            <input
              type="text"
              placeholder="გვარი *"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full border border-slate-300 rounded-xl p-2.5 outline-none"
          >
            <option value="cashier">მოლარე (Cashier)</option>
            <option value="warehouse_manager">საწყობის მენეჯერი</option>
            <option value="accountant">ბუღალტერი</option>
            <option value="admin">ადმინისტრატორი</option>
          </select>

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
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold cursor-pointer"
            >
              შენახვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
