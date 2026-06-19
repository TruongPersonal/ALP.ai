import { NextResponse } from 'next/server';
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
      // Xóa bản ghi cũ nếu có để tránh dữ liệu lỗi
      await supabase.from('materials').delete().eq('subject_id', subjectId);
      return NextResponse.json(
        { error: `Lỗi trích xuất tài liệu: ${err.message}` },
        { status: 422 }
      );
    }

    if (!rawText || rawText.trim().length < 50) {
      await supabase.from('materials').delete().eq('subject_id', subjectId);
      return NextResponse.json(
        { error: 'Nội dung tài liệu trống hoặc không đủ dữ liệu.' },
        { status: 422 }
      );
    }

    // Phân tích tài liệu bằng AI ngay lập tức
    try {
      const { summaryMarkdown, questions } = await generateMaterialDetails(rawText);

      // Lưu trữ kết quả hoàn chỉnh vào CSDL
      const { data: material, error: dbError } = await supabase
        .from('materials')
        .upsert({
          subject_id: subjectId,
          file_url: fileUrl,
          status: 'success',
          summary_markdown: summaryMarkdown,
          converted: rawText,
          questions: questions,
        }, {
          onConflict: 'subject_id'
        })
        .select()
        .single();

      if (dbError) {
        throw new Error('Không thể lưu học liệu vào cơ sở dữ liệu!');
      }

      return NextResponse.json({
        message: 'Tải tài liệu và phân tích thành công!',
        material: {
          id: material.id,
          subjectId: material.subject_id,
          status: 'success',
        },
      });

    } catch (aiError: unknown) {
      const err = aiError as Error;
      // Dọn dẹp CSDL nếu bất kỳ bước phân tích AI nào thất bại
      await supabase
        .from('materials')
        .delete()
        .eq('subject_id', subjectId);

      return NextResponse.json(
        { error: `Lỗi phân tích tài liệu: ${err.message || 'Lỗi hệ thống AI.'}` },
        { status: 422 }
      );
    }

  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}
