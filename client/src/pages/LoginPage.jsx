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
          
          // 로그인 직후 바로 리다이렉트하지 않고 AuthContext가 처리하도록 함
          setTimeout(async () => {
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
              // 🔥 수정: 학교 생성자인지 확인
              if (user.is_admin && user.school_id) {
                try {
                  const schoolRes = await fetch(`http://localhost:3001/api/schools/${user.school_id}`, {
                    headers: { Authorization: `Bearer ${data.token}` }
                  });
                  
                  if (schoolRes.ok) {
                    const schoolData = await schoolRes.json();
                    if (schoolData.created_by === user.user_id) {
                      // 학교 생성자만 관리자 메인으로
                      navigate('/admin/main');
                      return;
                    }
                  }
                } catch (err) {
                  console.error('학교 정보 조회 실패:', err);
                }
              }
              
              // 🔥 일반 교사는 학급 조회
              try {
                const classroomRes = await fetch('http://localhost:3001/api/classrooms/my-classroom', {
                  headers: { Authorization: `Bearer ${data.token}` }
                });
                
                if (classroomRes.ok) {
                  const classroomData = await classroomRes.json();
                  if (classroomData.classroom?.classroom_id) {
                    navigate(`/main?classroom_id=${classroomData.classroom.classroom_id}`);
                    return;
                  }
                }
              } catch (err) {
                console.error('학급 조회 실패:', err);
              }
              
              // 학급이 없으면
              if (user.classroom_id) {
                navigate(`/main?classroom_id=${user.classroom_id}`);
              } else if (user.school_id) {
                navigate('/classroom/create');
              } else {
                navigate('/teacher-auth');
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
          maxWidth: isMobile ? '300px' : '400px'
        }}>
          <GoogleLoginButton onSuccess={handleGoogleLogin} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  logoImage: {
    height: 'auto',
    objectFit: 'contain'
  },
  subtitle: {
    color: '#666',
    marginTop: '0.5rem',
    letterSpacing: '0.5px'
  },
  loginSection: {
    width: '100%',
    margin: '0 auto'
  }
};

export default LoginPage;