import React, { useState, useEffect } from 'react';
import { IonIcon, IonModal } from '@ionic/react';
import { addOutline, createOutline, trashOutline, peopleOutline, closeOutline } from 'ionicons/icons';
import { showToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';

interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

interface Props {
  token: string;
}

export function UsersTab({ token }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: '', username: '', password: '', role: 'standard' });
  
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: () => void; title: string; message: string }>({
    isOpen: false, action: () => {}, title: '', message: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/users/${form.id}` : '/api/users';
    
    // Validate
    if (!form.id && !form.password) {
      showToast('Password is required for new users', 'error');
      return;
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      showToast(form.id ? 'User updated' : 'User created');
      fetchUsers();
      setShowModal(false);
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to save user', 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This cannot be undone.',
      action: async () => {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          showToast('User deleted');
          fetchUsers();
        } else {
          showToast('Failed to delete user', 'error');
        }
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-white">Manage Users</h2>
        <button onClick={() => { setForm({ id: '', username: '', password: '', role: 'standard' }); setShowModal(true); }} className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 text-xs font-bold shadow-lg shadow-teal-500/10 transition-all-200 flex items-center gap-1">
          <IonIcon icon={addOutline} /> Add User
        </button>
      </div>

      {users.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-gray-800/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 text-gray-500 mb-3"><IonIcon icon={peopleOutline} className="text-xl" /></div>
          <p className="text-gray-400 text-sm font-medium">No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="glass-panel rounded-2xl p-4 border border-gray-800/60 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">{user.username}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider ${user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                    {user.role.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-gray-600 font-medium ml-1">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setForm({ id: user.id, username: user.username, password: '', role: user.role }); setShowModal(true); }} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={createOutline} /></button>
                <button onClick={() => handleDelete(user.id)} className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-all-200"><IonIcon icon={trashOutline} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)} initialBreakpoint={0.7} breakpoints={[0, 0.7, 0.9]}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800 h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">{form.id ? 'Edit User' : 'Add User'}</h2>
            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={closeOutline} /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Username</label>
              <input type="text" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password {form.id && '(Leave blank to keep current)'}</label>
              <input type="password" required={!form.id} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200">
                <option value="standard">Standard</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="w-full py-3.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 font-bold shadow-lg transition duration-200">Save User</button>
          </form>
        </div>
      </IonModal>

      <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))} onConfirm={confirmState.action} variant="danger" />
    </div>
  );
}
