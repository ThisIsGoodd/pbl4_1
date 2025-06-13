// client/src/pages/LoginPage.jsx
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
          navigate('/select-role');
        }
      } else {
        alert(`로그인 실패: ${data.message}`);
      }
    } catch (err) {
      console.error('로그인 오류:', err);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        {/* 배경 장식 */}
        <div className="background-decorations">
          <div className="decoration decoration-1"></div>
          <div className="decoration decoration-2"></div>
          <div className="decoration decoration-3"></div>
        </div>

        {/* 메인 로그인 카드 */}
        <div className="login-card">
          {/* 헤더 섹션 */}
          <div className="header-section">
            <div className="logo-container">
              <img 
                src="/assets/logo.png" 
                alt="CLASSFEED Logo" 
                className="logo-image"
              />
            </div>
            <div className="welcome-content">
              <h1 className="main-title">CLASSFEED</h1>
              <p className="subtitle">E-가정 통신 & 소통 플랫폼</p>
              <p className="description">
                선생님과 학부모가 함께하는<br />
                스마트한 학급 소통 공간
              </p>
            </div>
          </div>

          {/* 로그인 섹션 */}
          <div className="login-section">
            <div className="login-header">
              <h2 className="login-title">시작하기</h2>
              <p className="login-description">
                Google 계정으로 간편하게 로그인하세요
              </p>
            </div>

            <div className="login-button-container">
              <GoogleLoginButton onSuccess={handleGoogleLogin} />
            </div>

            <div className="features-preview">
              <h3 className="features-title">주요 기능</h3>
              <div className="features-list">
                <div className="feature-item">
                  <span className="feature-icon">📢</span>
                  <span className="feature-text">실시간 공지사항</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💬</span>
                  <span className="feature-text">안전한 채팅</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📅</span>
                  <span className="feature-text">일정 관리</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔔</span>
                  <span className="feature-text">스마트 알림</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="footer">
          <p className="footer-text">
            안전하고 편리한 학급 소통을 위한 플랫폼
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          position: relative;
          overflow: hidden;
        }

        .container {
          width: 100%;
          max-width: 1000px;
          position: relative;
          z-index: 1;
        }

        /* 배경 장식 */
        .background-decorations {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .decoration {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          animation: float 6s ease-in-out infinite;
        }

        .decoration-1 {
          width: 200px;
          height: 200px;
          top: 10%;
          left: -5%;
          animation-delay: 0s;
        }

        .decoration-2 {
          width: 150px;
          height: 150px;
          top: 60%;
          right: -5%;
          animation-delay: 2s;
        }

        .decoration-3 {
          width: 100px;
          height: 100px;
          bottom: 20%;
          left: 10%;
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        /* 메인 로그인 카드 */
        .login-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }

        /* 헤더 섹션 */
        .header-section {
          padding: 3rem 2rem 2rem 2rem;
          text-align: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .logo-container {
          margin-bottom: 1.5rem;
        }

        .logo-image {
          width: 100%;
          max-width: 300px;
          height: auto;
          object-fit: contain;
        }

        .welcome-content {
          margin-top: 1rem;
        }

        .main-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 1.2rem;
          color: #64748b;
          margin: 0 0 1rem 0;
          font-weight: 500;
        }

        .description {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
          line-height: 1.6;
        }

        /* 로그인 섹션 */
        .login-section {
          padding: 2rem;
          background: white;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .login-description {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
        }

        .login-button-container {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .features-preview {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }

        .features-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 1rem 0;
          text-align: center;
        }

        .features-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          background: #e2e8f0;
          transform: translateY(-2px);
        }

        .feature-icon {
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .feature-text {
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }

        /* 푸터 */
        .footer {
          text-align: center;
          margin-top: 2rem;
        }

        .footer-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          margin: 0;
        }

        /* 반응형 디자인 */
        @media (min-width: 768px) {
          .login-card {
            grid-template-columns: 1fr 1fr;
          }

          .header-section {
            padding: 4rem 3rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .login-section {
            padding: 4rem 3rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .logo-image {
            max-width: 350px;
          }

          .main-title {
            font-size: 3rem;
          }

          .subtitle {
            font-size: 1.3rem;
          }

          .features-list {
            grid-template-columns: 1fr;
          }
        }

        @media (min-width: 1024px) {
          .logo-image {
            max-width: 400px;
          }

          .main-title {
            font-size: 3.5rem;
          }
        }

        @media (max-width: 767px) {
          .login-page {
            padding: 0.5rem;
          }

          .header-section {
            padding: 2rem 1.5rem 1.5rem 1.5rem;
          }

          .login-section {
            padding: 1.5rem;
          }

          .logo-image {
            max-width: 250px;
          }

          .main-title {
            font-size: 2rem;
          }

          .subtitle {
            font-size: 1.1rem;
          }

          .login-title {
            font-size: 1.5rem;
          }

          .features-list {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .header-section {
            padding: 1.5rem 1rem;
          }

          .login-section {
            padding: 1rem;
          }

          .logo-image {
            max-width: 200px;
          }

          .main-title {
            font-size: 1.75rem;
          }

          .description {
            font-size: 0.9rem;
          }

          .feature-item {
            padding: 0.5rem;
          }

          .feature-text {
            font-size: 0.8rem;
          }
        }

        /* 다크모드 대응 */
        @media (prefers-color-scheme: dark) {
          .login-card {
            background: rgba(30, 30, 30, 0.95);
          }

          .header-section {
            background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
          }

          .login-section {
            background: #1f2937;
          }

          .main-title,
          .login-title {
            color: #f9fafb;
          }

          .subtitle,
          .description,
          .login-description {
            color: #d1d5db;
          }

          .features-title {
            color: #e5e7eb;
          }

          .feature-item {
            background: #374151;
          }

          .feature-item:hover {
            background: #4b5563;
          }

          .feature-text {
            color: #e5e7eb;
          }

          .features-preview {
            border-top-color: #4b5563;
          }
        }

        /* 접근성 개선 */
        .feature-item:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        /* 애니메이션 감소 설정 */
        @media (prefers-reduced-motion: reduce) {
          .decoration {
            animation: none;
          }

          .feature-item {
            transition: none;
          }

          .feature-item:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

export default LoginPage;