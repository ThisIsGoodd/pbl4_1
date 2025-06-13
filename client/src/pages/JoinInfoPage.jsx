import { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext'; // 🔥 추가

function JoinInfoPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext); // 🔥 추가: context 접근
  const [schoolName, setSchoolName] = useState(state?.schoolName || '');

  // 학교 이름 불러오기
  useEffect(() => {
    const fetchSchoolName = async () => {
      if (state?.schoolName) {
        setSchoolName(state.schoolName);
        return;
      }

      if (!state?.school) return;

      try {
        const res = await fetch(`http://localhost:3001/api/schools/${state.school}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSchoolName(data.name);
        } else {
          setSchoolName('학교 이름 불러오기 실패');
        }
      } catch (err) {
        console.error('학교 정보 오류:', err);
        setSchoolName('학교 정보 오류');
      }
    };

    fetchSchoolName();
  }, [state?.school, state?.schoolName]);

  // 🔥 수정: 학급 연결 API 호출 및 사용자 정보 갱신
  const handleSubmit = async () => {
    if (!state?.classroom_id) return;

    try {
      const res = await fetch('http://localhost:3001/api/users/join-classroom', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ classroom_id: state.classroom_id })
      });

      if (res.ok) {
        // 🔥 추가: 사용자 정보 다시 불러와서 네비게이션 갱신
        try {
          const userRes = await fetch('http://localhost:3001/api/users/profile', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });

          if (userRes.ok) {
            const userData = await userRes.json();
            setUser(userData.user); // 🔥 Context 상태 갱신으로 네비게이션 자동 새로고침
            console.log('✅ 사용자 정보 갱신 완료:', userData.user);
          }
        } catch (userErr) {
          console.error('사용자 정보 갱신 실패:', userErr);
        }

        // 메인 페이지로 이동
        navigate(`/main?classroom_id=${state.classroom_id}`, {
          state: {
            schoolName,
            grade: state.grade,
            classNumber: state.classNumber
          }
        });
      } else {
        const data = await res.json();
        alert(`학급 연결 실패: ${data.message}`);
      }
    } catch (err) {
      console.error('학급 연결 오류:', err);
      alert('서버 오류');
    }
  };

  return (
    <div style={styles.container}>
      <h2>학교 및 학급 정보 확인</h2>
      <p>아래 정보를 확인한 후 가입을 완료하세요.</p>

      <div style={styles.infoBox}>
        <p><strong>학교명:</strong> {schoolName}</p>
        <p><strong>학년:</strong> {state?.grade}</p>
        <p><strong>반:</strong> {state?.classNumber}</p>
      </div>

      <button onClick={handleSubmit} style={styles.continueBtn}>가입 완료하기</button>
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', padding: '3rem' },
  logo: { height: '40px', marginBottom: '1rem' },
  infoBox: {
    border: '1px solid #ccc',
    padding: '1rem 2rem',
    margin: '1rem auto',
    width: '300px',
    textAlign: 'left'
  },
  continueBtn: { marginTop: '2rem', padding: '0.7rem 3rem', borderRadius: '30px', backgroundColor: '#ccc' }
};

export default JoinInfoPage;