
import React from 'react';
import { CloseIcon } from './icons/NavIcons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out animate-slideInUp">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
