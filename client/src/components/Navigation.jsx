// Navigation.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function Navigation() {
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [teacherClassroomId, setTeacherClassroomId] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
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

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 학교 생성자 확인 및 선생님 학급 조회
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
  }, [user, token]);

  // 알림 개수 조회
  useEffect(() => {
    if (!user || isSuperAdmin || isAdminCreator) return;

    const targetClassroomId = teacherClassroomId || classroomId;
    if (!targetClassroomId) return;

    fetch(`http://localhost:3001/api/notifications/unread-count?classroom_id=${targetClassroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : { count: 0 })
      .then(data => setUnreadCount(data.count || 0))
      .catch(() => setUnreadCount(0));
  }, [user, teacherClassroomId, classroomId, token, isSuperAdmin, isAdminCreator]);

  const handleLogoClick = () => {
    if (isSuperAdmin) {
      navigate('/superadmin/school-requests');
    } else if (isAdminCreator) {
      navigate('/admin/main');
    } else if (isTeacher && teacherClassroomId) {
      navigate(`/main?classroom_id=${teacherClassroomId}`);
    } else if (isJoinedClass) {
      navigate(`/main?classroom_id=${classroomId}`);
    } else {
      navigate('/select-role');
    }
  };

  // 메뉴 아이템 컴포넌트
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
            <Link to="/admin/main" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>메인</Link>
            <Link to={`/posts?school_id=${user.school_id}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>학교 공지</Link>
            <Link to={`/schedules?school_id=${user.school_id}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>학교 일정</Link>
            <Link to={`/admindashboard?tab=codes&school_id=${user.school_id}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>관리</Link>
            <Link to={`/settings?school_id=${user.school_id}`} style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>마이페이지</Link>
            <Link to="/inquiry/form" style={linkStyle} onClick={() => setIsMobileMenuOpen(false)}>문의하기</Link>
          </>
        )}

        {/* 🔥 수정: 일반 교사 메뉴 (학급 생성자) - 학교에 가입된 선생님만 */}
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

        {/*일반 교사 메뉴 (학급 미생성) - 학교에 가입했지만 학급이 없는 선생님만 */}
        {!isSuperAdmin && !isAdminCreator && isTeacher && !teacherClassroomId && !user?.is_admin && (
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
      <nav style={styles.nav} className="navigation-bar">
        <div style={styles.leftSection} className="nav-left">
          <div onClick={handleLogoClick} style={styles.logo} className="logo-container">
            <img src="/assets/logo.png" alt="로고" style={{ height: '50px' }} className="logo-image" />
            <span style={styles.logoText} className="logo-text">CLASSFEED</span>
          </div>

          {/* 데스크톱 메뉴 */}
          {!isMobile && (
            <div style={styles.desktopMenu} className="desktop-menu">
              <MenuItems />
            </div>
          )}
        </div>

        <div style={styles.rightSection} className="nav-right">
          {/* 알림 및 검색 (데스크톱) */}
          {!isMobile && !isSuperAdmin && !isAdminCreator && (
            (isTeacher && teacherClassroomId) || (!isTeacher && isJoinedClass)
          ) && !isJoinPage && (
            <>
              <Link 
                to={`/notifications?classroom_id=${teacherClassroomId || classroomId}`} 
                style={{ ...styles.link, position: 'relative' }}
                className="notification-link"
              >
                🔔
                {unreadCount > 0 && <span style={styles.badge} className="notification-badge">{unreadCount}</span>}
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
                className="search-input"
              />
            </>
          )}

          {/* 햄버거 메뉴 버튼 (모바일) */}
          {isMobile && (
            <button
              style={styles.hamburger}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="hamburger-menu"
            >
              <div style={{...styles.hamburgerLine, transform: isMobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'}} className="hamburger-line"></div>
              <div style={{...styles.hamburgerLine, opacity: isMobileMenuOpen ? '0' : '1'}} className="hamburger-line"></div>
              <div style={{...styles.hamburgerLine, transform: isMobileMenuOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none'}} className="hamburger-line"></div>
            </button>
          )}

          {/* 로그아웃 버튼 (데스크톱) */}
          {!isMobile && (
            <button onClick={logout} style={styles.logoutBtn} className="logout-button">로그아웃</button>
          )}
        </div>
      </nav>

      {/* 모바일 메뉴 오버레이 */}
      {isMobile && isMobileMenuOpen && (
        <div style={styles.mobileMenuOverlay} className="mobile-menu-overlay">
          <div style={styles.mobileMenu} className="mobile-menu">
            <MenuItems isMobile={true} />
            
            {/* 모바일 알림 및 검색 */}
            {!isSuperAdmin && !isAdminCreator && (
              (isTeacher && teacherClassroomId) || (!isTeacher && isJoinedClass)
            ) && !isJoinPage && (
              <div style={styles.mobileUtilsSection} className="mobile-utils">
                <Link 
                  to={`/notifications?classroom_id=${teacherClassroomId || classroomId}`} 
                  style={{ ...styles.mobileLink, position: 'relative' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mobile-notification-link"
                >
                  🔔 알림
                  {unreadCount > 0 && <span style={styles.badge} className="notification-badge">{unreadCount}</span>}
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
                  className="mobile-search-input"
                />
              </div>
            )}
            
            {/* 모바일 로그아웃 버튼 */}
            <button 
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }} 
              style={styles.mobileLogoutBtn}
              className="mobile-logout-button"
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
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    minHeight: '70px'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    flex: 1
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer'
  },
  logoText: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#333'
  },
  desktopMenu: {
    display: 'flex',
    gap: '1.5rem'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  link: {
    textDecoration: 'none',
    color: '#333',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    cursor: 'pointer'
  },
  searchInput: {
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '200px'
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    backgroundColor: '#ff4444',
    color: 'white',
    borderRadius: '50%',
    fontSize: '0.7rem',
    padding: '2px 6px',
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // 모바일 스타일
  hamburger: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '5px'
  },
  hamburgerLine: {
    width: '25px',
    height: '3px',
    backgroundColor: '#333',
    transition: 'all 0.3s ease'
  },
  mobileMenuOverlay: {
    position: 'fixed',
    top: '70px',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200
  },
  mobileMenu: {
    backgroundColor: 'white',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderBottom: '1px solid #e0e0e0'
  },
  mobileLink: {
    textDecoration: 'none',
    color: '#333',
    padding: '1rem',
    borderBottom: '1px solid #f0f0f0',
    display: 'block'
  },
  mobileUtilsSection: {
    borderTop: '1px solid #e0e0e0',
    paddingTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  mobileSearchInput: {
    padding: '0.8rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '100%'
  },
  mobileLogoutBtn: {
    padding: '1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '1rem'
  }
};

export default Navigation;