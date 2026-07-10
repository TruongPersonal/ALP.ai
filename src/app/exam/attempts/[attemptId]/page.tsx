'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Award, ArrowLeft, MessageSquare } from 'lucide-react';

interface QuestionSnapshot {
  id: string;
  type: 'multiple_choice' | 'essay';
  question_text: string;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string;
}

interface AttemptDetails {
  id: string;
  score: number;
  answers: Record<string, string>;
  questions_snapshot: QuestionSnapshot[];
  feedback: {
    overall_feedback: string;
    essay_feedbacks: Record<string, {
      score: number;
      feedback: string;
    }>;
  } | null;
  completed_at: string;
  materials: {
    subjects: {
      name: string;
    } | null;
  } | null;
}

const MESSAGES = {
  loadingMsg: 'Đang tải...',
  backToDashboardBtn: 'Trở về',
  backToDashboardAria: 'Trở về trang lịch sử làm bài',
  completedAtPrefix: 'Thời gian hoàn thành: ',
  scoreTitle: 'Điểm số',
  scoreScaleDesc: 'thang điểm 100',
  questionNumPrefix: 'Câu ',
  explanationLabel: 'Giải thích:',
  studentAnswerPrefix: 'Bài làm:',
  emptyEssayAnswer: '(Bỏ Trống)',
  aiFeedbackTitle: 'Nhận xét:',
  aiGradingWait: 'Chưa có điểm',
  part1Title: 'Phần 1: Trắc nghiệm',
  part2Title: 'Phần 2: Tự luận'
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [attempt, setAttempt] = useState<AttemptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveAnnouncement] = useState('');

  useEffect(() => {
    const savedUserJson = localStorage.getItem('alp_ai_user');
    if (!savedUserJson) {
      router.push('/');
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/exam?attemptId=${attemptId}`);
        const data = (await response.json()) as { attempt?: AttemptDetails };

        if (response.ok && data.attempt) {
          setAttempt(data.attempt);
          const subjName = data.attempt.materials?.subjects?.name || 'Môn học';
          document.title = `Trang kết quả: ${subjName}, ALP.ai`;
        } else {
          router.push('/history');
        }
      } catch {
        router.push('/history');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [attemptId, router]);


  if (loading) {
    return (
      <div className="text-center py-20" role="status">
        <span className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
        <p className="text-xl text-gray-500 dark:text-gray-400">{MESSAGES.loadingMsg}</p>
      </div>
    );
  }

  if (!attempt) return null;

  const subjectName = attempt.materials?.subjects?.name || 'Môn học';
  const questions = attempt.questions_snapshot;
  const studentAnswers = attempt.answers;
  const aiFeedback = attempt.feedback;

  const mcQuestions = questions.filter(q => q.type === 'multiple_choice');
  const essayQuestions = questions.filter(q => q.type === 'essay');

  const renderQuestionBlock = (q: QuestionSnapshot, index: number) => {
    const isMC = q.type === 'multiple_choice';
    const studentAns = studentAnswers ? studentAnswers[q.id] : undefined;

    const isCorrect = isMC && studentAns && studentAns.trim().toUpperCase() === q.correct_answer?.trim().toUpperCase();
    const essayFeedback = !isMC && aiFeedback?.essay_feedbacks ? aiFeedback.essay_feedbacks[q.id] : null;

    return (
      <div
        key={q.id}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
          <h4 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-relaxed">
            {MESSAGES.questionNumPrefix}{index + 1}: {q.question_text}
          </h4>
          <span className={`text-base font-black px-3.5 py-2 rounded-xl border self-start whitespace-nowrap ${isMC
            ? (isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60')
            : (essayFeedback ? (essayFeedback.score > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60') : 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800')
            }`}>
            {isMC
              ? (isCorrect ? '10.00 điểm' : '0.00 điểm')
              : (essayFeedback ? `${essayFeedback.score.toFixed(2)} điểm` : 'Đang chấm...')}
          </span>
        </div>

        {isMC && (
          <div className="space-y-4">
            {q.options && (
              <div className="grid grid-cols-1 gap-2.5 my-3 pl-1">
                {q.options.map((opt) => {
                  const optKey = opt.trim().charAt(0);
                  const isStudentSelected = studentAns === optKey;
                  const isRightAnswer = q.correct_answer === optKey;

                  let optionStyle = 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400';
                  if (isRightAnswer) {
                    optionStyle = 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 text-emerald-900 dark:text-emerald-300 font-bold';
                  } else if (isStudentSelected) {
                    optionStyle = 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 text-blue-900 dark:text-blue-300 font-bold';
                  }

                  let a11ySuffix = '';
                  if (isStudentSelected && isRightAnswer) {
                    a11ySuffix = ' - Bạn đã chọn, Đáp án đúng';
                  } else if (isStudentSelected) {
                    a11ySuffix = ' - Bạn đã chọn';
                  } else if (isRightAnswer) {
                    a11ySuffix = ' - Đáp án đúng';
                  }

                  return (
                    <div
                      key={optKey}
                      className={`rounded-lg p-3 text-base leading-relaxed border ${optionStyle}`}
                    >
                      <span>
                        {opt}
                        {a11ySuffix && (
                          <span className="sr-only">{a11ySuffix}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 p-4 border border-gray-100 dark:border-gray-800 space-y-2">
              <h5 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center">
                <MessageSquare className="h-5 w-5 mr-1.5 flex-shrink-0" aria-hidden="true" />
                {MESSAGES.explanationLabel}
              </h5>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {q.explanation}
              </p>
            </div>
          </div>
        )}

        {!isMC && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-900/50 space-y-2">
              <h5 className="text-base font-bold text-gray-400 uppercase tracking-wider">{MESSAGES.studentAnswerPrefix}</h5>
              <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {studentAns || MESSAGES.emptyEssayAnswer}
              </p>
            </div>

            {essayFeedback ? (
              <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 p-5 space-y-3">
                <div className="border-b border-blue-100 dark:border-blue-900/40 pb-3">
                  <h5 className="text-lg font-bold text-blue-900 dark:text-blue-300 flex items-center">
                    <Award className="h-5 w-5 mr-1.5 flex-shrink-0" aria-hidden="true" />
                    {MESSAGES.aiFeedbackTitle}
                  </h5>
                </div>

                <p className="text-lg leading-relaxed text-blue-900 dark:text-blue-300 whitespace-pre-line">
                  {essayFeedback.feedback}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-4 text-center text-lg text-gray-500 dark:text-gray-400">
                {MESSAGES.aiGradingWait}
              </div>
            )}
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="space-y-10">

      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row items-stretch justify-between gap-6 transition-colors">
        <div className="flex flex-col justify-between flex-1 space-y-4 text-center md:text-left">
          <div className="space-y-4 w-full">
            <button
              type="button"
              onClick={() => router.push('/history')}
              className="w-full md:w-auto md:self-start text-lg font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-5 py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 focus:ring-gray-500 focus:outline-none"
              aria-label={MESSAGES.backToDashboardAria}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              <span>{MESSAGES.backToDashboardBtn}</span>
            </button>

            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white pt-2 leading-tight">
              {subjectName}
            </h2>
          </div>

          <p className="text-base text-gray-400 dark:text-gray-500 font-semibold mt-auto md:mt-0">
            {MESSAGES.completedAtPrefix}{new Date(attempt.completed_at).toLocaleString('vi-VN')}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center bg-blue-600 dark:bg-blue-700 text-white rounded-2xl p-8 w-full md:w-56 h-48 shadow-lg">
          <span className="text-sm font-bold uppercase tracking-widest text-blue-100">{MESSAGES.scoreTitle}</span>
          <h3 className="text-5xl font-black mt-2 leading-none" aria-live="off">
            {attempt.score}
          </h3>
          <span className="text-lg font-bold text-blue-200 mt-2">{MESSAGES.scoreScaleDesc}</span>
        </div>
      </div>

      <div className="space-y-12">
        {mcQuestions.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white pl-2">
              {MESSAGES.part1Title}
            </h3>
            <div className="space-y-8">
              {mcQuestions.map((q, idx) => renderQuestionBlock(q, idx))}
            </div>
          </div>
        )}

        {essayQuestions.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white pl-2">
              {MESSAGES.part2Title}
            </h3>
            <div className="space-y-8">
              {essayQuestions.map((q, idx) => renderQuestionBlock(q, mcQuestions.length + idx))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
