import React, { useEffect, useState } from 'react';

function SuperAdminInquiriesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [filteredInquiries, setFilteredInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    fetchInquiries();
  }, []);

  useEffect(() => {
    setFilteredInquiries(
      filterStatus === 'all' 
        ? inquiries 
        : inquiries.filter(inquiry => inquiry.status === filterStatus)
    );
  }, [inquiries, filterStatus]);

  const fetchInquiries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/inquiries', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('문의사항을 불러올 수 없습니다.');
      }

      const data = await response.json();
      setInquiries(data.inquiries || []);
    } catch (err) {
      console.error('문의사항 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (inquiryId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/inquiries/${inquiryId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          response: '상태가 업데이트되었습니다.',
          status: newStatus,
        }),
      });

      if (res.ok) {
        fetchInquiries();
      }
    } catch (err) {
      console.error('상태 업데이트 실패:', err);
      alert('상태 업데이트에 실패했습니다.');
    }
  };

  const handleResponseSubmit = async (inquiryId) => {
    if (!response.trim()) {
      alert('답변을 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/inquiries/${inquiryId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          response: response,
          status: 'resolved',
        }),
      });

      if (res.ok) {
        alert('답변이 전송되었습니다.');
        setResponse('');
        setSelectedInquiry(null);
        fetchInquiries();
      }
    } catch (err) {
      console.error('답변 전송 실패:', err);
      alert('답변 전송에 실패했습니다.');
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { label: '대기중', color: '#f59e0b', bgColor: '#fef3c7' },
      in_progress: { label: '처리중', color: '#3b82f6', bgColor: '#dbeafe' },
      resolved: { label: '해결됨', color: '#10b981', bgColor: '#d1fae5' },
      closed: { label: '종료됨', color: '#6b7280', bgColor: '#f3f4f6' }
    };
    return statusMap[status] || statusMap.pending;
  };

  const getCategoryInfo = (category) => {
    const categoryMap = {
      general: { label: '일반 문의', icon: '💬' },
      technical: { label: '기술 문의', icon: '🔧' },
      account: { label: '계정 문의', icon: '👤' },
      school_request: { label: '학교 승인', icon: '🏫' },
      bug_report: { label: '버그 신고', icon: '🐛' },
      feature_request: { label: '기능 요청', icon: '✨' }
    };
    return categoryMap[category] || categoryMap.general;
  };

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
      <div className="admin-inquiries-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <p className="loading-text">문의사항을 불러오는 중...</p>
        </div>
        <style jsx>{`
          .admin-inquiries-page {
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

  return (
    <div className="admin-inquiries-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header-section">
          <div className="header-content">
            <div className="header-icon">📋</div>
            <div className="header-text">
              <h1 className="page-title">문의사항 관리</h1>
              <p className="page-subtitle">사용자 문의사항을 확인하고 답변할 수 있습니다</p>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-number">{inquiries.length}</div>
                <div className="stat-label">전체 문의</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-number">{inquiries.filter(i => i.status === 'pending').length}</div>
                <div className="stat-label">대기중</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <div className="stat-number">{inquiries.filter(i => i.status === 'in_progress').length}</div>
                <div className="stat-label">처리중</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">{inquiries.filter(i => i.status === 'resolved').length}</div>
                <div className="stat-label">해결됨</div>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 섹션 */}
        <div className="filter-section">
          <div className="filter-card">
            <div className="filter-header">
              <span className="filter-icon">🔍</span>
              <span className="filter-title">필터</span>
            </div>
            <div className="filter-controls">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">전체 상태</option>
                <option value="pending">대기중</option>
                <option value="in_progress">처리중</option>
                <option value="resolved">해결됨</option>
                <option value="closed">종료됨</option>
              </select>
            </div>
          </div>
        </div>

        {/* 문의사항 목록 */}
        <div className="inquiries-section">
          {filteredInquiries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3 className="empty-title">문의사항이 없습니다</h3>
              <p className="empty-description">
                {filterStatus === 'all' 
                  ? '아직 등록된 문의사항이 없습니다.'
                  : `${getStatusInfo(filterStatus).label} 상태의 문의사항이 없습니다.`
                }
              </p>
            </div>
          ) : (
            <div className="inquiries-grid">
              {filteredInquiries.map((inquiry) => {
                const statusInfo = getStatusInfo(inquiry.status);
                const categoryInfo = getCategoryInfo(inquiry.category);
                const isExpanded = selectedInquiry?.inquiry_id === inquiry.inquiry_id;

                return (
                  <div key={inquiry.inquiry_id} className="inquiry-card">
                    {/* 카드 헤더 */}
                    <div className="inquiry-header">
                      <div className="inquiry-title-section">
                        <h3 className="inquiry-title">{inquiry.title}</h3>
                        <div className="inquiry-meta">
                          <span className="meta-item">
                            <span className="meta-icon">👤</span>
                            {inquiry.user_name}
                          </span>
                          <span className="meta-item">
                            <span className="meta-icon">📧</span>
                            {inquiry.user_email}
                          </span>
                          <span className="meta-item">
                            <span className="meta-icon">{categoryInfo.icon}</span>
                            {categoryInfo.label}
                          </span>
                          <span className="meta-item">
                            <span className="meta-icon">📅</span>
                            {formatDate(inquiry.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="inquiry-actions">
                        <div 
                          className="status-badge"
                          style={{ 
                            color: statusInfo.color, 
                            backgroundColor: statusInfo.bgColor 
                          }}
                        >
                          {statusInfo.label}
                        </div>
                        <button
                          onClick={() => setSelectedInquiry(isExpanded ? null : inquiry)}
                          className="expand-button"
                        >
                          <span className="button-icon">{isExpanded ? '▲' : '▼'}</span>
                          {isExpanded ? '접기' : '상세보기'}
                        </button>
                      </div>
                    </div>

                    {/* 문의 내용 미리보기 */}
                    <div className="inquiry-content-preview">
                      <p className="content-text">
                        {inquiry.content.length > 150 
                          ? inquiry.content.substring(0, 150) + '...'
                          : inquiry.content
                        }
                      </p>
                    </div>

                    {/* 확장된 상세 정보 */}
                    {isExpanded && (
                      <div className="inquiry-details">
                        {/* 전체 내용 */}
                        <div className="detail-section">
                          <h4 className="detail-title">
                            <span className="detail-icon">📝</span>
                            문의 내용
                          </h4>
                          <div className="detail-content">
                            <p className="full-content">{inquiry.content}</p>
                          </div>
                        </div>

                        {/* 이전 답변 (있는 경우) */}
                        {inquiry.admin_response && (
                          <div className="detail-section">
                            <h4 className="detail-title">
                              <span className="detail-icon">💬</span>
                              이전 답변
                            </h4>
                            <div className="previous-response">
                              <p className="response-text">{inquiry.admin_response}</p>
                              <div className="response-meta">
                                <span className="response-author">답변자: {inquiry.admin_name || '관리자'}</span>
                                {inquiry.responded_at && (
                                  <span className="response-date">{formatDate(inquiry.responded_at)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 상태 변경 */}
                        <div className="detail-section">
                          <h4 className="detail-title">
                            <span className="detail-icon">⚙️</span>
                            상태 관리
                          </h4>
                          <div className="status-controls">
                            <select
                              value={inquiry.status}
                              onChange={(e) => handleStatusUpdate(inquiry.inquiry_id, e.target.value)}
                              className="status-select"
                            >
                              <option value="pending">대기중</option>
                              <option value="in_progress">처리중</option>
                              <option value="resolved">해결됨</option>
                              <option value="closed">종료됨</option>
                            </select>
                          </div>
                        </div>

                        {/* 답변 작성 */}
                        <div className="detail-section">
                          <h4 className="detail-title">
                            <span className="detail-icon">✍️</span>
                            답변 작성
                          </h4>
                          <div className="response-form">
                            <textarea
                              value={response}
                              onChange={(e) => setResponse(e.target.value)}
                              placeholder="답변을 입력하세요..."
                              className="response-textarea"
                              rows="4"
                            />
                            <button
                              onClick={() => handleResponseSubmit(inquiry.inquiry_id)}
                              className="submit-button"
                              disabled={!response.trim()}
                            >
                              <span className="button-icon">📤</span>
                              답변 전송
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .admin-inquiries-page {
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

        /* 필터 섹션 */
        .filter-section {
          display: flex;
          gap: 1rem;
        }

        .filter-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 280px;
        }

        .filter-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          font-weight: 600;
        }

        .filter-icon {
          font-size: 1.2rem;
        }

        .filter-select {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 500;
          backdrop-filter: blur(10px);
          cursor: pointer;
        }

        .filter-select option {
          background: #333;
          color: white;
        }

        /* 문의사항 섹션 */
        .inquiries-section {
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

        .inquiries-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* 문의 카드 */
        .inquiry-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .inquiry-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .inquiry-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .inquiry-title-section {
          flex: 1;
        }

        .inquiry-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.75rem 0;
          line-height: 1.4;
        }

        .inquiry-meta {
          display: flex;
          flex-wrap: wrap;
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

        .inquiry-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .status-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .expand-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .expand-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .button-icon {
          font-size: 0.875rem;
        }

        /* 문의 내용 미리보기 */
        .inquiry-content-preview {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .content-text {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin: 0;
        }

        /* 상세 정보 */
        .inquiry-details {
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding-top: 1.5rem;
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .detail-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.25rem;
        }

        .detail-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin: 0 0 1rem 0;
        }

        .detail-icon {
          font-size: 1.2rem;
        }

        .detail-content {
          color: rgba(255, 255, 255, 0.9);
        }

        .full-content {
          line-height: 1.6;
          margin: 0;
        }

        .previous-response {
          background: rgba(59, 130, 246, 0.1);
          border-radius: 8px;
          padding: 1rem;
          border-left: 3px solid #3b82f6;
        }

        .response-text {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin: 0 0 0.75rem 0;
        }

        .response-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .status-controls {
          display: flex;
          gap: 1rem;
        }

        .status-select {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 500;
          backdrop-filter: blur(10px);
          cursor: pointer;
        }

        .status-select option {
          background: #333;
          color: white;
        }

        .response-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .response-textarea {
          width: 100%;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-family: inherit;
          line-height: 1.5;
          resize: vertical;
          backdrop-filter: blur(10px);
        }

        .response-textarea::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .submit-button:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* 반응형 */
        @media (max-width: 768px) {
          .admin-inquiries-page {
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

          .inquiry-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .inquiry-actions {
            justify-content: space-between;
            align-items: center;
          }

          .inquiry-meta {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .filter-card {
            flex-direction: column;
            align-items: stretch;
            min-width: auto;
          }

          .filter-controls {
            width: 100%;
          }

          .filter-select {
            width: 100%;
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

          .inquiry-card {
            padding: 1rem;
          }

          .detail-section {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default SuperAdminInquiriesPage;