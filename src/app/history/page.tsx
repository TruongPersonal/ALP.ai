'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Calendar, Award, ArrowRight } from 'lucide-react';

interface UserProfile {
  id: string;
  fullName: string;
  loginToken: string;
}

interface Attempt {
  id: string;
  score: number;
  completed_at: string;
  subjects: {
    name: string;
  } | null;
}

interface AttemptJoinResult {
  id: string;
  score: number;
  completed_at: string;
  materials: {
    subjects: {
      name: string;
    } | null;
  } | null;
}

const MESSAGES = {
  historyTitle: 'Lịch sử Thi thử',
  noAttempts: 'Bạn chưa thực hiện bất kỳ bài thi thử nào.'
};

export default function HistoryPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchHistory = async (userId: string) => {
    setLoading(true);
    try {
      // Dọn dẹp lượt thi dang dở
      await supabase
        .from('attempts')
        .delete()
        .eq('user_id', userId)
        .is('feedback', null);

      // Lấy toàn bộ lịch sử thi đã chấm điểm
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('attempts')
        .select(`
          id,
          score,
          completed_at,
          materials!inner (
            subjects (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .not('feedback', 'is', null)
        .order('completed_at', { ascending: false });

      if (!attemptsError && attemptsData) {
        const typedData = attemptsData as unknown as AttemptJoinResult[];
        const formattedAttempts = typedData.map(att => ({
          id: att.id,
          score: att.score,
          completed_at: att.completed_at,
          subjects: att.materials?.subjects ? { name: att.materials.subjects.name } : null
        }));
        setAttempts(formattedAttempts);
      }
    } catch {
      // Bỏ qua lỗi
    } finally {
      setLoading(false);
    }
  };

  // Xác thực đăng nhập
  useEffect(() => {
    document.title = 'Lịch sử bài thi, ALP.ai';

    const savedUserJson = localStorage.getItem('alp_ai_user');
    if (!savedUserJson) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(savedUserJson) as UserProfile;

    let active = true;
    const initData = () => {
      if (!active) return;
      setCurrentUser(parsedUser);
      fetchHistory(parsedUser.id);
    };

    const timer = setTimeout(initData, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [router]);

  if (!currentUser) return null;


  return (
    <div className="space-y-8">
      
      {/* Tiêu đề */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {MESSAGES.historyTitle}
        </h2>
        <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
          Xem kết quả chấm điểm chi tiết và các nhận xét từ trợ lý AI cho các bài thi bạn đã làm.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20" role="status">
          <span className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
          <p className="text-lg text-gray-500 dark:text-gray-400">Đang tải lịch sử bài thi...</p>
        </div>
      ) : attempts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 shadow-sm">
          <Award className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" aria-hidden="true" />
          <p className="text-xl text-gray-500 dark:text-gray-400 font-medium mb-4">{MESSAGES.noAttempts}</p>
          <button
            type="button"
            onClick={() => router.push('/subjects')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-colors"
          >
            Đi thi ngay
          </button>
        </div>
      ) : (
        /* Grid thẻ bài thi */
        <ul role="list" aria-label="Danh sách kết quả bài thi" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {attempts.map((att) => {
              const isExcellent = att.score >= 80;
              const isPassed = att.score >= 50;
              const scoreColorClass = isExcellent 
                ? 'from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700' 
                : isPassed 
                  ? 'from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700' 
                  : 'from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700';

              return (
                <li 
                  key={att.id} 
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h4 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {att.subjects?.name || 'Môn học đã xóa'}
                      </h4>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ml-2 ${
                        isExcellent 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                          : isPassed 
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' 
                            : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                      }`}>
                        {isExcellent ? 'Xuất sắc' : isPassed ? 'Đạt' : 'Cần cải thiện'}
                      </span>
                    </div>

                    {/* Thanh thanh tiến trình điểm số trực quan */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-500">Điểm số</span>
                        <span className="text-gray-900 dark:text-white font-extrabold">{att.score} / 100</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${scoreColorClass} transition-all`} 
                          style={{ width: `${att.score}%` }} 
                        />
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-gray-400 dark:text-gray-500 space-x-1.5 pt-2">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      <span>{new Date(att.completed_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push(`/exam/attempts/${att.id}`)}
                      className="flex items-center space-x-1.5 text-sm font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1"
                    >
                      <span>Xem kết quả chi tiết</span>
                      <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
      )}

    </div>
  );
}
