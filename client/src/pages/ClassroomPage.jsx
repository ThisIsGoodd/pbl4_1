import { useState, useEffect } from 'react';

function ClassroomPage() {
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [school, setSchool] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [myClassrooms, setMyClassrooms] = useState([]);

  const token = localStorage.getItem('token');

  const fetchClassrooms = async () => {
    const res = await fetch('http://localhost:3001/api/my-classrooms', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setMyClassrooms(data.classrooms);
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const createClassroom = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ grade, class_number: classNumber, school })
      });

      const data = await response.json();
      if (response.ok) {
        if (data.message === '이미 존재하는 학급입니다.') {
          alert(`이미 존재하는 학급입니다! 초대코드: ${data.invite_code}`);
        } else {
          alert(`학급 생성 완료! 초대코드: ${data.invite_code}`);
        }
        fetchClassrooms(); // 목록 갱신은 둘 다 필요
      } else {
        alert(data.error || '학급 생성 실패');
      }
    } catch (err) {
      console.error('학급 생성 오류:', err);
      alert('서버 연결 오류');
    }
  };

  const joinClassroom = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/join-classroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invite_code: inviteCode })
      });

      const data = await response.json();
      if (response.ok) {
        alert('학급 가입 성공!');
      } else {
        alert(data.error || '학급 가입 실패');
      }
    } catch (err) {
      console.error('학급 가입 오류:', err);
      alert('서버 연결 오류');
    }
  };

  const deleteClassroom = async (id) => {
    if (confirm('정말로 삭제하시겠습니까?')) {
      const res = await fetch(`http://localhost:3001/api/classrooms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('삭제 완료');
        fetchClassrooms(); // 목록 새로고침
      } else {
        alert(data.error || '삭제 실패');
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>학급 관리</h1>

      <h2>학급 생성</h2>
        <input type="number" placeholder="학년" value={grade} onChange={(e) => setGrade(e.target.value)} />
        <br />
        <input type="number" placeholder="반 번호" value={classNumber} onChange={(e) => setClassNumber(e.target.value)} />
        <br />
        <input type="text" placeholder="학교 이름" value={school} onChange={(e) => setSchool(e.target.value)} />
        <br />
        <button onClick={createClassroom}>학급 생성</button>
        <hr />

      <h2>초대코드로 학급 가입</h2>
        <input
          type="text"
          placeholder="초대코드 입력"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />
        <br />
        <button onClick={joinClassroom}>학급 가입</button>
        <hr />

      <h2>내가 만든 학급 목록</h2>
      {myClassrooms.length === 0 ? (
        <p>아직 생성한 학급이 없습니다.</p>
      ) : (
        <ul>
          {myClassrooms.map(c => (
            <li key={c.classroom_id}>
              {c.grade}학년 {c.class_number}반 ({c.school}) - 초대코드: {c.invite_code}
              <button onClick={() => deleteClassroom(c.classroom_id)} style={{ marginLeft: '1rem' }}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ClassroomPage;
