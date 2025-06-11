import { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function JoinInfoPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [schoolName, setSchoolName] = useState(state?.schoolName || '');
  const [isLoading, setIsLoading] = useState(false);

  // 학교 이름 불러오기
  useEffect(() => {
    const fetchSchoolName = async () => {
      if (state?.schoolName) {
        setSchoolName(state.schoolName);
        return;
      }

      if (!state?.school) return;

      try {
        const res = await fetch(`http://localhost:3001/api/schools/${state.school}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSchoolName(data.name);
        } else {
          setSchoolName('학교 이름 불러오기 실패');
        }
      } catch (err) {
        console.error('학교 정보 오류:', err);
        setSchoolName('학교 정보 오류');
      }
    };

    fetchSchoolName();
  }, [state?.school, state?.schoolName]);

  const handleSubmit = async () => {
    if (!state?.classroom_id) return;

    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/users/join-classroom', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ classroom_id: state.classroom_id })
      });

      if (res.ok) {
        // 사용자 정보 다시 불러와서 네비게이션 갱신
        try {
          const userRes = await fetch('http://localhost:3001/api/users/profile', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });

          if (userRes.ok) {
            const userData = await userRes.json();
            setUser(userData.user); // Context 상태 갱신으로 네비게이션 자동 새로고침
            console.log('✅ 사용자 정보 갱신 완료:', userData.user);
          }
        } catch (userErr) {
          console.error('사용자 정보 갱신 실패:', userErr);
        }

        // 메인 페이지로 이동
        navigate(`/main?classroom_id=${state.classroom_id}`, {
          state: {
            schoolName,
            grade: state.grade,
            classNumber: state.classNumber
          }
        });
      } else {
        const data = await res.json();
        alert(`학급 연결 실패: ${data.message}`);
      }
    } catch (err) {
      console.error('학급 연결 오류:', err);
      alert('서버 오류');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="join-info-page">
      <div className="container">
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">🎉 가입 완료</h1>
            <p className="welcome-text">학급 정보를 확인하고 가입을 완료하세요</p>
          </div>
        </div>

        <div className="main-content">
          <div className="info-section">
            <div className="success-icon">✅</div>
            <h2 className="success-title">학급 정보 확인</h2>
            <p className="success-description">
              아래 정보를 확인한 후 가입을 완료해주세요.
            </p>

            <div className="info-card">
              <div className="info-header">
                <span className="info-icon">📋</span>
                <h3 className="info-title">학급 상세 정보</h3>
              </div>
              
              <div className="info-details">
                <div className="detail-row">
                  <div className="detail-label">
                    <span className="detail-icon">🏫</span>
                    학교명
                  </div>
                  <div className="detail-value">{schoolName || '로딩 중...'}</div>
                </div>
                
                <div className="detail-row">
                  <div className="detail-label">
                    <span className="detail-icon">📚</span>
                    학년
                  </div>
                  <div className="detail-value">{state?.grade}학년</div>
                </div>
                
                <div className="detail-row">
                  <div className="detail-label">
                    <span className="detail-icon">👥</span>
                    반
                  </div>
                  <div className="detail-value">{state?.classNumber}반</div>
                </div>
              </div>
            </div>

            <div className="notice-box">
              <div className="notice-header">
                <span className="notice-icon">💡</span>
                <h4 className="notice-title">안내사항</h4>
              </div>
              <ul className="notice-list">
                <li>가입 완료 후 학급의 모든 기능을 이용하실 수 있습니다.</li>
                <li>선생님과 다른 학부모님들과 소통이 가능합니다.</li>
                <li>학급 공지사항과 일정을 확인하실 수 있습니다.</li>
                <li>개인정보는 학급 내에서만 공유됩니다.</li>
              </ul>
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
                disabled={isLoading || !state?.classroom_id}
                className="complete-btn"
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    가입 중...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🚀</span>
                    가입 완료하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .join-info-page {
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

        .info-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
          text-align: center;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }

        .success-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0 0 1rem 0;
        }

        .success-description {
          font-size: 1.1rem;
          color: var(--text-secondary, #64748b);
          margin: 0 0 2rem 0;
          line-height: 1.6;
        }

        .info-card {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border: 1px solid var(--border-color, #e2e8f0);
          text-align: left;
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--border-color, #e2e8f0);
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

        .info-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--bg-primary, #ffffff);
          border-radius: 12px;
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
        }

        .detail-icon {
          font-size: 1.1rem;
        }

        .detail-value {
          font-weight: 700;
          color: #4f46e5;
          font-size: 1.1rem;
        }

        .notice-box {
          background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
          border: 2px solid #93c5fd;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: left;
        }

        .notice-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .notice-icon {
          font-size: 1.3rem;
        }

        .notice-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e40af;
          margin: 0;
        }

        .notice-list {
          margin: 0;
          padding-left: 1.5rem;
          color: #1e40af;
          line-height: 1.7;
        }

        .notice-list li {
          margin-bottom: 0.5rem;
        }

        .notice-list li:last-child {
          margin-bottom: 0;
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

        .complete-btn {
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

        .complete-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
        }

        .complete-btn:disabled {
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

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .join-info-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }

          .notice-box {
            background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
            border-color: #3b82f6;
          }

          .notice-title {
            color: #dbeafe;
          }

          .notice-list {
            color: #dbeafe;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .join-info-page {
            padding: 0.5rem;
            align-items: flex-start;
            padding-top: 2rem;
          }

          .header {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .info-section {
            padding: 1.5rem;
          }

          .info-card {
            padding: 1.25rem;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
            text-align: left;
          }

          .detail-value {
            align-self: flex-end;
          }

          .notice-box {
            padding: 1.25rem;
          }

          .button-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .back-btn,
          .complete-btn {
            width: 100%;
          }

          .success-icon {
            font-size: 3rem;
          }
        }

        @media (max-width: 480px) {
          .join-info-page {
            padding: 0.25rem;
            padding-top: 1rem;
          }

          .header {
            padding: 1.25rem;
          }

          .info-section {
            padding: 1.25rem;
          }

          .info-card {
            padding: 1rem;
          }

          .detail-row {
            padding: 0.75rem;
          }

          .notice-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .success-icon {
            font-size: 2.5rem;
          }
        }

        /* 접근성 */
        .back-btn:focus,
        .complete-btn:focus {
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

export default JoinInfoPage;