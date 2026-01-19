import React from 'react';
import { createPortal } from 'react-dom';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  warning = null
}) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative ${theme.card} rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-in`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-lg ${theme.textSecondary} hover:${theme.text} transition-colors`}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-full ${danger ? 'bg-red-500/20' : 'bg-yellow-500/20'} flex items-center justify-center mb-4`}>
          <ExclamationTriangleIcon className={`h-6 w-6 ${danger ? 'text-red-400' : 'text-yellow-400'}`} />
        </div>

        {/* Content */}
        <h3 className={`text-xl font-bold ${theme.text} mb-2`}>{title}</h3>
        <p className={`${theme.textSecondary} mb-4`}>{message}</p>

        {/* Warning message */}
        {warning && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">{warning}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2.5 rounded-xl ${theme.bgSecondary} ${theme.text} hover:${theme.bgTertiary} transition-all font-medium`}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${
              danger 
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
