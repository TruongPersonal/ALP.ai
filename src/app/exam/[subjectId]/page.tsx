'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Question {
  id: string;
  type: 'multiple_choice' | 'essay';
  question_text: string;
  options: string[] | null;
  explanation: string;
}

interface QuestionSnapshot {
  id: string;
  type: 'multiple_choice' | 'essay';
  question_text: string;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string;
}

const dict = {
  exitExamBtn: 'Trở về',
  exitExamConfirm: 'Bạn có chắc chắn muốn hủy lượt thi này không? Mọi kết quả bài làm hiện tại sẽ bị mất.',
  exitExamAria: 'Trở về bảng điều khiển',
  part1Guide: 'Các câu hỏi trắc nghiệm hãy nhấn chọn đáp án đúng.',
  part2Guide: 'Các câu hỏi tự luận hãy nội dung trả lời mạch lạc vào ô trả lời.',
  questionTitlePrefix: 'Câu hỏi ',
  essayTextareaLabel: 'Trả lời',
  essayPlaceholder: 'Gõ câu trả lời của bạn tại đây...',
  submitExamBtn: 'Nộp bài',
  submitExamAria: 'Nộp bài thi, kết thúc',
  submitExamConfirm: 'Bạn có chắc chắn muốn nộp bài thi ngay bây giờ không?',
  loadingQuestions: 'Đang tải...',
  examReadyAnnouncement: 'Đề thi đã sẵn sàng. Chúc bạn làm bài tốt!',
  errSubjectNoMaterial: 'Môn học này chưa được tải tài liệu đính kèm.',
  errInitFail: 'Khởi tạo đề thi thất bại.',
  errSubmitFail: 'Nộp bài thất bại.',
  errSystem: 'Lỗi hệ thống.',

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
  const [subjectName, setSubjectName] = useState<string>('');

  // Trạng thái tải dữ liệu
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Khối thông báo âm thanh qua Live Region
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Refs để quản lý trạng thái sạch sẽ khi tắt trang/reload hoặc tránh StrictMode render 2 lần
  const examInitialized = useRef(false);
  const attemptIdRef = useRef<string | null>(null);
  const isSubmittedRef = useRef(false);

  useEffect(() => {
    // 1. Kiểm tra đăng nhập
    const savedUser = localStorage.getItem('alp_ai_user');
    if (!savedUser) {
      router.push('/');
      return;
    }
    const user = JSON.parse(savedUser);

    // Chặn gọi API 2 lần trong React StrictMode
    if (examInitialized.current) return;
    examInitialized.current = true;

    // 2. Khởi tạo đề thi ngẫu nhiên qua API
    startExam(user.id);
  }, [subjectId, router]);

  // Đăng ký sự kiện beforeunload và hàm dọn dẹp (cleanup) khi chuyển trang để xóa bản ghi nháp
  useEffect(() => {
    const handleUnload = () => {
      if (attemptIdRef.current && !isSubmittedRef.current) {
        const url = `/api/exam?attemptId=${attemptIdRef.current}`;
        fetch(url, {
          method: 'DELETE',
          keepalive: true
        }).catch(err => console.error('Lỗi khi xóa lượt thi tự động:', err));
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      // Khi chuyển trang nội bộ Next.js, component unmount
      if (attemptIdRef.current && !isSubmittedRef.current) {
        fetch(`/api/exam?attemptId=${attemptIdRef.current}`, {
          method: 'DELETE',
          keepalive: true
        }).catch(err => console.error('Lỗi khi xóa lượt thi khi chuyển trang:', err));
      }
    };
  }, []);

  const startExam = async (userId: string) => {
    setLoading(true);
    try {
      // Tải tên môn học
      const { data: subjData } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', subjectId)
        .single();
      if (subjData) {
        setSubjectName(subjData.name);
        document.title = `Trang kiểm tra: ${subjData.name}, ALP.ai`;
      }

      // 1. Lấy thông tin học liệu của môn học này
      const { data: material, error: matError } = await supabase
        .from('materials')
        .select('id')
        .eq('subject_id', subjectId)
        .single();

      if (matError || !material) {
        throw new Error(dict.errSubjectNoMaterial);
      }

      // 2. Gọi API để sinh lượt thi và đề snapshot an toàn
      const response = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, materialId: material.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || dict.errInitFail);
      }

      setAttemptId(data.attemptId);
      attemptIdRef.current = data.attemptId;
      setQuestions(data.questions || []);
      setLiveAnnouncement(dict.examReadyAnnouncement);
    } catch (err: any) {
      console.error(err);
      alert(err.message || dict.errInitFail);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    const confirmSubmit = window.confirm(dict.submitExamConfirm);
    if (!confirmSubmit) return;
    submitExam();
  };

  const submitExam = async () => {
    if (!attemptId || submitting) return;

    setSubmitting(true);
    setLiveAnnouncement(dict.gradingTitle);

    try {
      const response = await fetch('/api/exam', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, answers }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || dict.errSubmitFail);
      }

      // Đánh dấu đã nộp bài thành công để tránh cơ chế xóa tự động
      isSubmittedRef.current = true;

      // Chuyển hướng sang trang kết quả sau khi lưu xong
      router.push(`/exam/attempts/${attemptId}`);
    } catch (err: any) {
      console.error(err);
      alert(`${dict.errSubmitFail}: ${err.message || dict.errSystem}`);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20" role="status">
        <span className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
        <p className="text-xl text-gray-500 dark:text-gray-400">{dict.loadingQuestions}</p>
      </div>
    );
  }

  // MÀN HÌNH CHỜ CHẤM BÀI BẰNG AI
  if (submitting) {
    return (
      <div className="text-center py-20" role="status">
        {/* VÙNG LIVE THÔNG BÁO CHO SCREEN READER */}
        <div role="status" aria-live="polite" className="sr-only">
          {dict.gradingAria}
        </div>

        <span className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
        <p className="text-xl text-gray-500 dark:text-gray-400">{dict.gradingTitle}</p>
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
        {/* Câu hỏi số X */}
        <legend className="text-2xl font-black text-gray-900 dark:text-white px-2">
          {dict.questionTitlePrefix}{index + 1}
        </legend>

        {/* Nội dung câu hỏi thô bám sát học liệu */}
        <p className="text-xl font-bold leading-relaxed text-gray-800 dark:text-gray-200">
          {q.question_text}
        </p>

        {/* A. HIỂN THỊ PHƯƠNG ÁN TRẮC NGHIỆM */}
        {isMC && q.options && (
          <div className="grid grid-cols-1 gap-4 pl-1">
            {q.options.map((opt) => {
              const optKey = opt.trim().charAt(0); // Lấy chữ cái A, B, C, D
              const inputId = `${q.id}_option_${optKey}`;
              const isChecked = Reflect.get(answers, q.id) === optKey;

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

        {/* B. HIỂN THỊ Ô VIẾT TỰ LUẬN */}
        {!isMC && (
          <div className="space-y-3">
            <label
              htmlFor={`textarea_${q.id}`}
              className="block text-lg font-bold text-gray-700 dark:text-gray-300"
            >
              {dict.essayTextareaLabel}
            </label>
            <textarea
              id={`textarea_${q.id}`}
              rows={6}
              value={Reflect.get(answers, q.id) || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              placeholder={dict.essayPlaceholder}
              className="w-full text-lg p-4 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
            />
          </div>
        )}

      </fieldset>
    );
  };

  return (
    <div className="space-y-8">

      {/* CÁC VÙNG LIVE THÔNG BÁO DÀNH CHO SCREEN READER */}
      <div role="status" aria-live="polite" className="sr-only">{liveAnnouncement}</div>

      {/* 1. Nút thoát */}
      <button
        type="button"
        onClick={() => {
          const confirmExit = window.confirm(dict.exitExamConfirm);
          if (confirmExit) router.push('/dashboard');
        }}
        className="w-full sm:w-auto text-lg font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-5 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
        aria-label={dict.exitExamAria}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        <span>{dict.exitExamBtn}</span>
      </button>

      {/* 3. Danh sách câu hỏi theo phân phần */}
      <form onSubmit={handleSubmitClick} className="space-y-12">

        {mcQuestions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white pl-2">
              {dict.part1Title}
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 pl-2 leading-relaxed font-semibold">
              {dict.part1Guide}
            </p>
            {mcQuestions.map((q, idx) => renderQuestionBlock(q, idx))}
          </div>
        )}

        {essayQuestions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white pl-2">
              {dict.part2Title}
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 pl-2 leading-relaxed font-semibold">
              {dict.part2Guide}
            </p>
            {essayQuestions.map((q, idx) => renderQuestionBlock(q, mcQuestions.length + idx))}
          </div>
        )}

        {/* Nút nộp bài thi cực lớn cuối trang */}
        <div className="pt-6">
          <button
            type="submit"
            className="w-full text-2xl font-black py-5 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xl hover:shadow-2xl transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300 flex items-center justify-center space-x-3"
            aria-label={dict.submitExamAria}
          >
            <Send className="h-6 w-6" aria-hidden="true" />
            <span>{dict.submitExamBtn}</span>
          </button>
        </div>

      </form>
    </div>
  );
}

