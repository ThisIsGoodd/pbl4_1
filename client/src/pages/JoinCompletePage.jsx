// client/src/pages/JoinCompletePage.jsx
import React, { useContext, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function JoinCompletePage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const schoolName = state?.schoolName || '학교';
  const className = state?.className || '학급';
  const role = state?.role || '구성원';

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/users/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user); // context 상태 갱신
      }

      // 메인 페이지로 이동
      navigate('/main');
    } catch (err) {
      console.error('프로필 재요청 실패:', err);
      navigate('/main');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-complete-page">
      <div className="container">
        <div className="success-card">
          {/* 성공 애니메이션 */}
          <div className="success-animation">
            <div className="success-circle">
              <div className="success-icon">🎉</div>
            </div>
          </div>

          {/* 메인 메시지 */}
          <div className="success-content">
            <h1 className="success-title">가입 완료!</h1>
            <p className="success-message">
              <span className="highlight">{schoolName}</span>에<br />
              성공적으로 가입하셨습니다!
            </p>
          </div>

          {/* 가입 정보 요약 */}
          <div className="join-summary">
            <div className="summary-item">
              <div className="summary-icon">🏫</div>
              <div className="summary-content">
                <div className="summary-label">학교</div>
                <div className="summary-value">{schoolName}</div>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon">📚</div>
              <div className="summary-content">
                <div className="summary-label">학급</div>
                <div className="summary-value">{className}</div>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon">👤</div>
              <div className="summary-content">
                <div className="summary-label">역할</div>
                <div className="summary-value">{role}</div>
              </div>
            </div>
          </div>

          {/* 기능 소개 */}
          <div className="features-section">
            <h3 className="features-title">이제 이런 기능들을 사용할 수 있어요!</h3>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">📢</div>
                <div className="feature-text">공지사항 확인</div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📅</div>
                <div className="feature-text">일정 관리</div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💬</div>
                <div className="feature-text">채팅 소통</div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔔</div>
                <div className="feature-text">실시간 알림</div>
              </div>
            </div>
          </div>

          {/* 시작하기 버튼 */}
          <button
            onClick={handleStart}
            disabled={loading}
            className="start-button"
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                시작하는 중...
              </>
            ) : (
              '시작하기 🚀'
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .join-complete-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .container {
          width: 100%;
          max-width: 500px;
        }

        .success-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 3rem 2rem;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* 성공 애니메이션 */
        .success-animation {
          margin-bottom: 2rem;
          position: relative;
        }

        .success-circle {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          animation: pulse 2s infinite;
        }

        .success-icon {
          font-size: 3rem;
          animation: bounce 1s ease-out;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
          }
        }

        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0, 0, 0);
          }
          40%, 43% {
            transform: translate3d(0, -30px, 0);
          }
          70% {
            transform: translate3d(0, -15px, 0);
          }
          90% {
            transform: translate3d(0, -4px, 0);
          }
        }

        /* 메인 콘텐츠 */
        .success-content {
          margin-bottom: 2rem;
        }

        .success-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          margin: 0 0 1rem 0;
        }

        .success-message {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin: 0;
        }

        .highlight {
          color: #fbbf24;
          font-weight: 700;
        }

        /* 가입 정보 요약 */
        .join-summary {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-icon {
          font-size: 1.5rem;
          width: 40px;
          text-align: center;
        }

        .summary-content {
          flex: 1;
          text-align: left;
        }

        .summary-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 0.25rem;
        }

        .summary-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
        }

        /* 기능 소개 */
        .features-section {
          margin-bottom: 2rem;
        }

        .features-title {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 1rem 0;
          font-weight: 600;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .feature-item {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .feature-icon {
          font-size: 1.5rem;
        }

        .feature-text {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }

        /* 시작하기 버튼 */
        .start-button {
          width: 100%;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 16px;
          padding: 1rem 2rem;
          font-size: 1.2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .start-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
        }

        .start-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .join-complete-page {
            padding: 1rem 0.5rem;
          }

          .success-card {
            padding: 2rem 1.5rem;
          }

          .success-title {
            font-size: 2rem;
          }

          .success-message {
            font-size: 1.1rem;
          }

          .success-circle {
            width: 100px;
            height: 100px;
          }

          .success-icon {
            font-size: 2.5rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .start-button {
            font-size: 1.1rem;
            padding: 0.875rem 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .success-card {
            padding: 1.5rem 1rem;
          }

          .success-title {
            font-size: 1.75rem;
          }

          .success-message {
            font-size: 1rem;
          }

          .success-circle {
            width: 80px;
            height: 80px;
          }

          .success-icon {
            font-size: 2rem;
          }

          .feature-item {
            padding: 0.75rem;
          }

          .summary-item {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }
        }

        /* 다크모드 대응 */
        @media (prefers-color-scheme: dark) {
          .success-card {
            background: rgba(30, 30, 30, 0.9);
          }
          
          .join-summary,
          .feature-item {
            background: rgba(55, 65, 81, 0.3);
          }
          
          .feature-item:hover {
            background: rgba(55, 65, 81, 0.5);
          }
        }

        /* 접근성 개선 */
        .start-button:focus {
          outline: 2px solid #fbbf24;
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

export default JoinCompletePage;