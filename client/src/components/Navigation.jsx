import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function Navigation() {
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const isSuperAdmin = user?.role === 'superadmin';
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';
  const isJoinedClass = user?.joined_classrooms?.length > 0;
  const isJoinPage = location.pathname.startsWith('/join/invite');
  const isAdminCreator = user?.is_admin && isCreator;
  const classroomId = user?.joined_classrooms?.[0]?.classroom_id;

  // 학교 생성자인지 확인
  useEffect(() => {
    if (!user?.is_admin || !user?.school_id) return;
    fetch(`http://localhost:3001/api/schools/${user.school_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.created_by === user.user_id) {
          setIsCreator(true);
        }
      });
  }, [user]);

  // 알림 개수
  useEffect(() => {
    if (!user || !token || isSuperAdmin || isJoinPage || (!isJoinedClass && !user.is_admin)) return;
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
  }, [user]);

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
      return navigate('/admin/main');
    }

    if (isTeacher) {
      try {
        const res = await fetch('http://localhost:3001/api/classrooms/my-classroom', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          navigate(`/classroom/dashboard?classroom_id=${data.classroom.classroom_id}`);
        } else {
          navigate('/classroom/create');
        }
      } catch {
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
          </>
        )}

        {/* 학교 전체 관리자 메뉴 */}
        {!isSuperAdmin && isAdminCreator && (
          <Link to="/admindashboard?tab=codes" style={styles.link}>관리</Link>
        )}

        {/* 일반 사용자 메뉴 (학급 있음) */}
        {!isSuperAdmin && !isAdminCreator && isJoinedClass && (
          <>
            <Link to={`/posts?classroom_id=${classroomId}`} style={styles.link}>게시판</Link>
            <Link to={`/schedules?classroom_id=${classroomId}`} style={styles.link}>일정</Link>
            {isParent || isTeacher ? (
              <Link to={`/chat?classroom_id=${classroomId}`} style={styles.link}>채팅</Link>
            ) : null}
            <Link to={`/settings?classroom_id=${classroomId}`} style={styles.link}>마이페이지</Link>
          </>
        )}
      </div>

      <div style={styles.rightSection}>
        {!isSuperAdmin && !isAdminCreator && isJoinedClass && !isJoinPage && (
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
