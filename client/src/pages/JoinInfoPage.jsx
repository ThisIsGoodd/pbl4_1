// client/src/pages/JoinInfoPage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function JoinInfoPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (!state?.school_id) {
        setSchoolName('알 수 없음');
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/api/schools/${state.school_id}`);
        const data = await res.json();
        setSchoolName(data.name || '알 수 없음');
      } catch (err) {
        console.error('학교 정보 조회 실패:', err);
        setSchoolName('알 수 없음');
      }
    };

    fetchSchoolInfo();
  }, [state]);

  const handleSubmit = async () => {
    if (!state?.classroom_id) {
      alert('학급 정보가 없습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/users/join-classroom-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ classroom_id: state.classroom_id })
      });

      if (res.ok) {
        // 사용자 정보 갱신
        try {
          const userRes = await fetch('http://localhost:3001/api/users/profile', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const userData = await userRes.json();
          console.log('사용자 정보 갱신 성공:', userData);
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
                    <div className="loading-spinner"></div>
                    가입 중...
                  </>
                ) : (
                  <>
                    <span className="button-icon">🚀</span>
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
        }

        .info-section {
          text-align: center;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          display: block;
        }

        .success-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .success-description {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 2rem 0;
          line-height: 1.5;
        }

        .info-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          justify-content: center;
        }

        .info-icon {
          font-size: 1.5rem;
        }

        .info-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: white;
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
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .detail-icon {
          font-size: 1.2rem;
        }

        .detail-value {
          font-weight: 700;
          color: white;
          font-size: 1.1rem;
        }

        .notice-box {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-align: left;
        }

        .notice-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .notice-icon {
          font-size: 1.3rem;
        }

        .notice-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .notice-list {
          margin: 0;
          padding-left: 1.5rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .notice-list li {
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .back-btn,
        .complete-btn {
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

        .complete-btn {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
        }

        .complete-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
        }

        .complete-btn:disabled,
        .back-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .button-icon {
          font-size: 1.1rem;
        }

        .loading-spinner {
          width: 18px;
          height: 18px;
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
          .join-info-page {
            padding: 1rem 0.5rem;
          }

          .header {
            padding: 1.5rem;
          }

          .main-title {
            font-size: 1.5rem;
          }

          .welcome-text {
            font-size: 1rem;
          }

          .main-content {
            padding: 1.5rem;
          }

          .info-card {
            padding: 1.25rem;
          }

          .detail-row {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }

          .button-group {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 1.25rem;
          }

          .main-content {
            padding: 1.25rem;
          }

          .main-title {
            font-size: 1.25rem;
          }

          .success-icon {
            font-size: 3rem;
          }

          .info-card {
            padding: 1rem;
          }

          .notice-box {
            padding: 1.25rem;
          }
        }

        /* 다크모드 대응 */
        @media (prefers-color-scheme: dark) {
          .header,
          .main-content {
            background: rgba(30, 30, 30, 0.9);
          }

          .info-card,
          .notice-box {
            background: rgba(55, 65, 81, 0.3);
          }

          .detail-row {
            background: rgba(55, 65, 81, 0.3);
          }
        }

        /* 접근성 개선 */
        .back-btn:focus,
        .complete-btn:focus {
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

export default JoinInfoPage;