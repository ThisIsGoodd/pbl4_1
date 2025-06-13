// client/src/pages/InquiryFormPage.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getToken } from '../utils/jwt';

function InquiryFormPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const token = getToken();

  // URL에서 기본 카테고리 설정 (school-pending 페이지에서 온 경우)
  React.useEffect(() => {
    if (location.state?.category) {
      setCategory(location.state.category);
    }
    if (location.state?.defaultTitle) {
      setTitle(location.state.defaultTitle);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('http://localhost:3001/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert('문의사항이 등록되었습니다.');
        navigate(-1); // 이전 페이지로 돌아가기
      } else {
        alert(data.error || '문의사항 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('문의사항 등록 오류:', err);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (categoryValue) => {
    const icons = {
      general: '📝',
      technical: '🔧',
      school_request: '🏫',
      account: '👤',
      other: '💬'
    };
    return icons[categoryValue] || '📝';
  };

  const getCategoryName = (categoryValue) => {
    const names = {
      general: '일반 문의',
      technical: '기술적 문제',
      school_request: '학교 승인 관련',
      account: '계정 관련',
      other: '기타'
    };
    return names[categoryValue] || '일반 문의';
  };

  return (
    <div className="inquiry-form-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>📋 문의사항 작성</h1>
          <p>궁금한 점이나 문제사항을 알려주세요</p>
        </div>

        {/* 폼 섹션 */}
        <div className="form-section">
          <form onSubmit={handleSubmit} className="inquiry-form">
            {/* 문의 유형 선택 */}
            <div className="form-group">
              <label>🏷️ 문의 유형</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-select"
              >
                <option value="general">📝 일반 문의</option>
                <option value="technical">🔧 기술적 문제</option>
                <option value="school_request">🏫 학교 승인 관련</option>
                <option value="account">👤 계정 관련</option>
                <option value="other">💬 기타</option>
              </select>
            </div>

            {/* 제목 입력 */}
            <div className="form-group">
              <label>
                📌 제목 <span className="required">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="문의사항 제목을 입력하세요"
                maxLength={100}
                className="form-input"
              />
              <div className="character-count">
                <span className={title.length > 90 ? 'warning' : ''}>
                  {title.length}/100자
                </span>
              </div>
            </div>

            {/* 내용 입력 */}
            <div className="form-group">
              <label>
                ✍️ 내용 <span className="required">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="문의하실 내용을 자세히 작성해주세요"
                rows={10}
                maxLength={2000}
                className="form-textarea"
              />
              <div className="character-count">
                <span className={content.length > 1800 ? 'warning' : ''}>
                  {content.length}/2000자
                </span>
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="info-box">
              <h4>💡 문의사항 작성 안내</h4>
              <ul>
                <li>관리자가 확인 후 답변을 드립니다.</li>
                <li>긴급한 사항은 전화나 이메일로 직접 연락해주세요.</li>
                <li>개인정보가 포함된 내용은 작성하지 마세요.</li>
                <li>답변은 알림을 통해 확인하실 수 있습니다.</li>
              </ul>
            </div>

            {/* 버튼 그룹 */}
            <div className="button-group">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
                className="cancel-btn"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="submit-btn"
              >
                {isSubmitting ? '등록 중...' : '문의사항 등록'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .inquiry-form-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
        }

        .header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 1rem;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.8rem;
          color: #333;
        }

        .header p {
          margin: 0;
          color: #666;
          font-size: 1rem;
        }

        .form-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .inquiry-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #333;
          font-size: 1rem;
        }

        .required {
          color: #ef4444;
          font-weight: bold;
        }

        .form-input,
        .form-select,
        .form-textarea {
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
          font-family: inherit;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #4f46e5;
        }

        .form-textarea {
          resize: vertical;
          min-height: 200px;
        }

        .character-count {
          text-align: right;
          font-size: 0.85rem;
          color: #666;
        }

        .character-count .warning {
          color: #ef4444;
          font-weight: 600;
        }

        .info-box {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1rem 0;
        }

        .info-box h4 {
          margin: 0 0 0.75rem 0;
          color: #0369a1;
          font-size: 1rem;
        }

        .info-box ul {
          margin: 0;
          padding-left: 1.25rem;
          color: #0c4a6e;
        }

        .info-box li {
          margin-bottom: 0.25rem;
          font-size: 0.9rem;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .cancel-btn,
        .submit-btn {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-btn {
          background: #f3f4f6;
          color: #374151;
        }

        .cancel-btn:hover:not(:disabled) {
          background: #e5e7eb;
          transform: translateY(-1px);
        }

        .submit-btn {
          background: #4f46e5;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-1px);
        }

        .submit-btn:disabled,
        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .inquiry-form-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
          }

          .header h1 {
            font-size: 1.5rem;
          }

          .form-section {
            padding: 1.5rem;
          }

          .form-textarea {
            min-height: 150px;
          }

          .button-group {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .inquiry-form-page {
            padding: 0.25rem;
          }

          .header {
            padding: 1.25rem;
          }

          .form-section {
            padding: 1.25rem;
          }

          .form-input,
          .form-select,
          .form-textarea {
            font-size: 16px; /* iOS 줌 방지 */
          }
        }

        /* 다크모드 대응 */
        @media (prefers-color-scheme: dark) {
          .header,
          .form-section {
            background: rgba(30, 30, 30, 0.95);
            color: #e5e7eb;
          }

          .header h1 {
            color: #f9fafb;
          }

          .header p {
            color: #9ca3af;
          }

          .form-group label {
            color: #d1d5db;
          }

          .form-input,
          .form-select,
          .form-textarea {
            background: #374151;
            border-color: #4b5563;
            color: #f9fafb;
          }

          .form-input::placeholder,
          .form-textarea::placeholder {
            color: #9ca3af;
          }

          .info-box {
            background: rgba(30, 58, 138, 0.2);
            border-color: #3b82f6;
          }

          .info-box h4 {
            color: #93c5fd;
          }

          .info-box ul {
            color: #bfdbfe;
          }

          .cancel-btn {
            background: #4b5563;
            color: #e5e7eb;
          }

          .cancel-btn:hover:not(:disabled) {
            background: #6b7280;
          }
        }

        /* 접근성 개선 */
        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus,
        .cancel-btn:focus,
        .submit-btn:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        /* 애니메이션 감소 설정 */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

export default InquiryFormPage;