import React, { useEffect, useState } from 'react';
import { IonContent, IonIcon } from '@ionic/react';
import { closeOutline, businessOutline, callOutline, mailOutline, personOutline, globeOutline, cubeOutline } from 'ionicons/icons';
import { Vendor, Product } from '../types';
import { useTranslation } from '../i18n';
import { showToast } from './Toast';

interface Props {
  token: string;
  vendorId: string;
  onClose: () => void;
  onProductClick: (product: Product) => void;
}

export function VendorDetailScreen({ token, vendorId, onClose, onProductClick }: Props) {
  const { t } = useTranslation();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchVendorDetails();
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setVendor(await res.json());
      } else {
        showToast(t('toast.networkError'), 'error');
        onClose();
      }
      
      const pRes = await fetch(`/api/products`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (pRes.ok) {
        const allProducts = await pRes.json() as Product[];
        setProducts(allProducts.filter(p => p.vendorIds && p.vendorIds.includes(vendorId)));
      }
    } catch (e) {
      showToast(t('toast.networkError'), 'error');
      onClose();
    }
  };

  if (!vendor) return null;

  return (
    <IonContent className="bg-gray-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.03),transparent_40%)] pointer-events-none" />
      
      {/* Header */}
      <div className="safe-area-top bg-gray-900/80 backdrop-blur-md border-b border-gray-800/60 sticky top-0 z-50">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={onClose} className="p-2 min-touch-target rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-all-200">
            <IonIcon icon={closeOutline} className="text-xl" />
          </button>
          <h1 className="text-lg font-bold text-white">{vendor.name}</h1>
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-6 pb-24">
        {/* Core Info */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <IonIcon icon={businessOutline} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{vendor.name}</h2>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-800/60 space-y-3">
            {vendor.contactName && (
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <IonIcon icon={personOutline} className="text-teal-500" />
                <span>{vendor.contactName}</span>
              </div>
            )}
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="flex items-center gap-3 text-gray-400 hover:text-white text-sm transition-colors">
                <IonIcon icon={callOutline} className="text-teal-500" />
                <span>{vendor.phone}</span>
              </a>
            )}
            {vendor.email && (
              <a href={`mailto:${vendor.email}`} className="flex items-center gap-3 text-gray-400 hover:text-white text-sm transition-colors">
                <IonIcon icon={mailOutline} className="text-teal-500" />
                <span>{vendor.email}</span>
              </a>
            )}
            {vendor.website && (
              <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-white text-sm transition-colors">
                <IonIcon icon={globeOutline} className="text-teal-500" />
                <span className="truncate">{vendor.website}</span>
              </a>
            )}
            
            {(!vendor.contactName && !vendor.phone && !vendor.email && !vendor.website) && (
              <p className="text-gray-500 text-sm italic">{t('vendors.noContactInfo', 'No contact information available')}</p>
            )}
          </div>
        </div>

        {/* Products */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{t('vendors.productsOffered', 'Products Offered')}</h3>
          {products.length === 0 ? (
            <div className="bg-gray-900/50 rounded-2xl border border-dashed border-gray-800 p-5 text-center">
              <p className="text-gray-500 text-sm">{t('vendors.noProducts', 'No products assigned to this vendor')}</p>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden divide-y divide-gray-800">
              {products.map(p => (
                <button key={p.id} onClick={() => onProductClick(p)} className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-800/50 transition-all-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center">
                      <IonIcon icon={cubeOutline} className="text-lg" />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{p.name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{p.category} {p.brand ? `• ${p.brand}` : ''}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </IonContent>
  );
}
