import React, { useEffect, useState } from 'react';

function SuperAdminSchoolRequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    fetch('http://localhost:3001/api/superadmin/school-requests', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.text();
          throw new Error(`❌ 요청 실패: ${res.status} ${error}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('✅ 학교 요청 응답:', data);
        if (data.requests) {
          setRequests(data.requests);
        }
        setError(null);
      })
      .catch(err => {
        console.error('🔥 학교 요청 불러오기 실패:', err);
        setError('학교 요청 데이터를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm('이 요청을 승인하시겠습니까?')) return;

    try {
      const res = await fetch(`http://localhost:3001/api/superadmin/school-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert('학교 생성 및 관리자 권한 부여 완료');
        setRequests(prev => prev.filter(r => r.request_id !== requestId));
      } else {
        const error = await res.text();
        alert(`승인 실패: ${res.status} ${error}`);
      }
    } catch (err) {
      console.error('🔥 승인 요청 실패:', err);
      alert('승인 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="superadmin-request-page">
        <div className="loading">
          ⏳ 학교 요청을 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="superadmin-request-page">
        <div className="container">
          <div className="error-section">
            <div className="error-icon">❌</div>
            <h2>오류가 발생했습니다</h2>
            <p>{error}</p>
            <button onClick={fetchRequests} className="retry-button">
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-request-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>📋 학교 생성 요청 관리</h1>
          <p>새로운 학교 생성 요청을 검토하고 승인하세요</p>
        </div>

        {/* 콘텐츠 */}
        <div className="content">
          {/* 통계 정보 */}
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-number">{requests.length}</div>
              <div className="stat-label">대기 중인 요청</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{requests.filter(r => r.school_type === 'elementary').length}</div>
              <div className="stat-label">초등학교</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{requests.filter(r => r.school_type === 'middle').length}</div>
              <div className="stat-label">중학교</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{requests.filter(r => r.school_type === 'high').length}</div>
              <div className="stat-label">고등학교</div>
            </div>
          </div>

          {/* 요청 목록 */}
          <div className="requests-section">
            <h2>📝 요청 목록</h2>
            
            {requests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>대기 중인 요청이 없습니다</h3>
                <p>현재 승인 대기 중인 학교 생성 요청이 없습니다.</p>
              </div>
            ) : (
              <div className="requests-grid">
                {requests.map(req => (
                  <div key={req.request_id} className="request-card">
                    <div className="request-header">
                      <h3 className="school-name">{req.school_name}</h3>
                      <span className="school-type">
                        {req.school_type === 'elementary' ? '초등학교' :
                         req.school_type === 'middle' ? '중학교' :
                         req.school_type === 'high' ? '고등학교' :
                         req.school_type || '기타'}
                      </span>
                    </div>
                    
                    <div className="request-info">
                      <div className="info-row">
                        <span className="info-label">학교 코드</span>
                        <span className="info-value">{req.school_code || '미설정'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">요청자</span>
                        <span className="info-value">{req.requester_name}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">이메일</span>
                        <span className="info-value">{req.email}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">담당자</span>
                        <span className="info-value">{req.contact_name || '미설정'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">연락처</span>
                        <span className="info-value">{req.contact_phone || '미설정'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">요청일</span>
                        <span className="info-value">{new Date(req.requested_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button 
                        onClick={() => handleApprove(req.request_id)}
                        className="approve-button"
                      >
                        ✅ 승인하기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .superadmin-request-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
        }

        .error-section {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 3rem 2rem;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .error-section h2 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
        }

        .error-section p {
          margin: 0 0 2rem 0;
          color: #64748b;
        }

        .retry-button {
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-button:hover {
          background: #3730a3;
          transform: translateY(-1px);
        }

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

        .content {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          border-left: 4px solid #4f46e5;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #4f46e5;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        .requests-section h2 {
          margin: 0 0 1.5rem 0;
          color: #1e293b;
          font-size: 1.3rem;
          font-weight: 600;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
        }

        .request-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-left: 4px solid #f59e0b;
          transition: transform 0.2s ease;
        }

        .request-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .school-name {
          margin: 0;
          color: #1e293b;
          font-size: 1.1rem;
          font-weight: 600;
          flex: 1;
          margin-right: 1rem;
        }

        .school-type {
          font-size: 0.8rem;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 500;
        }

        .request-info {
          margin-bottom: 1.5rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
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
          min-width: 70px;
        }

        .info-value {
          font-size: 0.85rem;
          color: #374151;
          font-weight: 500;
          text-align: right;
          flex: 1;
          margin-left: 1rem;
          word-break: break-all;
        }

        .request-actions {
          display: flex;
          justify-content: flex-end;
        }

        .approve-button {
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .approve-button:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .superadmin-request-page {
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

          .stats-section {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .requests-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .request-header {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .school-name {
            margin-right: 0;
          }

          .info-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .info-value {
            text-align: left;
            margin-left: 0;
            font-weight: 600;
          }

          .approve-button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .stats-section {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default SuperAdminSchoolRequestPage;