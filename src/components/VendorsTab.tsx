import React, { useState } from 'react';
import { IonIcon, IonModal } from '@ionic/react';
import { addOutline, createOutline, trashOutline, businessOutline, closeOutline } from 'ionicons/icons';
import { Vendor } from '../types';
import { showToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { useTranslation } from '../i18n';

interface Props { token: string; vendors: Vendor[]; fetchVendors: () => void; }

export function VendorsTab({ token, vendors, fetchVendors }: Props) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', description: '' });
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: () => void; title: string; message: string }>({
    isOpen: false, action: () => {}, title: '', message: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(form.id ? `/api/vendors/${form.id}` : '/api/vendors', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      showToast(form.id ? t('toast.vendorUpdated') : t('toast.vendorCreated'));
      fetchVendors();
      setShowModal(false);
    } else showToast(t('toast.failedSave'), 'error');
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true, title: t('vendors.deleteTitle'), message: t('vendors.deleteMessage'), action: async () => {
        const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showToast(t('toast.vendorDeleted')); fetchVendors(); }
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-white">{t('vendors.title')}</h2>
        <button onClick={() => { setForm({ id: '', name: '', description: '' }); setShowModal(true); }} className="px-4 min-touch-target rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 text-xs font-bold shadow-lg transition-all-200 flex items-center gap-1">
          <IonIcon icon={addOutline} /> {t('vendors.addVendor')}
        </button>
      </div>

      {vendors.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-gray-800/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 text-gray-500 mb-3"><IonIcon icon={businessOutline} className="text-xl" /></div>
          <p className="text-gray-400 text-sm font-medium">{t('vendors.noVendors')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vendors.map(vendor => (
            <div key={vendor.id} className="glass-panel rounded-2xl p-4 border border-gray-800/60 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">{vendor.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{vendor.description}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setForm({ ...vendor, description: vendor.description||'' }); setShowModal(true); }} className="p-2 min-touch-target rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={createOutline} /></button>
                <button onClick={() => handleDelete(vendor.id)} className="p-2 min-touch-target rounded-xl hover:bg-rose-500/10 text-rose-400 transition-all-200"><IonIcon icon={trashOutline} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">{form.id ? t('vendors.editVendor') : t('vendors.addVendor')}</h2>
            <button onClick={() => setShowModal(false)} className="p-1.5 min-touch-target rounded-full bg-gray-800 text-gray-400 hover:text-white"><IonIcon icon={closeOutline} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('vendors.name')}</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:border-teal-500/50 focus:outline-none transition-all-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('vendors.description')}</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:border-teal-500/50 focus:outline-none transition-all-200" />
            </div>
            <button type="submit" className="w-full min-touch-target px-4 rounded-xl bg-teal-500 text-gray-950 font-bold shadow-lg transition duration-200">{t('vendors.save')}</button>
          </form>
        </div>
      </IonModal>

      <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))} onConfirm={confirmState.action} variant="danger" />
    </div>
  );
}
