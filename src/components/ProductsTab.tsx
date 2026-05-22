import React, { useState } from 'react';
import { IonIcon, IonModal } from '@ionic/react';
import { addOutline, createOutline, trashOutline, cubeOutline, closeOutline, scanOutline, listOutline, star, starOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Product, Vendor, ProductVariant } from '../types';
import { showToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { VendorSelect } from './VendorSelect';
import { WebBarcodeScanner } from './WebBarcodeScanner';
import { ProductDetailScreen } from './ProductDetailScreen';
import { useTranslation } from '../i18n';

interface Props {
  token: string;
  products: Product[];
  vendors: Vendor[];
  fetchProducts: () => void;
  fetchVendors: () => void;
}

export function ProductsTab({ token, products, vendors, fetchProducts, fetchVendors }: Props) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [form, setForm] = useState<{ id: string; name: string; description: string; brand: string; category: string; isFrequentlyOrdered: boolean; upcs: string[]; variants: ProductVariant[]; vendorIds: string[] }>({
    id: '', name: '', description: '', brand: '', category: 'Other', isFrequentlyOrdered: false, upcs: [''], variants: [], vendorIds: []
  });
  
  // Bulk create state
  const [bulkVendorId, setBulkVendorId] = useState<string>('');
  const [bulkName, setBulkName] = useState('');
  const [bulkUpc, setBulkUpc] = useState('');
  const [bulkCreatedCount, setBulkCreatedCount] = useState(0);

  const [search, setSearch] = useState('');
  const [filterVendorId, setFilterVendorId] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [showWebScanner, setShowWebScanner] = useState(false);
  const [activeScanIndex, setActiveScanIndex] = useState<number | 'bulk' | null>(null);
  const [activeVariantScanIndex, setActiveVariantScanIndex] = useState<{ vIndex: number; uIndex: number } | null>(null);

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: () => void; title: string; message: string }>({
    isOpen: false, action: () => {}, title: '', message: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/products/${form.id}` : '/api/products';
    
    // UPC is now optional, just filter out empty strings
    const cleanedForm = { 
      ...form, 
      upcs: form.upcs.filter(u => u.trim() !== ''),
      variants: form.variants.map(v => ({ ...v, upcs: v.upcs.filter(u => u.trim() !== '') }))
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(cleanedForm)
    });

    if (res.ok) {
      showToast(form.id ? t('toast.productUpdated') : t('toast.productCreated'));
      fetchProducts();
      setShowModal(false);
    } else {
      const data = await res.json();
      showToast(data.error || t('toast.failedSave'), 'error');
    }
  };

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkName.trim()) return;

    const upcs = bulkUpc.trim() ? [bulkUpc.trim()] : [];
    const vendorIds = bulkVendorId ? [bulkVendorId] : [];

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: bulkName, description: '', upcs, vendorIds })
    });

    if (res.ok) {
      showToast(t('toast.productCreated'));
      setBulkCreatedCount(c => c + 1);
      setBulkName('');
      setBulkUpc('');
      fetchProducts();
      // Keep modal open, ready for next item
    } else {
      const data = await res.json();
      showToast(data.error || t('toast.failedSave'), 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: t('products.deleteTitle'),
      message: t('products.deleteMessage'),
      action: async () => {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          showToast(t('toast.productDeleted'));
          fetchProducts();
        } else {
          showToast(t('toast.failedDelete'), 'error');
        }
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  const startScanner = async (index: number | 'bulk') => {
    if (!Capacitor.isNativePlatform()) {
      setActiveScanIndex(index);
      setShowWebScanner(true);
      return;
    }

    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') {
        showToast(t('toast.cameraPermissionDenied'), 'error');
        return;
      }
      setIsScanning(true);
      document.body.classList.add('barcode-scanner-active');
      const result = await BarcodeScanner.scan();
      document.body.classList.remove('barcode-scanner-active');
      setIsScanning(false);
      
      if (result.barcodes && result.barcodes.length > 0) {
        if (index === 'bulk') {
          setBulkUpc(result.barcodes[0].rawValue);
        } else if (activeVariantScanIndex !== null) {
          const newVariants = [...form.variants];
          newVariants[activeVariantScanIndex.vIndex].upcs[activeVariantScanIndex.uIndex] = result.barcodes[0].rawValue;
          setForm({ ...form, variants: newVariants });
          setActiveVariantScanIndex(null);
        } else if (typeof index === 'number') {
          const newUpcs = [...form.upcs];
          newUpcs[index] = result.barcodes[0].rawValue;
          setForm({ ...form, upcs: newUpcs });
        }
      }
    } catch (e) {
      setIsScanning(false);
      document.body.classList.remove('barcode-scanner-active');
      showToast(t('toast.scannerFailed'), 'error');
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort();
  const brands = Array.from(new Set(products.map(p => p.brand))).filter(Boolean).sort();

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.upc && p.upc.includes(search));
    const matchesVendor = filterVendorId === 'all' 
      ? true 
      : (filterVendorId === 'none' 
          ? (!p.vendorIds || p.vendorIds.length === 0) 
          : (p.vendorIds && p.vendorIds.includes(filterVendorId)));
    const matchesCategory = filterCategory === 'all' ? true : p.category === filterCategory;
    const matchesBrand = filterBrand === 'all' ? true : (p.brand || 'none') === filterBrand;
    return matchesSearch && matchesVendor && matchesCategory && matchesBrand;
  }).sort((a, b) => {
    if (a.isFrequentlyOrdered && !b.isFrequentlyOrdered) return -1;
    if (!a.isFrequentlyOrdered && b.isFrequentlyOrdered) return 1;
    return a.name.localeCompare(b.name);
  });

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

  const addVariant = () => setForm({ ...form, variants: [...form.variants, { name: '', upcs: [''] }] });
  const updateVariantName = (vIndex: number, val: string) => {
    const newVariants = [...form.variants];
    newVariants[vIndex].name = val;
    setForm({ ...form, variants: newVariants });
  };
  const removeVariant = (vIndex: number) => {
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== vIndex) });
  };
  const addVariantUpc = (vIndex: number) => {
    const newVariants = [...form.variants];
    newVariants[vIndex].upcs.push('');
    setForm({ ...form, variants: newVariants });
  };
  const updateVariantUpc = (vIndex: number, uIndex: number, val: string) => {
    const newVariants = [...form.variants];
    newVariants[vIndex].upcs[uIndex] = val;
    setForm({ ...form, variants: newVariants });
  };
  const removeVariantUpc = (vIndex: number, uIndex: number) => {
    const newVariants = [...form.variants];
    newVariants[vIndex].upcs = newVariants[vIndex].upcs.filter((_, i) => i !== uIndex);
    if (!newVariants[vIndex].upcs.length) newVariants[vIndex].upcs = [''];
    setForm({ ...form, variants: newVariants });
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
        <h2 className="text-base font-bold text-white">{t('products.title')}</h2>
        <div className="flex gap-2">
          <button onClick={() => { 
            setBulkVendorId(''); setBulkName(''); setBulkUpc(''); setBulkCreatedCount(0); setShowBulkModal(true); 
          }} className="px-3 min-touch-target rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all-200 flex items-center gap-1">
            <IonIcon icon={listOutline} /> {t('products.bulkCreate')}
          </button>
          <button onClick={() => { setForm({ id: '', name: '', description: '', brand: '', category: 'Other', isFrequentlyOrdered: false, upcs: [''], variants: [], vendorIds: [] }); setShowModal(true); }} className="px-3 min-touch-target rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 text-xs font-bold shadow-lg shadow-teal-500/10 transition-all-200 flex items-center gap-1">
            <IonIcon icon={addOutline} /> {t('products.addProduct')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input type="text" placeholder={t('products.filterPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-4 min-touch-target rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-all-200" />
          <select 
            value={filterVendorId} 
            onChange={e => setFilterVendorId(e.target.value)}
            className="px-3 w-1/3 min-touch-target rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200"
          >
            <option value="all">{t('products.allVendors')}</option>
            <option value="none">{t('products.unassigned')}</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="flex-1 px-3 min-touch-target rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200"
          >
            <option value="all">{t('products.allCategories')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={filterBrand} 
            onChange={e => setFilterBrand(e.target.value)}
            className="flex-1 px-3 min-touch-target rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200"
          >
            <option value="all">{t('products.allBrands')}</option>
            <option value="none">{t('products.unassigned')}</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-gray-800/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 text-gray-500 mb-3"><IonIcon icon={cubeOutline} className="text-xl" /></div>
          <p className="text-gray-400 text-sm font-medium">{t('products.noProducts')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(product => {
            const productUpcs = product.upc ? product.upc.split(',') : [];
            const productVendors = product.vendor_name ? product.vendor_name.split(', ') : [];
            return (
            <div key={product.id} className="glass-panel rounded-2xl p-4 border border-gray-800/60 shadow-sm flex justify-between items-start">
              <div className="flex-1 cursor-pointer pr-4" onClick={() => setActiveProductId(product.id)}>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm">{product.name}</h3>
                  {product.isFrequentlyOrdered && <IonIcon icon={star} className="text-yellow-500 text-sm" />}
                </div>
                <div className="flex flex-wrap gap-1 mt-1 text-xs text-gray-400">
                  <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">{product.category}</span>
                  {product.brand && <span className="bg-gray-800/50 px-1.5 py-0.5 rounded text-[10px]">{product.brand}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{product.description}</p>
                <div className="flex flex-wrap gap-2 mt-2.5 pointer-events-none">
                  {productUpcs.length > 0 ? productUpcs.map((u, i) => <span key={i} className="px-2 py-0.5 rounded bg-gray-950 text-gray-400 text-[10px] font-mono border border-gray-800">UPC: {u}</span>) : (product.variants?.length === 0 && <span className="px-2 py-0.5 rounded bg-gray-950 text-gray-500 text-[10px] border border-gray-800">{t('products.noUpc')}</span>)}
                  {product.variants?.map((v, i) => (
                    <span key={`v${i}`} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">{v.name} ({v.upcs?.length || 0} UPCs)</span>
                  ))}
                  {productVendors.map((v, i) => <span key={`vn${i}`} className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[10px] font-medium border border-teal-500/10">{v}</span>)}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { 
                  setForm({ id: product.id, name: product.name, description: product.description||'', brand: product.brand||'', category: product.category, isFrequentlyOrdered: product.isFrequentlyOrdered, upcs: productUpcs.length ? productUpcs : [''], variants: product.variants || [], vendorIds: product.vendorIds || [] }); 
                  setShowModal(true); 
                }} className="p-2 min-touch-target rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={createOutline} /></button>
                <button onClick={() => handleDelete(product.id)} className="p-2 min-touch-target rounded-xl hover:bg-rose-500/10 text-rose-400 transition-all-200"><IonIcon icon={trashOutline} /></button>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* SINGLE PRODUCT EDIT MODAL */}
      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">{form.id ? t('products.editProduct') : t('products.addProduct')}</h2>
            <button onClick={() => setShowModal(false)} className="p-1.5 min-touch-target rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={closeOutline} /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.productName')}</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.description')}</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.brand')}</label>
                <input type="text" placeholder={t('products.brand')} value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.category')}</label>
                <input type="text" list="categories-list" required placeholder={t('products.categoryPlaceholder')} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" />
                <datalist id="categories-list">
                  <option value="Beverage" />
                  <option value="Food" />
                  <option value="Packaging" />
                  <option value="Supplies" />
                  <option value="Other" />
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isFrequentlyOrdered" checked={form.isFrequentlyOrdered} onChange={e => setForm({ ...form, isFrequentlyOrdered: e.target.checked })} className="w-4 h-4 rounded text-teal-500 bg-gray-950 border-gray-800 focus:ring-teal-500/50" />
              <label htmlFor="isFrequentlyOrdered" className="text-sm font-medium text-white flex items-center gap-1 cursor-pointer">
                {t('products.isFrequentlyOrdered')} <IonIcon icon={star} className="text-yellow-500" />
              </label>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.upcBarcodes')} (Optional)</label>
              {form.variants.length > 0 ? (
                <div className="bg-gray-950/50 border border-gray-800/50 p-4 rounded-xl text-center">
                  <p className="text-sm text-gray-400 mb-2">UPCs are managed at the variant level when variants are added.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {form.upcs.map((u, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={u} onChange={e => updateUpc(i, e.target.value)} className="flex-1 px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" placeholder={t('products.scanOrTypeUpc')} />
                        <button type="button" onClick={() => startScanner(i)} data-tooltip={t('scanner.title')} className="px-4 min-touch-target rounded-xl bg-gray-800 text-gray-300 hover:text-white transition-all-200 flex items-center justify-center">
                          <IonIcon icon={scanOutline} className="text-xl" />
                        </button>
                        {form.upcs.length > 1 && (
                          <button type="button" onClick={() => removeUpc(i)} className="px-3 min-touch-target rounded-xl bg-rose-500/10 text-rose-400 transition-all-200 flex items-center justify-center">
                            <IonIcon icon={trashOutline} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addUpcField} className="mt-2 text-xs min-touch-target font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"><IonIcon icon={addOutline} /> {t('products.addAnotherUpc')}</button>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.variants')}</label>
              <div className="space-y-4">
                {form.variants.map((v, vIndex) => (
                  <div key={vIndex} className="bg-gray-950 border border-gray-800 p-3 rounded-xl">
                    <div className="flex gap-2 mb-3">
                      <input type="text" value={v.name} onChange={e => updateVariantName(vIndex, e.target.value)} placeholder={t('products.variantName')} required className="flex-1 px-3 min-touch-target rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200 text-sm" />
                      <button type="button" onClick={() => removeVariant(vIndex)} className="px-3 min-touch-target rounded-lg bg-rose-500/10 text-rose-400 transition-all-200 flex items-center justify-center">
                        <IonIcon icon={trashOutline} />
                      </button>
                    </div>
                    <div className="space-y-2 pl-2 border-l-2 border-gray-800">
                      {v.upcs.map((u, uIndex) => (
                        <div key={uIndex} className="flex gap-2">
                          <input type="text" value={u} onChange={e => updateVariantUpc(vIndex, uIndex, e.target.value)} className="flex-1 px-3 min-touch-target rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200 text-sm" placeholder={t('products.scanOrTypeUpc')} />
                          <button type="button" onClick={() => { setActiveVariantScanIndex({ vIndex, uIndex }); startScanner('variant' as any); }} className="px-3 min-touch-target rounded-lg bg-gray-800 text-gray-300 hover:text-white transition-all-200 flex items-center justify-center">
                            <IonIcon icon={scanOutline} />
                          </button>
                          {v.upcs.length > 1 && (
                            <button type="button" onClick={() => removeVariantUpc(vIndex, uIndex)} className="px-3 min-touch-target rounded-lg bg-rose-500/10 text-rose-400 transition-all-200 flex items-center justify-center">
                              <IonIcon icon={trashOutline} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addVariantUpc(vIndex)} className="text-xs min-touch-target font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"><IonIcon icon={addOutline} /> {t('products.addAnotherUpc')}</button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addVariant} className="mt-3 text-xs min-touch-target font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"><IonIcon icon={addOutline} /> {t('products.addVariant')}</button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.vendors')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.vendorIds.map(vid => {
                  const v = vendors.find(x => x.id === vid);
                  return v ? (
                    <span key={vid} className="px-2 py-1 bg-teal-500/10 text-teal-400 text-xs rounded-lg flex items-center gap-1 border border-teal-500/20">
                      {v.name}
                      <IonIcon icon={closeOutline} className="cursor-pointer min-touch-target" onClick={() => toggleVendor(vid)} />
                    </span>
                  ) : null;
                })}
              </div>
              <VendorSelect value="" onChange={toggleVendor} vendors={vendors.filter(v => !form.vendorIds.includes(v.id))} token={token} onVendorCreated={v => { fetchVendors(); toggleVendor(v.id); }} />
            </div>

            <button type="submit" className="w-full min-touch-target px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 font-bold shadow-lg transition duration-200">{t('products.saveProduct')}</button>
          </form>
        </div>
      </IonModal>

      {/* BULK CREATE MODAL */}
      <IonModal isOpen={showBulkModal} onDidDismiss={() => setShowBulkModal(false)} initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
        <div className="p-6 bg-gray-900 text-gray-100 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">{t('products.bulkCreateTitle')}</h2>
              {bulkCreatedCount > 0 && <p className="text-xs text-teal-400 mt-1">{t('products.bulkCreated')}: {bulkCreatedCount}</p>}
            </div>
            <button onClick={() => setShowBulkModal(false)} className="p-1.5 min-touch-target rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={closeOutline} /></button>
          </div>

          <form onSubmit={handleBulkSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.bulkVendorLabel')}</label>
              <VendorSelect 
                value={bulkVendorId} 
                onChange={setBulkVendorId} 
                vendors={vendors} 
                token={token} 
                onVendorCreated={v => { fetchVendors(); setBulkVendorId(v.id); }} 
              />
            </div>
            
            <div className="pt-4 border-t border-gray-800">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.productName')}</label>
              <input 
                type="text" 
                required 
                value={bulkName} 
                onChange={e => setBulkName(e.target.value)} 
                className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" 
                placeholder={t('products.bulkNamePlaceholder')}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.upcBarcodes')}</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={bulkUpc} 
                  onChange={e => setBulkUpc(e.target.value)} 
                  className="flex-1 px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" 
                  placeholder={t('products.bulkUpcPlaceholder')} 
                />
                <button type="button" onClick={() => startScanner('bulk')} className="px-4 min-touch-target rounded-xl bg-gray-800 text-gray-300 hover:text-white transition-all-200 flex items-center justify-center">
                  <IonIcon icon={scanOutline} className="text-xl" />
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button type="button" onClick={() => setShowBulkModal(false)} className="flex-1 min-touch-target px-4 rounded-xl bg-gray-800 text-white font-bold transition duration-200">{t('products.bulkDone')}</button>
              <button type="submit" className="flex-1 min-touch-target px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 font-bold shadow-lg transition duration-200">{t('products.saveProduct')}</button>
            </div>
          </form>
        </div>
      </IonModal>

      <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))} onConfirm={confirmState.action} variant="danger" />

      <WebBarcodeScanner 
        isOpen={showWebScanner} 
        onScan={(decodedText) => {
          if (activeScanIndex === 'bulk') {
            setBulkUpc(decodedText);
          } else if (activeVariantScanIndex !== null) {
            const newVariants = [...form.variants];
            newVariants[activeVariantScanIndex.vIndex].upcs[activeVariantScanIndex.uIndex] = decodedText;
            setForm({ ...form, variants: newVariants });
            setActiveVariantScanIndex(null);
          } else if (activeScanIndex !== null) {
            const newUpcs = [...form.upcs];
            newUpcs[activeScanIndex] = decodedText;
            setForm({ ...form, upcs: newUpcs });
          }
          setShowWebScanner(false);
          setActiveScanIndex(null);
        }} 
        onCancel={() => {
          setShowWebScanner(false);
          setActiveScanIndex(null);
          setActiveVariantScanIndex(null);
        }} 
      />

      <IonModal isOpen={activeProductId !== null} onDidDismiss={() => setActiveProductId(null)}>
        {activeProductId && (
          <ProductDetailScreen 
            token={token} 
            productId={activeProductId} 
            onClose={() => setActiveProductId(null)} 
          />
        )}
      </IonModal>
    </div>
  );
}
