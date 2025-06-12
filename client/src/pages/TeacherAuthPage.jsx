import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function TeacherAuthPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async () => {
    if (!code.trim()) {
      alert('초대 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/verify-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code: code.trim() })
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        // 관리자 권한 토큰 저장
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        alert('🎉 인증 성공! 교사 권한이 부여되었습니다.');

        if (data.hasClassroom) {
          navigate(`/classroom/dashboard?classroom_id=${data.classroomId}`);
        } else {
          navigate('/classroom/create');
        }
      } else {
        alert(data.message || '인증에 실패했습니다. 코드를 확인해주세요.');
      }
    } catch (err) {
      console.error('인증 오류:', err);
      alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <div className="teacher-auth-page">
      <div className="container">
        <div className="auth-card">
          {/* 헤더 */}
          <div className="auth-header">
            <div className="header-icon">👨‍🏫</div>
            <h1 className="auth-title">교사 인증</h1>
            <p className="auth-subtitle">
              학교에서 제공받은 초대 코드를 입력하여<br />
              교사 권한을 획득하세요
            </p>
          </div>

          {/* 인증 폼 */}
          <div className="auth-form">
            <div className="input-group">
              <label className="input-label">
                <span className="label-icon">🔑</span>
                초대 코드
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="초대 코드를 입력하세요"
                className="auth-input"
                disabled={loading}
                maxLength={20}
              />
              <div className="input-hint">
                학교 관리자로부터 받은 초대 코드를 정확히 입력해주세요
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
                onClick={handleVerify}
                className="verify-button"
                disabled={loading || !code.trim()}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    인증 중...
                  </>
                ) : (
                  <>
                    <span className="button-icon">✓</span>
                    인증하기
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
                인증 과정 안내
              </h3>
              <div className="help-steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <div className="step-title">초대 코드 입력</div>
                    <div className="step-description">학교 관리자로부터 받은 코드를 입력합니다</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <div className="step-title">권한 부여</div>
                    <div className="step-description">인증 완료 후 교사 권한이 자동으로 부여됩니다</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <div className="step-title">학급 관리</div>
                    <div className="step-description">학급 생성 및 관리 기능을 사용할 수 있습니다</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-link-card">
              <h3 className="admin-title">
                <span className="admin-icon">🏫</span>
                학교 관리자이신가요?
              </h3>
              <p className="admin-description">
                새로운 학교를 생성하고 관리하려면<br />
                학교 생성 요청을 해주세요
              </p>
              <button
                onClick={() => navigate('/request-school')}
                className="admin-button"
                disabled={loading}
              >
                <span className="button-icon">📝</span>
                학교 생성 요청하기
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .teacher-auth-page {
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

        .auth-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        /* 헤더 */
        .auth-header {
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

        .auth-title {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          margin: 0 0 1rem 0;
          letter-spacing: 0.05em;
        }

        .auth-subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin: 0;
        }

        /* 인증 폼 */
        .auth-form {
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

        .auth-input {
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

        .auth-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .auth-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.5);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.15);
        }

        .auth-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
        .verify-button {
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

        .verify-button {
          background: #4f46e5;
          color: white;
        }

        .verify-button:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }

        .verify-button:disabled {
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
        .admin-link-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .help-title,
        .admin-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin: 0 0 1rem 0;
        }

        .help-icon,
        .admin-icon {
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

        .admin-description {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin: 0 0 1.5rem 0;
        }

        .admin-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1.5rem;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .admin-button:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .admin-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* 애니메이션 */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 반응형 */
        @media (max-width: 768px) {
          .teacher-auth-page {
            padding: 1rem 0.5rem;
          }

          .auth-header {
            padding: 2rem 1.5rem 1.5rem 1.5rem;
          }

          .auth-title {
            font-size: 1.5rem;
          }

          .auth-subtitle {
            font-size: 1rem;
          }

          .auth-form,
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
        }

        @media (max-width: 480px) {
          .auth-title {
            font-size: 1.25rem;
          }

          .auth-header {
            padding: 1.5rem 1rem;
          }

          .auth-form,
          .help-section {
            padding: 1rem;
          }

          .auth-input {
            padding: 0.875rem 1.25rem;
            font-size: 1rem;
          }

          .back-button,
          .verify-button {
            padding: 0.875rem 1.25rem;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
}

export default TeacherAuthPage;