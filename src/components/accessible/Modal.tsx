'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  trigger,
  title,
  description,
  children
}: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      
      <Dialog.Portal>
        {/* Nền mờ */}
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in" />
        
        {/* Hộp nội dung */}
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <Dialog.Content
            className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-950 p-6 shadow-2xl border border-gray-100 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 animate-scale-up"
            aria-describedby="modal-description"
          >
            {/* Tiêu đề */}
            <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white mb-2 focus:outline-none">
              {title}
            </Dialog.Title>

            {/* Mô tả */}
            <Dialog.Description
              id="modal-description"
              className={description ? "text-base text-gray-500 dark:text-gray-400 mb-4" : "sr-only"}
            >
              {description || ""}
            </Dialog.Description>

            {/* Nội dung */}
            <div className="mt-2">{children}</div>

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
