import { createContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndRedirect = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const res = await fetch('http://localhost:3001/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!data.user) {
          localStorage.removeItem('token');
          setUser(null);
          return;
        }

        setUser(data.user);
        const user = data.user;

        console.log('👤 사용자 상태:', user);

        if (!user.role) {
          navigate('/select-role');
          return;
        }

        if (user.role === 'superadmin') {
          navigate('/superadmin/school-requests');
          return;
        }

        if (user.role === 'parent') {
          navigate('/join/invite');
          return;
        }

        if (user.role === 'teacher') {
          // ✅ 전체 관리자일 경우 (created_by는 admin 페이지에서 판단)
          if (user.is_admin && user.school_id) {
            try {
              const res = await fetch('http://localhost:3001/api/classrooms/my-classroom', {
                headers: { Authorization: `Bearer ${token}` },
              });

              if (res.ok) {
                const result = await res.json();
                navigate(`/classroom/dashboard?classroom_id=${result.classroom.classroom_id}`);
              } else {
                navigate('/classroom/create');
              }
              return;
            } catch (e) {
              console.warn('학급 조회 실패:', e);
              navigate('/classroom/create');
              return;
            }
          }

          // ✅ 인증도 안 된 교사 → 요청 여부 확인
          try {
            const requestRes = await fetch('http://localhost:3001/api/schools/school-requests/my', {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (requestRes.ok) {
              navigate('/school/pending');
              return;
            }
          } catch (e) {
            console.warn('학교 요청 확인 실패:', e);
          }

          // 인증도, 요청도 없음
          navigate('/teacher/auth');
          return;
        }

        if (user.role === 'admin' && user.is_admin) {
          const schoolRes = await fetch('http://localhost:3001/api/schools/created-by/me', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (schoolRes.ok) {
            navigate('/admindashboard');
          } else {
            const requestRes = await fetch('http://localhost:3001/api/schools/school-requests/my', {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (requestRes.ok) {
              navigate('/school/pending');
            } else {
              navigate('/admin/request-school');
            }
          }
          return;
        }

        navigate('/main');
      } catch (err) {
        console.error('🔥 사용자 정보 확인 실패:', err);
        localStorage.removeItem('token');
        setUser(null);
      }
    };

    fetchUserAndRedirect();
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
