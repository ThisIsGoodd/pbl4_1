import { useLocation, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function JoinCompletePage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleStart = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/users/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user); // ✅ context 상태 갱신
      }

      navigate('/main'); // ✅ 대시보드 또는 메인으로 이동
    } catch (err) {
      console.error('프로필 재요청 실패:', err);
      navigate('/main');
    }
  };

  return (
    <div style={styles.container}>
      <img src="/assets/logo.png" alt="로고" style={styles.logo} />
      <h2>🎉 가입 완료!</h2>
      <p>{state?.schoolName || '학교'}에 성공적으로 가입하셨습니다.</p>
      <button onClick={handleStart} style={styles.continueBtn}>시작하기</button>
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', padding: '3rem' },
  logo: { height: '40px', marginBottom: '1rem' },
  continueBtn: { marginTop: '2rem', padding: '0.7rem 3rem', borderRadius: '30px', backgroundColor: '#ccc' }
};

export default JoinCompletePage;
