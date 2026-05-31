'use client';

import React from 'react';

export function SkipLink() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainElement = document.getElementById('main-content');
    if (mainElement) {
      mainElement.setAttribute('tabindex', '-1');
      mainElement.focus();
      mainElement.addEventListener('blur', () => {
        mainElement.removeAttribute('tabindex');
      }, { once: true });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleClick}
      className="absolute left-4 top-4 z-100 -translate-y-24 rounded-md bg-blue-600 px-4 py-2 text-white font-medium shadow-md transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-blue-600"
    >
      Bỏ qua và đến nội dung chính
    </a>
  );
}
