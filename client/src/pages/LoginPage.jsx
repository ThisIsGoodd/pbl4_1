import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { AuthContext } from '../contexts/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleGoogleLogin = async (response) => {
    const idToken = response.credential;

    try {
      const res = await fetch('http://localhost:3001/api/auth/oauth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);

        const profileRes = await fetch('http://localhost:3001/api/users/profile', {
          headers: { Authorization: `Bearer ${data.token}` }
        });
        const profileData = await profileRes.json();

        if (profileRes.ok && profileData.user) {
          setUser(profileData.user);
          alert('로그인 성공!');

          const role = profileData.user.role;

          if (!role) {
            navigate('/role-select');
          } else if (role === 'parent') {
            navigate('/join/invite');
          } else if (role === 'teacher') {
            navigate('/teacher/auth');
          } else {
            navigate('/main'); // 예외 처리 fallback
          }

        } else {
          alert('사용자 정보 불러오기 실패');
        }
      } else {
        alert(data.error || '로그인 실패');
      }
    } catch (err) {
      console.error('Google 로그인 오류:', err);
      alert('서버 연결 오류');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>구글 로그인</h1>
      <GoogleLoginButton onSuccess={handleGoogleLogin} />
    </div>
  );
}

export default LoginPage;
