'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';

export function GlobalShortcuts() {
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Phím tắt Shift + Escape để quay về bảng điều khiển
      if (e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        router.push('/dashboard');
        showToast('Quay về trang chủ', 'success', 'Đã quay về trang bảng điều khiển chính.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router, showToast]);

  return null;
}
