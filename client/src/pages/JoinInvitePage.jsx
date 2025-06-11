import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function JoinInvitePage() {
  const { state } = useLocation(); // state.role 받아옴
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!inviteCode) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/schools/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode })
      });

      const data = await res.json();

      if (res.ok) {
        navigate('/join/info', {
          state: {
            role: state?.role,
            inviteCode,
            classroom_id: data.classroom.classroom_id,
            school: data.classroom.school_id, // school_id 전달
            schoolName: data.classroom.school_name, // 학교명도 직접 전달
            grade: data.classroom.grade,
            classNumber: data.classroom.class_number
          }
        });
      } else {
        setError(data.message || '초대코드 확인 실패');
      }
    } catch (err) {
      console.error('초대코드 확인 오류:', err);
      setError('서버 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inviteCode && !isLoading) {
      handleSubmit();
    }
  };

  const formatInviteCode = (value) => {
    const raw = value.toUpperCase();
    const filtered = raw.replace(/[^A-Z0-9]/g, '').slice(0, 6);
    return filtered;
  };

  if (user === undefined) {
    return (
      <div className="join-invite-page">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">로딩 중...</div>
          </div>
        </div>
        
        <style jsx>{`
          .join-invite-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .loading-text {
            color: white;
            font-size: 1.1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="join-invite-page">
      <div className="container">
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">🔑 초대코드 입력</h1>
            <p className="welcome-text">선생님으로부터 받은 초대코드를 입력해주세요</p>
          </div>
        </div>

        <div className="main-content">
          {/* 기존 가입 학급 표시 */}
          {user?.joined_classrooms?.length > 0 && (
            <div className="existing-classrooms">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="title-icon">✅</span>
                  가입된 학급
                </h3>
              </div>
              
              <div className="classrooms-list">
                {user.joined_classrooms.map((cls) => (
                  <button
                    key={cls.classroom_id}
                    onClick={() => navigate(`/main?classroom_id=${cls.classroom_id}`)}
                    className="classroom-item"
                  >
                    <div className="classroom-info">
                      <div className="classroom-name">
                        {cls.grade}학년 {cls.class_number}반
                      </div>
                      <div className="school-name">{cls.school}</div>
                    </div>
                    <div className="classroom-arrow">→</div>
                  </button>
                ))}
              </div>
              
              <div className="additional-info">
                <span className="info-icon">💡</span>
                추가 학급 가입을 원하시면 아래에 새 초대코드를 입력하세요.
              </div>
            </div>
          )}

          {/* 초대코드 입력 섹션 */}
          <div className="invite-section">
            <div className="input-group">
              <label className="input-label">
                <span className="label-icon">🎫</span>
                초대코드
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="6자리 초대코드"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(formatInviteCode(e.target.value))}
                  onKeyPress={handleKeyPress}
                  className="invite-input"
                  maxLength={6}
                  disabled={isLoading}
                />
                <div className="input-progress">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${(inviteCode.length / 6) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="input-hint">
                영문 대문자와 숫자 조합 6자리
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="button-group">
              <button
                onClick={() => navigate(-1)}
                disabled={isLoading}
                className="back-btn"
              >
                이전으로
              </button>
              <button
                onClick={handleSubmit}
                disabled={!inviteCode || isLoading}
                className="continue-btn"
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    확인 중...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✨</span>
                    계속하기
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 도움말 섹션 */}
          <div className="help-section">
            <div className="help-header">
              <span className="help-icon">❓</span>
              <h4 className="help-title">초대코드가 없으신가요?</h4>
            </div>
            <ul className="help-list">
              <li>담임 선생님께 초대코드를 요청해주세요.</li>
              <li>학교 관리자나 교무실에 문의하실 수 있습니다.</li>
              <li>초대코드는 6자리 영문 대문자와 숫자 조합입니다.</li>
              <li>코드를 정확히 입력했는지 다시 한 번 확인해주세요.</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .join-invite-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .container {
          width: 100%;
          max-width: 600px;
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

        /* 기존 학급 섹션 */
        .existing-classrooms {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .section-header {
          margin-bottom: 1.5rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .title-icon {
          font-size: 1.3rem;
        }

        .classrooms-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .classroom-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: var(--bg-secondary, #f8fafc);
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .classroom-item:hover {
          border-color: #4f46e5;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          transform: translateX(4px);
        }

        .classroom-info {
          text-align: left;
        }

        .classroom-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin-bottom: 0.25rem;
        }

        .school-name {
          font-size: 0.9rem;
          color: var(--text-secondary, #64748b);
        }

        .classroom-arrow {
          font-size: 1.2rem;
          color: #4f46e5;
          font-weight: 700;
        }

        .additional-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
          border: 2px solid #93c5fd;
          border-radius: 12px;
          font-size: 0.9rem;
          color: #1e40af;
          font-weight: 500;
        }

        .info-icon {
          font-size: 1rem;
        }

        /* 초대코드 입력 섹션 */
        .invite-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .input-group {
          margin-bottom: 2rem;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin-bottom: 1rem;
        }

        .label-icon {
          font-size: 1.2rem;
        }

        .input-wrapper {
          position: relative;
          margin-bottom: 0.5rem;
        }

        .invite-input {
          width: 100%;
          padding: 1rem 1.5rem;
          border: 3px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1.2rem;
          font-weight: 600;
          text-align: center;
          letter-spacing: 0.2em;
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #1e293b);
          transition: all 0.3s ease;
          font-family: 'Courier New', monospace;
          box-sizing: border-box;
        }

        .invite-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          background: var(--bg-primary, #ffffff);
        }

        .invite-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .input-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--border-color, #e2e8f0);
          border-radius: 0 0 9px 9px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          transition: width 0.3s ease;
        }

        .input-hint {
          font-size: 0.85rem;
          color: var(--text-secondary, #64748b);
          text-align: center;
          margin-top: 0.5rem;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .error-icon {
          font-size: 1rem;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .back-btn {
          padding: 0.875rem 1.5rem;
          background: transparent;
          color: var(--text-primary, #1e293b);
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-btn:hover:not(:disabled) {
          background: var(--bg-secondary, #f8fafc);
          border-color: var(--text-secondary, #94a3b8);
          transform: translateY(-1px);
        }

        .back-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .continue-btn {
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

        .continue-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
        }

        .continue-btn:disabled {
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

        /* 도움말 섹션 */
        .help-section {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
          border-radius: 16px;
          padding: 1.5rem;
        }

        .help-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .help-icon {
          font-size: 1.3rem;
        }

        .help-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #92400e;
          margin: 0;
        }

        .help-list {
          margin: 0;
          padding-left: 1.5rem;
          color: #92400e;
          line-height: 1.7;
        }

        .help-list li {
          margin-bottom: 0.5rem;
        }

        .help-list li:last-child {
          margin-bottom: 0;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .join-invite-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }

          .error-message {
            background: #450a0a;
            color: #fca5a5;
          }

          .additional-info {
            background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
            border-color: #3b82f6;
            color: #dbeafe;
          }

          .help-section {
            background: linear-gradient(135deg, #451a03 0%, #78350f 100%);
            border-color: #f59e0b;
          }

          .help-title {
            color: #fbbf24;
          }

          .help-list {
            color: #fbbf24;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .join-invite-page {
            padding: 0.5rem;
            align-items: flex-start;
            padding-top: 2rem;
          }

          .header {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .existing-classrooms,
          .invite-section {
            padding: 1.5rem;
          }

          .classroom-item {
            padding: 0.875rem 1.25rem;
          }

          .button-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .back-btn,
          .continue-btn {
            width: 100%;
          }

          .help-section {
            padding: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .join-invite-page {
            padding: 0.25rem;
            padding-top: 1rem;
          }

          .header {
            padding: 1.25rem;
          }

          .existing-classrooms,
          .invite-section {
            padding: 1.25rem;
          }

          .invite-input {
            font-size: 1rem;
            padding: 0.875rem 1.25rem;
          }

          .classroom-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
            text-align: left;
          }

          .classroom-arrow {
            align-self: flex-end;
          }

          .help-section {
            padding: 1rem;
          }
        }

        /* 접근성 */
        .invite-input:focus,
        .back-btn:focus,
        .continue-btn:focus,
        .classroom-item:focus {
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

export default JoinInvitePage;