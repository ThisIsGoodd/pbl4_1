import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function RequestSchoolPage() {
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const formatPhoneNumber = (value) => {
    const onlyNums = value.replace(/\D/g, '');
    if (onlyNums.length <= 3) return onlyNums;
    if (onlyNums.length <= 7) return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3)}`;
    return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 7)}-${onlyNums.slice(7, 11)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const phoneRegex = /^\d{3}-\d{4}-\d{4}$/;

    if (
      !schoolName.trim() ||
      !schoolType ||
      schoolCode.length !== 7 ||
      !name.trim() ||
      !phone.trim() ||
      !phoneRegex.test(phone)
    ) {
      setError('모든 항목을 정확히 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/schools/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schoolName, schoolType, schoolCode, name, phone }),
      });

      if (res.ok) {
        navigate('/school/pending');
      } else {
        const result = await res.json();
        setError(result.error || '요청에 실패했습니다.');
      }
    } catch (err) {
      console.error('🔥 요청 오류:', err);
      setError('서버 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="request-school-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <h1 className="page-title">
              🏫 학교 생성 요청
            </h1>
            <p className="page-subtitle">
              새로운 학교를 등록하기 위한 정보를 입력해주세요
            </p>
          </div>
        </div>

        {/* 메인 폼 */}
        <div className="form-container">
          <form onSubmit={handleSubmit} className="form">
            {/* 학교 정보 섹션 */}
            <div className="form-section">
              <h3 className="section-title">
                <span className="section-icon">🏫</span>
                학교 정보
              </h3>
              
              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">학교명</span>
                  <span className="label-required">*</span>
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="예: 서울초등학교"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">학교 유형</span>
                  <span className="label-required">*</span>
                </label>
                <div className="radio-group">
                  {['초등학교', '중학교', '고등학교'].map((type) => (
                    <label key={type} className="radio-item">
                      <input
                        type="radio"
                        name="schoolType"
                        value={type}
                        checked={schoolType === type}
                        onChange={(e) => setSchoolType(e.target.value)}
                        className="radio-input"
                      />
                      <span className="radio-label">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">학교 코드</span>
                  <span className="label-required">*</span>
                </label>
                <input
                  type="text"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  maxLength={7}
                  inputMode="numeric"
                  placeholder="1234567 (교육부 제공 7자리 코드)"
                  className="form-input"
                  required
                />
                <p className="form-hint">
                  💡 교육부에서 제공하는 7자리 학교 고유 코드를 입력해주세요
                </p>
              </div>
            </div>

            {/* 신청자 정보 섹션 */}
            <div className="form-section">
              <h3 className="section-title">
                <span className="section-icon">👤</span>
                신청자 정보
              </h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-text">성명</span>
                    <span className="label-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-text">연락처</span>
                    <span className="label-required">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                    placeholder="010-1234-5678"
                    className="form-input"
                    maxLength={13}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {/* 버튼 그룹 */}
            <div className="button-group">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="button-secondary"
                disabled={isSubmitting}
              >
                <span className="button-icon">←</span>
                뒤로 가기
              </button>
              
              <button
                type="submit"
                className="button-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    요청 중...
                  </>
                ) : (
                  <>
                    <span className="button-icon">📤</span>
                    요청하기
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 안내 정보 */}
        <div className="info-section">
          <h3 className="info-title">
            <span className="info-icon">ℹ️</span>
            처리 안내
          </h3>
          <ul className="info-list">
            <li>관리자 검토 후 승인 처리됩니다 (1-3 영업일)</li>
            <li>승인 완료 시 알림으로 안내드립니다</li>
            <li>문의사항은 고객센터로 연락 바랍니다</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        /* CSS 변수 정의 */
        .request-school-page {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-glass: rgba(255, 255, 255, 0.95);
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --accent-color: #4f46e5;
          --accent-hover: #4338ca;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --error-color: #ef4444;
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
        }

        /* 다크모드 */
        @media (prefers-color-scheme: dark) {
          .request-school-page {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-glass: rgba(15, 23, 42, 0.95);
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --text-muted: #64748b;
            --border-color: #334155;
          }
        }

        .request-school-page {
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
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        /* 헤더 */
        .header {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-xl);
          border: 1px solid rgba(255, 255, 255, 0.3);
          text-align: center;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.5rem 0;
        }

        .page-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin: 0;
          font-weight: 500;
        }

        /* 폼 컨테이너 */
        .form-container {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-xl);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* 폼 섹션 */
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .section-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-icon {
          font-size: 1.4rem;
        }

        /* 폼 요소 */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .form-label {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.95rem;
        }

        .label-required {
          color: var(--error-color);
        }

        .form-input {
          padding: 1rem;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 1rem;
          color: var(--text-primary);
          background: var(--bg-primary);
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-input::placeholder {
          color: var(--text-muted);
        }

        .form-hint {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
        }

        /* 라디오 버튼 */
        .radio-group {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .radio-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          padding: 0.75rem 1rem;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
          background: var(--bg-primary);
        }

        .radio-item:hover {
          border-color: var(--accent-color);
        }

        .radio-input {
          margin: 0;
          accent-color: var(--accent-color);
        }

        .radio-input:checked + .radio-label {
          color: var(--accent-color);
          font-weight: 600;
        }

        .radio-item:has(.radio-input:checked) {
          border-color: var(--accent-color);
          background: rgba(79, 70, 229, 0.05);
        }

        .radio-label {
          font-size: 0.95rem;
          color: var(--text-primary);
          transition: all 0.2s ease;
        }

        /* 에러 메시지 */
        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: var(--error-color);
          font-size: 0.95rem;
        }

        .error-icon {
          font-size: 1.1rem;
        }

        /* 버튼 그룹 */
        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .button-primary,
        .button-secondary {
          flex: 1;
          padding: 1rem 1.5rem;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-height: 48px;
        }

        .button-primary {
          background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
          color: white;
          box-shadow: var(--shadow-md);
        }

        .button-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .button-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .button-secondary {
          background: var(--bg-primary);
          color: var(--text-primary);
          border: 2px solid var(--border-color);
        }

        .button-secondary:hover:not(:disabled) {
          background: var(--bg-secondary);
          border-color: var(--accent-color);
        }

        .button-icon {
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

        /* 안내 정보 */
        .info-section {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .info-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .info-icon {
          font-size: 1.2rem;
        }

        .info-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .info-list li {
          color: var(--text-secondary);
          font-size: 0.95rem;
          position: relative;
          padding-left: 1.5rem;
        }

        .info-list li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--accent-color);
          font-weight: bold;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .request-school-page {
            padding: 0.5rem;
          }

          .header,
          .form-container,
          .info-section {
            padding: 1.5rem;
            margin-bottom: 1rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .page-subtitle {
            font-size: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .radio-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .button-group {
            flex-direction: column;
          }

          .section-title {
            font-size: 1.1rem;
          }
        }

        /* 태블릿 */
        @media (max-width: 1024px) and (min-width: 769px) {
          .container {
            max-width: 700px;
          }

          .header,
          .form-container {
            padding: 1.75rem;
          }
        }

        /* 접근성 개선 */
        .form-input:focus,
        .button-primary:focus,
        .button-secondary:focus,
        .radio-item:focus-within {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }

        /* 프린트 스타일 */
        @media print {
          .request-school-page {
            background: white;
            padding: 0;
          }

          .header,
          .form-container,
          .info-section {
            background: white;
            box-shadow: none;
            border: 1px solid #ccc;
          }

          .button-group {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default RequestSchoolPage;