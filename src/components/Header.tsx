'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { LogOut } from 'lucide-react';

interface UserProfile {
  id: string;
  fullName: string;
  loginToken: string;
  createdAt: string;
}

const MESSAGES = {
  appName: 'ALP.ai',
  srOnlyAppName: 'Trợ lý số học tập cho người khiếm thị',
  welcomePrefix: 'Xin chào, ',
  signOutText: 'Đăng xuất',
  wcagStandardBadge: 'WCAG 2.2 AA'
};

export function Header() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    const loadSavedUser = () => {
      const savedUserJson = localStorage.getItem('alp_ai_user');
      if (!active) return;
      if (savedUserJson) {
        try {
          setCurrentUser(JSON.parse(savedUserJson));
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };

    // Độc lập luồng tải trạng thái khởi tạo
    const timer = setTimeout(loadSavedUser, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pathname]);

  const handleSignOut = () => {
    localStorage.removeItem('alp_ai_user');
    setCurrentUser(null);
    router.push('/');
  };

  return (
    <header role="banner" className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        
        {/* Logo và tiêu đề */}
        <div className="flex items-center space-x-3">
          <Image 
            src="/logo.png" 
            alt="" 
            width={40}
            height={40}
            className="h-10 w-10 object-contain rounded-lg shadow-sm" 
            aria-hidden="true"
          />
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {MESSAGES.appName} <span className="sr-only">{MESSAGES.srOnlyAppName}</span>
          </h1>
        </div>

        {/* Thông tin người dùng */}
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <div className="flex items-center space-x-3 sm:space-x-4 animate-fade-in">
              <div className="flex flex-col items-end text-right">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {MESSAGES.welcomePrefix}<strong className="font-bold text-gray-900 dark:text-white">{currentUser.fullName}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none rounded px-1 mt-0.5"
                >
                  <span>{MESSAGES.signOutText}</span>
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <span className="text-sm font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
              {MESSAGES.wcagStandardBadge}
            </span>
          )}
        </div>

      </div>
    </header>
  );
}
