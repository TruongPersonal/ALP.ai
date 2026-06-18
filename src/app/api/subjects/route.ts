import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Lấy danh sách môn học
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Thiếu thông tin người dùng!' },
        { status: 400 }
      );
    }

    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*, materials:materials(id, summary_markdown, status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Lỗi kết nối tới CSDL!' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subjects });
  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

// Thêm môn học
export async function POST(request: Request) {
  try {
    const { name, userId } = await request.json();

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Vui lòng điền tên môn học!' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    const { data: newSubject, error } = await supabase
      .from('subjects')
      .insert({
        name: trimmedName,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Đã xảy ra lỗi hệ thống!' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Thêm môn học thành công!',
      subject: newSubject,
    });
  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

// Cập nhật tên môn học
export async function PATCH(request: Request) {
  try {
    const { id, name } = await request.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Thiếu tên môn học!' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    const { data: updatedSubject, error } = await supabase
      .from('subjects')
      .update({
        name: trimmedName,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Đã xảy ra lỗi hệ thống!' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Cập nhật tên môn học thành công!',
      subject: updatedSubject,
    });
  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

// Xóa môn học
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Thiếu mã môn học!' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Đã xảy ra lỗi hệ thống!' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Xóa môn học thành công!',
    });
  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}
