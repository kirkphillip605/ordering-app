import React, { useEffect, useRef } from 'react';
import { IonModal, IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Props {
  isOpen: boolean;
  onScan: (decodedText: string) => void;
  onCancel: () => void;
}

export function WebBarcodeScanner({ isOpen, onScan, onCancel }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal content is rendered and DOM node 'reader' exists
      const timer = setTimeout(() => {
        if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );

          scannerRef.current.render(
            (decodedText) => {
              // Successfully scanned
              if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
              }
              onScan(decodedText);
            },
            (error) => {
              // Ignore standard scan errors which fire constantly when no QR/barcode is detected
            }
          );
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      // Cleanup when modal closes
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }
  }, [isOpen, onScan]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onCancel}>
      <div className="flex flex-col h-full bg-gray-950 text-white">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800 bg-gray-900">
          <h2 className="text-base font-bold">Scan Barcode</h2>
          <button 
            onClick={onCancel} 
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all-200"
          >
            <IonIcon icon={closeOutline} className="text-xl" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div id="reader" className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-900"></div>
          <p className="mt-6 text-sm text-gray-500 text-center">
            Position the barcode inside the camera frame to scan it automatically.
          </p>
        </div>
      </div>
    </IonModal>
  );
}
