'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MarkdownRenderer } from '@/components/accessible/MarkdownRenderer';
import { BookOpen, FileText, ArrowLeft, Award, Type, Sun, Moon } from 'lucide-react';

interface SubjectDetails {
  id: string;
  name: string;
  materials: {
    summary_markdown: string;
    converted: string;
  } | null;
}

const dict = {
  goBackLabel: 'Trở về',
  goBackAria: 'Trở về bảng điều khiển',
  aiCompileDesc: 'Bản tóm tắt môn học được phân tích, biên soạn bởi trợ lý AI.',
  summaryAriaLabel: 'Nội dung tóm tắt',
  loadingMsg: 'Đang tải...'
};

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

  const [subject, setSubject] = useState<SubjectDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Khối Live Region
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  useEffect(() => {
    // 1. Kiểm tra đăng nhập
    const savedUser = localStorage.getItem('alp_ai_user');
    if (!savedUser) {
      router.push('/');
      return;
    }

    // 2. Tải thông tin tài liệu môn học
    fetchSubjectDetails();
  }, [subjectId, router]);

  const fetchSubjectDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          materials (
            summary_markdown,
            converted
          )
        `)
        .eq('id', subjectId)
        .single();

      if (!error && data) {
        setSubject(data as any);
        document.title = `Trang học: ${data.name}, ALP.ai`;
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20" role="status">
        <span className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
        <p className="text-xl text-gray-500 dark:text-gray-400">{dict.loadingMsg}</p>
      </div>
    );
  }

  if (!subject) return null;

  const hasMaterial = !!subject.materials;

  return (
    <div className="space-y-8 p-1">

      {/* KHỐI ANNOUNCEMENT ĐỘNG CHO SCREEN READER */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* 1. Nút quay lại Dashboard */}
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="w-full md:w-auto text-lg font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-5 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 focus:ring-gray-500 focus:outline-none"
        aria-label={dict.goBackAria}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        <span>{dict.goBackLabel}</span>
      </button>

      {/* 2. Tiêu đề môn học chính */}
      <div className="text-center md:text-left">
        <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {subject.name}
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">
          {dict.aiCompileDesc}
        </p>
      </div>

      {/* 3. Nội dung Học tập chính */}
      <div 
        id="summary-content"
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-all"
      >
        <MarkdownRenderer content={subject.materials!.summary_markdown} />
      </div>

    </div>
  );
}
