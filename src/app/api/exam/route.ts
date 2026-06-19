import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { gradeMultipleEssayQuestions, EssayToGrade, QuestionBankItem } from '@/lib/gemini';

export const maxDuration = 60;

// Tráo mảng ngẫu nhiên (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Tạo lượt thi mới
export async function POST(request: Request) {
  try {
    const { userId, materialId } = await request.json();

    if (!userId || !materialId) {
      return NextResponse.json(
        { error: 'Thiếu mã sinh viên hoặc mã học liệu.' },
        { status: 400 }
      );
    }

    // Kiểm tra xem có lượt thi nào đang dở dang hay không
    const { data: activeAttempt, error: activeError } = await supabase
      .from('attempts')
      .select('id, questions_snapshot')
      .eq('user_id', userId)
      .eq('material_id', materialId)
      .is('feedback', null)
      .limit(1)
      .maybeSingle();

    if (!activeError && activeAttempt) {
      const questionsSnapshot = activeAttempt.questions_snapshot as QuestionBankItem[];
      const clientQuestionsSnapshot = questionsSnapshot.map(q => {
        const strippedQuestion = { ...q };
        delete (strippedQuestion as Partial<QuestionBankItem>).correct_answer;
        return strippedQuestion;
      });

      return NextResponse.json({
        message: 'Tiếp tục lượt thi hiện tại!',
        attemptId: activeAttempt.id,
        questions: clientQuestionsSnapshot
      });
    }

    const { data: material, error: fetchError } = await supabase
      .from('materials')
      .select('questions')
      .eq('id', materialId)
      .single();

    if (fetchError || !material) {
      return NextResponse.json(
        { error: 'Không thể tìm thấy học liệu môn học.' },
        { status: 404 }
      );
    }

    const questionBank = material.questions as QuestionBankItem[];

    if (!Array.isArray(questionBank)) {
      return NextResponse.json(
        { error: 'Ngân hàng câu hỏi không hợp lệ.' },
        { status: 422 }
      );
    }

    const mcQuestions = questionBank.filter(q => q.type === 'multiple_choice');
    const essayQuestions = questionBank.filter(q => q.type === 'essay');

    if (mcQuestions.length < 30 || essayQuestions.length < 10) {
      return NextResponse.json(
        { error: 'Ngân hàng câu hỏi chưa được khởi tạo đầy đủ.' },
        { status: 422 }
      );
    }

    // Chọn ngẫu nhiên 7 câu trắc nghiệm và 3 câu tự luận
    const selectedMC = shuffleArray(mcQuestions).slice(0, 7);
    const selectedEssay = shuffleArray(essayQuestions).slice(0, 3);
    const examQuestionsFull = shuffleArray([...selectedMC, ...selectedEssay]);

    // Loại bỏ đáp án đúng trước khi trả về client
    const clientQuestionsSnapshot = examQuestionsFull.map(q => {
      const strippedQuestion = { ...q };
      delete (strippedQuestion as Partial<QuestionBankItem>).correct_answer;
      return strippedQuestion;
    });

    const { data: attempt, error: insertError } = await supabase
      .from('attempts')
      .insert({
        material_id: materialId,
        user_id: userId,
        questions_snapshot: examQuestionsFull,
        answers: {},
        score: 0.00,
        feedback: null
      })
      .select('id, material_id, user_id, completed_at')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Không thể tạo đề thi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Tạo đề thi thành công!',
      attemptId: attempt.id,
      questions: clientQuestionsSnapshot
    });
  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

