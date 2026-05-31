import React from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Trang đăng nhập, ALP.ai',
};

export default function LoginPage() {
  return <LoginForm />;
}
