import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp mã đăng nhập!' },
        { status: 400 }
      );
    }

    const trimmedToken = token.trim();

    // Tìm hồ sơ người dùng theo token
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('login_token', trimmedToken)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Lỗi kết nối tới hệ thống dữ liệu!' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Mã đăng nhập không chính xác!' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: 'Đăng nhập thành công!',
      user: {
        id: profile.id,
        fullName: profile.full_name,
        loginToken: profile.login_token,
        createdAt: profile.created_at,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

