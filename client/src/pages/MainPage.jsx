import { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function MainPage() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [classroomId, setClassroomId] = useState(null);
  const [classroomInfo, setClassroomInfo] = useState(null); // ✅ 추가
  const [posts, setPosts] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const id = searchParams.get('classroom_id');
    if (id) {
      setClassroomId(id);
    } else {
      alert('학급 정보가 없습니다. 다시 로그인해주세요.');
      navigate('/join/invite');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!classroomId) return;
    const token = localStorage.getItem('token');

    // ✅ 학급 정보 가져오기
    fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setClassroomInfo(data);
      })
      .catch(err => {
        console.error('학급 정보 불러오기 실패:', err);
      });
  }, [classroomId]);

  useEffect(() => {
    if (!user || !classroomId) return;
    const token = localStorage.getItem('token');

    // ✅ 공지사항 요청
    fetch(`http://localhost:3001/api/posts?classroom_id=${classroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.posts) {
          const filtered = data.posts.filter(p => !p.school_wide).slice(0, 5);
          setPosts(filtered);
        }
      });

    // ✅ 일정 요청
    fetch(`http://localhost:3001/api/schedules?classroom_id=${classroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.schedules) {
          const today = new Date().toISOString().split('T')[0];
          const filtered = data.schedules.filter(e => e.start <= today && e.end >= today);
          setTodayEvents(filtered);
        }
      });
  }, [user, classroomId]);

  if (user === undefined) return null;

  return (
    <div style={styles.wrapper}>
      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', margin: '2rem 0' }}>
        {classroomInfo
          ? `${classroomInfo.school} - ${classroomInfo.grade}학년 ${classroomInfo.class_number}반`
          : '학급 정보 불러오는 중...'}
      </h2>

      <div style={styles.layout}>
        {/* 왼쪽 영역 */}
        <div style={styles.left}>
          <div style={styles.photoBox}>
            <img
              src="/class_photo.jpg"
              alt="단체사진"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<div style="text-align:center;color:#777;">단체 사진 없음</div>';
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={styles.noticeBox}>
            <h3>📌 최근 공지사항</h3>
            <ul>
              {posts.length === 0 ? (
                <li>공지사항 없음</li>
              ) : (
                posts.map(p => (
                  <li key={p.post_id} style={{ marginBottom: '0.5rem' }}>
                    <Link 
                      to={`/posts/${p.post_id}?classroom_id=${classroomId}`}
                      style={{ textDecoration: 'none', color: '#0066cc' }}
                    >
                      {p.title}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* 오른쪽 영역 */}
        <div style={styles.right}>
          <h3>🗓️ 오늘 일정</h3>
          {todayEvents.length === 0 ? (
            <p>오늘 일정 없음</p>
          ) : (
            <ul>
              {todayEvents.map(ev => (
                <li key={ev.schedule_id}>
                  <strong>{ev.title}</strong><br />
                  {ev.description}
                </li>
              ))}
            </ul>
          )}
          <br />
          <button onClick={() => navigate(`/schedules?classroom_id=${classroomId}`)}>
            전체 캘린더 보기
          </button>
          <hr style={{ margin: '2rem 0' }} />
          <h3>📅 달력 (예시 캘린더 자리)</h3>
          <div style={styles.calendarPlaceholder}>
            <p style={{ textAlign: 'center', color: '#999' }}>[여기에 달력이 표시됩니다]</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: '2rem',
    width: '100%'
  },
  layout: {
    display: 'flex',
    gap: '2rem',
    marginTop: '2rem',
    height: '80vh'
  },
  left: {
    flex: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  photoBox: {
    flex: 4,
    border: '1px solid #ccc',
    backgroundColor: '#f8f8f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noticeBox: {
    flex: 4,
    border: '1px solid #ccc',
    padding: '1rem',
    backgroundColor: '#fff',
    overflowY: 'auto'
  },
  right: {
    flex: 4,
    border: '1px solid #ccc',
    padding: '1rem',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  calendarPlaceholder: {
    flex: 1,
    border: '1px dashed #ccc',
    backgroundColor: '#fafafa',
    padding: '2rem',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

export default MainPage;
