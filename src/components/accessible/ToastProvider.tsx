'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'info' | 'error';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, detailedMessage?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [liveMessage, setLiveMessage] = useState('');

  const showToast = useCallback((message: string, type: ToastType = 'success', detailedMessage?: string) => {
    setToast({ message, type });
    setLiveMessage(detailedMessage || message);
    // Tự động xóa thông điệp sau 2.5 giây
    setTimeout(() => {
      setToast(null);
      setLiveMessage('');
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Vùng Live Region dùng chung */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>


      {/* Giao diện Toast nổi góc màn hình */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center space-x-3 rounded-xl border px-5 py-4 shadow-2xl transition-all duration-300 animate-slide-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
              : 'bg-blue-50 dark:bg-blue-950/90 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
          }`}
        >
          <span className="text-base font-bold">{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
