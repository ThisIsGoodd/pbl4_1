import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function Navigation() {
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [teacherClassroomId, setTeacherClassroomId] = useState(null); // 🆕 교사 학급 ID
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const isSuperAdmin = user?.role === 'superadmin';
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';
  const isJoinedClass = user?.joined_classrooms?.length > 0;
  const isJoinPage = location.pathname.startsWith('/join/invite');
  const isAdminCreator = Boolean(user?.is_admin && isCreator);
  const classroomId = user?.joined_classrooms?.[0]?.classroom_id;

  // 학교 생성자인지 확인 + 교사 학급 확인
  useEffect(() => {
    if (!user?.is_admin || !user?.school_id) return;
    
    // 학교 생성자 확인
    fetch(`http://localhost:3001/api/schools/${user.school_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.created_by === user.user_id) {
          setIsCreator(true);
        }
      });

    // 교사인 경우 학급 ID 확인
    if (user.role === 'teacher') {
      fetch('http://localhost:3001/api/classrooms/my-classroom', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          console.log('🔍 [Navigation] 교사 학급 조회 응답:', res.status);
          if (res.ok) {
            return res.json();
          }
          return null;
        })
        .then(data => {
          console.log('🔍 [Navigation] 교사 학급 데이터:', data);
          if (data?.classroom?.classroom_id) {
            setTeacherClassroomId(data.classroom.classroom_id);
            console.log('✅ [Navigation] 교사 학급 ID 설정:', data.classroom.classroom_id);
          }
        })
        .catch(err => {
          console.log('❌ [Navigation] 교사 학급 조회 실패:', err);
        });
    }
  }, [user]);

  // 알림 개수 (실시간 갱신)
  useEffect(() => {
    // 알림을 조회할 조건 확인
    const shouldFetchNotifications = user && token && !isSuperAdmin && !isJoinPage && 
      (isJoinedClass || (isTeacher && teacherClassroomId));

    if (!shouldFetchNotifications) return;
    
    const fetchNotifications = () => {
      fetch('http://localhost:3001/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.notifications) {
            const unread = data.notifications.filter(n => !n.is_read).length;
            setUnreadCount(unread);
          }
        })
        .catch(err => {
          console.error('🔔 알림 실패:', err);
        });
    };

    fetchNotifications();
    
    // 30초마다 알림 갱신
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, token, isSuperAdmin, isJoinPage, isJoinedClass, teacherClassroomId]);

  if (!user) return null;

  const handleLogoClick = async () => {
    if (!user || !token) return navigate('/');

    if (isSuperAdmin) return navigate('/superadmin/school-requests');

    if (isParent) {
      if (isJoinedClass) {
        return navigate(`/main?classroom_id=${classroomId}`);
      }
      return navigate('/join/invite');
    }

    if (isTeacher && isAdminCreator) {
      return navigate('/admindashboard');
    }

    if (isTeacher) {
      // 교사도 메인 페이지로 이동하도록 수정
      try {
        console.log('🔍 [Navigation] 교사 메인 페이지로 이동');
        
        const res = await fetch('http://localhost:3001/api/classrooms/my-classroom', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ [Navigation] 교사 메인 페이지 이동:', data.classroom.classroom_id);
          // 학급 대시보드 대신 메인 페이지로 이동
          navigate(`/main?classroom_id=${data.classroom.classroom_id}`);
        } else if (res.status === 404) {
          console.log('❌ [Navigation] 404 - 학급이 없음, 생성 페이지로 이동');
          navigate('/classroom/create');
        } else {
          const errorData = await res.text();
          console.error('❌ [Navigation] API 오류:', res.status, errorData);
          navigate('/classroom/create');
        }
      } catch (err) {
        console.error('❌ [Navigation] 네트워크 오류:', err);
        navigate('/classroom/create');
      }
      return;
    }

    navigate(`/main?classroom_id=${classroomId}`);
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.leftSection}>
        <div onClick={handleLogoClick} style={styles.logo}>
          <img src="/assets/logo.png" alt="로고" style={{ height: '80px' }} />
        </div>

        {/* 슈퍼관리자 메뉴 */}
        {isSuperAdmin && (
          <>
            <Link to="/superadmin/school-requests" style={styles.link}>학교 요청</Link>
            <Link to="/superadmin/schools" style={styles.link}>학교 목록</Link>
            <Link to="/superadmin/inquiries" style={styles.link}>문의사항 관리</Link>
          </>
        )}

        {/* 학교 전체 관리자 메뉴 */}
        {!isSuperAdmin && isAdminCreator && (
          <>
            <Link to="/admindashboard?tab=codes" style={styles.link}>관리</Link>
            <Link to="/inquiry/form" style={styles.link}>문의하기</Link>
          </>
        )}

        {/* 일반 교사 메뉴 (학급 생성자) */}
        {!isSuperAdmin && !isAdminCreator && isTeacher && teacherClassroomId && (
          <>
            <Link to={`/classroom/dashboard?classroom_id=${teacherClassroomId}`} style={styles.link}>학급 관리</Link>
            <Link to={`/posts?classroom_id=${teacherClassroomId}`} style={styles.link}>게시판</Link>
            <Link to={`/schedules?classroom_id=${teacherClassroomId}`} style={styles.link}>일정</Link>
            <Link to={`/chat?classroom_id=${teacherClassroomId}`} style={styles.link}>채팅</Link>
            <Link to={`/settings?classroom_id=${teacherClassroomId}`} style={styles.link}>마이페이지</Link>
            <Link to="/inquiry/form" style={styles.link}>문의하기</Link>
          </>
        )}

        {/* 일반 교사 메뉴 (학급 미생성) */}
        {!isSuperAdmin && !isAdminCreator && isTeacher && !teacherClassroomId && (
          <>
            <Link to="/classroom/create" style={styles.link}>학급 생성</Link>
            <Link to="/inquiry/form" style={styles.link}>문의하기</Link>
          </>
        )}

        {/* 일반 사용자 메뉴 (학급 있음) */}
        {!isSuperAdmin && !isAdminCreator && !isTeacher && isJoinedClass && (
          <>
            <Link to={`/posts?classroom_id=${classroomId}`} style={styles.link}>게시판</Link>
            <Link to={`/schedules?classroom_id=${classroomId}`} style={styles.link}>일정</Link>
            {(isParent || isTeacher) && (
              <Link to={`/chat?classroom_id=${classroomId}`} style={styles.link}>채팅</Link>
            )}
            <Link to={`/settings?classroom_id=${classroomId}`} style={styles.link}>마이페이지</Link>
            <Link to="/inquiry/form" style={styles.link}>문의하기</Link>
          </>
        )}

        {/* 학급 미가입 사용자도 문의 가능 */}
        {!isSuperAdmin && !isAdminCreator && !isTeacher && !isJoinedClass && !isJoinPage && (
          <Link to="/inquiry/form" style={styles.link}>문의하기</Link>
        )}
      </div>

      <div style={styles.rightSection}>
        {/* 교사 알림 및 검색 */}
        {!isSuperAdmin && !isAdminCreator && isTeacher && teacherClassroomId && (
          <>
            <Link to={`/notifications?classroom_id=${teacherClassroomId}`} style={{ ...styles.link, position: 'relative' }}>
              🔔
              {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
            </Link>
            <input
              type="text"
              placeholder="공지 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchKeyword.trim()) {
                  navigate(`/posts?search=${encodeURIComponent(searchKeyword.trim())}&classroom_id=${teacherClassroomId}`);
                  setSearchKeyword('');
                }
              }}
              style={styles.searchInput}
            />
          </>
        )}

        {/* 일반 사용자 알림 및 검색 */}
        {!isSuperAdmin && !isAdminCreator && !isTeacher && isJoinedClass && !isJoinPage && (
          <>
            <Link to={`/notifications?classroom_id=${classroomId}`} style={{ ...styles.link, position: 'relative' }}>
              🔔
              {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
            </Link>
            <input
              type="text"
              placeholder="공지 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchKeyword.trim()) {
                  navigate(`/posts?search=${encodeURIComponent(searchKeyword.trim())}&classroom_id=${classroomId}`);
                  setSearchKeyword('');
                }
              }}
              style={styles.searchInput}
            />
          </>
        )}
        <button onClick={logout} style={styles.logoutBtn}>로그아웃</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 3rem',
    borderBottom: '1px solid #ccc',
    backgroundColor: '#fff',
    width: '100%'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  logo: {
    cursor: 'pointer'
  },
  link: {
    textDecoration: 'none',
    color: '#333',
    fontWeight: 'bold',
    fontSize: '1rem'
  },
  logoutBtn: {
    backgroundColor: '#eee',
    border: 'none',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-10px',
    backgroundColor: 'red',
    color: 'white',
    borderRadius: '50%',
    padding: '2px 6px',
    fontSize: '0.7rem'
  },
  searchInput: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.9rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    width: '160px'
  }
};

export default Navigation;