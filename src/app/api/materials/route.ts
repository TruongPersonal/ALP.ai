import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTextFromFile } from '@/lib/extractor';
import { generateSummary, generateQuestions } from '@/lib/gemini';

export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const subjectId = formData.get('subjectId') as string | null;

    if (!file || !subjectId) {
      return NextResponse.json(
        { error: 'Thiếu tệp tin học liệu và mã môn học.' },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const fileMime = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 1. Trích xuất văn bản thô
    let rawText = '';
    try {
      rawText = await extractTextFromFile(fileBuffer, fileMime);
    } catch (extractError: any) {
      return NextResponse.json(
        { error: `Lỗi trích xuất tệp: ${extractError.message}` },
        { status: 422 }
      );
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Nội dung tài liệu không hợp lệ.' },
        { status: 422 }
      );
    }

    // 2. Kích hoạt AI Pipeline độc ​​lập từng đợt gọi Gemini API
    console.log('--- Bắt đầu AI Pipeline cho tài liệu:', fileName);

    // Gọi đợt 1: Tạo bản tóm tắt phân cấp logic
    console.log('API Pipeline: Đang sinh tóm tắt môn học...');
    const summaryMarkdown = await generateSummary(rawText);

    // Gọi đợt 2 & 3: Sinh ngân hàng 40 câu hỏi
    console.log('API Pipeline: Đang sinh ngân hàng 40 câu hỏi...');
    const generatedQuestions = await generateQuestions(rawText);

    console.log(`API Pipeline: Sinh thành công ${generatedQuestions.length} câu hỏi và tóm tắt.`);

    // 4. Lưu hoặc cập nhật học liệu vào CSDL
    const { data: material, error: dbError } = await supabase
      .from('materials')
      .upsert({
        subject_id: subjectId,
        summary_markdown: summaryMarkdown,
        converted: rawText,
        questions: generatedQuestions,
      }, {
        onConflict: 'subject_id'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Lỗi:', dbError);
      return NextResponse.json(
        { error: 'Không thể cập nhật học liệu và câu hỏi vào CSDL!' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Tải tài liệu và khởi tạo Trợ lý AI thành công!',
      material: {
        id: material.id,
        subjectId: material.subject_id,
        summaryMarkdown: material.summary_markdown,
        questionsCount: generatedQuestions.length,
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
