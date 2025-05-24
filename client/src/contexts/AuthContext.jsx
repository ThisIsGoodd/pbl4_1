import { createContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();

  // ✅ 토큰 새로고침 함수
  const refreshToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const res = await fetch('http://localhost:3001/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.user) {
        setUser(data.user);
        return data.user;
      }
    } catch (err) {
      console.error('토큰 새로고침 실패:', err);
    }
    return null;
  };

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
          console.log('🔄 사용자 데이터 없음 - 토큰 제거');
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
          // ✅ 전체 관리자(학교 생성자)인지 확인
          if (user.is_admin && user.school_id) {
            try {
              // 학교 생성자인지 확인
              const schoolRes = await fetch(`http://localhost:3001/api/schools/${user.school_id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              
              if (schoolRes.ok) {
                const schoolData = await schoolRes.json();
                
                // 학교 생성자라면 관리 대시보드로
                if (schoolData.created_by === user.user_id) {
                  navigate('/admindashboard');
                  return;
                }
              }

              // 학교 생성자가 아닌 일반 교사 - 학급 확인
              const res = await fetch('http://localhost:3001/api/classrooms/my-classroom', {
                headers: { Authorization: `Bearer ${token}` },
              });

              if (res.ok) {
                const result = await res.json();
                navigate(`/classroom/dashboard?classroom_id=${result.classroom.classroom_id}`);
              } else {
                // 404 오류는 학급이 없다는 뜻이므로 학급 생성 페이지로
                if (res.status === 404) {
                  navigate('/classroom/create');
                } else {
                  console.warn('학급 조회 중 오류:', res.status);
                  navigate('/classroom/create');
                }
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
        
        // JWT 만료 등의 인증 오류 시 자동 로그아웃
        if (err.message?.includes('jwt') || err.message?.includes('token')) {
          console.log('🔄 토큰 관련 오류 - 자동 로그아웃');
        }
        
        localStorage.removeItem('token');
        setUser(null);
        navigate('/');
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
    <AuthContext.Provider value={{ user, setUser, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}