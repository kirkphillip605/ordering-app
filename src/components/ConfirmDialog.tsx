import React from 'react';
import { IonIcon } from '@ionic/react';
import { alertCircleOutline, warningOutline, trashOutline } from 'ionicons/icons';
import { useTranslation } from '../i18n';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen, title, message,
  confirmLabel, cancelLabel,
  variant = 'danger', onConfirm, onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const styles = {
    danger: {
      icon: trashOutline,
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      button: 'bg-rose-500 hover:bg-rose-600 text-white',
    },
    warning: {
      icon: warningOutline,
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      button: 'bg-amber-500 hover:bg-amber-600 text-gray-950',
    },
    info: {
      icon: alertCircleOutline,
      iconBg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      button: 'bg-teal-500 hover:bg-teal-600 text-gray-950',
    },
  };

  const s = styles[variant];

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-dialog mx-4 w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-2xl ${s.iconBg} border flex items-center justify-center mb-4`}>
            <IonIcon icon={s.icon} className="text-2xl" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 px-4 min-touch-target rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm transition-all-200 border border-gray-700/50">
            {cancelLabel || t('confirm.cancel')}
          </button>
          <button onClick={onConfirm} className={`flex-1 py-3 px-4 min-touch-target rounded-xl font-bold text-sm transition-all-200 ${s.button}`}>
            {confirmLabel || t('confirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
