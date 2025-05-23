import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function SchoolPendingPage() {
  const { user } = useContext(AuthContext);
  const [request, setRequest] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:3001/api/schools/school-requests/my', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setRequest(data.request))
      .catch(err => console.error('요청 정보 불러오기 실패:', err));
  }, []);

  if (!request) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">⏳ 요청 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      {/* 🔻 로그아웃 버튼 제거됨 */}

      <img src="/assets/logo.png" alt="logo" className="w-16 mb-2" />
      <h1 className="text-2xl font-bold tracking-wide mb-1">CLASSFEED</h1>
      <h2 className="text-xl mt-6 font-semibold">
        [<span className="text-blue-700">{request.school_name}</span>] 생성 승인 대기 중 입니다.
      </h2>

      <div className="mt-6 bg-white shadow-md rounded-lg p-4 w-full max-w-md text-left text-gray-700">
        <p><strong>학교명:</strong> {request.school_name}</p>
        <p><strong>학교 유형:</strong> {request.school_type || '정보 없음'}</p>
        <p><strong>학교 코드:</strong> {request.school_code || '정보 없음'}</p>
        <p><strong>요청일시:</strong> {new Date(request.requested_at).toLocaleString()}</p>
        <p><strong>신청자 이름:</strong> {request.contact_name || '정보 없음'}</p>
        <p><strong>휴대전화:</strong> {request.contact_phone || '정보 없음'}</p>
      </div>

      <button
        className="mt-6 px-6 py-2 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400"
        onClick={() => alert('문의 기능은 준비 중입니다.')}
      >
        문의하기
      </button>
    </div>
  );
}

export default SchoolPendingPage;
