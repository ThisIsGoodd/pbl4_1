import React, { useEffect, useState } from 'react';

function SuperAdminSchoolRequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('requested_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/superadmin/school-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`요청 실패: ${res.status} ${error}`);
      }

      const data = await res.json();
      console.log('✅ 학교 요청 응답:', data);
      
      if (data.requests) {
        setRequests(data.requests);
      }
      setError(null);
    } catch (err) {
      console.error('🔥 학교 요청 불러오기 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    if (!window.confirm(`"${request.school_name}" 요청을 승인하시겠습니까?\n\n승인 시 학교가 생성되고 요청자에게 관리자 권한이 부여됩니다.`)) return;

    try {
      const res = await fetch(`http://localhost:3001/api/superadmin/school-requests/${request.request_id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert('학교 생성 및 관리자 권한 부여가 완료되었습니다!');
        setRequests(prev => prev.filter(r => r.request_id !== request.request_id));
      } else {
        const error = await res.text();
        alert(`승인 실패: ${res.status} ${error}`);
      }
    } catch (err) {
      console.error('🔥 승인 요청 실패:', err);
      alert('승인 중 오류가 발생했습니다.');
    }
  };

  const filteredRequests = requests.filter(request =>
    request.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.school_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aValue = a[sortBy] || '';
    let bValue = b[sortBy] || '';
    
    if (sortBy === 'requested_at') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-requests-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <p className="loading-text">학교 요청을 불러오는 중...</p>
        </div>
        <style jsx>{`
          .admin-requests-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .loading-container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }

          .loading-spinner {
            margin-bottom: 1.5rem;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }

          .loading-text {
            color: white;
            font-size: 1.1rem;
            font-weight: 500;
            margin: 0;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-requests-page">
        <div className="error-container">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">오류가 발생했습니다</h2>
            <p className="error-description">{error}</p>
            <button onClick={fetchRequests} className="retry-button">
              <span className="button-icon">🔄</span>
              다시 시도
            </button>
          </div>
        </div>
        <style jsx>{`
          .admin-requests-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .error-container {
            max-width: 500px;
            width: 100%;
            padding: 0;
          }

          .error-content {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            padding: 2.5rem;
            text-align: center;
          }

          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .error-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: white;
            margin: 0 0 1rem 0;
          }

          .error-description {
            color: rgba(255, 255, 255, 0.8);
            margin: 0 0 2rem 0;
            line-height: 1.6;
          }

          .retry-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 1.75rem;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .retry-button:hover {
            background: white;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .button-icon {
            font-size: 1.2rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-requests-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header-section">
          <div className="header-content">
            <div className="header-icon">📝</div>
            <div className="header-text">
              <h1 className="page-title">학교 생성 요청 관리</h1>
              <p className="page-subtitle">학교 생성 요청을 검토하고 승인할 수 있습니다</p>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-number">{requests.length}</div>
                <div className="stat-label">총 요청</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-number">{requests.filter(r => {
                  const date = new Date(r.requested_at);
                  const today = new Date();
                  return date.toDateString() === today.toDateString();
                }).length}</div>
                <div className="stat-label">오늘 요청</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-number">{requests.filter(r => {
                  const date = new Date(r.requested_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return date >= weekAgo;
                }).length}</div>
                <div className="stat-label">최근 7일</div>
              </div>
            </div>
            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-number">{requests.length}</div>
                <div className="stat-label">대기중</div>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="controls-section">
          <div className="search-card">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="학교명, 요청자명, 이메일, 학교코드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="sort-card">
            <div className="sort-controls">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="requested_at">요청일</option>
                <option value="school_name">학교명</option>
                <option value="requester_name">요청자명</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-button"
              >
                {sortOrder === 'asc' ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>

        {/* 요청 목록 */}
        <div className="requests-section">
          {sortedRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3 className="empty-title">
                {searchTerm ? '검색 결과가 없습니다' : '대기중인 요청이 없습니다'}
              </h3>
              <p className="empty-description">
                {searchTerm 
                  ? '다른 검색어로 시도해보세요.'
                  : '모든 학교 생성 요청이 처리되었습니다.'
                }
              </p>
            </div>
          ) : (
            <div className="requests-grid">
              {sortedRequests.map((request) => (
                <div key={request.request_id} className="request-card">
                  <div className="request-header">
                    <div className="request-info">
                      <h3 className="school-name">{request.school_name}</h3>
                      <div className="request-meta">
                        <span className="meta-item">
                          <span className="meta-icon">👤</span>
                          {request.requester_name}
                        </span>
                        <span className="meta-item">
                          <span className="meta-icon">📅</span>
                          {formatDate(request.requested_at)}
                        </span>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button
                        onClick={() => handleApprove(request)}
                        className="approve-button"
                      >
                        <span className="button-icon">✅</span>
                        승인
                      </button>
                    </div>
                  </div>

                  <div className="request-details">
                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">🏷️</span>
                        학교 유형
                      </span>
                      <span className="detail-value">{request.school_type || '미지정'}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">🔢</span>
                        학교 코드
                      </span>
                      <span className="detail-value">{request.school_code || '미지정'}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">📧</span>
                        이메일
                      </span>
                      <span className="detail-value">{request.email}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">👨‍💼</span>
                        담당자명
                      </span>
                      <span className="detail-value">{request.contact_name || '미지정'}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">📞</span>
                        연락처
                      </span>
                      <span className="detail-value">{request.contact_phone || '미지정'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .admin-requests-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem 1rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* 헤더 섹션 */
        .header-section {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .header-icon {
          font-size: 3rem;
        }

        .header-text {
          flex: 1;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.1rem;
          margin: 0;
        }

        /* 통계 그리드 */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stat-card.pending {
          background: rgba(251, 191, 36, 0.2);
          border-color: rgba(251, 191, 36, 0.3);
        }

        .stat-icon {
          font-size: 2rem;
        }

        .stat-content {
          flex: 1;
        }

        .stat-number {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* 컨트롤 섹션 */
        .controls-section {
          display: flex;
          gap: 1rem;
        }

        .search-card {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1rem 1.5rem;
        }

        .search-icon {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          font-size: 1rem;
          outline: none;
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .sort-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1rem 1.5rem;
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sort-select {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 500;
          backdrop-filter: blur(10px);
        }

        .sort-select option {
          background: #333;
          color: white;
        }

        .sort-button {
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .sort-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* 요청 섹션 */
        .requests-section {
          flex: 1;
        }

        .empty-state {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 3rem;
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .empty-description {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.1rem;
          margin: 0;
        }

        .requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
          gap: 1.5rem;
        }

        /* 요청 카드 */
        .request-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .request-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .request-info {
          flex: 1;
        }

        .school-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .request-meta {
          display: flex;
          gap: 1rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .meta-icon {
          font-size: 1rem;
        }

        .request-actions {
          display: flex;
          gap: 0.5rem;
        }

        .approve-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .approve-button:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .button-icon {
          font-size: 1rem;
        }

        .request-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .detail-icon {
          font-size: 1rem;
        }

        .detail-value {
          color: white;
          font-weight: 600;
          text-align: right;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 반응형 */
        @media (max-width: 768px) {
          .admin-requests-page {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .controls-section {
            flex-direction: column;
          }

          .requests-grid {
            grid-template-columns: 1fr;
          }

          .request-header {
            flex-direction: column;
            gap: 1rem;
          }

          .request-meta {
            flex-direction: column;
            gap: 0.5rem;
          }

          .detail-value {
            max-width: 150px;
          }
        }

        @media (max-width: 480px) {
          .page-title {
            font-size: 1.25rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 1rem;
          }

          .request-card {
            padding: 1rem;
          }

          .detail-value {
            max-width: 120px;
            font-size: 0.875rem;
          }

          .approve-button {
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}

export default SuperAdminSchoolRequestPage;