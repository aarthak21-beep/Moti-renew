import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { translations, Language } from '../i18n/translations';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  itemName: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
}) => {
  const { user } = useAuth();
  const lang: Language = user?.language || 'en';
  const t = translations[lang] || translations.en;

  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {message}
            </p>
            <div className="mt-2.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
              {itemName}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {t.actions.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 disabled:opacity-50 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {loading ? 'Deleting...' : t.actions.delete}
          </button>
        </div>

      </div>
    </div>
  );
};
