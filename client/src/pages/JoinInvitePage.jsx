import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function JoinInvitePage() {
  const { state } = useLocation(); // state.role 받아옴
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!inviteCode) return;

    try {
      const res = await fetch('http://localhost:3001/api/schools/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode })
      });

      const data = await res.json();

      if (res.ok) {
        navigate('/join/info', {
          state: {
            role: state?.role,
            inviteCode,
            classroom_id: data.classroom.classroom_id,
            school: data.classroom.school_id, // school_id 전달
            schoolName: data.classroom.school_name, // 🆕 학교명도 직접 전달
            grade: data.classroom.grade,
            classNumber: data.classroom.class_number
          }
        });
      } else {
        setError(data.message || '초대코드 확인 실패');
      }
    } catch (err) {
      console.error('초대코드 확인 오류:', err);
      setError('서버 오류');
    }
  };

  const handleMoveToClassroom = () => {
    navigate('/main');
  };

  if (user === undefined) {
    return <div style={styles.container}><p>로딩 중...</p></div>;
  }

  return (
    <div style={styles.container}>
      <h2>초대코드 입력</h2>

      {user?.joined_classrooms?.length > 0 && (
        <div style={styles.classInfoBox}>
          <p>이미 가입된 학급:</p>
          {user.joined_classrooms.map((cls) => (
            <button
              key={cls.classroom_id}
              onClick={() => navigate(`/main?classroom_id=${cls.classroom_id}`)}
              style={styles.classButton}
            >
              {cls.grade}학년 {cls.class_number}반 ({cls.school})
            </button>
          ))}
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            ※ 추가 학급 가입을 원하시면 아래에 새 초대코드를 입력하세요.
          </p>
        </div>
      )}

      <input
        type="text"
        placeholder="초대코드를 입력하세요."
        value={inviteCode}
        onChange={(e) => {
          const raw = e.target.value.toUpperCase();
          const filtered = raw.replace(/[^A-Z0-9]/g, '').slice(0, 6);
          setInviteCode(filtered);
        }}
        style={styles.input}
      />
      <button onClick={handleSubmit} disabled={!inviteCode} style={styles.continueBtn}>
        계속하기
      </button>
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', padding: '3rem' },
  logo: { height: '40px', marginBottom: '1rem' },
  classInfoBox: {
    border: '1px solid #ccc',
    padding: '1rem',
    marginBottom: '1rem',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9'
  },
  classButton: {
    padding: '0.5rem 1.5rem',
    borderRadius: '20px',
    backgroundColor: '#d4eaff',
    border: 'none',
    cursor: 'pointer',
    marginBottom: '0.3rem'
  },
  input: {
    padding: '0.8rem',
    width: '300px',
    margin: '1rem 0',
    fontSize: '1rem',
    textTransform: 'uppercase'
  },
  continueBtn: {
    padding: '0.7rem 3rem',
    borderRadius: '30px',
    backgroundColor: '#ccc',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default JoinInvitePage;