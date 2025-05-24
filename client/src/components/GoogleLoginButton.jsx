import { useEffect, useRef } from 'react';

function GoogleLoginButton({ onSuccess }) {
  const googleButtonRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (!window.google || isInitialized.current) return;

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        console.error('❌ VITE_GOOGLE_CLIENT_ID가 설정되지 않았습니다.');
        return;
      }

      console.log('🔍 Google Client ID:', clientId);

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: onSuccess,
          ux_mode: 'popup',
          context: 'signin',
          auto_select: false,
          use_fedcm_for_prompt: false // FedCM 비활성화
        });

        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(
            googleButtonRef.current,
            { 
              theme: 'outline', 
              size: 'large',
              type: 'standard',
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 280
            }
          );
        }

        isInitialized.current = true;
        console.log('✅ Google Sign-In 초기화 완료');

      } catch (error) {
        console.error('❌ Google Sign-In 초기화 오류:', error);
      }
    };

    // Google SDK가 로드될 때까지 대기
    if (window.google && window.google.accounts) {
      initializeGoogleSignIn();
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(checkGoogle);
          initializeGoogleSignIn();
        }
      }, 100);

      // 10초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkGoogle);
        if (!isInitialized.current) {
          console.error('❌ Google SDK 로드 실패');
        }
      }, 10000);
    }
  }, [onSuccess]);

  return (
    <div style={styles.container}>
      <div ref={googleButtonRef} style={styles.googleButton}></div>
      {!isInitialized.current && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>
            Google 로그인을 준비 중입니다...
          </p>
        </div>
      )}
      
      {/* 보조 텍스트 추가 */}
      {isInitialized.current && (
        <p style={styles.helperText}>
          빠르고 안전한 Google 계정으로 로그인하세요
        </p>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem 0',
    minHeight: '140px',
    width: '100%'
  },
  googleButton: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '16px',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'translateY(0)',
    filter: 'drop-shadow(0 6px 20px rgba(66, 133, 244, 0.15))',
    // 호버 효과를 위한 스타일
    '&:hover': {
      transform: 'translateY(-3px)',
      filter: 'drop-shadow(0 12px 30px rgba(66, 133, 244, 0.25))'
    }
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '1.2rem'
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #f1f5f9',
    borderTop: '3px solid #4285f4',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: '0.025em',
    lineHeight: '1.4'
  },
  helperText: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: '20px',
    margin: '20px 0 0 0',
    fontWeight: '400',
    opacity: 0.8
  }
};

export default GoogleLoginButton;