import React, { useState } from 'react';
import { IonIcon, IonModal } from '@ionic/react';
import { addOutline, createOutline, trashOutline, optionsOutline, closeOutline } from 'ionicons/icons';
import { Unit } from '../types';
import { showToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';

interface Props { token: string; units: Unit[]; fetchUnits: () => void; }

export function UnitsTab({ token, units, fetchUnits }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', abbreviation: '' });
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: () => void; title: string; message: string }>({
    isOpen: false, action: () => {}, title: '', message: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(form.id ? `/api/units/${form.id}` : '/api/units', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      showToast(form.id ? 'Unit updated' : 'Unit created');
      fetchUnits();
      setShowModal(false);
    } else showToast('Failed to save unit', 'error');
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true, title: 'Delete Unit', message: 'Are you sure?', action: async () => {
        const res = await fetch(`/api/units/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showToast('Unit deleted'); fetchUnits(); }
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-white">Units</h2>
        <button onClick={() => { setForm({ id: '', name: '', abbreviation: '' }); setShowModal(true); }} className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 text-xs font-bold shadow-lg transition-all-200 flex items-center gap-1">
          <IonIcon icon={addOutline} /> Add Unit
        </button>
      </div>

      {units.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-gray-800/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 text-gray-500 mb-3"><IonIcon icon={optionsOutline} className="text-xl" /></div>
          <p className="text-gray-400 text-sm font-medium">No units registered</p>
        </div>
      ) : (
        <div className="space-y-3">
          {units.map(unit => (
            <div key={unit.id} className="glass-panel rounded-2xl p-4 border border-gray-800/60 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">{unit.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Abbreviation: <span className="font-mono text-teal-400 font-bold">{unit.abbreviation}</span></p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setForm(unit); setShowModal(true); }} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={createOutline} /></button>
                <button onClick={() => handleDelete(unit.id)} className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-all-200"><IonIcon icon={trashOutline} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">{form.id ? 'Edit Unit' : 'Add Unit'}</h2>
            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white"><IonIcon icon={closeOutline} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:border-teal-500/50 focus:outline-none transition-all-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Abbreviation</label>
              <input type="text" required value={form.abbreviation} onChange={e => setForm({ ...form, abbreviation: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:border-teal-500/50 focus:outline-none transition-all-200" />
            </div>
            <button type="submit" className="w-full py-3.5 px-4 rounded-xl bg-teal-500 text-gray-950 font-bold shadow-lg transition duration-200">Save</button>
          </form>
        </div>
      </IonModal>
      <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))} onConfirm={confirmState.action} variant="danger" />
    </div>
  );
}
