import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function Navigation() {
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [teacherClassroomId, setTeacherClassroomId] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 🆕 모바일 메뉴 상태
  const [isMobile, setIsMobile] = useState(false); // 🆕 모바일 여부
  
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const isSuperAdmin = user?.role === 'superadmin';
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';
  const isJoinedClass = user?.joined_classrooms?.length > 0;
  const isJoinPage = location.pathname.startsWith('/join/invite');
  const isAdminCreator = Boolean(user?.is_admin && isCreator);

  const urlParams = new URLSearchParams(location.search);
  const currentClassroomId = urlParams.get('classroom_id');
  const classroomId = currentClassroomId || user?.joined_classrooms?.[0]?.classroom_id;

  // 🆕 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false); // 데스크톱으로 변경 시 메뉴 닫기
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 기존 useEffect들...
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

    if (user.role === 'teacher') {
      fetch('http://localhost:3001/api/classrooms/my-classroom', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          return null;
        })
        .then(data => {
          if (data?.classroom?.classroom_id) {
            setTeacherClassroomId(data.classroom.classroom_id);
          }
        })
        .catch(err => {
          console.log('❌ [Navigation] 교사 학급 조회 실패:', err);
        });
    }
  }, [user]);

  useEffect(() => {
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
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, token, isSuperAdmin, isJoinPage, isJoinedClass, teacherClassroomId]);

  if (!user) return null;

  const handleLogoClick = async () => {
    setIsMobileMenuOpen(false); // 메뉴 닫기
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
        
        if (res.ok) {
          const data = await res.json();
          navigate(`/main?classroom_id=${data.classroom.classroom_id}`);
        } else if (res.status === 404) {
          navigate('/classroom/create');
        } else {
          navigate('/classroom/create');
        }
      } catch (err) {
        navigate('/classroom/create');
      }
      return;
    }

    navigate(`/main?classroom_id=${classroomId}`);
  };

  // 🆕 메뉴 항목들을 컴포넌트로 분리
  const MenuItems = ({ isMobile = false }) => {
    const linkStyle = isMobile ? styles.mobileLink : styles.link;
    
    return (
      <>
        {/* 슈퍼관리자 메뉴 */}
        {isSuperAdmin && (
          <>
            <Link to="/superadmin/school-requests" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>학교 요청</Link>
            <Link to="/superadmin/schools" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>학교 목록</Link>
            <Link to="/superadmin/inquiries" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>문의사항 관리</Link>
          </>
        )}

        {/* 학교 전체 관리자 메뉴 */}
        {!isSuperAdmin && isAdminCreator && (
          <>
            <Link to="/admin/main" style={styles.link}>메인</Link>
            <Link to={`/posts?school_id=${user.school_id}`} style={styles.link}>학교 공지</Link>
            <Link to={`/schedules?school_id=${user.school_id}`} style={styles.link}>학교 일정</Link>
            <Link to="/admindashboard?tab=codes" style={styles.link}>관리</Link>
            <Link to="/inquiry/form" style={styles.link}>문의하기</Link>
          </>
        )}

        {/* 일반 교사 메뉴 (학급 생성자) */}
        {!isSuperAdmin && !isAdminCreator && isTeacher && teacherClassroomId && (
          <>
            <Link to={`/classroom/dashboard?classroom_id=${teacherClassroomId}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>학급 관리</Link>
            <Link to={`/posts?classroom_id=${teacherClassroomId}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>게시판</Link>
            <Link to={`/schedules?classroom_id=${teacherClassroomId}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>일정</Link>
            <Link to={`/chat?classroom_id=${teacherClassroomId}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>채팅</Link>
            <Link to={`/settings?classroom_id=${teacherClassroomId}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>마이페이지</Link>
            <Link to="/inquiry/form" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>문의하기</Link>
          </>
        )}

        {/* 일반 교사 메뉴 (학급 미생성) */}
        {!isSuperAdmin && !isAdminCreator && isTeacher && !teacherClassroomId && (
          <>
            <Link to="/classroom/create" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>학급 생성</Link>
            <Link to="/inquiry/form" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>문의하기</Link>
          </>
        )}

        {/* 일반 사용자(학부모) 메뉴 (학급 있음) */}
        {!isSuperAdmin && !isAdminCreator && !isTeacher && isJoinedClass && (
          <>
            <Link to={`/posts?classroom_id=${classroomId}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>게시판</Link>
            <Link to={`/schedules?classroom_id=${classroomId}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>일정</Link>
            <Link to={`/chat?classroom_id=${classroomId}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>채팅</Link>
            <Link to={`/settings?classroom_id=${classroomId}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>마이페이지</Link>
            <Link to="/inquiry/form" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>문의하기</Link>
          </>
        )}

        {/* 학급 미가입 사용자도 문의 가능 */}
        {!isSuperAdmin && !isAdminCreator && !isTeacher && !isJoinedClass && !isJoinPage && (
          <Link to="/inquiry/form" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>문의하기</Link>
        )}
      </>
    );
  };

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.leftSection}>
          <div onClick={handleLogoClick} style={styles.logo}>
            <img src="/assets/logo.png" alt="로고" style={{ height: '50px' }} />
            <span style={styles.logoText}>CLASSFEED</span>
          </div>

          {/* 🆕 데스크톱 메뉴 */}
          {!isMobile && (
            <div style={styles.desktopMenu}>
              <MenuItems />
            </div>
          )}
        </div>

        <div style={styles.rightSection}>
          {/* 알림 및 검색 (데스크톱) */}
          {!isMobile && !isSuperAdmin && !isAdminCreator && (
            (isTeacher && teacherClassroomId) || (!isTeacher && isJoinedClass)
          ) && !isJoinPage && (
            <>
              <Link 
                to={`/notifications?classroom_id=${teacherClassroomId || classroomId}`} 
                style={{ ...styles.link, position: 'relative' }}
              >
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
                    const targetClassroomId = teacherClassroomId || classroomId;
                    navigate(`/posts?search=${encodeURIComponent(searchKeyword.trim())}&classroom_id=${targetClassroomId}`);
                    setSearchKeyword('');
                  }
                }}
                style={styles.searchInput}
              />
            </>
          )}

          {/* 🆕 햄버거 메뉴 버튼 (모바일) */}
          {isMobile && (
            <button
              style={styles.hamburger}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div style={{...styles.hamburgerLine, transform: isMobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'}}></div>
              <div style={{...styles.hamburgerLine, opacity: isMobileMenuOpen ? '0' : '1'}}></div>
              <div style={{...styles.hamburgerLine, transform: isMobileMenuOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none'}}></div>
            </button>
          )}

          {/* 로그아웃 버튼 (데스크톱) */}
          {!isMobile && (
            <button onClick={logout} style={styles.logoutBtn}>로그아웃</button>
          )}
        </div>
      </nav>

      {/* 🆕 모바일 메뉴 오버레이 */}
      {isMobile && isMobileMenuOpen && (
        <div style={styles.mobileMenuOverlay}>
          <div style={styles.mobileMenu}>
            <MenuItems isMobile={true} />
            
            {/* 모바일 알림 및 검색 */}
            {!isSuperAdmin && !isAdminCreator && (
              (isTeacher && teacherClassroomId) || (!isTeacher && isJoinedClass)
            ) && !isJoinPage && (
              <div style={styles.mobileUtilsSection}>
                <Link 
                  to={`/notifications?classroom_id=${teacherClassroomId || classroomId}`} 
                  style={{ ...styles.mobileLink, position: 'relative' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  🔔 알림
                  {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
                </Link>
                <input
                  type="text"
                  placeholder="공지 검색"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchKeyword.trim()) {
                      const targetClassroomId = teacherClassroomId || classroomId;
                      navigate(`/posts?search=${encodeURIComponent(searchKeyword.trim())}&classroom_id=${targetClassroomId}`);
                      setSearchKeyword('');
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  style={styles.mobileSearchInput}
                />
              </div>
            )}
            
            {/* 모바일 로그아웃 */}
            <button 
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }} 
              style={styles.mobileLogoutBtn}
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
    borderBottom: '1px solid #e9ecef',
    position: 'relative',
    zIndex: 1000
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '0.5rem'
  },
  logoText: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#2B5AA0',
    letterSpacing: '0.5px'
  },
  desktopMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  link: {
    textDecoration: 'none',
    color: '#495057',
    fontWeight: '500',
    fontSize: '0.95rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  logoutBtn: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    color: '#495057',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease'
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#dc3545',
    color: 'white',
    borderRadius: '50%',
    padding: '2px 6px',
    fontSize: '0.7rem',
    minWidth: '18px',
    textAlign: 'center'
  },
  searchInput: {
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    border: '1px solid #dee2e6',
    borderRadius: '20px',
    width: '200px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  
  // 🆕 햄버거 메뉴 스타일
  hamburger: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    width: '24px',
    height: '24px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0'
  },
  hamburgerLine: {
    width: '24px',
    height: '3px',
    backgroundColor: '#495057',
    borderRadius: '2px',
    transition: 'all 0.3s ease',
    transformOrigin: '1px'
  },
  
  // 🆕 모바일 메뉴 스타일
  mobileMenuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    display: 'flex',
    justifyContent: 'flex-end'
  },
  mobileMenu: {
    backgroundColor: '#ffffff',
    width: '280px',
    height: '100vh',
    padding: '2rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
    overflowY: 'auto'
  },
  mobileLink: {
    textDecoration: 'none',
    color: '#495057',
    fontWeight: '500',
    fontSize: '1rem',
    padding: '1rem',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
    borderBottom: '1px solid #f8f9fa'
  },
  mobileUtilsSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #dee2e6'
  },
  mobileSearchInput: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    marginTop: '0.5rem',
    outline: 'none'
  },
  mobileLogoutBtn: {
    marginTop: 'auto',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '1rem'
  }
};

export default Navigation;