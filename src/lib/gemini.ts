const apiKey = process.env.GEMINI_API_KEY;
const baseUrl = process.env.GEMINI_BASE_URL || 'https://platform.beeknoee.com/api/v1';
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

if (!apiKey) {
  console.warn('GEMINI_API_KEY is missing!');
}

function isApiAvailable(): boolean {
  return !!apiKey;
}

// Gọi API Beeknoee tương thích OpenAI
async function callBeeknoeeChat(
  systemInstruction: string,
  userPrompt: string,
  responseFormatJson: boolean = false
): Promise<string> {
  if (!isApiAvailable()) {
    throw new Error('API key is missing.');
  }

  const headers: HeadersInit = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const body: any = {
    model: modelName,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 8192,
  };

  if (responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lỗi:', errorText);
    throw new Error(`Beeknoee API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return content;
}

// Dọn dẹp markdown code block trong chuỗi JSON
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    // Xóa dòng chứa ```json hoặc ``` ở đầu
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '');
    // Xóa dấu ``` ở cuối
    cleaned = cleaned.replace(/\n```$/, '');
  }
  return cleaned.trim();
}

/**
 * Helper gọi API Beeknoee có kèm cơ chế thử lại (retry) tự động và phân tích JSON
 */
async function fetchAndParseDetail(
  systemInstruction: string,
  prompt: string,
  retries: number = 2
): Promise<any> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const responseText = await callBeeknoeeChat(systemInstruction, prompt, true);
      const cleanedText = cleanJsonResponse(responseText);
      return JSON.parse(cleanedText);
    } catch (err) {
      lastError = err;
      console.warn(`Beeknoee Call failed (attempt ${i + 1}/${retries + 1}):`, err);
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Tóm tắt tiếp cận số và sinh ngân hàng 40 câu hỏi qua 5 luồng chạy song song
 */
export async function generateMaterialDetails(rawText: string): Promise<{
  summaryMarkdown: string;
  questions: any[];
}> {
  if (!isApiAvailable()) {
    return { summaryMarkdown: '', questions: [] };
  }

  const prompt = `Vui lòng xử lý tài liệu học tập dưới đây:
---
${rawText}
---`;

  // 1. Chỉ dẫn cho luồng sinh Tóm tắt môn học
  const summaryInstruction = `Bạn là chuyên gia thiết kế bài giảng tiếp cận số dành cho người khiếm thị.
Nhiệm vụ của bạn là dựa trên tài liệu được cung cấp, thiết kế phần tóm tắt môn học (summary_markdown) theo tiêu chuẩn tiếp cận số (WCAG 2.2):
- Hãy tạo ra một bản tóm tắt môn học cô đọng nhưng đầy đủ kiến thức cốt lõi, định nghĩa và công thức.
- Tuyệt đối KHÔNG viết các câu mở đầu mang tính giới thiệu xã giao hay dẫn nhập dài dòng (như "Tóm tắt cốt lõi...", "Tài liệu này tóm tắt...").
- Tuyệt đối KHÔNG viết tiêu đề chính của môn học/giáo trình vì giao diện đã có sẵn. Hãy bắt đầu ngay từ tiêu đề chương đầu tiên luôn (ví dụ: "# Chương 1: ...").
- Tuyệt đối KHÔNG dùng ký hiệu LaTeX/KaTeX hoặc ký hiệu đô-la ($...) vì Screen Reader không đọc được. Hãy viết công thức bằng chữ tiếng Việt hoặc ký tự Unicode cơ bản (ví dụ: "bình phương của x", "x^2", "a chia cho b", "a / b").
- Sử dụng chính xác cấu trúc thẻ tiêu đề Markdown logic (# Tiêu đề mục lớn, ## Tiêu đề mục nhỏ) để người dùng dễ duyệt nhanh.
- Dùng danh sách bullet point (-) ngắn gọn, súc tích. Bảng biểu (nếu có) phải rõ ràng cột/dòng. Tránh các khối văn bản quá dài và biểu tượng đặc biệt gây bối rối cho Screen Reader.

Hãy trả về dữ liệu dưới định dạng JSON có cấu trúc chính xác như sau:
{
  "summary_markdown": "nội dung tóm tắt định dạng markdown"
}
`;

  // 2. Chỉ dẫn cho các luồng sinh trắc nghiệm (q1 - q10, q11 - q20, q21 - q30)
  const mcInstruction = (start: number, end: number) => `Bạn là chuyên gia thiết kế khảo thí học thuật dành cho người khiếm thị.
Nhiệm vụ của bạn là dựa trên tài liệu được cung cấp, thiết kế đúng ${end - start + 1} câu hỏi trắc nghiệm khách quan (type: "multiple_choice") chất lượng cao bám sát nội dung tài liệu.
Đánh số ID từ q${start} đến q${end}. Mỗi câu có đúng 4 phương án A., B., C., D. rõ ràng, đáp án đúng (correct_answer: "A", "B", "C" hoặc "D") và phần giải thích ngắn gọn (explanation: 1-2 câu).

Hãy trả về dữ liệu dưới định dạng JSON có cấu trúc chính xác như sau:
{
  "questions": [
    {
      "id": "q${start}",
      "type": "multiple_choice",
      "question_text": "câu hỏi...",
      "options": ["A. phương án A", "B. phương án B", "C. phương án C", "D. phương án D"],
      "correct_answer": "A",
      "explanation": "giải thích..."
    },
    ...
  ]
}
`;

  // 3. Chỉ dẫn cho luồng sinh tự luận (q31 - q40)
  const essayInstruction = `Bạn là chuyên gia thiết kế khảo thí học thuật dành cho người khiếm thị.
Nhiệm vụ của bạn là dựa trên tài liệu được cung cấp, thiết kế đúng 10 câu hỏi tự luận thảo luận phân tích (type: "essay") chất lượng cao bám sát nội dung tài liệu.
Đánh số ID từ q31 đến q40. Đối với câu hỏi tự luận, trường 'options' và 'correct_answer' luôn là null, còn trường 'explanation' chứa tiêu chí chấm điểm và ý chính cực kỳ ngắn gọn (dưới 3 dòng) làm hướng dẫn chấm bài cho AI.

Hãy trả về dữ liệu dưới định dạng JSON có cấu trúc chính xác như sau:
{
  "questions": [
    {
      "id": "q31",
      "type": "essay",
      "question_text": "câu hỏi...",
      "options": null,
      "correct_answer": null,
      "explanation": "tiêu chí chấm điểm và hướng dẫn chấm bài cho AI..."
    },
    ...
  ]
}
`;

  try {
    console.log('Khởi động AI Pipeline song song với 5 luồng...');
    
    const [summaryRes, mc1Res, mc2Res, mc3Res, essayRes] = await Promise.all([
      fetchAndParseDetail(summaryInstruction, prompt),
      fetchAndParseDetail(mcInstruction(1, 10), prompt),
      fetchAndParseDetail(mcInstruction(11, 20), prompt),
      fetchAndParseDetail(mcInstruction(21, 30), prompt),
      fetchAndParseDetail(essayInstruction, prompt)
    ]);

    console.log('Tất cả 5 luồng AI đã hoàn tất phản hồi thành công.');

    const summaryMarkdown = summaryRes.summary_markdown || '';
    const questions = [
      ...(mc1Res.questions || []),
      ...(mc2Res.questions || []),
      ...(mc3Res.questions || []),
      ...(essayRes.questions || [])
    ];

    return {
      summaryMarkdown,
      questions
    };
  } catch (error: any) {
    console.error('Lỗi:', error);
    throw new Error(error.message || 'Không thể tạo tóm tắt và ngân hàng đề thi.');
  }
}

export interface EssayToGrade {
  id: string;
  questionText: string;
  criteria: string;
  studentAnswer: string;
}

export interface EssayGradeResult {
  score: number;
  feedback: string;
}

/**
 * Chấm điểm đồng thời các câu hỏi tự luận
 */
export async function gradeMultipleEssayQuestions(
  essays: EssayToGrade[]
): Promise<Record<string, EssayGradeResult>> {
  const result: Record<string, EssayGradeResult> = {};
  if (essays.length === 0) return result;

  if (!isApiAvailable()) {
    essays.forEach(e => {
      result[e.id] = { score: 0.0, feedback: '' };
    });
    return result;
  }

  const systemInstruction = `Bạn là giáo viên/giảng viên chấm thi xuất sắc. Nhiệm vụ của bạn là đánh giá và cho điểm bài làm tự luận của sinh viên dựa trên câu hỏi, tiêu chí chấm bài và bài làm của sinh viên.
Hãy chấm điểm bài làm của sinh viên trên thang điểm 10 cho mỗi câu hỏi tự luận được cung cấp.
Đặc biệt, sinh viên của bạn là người khiếm thị, hãy viết phản hồi (feedback) mang tính động viên, tích cực, mang tính học thuật lành mạnh, cực kỳ ngắn gọn và súc tích (chỉ từ 1 đến 3 câu ngắn), dễ hiểu bằng tiếng Việt giúp sinh viên khiếm thị nhận biết ưu khuyết điểm và tiến bộ.

Hãy trả về dữ liệu dưới định dạng JSON với cấu trúc chính xác như sau:
{
  "grades": [
    {
      "id": "ID câu hỏi (ví dụ: q31)",
      "score": 7.5,
      "feedback": "nhận xét..."
    }
  ]
}
`;

  const essaysPrompt = essays.map((e, index) => {
    return `---
Câu hỏi tự luận ${index + 1}:
ID: ${e.id}
Câu hỏi: ${e.questionText}
Tiêu chí chấm điểm: ${e.criteria}
Bài làm của sinh viên: ${e.studentAnswer}
`;
  }).join('\n');

  const prompt = `Vui lòng chấm điểm và nhận xét cho các bài làm tự luận dưới đây:
${essaysPrompt}
---`;

  try {
    const responseText = await callBeeknoeeChat(systemInstruction, prompt, true);
    const cleanedText = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleanedText);

    if (parsed.grades && Array.isArray(parsed.grades)) {
      parsed.grades.forEach((item: any) => {
        if (item.id) {
          result[item.id] = {
            score: typeof item.score === 'number' ? item.score : 0.0,
            feedback: item.feedback || ''
          };
        }
      });
    }

    essays.forEach(e => {
      if (!result[e.id]) {
        result[e.id] = { score: 0.0, feedback: 'Không thể chấm điểm' };
      }
    });

    return result;
  } catch (error: any) {
    console.error('Lỗi:', error);
    essays.forEach(e => {
      result[e.id] = { score: 0.0, feedback: 'Hệ thống gặp sự cố khi chấm bài!' };
    });
    return result;
  }
}
