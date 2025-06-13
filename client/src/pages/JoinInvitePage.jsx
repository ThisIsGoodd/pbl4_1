// client/src/pages/JoinInvitePage.jsx
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
      setError('서버 오류');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (user === undefined) {
    return (
      <div className="join-invite-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">로딩 중...</p>
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
            justify-content: center;
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
            <div className="section-header">
              <h3 className="section-title">
                <span className="title-icon">🎯</span>
                초대코드 입력
              </h3>
            </div>

            <div className="input-group">
              <label className="input-label">초대코드</label>
              <input
                type="text"
                placeholder="초대코드를 입력하세요"
                value={inviteCode}
                onChange={(e) => {
                  const raw = e.target.value.toUpperCase();
                  const filtered = raw.replace(/[^A-Z0-9]/g, '').slice(0, 8);
                  setInviteCode(filtered);
                  setError(''); // 입력 시 에러 메시지 제거
                }}
                onKeyPress={handleKeyPress}
                className={`invite-input ${error ? 'error' : ''}`}
                maxLength={8}
                autoFocus
              />
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}
            </div>

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
                    <div className="button-spinner"></div>
                    확인 중...
                  </>
                ) : (
                  <>
                    <span className="button-icon">🚀</span>
                    계속하기
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 도움말 섹션 */}
          <div className="help-section">
            <div className="help-card">
              <h4 className="help-title">
                <span className="help-icon">❓</span>
                초대코드를 받지 못하셨나요?
              </h4>
              <ul className="help-list">
                <li>담임 선생님께 초대코드를 요청해주세요</li>
                <li>학교 사무실에 문의하실 수 있습니다</li>
                <li>초대코드는 6-8자리 영문자와 숫자로 구성됩니다</li>
                <li>대소문자는 구분하지 않습니다</li>
              </ul>
            </div>
          </div>
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

        .container {
          width: 100%;
          max-width: 600px;
        }

        .header {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px 20px 0 0;
          padding: 2rem;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-bottom: none;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .main-title {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          margin: 0;
          letter-spacing: 0.05em;
        }

        .welcome-text {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          line-height: 1.5;
        }

        .main-content {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 0 0 20px 20px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-top: none;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* 기존 학급 섹션 */
        .existing-classrooms {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .section-header {
          margin-bottom: 1rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.2rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .title-icon {
          font-size: 1.3rem;
        }

        .classrooms-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .classroom-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
          text-align: left;
        }

        .classroom-item:hover {
          border-color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.2);
          transform: translateX(4px);
        }

        .classroom-info {
          flex: 1;
        }

        .classroom-name {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .school-name {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .classroom-arrow {
          font-size: 1.2rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.8);
        }

        .additional-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .info-icon {
          font-size: 1.1rem;
        }

        /* 초대코드 입력 섹션 */
        .invite-section {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .input-label {
          display: block;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.75rem;
        }

        .invite-input {
          width: 100%;
          padding: 1rem 1.5rem;
          font-size: 1.2rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-align: center;
          text-transform: uppercase;
          transition: all 0.3s ease;
        }

        .invite-input::placeholder {
          color: rgba(255, 255, 255, 0.6);
          text-transform: none;
          letter-spacing: 0;
        }

        .invite-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1);
        }

        .invite-input.error {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 8px;
          color: #fca5a5;
          font-size: 0.9rem;
        }

        .error-icon {
          font-size: 1rem;
        }

        .button-group {
          display: flex;
          gap: 1rem;
        }

        .back-btn,
        .continue-btn {
          flex: 1;
          padding: 1rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .back-btn {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .back-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .continue-btn {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
        }

        .continue-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
        }

        .continue-btn:disabled,
        .back-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .button-icon {
          font-size: 1.1rem;
        }

        .button-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* 도움말 섹션 */
        .help-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .help-card {
          text-align: left;
        }

        .help-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin: 0 0 1rem 0;
        }

        .help-icon {
          font-size: 1.2rem;
        }

        .help-list {
          margin: 0;
          padding-left: 1.5rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .help-list li {
          margin-bottom: 0.5rem;
          line-height: 1.4;
          font-size: 0.9rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
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

        /* 다크모드 대응 */
        @media (prefers-color-scheme: dark) {
          .header,
          .main-content {
            background: rgba(30, 30, 30, 0.9);
          }

          .existing-classrooms,
          .invite-section,
          .help-section {
            background: rgba(55, 65, 81, 0.3);
          }

          .classroom-item {
            background: rgba(55, 65, 81, 0.3);
          }

          .classroom-item:hover {
            background: rgba(55, 65, 81, 0.5);
          }

          .additional-info {
            background: rgba(55, 65, 81, 0.2);
          }
        }

        /* 접근성 개선 */
        .invite-input:focus,
        .back-btn:focus,
        .continue-btn:focus,
        .classroom-item:focus {
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

export default JoinInvitePage;