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
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">📋 문의사항 작성</h1>
            <p className="welcome-text">궁금한 점이나 문제사항을 알려주세요</p>
          </div>
        </div>

        <div className="main-content">
          <div className="form-section">
            <form onSubmit={handleSubmit} className="inquiry-form">
              {/* 문의 유형 선택 */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🏷️</span>
                  문의 유형
                </label>
                <div className="select-wrapper">
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
              </div>

              {/* 제목 입력 */}
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">📌</span>
                  제목
                  <span className="required">*</span>
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
                <label className="form-label">
                  <span className="label-icon">✍️</span>
                  내용
                  <span className="required">*</span>
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
                <div className="info-header">
                  <span className="info-icon">💡</span>
                  <h4 className="info-title">문의사항 작성 안내</h4>
                </div>
                <ul className="info-list">
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
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner"></span>
                      등록 중...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">📤</span>
                      문의사항 등록
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
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
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
        }

        .main-title {
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 1rem 0;
          letter-spacing: -0.02em;
        }

        .welcome-text {
          font-size: clamp(1rem, 2.5vw, 1.2rem);
          color: var(--text-secondary, #64748b);
          margin: 0;
          font-weight: 300;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
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

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
        }

        .label-icon {
          font-size: 1.1rem;
        }

        .required {
          color: #ef4444;
          font-weight: 700;
        }

        .select-wrapper {
          position: relative;
        }

        .form-select {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #1e293b);
          cursor: pointer;
          transition: all 0.3s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1rem;
          padding-right: 2.5rem;
        }

        .form-select:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #1e293b);
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-textarea {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #1e293b);
          transition: all 0.3s ease;
          resize: vertical;
          min-height: 200px;
          font-family: inherit;
          line-height: 1.6;
          box-sizing: border-box;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .character-count {
          display: flex;
          justify-content: flex-end;
          font-size: 0.85rem;
          color: var(--text-secondary, #64748b);
          margin-top: 0.25rem;
        }

        .character-count .warning {
          color: #ef4444;
          font-weight: 600;
        }

        .info-box {
          background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
          border: 2px solid #93c5fd;
          border-radius: 16px;
          padding: 1.5rem;
          margin: 1rem 0;
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .info-icon {
          font-size: 1.3rem;
        }

        .info-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e40af;
          margin: 0;
        }

        .info-list {
          margin: 0;
          padding-left: 1.5rem;
          color: #1e40af;
          line-height: 1.7;
        }

        .info-list li {
          margin-bottom: 0.5rem;
        }

        .info-list li:last-child {
          margin-bottom: 0;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        }

        .cancel-btn {
          padding: 0.875rem 2rem;
          background: transparent;
          color: var(--text-primary, #1e293b);
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-btn:hover:not(:disabled) {
          background: var(--bg-secondary, #f8fafc);
          border-color: var(--text-secondary, #94a3b8);
          transform: translateY(-1px);
        }

        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.2);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
        }

        .submit-btn:disabled {
          background: var(--text-secondary, #94a3b8);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-icon {
          font-size: 1.1rem;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .inquiry-form-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }

          .info-box {
            background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
            border-color: #3b82f6;
          }

          .info-title {
            color: #dbeafe;
          }

          .info-list {
            color: #dbeafe;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .inquiry-form-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .form-section {
            padding: 1.5rem;
          }

          .inquiry-form {
            gap: 1.25rem;
          }

          .info-box {
            padding: 1.25rem;
          }

          .button-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .cancel-btn,
          .submit-btn {
            width: 100%;
          }

          .form-textarea {
            min-height: 150px;
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

          .form-label {
            font-size: 0.95rem;
          }

          .info-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }

        /* 접근성 */
        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus,
        .cancel-btn:focus,
        .submit-btn:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        /* 애니메이션 성능 최적화 */
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