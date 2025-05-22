import { Link, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function Navigation() {
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!user || !token) return;

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
        console.error('🔔 알림 가져오기 실패:', err);
      });
  }, [user]);

  if (user === undefined || !user) return null;

  const isJoinedClass = user.joinedClassrooms && user.joinedClassrooms.length > 0;
  const isTeacher = user.role === 'teacher';
  const isSuperAdmin = user.is_admin === 1 || user.is_admin === true;

  const handleLogoClick = () => {
    navigate('/join/invite', { state: { role: user.role } });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchKeyword.trim()) {
      navigate(`/posts?search=${encodeURIComponent(searchKeyword.trim())}`);
      setSearchKeyword('');
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.leftSection}>
        <div onClick={handleLogoClick} style={styles.logo}>
          <img src="/assets/logo.png" alt="로고" style={{ height: '80px' }} />
        </div>

        {isJoinedClass && (
          <>
            <Link to="/posts" style={styles.link}>게시판</Link>
            <Link to="/schedules" style={styles.link}>일정</Link>
            <Link to="/chat" style={styles.link}>채팅</Link>
            <Link to="/settings" style={styles.link}>마이페이지</Link>
          </>
        )}
      </div>

      <div style={styles.rightSection}>
        <Link to="/notifications" style={{ ...styles.link, position: 'relative' }}>
          🔔
          {unreadCount > 0 && (
            <span style={styles.badge}>{unreadCount}</span>
          )}
        </Link>

        <input
          type="text"
          placeholder="공지 검색"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          style={styles.searchInput}
        />

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
    width: '100%' // ✅ 전체 너비 사용
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
