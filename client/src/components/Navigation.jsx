import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function Navigation() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav style={{ padding: '1rem', borderBottom: '1px solid gray' }}>
      {user ? (
        <>
          <Link to="/classroom" style={{ marginRight: '1rem' }}>학급 관리</Link>
          <Link to="/posts" style={{ marginRight: '1rem' }}>게시판</Link>
          <Link to="/schedules" style={{ marginRight: '1rem' }}>일정</Link>
          <button onClick={logout} style={{ marginLeft: '2rem' }}>로그아웃</button>
        </>
      ) : (
        <>
          <Link to="/" style={{ marginRight: '1rem' }}>로그인</Link>
          <Link to="/signup" style={{ marginRight: '1rem' }}>회원가입</Link>
        </>
      )}
    </nav>
  );
}

export default Navigation;
