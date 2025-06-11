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
          
          // 사용자 상태에 따른 라우팅
          const user = profileData.user;
          if (!user.role) {
            navigate('/select-role');
          } else if (user.role === 'parent' && (!user.joined_classrooms || user.joined_classrooms.length === 0)) {
            navigate('/join/invite');
          } else if (user.role === 'teacher' && user.pending_approval) {
            navigate('/teacher-auth');
          } else {
            navigate('/main');
          }
        }
      } else {
        alert(data.error || '로그인에 실패했습니다.');
      }
    } catch (err) {
      console.error('로그인 오류:', err);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="login-page">
      {/* 배경 애니메이션 요소들 */}
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
        <div className="shape shape-6"></div>
      </div>

      <div className="login-container">
        {/* 로고 및 브랜딩 영역 */}
        <div className="branding-section">
          <div className="logo-container">
            <img 
              src="/assets/logo.png" 
              alt="CLASSFEED Logo" 
              className="logo-image"
            />
          </div>
          
          <div className="brand-content">
            <h1 className="brand-title">CLASSFEED</h1>
            <p className="brand-subtitle">E-가정 통신 & 소통 플랫폼</p>
            <div className="feature-tags">
              <span className="feature-tag">📱 실시간 소통</span>
              <span className="feature-tag">📋 학급 관리</span>
              <span className="feature-tag">📅 일정 공유</span>
            </div>
          </div>
        </div>

        {/* 로그인 카드 */}
        <div className="login-card">
          <div className="login-header">
            <h2 className="login-title">환영합니다!</h2>
            <p className="login-subtitle">
              Google 계정으로 간편하게 로그인하세요
            </p>
          </div>

          <div className="login-form">
            <GoogleLoginButton onSuccess={handleGoogleLogin} />
          </div>

          <div className="login-benefits">
            <h3 className="benefits-title">CLASSFEED의 특징</h3>
            <ul className="benefits-list">
              <li className="benefit-item">
                <span className="benefit-icon">🔐</span>
                <span className="benefit-text">안전한 Google 로그인</span>
              </li>
              <li className="benefit-item">
                <span className="benefit-icon">💬</span>
                <span className="benefit-text">선생님과 실시간 소통</span>
              </li>
              <li className="benefit-item">
                <span className="benefit-icon">📢</span>
                <span className="benefit-text">중요한 공지사항 알림</span>
              </li>
              <li className="benefit-item">
                <span className="benefit-icon">📊</span>
                <span className="benefit-text">학급 활동 현황 파악</span>
              </li>
            </ul>
          </div>
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
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* 배경 애니메이션 요소들 */
        .background-shapes {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        .shape {
          position: absolute;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          animation: float 6s ease-in-out infinite;
        }

        .shape-1 {
          width: 80px;
          height: 80px;
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .shape-2 {
          width: 120px;
          height: 120px;
          top: 20%;
          right: 15%;
          animation-delay: 1s;
        }

        .shape-3 {
          width: 60px;
          height: 60px;
          bottom: 30%;
          left: 20%;
          animation-delay: 2s;
        }

        .shape-4 {
          width: 100px;
          height: 100px;
          bottom: 20%;
          right: 10%;
          animation-delay: 3s;
        }

        .shape-5 {
          width: 40px;
          height: 40px;
          top: 50%;
          left: 5%;
          animation-delay: 4s;
        }

        .shape-6 {
          width: 90px;
          height: 90px;
          top: 70%;
          right: 25%;
          animation-delay: 5s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.9;
          }
        }

        .login-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          max-width: 1200px;
          width: 100%;
          position: relative;
          z-index: 2;
          animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 브랜딩 섹션 */
        .branding-section {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          color: white;
        }

        .logo-container {
          margin-bottom: 2rem;
          animation: logoSpin 10s linear infinite;
        }

        @keyframes logoSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .logo-image {
          width: clamp(200px, 25vw, 350px);
          height: auto;
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2));
        }

        .brand-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          margin: 0 0 1rem 0;
          text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          letter-spacing: -0.02em;
        }

        .brand-subtitle {
          font-size: clamp(1.1rem, 2.5vw, 1.4rem);
          margin: 0 0 2rem 0;
          opacity: 0.9;
          font-weight: 300;
        }

        .feature-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: center;
        }

        .feature-tag {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        /* 로그인 카드 */
        .login-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0 0 0.5rem 0;
        }

        .login-subtitle {
          font-size: 1rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
          font-weight: 400;
        }

        .login-form {
          margin-bottom: 2rem;
        }

        .login-benefits {
          border-top: 1px solid var(--border-color, #e2e8f0);
          padding-top: 1.5rem;
        }

        .benefits-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 1rem 0;
          text-align: center;
        }

        .benefits-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background-color 0.2s ease;
        }

        .benefit-item:hover {
          background: var(--bg-hover, #f1f5f9);
        }

        .benefit-icon {
          font-size: 1.2rem;
          width: 24px;
          text-align: center;
        }

        .benefit-text {
          font-size: 0.9rem;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .login-page {
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
            --bg-hover: #334155;
          }

          .login-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.9) 100%);
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 1024px) {
          .login-container {
            grid-template-columns: 1fr;
            gap: 2rem;
            max-width: 500px;
          }

          .branding-section {
            order: 2;
          }

          .login-card {
            order: 1;
            padding: 2rem;
          }

          .feature-tags {
            display: none;
          }

          .brand-title {
            font-size: 2rem;
          }

          .brand-subtitle {
            font-size: 1rem;
          }
        }

        @media (max-width: 768px) {
          .login-page {
            padding: 0.5rem;
            align-items: flex-start;
            padding-top: 2rem;
          }

          .login-container {
            gap: 1.5rem;
          }

          .login-card {
            padding: 1.5rem;
            border-radius: 20px;
          }

          .logo-image {
            width: 180px;
          }

          .brand-title {
            font-size: 1.8rem;
          }

          .brand-subtitle {
            font-size: 0.9rem;
          }

          .login-title {
            font-size: 1.5rem;
          }

          .benefits-list {
            gap: 0.5rem;
          }

          .benefit-item {
            padding: 0.25rem;
          }

          .shape {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .login-page {
            padding: 0.25rem;
            padding-top: 1rem;
          }

          .login-card {
            padding: 1.25rem;
            border-radius: 16px;
          }

          .logo-image {
            width: 150px;
          }

          .brand-title {
            font-size: 1.5rem;
          }

          .brand-subtitle {
            font-size: 0.85rem;
          }

          .login-title {
            font-size: 1.3rem;
          }

          .login-subtitle {
            font-size: 0.9rem;
          }

          .benefits-title {
            font-size: 1rem;
          }

          .benefit-text {
            font-size: 0.85rem;
          }
        }

        /* 고해상도 디스플레이 최적화 */
        @media (min-width: 1400px) {
          .login-container {
            max-width: 1400px;
            gap: 4rem;
          }

          .login-card {
            padding: 3rem;
          }

          .logo-image {
            width: 400px;
          }
        }

        /* 접근성 */
        .login-card:focus-within {
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        /* 애니메이션 성능 최적화 */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          .shape {
            display: none;
          }
        }

        /* 인쇄 최적화 */
        @media print {
          .background-shapes,
          .shape {
            display: none;
          }

          .login-page {
            background: white;
            color: black;
          }

          .login-card {
            background: white;
            box-shadow: none;
            border: 1px solid #ccc;
          }
        }
      `}</style>
    </div>
  );
}

export default LoginPage;