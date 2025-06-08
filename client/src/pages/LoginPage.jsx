import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { AuthContext } from '../contexts/AuthContext';

function LoginPage() {
  const { setUser } = useContext(AuthContext);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  // 윈도우 크기 변화 감지
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 윈도우 크기에 따른 로고 크기 계산
  const getLogoSize = () => {
    if (windowWidth > 1200) return '450px';  // 대형 화면
    if (windowWidth > 768) return '400px';   // 데스크톱
    if (windowWidth > 480) return '300px';   // 태블릿
    return '250px';                          // 모바일
  };

  // 윈도우 크기에 따른 레이아웃 판단
  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

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
          
          // 역할 확인 후 적절한 페이지로 이동
          const user = profileData.user;
          setTimeout(() => {
            if (!user.role) {
              navigate('/select-role');
            } else if (user.role === 'superadmin') {
              navigate('/superadmin/school-requests');
            } else if (user.role === 'parent') {
              if (user.joined_classrooms?.length > 0) {
                const firstClassroom = user.joined_classrooms[0];
                navigate(`/main?classroom_id=${firstClassroom.classroom_id}`);
              } else {
                navigate('/join/invite');
              }
            } else if (user.role === 'teacher') {
              if (user.is_admin) {
                navigate('/admindashboard');
              } else if (user.classroom_id) {
                navigate(`/main?classroom_id=${user.classroom_id}`);
              } else {
                navigate('/classroom/create');
              }
            }
          }, 100); // 약간의 딜레이로 상태 업데이트 완료 후 이동
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
    <div style={{
      ...styles.container,
      padding: isMobile ? '1rem' : '2rem'
    }}>      
      {/* 메인 콘텐츠 */}
      <div style={{
        ...styles.content,
        padding: isMobile ? '1rem' : '2rem',
        maxWidth: isMobile ? '100%' : '500px'
      }}>
        {/* 로고 영역 */}
        <div style={styles.logoSection}>
          <img 
            src="/assets/logo.png" 
            alt="CLASSFEED Logo" 
            style={{
              ...styles.logoImage,
              width: getLogoSize(),
              marginBottom: isMobile ? '1.5rem' : '2rem'
            }}
          />
          <p style={{
            ...styles.subtitle,
            fontSize: isMobile ? '1rem' : '1.1rem'
          }}>
            E-가정 통신 & 소통 플랫폼
          </p>
        </div>

        {/* 구글 로그인 버튼 */}
        <div style={{
          ...styles.loginSection,
          maxWidth: isMobile ? '100%' : '320px'
        }}>
          <GoogleLoginButton onSuccess={handleGoogleLogin} />
        </div>

        {/* 추가 정보 (모바일에서만 표시) */}
        {isMobile && (
          <div style={styles.mobileInfo}>
            <p style={styles.infoText}>
              학교와 가정을 연결하는<br />
              스마트한 소통 공간
            </p>
          </div>
        )}
      </div>

      {/* 푸터 (데스크톱에서만 표시) */}
      {!isMobile && (
        <div style={styles.footer}>
          <p style={styles.footerText}>
            학교와 가정을 연결하는 스마트한 소통 공간
          </p>
        </div>
      )}
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
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    transition: 'all 0.3s ease'
  },
  
  loginText: {
    position: 'absolute',
    color: '#6c757d',
    fontWeight: '500',
    zIndex: 10,
    transition: 'all 0.3s ease'
  },
  
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto',
    width: '100%',
    transition: 'all 0.3s ease'
  },
  
  logoSection: {
    textAlign: 'center',
    marginBottom: '3rem',
    animation: 'fadeInUp 0.8s ease-out'
  },
  
  logoImage: {
    height: 'auto',
    objectFit: 'contain',
    maxWidth: '90vw',
    transition: 'all 0.3s ease',
    filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))'
  },
  
  subtitle: {
    color: '#6c757d',
    margin: '0',
    fontWeight: '400',
    transition: 'all 0.3s ease'
  },
  
  loginSection: {
    width: '100%',
    animation: 'fadeInUp 0.8s ease-out 0.2s both'
  },

  mobileInfo: {
    marginTop: '2rem',
    textAlign: 'center',
    animation: 'fadeInUp 0.8s ease-out 0.4s both'
  },

  infoText: {
    fontSize: '0.9rem',
    color: '#8e9aaf',
    lineHeight: '1.6',
    margin: 0
  },

  footer: {
    position: 'absolute',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center'
  },

  footerText: {
    fontSize: '0.9rem',
    color: '#8e9aaf',
    margin: 0,
    opacity: 0.8
  }
};

export default LoginPage;