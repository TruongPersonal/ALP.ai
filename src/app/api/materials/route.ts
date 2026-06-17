import { NextResponse, after } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTextFromFile } from '@/lib/extractor';
import { generateMaterialDetails } from '@/lib/gemini';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { fileUrl, fileName, fileMime, subjectId } = await request.json();

    if (!fileUrl || !subjectId) {
      return NextResponse.json(
        { error: 'Thiếu thông tin tài liệu hoặc mã môn học.' },
        { status: 400 }
      );
    }

    // 1. Tải tài liệu từ URL của Storage để phân tích
    let fileBuffer: Buffer;
    try {
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Tải file từ Storage thất bại: ${fileResponse.statusText}`);
      }
      const arrayBuffer = await fileResponse.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (fetchError: any) {
      console.error('Lỗi:', fetchError);
      return NextResponse.json(
        { error: `Không thể tải tài liệu: ${fetchError.message}` },
        { status: 422 }
      );
    }

    // 2. Trích xuất văn bản thô từ tài liệu tải về
    let rawText = '';
    try {
      rawText = await extractTextFromFile(fileBuffer, fileMime);
    } catch (extractError: any) {
      console.error('Lỗi trích xuất tài liệu:', extractError);
      return NextResponse.json(
        { error: `Lỗi trích xuất tài liệu: ${extractError.message}` },
        { status: 422 }
      );
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Nội dung tài liệu trống hoặc không đủ dữ liệu.' },
        { status: 422 }
      );
    }

    // 3. Khởi tạo/Cập nhật bản ghi materials với trạng thái 'processing'
    console.log('--- Khởi tạo tài liệu trong CSDL:', fileName);
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
      console.error('Lỗi:', dbError);
      return NextResponse.json(
        { error: 'Không thể cập nhật học liệu vào CSDL!' },
        { status: 500 }
      );
    }

    // 4. Gọi AI Pipeline chạy ngầm dưới nền bằng API after()
    after(async () => {
      try {
        console.log('--- Chạy ngầm AI Pipeline cho tài liệu:', fileName);
        const { summaryMarkdown, questions } = await generateMaterialDetails(rawText);

        console.log(`AI Pipeline chạy ngầm hoàn tất. Sinh thành công ${questions.length} câu hỏi.`);

        // Cập nhật trạng thái thành công, tóm tắt và câu hỏi
        const { error: updateErr } = await supabase
          .from('materials')
          .update({
            summary_markdown: summaryMarkdown,
            questions: questions,
            status: 'success'
          })
          .eq('id', material.id);

        if (updateErr) {
          console.error('Lỗi cập nhật CSDL sau AI Pipeline:', updateErr);
        }
      } catch (aiError: any) {
        console.error('Lỗi chạy ngầm AI Pipeline:', aiError);
        // Cập nhật trạng thái thất bại
        await supabase
          .from('materials')
          .update({
            status: 'failed',
            summary_markdown: `Gặp sự cố khi phân tích tài liệu: ${aiError.message || 'Lỗi hệ thống AI.'}`
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

  } catch (error: any) {
    console.error('Lỗi:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}
