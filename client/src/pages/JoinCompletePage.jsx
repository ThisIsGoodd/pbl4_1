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
            <div className="confetti">
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
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

            {className !== '학급' && (
              <div className="summary-item">
                <div className="summary-icon">📚</div>
                <div className="summary-content">
                  <div className="summary-label">학급</div>
                  <div className="summary-value">{className}</div>
                </div>
              </div>
            )}

            <div className="summary-item">
              <div className="summary-icon">👤</div>
              <div className="summary-content">
                <div className="summary-label">역할</div>
                <div className="summary-value">{role}</div>
              </div>
            </div>
          </div>

          {/* 다음 단계 안내 */}
          <div className="next-steps">
            <h3 className="steps-title">
              <span className="steps-icon">✨</span>
              이제 다음과 같은 기능을 사용할 수 있습니다
            </h3>
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
                <div className="feature-text">소통 및 알림</div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📝</div>
                <div className="feature-text">학급 활동 참여</div>
              </div>
            </div>
          </div>

          {/* 시작 버튼 */}
          <div className="action-section">
            <button
              onClick={handleStart}
              disabled={loading}
              className="start-button"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  설정 중...
                </>
              ) : (
                <>
                  <span className="button-icon">🚀</span>
                  시작하기
                </>
              )}
            </button>
            <p className="start-note">
              환영합니다! 지금 바로 ClassFeed를 시작해보세요.
            </p>
          </div>
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
          position: relative;
          overflow: hidden;
        }

        .container {
          width: 100%;
          max-width: 600px;
          animation: slideUp 0.8s ease-out;
        }

        .success-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 3rem 2rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        /* 성공 애니메이션 */
        .success-animation {
          position: relative;
          margin-bottom: 2rem;
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
          animation: bounceIn 0.8s ease-out 0.3s both;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        }

        .success-icon {
          font-size: 3rem;
          animation: rotate 2s ease-in-out 1s infinite;
        }

        .confetti {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #fbbf24;
          animation: confettiFall 3s linear infinite;
        }

        .confetti-piece:nth-child(1) {
          background: #f59e0b;
          left: -60px;
          animation-delay: 0s;
        }

        .confetti-piece:nth-child(2) {
          background: #10b981;
          left: -30px;
          animation-delay: 0.5s;
        }

        .confetti-piece:nth-child(3) {
          background: #3b82f6;
          left: 0px;
          animation-delay: 1s;
        }

        .confetti-piece:nth-child(4) {
          background: #8b5cf6;
          left: 30px;
          animation-delay: 1.5s;
        }

        .confetti-piece:nth-child(5) {
          background: #ef4444;
          left: 60px;
          animation-delay: 2s;
        }

        .confetti-piece:nth-child(6) {
          background: #f97316;
          left: 90px;
          animation-delay: 2.5s;
        }

        /* 메인 콘텐츠 */
        .success-content {
          margin-bottom: 2.5rem;
        }

        .success-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          margin: 0 0 1rem 0;
          animation: fadeIn 0.8s ease-out 0.6s both;
        }

        .success-message {
          font-size: 1.3rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin: 0;
          animation: fadeIn 0.8s ease-out 0.8s both;
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
          animation: fadeIn 0.8s ease-out 1s both;
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
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 0.25rem;
        }

        .summary-value {
          font-size: 1rem;
          font-weight: 600;
          color: white;
        }

        /* 다음 단계 */
        .next-steps {
          margin-bottom: 2.5rem;
          animation: fadeIn 0.8s ease-out 1.2s both;
        }

        .steps-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 1.2rem;
          font-weight: 600;
          color: white;
          margin: 0 0 1.5rem 0;
        }

        .steps-icon {
          font-size: 1.3rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
        }

        .feature-item {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem;
          transition: all 0.2s ease;
        }

        .feature-item:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .feature-icon {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
        }

        .feature-text {
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        /* 액션 섹션 */
        .action-section {
          animation: fadeIn 0.8s ease-out 1.4s both;
        }

        .start-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 1rem;
          min-height: 56px;
        }

        .start-button:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
        }

        .start-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .button-icon {
          font-size: 1.3rem;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .start-note {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          line-height: 1.5;
        }

        /* 애니메이션 */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes rotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-10deg);
          }
          75% {
            transform: rotate(10deg);
          }
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 반응형 */
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
            grid-template-columns: repeat(2, 1fr);
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

          .features-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
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

        /* 접근성 */
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