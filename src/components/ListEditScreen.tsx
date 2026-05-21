import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonIcon, IonModal } from '@ionic/react';
import { closeOutline, checkmarkCircleOutline, trashOutline, searchOutline, scanOutline, addOutline, cubeOutline } from 'ionicons/icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Product, PurchaseList, PurchaseListItem, Unit, Vendor } from '../types';
import { showToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  token: string;
  listId: string;
  vendors: Vendor[];
  units: Unit[];
  onClose: () => void;
}

export function ListEditScreen({ token, listId, vendors, units, onClose }: Props) {
  const [currentList, setCurrentList] = useState<(PurchaseList & { items: PurchaseListItem[] }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedUPC, setScannedUPC] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  // Modals
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<Product | null>(null);
  const [addItemForm, setAddItemForm] = useState({ quantity: '1', unitId: '' });
  
  const [showProductNotFoundModal, setShowProductNotFoundModal] = useState(false);
  const [quickProductMode, setQuickProductMode] = useState<'create' | 'link'>('create');
  const [quickProductForm, setQuickProductForm] = useState({ name: '', description: '', vendorId: '' });
  const [linkProductQuery, setLinkProductQuery] = useState('');
  const [linkProductResults, setLinkProductResults] = useState<Product[]>([]);
  
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: () => void; title: string; message: string; variant?: 'danger'|'warning'|'info' }>({
    isOpen: false, action: () => {}, title: '', message: ''
  });

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    fetchListDetails();
    fetchProducts();
  }, [listId]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const lowerQ = searchQuery.toLowerCase();
      // If it looks like a UPC (only numbers, >= 8 chars)
      if (/^\d{8,}$/.test(searchQuery)) {
        handleUPCSearch(searchQuery);
      } else {
        setFilteredProducts(products.filter(p => 
          p.name.toLowerCase().includes(lowerQ) ||
          p.upc.includes(searchQuery) ||
          (p.vendor_name && p.vendor_name.toLowerCase().includes(lowerQ))
        ));
      }
    } else {
      setFilteredProducts([]);
    }
  }, [searchQuery, products]);

  // If user stops typing linkProductQuery for 500ms, search
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
        showToast('Failed to load list details', 'error');
        onClose();
      }
    } catch (e) {
      showToast('Network error loading list', 'error');
      onClose();
    }
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setProducts(await res.json());
  };

  const finalizeList = () => {
    setConfirmState({
      isOpen: true,
      title: 'Finalize List?',
      message: 'Are you sure you want to finalize this purchase list? This will lock the list and prevent further edits.',
      variant: 'warning',
      action: async () => {
        const res = await fetch(`/api/purchase-lists/${listId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name: currentList?.name, status: 'finalized' })
        });
        if (res.ok) {
          showToast('List finalized successfully');
          fetchListDetails();
        }
        setConfirmState(s => ({ ...s, isOpen: false }));
      }
    });
  };

  const deleteList = () => {
    setConfirmState({
      isOpen: true,
      title: 'Delete List?',
      message: 'Are you sure you want to delete this purchase list? This cannot be undone.',
      variant: 'danger',
      action: async () => {
        const res = await fetch(`/api/purchase-lists/${listId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast('List deleted');
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
      handleProductClick(product);
    } else {
      setScannedUPC(upc);
      setQuickProductMode('create');
      setQuickProductForm({ name: '', description: '', vendorId: vendors[0]?.id || '' });
      setShowProductNotFoundModal(true);
    }
  };

  const handleProductClick = (product: Product, existingItem?: PurchaseListItem) => {
    setSelectedProductForAdd(product);
    setAddItemForm({
      quantity: existingItem ? String(existingItem.quantity) : '1',
      unitId: existingItem ? existingItem.unitId : (units[0]?.id || '')
    });
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
        unitId: addItemForm.unitId
      })
    });

    if (res.ok) {
      const data = await res.json();
      showToast(data._merged ? 'Updated item quantity' : 'Item added to list');
      fetchListDetails();
      setShowQuantityModal(false);
      setSelectedProductForAdd(null);
      setSearchQuery('');
      if (isScanning) startScanner();
    } else {
      showToast('Failed to add item', 'error');
    }
  };

  const deleteListItem = (itemId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Remove Item?',
      message: 'Are you sure you want to remove this item from the list?',
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
  const startScanner = () => {
    setIsScanning(true);
    setScannedUPC('');
    setTimeout(() => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        scannerRef.current.render(
          async (decodedText) => {
            stopScanner();
            handleUPCSearch(decodedText);
          },
          () => {} // ignore errors
        );
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleQuickProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickProductMode === 'create') {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...quickProductForm, upc: scannedUPC })
      });
      if (res.ok) {
        const p = await res.json();
        fetchProducts();
        setShowProductNotFoundModal(false);
        handleProductClick(p);
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to create', 'error');
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
      showToast('UPC linked successfully');
      fetchProducts();
      setShowProductNotFoundModal(false);
      handleProductClick(p);
    } else {
      const d = await res.json();
      showToast(d.error || 'Failed to link', 'error');
    }
  };

  if (!currentList) return null;

  return (
    <IonContent className="bg-gray-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.03),transparent_40%)] pointer-events-none" />
      
      {/* Header */}
      <div className="safe-area-top bg-gray-900/80 backdrop-blur-md border-b border-gray-800/60 sticky top-0 z-50">
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { stopScanner(); onClose(); }} className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-all-200">
              <IonIcon icon={closeOutline} className="text-xl" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white">{currentList.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${currentList.status === 'finalized' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  {currentList.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">• {currentList.items?.length || 0} items</span>
              </div>
            </div>
          </div>
          
          {currentList.status === 'draft' && (
            <div className="flex items-center gap-2">
              <button data-tooltip="Lock list" onClick={finalizeList} className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 text-xs font-bold shadow-lg shadow-teal-500/10 transition-all-200 flex items-center gap-1">
                <IonIcon icon={checkmarkCircleOutline} />
                Finalize
              </button>
              <button data-tooltip="Delete list" onClick={deleteList} className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 transition-all-200">
                <IonIcon icon={trashOutline} />
              </button>
            </div>
          )}
        </div>

        {currentList.status === 'draft' && (
          <div className="px-4 pb-3.5 flex gap-2">
            <div className="relative flex-1">
              <IonIcon icon={searchOutline} className="absolute left-3.5 top-1/2 -trangray-y-1/2 text-gray-500 text-lg" />
              <input 
                type="text" placeholder="Search or type UPC..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10 text-sm transition-all-200"
              />
            </div>
            <button data-tooltip="Scan barcode" onClick={isScanning ? stopScanner : startScanner} className={`px-4 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold transition-all-200 ${isScanning ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20'}`}>
              <IonIcon icon={scanOutline} className="text-lg" />
              {isScanning ? 'Stop' : 'Scan'}
            </button>
          </div>
        )}
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4 pb-24">
        {isScanning && (
          <div className="bg-gray-950 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 relative">
            <div className="scanner-laser" />
            <div id="reader" className="w-full"></div>
            <div className="absolute top-3 right-3 z-10">
              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-pulse">Camera Active</span>
            </div>
          </div>
        )}

        {searchQuery && filteredProducts.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
            <div className="px-4 py-2 bg-gray-950 border-b border-gray-800 text-xs font-semibold text-gray-400">Matching Products ({filteredProducts.length})</div>
            {filteredProducts.map(product => (
              <button key={product.id} onClick={() => handleProductClick(product)} className="w-full px-4 py-3 text-left hover:bg-gray-800/50 border-b border-gray-800/40 last:border-0 flex justify-between items-center transition-all-200">
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
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Items in List</h2>
          {(!currentList.items || currentList.items.length === 0) ? (
            <div className="glass-panel rounded-2xl p-8 text-center border border-dashed border-gray-800">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 text-gray-500 mb-3"><IonIcon icon={cubeOutline} className="text-xl" /></div>
              <p className="text-gray-400 text-sm font-medium">No items added yet</p>
              <p className="text-gray-500 text-xs mt-1">Search or scan a barcode to add products</p>
            </div>
          ) : (
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800/60 shadow-sm overflow-hidden divide-y divide-gray-800/40">
              {currentList.items.map(item => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-900/30 transition-all-200" onClick={() => { if(currentList.status === 'draft' && product) handleProductClick(product, item); }}>
                    <div>
                      <h3 className="font-semibold text-gray-200 text-sm">{item.product_name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">UPC: {item.product_upc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-lg bg-gray-800 text-teal-400 text-sm font-bold border border-gray-700/50">{item.quantity} {item.unit_abbreviation}</span>
                      {currentList.status === 'draft' && (
                        <button onClick={(e) => { e.stopPropagation(); deleteListItem(item.id); }} className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-all-200"><IonIcon icon={trashOutline} /></button>
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
      <IonModal isOpen={showQuantityModal} onDidDismiss={() => { setShowQuantityModal(false); if (isScanning) startScanner(); }}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Item Quantity</h2>
            <button onClick={() => { setShowQuantityModal(false); if (isScanning) startScanner(); }} className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={closeOutline} /></button>
          </div>
          {selectedProductForAdd && (
            <div className="mb-6 p-4 rounded-2xl bg-gray-950 border border-gray-800">
              <h3 className="font-bold text-white text-sm">{selectedProductForAdd.name}</h3>
              <p className="text-[10px] font-mono text-gray-500 mt-2">UPC: {selectedProductForAdd.upc}</p>
            </div>
          )}
          <form onSubmit={submitAddItem} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quantity</label>
              <input type="number" step="any" required value={addItemForm.quantity} onChange={e => setAddItemForm({ ...addItemForm, quantity: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all-200" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Unit</label>
              <select value={addItemForm.unitId} onChange={e => setAddItemForm({ ...addItemForm, unitId: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all-200">
                {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
              </select>
            </div>
            <button type="submit" className="w-full py-3.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 font-bold shadow-lg shadow-teal-500/10 transition duration-200">Save Item</button>
          </form>
        </div>
      </IonModal>

      <IonModal isOpen={showProductNotFoundModal} onDidDismiss={() => { setShowProductNotFoundModal(false); if (isScanning) startScanner(); }}>
        <div className="p-6 bg-gray-900 text-gray-100 rounded-t-3xl border-t border-gray-800 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Unknown Barcode</h2>
            <button onClick={() => { setShowProductNotFoundModal(false); if (isScanning) startScanner(); }} className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-all-200"><IonIcon icon={closeOutline} /></button>
          </div>
          <p className="text-sm text-gray-400 mb-4">Barcode <span className="font-mono font-bold text-teal-400 bg-gray-950 px-1 py-0.5 rounded">{scannedUPC}</span> is not registered.</p>
          
          <div className="flex rounded-lg bg-gray-950 p-1 mb-6 border border-gray-800">
            <button onClick={() => setQuickProductMode('create')} className={`flex-1 text-sm font-semibold py-2 rounded-md transition-all-200 ${quickProductMode === 'create' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Create New</button>
            <button onClick={() => setQuickProductMode('link')} className={`flex-1 text-sm font-semibold py-2 rounded-md transition-all-200 ${quickProductMode === 'link' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Link to Existing</button>
          </div>

          {quickProductMode === 'create' ? (
            <form onSubmit={handleQuickProductSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Name</label>
                <input type="text" required value={quickProductForm.name} onChange={e => setQuickProductForm({ ...quickProductForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" placeholder="Product name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vendor</label>
                <select value={quickProductForm.vendorId} onChange={e => setQuickProductForm({ ...quickProductForm, vendorId: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200">
                  <option value="">No Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-gray-950 font-bold shadow-lg transition duration-200">Create & Add to List</button>
            </form>
          ) : (
            <div className="space-y-4">
              <input type="text" value={linkProductQuery} onChange={e => setLinkProductQuery(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-teal-500/50 transition-all-200" placeholder="Search for existing product..." />
              <div className="space-y-2">
                {linkProductResults.map(p => (
                  <button key={p.id} onClick={() => linkProduct(p)} className="w-full p-3 bg-gray-950 rounded-xl border border-gray-800 text-left hover:border-teal-500/50 transition-all-200">
                    <div className="font-semibold text-sm text-white">{p.name}</div>
                    <div className="text-xs text-gray-500">Current UPC: {p.upc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </IonModal>

      <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))} onConfirm={confirmState.action} />
    </IonContent>
  );
}
