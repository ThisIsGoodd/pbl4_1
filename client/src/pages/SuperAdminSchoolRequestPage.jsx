import React, { useEffect, useState } from 'react';

function SuperAdminSchoolRequestPage() {
  const [requests, setRequests] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('http://localhost:3001/api/superadmin/school-requests', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.requests) setRequests(data.requests);
      });
  }, [token]);

  const handleApprove = async (requestId) => {
    if (!window.confirm('이 요청을 승인하시겠습니까?')) return;

    const res = await fetch(`http://localhost:3001/api/superadmin/school-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      alert('학교 생성 및 관리자 권한 부여 완료');
      setRequests(prev => prev.filter(r => r.request_id !== requestId));
    } else {
      alert('승인 실패');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>학교 생성 요청 목록 (개발자 전용)</h2>
      {requests.length === 0 ? (
        <p>요청이 없습니다.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>학교 이름</th>
              <th>지역</th>
              <th>요청자</th>
              <th>이메일</th>
              <th>요청일</th>
              <th>승인</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.request_id}>
                <td>{req.school_name}</td>
                <td>{req.region || '-'}</td>
                <td>{req.requester_name}</td>
                <td>{req.email}</td>
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
