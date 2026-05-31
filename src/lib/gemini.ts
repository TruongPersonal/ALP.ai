import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-3.5-flash';
const ai = new GoogleGenerativeAI(apiKey || '');

if (!apiKey) {
  console.warn('GEMINI_API_KEY is missing!');
}

function isApiAvailable(): boolean {
  return !!apiKey;
}

export async function generateSummary(rawText: string): Promise<string> {
  if (!isApiAvailable()) {
    return '';
  }

  try {
    const model = ai.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: 'Bạn là chuyên gia thiết kế bài giảng tiếp cận số dành cho người khiếm thị. Hãy tạo ra một bản tóm tắt môn học cô đọng nhưng đầy đủ kiến thức cốt lõi, định nghĩa và công thức dựa trên tài liệu được cung cấp. Tuyệt đối KHÔNG viết các câu mở đầu mang tính giới thiệu xã giao hay dẫn nhập dài dòng (như "Tóm tắt cốt lõi...", "Tài liệu này tóm tắt...", "Tài liệu được thiết kế tối ưu...", "Chào bạn..."). Tuyệt đối KHÔNG viết tiêu đề chính của môn học hay giáo trình (như "# TÓM TẮT MÔN HỌC..." hay "# Tóm tắt giáo trình...") vì giao diện ứng dụng đã hiển thị sẵn tên môn học lớn ở ngoài. Hãy đi thẳng vào nội dung chuyên môn và bắt đầu ngay từ tiêu đề chương đầu tiên luôn (ví dụ: "## Chương 1: Tổng Quan Về Công Nghệ Phần Mềm" hoặc "## Phần 1: ..."). Tuyệt đối KHÔNG sử dụng các ký hiệu toán học LaTeX, KaTeX hoặc bao bọc công thức bằng ký hiệu đô-la ($...) vì Screen Reader không thể phát âm được các cú pháp này và trình duyệt sẽ bị lỗi hiển thị. Hãy viết toàn bộ công thức, biểu thức toán học hay hóa học dưới dạng từ ngữ tiếng Việt rõ ràng (ví dụ: "bình phương của x", "x^2", "a chia cho b", "a / b", "tích của a và b", "căn bậc hai của x", "vô cực") hoặc sử dụng các ký tự toán học Unicode cơ bản mà Screen Reader có thể phát âm tự nhiên để giao diện hiển thị chuẩn xác và học viên dễ nghe, dễ hiểu nhất. Cần tuân thủ nghiêm ngặt các yêu cầu đặc biệt về tiếp cận số (WCAG 2.2): thiết kế cấu trúc tài liệu bằng ngôn ngữ Markdown cực kỳ khoa học, rõ ràng và mạch lạc; sử dụng chính xác cấu trúc các thẻ tiêu đề phân cấp logic (## Tiêu đề mục lớn, ### Tiêu đề mục nhỏ) để người dùng khiếm thị dùng Screen Reader có thể chuyển tiêu điểm (bằng phím tắt H) duyệt nhanh qua toàn bộ cấu trúc bài học; dùng danh sách bullet point (-) ngắn gọn, súc tích, tránh các khối văn bản quá dài làm mệt mỏi giọng đọc; bảng biểu (nếu có) phải rõ ràng cột/dòng; KHÔNG sử dụng các biểu tượng đặc biệt gây bối rối cho Screen Reader khi phát âm.'
    });
    const prompt = `
Vui lòng tóm tắt tài liệu học tập dưới đây tuân thủ các hướng dẫn tiếp cận số:
---
${rawText}
---
`;

    const result = await model.generateContent(prompt);
    return result.response.text() || '';
  } catch (error: any) {
    console.error('Lỗi:', error);
    throw new Error(error.message || 'Không thể tạo tóm tắt tự động bằng Gemini API.');
  }
}

