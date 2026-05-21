import React, { useState, useEffect } from 'react';
import { IonApp, IonContent, IonHeader, IonToolbar, IonIcon } from '@ionic/react';
import { clipboardOutline, cubeOutline, businessOutline, optionsOutline } from 'ionicons/icons';
import { User, Vendor, Unit, Product, PurchaseList } from './types';
import { AuthScreen } from './components/AuthScreen';
import { ListsTab } from './components/ListsTab';
import { ProductsTab } from './components/ProductsTab';
import { VendorsTab } from './components/VendorsTab';
import { UnitsTab } from './components/UnitsTab';
import { ListEditScreen } from './components/ListEditScreen';
import { ToastContainer } from './components/Toast';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  
  const [activeTab, setActiveTab] = useState<'lists' | 'products' | 'vendors' | 'units'>('lists');
  const [activeListId, setActiveListId] = useState<string | null>(null);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lists, setLists] = useState<PurchaseList[]>([]);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => setUser(data.user))
        .catch(handleLogout);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchVendors(); fetchUnits(); fetchProducts(); fetchLists();
    }
  }, [token, activeTab]);

  const fetchVendors = async () => { const r = await fetch('/api/vendors', { headers: { 'Authorization': `Bearer ${token}` } }); if(r.ok) setVendors(await r.json()); };
  const fetchUnits = async () => { const r = await fetch('/api/units', { headers: { 'Authorization': `Bearer ${token}` } }); if(r.ok) setUnits(await r.json()); };
  const fetchProducts = async () => { const r = await fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } }); if(r.ok) setProducts(await r.json()); };
  const fetchLists = async () => { const r = await fetch('/api/purchase-lists', { headers: { 'Authorization': `Bearer ${token}` } }); if(r.ok) setLists(await r.json()); };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null); setUser(null); setActiveListId(null);
  };

  if (!token) {
    return <AuthScreen onAuth={(t, u) => { setToken(t); setUser(u); }} />;
  }

  return (
    <IonApp>
      <ToastContainer />
      
      {activeListId ? (
        <ListEditScreen token={token} listId={activeListId} vendors={vendors} units={units} onClose={() => { setActiveListId(null); fetchLists(); }} />
      ) : (
        <>
          <IonHeader className="ion-no-border">
            <IonToolbar className="px-4 py-3 bg-gray-900 border-b border-gray-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">ReOrder Pro</h1>
                  <p className="text-[10px] text-gray-500 mt-0.5">Logged in as <span className="text-teal-400 font-semibold">{user?.username}</span></p>
                </div>
                <button onClick={handleLogout} className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold border border-gray-700/50 transition-all-200">
                  Sign Out
                </button>
              </div>
            </IonToolbar>
          </IonHeader>

          <IonContent className="bg-gray-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.02),transparent_40%)] pointer-events-none" />
            
            <div className="p-4 max-w-md mx-auto space-y-6 pb-24">
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel rounded-2xl p-4 border border-gray-800/60">
                  <div className="flex items-center justify-between text-gray-500 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Active Lists</span>
                    <IonIcon icon={clipboardOutline} className="text-teal-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{lists.filter(l => l.status === 'draft').length}</div>
                </div>
                <div className="glass-panel rounded-2xl p-4 border border-gray-800/60">
                  <div className="flex items-center justify-between text-gray-500 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Products</span>
                    <IonIcon icon={cubeOutline} className="text-teal-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{products.length}</div>
                </div>
              </div>

              {activeTab === 'lists' && <ListsTab token={token} lists={lists} fetchLists={fetchLists} onSelectList={setActiveListId} />}
              {activeTab === 'products' && <ProductsTab token={token} products={products} vendors={vendors} fetchProducts={fetchProducts} fetchVendors={fetchVendors} />}
              {activeTab === 'vendors' && <VendorsTab token={token} vendors={vendors} fetchVendors={fetchVendors} />}
              {activeTab === 'units' && <UnitsTab token={token} units={units} fetchUnits={fetchUnits} />}
            </div>
          </IonContent>

          <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md border-t border-gray-800/60 px-4 py-2 flex justify-around items-center z-50 safe-area-bottom">
            {[
              { id: 'lists', icon: clipboardOutline, label: 'Lists' },
              { id: 'products', icon: cubeOutline, label: 'Products' },
              { id: 'vendors', icon: businessOutline, label: 'Vendors' },
              { id: 'units', icon: optionsOutline, label: 'Units' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all-200 ${activeTab === tab.id ? 'text-teal-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}>
                <IonIcon icon={tab.icon} className="text-lg" />
                <span className="text-[9px] uppercase tracking-wider font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </IonApp>
  );
}
