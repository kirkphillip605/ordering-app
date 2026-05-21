import React, { useState } from 'react';
import { IonIcon, IonModal } from '@ionic/react';
import { addOutline, createOutline, trashOutline, cubeOutline, closeOutline, scanOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Product, Vendor } from '../types';
import { showToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { VendorSelect } from './VendorSelect';

interface Props {
  token: string;
  products: Product[];
  vendors: Vendor[];
  fetchProducts: () => void;
  fetchVendors: () => void;
}

export function ProductsTab({ token, products, vendors, fetchProducts, fetchVendors }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ id: string; name: string; description: string; upcs: string[]; vendorIds: string[] }>({
    id: '', name: '', description: '', upcs: [''], vendorIds: []
  });
  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: () => void; title: string; message: string }>({
    isOpen: false, action: () => {}, title: '', message: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/products/${form.id}` : '/api/products';
    
    // Filter out empty UPCs
    const cleanedForm = { ...form, upcs: form.upcs.filter(u => u.trim() !== '') };
    if (cleanedForm.upcs.length === 0) {
      showToast('At least one UPC is required', 'error');
      return;
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(cleanedForm)
    });

    if (res.ok) {
      showToast(form.id ? 'Product updated' : 'Product created');
      fetchProducts();
      setShowModal(false);
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to save product', 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product?',
      action: async () => {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          showToast('Product deleted');
          fetchProducts();
        }
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  const startScanner = async (index: number) => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback for web testing (mock scan)
      const mockUpc = prompt('Web fallback: Enter a barcode manually:');
      if (mockUpc) {
        const newUpcs = [...form.upcs];
        newUpcs[index] = mockUpc;
        setForm({ ...form, upcs: newUpcs });
      } else {
        showToast('Scanner only available on native device', 'error');
      }
      return;
    }

    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') {
        showToast('Camera permission denied', 'error');
        return;
      }
      setIsScanning(true);
      document.body.classList.add('barcode-scanner-active');
      const result = await BarcodeScanner.scan();
      document.body.classList.remove('barcode-scanner-active');
      setIsScanning(false);
      
      if (result.barcodes && result.barcodes.length > 0) {
        const newUpcs = [...form.upcs];
        newUpcs[index] = result.barcodes[0].rawValue;
        setForm({ ...form, upcs: newUpcs });
      }
    } catch (e) {
      setIsScanning(false);
      document.body.classList.remove('barcode-scanner-active');
      showToast('Failed to start scanner', 'error');
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.upc.includes(search));

  const addUpcField = () => setForm({ ...form, upcs: [...form.upcs, ''] });
  const updateUpc = (index: number, val: string) => {
    const newUpcs = [...form.upcs];
    newUpcs[index] = val;
    setForm({ ...form, upcs: newUpcs });
  };
  const removeUpc = (index: number) => {
    const newUpcs = form.upcs.filter((_, i) => i !== index);
    setForm({ ...form, upcs: newUpcs.length ? newUpcs : [''] });
  };

  const toggleVendor = (vendorId: string) => {
    if (!vendorId) return;
    const newVendors = form.vendorIds.includes(vendorId) 
      ? form.vendorIds.filter(id => id !== vendorId)
      : [...form.vendorIds, vendorId];
    setForm({ ...form, vendorIds: newVendors });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-white">Products</h2>
        <button onClick={() => { setForm({ id: '', name: '', description: '', upcs: [''], vendorIds: [] }); setShowModal(true); }} className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 text-xs font-bold shadow-lg shadow-teal-500/10 transition-all-200 flex items-center gap-1">
          <IonIcon icon={addOutline} /> Add Product
        </button>
      </div>

      <input type="text" placeholder="Filter products..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-all-200" />

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-gray-800/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 text-gray-500 mb-3"><IonIcon icon={cubeOutline} className="text-xl" /></div>
          <p className="text-gray-400 text-sm font-medium">No products found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(product => {
            const productUpcs = product.upc ? product.upc.split(',') : [];
            const productVendors = product.vendor_name ? product.vendor_name.split(', ') : [];
            return (
            <div key={product.id} className="glass-panel rounded-2xl p-4 border border-gray-800/60 shadow-sm flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-sm">{product.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{product.description}</p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {productUpcs.map((u, i) => <span key={i} className="px-2 py-0.5 rounded bg-gray-950 text-gray-400 text-[10px] font-mono border border-gray-800">UPC: {u}</span>)}
                  {productVendors.map((v, i) => <span key={i} className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[10px] font-medium border border-teal-500/10">{v}</span>)}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { 
                  // Since we don't return vendorIds natively from the join currently in the fast search, we'd need them or we can fetch full product. But for now we just parse. Wait, let's just fetch full vendor list from products. Actually vendorId is not returned in the view, we should probably fetch the product details if we edit, but for now let's just pass empty and let user re-select, or better yet, I'll update the backend to return vendorIds array. Let's do that next.
                  setForm({ id: product.id, name: product.name, description: product.description||'', upcs: productUpcs, vendorIds: [] }); 
                  setShowModal(true); 
                }} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={createOutline} /></button>
                <button onClick={() => handleDelete(product.id)} className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-all-200"><IonIcon icon={trashOutline} /></button>
              </div>
            </div>
          )})}
        </div>
      )}

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">{form.id ? 'Edit Product' : 'Add Product'}</h2>
            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={closeOutline} /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Product Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">UPC / Barcodes</label>
              <div className="space-y-2">
                {form.upcs.map((u, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={u} onChange={e => updateUpc(i, e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" placeholder="Scan or type UPC" />
                    <button type="button" onClick={() => startScanner(i)} data-tooltip="Scan Barcode" className="px-4 rounded-xl bg-gray-800 text-gray-300 hover:text-white transition-all-200 flex items-center justify-center">
                      <IonIcon icon={scanOutline} className="text-xl" />
                    </button>
                    {form.upcs.length > 1 && (
                      <button type="button" onClick={() => removeUpc(i)} className="px-3 rounded-xl bg-rose-500/10 text-rose-400 transition-all-200 flex items-center justify-center">
                        <IonIcon icon={trashOutline} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addUpcField} className="mt-2 text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"><IonIcon icon={addOutline} /> Add another UPC</button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vendors</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.vendorIds.map(vid => {
                  const v = vendors.find(x => x.id === vid);
                  return v ? (
                    <span key={vid} className="px-2 py-1 bg-teal-500/10 text-teal-400 text-xs rounded-lg flex items-center gap-1 border border-teal-500/20">
                      {v.name}
                      <IonIcon icon={closeOutline} className="cursor-pointer" onClick={() => toggleVendor(vid)} />
                    </span>
                  ) : null;
                })}
              </div>
              <VendorSelect value="" onChange={toggleVendor} vendors={vendors.filter(v => !form.vendorIds.includes(v.id))} token={token} onVendorCreated={v => { fetchVendors(); toggleVendor(v.id); }} />
            </div>

            <button type="submit" className="w-full py-3.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 font-bold shadow-lg transition duration-200">Save Product</button>
          </form>
        </div>
      </IonModal>

      <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))} onConfirm={confirmState.action} variant="danger" />
    </div>
  );
}
