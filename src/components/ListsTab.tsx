import React, { useState } from 'react';
import { IonIcon, IonModal } from '@ionic/react';
import { addOutline, clipboardOutline, trashOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';
import { PurchaseList } from '../types';
import { showToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';

interface Props { token: string; lists: PurchaseList[]; fetchLists: () => void; onSelectList: (id: string) => void; }

export function ListsTab({ token, lists, fetchLists, onSelectList }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: () => void; title: string; message: string }>({
    isOpen: false, action: () => {}, title: '', message: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/purchase-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      const newList = await res.json();
      showToast('List created');
      fetchLists();
      setShowModal(false);
      onSelectList(newList.id);
    } else showToast('Failed to create list', 'error');
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true, title: 'Delete List', message: 'Are you sure?', action: async () => {
        const res = await fetch(`/api/purchase-lists/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showToast('List deleted'); fetchLists(); }
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-white">Purchase Lists</h2>
        <button onClick={() => { setName(''); setShowModal(true); }} className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 text-xs font-bold shadow-lg transition-all-200 flex items-center gap-1">
          <IonIcon icon={addOutline} /> New List
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-gray-800/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 text-gray-500 mb-3"><IonIcon icon={clipboardOutline} className="text-xl" /></div>
          <p className="text-gray-400 text-sm font-medium">No purchase lists yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map(list => (
            <div key={list.id} onClick={() => onSelectList(list.id)} className="glass-panel-interactive rounded-2xl p-4 border border-gray-800/60 shadow-sm cursor-pointer flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">{list.name}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider ${list.status === 'finalized' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {list.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">• {list.itemCount || 0} items</span>
                  <span className="text-[10px] text-gray-600 font-medium ml-1">{formatDate(list.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleDelete(list.id); }} className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-all-200"><IonIcon icon={trashOutline} /></button>
                <IonIcon icon={chevronForwardOutline} className="text-gray-600 text-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Create Purchase List</h2>
            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white"><IonIcon icon={closeOutline} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">List Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Friday Delivery" className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:border-teal-500/50 focus:outline-none transition-all-200" />
            </div>
            <button type="submit" className="w-full py-3.5 px-4 rounded-xl bg-teal-500 text-gray-950 font-bold shadow-lg transition duration-200">Create List</button>
          </form>
        </div>
      </IonModal>

      <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))} onConfirm={confirmState.action} variant="danger" />
    </div>
  );
}
