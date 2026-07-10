'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { LogOut, ChevronDown, Home, BookOpen, History, Info } from 'lucide-react';

interface UserProfile {
  id: string;
  fullName: string;
  loginToken: string;
  createdAt: string;
}

const MESSAGES = {
  appName: 'ALP.ai',
  welcomePrefix: 'Xin chào, ',
  signOutText: 'Đăng xuất',
  wcagStandardBadge: 'WCAG 2.2 AA'
};

export function Header() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
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

  // Đóng dropdown khi nhấn ra ngoài hoặc nhấn ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        document.getElementById('dropdown-trigger')?.focus();
      }
    };

    document.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Đóng menu khi chuyển trang
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    localStorage.removeItem('alp_ai_user');
    setCurrentUser(null);
    router.push('/');
  };

  const menuItems = [
    {
      label: 'Trang chủ',
      href: '/dashboard',
      icon: Home
    },
    {
      label: 'Môn học',
      href: '/subjects',
      icon: BookOpen
    },
    {
      label: 'Lịch sử',
      href: '/history',
      icon: History
    },
    {
      label: 'Hướng dẫn',
      href: '/guide',
      icon: Info
    },
    {
      label: 'Đăng xuất',
      onClick: handleSignOut,
      icon: LogOut,
      isDanger: true
    }
  ];

  const handleItemClick = (href: string) => {
    setIsOpen(false);
    router.push(href);
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
            {MESSAGES.appName}
          </h1>
        </div>

        {/* Menu điều hướng ngang trên Desktop */}
        {currentUser && (
          <nav className="hidden md:flex items-center space-x-6" aria-label="Menu chính">
            {menuItems.filter(item => !item.isDanger).map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => router.push(item.href!)}
                  className={`text-sm font-bold transition-all relative py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1.5 ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400 font-extrabold' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-fade-in" />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Menu điều hướng & Thông tin người dùng */}
        <div className="flex items-center space-x-4">
          {currentUser && (
            <>
              {/* Dropdown Menu chỉ hiển thị trên Mobile */}
              <div className="relative dropdown-container md:hidden">
                <button
                  id="dropdown-trigger"
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  aria-controls="navigation-dropdown"
                  className="flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                >
                  <span>Menu</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {isOpen && (
                  <div
                    id="navigation-dropdown"
                    role="menu"
                    aria-label="Menu điều hướng"
                    className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-2 z-50 animate-scale-up"
                  >
                    {/* Thông tin tài khoản đăng nhập */}
                    <div className="px-4 py-3 mb-1 border-b border-gray-100 dark:border-gray-800 text-left">
                      <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Tài khoản đăng nhập</p>
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate mt-0.5">
                        {currentUser.fullName}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                      {menuItems.map((item) => (
                        <React.Fragment key={item.label}>
                          {item.isDanger && (
                            <hr className="my-1 border-gray-100 dark:border-gray-800" />
                          )}
                          <button
                            role="menuitem"
                            onClick={item.onClick ? item.onClick : () => handleItemClick(item.href!)}
                            className={`w-full flex items-center space-x-3 p-2.5 rounded-xl text-left transition-all duration-150 group focus:outline-none focus:ring-2 ${
                              item.isDanger
                                ? 'hover:bg-red-50 dark:hover:bg-red-950/30 focus:ring-red-500'
                                : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:ring-blue-500'
                            }`}
                          >
                            <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${
                              item.isDanger
                                ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                                : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                            }`} aria-hidden="true">
                              <item.icon className="h-5 w-5" />
                            </div>
                            <div className={`text-sm font-bold ${
                              item.isDanger
                                ? 'text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300'
                                : 'text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            }`}>
                              {item.label}
                            </div>
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Thông tin tài khoản & nút Đăng xuất hiển thị trực tiếp trên Desktop */}
              <div className="hidden md:flex flex-col items-end text-right space-y-0.5 animate-fade-in">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {MESSAGES.welcomePrefix}<strong className="font-bold text-gray-900 dark:text-white">{currentUser.fullName}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none rounded px-1"
                >
                  <span>{MESSAGES.signOutText}</span>
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </>
          )}

          {currentUser ? null : (
            <span className="text-sm font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
              {MESSAGES.wcagStandardBadge}
            </span>
          )}
        </div>

      </div>
    </header>
  );
}
