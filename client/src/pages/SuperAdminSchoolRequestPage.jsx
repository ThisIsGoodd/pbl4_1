import React, { useEffect, useState } from 'react';

function SuperAdminSchoolRequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;

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
      })
      .catch(err => {
        console.error('🔥 학교 요청 불러오기 실패:', err);
      })
      .finally(() => setLoading(false));
  }, [token]);

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

  return (
    <div style={{ padding: '2rem' }}>
      <h2>학교 생성 요청 목록 (개발자 전용)</h2>

      {loading ? (
        <p>⏳ 로딩 중...</p>
      ) : requests.length === 0 ? (
        <p>요청이 없습니다.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>학교 이름</th>
              <th>학교 유형</th>
              <th>학교 코드</th>
              <th>요청자</th>
              <th>이메일</th>
              <th>신청자 이름</th>
              <th>연락처</th>
              <th>요청일</th>
              <th>승인</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.request_id}>
                <td>{req.school_name}</td>
                <td>{req.school_type || '-'}</td>
                <td>{req.school_code || '-'}</td>
                <td>{req.requester_name}</td>
                <td>{req.email}</td>
                <td>{req.contact_name || '-'}</td>
                <td>{req.contact_phone || '-'}</td>
                <td>{new Date(req.requested_at).toLocaleString()}</td>
                <td>
                  <button onClick={() => handleApprove(req.request_id)}>승인</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SuperAdminSchoolRequestPage;
