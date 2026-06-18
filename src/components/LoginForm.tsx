'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAppError } from '@/lib/errorHelper';

const MESSAGES = {
  loginTitle: 'Tham gia hệ thống',
  loginSub: 'Dành cho Người học khiếm thị',
  inputLabel: 'Mã đăng nhập',
  inputPlaceholder: 'Ví dụ: ALP123',
  btnSubmit: 'Đăng nhập',
  btnSubmitting: 'Đang kết nối...',
};

export function LoginForm() {
  const [loginToken, setLoginToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        body: JSON.stringify({ token: loginToken }),
      });

      const data = (await response.json()) as { error?: string; user?: unknown };

      if (!response.ok) {
        throw new Error(data.error || 'login_token_invalid');
      }

      localStorage.setItem('alp_ai_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorObject = err as Error;
      setError(errorObject.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const appError = error ? getAppError(error) : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 transition-colors duration-200">

        <div className="mb-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            {MESSAGES.loginTitle}
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400">
            {MESSAGES.loginSub}
          </p>
        </div>

        {appError && (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-800 animate-fade-in"
          >
            <p className="text-base font-bold text-red-800 dark:text-red-300">
              <span className="sr-only">{appError.detailed}</span>
              <span aria-hidden="true">{appError.visual}</span>
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="token-input"
              className="block text-lg font-bold text-gray-800 dark:text-gray-200 mb-2"
            >
              {MESSAGES.inputLabel}
            </label>
            <input
              id="token-input"
              type="text"
              required
              disabled={loading}
              value={loginToken}
              onChange={(e) => setLoginToken(e.target.value)}
              placeholder={MESSAGES.inputPlaceholder}
              className="w-full text-xl font-bold px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
              aria-required="true"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-xl font-bold py-4 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-5 h-5 border-2 border-t-transparent border-white rounded-full mr-2" aria-hidden="true"></span>
                <span>{MESSAGES.btnSubmitting}</span>
              </>
            ) : (
              <span>{MESSAGES.btnSubmit}</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
