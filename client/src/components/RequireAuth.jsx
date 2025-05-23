// src/components/RequireAuth.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function RequireAuth({ children }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
    }
  }, [token, navigate]);

  return token ? children : null;
}

export default RequireAuth;
