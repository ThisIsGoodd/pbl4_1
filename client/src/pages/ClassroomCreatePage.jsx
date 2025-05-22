import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ClassroomCreatePage() {
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [message, setMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const handleCreate = async () => {
    if (!grade || !classNumber) {
      return alert('학년과 반을 모두 입력해주세요.');
    }

    try {
      const res = await fetch('http://localhost:3001/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          grade: parseInt(grade),
          class_number: parseInt(classNumber)
        })
      });

      const data = await res.json();

      if (res.ok) {
        setInviteCode(data.invite_code);
        setMessage(data.message || '학급이 생성되었습니다.');
      } else {
        alert(data.error || '학급 생성 실패');
      }
    } catch (err) {
      console.error('🔥 학급 생성 오류:', err);
      alert('서버 오류');
    }
  };

  return (
    <div style={styles.container}>
      <img src="/assets/logo.png" alt="로고" style={{ height: '40px', marginBottom: '1rem' }} />
      <h2>학급 생성</h2>

      <input
        type="number"
        placeholder="학년"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        style={styles.input}
      />
      <br />
      <input
        type="number"
        placeholder="반 번호"
        value={classNumber}
        onChange={(e) => setClassNumber(e.target.value)}
        style={styles.input}
      />
      <br />
      <button onClick={handleCreate} style={styles.createBtn}>학급 생성</button>

      {message && (
        <div style={{ marginTop: '1.5rem' }}>
          <p><strong>{message}</strong></p>
          {inviteCode && (
            <p>초대코드: <strong style={{ fontSize: '1.2rem' }}>{inviteCode}</strong></p>
          )}
          <button onClick={() => navigate('/classroom')} style={styles.continueBtn}>학급 관리로 이동</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    padding: '3rem'
  },
  input: {
    padding: '0.8rem',
    width: '300px',
    margin: '1rem 0',
    fontSize: '1rem'
  },
  createBtn: {
    padding: '0.7rem 3rem',
    borderRadius: '30px',
    backgroundColor: '#007bff',
    color: '#fff',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer'
  },
  continueBtn: {
    marginTop: '1rem',
    padding: '0.5rem 2rem',
    borderRadius: '20px',
    backgroundColor: '#ccc',
    border: 'none',
    cursor: 'pointer'
  }
};

export default ClassroomCreatePage;
