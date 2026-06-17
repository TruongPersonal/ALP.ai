import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { gradeMultipleEssayQuestions, EssayToGrade } from '@/lib/gemini';

export const maxDuration = 60;

// Thuật toán xáo trộn Fisher-Yates
function shuffleArray(array: any[]) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = Reflect.get(arr, i);
    Reflect.set(arr, i, Reflect.get(arr, j));
    Reflect.set(arr, j, temp);
  }
  return arr;
}

/**
 * POST /api/exam
 */
export async function POST(request: Request) {
  try {
    const { userId, materialId } = await request.json();

    if (!userId || !materialId) {
      return NextResponse.json(
        { error: 'Thiếu mã sinh viên hoặc mã học liệu.' },
        { status: 400 }
      );
    }

    const { data: material, error: fetchError } = await supabase
      .from('materials')
      .select('questions')
      .eq('id', materialId)
      .single();

    if (fetchError || !material) {
      console.error('Lỗi:', fetchError);
      return NextResponse.json(
        { error: 'Không thể tìm thấy học liệu môn học.' },
        { status: 404 }
      );
    }

    const questionBank = material.questions;

    if (!Array.isArray(questionBank) || questionBank.length < 40) {
      return NextResponse.json(
        { error: 'Ngân hàng câu hỏi chưa được khởi tạo đầy đủ.' },
        { status: 422 }
      );
    }

    const mcQuestions = questionBank.filter(q => q.type === 'multiple_choice');
    const essayQuestions = questionBank.filter(q => q.type === 'essay');

    if (mcQuestions.length < 7 || essayQuestions.length < 3) {
      return NextResponse.json(
        { error: 'Ngân hàng câu hỏi bị lỗi định dạng.' },
        { status: 422 }
      );
    }

    const selectedMC = shuffleArray(mcQuestions).slice(0, 7);
    const selectedEssay = shuffleArray(essayQuestions).slice(0, 3);

    const examQuestionsFull = shuffleArray([...selectedMC, ...selectedEssay]);

    const clientQuestionsSnapshot = examQuestionsFull.map(q => {
      const { correct_answer, ...strippedQuestion } = q;
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
      console.error('Lỗi:', insertError);
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
  } catch (error) {
    console.error('Lỗi:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/exam
 */
export async function PATCH(request: Request) {
  try {
    const { attemptId, answers } = await request.json();

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
      console.error('Lỗi:', fetchError);
      return NextResponse.json(
        { error: 'Không tìm thấy lượt thi.' },
        { status: 404 }
      );
    }

    const questionsSnapshot = attempt.questions_snapshot;
    if (!Array.isArray(questionsSnapshot)) {
      return NextResponse.json(
        { error: 'Dữ liệu đề thi bị lỗi!' },
        { status: 500 }
      );
    }

    const getSafeAnswer = (ansObj: any, questionId: string): string => {
      if (ansObj && typeof ansObj === 'object' && Object.prototype.hasOwnProperty.call(ansObj, questionId)) {
        const val = Reflect.get(ansObj, questionId);
        return typeof val === 'string' ? val : '';
      }
      return '';
    };

    // CHẤM ĐIỂM TRẮC NGHIỆM TỰ ĐỘNG
    let mcScore = 0;
    const mcQuestions = questionsSnapshot.filter(q => q.type === 'multiple_choice');

    mcQuestions.forEach(q => {
      const studentAns = getSafeAnswer(answers, q.id);
      const correctAns = q.correct_answer;

      if (studentAns && studentAns.trim().toUpperCase() === correctAns.trim().toUpperCase()) {
        mcScore += 10; // 10 điểm cho 1 câu trắc nghiệm đúng
      }
    });

    // CHẤM ĐIỂM TỰ LUẬN BẰNG GEMINI AI GỘP
    const essayQuestions = questionsSnapshot.filter(q => q.type === 'essay');
    
    // Tách các câu có câu trả lời và câu trống
    const essaysToGrade: EssayToGrade[] = [];
    const essayResults: { questionId: string; score: number; feedback: string }[] = [];

    essayQuestions.forEach(q => {
      const rawAns = getSafeAnswer(answers, q.id);
      const studentAns = rawAns ? rawAns.trim() : '';

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
      } catch (err) {
        console.error('Lỗi:', err);
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
    const essayFeedbacksMap = Object.create(null);

    essayResults.forEach(res => {
      const questionGrade = Math.min(Math.max(res.score, 0), 10);
      essayScoreSum += questionGrade;
      Reflect.set(essayFeedbacksMap, res.questionId, {
        score: questionGrade,
        feedback: res.feedback
      });
    });

    // TỔNG HỢP ĐIỂM SỐ TỔNG
    const finalScore = mcScore + essayScoreSum;

    const finalFeedbackJson = {
      essay_feedbacks: essayFeedbacksMap
    };

    // CẬP NHẬT KẾT QUẢ VÀO CSDL
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('attempts')
      .update({
        answers: answers,
        score: parseFloat(finalScore.toFixed(2)),
        feedback: finalFeedbackJson,
        completed_at: new Date().toISOString()
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) {
      console.error('Lỗi:', updateError);
      return NextResponse.json(
        { error: 'Đã xảy ra lỗi hệ thống!' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Nộp bài và chấm điểm AI thành công!',
      attempt: updatedAttempt
    });
  } catch (error) {
    console.error('Lỗi:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/exam?attemptId=...
 */
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
      console.error('Lỗi:', error);
      return NextResponse.json(
        { error: 'Không tìm thấy lượt làm bài thi.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error('Lỗi:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exam?attemptId=...
 */
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
      console.error('Lỗi khi xóa lượt thi:', error);
      return NextResponse.json(
        { error: 'Không thể xóa lượt làm bài thi này.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Xóa lượt thi thành công!' });
  } catch (error) {
    console.error('Lỗi:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống!' },
      { status: 500 }
    );
  }
}

