import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function JoinClassPage() {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('초대 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/users/join-classroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ invite_code: inviteCode.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        alert('🎉 학급 가입이 완료되었습니다!');
        navigate('/main');
      } else {
        setError(data.error || '학급 가입에 실패했습니다. 코드를 확인해주세요.');
      }
    } catch (err) {
      console.error('학급 가입 오류:', err);
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <div className="join-class-page">
      <div className="container">
        <div className="join-card">
          {/* 헤더 */}
          <div className="join-header">
            <div className="header-icon">🎓</div>
            <h1 className="join-title">학급 가입</h1>
            <p className="join-subtitle">
              선생님으로부터 받은 초대 코드를 입력하여<br />
              학급에 가입하세요
            </p>
          </div>

          {/* 가입 폼 */}
          <div className="join-form">
            <div className="input-group">
              <label className="input-label">
                <span className="label-icon">🔑</span>
                초대 코드
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setError(''); // 입력 시 에러 메시지 제거
                }}
                onKeyPress={handleKeyPress}
                placeholder="초대 코드를 입력하세요"
                className={`join-input ${error ? 'error' : ''}`}
                disabled={loading}
                maxLength={20}
              />
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}
              <div className="input-hint">
                선생님으로부터 받은 초대 코드를 정확히 입력해주세요
              </div>
            </div>

            <div className="button-group">
              <button
                onClick={() => navigate('/select-role')}
                className="back-button"
                disabled={loading}
              >
                <span className="button-icon">←</span>
                이전으로
              </button>
              <button
                onClick={handleJoin}
                className="join-button"
                disabled={loading || !inviteCode.trim()}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    가입 중...
                  </>
                ) : (
                  <>
                    <span className="button-icon">✓</span>
                    가입하기
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 도움말 섹션 */}
          <div className="help-section">
            <div className="help-card">
              <h3 className="help-title">
                <span className="help-icon">💡</span>
                가입 과정 안내
              </h3>
              <div className="help-steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <div className="step-title">초대 코드 입력</div>
                    <div className="step-description">선생님으로부터 받은 코드를 입력합니다</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <div className="step-title">학급 확인</div>
                    <div className="step-description">올바른 학급인지 정보를 확인합니다</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <div className="step-title">가입 완료</div>
                    <div className="step-description">학급의 모든 기능을 사용할 수 있습니다</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="features-card">
              <h3 className="features-title">
                <span className="features-icon">🌟</span>
                가입 후 이용 가능한 기능
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
                  <div className="feature-text">선생님과 소통</div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">📚</div>
                  <div className="feature-text">학습 자료 접근</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .join-class-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .container {
          width: 100%;
          max-width: 600px;
        }

        .join-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        /* 헤더 */
        .join-header {
          text-align: center;
          padding: 2.5rem 2rem 2rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          display: block;
        }

        .join-title {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          margin: 0 0 1rem 0;
          letter-spacing: 0.05em;
        }

        .join-subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin: 0;
        }

        /* 가입 폼 */
        .join-form {
          padding: 2rem;
        }

        .input-group {
          margin-bottom: 2rem;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.75rem;
        }

        .label-icon {
          font-size: 1.2rem;
        }

        .join-input {
          width: 100%;
          padding: 1rem 1.5rem;
          font-size: 1.1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .join-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .join-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.5);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.15);
        }

        .join-input.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .join-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #fca5a5;
          font-size: 0.9rem;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .error-icon {
          font-size: 1rem;
        }

        .input-hint {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 0.5rem;
          line-height: 1.4;
        }

        .button-group {
          display: flex;
          gap: 1rem;
        }

        .back-button,
        .join-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .back-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .join-button {
          background: #4f46e5;
          color: white;
        }

        .join-button:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }

        .join-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
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

        /* 도움말 섹션 */
        .help-section {
          padding: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .help-card,
        .features-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .help-title,
        .features-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin: 0 0 1rem 0;
        }

        .help-icon,
        .features-icon {
          font-size: 1.3rem;
        }

        .help-steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .step {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .step-number {
          width: 28px;
          height: 28px;
          background: #4f46e5;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
        }

        .step-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.25rem;
        }

        .step-description {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.4;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .feature-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .feature-item:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .feature-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .feature-text {
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        /* 애니메이션 */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 반응형 */
        @media (max-width: 768px) {
          .join-class-page {
            padding: 1rem 0.5rem;
          }

          .join-header {
            padding: 2rem 1.5rem 1.5rem 1.5rem;
          }

          .join-title {
            font-size: 1.5rem;
          }

          .join-subtitle {
            font-size: 1rem;
          }

          .join-form,
          .help-section {
            padding: 1.5rem;
          }

          .button-group {
            flex-direction: column;
          }

          .help-steps {
            gap: 1.5rem;
          }

          .step {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .step-number {
            align-self: center;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .join-title {
            font-size: 1.25rem;
          }

          .join-header {
            padding: 1.5rem 1rem;
          }

          .join-form,
          .help-section {
            padding: 1rem;
          }

          .join-input {
            padding: 0.875rem 1.25rem;
            font-size: 1rem;
          }

          .back-button,
          .join-button {
            padding: 0.875rem 1.25rem;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
}

export default JoinClassPage;