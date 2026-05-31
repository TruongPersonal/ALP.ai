'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const dict = {
  loginTitle: 'Tham gia hệ thống',
  loginSub: 'Dành cho Người học khiếm thị',
  inputVoiceGuide: 'Vui lòng nhập mã đăng nhập gồm 6 chữ số (Ví dụ: ALP123).',
  errorLabel: 'Lỗi đăng nhập: ',
  inputLabel: 'Mã đăng nhập',
  inputPlaceholder: 'Ví dụ: ALP123',
  btnSubmit: 'Đăng nhập',
  btnSubmitting: 'Đang kết nối...',
  errFail: 'Tham gia thất bại.',
  errConnect: 'Đã xảy ra lỗi kết nối.'
};

export function LoginForm() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Kiểm tra đăng nhập cũ
  useEffect(() => {
    const savedUser = localStorage.getItem('alp_ai_user');
    if (savedUser) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || dict.errFail);
      }

      // Lưu thông tin người dùng vào LocalStorage
      localStorage.setItem('alp_ai_user', JSON.stringify(data.user));

      // Chuyển hướng đến Dashboard học tập
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || dict.errConnect);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 transition-colors duration-200">

        {/* Hướng dẫn bằng giọng nói dành cho Screen Reader */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            {dict.loginTitle}
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400">
            {dict.loginSub}
          </p>
        </div>

        {/* Khối thông báo lỗi động bằng ARIA Alert */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-800 animate-fade-in"
          >
            <p className="text-base font-bold text-red-800 dark:text-red-300 flex items-center">
              <span className="sr-only">{dict.errorLabel}</span>
              {error}
            </p>
          </div>
        )}

        {/* Form đăng nhập tiếp cận */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="token-input"
              className="block text-lg font-bold text-gray-800 dark:text-gray-200 mb-2"
            >
              {dict.inputLabel}
            </label>
            <input
              id="token-input"
              type="text"
              required
              disabled={loading}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={dict.inputPlaceholder}

              className="w-full text-xl font-bold px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
              aria-required="true"
              aria-describedby="token-input-description"
            />
            <span id="token-input-description" className="sr-only">
              {dict.inputVoiceGuide}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-xl font-bold py-4 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-5 h-5 border-2 border-t-transparent border-white rounded-full mr-2" aria-hidden="true"></span>
                <span>{dict.btnSubmitting}</span>
              </>
            ) : (
              <span>{dict.btnSubmit}</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
