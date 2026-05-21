import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { addOutline, closeOutline } from 'ionicons/icons';
import { useTranslation } from '../i18n';

interface Vendor { id: string; name: string; description: string; }

interface VendorSelectProps {
  value: string;
  onChange: (vendorId: string) => void;
  vendors: Vendor[];
  token: string | null;
  onVendorCreated: (vendor: Vendor) => void;
}

export function VendorSelect({ value, onChange, vendors, token, onVendorCreated }: VendorSelectProps) {
  const { t } = useTranslation();
  const [showInline, setShowInline] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__new__') {
      setShowInline(true);
    } else {
      onChange(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      });
      if (res.ok) {
        const v = await res.json();
        onVendorCreated(v);
        onChange(v.id);
        setShowInline(false);
        setName('');
        setDesc('');
      }
    } catch { /* handled by toast */ }
    setSaving(false);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('vendors.selectVendor')}</label>
      <select
        value={showInline ? '__new__' : value}
        onChange={handleSelectChange}
        className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all-200"
      >
        <option value="">{t('listEdit.noVendor')}</option>
        {vendors.map(v => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
        <option value="__new__">{t('vendors.createNewOption')}</option>
      </select>

      {showInline && (
        <div className="expand-enter mt-2 p-3 rounded-xl bg-gray-950/80 border border-teal-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">{t('vendors.createNewVendor')}</span>
            <button type="button" onClick={() => { setShowInline(false); onChange(value === '__new__' ? '' : value); }}
              className="p-1 min-touch-target rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-all-200">
              <IonIcon icon={closeOutline} className="text-sm" />
            </button>
          </div>
          <div className="space-y-2">
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
              className="w-full px-3 min-touch-target rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-all-200"
              placeholder={t('vendors.vendorName')} autoFocus />
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
              className="w-full px-3 min-touch-target rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-all-200"
              placeholder={t('vendors.descriptionOptional')} />
            <button type="button" onClick={handleSubmit} disabled={saving || !name.trim()}
              className="w-full py-2 min-touch-target rounded-lg bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-gray-950 text-xs font-bold transition-all-200 flex items-center justify-center gap-1">
              <IonIcon icon={addOutline} className="text-sm" />
              {saving ? t('vendors.creating') : t('vendors.createVendor')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
