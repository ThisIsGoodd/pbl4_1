import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function TeacherAuthPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async () => {
    if (!code.trim()) {
      alert('인증 코드를 입력해주세요.');
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
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        // ✅ 관리자 권한 토큰 저장
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        alert('인증 성공! 관리자 권한이 부여되었습니다.');

        if (data.hasClassroom) {
          navigate(`/classroom/dashboard?classroom_id=${data.classroomId}`);
        } else {
          navigate('/classroom/create');
        }
      } else {
        alert(data.message || '인증 실패. 관리자에게 문의하세요.');
      }
    } catch (err) {
      console.error('인증 오류:', err);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerify();
    }
  };

  return (
    <div className="teacher-auth-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>👨‍🏫 교사 인증</h1>
          <p>학교에서 제공받은 교사 인증 코드를 입력해주세요</p>
        </div>

        {/* 콘텐츠 */}
        <div className="content">
          {/* 인증 폼 */}
          <div className="auth-form">
            <div className="form-group">
              <label htmlFor="code">교사 인증 코드</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="인증 코드를 입력하세요"
                disabled={loading}
                className="code-input"
              />
              <p className="form-help">
                학교 관리자로부터 받은 교사 인증 코드를 정확히 입력해주세요.
              </p>
            </div>

            <div className="button-group">
              <button
                onClick={() => navigate('/select-role')}
                className="back-button"
                disabled={loading}
              >
                뒤로 가기
              </button>
              <button
                onClick={handleVerify}
                className="verify-button"
                disabled={loading || !code.trim()}
              >
                {loading ? '인증 중...' : '인증하기'}
              </button>
            </div>
          </div>

          {/* 추가 옵션 */}
          <div className="additional-options">
            <div className="option-card">
              <h3>🏫 새로운 학교 등록</h3>
              <p>우리 학교가 아직 등록되지 않았다면 새로운 학교를 생성할 수 있습니다.</p>
              <button
                onClick={() => navigate('/request-school')}
                className="create-school-button"
                disabled={loading}
              >
                학교 생성 요청하기
              </button>
            </div>

            <div className="help-section">
              <h3>❓ 도움이 필요하신가요?</h3>
              <div className="help-items">
                <div className="help-item">
                  <span className="help-icon">📞</span>
                  <div className="help-text">
                    <strong>인증 코드를 받지 못했나요?</strong>
                    <p>학교 관리자에게 교사 인증 코드를 요청해주세요.</p>
                  </div>
                </div>
                <div className="help-item">
                  <span className="help-icon">🔑</span>
                  <div className="help-text">
                    <strong>코드가 작동하지 않나요?</strong>
                    <p>코드를 정확히 입력했는지 확인하고, 문제가 지속되면 관리자에게 문의하세요.</p>
                  </div>
                </div>
                <div className="help-item">
                  <span className="help-icon">🏫</span>
                  <div className="help-text">
                    <strong>학교가 등록되지 않았나요?</strong>
                    <p>위의 '학교 생성 요청하기' 버튼을 통해 새로운 학교를 등록할 수 있습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .teacher-auth-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .container {
          max-width: 600px;
          width: 100%;
        }

        .header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.8rem;
          font-weight: 700;
        }

        .header p {
          margin: 0;
          color: #64748b;
          font-size: 1rem;
        }

        .content {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .auth-form {
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
        }

        .code-input {
          width: 100%;
          padding: 1rem;
          border: 2px solid rgba(226, 232, 240, 0.8);
          border-radius: 12px;
          font-size: 1rem;
          text-align: center;
          letter-spacing: 2px;
          font-weight: 600;
          transition: all 0.2s ease;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.8);
        }

        .code-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          background: white;
        }

        .code-input:disabled {
          background: rgba(248, 250, 252, 0.8);
          cursor: not-allowed;
        }

        .form-help {
          margin: 0.5rem 0 0 0;
          font-size: 0.85rem;
          color: #64748b;
          text-align: center;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .back-button,
        .verify-button {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-button {
          background: #64748b;
          color: white;
        }

        .back-button:hover:not(:disabled) {
          background: #475569;
          transform: translateY(-1px);
        }

        .verify-button {
          background: #4f46e5;
          color: white;
        }

        .verify-button:hover:not(:disabled) {
          background: #3730a3;
          transform: translateY(-1px);
        }

        .verify-button:disabled,
        .back-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }

        .additional-options {
          border-top: 1px solid rgba(226, 232, 240, 0.6);
          padding-top: 2rem;
        }

        .option-card {
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .option-card h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 1rem;
        }

        .option-card p {
          margin: 0 0 1rem 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        .create-school-button {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 25px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .create-school-button:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-1px);
        }

        .create-school-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }

        .help-section h3 {
          margin: 0 0 1rem 0;
          color: #374151;
          font-size: 1rem;
        }

        .help-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .help-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 8px;
        }

        .help-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .help-text strong {
          display: block;
          margin-bottom: 0.25rem;
          color: #374151;
          font-size: 0.9rem;
        }

        .help-text p {
          margin: 0;
          color: #64748b;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .teacher-auth-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
          }

          .header h1 {
            font-size: 1.5rem;
          }

          .content {
            padding: 1.5rem;
          }

          .button-group {
            flex-direction: column;
          }

          .help-item {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }

          .help-text {
            text-align: left;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 1rem;
          }

          .content {
            padding: 1rem;
          }

          .code-input {
            font-size: 0.9rem;
            letter-spacing: 1px;
          }
        }
      `}</style>
    </div>
  );
}

export default TeacherAuthPage;