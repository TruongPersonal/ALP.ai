import './polyfill';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
  const mime = mimeType.toLowerCase();

  try {
    // Xử lý tệp PDF
    if (mime === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return result.text || '';
      } finally {
        await parser.destroy();
      }
    }

    // Xử lý tệp DOCX
    if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }

    throw new Error('Chỉ hỗ trợ tài liệu PDF và DOCX!');
  } catch (error: any) {
    console.error('Lỗi:', error);
    throw new Error(error.message || 'Không thể đọc hoặc trích xuất văn bản từ tệp tin được cung cấp.');
  }
}
