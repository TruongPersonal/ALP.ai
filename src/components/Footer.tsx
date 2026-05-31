import React from 'react';

const dict = {
  footerCopyright: 'All right reserved.',
  footerStandard: 'Tiêu chuẩn tiếp cận số Việt Nam (WCAG 2.2)'
};

export function Footer() {
  return (
    <footer role="contentinfo" className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6 mt-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-gray-500 dark:text-gray-400">
        <p className="text-base text-center md:text-left">
          &copy; {new Date().getFullYear()} {dict.footerCopyright}
        </p>
        <div className="mt-2 md:mt-0 flex space-x-6">
          <span className="text-sm text-center md:text-right">{dict.footerStandard}</span>
        </div>
      </div>
    </footer>
  );
}
