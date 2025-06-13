import React, { useState, useEffect } from 'react';

function SuperAdminInquiriesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [response, setResponse] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/inquiries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setInquiries(data.inquiries || []);
      }
    } catch (err) {
      console.error('문의사항 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (inquiryId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:3001/api/inquiries/${inquiryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchInquiries();
        alert('상태가 업데이트되었습니다.');
      }
    } catch (err) {
      console.error('상태 업데이트 실패:', err);
    }
  };

  const handleResponseSubmit = async (inquiryId) => {
    if (!response.trim()) return;

    try {
      const res = await fetch(`http://localhost:3001/api/inquiries/${inquiryId}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ response })
      });

      if (res.ok) {
        fetchInquiries();
        setResponse('');
        setSelectedInquiry(null);
        alert('답변이 전송되었습니다.');
      }
    } catch (err) {
      console.error('답변 전송 실패:', err);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: '#ff9800',
      in_progress: '#2196f3',
      resolved: '#4caf50',
      closed: '#757575'
    };
    const labels = {
      pending: '대기중',
      in_progress: '처리중',
      resolved: '해결됨',
      closed: '종료됨'
    };
    
    return (
      <span style={{
        backgroundColor: colors[status],
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        {labels[status]}
      </span>
    );
  };

  const getCategoryLabel = (category) => {
    const labels = {
      general: '일반',
      technical: '기술',
      school_request: '학교요청',
      account: '계정',
      other: '기타'
    };
    return labels[category] || category;
  };

  const filteredInquiries = filterStatus === 'all' 
    ? inquiries 
    : inquiries.filter(inquiry => inquiry.status === filterStatus);

  if (loading) return <div style={{ padding: '2rem' }}>⏳ 로딩 중...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        📋 문의사항 관리
      </h1>

      {/* 필터 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ marginRight: '1rem' }}>상태 필터:</label>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="all">전체</option>
          <option value="pending">대기중</option>
          <option value="in_progress">처리중</option>
          <option value="resolved">해결됨</option>
          <option value="closed">종료됨</option>
        </select>
      </div>

      {filteredInquiries.length === 0 ? (
        <p>문의사항이 없습니다.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredInquiries.map((inquiry) => (
            <div key={inquiry.inquiry_id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '1.5rem',
              backgroundColor: '#fff'
            }}>
              {/* 문의 헤더 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem' 
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{inquiry.title}</h3>
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    marginTop: '0.5rem',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>
                    <span>👤 {inquiry.user_name}</span>
                    <span>📧 {inquiry.user_email}</span>
                    <span>🏷️ {getCategoryLabel(inquiry.category)}</span>
                    <span>📅 {new Date(inquiry.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {getStatusBadge(inquiry.status)}
                  <button
                    onClick={() => setSelectedInquiry(
                      selectedInquiry?.inquiry_id === inquiry.inquiry_id ? null : inquiry
                    )}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {selectedInquiry?.inquiry_id === inquiry.inquiry_id ? '접기' : '상세보기'}
                  </button>
                </div>
              </div>

              {/* 문의 내용 */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem'
              }}>
                <p style={{ margin: 0, lineHeight: '1.6' }}>{inquiry.content}</p>
              </div>

              {/* 상세 정보 (펼쳐진 경우) */}
              {selectedInquiry?.inquiry_id === inquiry.inquiry_id && (
                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
                  {/* 상태 변경 */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ marginRight: '0.5rem' }}>상태 변경:</label>
                    <select
                      value={inquiry.status}
                      onChange={(e) => handleStatusUpdate(inquiry.inquiry_id, e.target.value)}
                      style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="pending">대기중</option>
                      <option value="in_progress">처리중</option>
                      <option value="resolved">해결됨</option>
                      <option value="closed">종료됨</option>
                    </select>
                  </div>

                  {/* 이전 답변 표시 */}
                  {inquiry.admin_response && (
                    <div style={{ marginBottom: '1rem' }}>
                      <strong>이전 답변:</strong>
                      <div style={{
                        backgroundColor: '#e3f2fd',
                        padding: '0.8rem',
                        borderRadius: '4px',
                        marginTop: '0.5rem'
                      }}>
                        {inquiry.admin_response}
                      </div>
                      <small style={{ color: '#666' }}>
                        답변일: {new Date(inquiry.responded_at).toLocaleString()}
                      </small>
                    </div>
                  )}

                  {/* 답변 작성 */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      답변 작성:
                    </label>
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="답변을 입력하세요..."
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '0.8rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        resize: 'vertical'
                      }}
                    />
                    <button
                      onClick={() => handleResponseSubmit(inquiry.inquiry_id)}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      답변 전송
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SuperAdminInquiriesPage;