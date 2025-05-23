import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function AdminMainPage() {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!user || !token) return;

    fetch('http://localhost:3001/api/posts/admin', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setPosts(data.posts || []));

    fetch('http://localhost:3001/api/schedules/admin', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const today = new Date().toISOString().split('T')[0];
        const filtered = data.schedules.filter(e => e.start <= today && e.end >= today);
        setTodayEvents(filtered);
      });
  }, [user]);

  if (!user) return null;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>{user.school_name || '학교'} 관리자 메인</h2>

      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        {/* 공지사항 */}
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem', background: '#fff' }}>
          <h3>📌 학교 공지사항</h3>
          <ul>
            {posts.length === 0 ? (
              <li>공지사항 없음</li>
            ) : (
              posts.map(p => (
                <li key={p.post_id}>
                  <a href={`/posts/${p.post_id}`}>{p.title}</a>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* 일정 */}
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem', background: '#fff' }}>
          <h3>🗓️ 오늘 일정</h3>
          {todayEvents.length === 0 ? (
            <p>오늘 일정 없음</p>
          ) : (
            <ul>
              {todayEvents.map(e => (
                <li key={e.schedule_id}>
                  <strong>{e.title}</strong><br />
                  {e.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{
        marginTop: '2rem',
        border: '1px dashed #ccc',
        background: '#fafafa',
        padding: '2rem',
        textAlign: 'center'
      }}>
        📅 추후 달력 기능 영역 (FullCalendar 등)
      </div>
    </div>
  );
}

export default AdminMainPage;
