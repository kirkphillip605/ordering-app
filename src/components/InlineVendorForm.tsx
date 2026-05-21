import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { addOutline, closeOutline } from 'ionicons/icons';
import { showToast } from './Toast';

interface InlineVendorFormProps {
  token: string | null;
  onVendorCreated: (vendor: { id: string; name: string; description: string }) => void;
  onCancel: () => void;
}

export function InlineVendorForm({ token, onVendorCreated, onCancel }: InlineVendorFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      if (res.ok) {
        const newVendor = await res.json();
        showToast(`Vendor "${newVendor.name}" created`, 'success');
        onVendorCreated(newVendor);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to create vendor', 'error');
      }
    } catch {
      showToast('Failed to create vendor', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="expand-enter mt-2 p-3 rounded-xl bg-gray-950/80 border border-teal-500/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">New Vendor</span>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-all-200"
        >
          <IonIcon icon={closeOutline} className="text-sm" />
        </button>
      </div>
      <div className="space-y-2">
        <input
          type="text"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all-200"
          placeholder="Vendor name (e.g. Sysco)"
          autoFocus
        />
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all-200"
          placeholder="Description (optional)"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="w-full py-2 px-3 rounded-lg bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-gray-950 text-xs font-bold transition-all-200 flex items-center justify-center gap-1"
        >
          <IonIcon icon={addOutline} className="text-sm" />
          {saving ? 'Creating...' : 'Create Vendor'}
        </button>
      </div>
    </div>
  );
}
