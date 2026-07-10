'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfirmModal } from '@/components/accessible/ConfirmModal';
import { getAppError } from '@/lib/errorHelper';
import { useToast } from '@/components/accessible/ToastProvider';

interface Question {
  id: string;
  type: 'multiple_choice' | 'essay';
  question_text: string;
  options: string[] | null;
  explanation: string;
}

const MESSAGES = {
  exitExamBtn: 'Trở về',
  exitExamConfirm: 'Bạn có chắc chắn muốn hủy lượt thi này không? Mọi kết quả bài làm hiện tại sẽ bị mất.',
  exitExamAria: 'Trở về bảng điều khiển',
  part1Guide: 'Các câu hỏi trắc nghiệm hãy nhấn chọn đáp án đúng.',
  part2Guide: 'Các câu hỏi tự luận hãy gõ nội dung trả lời mạch lạc vào ô trả lời.',
  questionTitlePrefix: 'Câu hỏi ',
  essayTextareaLabel: 'Trả lời',
  essayPlaceholder: 'Gõ câu trả lời của bạn tại đây...',
  submitExamBtn: 'Nộp bài',
  submitExamAria: 'Nộp bài thi, kết thúc',
  submitExamConfirm: 'Bạn có chắc chắn muốn nộp bài thi ngay bây giờ không?',
  loadingQuestions: 'Đang tải...',
  examReadyAnnouncement: 'Đề thi đã sẵn sàng. Chúc bạn làm bài tốt!',
  gradingAria: 'Trợ lý đang chấm bài. Vui lòng đợi...',
  gradingTitle: 'Đang chấm bài...',
  part1Title: 'Phần 1: Trắc nghiệm',
  part2Title: 'Phần 2: Tự luận',
};

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Trạng thái modal xác nhận nộp/hủy bài
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  const examInitialized = useRef(false);
  const { showToast } = useToast();
  const attemptIdRef = useRef<string | null>(null);
  const isSubmittedRef = useRef(false);

  // Nộp bài thi
  const submitExam = async () => {
    if (!attemptId || submitting) return;

    setSubmitting(true);
    showToast('Đang chấm bài', 'info', MESSAGES.gradingAria);

    try {
      const response = await fetch('/api/exam', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, answers }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'exam_submit_error');
      }

      isSubmittedRef.current = true;
      localStorage.removeItem(`exam_draft_${attemptId}`);
      router.push(`/exam/attempts/${attemptId}`);
    } catch (err: unknown) {
      const errObj = err as Error;
      const appErr = getAppError(errObj.message || 'exam_submit_error');
      showToast(appErr.visual, 'error', appErr.detailed);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const savedUserJson = localStorage.getItem('alp_ai_user');
    if (!savedUserJson) {
      router.push('/');
      return;
    }
    const user = JSON.parse(savedUserJson) as { id: string };

    if (examInitialized.current) return;
    examInitialized.current = true;

    const startExam = async (userId: string) => {
      setLoading(true);
      try {
        const { data: subjData } = await supabase
          .from('subjects')
          .select('name')
          .eq('id', subjectId)
          .single();
        if (subjData) {
          document.title = `Trang kiểm tra: ${subjData.name}, ALP.ai`;
        }

        const { data: material, error: matError } = await supabase
          .from('materials')
          .select('id')
          .eq('subject_id', subjectId)
          .single();

        if (matError || !material) {
          throw new Error('exam_no_material');
        }

        const response = await fetch('/api/exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, materialId: material.id }),
        });

        const data = (await response.json()) as { error?: string; attemptId?: string; questions?: Question[]; resumed?: boolean };

        if (!response.ok) {
          throw new Error(data.error || 'exam_init_error');
        }

        setAttemptId(data.attemptId || null);
        attemptIdRef.current = data.attemptId || null;
        setQuestions(data.questions || []);

        // Khôi phục bài làm nháp từ localStorage nếu có
        if (data.attemptId) {
          const savedDraft = localStorage.getItem(`exam_draft_${data.attemptId}`);
          if (savedDraft) {
            try {
              setAnswers(JSON.parse(savedDraft));
            } catch {
              // Bỏ qua lỗi parse
            }
          }
        }

        if (!data.resumed) {
          showToast('Đề thi đã sẵn sàng', 'success', MESSAGES.examReadyAnnouncement);
        }
      } catch (err: unknown) {
        const errObj = err as Error;
        const appErr = getAppError(errObj.message || 'exam_init_error');
        showToast(appErr.visual, 'error', appErr.detailed);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    startExam(user.id);
  }, [subjectId, router, showToast]);


  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => {
      const next = {
        ...prev,
        [questionId]: value
      };
      if (attemptIdRef.current) {
        localStorage.setItem(`exam_draft_${attemptIdRef.current}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitConfirmOpen(true);
  };

  if (loading) {
    return (
      <div className="text-center py-20" role="status">
        <span className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
        <p className="text-xl text-gray-500 dark:text-gray-400">{MESSAGES.loadingQuestions}</p>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="text-center py-20" role="status">
        <span className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
        <p className="text-xl text-gray-500 dark:text-gray-400">{MESSAGES.gradingTitle}</p>
      </div>
    );
  }

  const mcQuestions = questions.filter(q => q.type === 'multiple_choice');
  const essayQuestions = questions.filter(q => q.type === 'essay');

  const renderQuestionBlock = (q: Question, index: number) => {
    const isMC = q.type === 'multiple_choice';

    return (
      <fieldset
        key={q.id}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors space-y-6"
      >
        <legend className="text-2xl font-black text-gray-900 dark:text-white px-2">
          {MESSAGES.questionTitlePrefix}{index + 1}
        </legend>

        <p className="text-xl font-bold leading-relaxed text-gray-800 dark:text-gray-200">
          {q.question_text}
        </p>

        {isMC && q.options && (
          <div className="grid grid-cols-1 gap-4 pl-1">
            {q.options.map((opt) => {
              const optKey = opt.trim().charAt(0);
              const inputId = `${q.id}_option_${optKey}`;
              const isChecked = answers[q.id] === optKey;

              return (
                <div
                  key={optKey}
                  className={`flex items-center rounded-xl border-2 p-4 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer ${isChecked ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-800'}`}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name={`name_${q.id}`}
                    value={optKey}
                    checked={isChecked}
                    onChange={() => handleAnswerChange(q.id, optKey)}
                    className="h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer focus:outline-none"
                  />
                  <label
                    htmlFor={inputId}
                    className="ml-3 block text-lg font-semibold text-gray-800 dark:text-gray-200 cursor-pointer w-full leading-normal"
                  >
                    {opt}
                  </label>
                </div>
              );
            })}
          </div>
        )}

        {!isMC && (
          <div className="space-y-3">
            <label
              htmlFor={`textarea_${q.id}`}
              className="block text-lg font-bold text-gray-700 dark:text-gray-300"
            >
              {MESSAGES.essayTextareaLabel}
            </label>
            <textarea
              id={`textarea_${q.id}`}
              rows={6}
              value={answers[q.id] || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              placeholder={MESSAGES.essayPlaceholder}
              className="w-full text-lg p-4 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
            />
          </div>
        )}

      </fieldset>
    );
  };

  return (
    <div className="space-y-8">

      <button
        type="button"
        onClick={() => setIsExitConfirmOpen(true)}
        className="w-full sm:w-auto text-lg font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-5 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
        aria-label={MESSAGES.exitExamAria}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        <span>{MESSAGES.exitExamBtn}</span>
      </button>

      {/* Hướng dẫn làm bài */}
      <details className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex items-center justify-between font-bold text-xl cursor-pointer list-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 text-gray-800 dark:text-gray-200 select-none">
          <span className="flex items-center space-x-2.5">
            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg" aria-hidden="true">
              <BookOpen className="h-6 w-6" />
            </span>
            <span>Hướng dẫn làm bài</span>
          </span>
          <span className="transition group-open:rotate-180 text-gray-500 dark:text-gray-400">
            <svg fill="none" height="24" width="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
          </span>
        </summary>

        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6 space-y-4 text-gray-700 dark:text-gray-300">
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Quy chế thi thử</h3>
            <ul className="list-disc list-inside space-y-2 text-base">
              <li>Đề thi thử gồm 7 câu hỏi trắc nghiệm và 3 câu hỏi tự luận bám sát tài liệu học tập của bạn.</li>
              <li>Không giới hạn thời gian làm bài, bạn có thể thực hiện bài làm một cách kỹ lưỡng.</li>
              <li>Nếu bạn thoát trang, lượt thi hiện tại sẽ không được ghi nhận vào lịch sử.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Mẹo di chuyển</h3>
            <ul className="list-decimal list-inside space-y-2 text-base">
              <li><strong>Phần trắc nghiệm</strong>: Sử dụng phím mũi tên hoặc nhấn chọn để thay đổi các đáp án (A, B, C, D) cho từng câu hỏi.</li>
              <li><strong>Phần tự luận</strong>: Sử dụng phím <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm">Tab</kbd> để nhảy đến ô nhập câu trả lời, gõ nội dung làm bài chi tiết của bạn vào đó.</li>
              <li><strong>Nộp bài</strong>: Sau khi hoàn thành tất cả các câu hỏi, di chuyển tới cuối trang và nhấn nút <span className="font-bold">&ldquo;Nộp bài&rdquo;</span>. Trợ lý AI sẽ chấm điểm thang và nhận xét chi tiết sau vài giây.</li>
            </ul>
          </div>
        </div>
      </details>

      <form onSubmit={handleSubmitClick} className="space-y-12">

        {mcQuestions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white pl-2">
              {MESSAGES.part1Title}
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 pl-2 leading-relaxed font-semibold">
              {MESSAGES.part1Guide}
            </p>
            {mcQuestions.map((q, idx) => renderQuestionBlock(q, idx))}
          </div>
        )}

        {essayQuestions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white pl-2">
              {MESSAGES.part2Title}
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 pl-2 leading-relaxed font-semibold">
              {MESSAGES.part2Guide}
            </p>
            {essayQuestions.map((q, idx) => renderQuestionBlock(q, mcQuestions.length + idx))}
          </div>
        )}

        <div className="pt-6">
          <button
            type="submit"
            className="w-full text-2xl font-black py-5 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xl hover:shadow-2xl transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300 flex items-center justify-center space-x-3"
            aria-label={MESSAGES.submitExamAria}
          >
            <Send className="h-6 w-6" aria-hidden="true" />
            <span>{MESSAGES.submitExamBtn}</span>
          </button>
        </div>

      </form>

      {/* Modal xác nhận nộp bài */}
      <ConfirmModal
        isOpen={isSubmitConfirmOpen}
        onClose={setIsSubmitConfirmOpen}
        title="Nộp bài thi"
        description={MESSAGES.submitExamConfirm}
        onConfirm={submitExam}
        confirmText="Nộp bài"
        cancelText="Hủy bỏ"
        isDanger={false}
      />

      {/* Modal xác nhận thoát thi thử */}
      <ConfirmModal
        isOpen={isExitConfirmOpen}
        onClose={setIsExitConfirmOpen}
        title="Hủy lượt thi"
        description={MESSAGES.exitExamConfirm}
        onConfirm={() => {
          if (attemptIdRef.current) {
            localStorage.removeItem(`exam_draft_${attemptIdRef.current}`);
            fetch(`/api/exam?attemptId=${attemptIdRef.current}`, {
              method: 'DELETE',
              keepalive: true
            }).catch(() => {});
          }
          router.push('/dashboard');
        }}
        confirmText="Hủy lượt thi"
        cancelText="Quay lại làm bài"
        isDanger={true}
      />

    </div>
  );
}
