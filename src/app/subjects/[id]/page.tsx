'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MarkdownRenderer } from '@/components/accessible/MarkdownRenderer';
import { ArrowLeft } from 'lucide-react';

interface SubjectDetails {
  id: string;
  name: string;
  materials: {
    summary_markdown: string;
    converted: string;
  } | null;
}

const MESSAGES = {
  goBackLabel: 'Trở về',
  goBackAria: 'Trở về bảng điều khiển',
  aiCompileDesc: 'Bản tóm tắt môn học được phân tích, biên soạn bởi trợ lý AI.',
  loadingMsg: 'Đang tải...'
};

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

  const [subject, setSubject] = useState<SubjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveAnnouncement] = useState('');

  useEffect(() => {
    const savedUserJson = localStorage.getItem('alp_ai_user');
    if (!savedUserJson) {
      router.push('/');
      return;
    }

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
          setSubject(data as unknown as SubjectDetails);
          document.title = `Trang học: ${data.name}, ALP.ai`;
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectDetails();
  }, [subjectId, router]);


  if (loading) {
    return (
      <div className="text-center py-20" role="status">
        <span className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
        <p className="text-xl text-gray-500 dark:text-gray-400">{MESSAGES.loadingMsg}</p>
      </div>
    );
  }

  if (!subject) return null;

  return (
    <div className="space-y-8 p-1">

      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="w-full md:w-auto text-lg font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-5 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 focus:ring-gray-500 focus:outline-none"
        aria-label={MESSAGES.goBackAria}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        <span>{MESSAGES.goBackLabel}</span>
      </button>

      <div className="text-center md:text-left">
        <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {subject.name}
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">
          {MESSAGES.aiCompileDesc}
        </p>
      </div>

      <div 
        id="summary-content"
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-all"
      >
        {subject.materials && (
          <MarkdownRenderer content={subject.materials.summary_markdown} />
        )}
      </div>

    </div>
  );
}
