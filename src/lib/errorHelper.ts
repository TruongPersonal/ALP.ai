export interface AppError {
  visual: string;
  detailed: string;
}

/**
 * Phân tích thông điệp lỗi và ánh xạ thành lỗi trực quan (ngắn gọn) và lỗi chi tiết (WCAG).
 */
export function getAppError(messageOrCode: string | null | undefined): AppError {
  if (!messageOrCode) {
    return {
      visual: 'Đã xảy ra lỗi!',
      detailed: 'Đã xảy ra lỗi hệ thống không xác định.'
    };
  }

  const msg = messageOrCode.trim().toLowerCase();

  // Đăng nhập
  if (msg.includes('mã đăng nhập') || msg.includes('login_token')) {
    if (msg.includes('trống') || msg.includes('cung cấp')) {
      return {
        visual: 'Nhập mã đăng nhập!',
        detailed: 'Vui lòng điền mã đăng nhập gồm 6 ký tự để truy cập.'
      };
    }
    return {
      visual: 'Mã không chính xác!',
      detailed: 'Mã đăng nhập không đúng. Vui lòng kiểm tra và nhập lại.'
    };
  }

  // Kết nối CSDL
  if (msg.includes('kết nối') || msg.includes('csdl') || msg.includes('dữ liệu') || msg.includes('database') || msg.includes('supabase')) {
    return {
      visual: 'Lỗi kết nối CSDL!',
      detailed: 'Không thể kết nối với cơ sở dữ liệu. Vui lòng kiểm tra mạng hoặc thử lại.'
    };
  }

  // Quản lý môn học
  if (msg.includes('tên môn học') || msg.includes('name')) {
    return {
      visual: 'Nhập tên môn học!',
      detailed: 'Tên môn học không được bỏ trống. Vui lòng nhập tên môn học.'
    };
  }

  // Tệp học liệu
  if (
    msg.includes('large') ||
    msg.includes('too_large') ||
    msg.includes('to_large') ||
    msg.includes('20mb') ||
    msg.includes('kích thước') ||
    msg.includes('dung lượng') ||
    msg.includes('size')
  ) {
    return {
      visual: 'Tệp vượt quá 20MB!',
      detailed: 'Dung lượng tệp lớn hơn 20 Megabyte. Vui lòng chọn tệp nhỏ hơn.'
    };
  }

  if (msg.includes('pdf') || msg.includes('docx') || msg.includes('tài liệu')) {
    if (msg.includes('chưa có') || msg.includes('chưa được tải') || msg.includes('không tìm thấy')) {
      return {
        visual: 'Chưa có tài liệu!',
        detailed: 'Môn học này chưa được đính kèm tài liệu học tập.'
      };
    }
    if (msg.includes('trống') || msg.includes('không đủ')) {
      return {
        visual: 'Tài liệu không có chữ!',
        detailed: 'Tài liệu không chứa ký tự chữ hoặc không đủ dữ liệu để phân tích.'
      };
    }
    return {
      visual: 'Lỗi đọc tài liệu!',
      detailed: 'Không thể đọc nội dung tệp. Vui lòng kiểm tra định dạng PDF hoặc DOCX.'
    };
  }

  // Đề thi
  if (msg.includes('đề thi') || msg.includes('ngân hàng') || msg.includes('câu hỏi')) {
    return {
      visual: 'Đề chưa sẵn sàng!',
      detailed: 'Ngân hàng câu hỏi chưa được AI khởi tạo hoàn chỉnh. Vui lòng đợi trong giây lát.'
    };
  }

  // Nộp bài thi
  if (msg.includes('nộp bài') || msg.includes('chấm bài') || msg.includes('grade')) {
    return {
      visual: 'Lỗi nộp bài thi!',
      detailed: 'Nộp bài thất bại hoặc gặp sự cố khi chấm điểm bằng AI. Vui lòng thử lại.'
    };
  }

  return {
    visual: 'Đã xảy ra lỗi!',
    detailed: messageOrCode
  };
}
