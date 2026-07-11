'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/accessible/Modal';
import { ConfirmModal } from '@/components/accessible/ConfirmModal';
import { getAppError } from '@/lib/errorHelper';
import { useToast } from '@/components/accessible/ToastProvider';
import { BookOpen, Upload, Plus, Trash2, Edit3, Award } from 'lucide-react';

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
    status: string;
  } | null;
}

const MESSAGES = {
  subjectListTitle: 'Quản lý Môn học',
  examSittingText: 'Thi thử',
  btnGoBack: 'Quay về bảng điều khiển',
};

export default function SubjectsPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Trạng thái Modals
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);

  // Upload học liệu
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Trạng thái ConfirmModal xóa môn học
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [subjectToDeleteId, setSubjectToDeleteId] = useState<string | null>(null);
  const [subjectToDeleteName, setSubjectToDeleteName] = useState('');

  const router = useRouter();
  const { showToast } = useToast();

  // Tải dữ liệu ban đầu
  const fetchSubjects = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/subjects?userId=${userId}`);
      const data = (await response.json()) as { subjects?: Subject[] };
      if (response.ok) {
        setSubjects(data.subjects || []);
      }
    } catch {
      // Bỏ qua lỗi
    } finally {
      setLoading(false);
    }
  };

  // Xác thực đăng nhập
  useEffect(() => {
    document.title = 'Quản lý môn học, ALP.ai';

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
      fetchSubjects(parsedUser.id);
    };

    const timer = setTimeout(initData, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [router]);

  // Thêm môn học
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !currentUser || isCreatingSubject) return;

    setIsCreatingSubject(true);
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subjectName, userId: currentUser.id }),
      });

      if (response.ok) {
        setSubjectName('');
        setIsAddSubjectOpen(false);
        fetchSubjects(currentUser.id);
        showToast('Đã thêm môn học', 'success', 'Đã thêm môn học mới thành công.');
      }
    } catch {
      // Bỏ qua lỗi
    } finally {
      setIsCreatingSubject(false);
    }
  };

  // Sửa môn học
  const handleEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !selectedSubjectId || !currentUser || isEditingSubject) return;

    setIsEditingSubject(true);
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
        fetchSubjects(currentUser.id);
        showToast('Đã đổi tên môn học', 'success', 'Đã sửa đổi tên môn học thành công.');
      }
    } catch {
      // Bỏ qua lỗi
    } finally {
      setIsEditingSubject(false);
    }
  };

  // Mở modal xác nhận xóa môn học
  const handleDeleteSubject = (id: string, name: string) => {
    setSubjectToDeleteId(id);
    setSubjectToDeleteName(name);
    setIsDeleteConfirmOpen(true);
  };

  // Thực thi xóa môn học sau khi xác nhận
  const executeDeleteSubject = async () => {
    if (!subjectToDeleteId || !currentUser) return;
    try {
      const response = await fetch(`/api/subjects?id=${subjectToDeleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchSubjects(currentUser.id);
        showToast('Đã xóa môn học', 'success', 'Đã xóa môn học thành công.');
      }
    } catch {
      // Bỏ qua lỗi
    } finally {
      setSubjectToDeleteId(null);
      setSubjectToDeleteName('');
    }
  };

  // Kiểm tra kích thước tệp
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const maxLimit = 20 * 1024 * 1024;
      if (file.size > maxLimit) {
        const appErr = getAppError('file_too_large');
        showToast(appErr.visual, 'error', appErr.detailed);
        e.target.value = '';
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  // Tải tệp lên
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedSubjectId || !currentUser) return;

    const maxLimit = 20 * 1024 * 1024;
    if (selectedFile.size > maxLimit) {
      const appErr = getAppError('file_too_large');
      showToast(appErr.visual, 'error', appErr.detailed);
      return;
    }

    setUploading(true);
    showToast('Đang tải tệp lên...', 'info', 'Đang tải tệp lên hệ thống lưu trữ. Vui lòng đợi...');

    let timer1: NodeJS.Timeout | null = null;
    let timer2: NodeJS.Timeout | null = null;

    try {
      const fileExt = selectedFile.name.split('.').pop() || '';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('alp_ai')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('alp_ai')
        .getPublicUrl(filePath);

      // Bước 2: Bắt đầu trích xuất chữ
      showToast('Đang trích xuất văn bản...', 'info', 'Đang đọc và trích xuất chữ từ tài liệu. Vui lòng đợi...');

      // Bước 3: Đổi sang "Trợ lý AI đang làm việc..." sau 2.5s (trong lúc đang fetch)
      timer1 = setTimeout(() => {
        showToast('Trợ lý AI đang làm việc...', 'info', 'Trợ lý AI đang tóm tắt nội dung và soạn đề thi. Vui lòng đợi...');
      }, 2500);

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: publicUrl,
          fileName: selectedFile.name,
          fileMime: selectedFile.type,
          subjectId: selectedSubjectId
        }),
      });

      if (timer1) clearTimeout(timer1);

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Tải học liệu thất bại.');
      }

      // Bước 4: Hoàn thành!
      showToast('Hoàn thành!', 'success', 'Tải và phân tích thành công. Bài học đã sẵn sàng!');

      setSelectedFile(null);
      setSelectedSubjectId(null);

      timer2 = setTimeout(() => {
        setIsUploadOpen(false);
        fetchSubjects(currentUser.id);
      }, 1500);

    } catch (err: unknown) {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      const errObj = err as Error;
      const appErr = getAppError(errObj.message || 'file_upload_error');
      showToast(appErr.visual, 'error', appErr.detailed);
    } finally {
      setUploading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      
      {/* Tiêu đề & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {MESSAGES.subjectListTitle}
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
            Xem danh sách bài học, tải học liệu và làm bài thi thử tại đây.
          </p>
        </div>

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

      {/* Danh sách */}
      {loading ? (
        <div className="text-center py-12" role="status">
          <span className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3" aria-hidden="true"></span>
          <p className="text-lg text-gray-500 dark:text-gray-400">Đang tải...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 shadow-sm">
          <BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" aria-hidden="true" />
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-6 font-medium">Chưa có môn học nào được tạo.</p>
          <button
            type="button"
            onClick={() => setIsAddSubjectOpen(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-colors"
          >
            Tạo môn học đầu tiên
          </button>
        </div>
      ) : (
        <ul role="list" aria-label="Danh sách môn học" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((sub) => {
            const material = sub.materials;
            const hasMaterial = !!material && material.status === 'success';

            return (
              <li key={sub.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md p-6 flex flex-col justify-between transition-all">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
                      {sub.name}
                    </h3>

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
                        onClick={() => handleDeleteSubject(sub.id, sub.name)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg focus:ring-red-500"
                        aria-label={`Xóa môn học ${sub.name}`}
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3">
                  {hasMaterial ? (
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
                        <span>{MESSAGES.examSittingText}</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubjectId(sub.id);
                        setIsUploadOpen(true);
                      }}
                      className="w-full text-base font-bold bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg flex items-center justify-center space-x-2 focus:ring-blue-500 shadow-md"
                      aria-label={`Tải tài liệu môn ${sub.name}`}
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

      {/* Modals */}
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
              disabled={isCreatingSubject}
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Ví dụ: Lịch sử Đảng Cộng Sản Việt Nam"
              className="w-full text-lg px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isCreatingSubject}
            className="w-full text-lg font-bold py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isCreatingSubject && (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" aria-hidden="true"></span>
            )}
            <span>{isCreatingSubject ? 'Đang tạo...' : 'Tạo mới'}</span>
          </button>
        </form>
      </Modal>

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
              disabled={isEditingSubject}
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full text-lg px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isEditingSubject}
            className="w-full text-lg font-bold py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isEditingSubject && (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" aria-hidden="true"></span>
            )}
            <span>{isEditingSubject ? 'Đang cập nhật...' : 'Cập nhật'}</span>
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isUploadOpen}
        onClose={(open) => {
          if (!uploading) {
            setIsUploadOpen(open);
            setSelectedFile(null);
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
            <label htmlFor="material-file" className="cursor-pointer block space-y-4 focus:outline-none">
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
                Tài liệu tối đa 20MB
              </p>
            </label>
          </div>

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="w-full text-lg font-bold py-3.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:ring-blue-500 disabled:opacity-40"
          >
            {uploading ? 'Đang xử lý...' : 'Tải lên'}
          </button>
        </form>
      </Modal>

      {/* Modal xác nhận xóa */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={setIsDeleteConfirmOpen}
        title="Xóa môn học"
        description={`Bạn có chắc chắn muốn xóa môn học "${subjectToDeleteName}" này không? Mọi học liệu và lịch sử thi liên quan cũng sẽ bị xóa vĩnh viễn.`}
        onConfirm={executeDeleteSubject}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        isDanger={true}
      />

    </div>
  );
}