export async function generateQuestions(rawText: string): Promise<any[]> {
  const allQuestions: any[] = [];

  if (!isApiAvailable()) {
    return allQuestions;
  }

  try {
    // 30 câu hỏi trắc nghiệm
    const modelMultipleChoice = ai.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: 'Bạn là chuyên gia khảo thí và xây dựng ngân hàng câu hỏi học liệu. Nhiệm vụ của bạn là dựa trên tài liệu được cung cấp, tạo ra chính xác 30 câu hỏi trắc nghiệm khách quan đa dạng (từ mức nhận biết, thông hiểu đến vận dụng), đánh số ID tuần tự từ q1 đến q30. Mỗi câu hỏi phải có đúng 4 phương án lựa chọn A, B, C, D rõ ràng, đáp án đúng (A, B, C hoặc D) và phần giải thích cực kỳ ngắn gọn (chỉ từ 1 đến 2 câu ngắn, tập trung trực tiếp vào cốt lõi đáp án đúng).',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT' as any,
          properties: {
            questions: {
              type: 'ARRAY' as any,
              description: 'Danh sách đúng 30 câu hỏi trắc nghiệm sinh ra',
              items: {
                type: 'OBJECT' as any,
                properties: {
                  id: { type: 'STRING' as any, description: "ID dạng chuỗi tăng dần từ q1, q2... đến q30" },
                  type: { type: 'STRING' as any, description: "Giá trị bắt buộc là 'multiple_choice'" },
                  question_text: { type: 'STRING' as any, description: "Nội dung câu hỏi trắc nghiệm sâu sắc, bám sát học liệu" },
                  options: {
                    type: 'ARRAY' as any,
                    description: "Đúng 4 lựa chọn bắt đầu bằng chữ cái A., B., C., D.",
                    items: { type: 'STRING' as any }
                  },
                  correct_answer: { type: 'STRING' as any, description: "Ký tự đáp án đúng duy nhất (A, B, C hoặc D)" },
                  explanation: { type: 'STRING' as any, description: "Giải thích cực kỳ ngắn gọn và súc tích (chỉ từ 1 đến 2 câu ngắn) lý do tại sao đáp án đúng được chọn" }
                },
                required: ['id', 'type', 'question_text', 'options', 'correct_answer', 'explanation']
              }
            }
          },
          required: ['questions']
        }
      }
    });

    const promptMC = `
Tạo chính xác 30 câu hỏi trắc nghiệm từ văn bản sau:
---
${rawText}
---
`;

    const resultMC = await modelMultipleChoice.generateContent(promptMC);
    const parsedMC = JSON.parse(resultMC.response.text() || '{}');
    if (parsedMC.questions && Array.isArray(parsedMC.questions)) {
      allQuestions.push(...parsedMC.questions);
    }

    // 10 câu hỏi tự luận
    const modelEssay = ai.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: 'Bạn là chuyên gia khảo thí và xây dựng đề thi tự luận học thuật. Nhiệm vụ của bạn là dựa trên tài liệu được cung cấp, tạo ra chính xác 10 câu hỏi tự luận chất lượng cao kích thích tư duy phân tích và học tập độc lập. Đánh số ID tuần tự từ q31 đến q40. Với mỗi câu hỏi, hãy viết rõ hướng dẫn chấm điểm, tiêu chí chấm cốt lõi hoặc dàn ý chính cực kỳ ngắn gọn (dưới 3 dòng, gạch đầu dòng các ý chính) vào trường \'explanation\' để hỗ trợ chấm điểm tự động sau này.',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT' as any,
          properties: {
            questions: {
              type: 'ARRAY' as any,
              description: 'Danh sách đúng 10 câu hỏi tự luận',
              items: {
                type: 'OBJECT' as any,
                properties: {
                  id: { type: 'STRING' as any, description: "ID dạng chuỗi tăng dần từ q31, q32... đến q40" },
                  type: { type: 'STRING' as any, description: "Giá trị bắt buộc là 'essay'" },
                  question_text: { type: 'STRING' as any, description: "Nội dung câu hỏi thảo luận, tự luận đòi hỏi tư duy phân tích" },
                  options: { type: 'NULL' as any, description: "Luôn là null đối với tự luận" },
                  correct_answer: { type: 'NULL' as any, description: "Luôn là null đối với tự luận" },
                  explanation: { type: 'STRING' as any, description: "Tiêu chí chấm điểm và ý chính cực kỳ ngắn gọn (dưới 3 dòng) làm hướng dẫn chấm bài cho AI" }
                },
                required: ['id', 'type', 'question_text', 'explanation']
              }
            }
          },
          required: ['questions']
        }
      }
    });

    const promptEssay = `
Tạo chính xác 10 câu hỏi tự luận từ văn bản sau:
---
${rawText}
---
`;

    const resultEssay = await modelEssay.generateContent(promptEssay);
    const parsedEssay = JSON.parse(resultEssay.response.text() || '{}');
    if (parsedEssay.questions && Array.isArray(parsedEssay.questions)) {
      allQuestions.push(...parsedEssay.questions);
    }

    // 40 câu hỏi trắc nghiệm và tự luận 
    return allQuestions;
  } catch (error: any) {
    console.error('Lỗi:', error);
    throw new Error(error.message || 'Không thể tạo ngân hàng câu hỏi bằng Gemini.');
  }
}

export async function gradeEssayQuestion(
  questionText: string,
  criteria: string,
  studentAnswer: string
): Promise<{ score: number; feedback: string }> {
  if (!isApiAvailable()) {
    return {
      score: 0.0,
      feedback: ''
    };
  }

  try {
    const model = ai.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: 'Bạn là giáo viên/giảng viên chấm thi xuất sắc. Nhiệm vụ của bạn là đánh giá và cho điểm bài làm tự luận của sinh viên dựa trên câu hỏi, tiêu chí chấm bài và bài làm của sinh viên. Hãy chấm điểm bài làm của sinh viên trên thang điểm 10. Đặc biệt, sinh viên của bạn là người khiếm thị, hãy viết phản hồi (feedback) mang tính động viên, tích cực, mang tính học thuật lành mạnh, cực kỳ ngắn gọn và súc tích (chỉ từ 1 đến 3 câu ngắn), dễ hiểu bằng tiếng Việt giúp sinh viên khiếm thị nhận biết ưu khuyết điểm và tiến bộ.',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT' as any,
          properties: {
            score: {
              type: 'NUMBER' as any,
              description: 'Điểm số của câu tự luận trên thang điểm 10 (ví dụ: 7.5 hoặc 9.0)'
            },
            feedback: {
              type: 'STRING' as any,
              description: 'Nhận xét cực kỳ ngắn gọn và súc tích (chỉ từ 1 đến 3 câu ngắn) bằng tiếng Việt giúp sinh viên khiếm thị sửa lỗi và tiến bộ'
            }
          },
          required: ['score', 'feedback']
        }
      }
    });

    const prompt = `
Hãy chấm điểm bài làm tự luận của sinh viên dựa trên các thông tin sau:
---
Câu hỏi tự luận: ${questionText}
Tiêu chí chấm điểm / Gợi ý đáp án: ${criteria}
Bài làm của sinh viên: ${studentAnswer}
---
`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text() || '{"score": 0, "feedback": "Không thể chấm điểm"}');
  } catch (error: any) {
    console.error('Lỗi:', error);
    return {
      score: 0.0,
      feedback: error.message || 'Hệ thống gặp sự cố khi chấm điểm tự luận!'
    };
  }
}
