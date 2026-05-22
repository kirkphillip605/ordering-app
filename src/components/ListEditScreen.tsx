import React, { useState, useEffect } from 'react';
import { IonContent, IonIcon, IonModal } from '@ionic/react';
import { closeOutline, checkmarkCircleOutline, trashOutline, searchOutline, scanOutline, addOutline, cubeOutline, downloadOutline, archiveOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Product, PurchaseList, PurchaseListItem, Unit, Vendor } from '../types';
import { showToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { WebBarcodeScanner } from './WebBarcodeScanner';
import { useTranslation } from '../i18n';

interface Props {
  token: string;
  listId: string;
  vendors: Vendor[];
  units: Unit[];
  onClose: () => void;
}

export function ListEditScreen({ token, listId, vendors, units, onClose }: Props) {
  const { t } = useTranslation();
  const [currentList, setCurrentList] = useState<(PurchaseList & { items: PurchaseListItem[] }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showWebScanner, setShowWebScanner] = useState(false);
  const [scannedUPC, setScannedUPC] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  // Modals
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<Product | null>(null);
  const [addItemForm, setAddItemForm] = useState({ quantity: '1', unitId: '', variantId: '' });
  
  const [showProductNotFoundModal, setShowProductNotFoundModal] = useState(false);
  const [quickProductMode, setQuickProductMode] = useState<'create' | 'link'>('create');
  const [quickProductForm, setQuickProductForm] = useState({ name: '', description: '', vendorId: '' });
  const [linkProductQuery, setLinkProductQuery] = useState('');
  const [linkProductResults, setLinkProductResults] = useState<Product[]>([]);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({ orderDate: new Date().toISOString().split('T')[0], orderNumber: '' });
  
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: () => void; title: string; message: string; variant?: 'danger'|'warning'|'info' }>({
    isOpen: false, action: () => {}, title: '', message: ''
  });

  useEffect(() => {
    fetchListDetails();
    fetchProducts();
  }, [listId]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const lowerQ = searchQuery.toLowerCase();
      // If it looks like a UPC
      if (/^\d{8,}$/.test(searchQuery)) {
        handleUPCSearch(searchQuery);
      } else {
        setFilteredProducts(products.filter(p => 
          p.name.toLowerCase().includes(lowerQ) ||
          (p.upc && p.upc.includes(searchQuery)) ||
          (p.vendor_name && p.vendor_name.toLowerCase().includes(lowerQ))
        ).sort((a, b) => {
          if (a.isFrequentlyOrdered && !b.isFrequentlyOrdered) return -1;
          if (!a.isFrequentlyOrdered && b.isFrequentlyOrdered) return 1;
          return a.name.localeCompare(b.name);
        }));
      }
    } else {
      setFilteredProducts([]);
    }
  }, [searchQuery, products]);

  useEffect(() => {
    if (quickProductMode !== 'link' || !linkProductQuery.trim()) {
      setLinkProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(linkProductQuery)}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setLinkProductResults(await res.json());
    }, 500);
    return () => clearTimeout(timer);
  }, [linkProductQuery, quickProductMode]);

  const fetchListDetails = async () => {
    try {
      const res = await fetch(`/api/purchase-lists/${listId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setCurrentList(await res.json());
      } else {
        showToast(t('toast.failedSave'), 'error');
        onClose();
      }
    } catch (e) {
      showToast(t('toast.networkError'), 'error');
      onClose();
    }
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setProducts(await res.json());
  };

  const finalizeList = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/purchase-lists/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        name: currentList?.name, 
        status: 'ordered', 
        orderDate: orderForm.orderDate,
        orderNumber: orderForm.orderNumber
      })
    });
    if (res.ok) {
      showToast(t('toast.listOrdered'));
      setShowOrderModal(false);
      fetchListDetails();
    } else {
      showToast(t('toast.failedSave'), 'error');
    }
  };

  const archiveList = () => {
    setConfirmState({
      isOpen: true,
      title: t('listEdit.archiveTitle'),
      message: t('listEdit.archiveMessage'),
      variant: 'warning',
      action: async () => {
        const res = await fetch(`/api/purchase-lists/${listId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ 
            name: currentList?.name, 
            status: currentList?.status,
            isArchived: true 
          })
        });
        if (res.ok) {
          showToast(t('toast.listArchived'));
          onClose();
        }
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  const deleteList = () => {
    setConfirmState({
      isOpen: true,
      title: t('listEdit.deleteTitle'),
      message: t('listEdit.deleteMessage'),
      variant: 'danger',
      action: async () => {
        const res = await fetch(`/api/purchase-lists/${listId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast(t('toast.listDeleted'));
          onClose();
        }
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  const handleUPCSearch = async (upc: string) => {
    const res = await fetch(`/api/products/upc/${upc}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const product = await res.json();
      setSearchQuery('');
      setScannedUPC(upc);
      handleProductClick(product);
    } else {
      setScannedUPC(upc);
      setQuickProductMode('create');
      setQuickProductForm({ name: '', description: '', vendorId: '' });
      setShowProductNotFoundModal(true);
    }
  };

  const handleProductClick = (product: Product, existingItem?: PurchaseListItem) => {
    setSelectedProductForAdd(product);
    
    let autoVariantId = '';
    if (scannedUPC && product.variants?.length) {
      const match = product.variants.find(v => v.upcs?.includes(scannedUPC));
      if (match) autoVariantId = match.id || '';
    } else if (!existingItem && product.variants?.length === 1) {
      autoVariantId = product.variants[0].id || '';
    }

    setAddItemForm({
      quantity: existingItem ? String(existingItem.quantity) : '1',
      unitId: existingItem ? existingItem.unitId : (units[0]?.id || ''),
      variantId: existingItem?.variantId || autoVariantId
    });
    setScannedUPC('');
    setShowQuantityModal(true);
  };

  const submitAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdd) return;

    const res = await fetch(`/api/purchase-lists/${listId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        productId: selectedProductForAdd.id,
        quantity: parseFloat(addItemForm.quantity),
        unitId: addItemForm.unitId,
        variantId: addItemForm.variantId || null
      })
    });

    if (res.ok) {
      const data = await res.json();
      showToast(data._merged ? t('toast.itemUpdated') : t('toast.itemAdded'));
      fetchListDetails();
      setShowQuantityModal(false);
      setSelectedProductForAdd(null);
      setSearchQuery('');
    } else {
      showToast(t('toast.failedSave'), 'error');
    }
  };

  const deleteListItem = (itemId: string) => {
    setConfirmState({
      isOpen: true,
      title: t('listEdit.removeItemTitle'),
      message: t('listEdit.removeItemMessage'),
      variant: 'danger',
      action: async () => {
        const res = await fetch(`/api/purchase-list-items/${itemId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) fetchListDetails();
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  // --- SCANNER ---
  const startScanner = async () => {
    if (!Capacitor.isNativePlatform()) {
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
        handleUPCSearch(result.barcodes[0].rawValue);
      }
    } catch (e) {
      setIsScanning(false);
      document.body.classList.remove('barcode-scanner-active');
      showToast(t('toast.scannerFailed'), 'error');
    }
  };

  const handleQuickProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickProductMode === 'create') {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          name: quickProductForm.name, 
          description: quickProductForm.description, 
          upcs: [scannedUPC], 
          vendorIds: quickProductForm.vendorId ? [quickProductForm.vendorId] : [] 
        })
      });
      if (res.ok) {
        const p = await res.json();
        fetchProducts();
        setShowProductNotFoundModal(false);
        handleProductClick(p);
      } else {
        const d = await res.json();
        showToast(d.error || t('toast.failedSave'), 'error');
      }
    }
  };

  const linkProduct = async (product: Product) => {
    const res = await fetch(`/api/products/${product.id}/upc`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ upc: scannedUPC })
    });
    if (res.ok) {
      const p = await res.json();
      showToast(t('toast.upcLinked'));
      fetchProducts();
      setShowProductNotFoundModal(false);
      handleProductClick(p);
    } else {
      const d = await res.json();
      showToast(d.error || t('toast.failedSave'), 'error');
    }
  };

  const generatePDF = () => {
    if (!currentList || !currentList.items || currentList.items.length === 0) return;
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${t('lists.title')}: ${currentList.name}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`${t('listEdit.orderDate')}: ${new Date(currentList.orderDate || currentList.createdAt!).toLocaleDateString()}`, 14, 30);
    if (currentList.orderNumber) {
      doc.text(`Order Number: ${currentList.orderNumber}`, 14, 36);
    }

    // Group items by vendor
    const itemsByVendor: Record<string, typeof currentList.items> = {};
    currentList.items.forEach(item => {
      const vNames = item.vendor_name ? item.vendor_name.split(', ') : [t('listEdit.noVendor')];
      vNames.forEach(vName => {
        if (!itemsByVendor[vName]) itemsByVendor[vName] = [];
        itemsByVendor[vName].push(item);
      });
    });

    let currentY = 45;

    for (const [vendor, items] of Object.entries(itemsByVendor)) {
      doc.setFontSize(14);
      doc.text(`${t('listEdit.vendor')}: ${vendor}`, 14, currentY);
      currentY += 5;

      const tableData = items.map(item => [
        item.product_name,
        item.product_upc || 'N/A',
        item.quantity.toString(),
        item.unit_abbreviation
      ]);

      (doc as any).autoTable({
        startY: currentY,
        head: [['Product Name', 'UPC', 'Qty', 'Unit']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    doc.save(`ReOrderPro-${currentList.name.replace(/ /g, '_')}.pdf`);
  };

  if (!currentList) return null;

  return (
    <IonContent className="bg-gray-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.03),transparent_40%)] pointer-events-none" />
      
      {/* Header */}
      <div className="safe-area-top bg-gray-900/80 backdrop-blur-md border-b border-gray-800/60 sticky top-0 z-50">
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 min-touch-target rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-all-200">
              <IonIcon icon={closeOutline} className="text-xl" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white">{currentList.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${currentList.status === 'ordered' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  {currentList.status.toUpperCase() === 'ACTIVE' ? t('lists.statusActive') : currentList.status.toUpperCase() === 'FINALIZED' ? t('lists.statusFinalized') : currentList.status.toUpperCase() === 'ORDERED' ? t('lists.ordered') : t('status.draft')}
                </span>
                <span className="text-xs text-gray-500">• {currentList.items?.length || 0} {t('lists.items')}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentList.status === 'draft' ? (
              <button data-tooltip={t('listEdit.order')} onClick={() => setShowOrderModal(true)} className="px-3 min-touch-target py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 text-xs font-bold shadow-lg shadow-teal-500/10 transition-all-200 flex items-center gap-1">
                <IonIcon icon={checkmarkCircleOutline} />
                {t('listEdit.order')}
              </button>
            ) : (
              <>
                <button data-tooltip="Download PDF" onClick={generatePDF} className="p-2 min-touch-target rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 transition-all-200 flex items-center">
                  <IonIcon icon={downloadOutline} />
                </button>
                <button data-tooltip={t('listEdit.archiveTitle')} onClick={archiveList} className="p-2 min-touch-target rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all-200 flex items-center">
                  <IonIcon icon={archiveOutline} />
                </button>
              </>
            )}
            <button data-tooltip={t('listEdit.deleteTitle')} onClick={deleteList} className="p-2 min-touch-target rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 transition-all-200">
              <IonIcon icon={trashOutline} />
            </button>
          </div>
        </div>

        {currentList.status === 'draft' && (
          <div className="px-4 pb-3.5 flex gap-2">
            <div className="relative flex-1">
              <IonIcon icon={searchOutline} className="absolute left-3.5 top-1/2 -trangray-y-1/2 text-gray-500 text-lg" />
              <input 
                type="text" placeholder={t('listEdit.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full min-touch-target pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10 text-sm transition-all-200"
              />
            </div>
            <button data-tooltip={t('listEdit.scan')} onClick={isScanning ? () => setIsScanning(false) : startScanner} className={`px-4 min-touch-target rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold transition-all-200 ${isScanning ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20'}`}>
              <IonIcon icon={scanOutline} className="text-lg" />
              {isScanning ? t('listEdit.cancel') : t('listEdit.scan')}
            </button>
          </div>
        )}
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4 pb-24">
        {searchQuery && filteredProducts.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
            <div className="px-4 py-2 bg-gray-950 border-b border-gray-800 text-xs font-semibold text-gray-400">{t('listEdit.matchingProducts')} ({filteredProducts.length})</div>
            {filteredProducts.map(product => (
              <button key={product.id} onClick={() => handleProductClick(product)} className="w-full px-4 min-touch-target py-3 text-left hover:bg-gray-800/50 border-b border-gray-800/40 last:border-0 flex justify-between items-center transition-all-200">
                <div>
                  <div className="font-semibold text-gray-200 text-sm">{product.name}</div>
                  <div className="text-xs text-gray-500">UPC: {product.upc}</div>
                </div>
                <IonIcon icon={addOutline} className="text-teal-400 text-xl" />
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('listEdit.itemsInList')}</h2>
          {(!currentList.items || currentList.items.length === 0) ? (
            <div className="glass-panel rounded-2xl p-8 text-center border border-dashed border-gray-800">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 text-gray-500 mb-3"><IonIcon icon={cubeOutline} className="text-xl" /></div>
              <p className="text-gray-400 text-sm font-medium">{t('listEdit.noItems')}</p>
              {currentList.status === 'draft' && <p className="text-gray-500 text-xs mt-1">{t('listEdit.noItemsHint')}</p>}
            </div>
          ) : (
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/60 shadow-sm overflow-hidden divide-y divide-gray-800/40">
              {currentList.items.map(item => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-900/30 transition-all-200 cursor-pointer" onClick={() => { if(currentList.status === 'draft' && product) handleProductClick(product, item); }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-200 text-sm">{item.product_name}</h3>
                        {product?.isFrequentlyOrdered && <IonIcon icon={cubeOutline} className="text-yellow-500 text-xs" />}
                      </div>
                      {item.variantId && product?.variants && (
                        <p className="text-xs text-blue-400 mt-0.5">Variant: {product.variants.find(v => v.id === item.variantId)?.name || 'Unknown'}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">UPC: {item.product_upc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-lg bg-gray-800 text-teal-400 text-sm font-bold border border-gray-700/50">{item.quantity} {item.unit_abbreviation}</span>
                      {currentList.status === 'draft' && (
                        <button onClick={(e) => { e.stopPropagation(); deleteListItem(item.id); }} className="p-2 min-touch-target rounded-lg hover:bg-rose-500/10 text-rose-400 transition-all-200"><IonIcon icon={trashOutline} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <IonModal isOpen={showQuantityModal} onDidDismiss={() => setShowQuantityModal(false)}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">{t('listEdit.itemQuantity')}</h2>
            <button onClick={() => setShowQuantityModal(false)} className="p-1.5 min-touch-target rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={closeOutline} /></button>
          </div>
          {selectedProductForAdd && (
            <div className="mb-6 p-4 rounded-2xl bg-gray-950 border border-gray-800">
              <h3 className="font-bold text-white text-sm">{selectedProductForAdd.name}</h3>
              <p className="text-[10px] font-mono text-gray-500 mt-2">UPC: {selectedProductForAdd.upc || t('products.noUpc')}</p>
            </div>
          )}
          <form onSubmit={submitAddItem} className="space-y-5">
            {selectedProductForAdd && selectedProductForAdd.variants && selectedProductForAdd.variants.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('products.variants')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedProductForAdd.variants.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setAddItemForm({ ...addItemForm, variantId: v.id || '' })}
                      className={`p-3 rounded-xl border text-left min-touch-target transition-all-200 ${addItemForm.variantId === v.id ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'}`}
                    >
                      <div className="font-semibold text-sm">{v.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('listEdit.quantity')}</label>
              <input type="number" step="any" required value={addItemForm.quantity} onChange={e => setAddItemForm({ ...addItemForm, quantity: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all-200" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('listEdit.unit')}</label>
              <select value={addItemForm.unitId} onChange={e => setAddItemForm({ ...addItemForm, unitId: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all-200">
                {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
              </select>
            </div>
            <button type="submit" disabled={selectedProductForAdd?.variants?.length ? !addItemForm.variantId : false} className="w-full py-3.5 min-touch-target px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 font-bold shadow-lg shadow-teal-500/10 transition duration-200 disabled:opacity-50">{t('listEdit.saveItem')}</button>
          </form>
        </div>
      </IonModal>

      <IonModal isOpen={showProductNotFoundModal} onDidDismiss={() => setShowProductNotFoundModal(false)}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">{t('listEdit.unknownBarcode')}</h2>
            <button onClick={() => setShowProductNotFoundModal(false)} className="p-1.5 min-touch-target rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={closeOutline} /></button>
          </div>
          <p className="text-sm text-gray-400 mb-4">{t('listEdit.unknownBarcode')} <span className="font-mono font-bold text-teal-400 bg-gray-950 px-1 py-0.5 rounded">{scannedUPC}</span> {t('listEdit.barcodeNotRegistered')}</p>
          
          <div className="flex rounded-lg bg-gray-950 p-1 mb-6 border border-gray-800">
            <button onClick={() => setQuickProductMode('create')} className={`flex-1 min-touch-target text-sm font-semibold py-2 rounded-md transition-all-200 ${quickProductMode === 'create' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('listEdit.createNew')}</button>
            <button onClick={() => setQuickProductMode('link')} className={`flex-1 min-touch-target text-sm font-semibold py-2 rounded-md transition-all-200 ${quickProductMode === 'link' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('listEdit.linkToExisting')}</button>
          </div>

          {quickProductMode === 'create' ? (
            <form onSubmit={handleQuickProductSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('listEdit.productName')}</label>
                <input type="text" required value={quickProductForm.name} onChange={e => setQuickProductForm({ ...quickProductForm, name: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" placeholder={t('listEdit.productName')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('listEdit.vendor')}</label>
                <select value={quickProductForm.vendorId} onChange={e => setQuickProductForm({ ...quickProductForm, vendorId: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200">
                  <option value="">{t('listEdit.noVendor')}</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full min-touch-target py-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 font-bold shadow-lg transition duration-200">{t('listEdit.createAndAdd')}</button>
            </form>
          ) : (
            <div className="space-y-4">
              <input type="text" value={linkProductQuery} onChange={e => setLinkProductQuery(e.target.value)} className="w-full min-touch-target px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" placeholder={t('listEdit.searchExisting')} />
              <div className="space-y-2">
                {linkProductResults.map(p => (
                  <button key={p.id} onClick={() => linkProduct(p)} className="w-full min-touch-target p-3 bg-gray-950 rounded-xl border border-gray-800 text-left hover:border-teal-500/50 transition-all-200">
                    <div className="font-semibold text-sm text-white">{p.name}</div>
                    <div className="text-xs text-gray-500">{t('listEdit.currentUpc')}: {p.upc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </IonModal>

      <IonModal isOpen={showOrderModal} onDidDismiss={() => setShowOrderModal(false)} initialBreakpoint={0.5} breakpoints={[0, 0.5, 0.8]}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800 h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">{t('listEdit.orderDetails')}</h2>
            <button onClick={() => setShowOrderModal(false)} className="p-1.5 min-touch-target rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={closeOutline} /></button>
          </div>
          <form onSubmit={finalizeList} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('listEdit.orderDate')}</label>
              <input type="date" required value={orderForm.orderDate} onChange={e => setOrderForm({ ...orderForm, orderDate: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('listEdit.orderNumber')}</label>
              <input type="text" placeholder={t('listEdit.orderNumberPlaceholder')} value={orderForm.orderNumber} onChange={e => setOrderForm({ ...orderForm, orderNumber: e.target.value })} className="w-full px-4 min-touch-target rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all-200" />
            </div>
            <button type="submit" className="w-full py-3.5 min-touch-target px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 font-bold shadow-lg shadow-teal-500/10 transition duration-200">{t('listEdit.confirmOrder')}</button>
          </form>
        </div>
      </IonModal>

      <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))} onConfirm={confirmState.action} />

      <WebBarcodeScanner 
        isOpen={showWebScanner} 
        onScan={(decodedText) => {
          handleUPCSearch(decodedText);
          setShowWebScanner(false);
        }} 
        onCancel={() => {
          setShowWebScanner(false);
        }} 
      />
    </IonContent>
  );
}
