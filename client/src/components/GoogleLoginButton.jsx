import { useEffect, useRef } from 'react';

function GoogleLoginButton({ onSuccess }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (window.google && buttonRef.current) {
      // 기본 구글 버튼을 숨기고 커스텀 버튼 사용
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: onSuccess,
        ux_mode: 'popup'
      });

      // 숨겨진 구글 버튼 렌더링
      const hiddenDiv = document.createElement('div');
      hiddenDiv.style.display = 'none';
      document.body.appendChild(hiddenDiv);
      
      window.google.accounts.id.renderButton(hiddenDiv, { 
        theme: 'outline', 
        size: 'large' 
      });

      // 커스텀 버튼 클릭 시 구글 로그인 실행
      const handleCustomClick = () => {
        window.google.accounts.id.prompt();
      };

      if (buttonRef.current) {
        buttonRef.current.addEventListener('click', handleCustomClick);
      }

      return () => {
        if (buttonRef.current) {
          buttonRef.current.removeEventListener('click', handleCustomClick);
        }
        if (document.body.contains(hiddenDiv)) {
          document.body.removeChild(hiddenDiv);
        }
      };
    }
  }, [onSuccess]);

  return (
    <button 
      ref={buttonRef}
      style={styles.googleButton}
      onMouseOver={(e) => {
        e.target.style.backgroundColor = '#f8f9fa';
        e.target.style.transform = 'translateY(-1px)';
        e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
      onMouseOut={(e) => {
        e.target.style.backgroundColor = '#ffffff';
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={styles.buttonContent}>
        <img 
          src="https://developers.google.com/identity/images/g-logo.png" 
          alt="Google"
          style={styles.googleIcon}
        />
        <span style={styles.buttonText}>Continue with Google</span>
      </div>
    </button>
  );
}

const styles = {
  googleButton: {
    width: '100%',
    height: '48px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #e0e0e0',
    borderRadius: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  
  googleIcon: {
    width: '20px',
    height: '20px'
  },
  
  buttonText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#3c4043',
    letterSpacing: '0.25px'
  }
};

export default GoogleLoginButton;