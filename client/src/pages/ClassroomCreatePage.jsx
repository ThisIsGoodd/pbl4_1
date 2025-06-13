import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function ClassroomCreatePage() {
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [message, setMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { refreshToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const handleCreate = async () => {
    if (!grade || !classNumber) {
      return setError('학년과 반을 모두 입력해주세요.');
    }

    const gradeNum = parseInt(grade);
    const classNum = parseInt(classNumber);

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

        // 토큰 갱신
        await refreshToken();

        // 3초 후 학급 대시보드로 이동
        setTimeout(() => {
          navigate(`/classroom/dashboard?classroom_id=${data.classroom_id}`);
        }, 3000);
      } else {
        setError(data.error || '학급 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('학급 생성 오류:', err);
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      alert('초대 코드가 클립보드에 복사되었습니다!');
    }).catch(() => {
      alert('복사에 실패했습니다. 직접 선택하여 복사해주세요.');
    });
  };

  // 성공 상태인지 확인
  const isSuccess = message && inviteCode;

  return (
    <div className="classroom-create-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>🏫 새 학급 생성</h1>
          <p>새로운 학급을 만들고 학부모님들을 초대하세요</p>
        </div>

        {!isSuccess ? (
          /* 학급 생성 폼 */
          <div className="form-card">
            <div className="form-content">
              <h2>📚 학급 정보 입력</h2>
              <p>생성할 학급의 학년과 반을 선택해주세요</p>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">학년</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="form-select"
                    disabled={isCreating}
                  >
                    <option value="">학년 선택</option>
                    {[1, 2, 3, 4, 5, 6].map(g => (
                      <option key={g} value={g}>{g}학년</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">반</label>
                  <select
                    value={classNumber}
                    onChange={(e) => setClassNumber(e.target.value)}
                    className="form-select"
                    disabled={isCreating}
                  >
                    <option value="">반 선택</option>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(c => (
                      <option key={c} value={c}>{c}반</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={isCreating || !grade || !classNumber}
                className="create-button"
              >
                {isCreating ? (
                  <>
                    <div className="loading-spinner"></div>
                    학급 생성 중...
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
          /* 성공 화면 */
          <div className="success-card">
            <div className="success-content">
              <div className="success-icon">🎉</div>
              <h2>학급이 성공적으로 생성되었습니다!</h2>
              <p>{grade}학년 {classNumber}반이 만들어졌습니다.</p>

              {/* 초대 코드 */}
              <div className="invite-section">
                <h3>📋 학부모 초대 코드</h3>
                <p>이 코드를 학부모님들께 공유하여 학급에 초대하세요</p>
                
                <div className="invite-code-container">
                  <div className="invite-code">{inviteCode}</div>
                  <button onClick={copyInviteCode} className="copy-button">
                    📋 복사
                  </button>
                </div>

                <div className="invite-instructions">
                  <h4>📋 사용 방법</h4>
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

              <div className="redirect-info">
                <p>잠시 후 자동으로 학급 관리 페이지로 이동합니다...</p>
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              </div>
            </div>
          </div>
        )}
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
        }

        /* 헤더 */
        .header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 2rem;
        }

        .header p {
          margin: 0;
          color: #64748b;
          font-size: 1.1rem;
        }

        /* 폼 카드 */
        .form-card, .success-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .form-content, .success-content {
          text-align: center;
        }

        .form-content h2, .success-content h2 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.5rem;
        }

        .form-content p, .success-content p {
          margin: 0 0 2rem 0;
          color: #64748b;
        }

        /* 폼 그리드 */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          text-align: left;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          color: #1e293b;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .form-select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #1e293b;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .form-select:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-select:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }

        /* 에러 메시지 */
        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .error-icon {
          font-size: 1rem;
        }

        /* 버튼 */
        .create-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .create-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
        }

        .create-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .button-icon {
          font-size: 1.2rem;
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

        /* 성공 화면 */
        .success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .success-content h2 {
          color: #059669;
          margin-bottom: 1rem;
        }

        /* 초대 섹션 */
        .invite-section {
          background: #f0f9ff;
          padding: 1.5rem;
          border-radius: 12px;
          margin: 2rem 0;
          border: 1px solid #bae6fd;
        }

        .invite-section h3 {
          margin: 0 0 0.5rem 0;
          color: #0369a1;
          font-size: 1.2rem;
        }

        .invite-section p {
          margin: 0 0 1.5rem 0;
          color: #0284c7;
          font-size: 0.9rem;
        }

        .invite-code-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .invite-code {
          flex: 1;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 1.8rem;
          font-weight: 700;
          color: #4f46e5;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          border: 2px solid #4f46e5;
          text-align: center;
          letter-spacing: 0.1em;
        }

        .copy-button {
          padding: 1rem 1.5rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .copy-button:hover {
          background: #3730a3;
        }

        /* 사용 방법 */
        .invite-instructions h4 {
          margin: 0 0 1rem 0;
          color: #0369a1;
          font-size: 1rem;
        }

        .instruction-steps {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex: 1;
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: #4f46e5;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .step-text {
          font-size: 0.85rem;
          color: #0284c7;
          font-weight: 500;
        }

        /* 리다이렉트 정보 */
        .redirect-info {
          text-align: center;
          margin-top: 2rem;
        }

        .redirect-info p {
          margin: 0 0 1rem 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          width: 0;
          animation: progress 3s ease-in-out forwards;
        }

        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .invite-code-container {
            flex-direction: column;
          }

          .invite-code {
            font-size: 1.5rem;
          }

          .instruction-steps {
            flex-direction: column;
            gap: 1rem;
          }

          .step {
            flex-direction: row;
            text-align: left;
            gap: 1rem;
          }

          .step-number {
            margin-bottom: 0;
          }

          .header h1 {
            font-size: 1.5rem;
          }

          .header p {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .classroom-create-page {
            padding: 0.5rem;
          }

          .header, .form-card, .success-card {
            padding: 1.5rem;
          }

          .invite-code {
            font-size: 1.2rem;
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ClassroomCreatePage;