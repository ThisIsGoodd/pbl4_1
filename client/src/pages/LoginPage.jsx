import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { AuthContext } from '../contexts/AuthContext';

function LoginPage() {
  const { setUser } = useContext(AuthContext);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth); // 🆕 윈도우 크기 추적

  // 🆕 윈도우 크기 변화 감지
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🆕 윈도우 크기에 따른 로고 크기 계산
  const getLogoSize = () => {
    if (windowWidth > 1200) return '450px';  // 대형 화면
    if (windowWidth > 768) return '400px';   // 데스크톱
    if (windowWidth > 480) return '300px';   // 태블릿
    return '250px';                          // 모바일
  };

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
          window.location.reload();
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
    <div style={styles.container}>
      {/* 로그인 텍스트 (왼쪽 상단) */}
      <div style={styles.loginText}>Login</div>
      
      {/* 메인 콘텐츠 */}
      <div style={styles.content}>
        {/* 로고 영역 */}
        <div style={styles.logoSection}>
          <img 
            src="/assets/logo.png" 
            alt="CLASSFEED Logo" 
            style={{
              ...styles.logoImage,
              width: getLogoSize() // 🆕 동적 크기 적용
            }}
          />
          <p style={styles.subtitle}>E-가정 통신 & 소통 플랫폼</p>
        </div>

        {/* 구글 로그인 버튼 */}
        <div style={styles.loginSection}>
          <GoogleLoginButton onSuccess={handleGoogleLogin} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  
  loginText: {
    position: 'absolute',
    top: '2rem',
    left: '2rem',
    fontSize: '1.1rem',
    color: '#6c757d',
    fontWeight: '500',
    zIndex: 10
  },
  
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    maxWidth: '500px',
    margin: '0 auto',
    width: '100%'
  },
  
  logoSection: {
    textAlign: 'center',
    marginBottom: '3rem'
  },
  
  logoImage: {
    height: 'auto',
    marginBottom: '2rem',
    objectFit: 'contain',
    maxWidth: '90vw', // 화면을 넘지 않도록 제한
    transition: 'width 0.3s ease' // 🆕 부드러운 크기 변화
  },
  
  subtitle: {
    fontSize: '1.1rem',
    color: '#6c757d',
    margin: '0',
    fontWeight: '400'
  },
  
  loginSection: {
    width: '100%',
    maxWidth: '320px'
  }
};

export default LoginPage;