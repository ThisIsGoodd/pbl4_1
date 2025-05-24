import { useEffect } from 'react';

function GoogleLoginButton({ onSuccess }) {
  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: onSuccess,
        ux_mode: 'popup'
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-login-btn'),
        { theme: 'outline', size: 'large' }
      );
    }
  }, [onSuccess]);

  return <div id="google-login-btn"></div>;
}

export default GoogleLoginButton;