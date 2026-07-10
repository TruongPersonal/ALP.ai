'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDanger = false
}: ConfirmModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* Nền mờ */}
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in" />
        
        {/* Hộp nội dung */}
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <Dialog.Content
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-950 p-6 shadow-2xl border border-gray-100 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 animate-scale-up"
            aria-describedby="confirm-description"
          >
            <div className="flex items-start space-x-4">
              {isDanger && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full shrink-0">
                  <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                </div>
              )}
              
              <div className="space-y-2 text-left flex-grow">
                {/* Tiêu đề */}
                <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white focus:outline-none">
                  {title}
                </Dialog.Title>

                {/* Mô tả */}
                <Dialog.Description
                  id="confirm-description"
                  className="text-base text-gray-500 dark:text-gray-400 leading-normal"
                >
                  {description}
                </Dialog.Description>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="mt-6 flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-bold text-base transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {cancelText}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose(false);
                }}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-white font-bold text-base transition-all focus:ring-2 focus:outline-none ${
                  isDanger
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-md shadow-red-500/10'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-md shadow-blue-500/10'
                }`}
              >
                {confirmText}
              </button>
            </div>

            {/* Nút đóng (X) */}
            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute right-4 top-4 rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Đóng hộp thoại"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
