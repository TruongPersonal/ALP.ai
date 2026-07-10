'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, AlertCircle, HelpCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  fullName: string;
  loginToken: string;
}

export default function GuidePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const router = useRouter();

  // Xác thực đăng nhập
  useEffect(() => {
    document.title = 'Hướng dẫn sử dụng, ALP.ai';

    const savedUserJson = localStorage.getItem('alp_ai_user');
    if (!savedUserJson) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(savedUserJson) as UserProfile;
    setCurrentUser(parsedUser);
  }, [router]);

  if (!currentUser) return null;

  return (
    <div className="space-y-8">
      
      {/* Tiêu đề */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center space-x-2">
          <HelpCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>Hướng dẫn sử dụng hệ thống</span>
        </h2>
        <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
          Tìm hiểu quy trình học tập, làm bài thi thử và tính năng hỗ trợ tiếp cận trên ứng dụng ALP.ai.
        </p>
      </div>

      {/* Nội dung quy trình học tập */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors space-y-6">
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-blue-500" aria-hidden="true" />
          <span>Quy trình Học tập & Thi cử</span>
        </h3>
        
        <ol className="list-decimal list-inside space-y-4 text-gray-700 dark:text-gray-300 text-base sm:text-lg">
          <li className="leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Tạo môn học mới</strong>: 
            Truy cập trang <span className="font-bold">&ldquo;Môn học&rdquo;</span>, nhấn nút <span className="font-bold">&ldquo;Thêm môn học&rdquo;</span> ở góc phải và nhập tên môn học (Ví dụ: Lịch sử Đảng).
          </li>
          <li className="leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Tải tài liệu lên</strong>: 
            Tại thẻ môn học mới tạo, nhấn nút <span className="font-bold">&ldquo;Tải tài liệu&rdquo;</span>. Chọn tệp PDF hoặc DOCX (dung lượng tối đa 20MB) có chứa chữ để trợ lý AI thực hiện phân tích.
          </li>
          <li className="leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Trích xuất văn bản & sinh đề thi</strong>: 
            Hệ thống sẽ hiển thị các thông báo tiến trình từ trích xuất văn bản tới khi trợ lý AI hoàn thành việc soạn bài tóm tắt và ngân hàng đề thi. Hộp thoại tải lên sẽ tự đóng khi hoàn tất.
          </li>
          <li className="leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Bắt đầu học và làm bài</strong>: 
            Khi môn học ở trạng thái sẵn sàng, bạn có thể:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-2 text-sm sm:text-base">
              <li>Nhấn <span className="font-bold text-blue-600 dark:text-blue-400">&ldquo;Đọc bài&rdquo;</span> để xem bản tóm tắt kiến thức của môn học do AI cô đọng.</li>
              <li>Nhấn <span className="font-bold text-emerald-600 dark:text-emerald-400">&ldquo;Thi thử&rdquo;</span> để làm bài trắc nghiệm và tự luận. Sau khi nộp, AI sẽ chấm điểm và phản hồi kết quả chi tiết.</li>
            </ul>
          </li>
        </ol>
      </div>

      {/* Thông tin hỗ trợ tiếp cận (Accessibility) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors space-y-6">
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center space-x-2">
          <AlertCircle className="h-6 w-6 text-amber-500" aria-hidden="true" />
          <span>Hỗ trợ tiếp cận (Accessibility)</span>
        </h3>

        <div className="space-y-4 text-gray-700 dark:text-gray-300 text-base">
          <p className="leading-relaxed">
            ALP.ai được thiết kế theo tiêu chuẩn <strong className="text-gray-900 dark:text-white">WCAG 2.2 AA</strong> nhằm tối ưu khả năng tiếp cận cho người khiếm thị:
          </p>
          <ul className="list-disc list-inside space-y-2.5 ml-2">
            <li>
              <strong className="text-gray-900 dark:text-white">Tương thích Trình đọc màn hình (Screen Reader)</strong>: 
              Tất cả các thành phần giao diện đều sử dụng HTML5 ngữ nghĩa và có nhãn ARIA đầy đủ để các trình đọc như NVDA, JAWS, VoiceOver có thể đọc chính xác.
            </li>
            <li>
              <strong className="text-gray-900 dark:text-white">Điều hướng bằng Bàn phím</strong>: 
              Bạn có thể sử dụng phím <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-semibold">Tab</kbd> để di chuyển tuần tự và phím <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-semibold">Enter</kbd>/<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-semibold">Space</kbd> để kích hoạt các nút, liên kết.
            </li>
            <li>
              <strong className="text-gray-900 dark:text-white">Thông báo động (Live Announcement)</strong>: 
              Các thông báo tiến trình tải hoặc cập nhật trạng thái học tập sẽ được phát âm thanh trực tiếp (thông qua thuộc tính `aria-live`) mà không làm gián đoạn luồng làm việc của bạn.
            </li>
            <li>
              <strong className="text-gray-900 dark:text-white">Nhảy nhanh tới nội dung</strong>: 
              Sử dụng nút nhảy nhanh (Skip Link) ngay khi tải trang để chuyển trọng tâm bàn phím thẳng đến vùng nội dung chính.
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
}
