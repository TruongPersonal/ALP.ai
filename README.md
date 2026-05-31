# ALP.ai
ALP.ai là ứng dụng **trợ lý học tập cá nhân hóa** dành riêng cho **người khiếm thị** tuân thủ tiêu chuẩn tiếp cận quốc tế **WCAG 2.2 AA**.

---

## ⚙️ Cách hoạt động
- **AI Extractor** trích xuất toàn văn bản thô từ giáo trình PDF/DOCX tải lên ở phía Server-side.
- **Gemini Pipeline** thực hiện tuần tự 3 lần gọi API độc lập để tóm tắt học liệu, sinh kho 30 câu trắc nghiệm và 10 câu tự luận không sợ tràn token.
- **AI Grading** tiếp nhận câu trả lời tự luận của sinh viên, chấm điểm và đưa ra nhận xét chi tiết thời gian thực bằng mô hình AI.
- **Assertive Announcer** thông báo chuyển trang động tức thì bằng giọng nói qua live region (`aria-live="assertive"`) để không bị trôi tiếng.
- **Focus Settling** di chuyển tiêu điểm bàn phím thẳng tới tiêu đề chính `<h2>` sau 150ms để bắt đầu học tập ngay lập tức.
- **MCQ A11y Suffix** chèn mô tả ẩn (`Bạn đã chọn`, `Đáp án đúng`) giúp đọc kết quả bài thi trắc nghiệm độc lập màu sắc.

---

## 🚀 Cách sử dụng
1. Nhập mã token thử nghiệm `123456` để đăng nhập nhanh với tài khoản sinh viên mẫu.
2. Tại bảng điều khiển, nhấn **Tải tài liệu** để tải lên giáo trình PDF/DOCX môn học mới.
3. Nhấn **Đọc bài** để xem tóm tắt môn học cô đọng đã biên soạn, dùng các phím di chuyển `VO + Arrows` để học.
4. Nhấn **Thi thử** để làm đề thi ngẫu nhiên (trắc nghiệm và tự luận) và nhấn **Nộp bài** để xem kết quả đánh giá.

### Tuỳ chọn
- **Bỏ qua nhanh (Skip Link):** nhấn Tab lần đầu tiên khi vào trang để nhảy thẳng đến nội dung chính.
- **Đường viền tiêu điểm (Focus Ring):** đường viền dày 3px tương phản cao giúp định vị bàn phím dễ dàng.
- **Dọn dẹp thông minh (Clean History):** tự động quét sạch và xóa bỏ các lượt thi dở dang khi tắt tab/F5/chuyển trang.

---

## 💾 Lưu trữ
- Trạng thái đăng nhập: **localStorage** (`alp_ai_user`).
- Cơ sở dữ liệu: **Supabase PostgreSQL** (Schema `alp_ai` bảo mật độc lập).

---

## 🧠 Công nghệ sử dụng
- **Next.js App Router (React + TypeScript)**
- **Tailwind CSS**
- **Google Gemini API (`gemini-1.5-flash`)**
- **Supabase (Database Client)**
- **Radix UI Dialog (Modal)**
- **pdf-parse & mammoth (đọc tài liệu)**
- **ReactMarkdown & Remark GFM**

---

## 📜 Giấy phép
**MIT License** — dùng tự do cho học tập, nghiên cứu và phát triển cộng đồng.
