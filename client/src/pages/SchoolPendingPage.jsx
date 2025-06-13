import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function SchoolPendingPage() {
  const { user } = useContext(AuthContext);
  const [request, setRequest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:3001/api/schools/school-requests/my', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setRequest(data.request))
      .catch(err => console.error('요청 정보 불러오기 실패:', err));
  }, []);

  const handleInquiry = () => {
    navigate('/inquiry/form', {
      state: {
        category: 'school_request',
        defaultTitle: `[학교 승인 문의] ${request?.school_name || '학교'} 승인 관련 문의`
      }
    });
  };

  if (!request) {
    return (
      <div className="school-pending-page">
        <div className="loading">
          ⏳ 요청 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  return (
    <div className="school-pending-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <h1>CLASSFEED</h1>
        </div>

        {/* 콘텐츠 */}
        <div className="content">
          {/* 메인 메시지 */}
          <div className="main-message">
            <h2>
              <span className="school-name">{request.school_name}</span> 생성 승인 대기 중
            </h2>
            <p>관리자 검토 후 승인 처리됩니다</p>
          </div>

          {/* 요청 정보 */}
          <div className="info-section">
            <h3>📋 요청 정보</h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">학교명</span>
                <span className="info-value">{request.school_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">학교 유형</span>
                <span className="info-value">{request.school_type || '정보 없음'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">학교 코드</span>
                <span className="info-value">{request.school_code || '정보 없음'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">요청일시</span>
                <span className="info-value">{new Date(request.requested_at).toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span className="info-label">신청자</span>
                <span className="info-value">{request.contact_name || '정보 없음'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">연락처</span>
                <span className="info-value">{request.contact_phone || '정보 없음'}</span>
              </div>
            </div>
          </div>

          {/* 승인 안내 */}
          <div className="guide-section">
            <h3>⏰ 승인 안내</h3>
            <div className="guide-list">
              <div className="guide-item">관리자가 검토 후 승인 처리됩니다</div>
              <div className="guide-item">평균 처리 시간: 1-3 영업일</div>
              <div className="guide-item">승인 시 알림으로 안내됩니다</div>
              <div className="guide-item">문의사항이 있으시면 아래 버튼을 이용해주세요</div>
            </div>
          </div>

          {/* 문의 버튼 */}
          <button className="inquiry-button" onClick={handleInquiry}>
            📞 승인 관련 문의하기
          </button>
        </div>
      </div>

      <style jsx>{`
        .school-pending-page {
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

        .loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
        }

        .header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          margin-bottom: 1rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .logo {
          width: 64px;
          height: 64px;
          margin-bottom: 1rem;
        }

        .header h1 {
          margin: 0;
          color: #1e293b;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 2px;
        }

        .content {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          text-align: center;
        }

        .main-message {
          margin-bottom: 2rem;
        }

        .main-message h2 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.3rem;
          font-weight: 600;
        }

        .school-name {
          color: #4f46e5;
          font-weight: 700;
        }

        .main-message p {
          margin: 0;
          color: #64748b;
        }

        .info-section {
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          text-align: left;
        }

        .info-section h3 {
          margin: 0 0 1rem 0;
          color: #374151;
          font-size: 1rem;
          font-weight: 600;
        }

        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(226, 232, 240, 0.6);
        }

        .info-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .info-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #64748b;
          min-width: 80px;
        }

        .info-value {
          font-size: 0.85rem;
          color: #374151;
          font-weight: 500;
        }

        .guide-section {
          background: rgba(255, 243, 205, 0.8);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: left;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .guide-section h3 {
          margin: 0 0 1rem 0;
          color: #92400e;
          font-size: 1rem;
          font-weight: 600;
        }

        .guide-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .guide-item {
          font-size: 0.85rem;
          color: #92400e;
          position: relative;
          padding-left: 1rem;
        }

        .guide-item:before {
          content: "• ";
          position: absolute;
          left: 0;
          color: #92400e;
        }

        .inquiry-button {
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 25px;
          padding: 0.875rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .inquiry-button:hover {
          background: #3730a3;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .school-pending-page {
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

          .main-message h2 {
            font-size: 1.1rem;
          }

          .info-row {
            flex-direction: column;
            text-align: center;
            gap: 0.25rem;
            align-items: flex-start;
          }

          .info-label {
            min-width: auto;
            font-weight: 600;
          }
        }
      `}</style>
    </div>
  );
}

export default SchoolPendingPage;