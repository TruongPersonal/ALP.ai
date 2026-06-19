'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from './ToastProvider';

export function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Không kích hoạt trên trang đăng nhập (/) hoặc trang bảng điều khiển (/dashboard)
      if (pathname === '/' || pathname === '/dashboard') {
        return;
      }

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
  }, [router, showToast, pathname]);

  return null;
}
