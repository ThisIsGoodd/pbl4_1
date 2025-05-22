import { createContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // ✅ null → undefined
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null); // ✅ 명확히 로그인 안 된 상태로 표시
      return;
    }

    fetch('http://localhost:3001/api/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);

          // 역할이 아직 없으면 role 선택 페이지로
          if (!data.user.role) {
            navigate('/role-select');
          }
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      })
      .catch(err => {
        console.error('프로필 불러오기 실패:', err);
        localStorage.removeItem('token');
        setUser(null);
      });
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
