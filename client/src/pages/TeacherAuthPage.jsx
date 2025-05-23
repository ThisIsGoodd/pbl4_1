import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function TeacherAuthPage() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleVerify = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/auth/verify-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        // ✅ 관리자 권한 토큰 저장
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        alert('인증 성공! 관리자 권한이 부여되었습니다.');

        if (data.hasClassroom) {
          navigate(`/classroom/dashboard?classroom_id=${data.classroomId}`);
        } else {
          navigate('/classroom/create');
        }
      } else {
        alert(data.message || '인증 실패. 관리자에게 문의하세요.');
      }
    } catch (err) {
      console.error('인증 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 px-4">
      <div className="bg-white p-6 sm:p-8 rounded shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2">교사 인증</h1>
        <p className="text-sm text-gray-500 mb-6">올바른 코드를 입력하세요.</p>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="초대코드를 입력하세요."
          className="w-full px-4 py-2 border rounded mb-6"
        />

        <div className="flex justify-between gap-4 mb-4">
          <button
            onClick={() => navigate('/role-select')}
            className="w-1/2 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            뒤로 가기
          </button>
          <button
            onClick={handleVerify}
            className="w-1/2 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            계속하기
          </button>
        </div>

        <button
          onClick={() => navigate('/admin/request-school')}
          className="w-full py-2 bg-red-100 text-red-700 font-semibold rounded-full hover:bg-red-200 transition text-sm"
        >
          학교를 생성하시려면 여기를 클릭하세요. (관리자 해당)
        </button>
      </div>
    </div>
  );
}

export default TeacherAuthPage;
