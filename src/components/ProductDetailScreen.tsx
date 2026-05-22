import React, { useEffect, useState } from 'react';
import { IonContent, IonIcon } from '@ionic/react';
import { closeOutline, cubeOutline, star, businessOutline, documentTextOutline, barcodeOutline, pricetagOutline } from 'ionicons/icons';
import { Product, Vendor, ProductVariant } from '../types';
import { useTranslation } from '../i18n';
import { showToast } from './Toast';

interface Props {
  token: string;
  productId: string;
  onClose: () => void;
}

export function ProductDetailScreen({ token, productId, onClose }: Props) {
  const { t } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setProduct(await res.json());
      } else {
        showToast(t('toast.networkError'), 'error');
        onClose();
      }
      
      const vRes = await fetch(`/api/vendors`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (vRes.ok) {
        setVendors(await vRes.json());
      }
    } catch (e) {
      showToast(t('toast.networkError'), 'error');
      onClose();
    }
  };

  if (!product) return null;

  const productUpcs = product.upc ? product.upc.split(',') : [];
  const productVendorIds = product.vendorIds || [];
  const productVendors = vendors.filter(v => productVendorIds.includes(v.id));

  return (
    <IonContent className="bg-gray-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.03),transparent_40%)] pointer-events-none" />
      
      {/* Header */}
      <div className="safe-area-top bg-gray-900/80 backdrop-blur-md border-b border-gray-800/60 sticky top-0 z-50">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={onClose} className="p-2 min-touch-target rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-all-200">
            <IonIcon icon={closeOutline} className="text-xl" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white">{product.name}</h1>
            {product.isFrequentlyOrdered && <IonIcon icon={star} className="text-yellow-500 text-lg" />}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-6 pb-24">
        {/* Core Info */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400">
              <IonIcon icon={cubeOutline} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{product.name}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{product.category}</p>
            </div>
          </div>
          
          {(product.brand || product.description) && (
            <div className="pt-4 border-t border-gray-800/60 space-y-3">
              {product.brand && (
                <div className="flex items-start gap-3 text-gray-400 text-sm">
                  <IonIcon icon={pricetagOutline} className="mt-0.5 text-teal-500" />
                  <div>
                    <span className="block font-semibold text-gray-300">{t('products.brand')}</span>
                    {product.brand}
                  </div>
                </div>
              )}
              {product.description && (
                <div className="flex items-start gap-3 text-gray-400 text-sm">
                  <IonIcon icon={documentTextOutline} className="mt-0.5 text-teal-500" />
                  <div>
                    <span className="block font-semibold text-gray-300">{t('products.description')}</span>
                    {product.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vendors */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{t('products.vendors')}</h3>
          {productVendors.length === 0 ? (
            <div className="bg-gray-900/50 rounded-2xl border border-dashed border-gray-800 p-5 text-center">
              <p className="text-gray-500 text-sm">{t('products.unassigned')}</p>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden divide-y divide-gray-800">
              {productVendors.map(v => (
                <div key={v.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                    <IonIcon icon={businessOutline} className="text-lg" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{v.name}</div>
                    {v.contactName && <div className="text-gray-500 text-xs">{v.contactName}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UPCs and Variants */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{t('products.upcBarcodes')} &amp; {t('products.variants')}</h3>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
            
            {productUpcs.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 mb-2">Base Product UPCs</h4>
                <div className="flex flex-wrap gap-2">
                  {productUpcs.map((u, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xs font-mono text-gray-300 flex items-center gap-2">
                      <IonIcon icon={barcodeOutline} className="text-teal-500" />
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.variants && product.variants.length > 0 && (
              <div className={productUpcs.length > 0 ? "pt-4 border-t border-gray-800/60" : ""}>
                <h4 className="text-xs font-semibold text-gray-400 mb-2">{t('products.variants')}</h4>
                <div className="space-y-3">
                  {product.variants.map(v => (
                    <div key={v.id} className="bg-gray-950 border border-gray-800 p-3 rounded-xl">
                      <div className="font-semibold text-sm text-blue-400 mb-2">{v.name}</div>
                      <div className="flex flex-wrap gap-2">
                        {v.upcs.length > 0 ? v.upcs.map((u, i) => (
                          <span key={i} className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-md text-[10px] font-mono text-gray-400 flex items-center gap-1.5">
                            <IonIcon icon={barcodeOutline} className="text-gray-500" />
                            {u}
                          </span>
                        )) : <span className="text-xs text-gray-600">{t('products.noUpc')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {productUpcs.length === 0 && (!product.variants || product.variants.length === 0) && (
              <p className="text-gray-500 text-sm text-center">{t('products.noUpc')}</p>
            )}
          </div>
        </div>
      </div>
    </IonContent>
  );
}
