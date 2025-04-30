import { useEffect } from 'react';

function GoogleLoginButton({ onSuccess }) {
  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: '701008683168-vdtgcfkssnh9joq1fjkjk4utlm3ln9ug.apps.googleusercontent.com',
        callback: onSuccess
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
