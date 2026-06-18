import { NextResponse, after } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTextFromFile } from '@/lib/extractor';
import { generateMaterialDetails } from '@/lib/gemini';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { fileUrl, fileMime, subjectId } = await request.json();

    if (!fileUrl || !subjectId) {
      return NextResponse.json(
        { error: 'Thiếu thông tin tài liệu hoặc mã môn học.' },
        { status: 400 }
      );
    }

    // Tải tệp từ storage
    let fileBuffer: Buffer;
    try {
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Tải file thất bại: ${fileResponse.statusText}`);
      }
      const arrayBuffer = await fileResponse.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (fetchError: unknown) {
      const err = fetchError as Error;
      return NextResponse.json(
        { error: `Không thể tải tài liệu: ${err.message}` },
        { status: 422 }
      );
    }

    // Trích xuất chữ
    let rawText = '';
    try {
      rawText = await extractTextFromFile(fileBuffer, fileMime);
    } catch (extractError: unknown) {
      const err = extractError as Error;
      return NextResponse.json(
        { error: `Lỗi trích xuất tài liệu: ${err.message}` },
        { status: 422 }
      );
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Nội dung tài liệu trống hoặc không đủ dữ liệu.' },
        { status: 422 }
      );
    }

    // Khởi tạo trạng thái processing trong CSDL
    const { data: material, error: dbError } = await supabase
      .from('materials')
      .upsert({
        subject_id: subjectId,
        file_url: fileUrl,
        status: 'processing',
        summary_markdown: 'Trợ lý AI đang tóm tắt tài liệu...',
        converted: rawText,
        questions: [],
      }, {
        onConflict: 'subject_id'
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: 'Không thể cập nhật học liệu vào CSDL!' },
        { status: 500 }
      );
    }

    // Chạy ngầm AI Pipeline
    after(async () => {
      try {
        const { summaryMarkdown, questions } = await generateMaterialDetails(rawText);

        await supabase
          .from('materials')
          .update({
            summary_markdown: summaryMarkdown,
            questions: questions,
            status: 'success'
          })
          .eq('id', material.id);
      } catch (aiError: unknown) {
        const err = aiError as Error;
        await supabase
          .from('materials')
          .update({
            status: 'failed',
            summary_markdown: `Gặp sự cố khi phân tích tài liệu: ${err.message || 'Lỗi hệ thống AI.'}`
          })
          .eq('id', material.id);
      }
    });

    return NextResponse.json({
      message: 'Tải tài liệu thành công. Trợ lý đang phân tích!',
      material: {
        id: material.id,
        subjectId: material.subject_id,
        status: 'processing',
        updatedAt: material.updated_at,
      },
    });

  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}
