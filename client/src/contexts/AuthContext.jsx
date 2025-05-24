import { createContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();
  const location = useLocation();

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
        console.log('🌍 현재 경로:', location.pathname);

        // 🆕 현재 페이지가 특정 페이지들이면 리다이렉트 하지 않음
        const protectedPaths = [
          '/posts', '/schedules', '/chat', '/settings', '/notifications',
          '/posts/', '/main', '/classroom/dashboard', '/admindashboard'
        ];
        
        const isOnProtectedPath = protectedPaths.some(path => 
          location.pathname.startsWith(path)
        );

        // 현재 페이지가 보호된 페이지라면 리다이렉트 하지 않음
        if (isOnProtectedPath) {
          console.log('🔒 보호된 페이지에서 새로고침 - 현재 페이지 유지');
          return;
        }

        // 역할이 없으면 역할 선택 페이지로
        if (!user.role) {
          navigate('/select-role');
          return;
        }

        // SuperAdmin
        if (user.role === 'superadmin') {
          navigate('/superadmin/school-requests');
          return;
        }

        // 학부모
        if (user.role === 'parent') {
          // 🆕 현재 URL에 classroom_id가 있으면 해당 페이지 유지
          const urlParams = new URLSearchParams(location.search);
          const currentClassroomId = urlParams.get('classroom_id');
          
          if (currentClassroomId) {
            console.log('📍 URL에 classroom_id 있음 - 현재 페이지 유지');
            return;
          }

          // 가입된 학급이 있으면 첫 번째 학급으로 이동
          if (user.joined_classrooms?.length > 0) {
            const firstClassroom = user.joined_classrooms[0];
            navigate(`/main?classroom_id=${firstClassroom.classroom_id}`);
          } else {
            navigate('/join/invite');
          }
          return;
        }

        // 교사
        if (user.role === 'teacher') {
          // 🆕 현재 URL에 classroom_id가 있으면 해당 페이지 유지
          const urlParams = new URLSearchParams(location.search);
          const currentClassroomId = urlParams.get('classroom_id');
          
          if (currentClassroomId) {
            console.log('📍 교사 - URL에 classroom_id 있음 - 현재 페이지 유지');
            return;
          }

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

        // 기타 역할
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
  }, []); // location.pathname 의존성 제거

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