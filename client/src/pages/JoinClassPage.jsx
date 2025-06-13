// 📄 src/pages/JoinClassPage.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function JoinClassPage() {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      return setError('초대코드를 입력해주세요.');
    }

    try {
      const res = await fetch('http://localhost:3001/api/users/join-classroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ invite_code: inviteCode.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        alert('학급 가입 완료!');
        navigate('/classroom');
      } else {
        setError(data.error || '학급 가입 실패');
      }
    } catch (err) {
      console.error('학급 가입 오류:', err);
      setError('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>학급 초대코드 입력</h2>
      <input
        type="text"
        placeholder="초대코드"
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value)}
      />
      <br /><br />
      <button onClick={handleJoin}>가입하기</button>
      <button onClick={() => navigate('/select-role')} style={{ marginLeft: '1rem' }}>
        뒤로가기
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default JoinClassPage;
