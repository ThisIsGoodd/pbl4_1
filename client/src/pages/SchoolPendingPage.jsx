import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function SchoolPendingPage() {
  const { user } = useContext(AuthContext);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/schools/school-requests/my', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          throw new Error('요청 정보를 불러올 수 없습니다.');
        }
        
        const data = await response.json();
        setRequest(data.request);
      } catch (err) {
        console.error('요청 정보 불러오기 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, []);

  const handleInquiry = () => {
    navigate('/inquiry/form', {
      state: {
        category: 'school_request',
        defaultTitle: `[학교 승인 문의] ${request?.school_name || '학교'} 승인 관련 문의`
      }
    });
  };

  if (loading) {
    return (
      <div className="school-pending-page">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">요청 정보를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="school-pending-page">
        <div className="container">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">요청 정보를 찾을 수 없습니다</h2>
            <p className="error-description">
              {error || '학교 승인 요청 정보가 없거나 오류가 발생했습니다.'}
            </p>
            <button onClick={() => navigate(-1)} className="error-button">
              이전으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="school-pending-page">
      <div className="container">
        {/* 로고 및 헤더 */}
        <div className="header-section">
          <div className="logo-container">
            <div className="logo">🏫</div>
            <h1 className="main-title">CLASSFEED</h1>
          </div>
          
          <div className="status-header">
            <div className="status-icon">⏳</div>
            <h2 className="status-title">학교 승인 대기중</h2>
            <p className="status-subtitle">
              <span className="school-name">{request.school_name}</span> 생성 요청이 처리 중입니다
            </p>
          </div>
        </div>

        {/* 요청 정보 카드 */}
        <div className="request-info-card">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <h3 className="card-title">요청 상세 정보</h3>
          </div>
          
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">
                <span className="info-icon">🏫</span>
                학교명
              </div>
              <div className="info-value">{request.school_name}</div>
            </div>
            
            <div className="info-item">
              <div className="info-label">
                <span className="info-icon">🏷️</span>
                학교 유형
              </div>
              <div className="info-value">{request.school_type || '정보 없음'}</div>
            </div>
            
            <div className="info-item">
              <div className="info-label">
                <span className="info-icon">🔢</span>
                학교 코드
              </div>
              <div className="info-value">{request.school_code || '정보 없음'}</div>
            </div>
            
            <div className="info-item">
              <div className="info-label">
                <span className="info-icon">📅</span>
                요청일시
              </div>
              <div className="info-value">{formatDate(request.requested_at)}</div>
            </div>
            
            <div className="info-item">
              <div className="info-label">
                <span className="info-icon">👤</span>
                신청자명
              </div>
              <div className="info-value">{request.contact_name || '정보 없음'}</div>
            </div>
            
            <div className="info-item">
              <div className="info-label">
                <span className="info-icon">📱</span>
                연락처
              </div>
              <div className="info-value">{request.contact_phone || '정보 없음'}</div>
            </div>
          </div>
        </div>

        {/* 안내 정보 */}
        <div className="guide-section">
          <div className="guide-card">
            <div className="guide-header">
              <span className="guide-icon">💡</span>
              <h3 className="guide-title">승인 처리 안내</h3>
            </div>
            
            <div className="guide-content">
              <div className="timeline">
                <div className="timeline-item active">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>요청 접수 완료</h4>
                    <p>학교 생성 요청이 성공적으로 접수되었습니다</p>
                  </div>
                </div>
                
                <div className="timeline-item pending">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>관리자 검토 중</h4>
                    <p>관리자가 요청 내용을 검토하고 있습니다</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>승인 및 알림</h4>
                    <p>승인 완료 시 알림으로 안내드립니다</p>
                  </div>
                </div>
              </div>
              
              <div className="processing-info">
                <div className="info-row">
                  <span className="info-label">평균 처리 시간</span>
                  <span className="info-value">1-3 영업일</span>
                </div>
                <div className="info-row">
                  <span className="info-label">처리 상태</span>
                  <span className="status-badge pending">검토 중</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="action-section">
          <button onClick={handleInquiry} className="inquiry-button">
            <span className="button-icon">💬</span>
            승인 관련 문의하기
          </button>
          
          <div className="help-text">
            처리 과정에서 궁금한 사항이 있으시면 언제든 문의해주세요
          </div>
        </div>
      </div>

      <style jsx>{`
        /* CSS 변수 정의 */
        .school-pending-page {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-glass: rgba(255, 255, 255, 0.95);
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --accent-color: #4f46e5;
          --accent-hover: #4338ca;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --error-color: #ef4444;
          --pending-color: #f97316;
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
        }

        /* 다크모드 */
        @media (prefers-color-scheme: dark) {
          .school-pending-page {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-glass: rgba(15, 23, 42, 0.95);
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --text-muted: #64748b;
            --border-color: #334155;
          }
        }

        .school-pending-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          animation: fadeIn 0.8s ease-out;
        }

        /* 로딩 상태 */
        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          padding: 2rem;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1.5rem;
        }

        .loading-text {
          color: white;
          font-size: 1.1rem;
          font-weight: 500;
        }

        .error-container {
          background: var(--bg-glass);
          border-radius: var(--radius-xl);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-xl);
        }

        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .error-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .error-description {
          color: var(--text-secondary);
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .error-button {
          padding: 0.75rem 2rem;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .error-button:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        /* 헤더 섹션 */
        .header-section {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-container {
          margin-bottom: 2rem;
        }

        .logo {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .main-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: white;
          letter-spacing: 0.05em;
          margin-bottom: 2rem;
        }

        .status-header {
          background: var(--bg-glass);
          border-radius: var(--radius-xl);
          padding: 2rem;
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-xl);
        }

        .status-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .status-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .status-subtitle {
          color: var(--text-secondary);
          font-size: 1.05rem;
          line-height: 1.6;
        }

        .school-name {
          font-weight: 600;
          color: var(--accent-color);
        }

        /* 요청 정보 카드 */
        .request-info-card {
          background: var(--bg-glass);
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-xl);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .card-icon {
          font-size: 1.25rem;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .info-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .info-icon {
          font-size: 1rem;
        }

        .info-value {
          color: var(--text-primary);
          font-weight: 600;
          font-size: 1rem;
          padding: 0.5rem 0;
        }

        /* 가이드 섹션 */
        .guide-section {
          margin-bottom: 2rem;
        }

        .guide-card {
          background: var(--bg-glass);
          border-radius: var(--radius-xl);
          padding: 2rem;
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-xl);
        }

        .guide-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .guide-icon {
          font-size: 1.25rem;
        }

        .guide-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .guide-content {
          display: grid;
          gap: 2rem;
        }

        /* 타임라인 */
        .timeline {
          position: relative;
          padding-left: 2rem;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 0.75rem;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--border-color);
        }

        .timeline-item {
          position: relative;
          margin-bottom: 2rem;
        }

        .timeline-item:last-child {
          margin-bottom: 0;
        }

        .timeline-dot {
          position: absolute;
          left: -2rem;
          top: 0.25rem;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          background: var(--border-color);
          border: 3px solid var(--bg-primary);
          transition: all 0.3s ease;
        }

        .timeline-item.active .timeline-dot {
          background: var(--success-color);
        }

        .timeline-item.pending .timeline-dot {
          background: var(--pending-color);
          animation: pulse 2s infinite;
        }

        .timeline-content h4 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .timeline-content p {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* 처리 정보 */
        .processing-info {
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .info-row .info-label {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .info-row .info-value {
          color: var(--text-primary);
          font-weight: 600;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge.pending {
          background: rgba(249, 115, 22, 0.1);
          color: var(--pending-color);
        }

        /* 액션 섹션 */
        .action-section {
          text-align: center;
        }

        .inquiry-button {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-md);
          margin-bottom: 1rem;
        }

        .inquiry-button:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .inquiry-button:active {
          transform: translateY(0);
        }

        .button-icon {
          font-size: 1.1rem;
        }

        .help-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        /* 애니메이션 */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        /* 모바일 반응형 */
        @media (max-width: 768px) {
          .school-pending-page {
            padding: 0.5rem;
          }

          .container {
            max-width: 100%;
          }

          .header-section,
          .request-info-card,
          .guide-card {
            padding: 1.5rem;
          }

          .main-title {
            font-size: 1.5rem;
          }

          .status-title {
            font-size: 1.25rem;
          }

          .info-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .timeline {
            padding-left: 1.5rem;
          }

          .timeline-dot {
            left: -1.5rem;
          }

          .inquiry-button {
            padding: 0.875rem 1.5rem;
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .main-title {
            font-size: 1.25rem;
          }

          .status-title {
            font-size: 1.1rem;
          }

          .card-title,
          .guide-title {
            font-size: 1.1rem;
          }

          .inquiry-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default SchoolPendingPage;