// Nộp bài và chấm điểm
export async function PATCH(request: Request) {
  try {
    const { attemptId, answers } = (await request.json()) as {
      attemptId: string;
      answers: Record<string, string>;
    };

    if (!attemptId || !answers) {
      return NextResponse.json(
        { error: 'Thiếu mã lượt thi hoặc danh sách bài làm.' },
        { status: 400 }
      );
    }

    const { data: attempt, error: fetchError } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (fetchError || !attempt) {
      return NextResponse.json(
        { error: 'Không tìm thấy lượt thi.' },
        { status: 404 }
      );
    }

    const questionsSnapshot = attempt.questions_snapshot as QuestionBankItem[];
    if (!Array.isArray(questionsSnapshot)) {
      return NextResponse.json(
        { error: 'Dữ liệu đề thi bị lỗi!' },
        { status: 500 }
      );
    }

    const getSafeAnswer = (ansObj: Record<string, string>, questionId: string): string => {
      if (ansObj && typeof ansObj === 'object' && Object.prototype.hasOwnProperty.call(ansObj, questionId)) {
        return ansObj[questionId] || '';
      }
      return '';
    };

    // Chấm trắc nghiệm
    let mcScore = 0;
    const mcQuestions = questionsSnapshot.filter(q => q.type === 'multiple_choice');

    mcQuestions.forEach(q => {
      const studentAns = getSafeAnswer(answers, q.id);
      const correctAns = q.correct_answer || '';

      if (studentAns && studentAns.trim().toUpperCase() === correctAns.trim().toUpperCase()) {
        mcScore += 10;
      }
    });

    // Chấm tự luận
    const essayQuestions = questionsSnapshot.filter(q => q.type === 'essay');
    const essaysToGrade: EssayToGrade[] = [];
    const essayResults: { questionId: string; score: number; feedback: string }[] = [];

    essayQuestions.forEach(q => {
      const studentAns = getSafeAnswer(answers, q.id).trim();

      if (!studentAns) {
        essayResults.push({
          questionId: q.id,
          score: 0.0,
          feedback: 'Bài làm câu này của em đang bỏ trống! Cố gắng lần sau nhé, hy vọng em sẽ làm bài tốt hơn!'
        });
      } else {
        essaysToGrade.push({
          id: q.id,
          questionText: q.question_text,
          criteria: q.explanation || 'Không có tiêu chí cụ thể.',
          studentAnswer: studentAns
        });
      }
    });

    if (essaysToGrade.length > 0) {
      try {
        const gradeResultsMap = await gradeMultipleEssayQuestions(essaysToGrade);
        essaysToGrade.forEach(item => {
          const res = gradeResultsMap[item.id] || { score: 0.0, feedback: 'Không thể chấm điểm' };
          essayResults.push({
            questionId: item.id,
            score: res.score,
            feedback: res.feedback
          });
        });
      } catch {
        essaysToGrade.forEach(item => {
          essayResults.push({
            questionId: item.id,
            score: 0.0,
            feedback: 'Hệ thống gặp sự cố khi chấm bài!'
          });
        });
      }
    }

    let essayScoreSum = 0;
    const essayFeedbacksMap: Record<string, { score: number; feedback: string }> = {};

    essayResults.forEach(res => {
      const questionGrade = Math.min(Math.max(res.score, 0), 10);
      essayScoreSum += questionGrade;
      essayFeedbacksMap[res.questionId] = {
        score: questionGrade,
        feedback: res.feedback
      };
    });

    const finalScore = mcScore + essayScoreSum;

    const { data: updatedAttempt, error: updateError } = await supabase
      .from('attempts')
      .update({
        answers: answers,
        score: parseFloat(finalScore.toFixed(2)),
        feedback: { essay_feedbacks: essayFeedbacksMap },
        completed_at: new Date().toISOString()
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Đã xảy ra lỗi hệ thống!' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Nộp bài và chấm điểm AI thành công!',
      attempt: updatedAttempt
    });
  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

// Lấy thông tin lượt thi
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Thiếu mã lượt làm bài thi.' },
        { status: 400 }
      );
    }

    const { data: attempt, error } = await supabase
      .from('attempts')
      .select('*, materials(subjects(name))')
      .eq('id', attemptId)
      .single();

    if (error || !attempt) {
      return NextResponse.json(
        { error: 'Không tìm thấy lượt làm bài thi.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ attempt });
  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

// Xóa lượt thi
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Thiếu mã lượt làm bài thi.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('attempts')
      .delete()
      .eq('id', attemptId);

    if (error) {
      return NextResponse.json(
        { error: 'Không thể xóa lượt làm bài thi này.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Xóa lượt thi thành công!' });
  } catch {
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}
