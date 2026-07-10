'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/accessible/ToastProvider';
import { BookOpen, Award, HelpCircle, Calendar, ArrowRight, Activity, TrendingUp } from 'lucide-react';

interface UserProfile {
  id: string;
  fullName: string;
  loginToken: string;
}

interface Subject {
  id: string;
  name: string;
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

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // Tải dữ liệu ban đầu
  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      // 1. Lấy danh sách môn học để đếm số lượng
      const response = await fetch(`/api/subjects?userId=${userId}`);
      const data = (await response.json()) as { subjects?: Subject[] };
      if (response.ok) {
        setSubjectsCount(data.subjects?.length || 0);
      }

      // 2. Lấy lịch sử thi đã hoàn thành của người dùng
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
      // Bỏ qua lỗi âm thầm trên Dashboard
    } finally {
      setLoading(false);
    }
  };

  // Xác thực đăng nhập
  useEffect(() => {
    document.title = 'Bảng tổng quan, ALP.ai';

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
      fetchData(parsedUser.id);
    };

    const timer = setTimeout(initData, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [router]);

  if (!currentUser) return null;

  // Tính toán số liệu thống kê nhanh
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0 
    ? Math.round(attempts.reduce((sum, att) => sum + att.score, 0) / totalAttempts) 
    : 0;

  // Lấy 3 lượt thi gần nhất
  const recentAttempts = attempts.slice(0, 3);

  return (
    <div className="space-y-10">

      {/* Lời chào & Tóm tắt ngày */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-12">
          <Activity className="h-64 w-64" />
        </div>
        
        <div className="relative z-10 space-y-3">
          <span className="bg-white/20 text-white font-extrabold text-xs tracking-wider uppercase px-3 py-1 rounded-full backdrop-blur-md">
            Trang tổng quan
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Chào mừng trở lại, {currentUser.fullName}!
          </h2>
          <p className="text-lg text-blue-100 max-w-2xl">
            Hôm nay bạn muốn học môn học nào? Trợ lý AI đã sẵn sàng phân tích tài liệu và đồng hành thi thử cùng bạn.
          </p>
        </div>
      </div>

      {/* Chỉ số thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex items-center space-x-4 transition-transform hover:scale-[1.02] duration-200">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
            <BookOpen className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Số lượng Môn học</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{subjectsCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex items-center space-x-4 transition-transform hover:scale-[1.02] duration-200">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Award className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Lượt thi thử</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{totalAttempts}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex items-center space-x-4 transition-transform hover:scale-[1.02] duration-200">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
            <TrendingUp className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Điểm trung bình</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{avgScore} / 100</p>
          </div>
        </div>

      </div>

      {/* Lưới điều hướng nhanh (Quick Links) */}
      <div className="space-y-6">
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">Điều hướng nhanh</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <button
            type="button"
            onClick={() => router.push('/subjects')}
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm text-left hover:shadow-md hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-200 flex flex-col justify-between h-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl inline-block group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Môn học</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-normal">
                Quản lý môn học, đọc bài tóm tắt và thực hiện các bài thi thử.
              </p>
            </div>
            <div className="flex items-center space-x-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 mt-2">
              <span>Đến trang học tập</span>
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push('/history')}
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm text-left hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-400/50 transition-all duration-200 flex flex-col justify-between h-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl inline-block group-hover:scale-110 transition-transform">
                <Award className="h-6 w-6" aria-hidden="true" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Lịch sử thi</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-normal">
                Xem lại danh sách tất cả các bài thi thử và kết quả nhận xét từ AI.
              </p>
            </div>
            <div className="flex items-center space-x-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              <span>Xem lịch sử thi</span>
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push('/guide')}
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm text-left hover:shadow-md hover:border-purple-500/50 dark:hover:border-purple-400/50 transition-all duration-200 flex flex-col justify-between h-48 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl inline-block group-hover:scale-110 transition-transform">
                <HelpCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">Hướng dẫn sử dụng</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-normal">
                Tìm hiểu quy trình sử dụng web và các tính năng hỗ trợ tiếp cận.
              </p>
            </div>
            <div className="flex items-center space-x-1.5 text-sm font-bold text-purple-600 dark:text-purple-400 mt-2">
              <span>Đọc hướng dẫn</span>
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>
      </div>

      {/* Lượt làm bài thi gần đây */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Bài thi gần đây nhất
          </h3>
          {totalAttempts > 3 && (
            <button
              type="button"
              onClick={() => router.push('/history')}
              className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-6" role="status">
            <span className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" aria-hidden="true"></span>
          </div>
        ) : recentAttempts.length === 0 ? (
          <p className="text-base text-gray-500 dark:text-gray-400 py-4 text-center">
            Bạn chưa thực hiện bài thi nào.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800" aria-label="Bảng danh sách lịch sử thi gần đây">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Môn thi</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Điểm số</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Thời gian</th>
                  <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
                {recentAttempts.map((att) => (
                  <tr key={att.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-extrabold text-gray-900 dark:text-white">
                      {att.subjects?.name || 'Môn học đã xóa'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-bold">
                      <span className={`px-2.5 py-0.5 rounded text-sm ${att.score >= 80 ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20' : att.score >= 50 ? 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20' : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/20'}`}>
                        {att.score} / 100
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      <span>{new Date(att.completed_at).toLocaleDateString('vi-VN')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-base font-medium">
                      <button
                        type="button"
                        onClick={() => router.push(`/exam/attempts/${att.id}`)}
                        className="text-blue-600 dark:text-blue-400 font-extrabold underline hover:text-blue-800 focus:ring-blue-500"
                        aria-label={`Xem kết quả chi tiết bài làm môn ${att.subjects?.name || 'Môn học đã xóa'}`}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
