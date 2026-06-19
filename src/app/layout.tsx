import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { SkipLink } from '@/components/accessible/SkipLink';
import { GlobalShortcuts } from '@/components/accessible/GlobalShortcuts';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ToastProvider } from '@/components/accessible/ToastProvider';
import './globals.css';

// Cấu hình font
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'ALP.ai',
  description: 'Trợ lý số hỗ trợ học tập cho người khiếm thị theo tiêu chuẩn WCAG 2.2.'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200" suppressHydrationWarning>
        
        <ToastProvider>
          {/* Phím tắt toàn cục */}
          <GlobalShortcuts />

          {/* Phím tắt nhảy nhanh */}
          <SkipLink />

          {/* Header */}
          <Header />

          {/* Nội dung chính */}
          <main
            id="main-content"
            role="main"
            className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 focus:outline-none"
          >
            {children}
          </main>

          {/* Footer */}
          <Footer />
        </ToastProvider>

      </body>
    </html>
  );
}

