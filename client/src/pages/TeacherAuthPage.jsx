import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function TeacherAuthPage() {
  const [code, setCode] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [region, setRegion] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleVerify = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/auth/verify-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code }) // ✅ schoolId 제거, 서버에서 토큰으로 판별해야 자연스러움
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        alert('인증 성공! 관리자 권한이 부여되었습니다.');

        // ✅ 학급이 있다면 바로 학급 페이지로, 없으면 학급 생성 페이지로
        if (data.hasClassroom) {
          navigate('/classroom');
        } else {
          navigate('/classroom/create');
        }
      } else {
        setMessage(data.message || '인증 실패. 학교 생성 요청을 해주세요.');
        setShowRequestForm(true);
      }
    } catch (err) {
      console.error('인증 오류:', err);
      setMessage('서버 오류가 발생했습니다.');
    }
  };

  const handleSchoolRequest = async () => {
    if (!schoolName.trim()) return alert('학교명을 입력해주세요.');

    try {
      const res = await fetch('http://localhost:3001/api/schools/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ schoolName, region })
      });

      const data = await res.json();
      if (res.ok) {
        alert('학교 생성 요청이 접수되었습니다.');
        navigate('/');
      } else {
        alert(data.error || '요청 실패');
      }
    } catch (err) {
      console.error('요청 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <img src="/assets/logo.png" alt="로고" style={{ height: '40px', marginBottom: '1rem' }} />
      <h2>교사 인증</h2>
      <input
        type="text"
        placeholder="인증코드 입력"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <br /><br />
      <button onClick={handleVerify}>인증하기</button>

      {message && <p style={{ color: 'red' }}>{message}</p>}

      {showRequestForm && (
        <div style={{ marginTop: '2rem' }}>
          <h3>학교 생성 요청</h3>
          <input
            type="text"
            placeholder="학교명"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
          />
          <br />
          <input
            type="text"
            placeholder="지역 (선택)"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
          <br /><br />
          <button onClick={handleSchoolRequest}>학교 생성 요청</button>
        </div>
      )}
    </div>
  );
}

export default TeacherAuthPage;
