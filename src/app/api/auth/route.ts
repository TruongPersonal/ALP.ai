import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/auth
 */
export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp mã đăng nhập!' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();

    // 1. Kiểm tra xem login token có tồn tại?
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('login_token', cleanToken)
      .maybeSingle();

    if (error) {
      console.error('Lỗi:', error);
      return NextResponse.json(
        { error: 'Lỗi kết nối tới hệ thống dữ liệu!' },
        { status: 500 }
      );
    }

    // 2. Nếu không tìm thấy tài khoản
    if (!profile) {
      return NextResponse.json(
        { error: 'Mã đăng nhập không chính xác!' },
        { status: 401 }
      );
    }

    // 3. Thông tin người dùng
    return NextResponse.json({
      message: 'Đăng nhập thành công!',
      user: {
        id: profile.id,
        fullName: profile.full_name,
        loginToken: profile.login_token,
        createdAt: profile.created_at,
      },
    });
  } catch (error) {
    console.error('Lỗi:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}
