import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function ClassroomCreatePage() {
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [message, setMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { refreshToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  // 반응형 처리
  useState(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

  const handleCreate = async () => {
    // 클라이언트 유효성 검사
    if (!grade || !classNumber) {
      return setError('학년과 반을 모두 입력해주세요.');
    }

    const gradeNum = parseInt(grade);
    const classNum = parseInt(classNumber);

    // 더 엄격한 유효성 검사
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) {
      return setError('학년은 1학년부터 6학년까지만 입력 가능합니다.');
    }

    if (isNaN(classNum) || classNum < 1 || classNum > 20) {
      return setError('반 번호는 1반부터 20반까지만 입력 가능합니다.');
    }

    setError('');
    setIsCreating(true);

    try {
      const res = await fetch('http://localhost:3001/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          grade: gradeNum,
          class_number: classNum
        })
      });

      const data = await res.json();

      if (res.ok) {
        setInviteCode(data.invite_code);
        setMessage(data.message || '학급이 생성되었습니다.');
        
        // 사용자 정보 새로고침 후 이동
        if (data.classroom_id) {
          try {
            await refreshToken();
            
            // 성공 후 잠시 대기하여 사용자가 초대코드를 확인할 수 있도록 함
            setTimeout(() => {
              navigate(`/main?classroom_id=${data.classroom_id}`);
            }, 3000);
          } catch (refreshErr) {
            console.error('토큰 새로고침 실패:', refreshErr);
            // 새로고침 실패해도 이동은 진행
            setTimeout(() => {
              navigate(`/main?classroom_id=${data.classroom_id}`);
            }, 3000);
          }
        } else {
          // fallback: classroom_id가 없으면 기존 방식 사용
          setTimeout(async () => {
            try {
              const classroomRes = await fetch('http://localhost:3001/api/classrooms/my-classroom', {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (classroomRes.ok) {
                const classroomData = await classroomRes.json();
                await refreshToken();
                navigate(`/main?classroom_id=${classroomData.classroom.classroom_id}`);
              } else {
                navigate('/classroom/create');
              }
            } catch (err) {
              console.error('학급 정보 조회 실패:', err);
              navigate('/classroom/create');
            }
          }, 3000);
        }
      } else {
        // 개선된 에러 처리
        if (res.status === 400) {
          setError(data.error || '입력값이 올바르지 않습니다.');
        } else if (res.status === 403) {
          setError('학급 생성 권한이 없습니다. 교사 인증을 먼저 완료해주세요.');
        } else if (res.status === 500) {
          setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setError(data.error || '학급 생성에 실패했습니다.');
        }
      }
    } catch (err) {
      console.error('🔥 학급 생성 오류:', err);
      setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
    } finally {
      setIsCreating(false);
    }
  };

  // 입력 필드 검증 함수
  const handleGradeChange = (e) => {
    const value = e.target.value;
    // 빈 값이거나 1-6 범위의 숫자만 허용
    if (value === '' || (/^[1-6]$/.test(value))) {
      setGrade(value);
      setError(''); // 유효한 입력시 에러 초기화
    }
  };

  const handleClassNumberChange = (e) => {
    const value = e.target.value;
    // 빈 값이거나 1-20 범위의 숫자만 허용
    if (value === '' || (/^([1-9]|1[0-9]|20)$/.test(value))) {
      setClassNumber(value);
      setError(''); // 유효한 입력시 에러 초기화
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      alert('초대코드가 클립보드에 복사되었습니다!');
    });
  };

  return (
    <div className="classroom-create-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">🏫 학급 생성</h1>
            <p className="subtitle">새로운 학급을 만들어 학부모님들과 소통해보세요</p>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="main-content">
          {!message ? (
            <div className="form-container">
              {/* 안내 메시지 */}
              <div className="info-card">
                <div className="info-header">
                  <span className="info-icon">📋</span>
                  <h3 className="info-title">학급 생성 안내</h3>
                </div>
                <ul className="info-list">
                  <li>학년: 1학년부터 6학년까지 입력 가능합니다</li>
                  <li>반 번호: 1반부터 20반까지 입력 가능합니다</li>
                  <li>같은 학년, 반이 이미 존재하면 기존 학급 정보를 반환합니다</li>
                  <li>생성 후 초대코드를 학부모님께 공유해주세요</li>
                </ul>
              </div>

              {/* 입력 폼 */}
              <div className="form-card">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🎓</span>
                    학년
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className={`form-select ${error && !grade ? 'error' : ''}`}
                    disabled={isCreating}
                  >
                    <option value="">학년을 선택하세요</option>
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num}학년</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">📚</span>
                    반 번호
                  </label>
                  <select
                    value={classNumber}
                    onChange={(e) => setClassNumber(e.target.value)}
                    className={`form-select ${error && !classNumber ? 'error' : ''}`}
                    disabled={isCreating}
                  >
                    <option value="">반을 선택하세요</option>
                    {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}반</option>
                    ))}
                  </select>
                </div>

                {/* 에러 메시지 */}
                {error && (
                  <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{error}</span>
                  </div>
                )}

                {/* 생성 버튼 */}
                <button 
                  onClick={handleCreate} 
                  className={`create-button ${isCreating || !grade || !classNumber ? 'disabled' : ''}`}
                  disabled={isCreating || !grade || !classNumber}
                >
                  {isCreating ? (
                    <>
                      <span className="spinner"></span>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <span className="button-icon">✨</span>
                      학급 생성하기
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* 성공 메시지 */
            <div className="success-container">
              <div className="success-card">
                <div className="success-header">
                  <div className="success-icon">🎉</div>
                  <h3 className="success-title">학급 생성 완료!</h3>
                  <p className="success-message">{message}</p>
                </div>

                {inviteCode && (
                  <div className="invite-code-section">
                    <h4 className="invite-title">
                      <span className="title-icon">🔑</span>
                      학급 초대코드
                    </h4>
                    <div className="invite-code-container">
                      <div className="invite-code">{inviteCode}</div>
                      <button 
                        className="copy-button"
                        onClick={copyInviteCode}
                      >
                        📋
                      </button>
                    </div>
                    <div className="invite-instructions">
                      <p className="instruction-text">
                        📱 이 코드를 학부모님께 공유하여 학급에 초대해보세요
                      </p>
                      <div className="instruction-steps">
                        <div className="step">
                          <span className="step-number">1</span>
                          <span className="step-text">학부모님이 앱에 로그인</span>
                        </div>
                        <div className="step">
                          <span className="step-number">2</span>
                          <span className="step-text">초대코드 입력</span>
                        </div>
                        <div className="step">
                          <span className="step-number">3</span>
                          <span className="step-text">학급 가입 완료</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="success-actions">
                  <p className="redirect-message">
                    잠시 후 자동으로 학급 메인 페이지로 이동합니다...
                  </p>
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .classroom-create-page {
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
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .header-content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .main-title {
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.02em;
        }

        .subtitle {
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

        .form-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .info-card {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .info-icon {
          font-size: 1.5rem;
        }

        .info-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .info-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .info-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          font-size: 0.95rem;
          color: var(--text-secondary, #64748b);
          line-height: 1.5;
        }

        .info-list li::before {
          content: '✅';
          flex-shrink: 0;
        }

        .form-card {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin-bottom: 0.75rem;
        }

        .label-icon {
          font-size: 1.1rem;
        }

        .form-select {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          background: var(--bg-primary, #ffffff);
          color: var(--text-primary, #1e293b);
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.75rem center;
          background-repeat: no-repeat;
          background-size: 1.5rem 1.5rem;
          padding-right: 2.5rem;
        }

        .form-select:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-select.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .form-select:disabled {
          background-color: var(--bg-secondary, #f8fafc);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          margin-bottom: 1rem;
        }

        .error-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .error-text {
          color: #dc2626;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .create-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
        }

        .create-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
        }

        .create-button.disabled {
          background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .button-icon {
          font-size: 1.2rem;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 성공 상태 스타일 */
        .success-container {
          display: flex;
          justify-content: center;
          animation: successSlideIn 0.6s ease-out;
        }

        @keyframes successSlideIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .success-card {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
          text-align: center;
          width: 100%;
          max-width: 500px;
        }

        .success-header {
          margin-bottom: 2rem;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: bounce 0.6s ease-out;
        }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }

        .success-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0 0 0.5rem 0;
        }

        .success-message {
          font-size: 1.1rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
        }

        .invite-code-section {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .invite-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 1.5rem 0;
        }

        .title-icon {
          font-size: 1.3rem;
        }

        .invite-code-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .invite-code {
          font-family: 'Courier New', monospace;
          font-size: 2.2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.1em;
          border: 2px dashed var(--border-color, #e2e8f0);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          background-color: var(--bg-primary, #ffffff);
        }

        .copy-button {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.2rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .copy-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        .invite-instructions {
          text-align: left;
        }

        .instruction-text {
          font-size: 1rem;
          color: var(--text-secondary, #64748b);
          margin: 0 0 1rem 0;
          text-align: center;
        }

        .instruction-steps {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .step-number {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .step-text {
          font-size: 0.95rem;
          color: var(--text-secondary, #64748b);
        }

        .success-actions {
          text-align: center;
        }

        .redirect-message {
          font-size: 0.95rem;
          color: var(--text-secondary, #64748b);
          margin: 0 0 1rem 0;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 2px;
          animation: progress 3s ease-out forwards;
        }

        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .classroom-create-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .classroom-create-page {
            padding: 0.5rem;
            align-items: flex-start;
            padding-top: 2rem;
          }

          .header-content {
            padding: 1.5rem;
          }

          .info-card,
          .form-card,
          .success-card {
            padding: 1.5rem;
          }

          .invite-code-section {
            padding: 1.5rem;
          }

          .invite-code-container {
            flex-direction: column;
            gap: 1rem;
          }

          .invite-code {
            font-size: 1.8rem;
            padding: 0.75rem 1rem;
          }

          .instruction-steps {
            gap: 1rem;
          }

          .step {
            align-items: flex-start;
            gap: 0.75rem;
          }

          .step-text {
            margin-top: 0.1rem;
          }
        }

        @media (max-width: 480px) {
          .classroom-create-page {
            padding: 0.25rem;
            padding-top: 1rem;
          }

          .header-content {
            padding: 1.2rem;
          }

          .info-card,
          .form-card,
          .success-card {
            padding: 1.2rem;
          }

          .invite-code-section {
            padding: 1.2rem;
          }

          .invite-code {
            font-size: 1.5rem;
            padding: 0.6rem 0.8rem;
          }

          .copy-button {
            width: 40px;
            height: 40px;
            font-size: 1rem;
          }

          .success-icon {
            font-size: 3rem;
          }
        }

        /* 접근성 */
        .form-select:focus,
        .create-button:focus,
        .copy-button:focus {
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

export default ClassroomCreatePage;