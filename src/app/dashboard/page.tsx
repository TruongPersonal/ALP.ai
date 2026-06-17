'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/accessible/Modal';
import { BookOpen, FileText, Upload, Plus, Trash2, Edit3, Award, Calendar } from 'lucide-react';

interface UserProfile {
  id: string;
  fullName: string;
  loginToken: string;
}

interface Subject {
  id: string;
  name: string;
  created_at: string;
  materials: {
    id: string;
    summary_markdown: string;
  } | null;
}

interface Attempt {
  id: string;
  score: number;
  completed_at: string;
  subjects: {
    name: string;
  } | null;
}

const dict = {
  subjectListTitle: 'Danh sách môn học',
  examSittingText: 'Thi thử',
  changeAttachmentText: 'Đổi tài liệu',
  viewDetailText: 'Xem kết quả'
};

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  // Trạng thái tải dữ liệu
  const [loading, setLoading] = useState(true);

  // Trạng thái Modal môn học
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Trạng thái Modal upload học liệu
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  // Khối aria-live động để thông báo trạng thái tải lên cho Screen Reader
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const router = useRouter();

  useEffect(() => {
    document.title = 'Bảng điều khiển, ALP.ai';

    // 1. Xác thực đăng nhập trên Client
    const savedUser = localStorage.getItem('alp_ai_user');
    if (!savedUser) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);

    // 2. Tải dữ liệu ban đầu
    fetchData(parsedUser.id);
  }, [router]);

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      // Tải danh sách môn học
      const response = await fetch(`/api/subjects?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setSubjects(data.subjects || []);
      }

      // Tự động quét và xóa sạch hoàn toàn các lượt thi dở dang (completed_at is null) của người dùng này khỏi CSDL
      await supabase
        .from('attempts')
        .delete()
        .eq('user_id', userId)
        .is('completed_at', null);

      // Tải lịch sử thi cử
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
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (!attemptsError && attemptsData) {
        // Biến đổi cấu trúc join dữ liệu để dễ hiển thị
        const formattedAttempts = attemptsData.map((att: any) => ({
          id: att.id,
          score: att.score,
          completed_at: att.completed_at,
          subjects: att.materials?.subjects ? { name: att.materials.subjects.name } : null
        }));
        setAttempts(formattedAttempts);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };



  // -------------------------------------------------------------
  // THAO TÁC MÔN HỌC (CRUD)
  // -------------------------------------------------------------
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !user) return;

    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subjectName, userId: user.id }),
      });

      if (response.ok) {
        setSubjectName('');
        setIsAddSubjectOpen(false);
        fetchData(user.id);
        setLiveAnnouncement('Đã thêm môn học mới thành công.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !selectedSubjectId || !user) return;

    try {
      const response = await fetch('/api/subjects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedSubjectId, name: subjectName }),
      });

      if (response.ok) {
        setSubjectName('');
        setSelectedSubjectId(null);
        setIsEditSubjectOpen(false);
        fetchData(user.id);
        setLiveAnnouncement('Đã sửa tên môn học thành công.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!user) return;
    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa môn học này không? Mọi học liệu và lịch sử thi liên quan cũng sẽ bị xóa vĩnh viễn.');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/subjects?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData(user.id);
        setLiveAnnouncement('Đã xóa môn học thành công.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // THAO TÁC UPLOAD TÀI LIỆU & AI XỬ LÝ
  // -------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedSubjectId || !user) return;

    setUploading(true);
    setUploadStatus('Trợ lý đang xử lý...');
    setLiveAnnouncement('Trợ lý đang xử lý. Vui lòng đợi...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('subjectId', selectedSubjectId);

      const response = await fetch('/api/materials', {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        const text = await response.text();
        console.error('Phản hồi lỗi từ server:', text);
        throw new Error(`Lỗi định dạng phản hồi (Mã: ${response.status}). Chi tiết: ${text.slice(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Tải học liệu thất bại.');
      }

      setUploadStatus('Hoàn thành! Đã xử lý tài liệu.');
      setLiveAnnouncement('Đã tải tài liệu và xử lý thành công!');

      setSelectedFile(null);
      setSelectedSubjectId(null);

      // Chờ hiển thị trạng thái hoàn thành rồi đóng modal
      setTimeout(() => {
        setIsUploadOpen(false);
        fetchData(user.id);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setUploadStatus(`Thất bại: ${err.message || 'Lỗi hệ thống.'}`);
      setLiveAnnouncement(`Gặp sự cố khi tải tệp: ${err.message || 'Lỗi hệ thống.'}`);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-10">

      {/* VÙNG THÔNG BÁO CHỦ ĐỘNG ARIA-LIVE (WCAG Polite Announcement) */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>

      {/* 2. Phần Danh sách Môn học */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {dict.subjectListTitle}
          </h2>

          <button
            type="button"
            onClick={() => {
              setSubjectName('');
              setIsAddSubjectOpen(true);
            }}
            className="text-lg font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-3.5 rounded-lg shadow transition-colors flex items-center justify-center space-x-2 focus:ring-blue-500"
            aria-label="Thêm môn học"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span>Thêm môn học</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12" role="status">
            <span className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
            <p className="text-lg text-gray-500 dark:text-gray-400">Đang tải...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800">
            <BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" aria-hidden="true" />
            <p className="text-xl text-gray-500 dark:text-gray-400 mb-6">Chưa có môn học nào.</p>
          </div>
        ) : (
          <ul
            role="list"
            aria-label="Danh sách môn học"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {subjects.map((sub) => {
              const hasMaterial = !!sub.materials;
              return (
                <li
                  key={sub.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md p-6 flex flex-col justify-between transition-all"
                >
                  <div className="space-y-4">
                    {/* Tên môn học là Header Landmark H3 */}
                    <div className="flex items-start justify-between">
                      <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
                        {sub.name}
                      </h3>

                      {/* Cụm nút CRUD phụ tá góc trên */}
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubjectId(sub.id);
                            setSubjectName(sub.name);
                            setIsEditSubjectOpen(true);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg focus:ring-blue-500"
                          aria-label={`Sửa tên môn học ${sub.name}`}
                        >
                          <Edit3 className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg focus:ring-red-500"
                          aria-label={`Xóa môn học ${sub.name}`}
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cụm nút hành động chính bên dưới thẻ card */}
                  <div className="mt-6 grid grid-cols-1 gap-3">
                    {hasMaterial ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => router.push(`/subjects/${sub.id}`)}
                            className="text-base font-bold bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center space-x-2 focus:ring-blue-500"
                            aria-label={`Đọc tài liệu môn ${sub.name}`}
                          >
                            <BookOpen className="h-5 w-5" aria-hidden="true" />
                            <span>Đọc bài</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/exam/${sub.id}`)}
                            className="text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg flex items-center justify-center space-x-2 focus:ring-emerald-500"
                            aria-label={`Làm bài thi môn ${sub.name}`}
                          >
                            <Award className="h-5 w-5" aria-hidden="true" />
                            <span>{dict.examSittingText}</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubjectId(sub.id);
                            setIsUploadOpen(true);
                          }}
                          className="text-base font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 py-3 rounded-lg flex items-center justify-center space-x-2 focus:ring-gray-500"
                          aria-label={`Đổi tài liệu đính kèm môn ${sub.name}`}
                        >
                          <Upload className="h-4 w-4" aria-hidden="true" />
                          <span>{dict.changeAttachmentText}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubjectId(sub.id);
                          setIsUploadOpen(true);
                        }}
                        className="text-base font-bold bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg flex items-center justify-center space-x-2 focus:ring-blue-500 shadow-md"
                        aria-label={`Tải lên tài liệu đính kèm môn ${sub.name}`}
                      >
                        <Upload className="h-5 w-5" aria-hidden="true" />
                        <span>Tải tài liệu</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 3. Phần Lịch sử Thi cử */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm transition-colors">
        <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
          Lịch sử bài thi
        </h3>

        {attempts.length === 0 ? (
          <p className="text-lg text-gray-500 dark:text-gray-400 py-6 text-center">
            Bạn chưa thực hiện bài thi nào.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800" aria-label="Bảng danh sách lịch sử thi">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Môn thi</th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Điểm số</th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Thời gian hoàn thành</th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
                {attempts.map((att) => (
                  <tr key={att.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-extrabold text-gray-900 dark:text-white">
                      {att.subjects?.name || 'Môn học đã xóa'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-bold">
                      <span className={`px-3 py-1 rounded text-lg ${att.score >= 80 ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20' : att.score >= 50 ? 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20' : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/20'}`}>
                        {att.score} / 100
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      <span>{new Date(att.completed_at).toLocaleString('vi-VN')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-base font-medium">
                      <button
                        type="button"
                        onClick={() => router.push(`/exam/attempts/${att.id}`)}
                        className="text-blue-600 dark:text-blue-400 font-extrabold underline hover:text-blue-800 focus:ring-blue-500"
                        aria-label={`Xem chi tiết bài làm môn ${att.subjects?.name || 'Môn học đã xóa'}, đạt ${att.score} điểm`}
                      >
                        {dict.viewDetailText}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
         MỤC MODAL ACCESSIBILITY (Radix UI bọc CSS)
         ========================================================================= */}

      {/* A. Modal Thêm môn học */}
      <Modal
        isOpen={isAddSubjectOpen}
        onClose={setIsAddSubjectOpen}
        title="Thêm môn học"
        description="Điền tên môn học vào ô bên dưới."
      >
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div>
            <label htmlFor="new-subject-name" className="block text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
              Tên môn học
            </label>
            <input
              id="new-subject-name"
              type="text"
              required
              autoFocus
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Ví dụ: Lịch sử Đảng Cộng Sản Việt Nam"
              className="w-full text-lg px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full text-lg font-bold py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:ring-blue-500"
          >
            Tạo mới
          </button>
        </form>
      </Modal>

      {/* B. Modal Sửa tên môn học */}
      <Modal
        isOpen={isEditSubjectOpen}
        onClose={setIsEditSubjectOpen}
        title="Đổi tên môn"
        description="Cập nhật tên mới vào ô bên dưới."
      >
        <form onSubmit={handleEditSubject} className="space-y-4">
          <div>
            <label htmlFor="edit-subject-name" className="block text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
              Tên môn học
            </label>
            <input
              id="edit-subject-name"
              type="text"
              required
              autoFocus
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full text-lg px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full text-lg font-bold py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:ring-blue-500"
          >
            Cập nhật
          </button>
        </form>
      </Modal>

      {/* C. Modal Upload tài liệu đính kèm & AI xử lý */}
      <Modal
        isOpen={isUploadOpen}
        onClose={(open) => {
          if (!uploading) {
            setIsUploadOpen(open);
            setSelectedFile(null);
            setUploadStatus('');
          }
        }}
        title="Tải tài liệu"
        description="Tải tài liệu PDF hoặc DOCX lên vào ô bên dưới."
      >
        <form onSubmit={handleUploadMaterial} className="space-y-6">
          <div className="border-4 border-dashed border-gray-200 dark:border-gray-800 hover:border-blue-500 rounded-xl p-8 text-center transition-colors">
            <input
              id="material-file"
              type="file"
              required
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
              disabled={uploading}
              className="sr-only"
            />
            <label
              htmlFor="material-file"
              className="cursor-pointer block space-y-4 focus:outline-none"
            >
              <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-4 rounded-full inline-block">
                <Upload className="h-8 w-8 mx-auto" aria-hidden="true" />
              </div>
              <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {selectedFile ? (
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">{selectedFile.name}</span>
                ) : (
                  <span>Chọn tệp tin</span>
                )}
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Tài liệu tối đa 15MB
              </p>
            </label>
          </div>

          {/* Trạng thái tiến trình AI Pipeline bằng aria-live */}
          {uploadStatus && (
            <div
              className={`rounded-lg p-4 border text-base font-bold animate-fade-in ${uploadStatus.startsWith('Lỗi') || uploadStatus.startsWith('Thất bại') ? 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-800 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-blue-800 dark:text-blue-400'}`}
              role="alert"
            >
              <div className="flex items-center space-x-2">
                {uploading && (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" aria-hidden="true"></span>
                )}
                <span>{uploadStatus}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="w-full text-lg font-bold py-3.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:ring-blue-500 disabled:opacity-40"
          >
            {uploading ? 'Đang xử lý...' : 'Tải lên'}
          </button>
        </form>
      </Modal>

    </div>
  );
}
