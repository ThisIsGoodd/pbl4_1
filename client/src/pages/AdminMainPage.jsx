import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function AdminMainPage() {
  const { user } = useContext(AuthContext);
  const [schoolClassrooms, setSchoolClassrooms] = useState([]);
  const [schoolPosts, setSchoolPosts] = useState([]);
  const [schoolSchedules, setSchoolSchedules] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const token = localStorage.getItem('token');

  // 반응형 처리
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

  useEffect(() => {
    if (!user || !token || !user.school_id) return;
    
    fetchSchoolData();
  }, [user, token]);

  const fetchSchoolData = async () => {
    try {
      // 학교 이름 가져오기
      if (user.school_id) {
        const schoolRes = await fetch(`http://localhost:3001/api/schools/${user.school_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (schoolRes.ok) {
          const schoolData = await schoolRes.json();
          setSchoolName(schoolData.name || '학교');
        }
      }

      // 학급 목록 조회
      const classroomsRes = await fetch(`http://localhost:3001/api/admin/classrooms?school_id=${user.school_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (classroomsRes.ok) {
        const classroomsData = await classroomsRes.json();
        setSchoolClassrooms(classroomsData.classrooms || []);
      }

      // 학교 전체 공지사항 조회 
      const postsRes = await fetch(`http://localhost:3001/api/posts/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setSchoolPosts(postsData.posts || []);
      }

      // 학교 전체 일정 조회
      const schedulesRes = await fetch(`http://localhost:3001/api/schedules/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchoolSchedules(schedulesData.schedules || []);
        
        // 오늘 일정 필터링
        const today = new Date().toISOString().split('T')[0];
        const filtered = schedulesData.schedules.filter(e => e.start <= today && e.end >= today);
        setTodayEvents(filtered);
      }

    } catch (err) {
      console.error('🔥 관리자 메인 데이터 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>학교 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{
      ...styles.container,
      padding: isMobile ? '1rem' : '2rem'
    }}>
      <h2 style={styles.title}>
        🏫 {schoolName}
      </h2>

      <div style={styles.layout}>
        {/* 🖼️ 왼쪽: 학급별 단체사진 갤러리 */}
        <div style={styles.leftSection}>
          <div style={styles.photoGallery}>
            <h3 style={styles.sectionTitle}>📸 학급별 사진</h3>
            {schoolClassrooms.length === 0 ? (
              <div style={styles.emptyMessage}>
                <p>등록된 학급이 없습니다.</p>
              </div>
            ) : (
              <div style={styles.photoGrid}>
                {schoolClassrooms.map(classroom => (
                  <div key={classroom.classroom_id} style={styles.photoCard}>
                    <div style={styles.photoFrame}>
                      {classroom.class_photo ? (
                        <img
                          src={`http://localhost:3001${classroom.class_photo}`}
                          alt={`${classroom.grade}학년 ${classroom.class_number}반`}
                          style={styles.photo}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{
                        ...styles.photoPlaceholder,
                        display: classroom.class_photo ? 'none' : 'flex'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                        <div style={{ fontSize: '0.9rem' }}>사진 없음</div>
                      </div>
                    </div>
                    <div style={styles.classInfo}>
                      <strong>{classroom.grade}학년 {classroom.class_number}반</strong>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        담임: {classroom.teacher_name || '미배정'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        학부모: {classroom.parent_count || 0}명
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 📌 학교 전체 공지사항 */}
          <div style={styles.noticeSection}>
            <h3 style={styles.sectionTitle}>📌 학교 전체 공지사항</h3>
            {schoolPosts.length === 0 ? (
              <p style={styles.emptyText}>학교 전체 공지사항이 없습니다.</p>
            ) : (
              <ul style={styles.postList}>
                {schoolPosts.slice(0, 5).map(post => (
                  <li key={post.post_id} style={styles.postItem}>
                    <Link 
                      to={`/posts/${post.post_id}`}
                      style={styles.postLink}
                    >
                      <span style={styles.postTitle}>{post.title}</span>
                      <span style={styles.postDate}>
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: '1rem' }}>
              {/* 🔥 수정: 버튼 텍스트를 명확하게 변경 */}
              <Link 
                to={`/posts/write?school_id=${user.school_id}`} 
                style={{
                  ...styles.writeButton,
                  backgroundColor: '#28a745', // 녹색으로 변경하여 학교 전체 공지임을 강조
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                🏫 학교 전체 공지 작성
              </Link>
            </div>
          </div>
        </div>

        {/* 📅 오른쪽: 일정 관리 */}
        <div style={styles.rightSection}>
          <div style={styles.scheduleSection}>
            <h3 style={styles.sectionTitle}>🗓️ 오늘의 학교 일정</h3>
            {todayEvents.length === 0 ? (
              <p style={styles.emptyText}>오늘 일정이 없습니다.</p>
            ) : (
              <ul style={styles.eventList}>
                {todayEvents.map(event => (
                  <li key={event.schedule_id} style={styles.eventItem}>
                    <div style={styles.eventTitle}>{event.title}</div>
                    <div style={styles.eventDesc}>{event.description}</div>
                    <div style={styles.eventDate}>
                      {event.start} ~ {event.end}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            <div style={{ marginTop: '1.5rem' }}>
              <Link to={`/schedules?school_id=${user.school_id}`} style={styles.scheduleButton}>
                📅 전체 일정 관리
              </Link>
            </div>
          </div>

          {/* 📊 학교 통계 */}
          <div style={styles.statsSection}>
            <h3 style={styles.sectionTitle}>📊 학교 현황</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{schoolClassrooms.length}</div>
                <div style={styles.statLabel}>총 학급 수</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>
                  {schoolClassrooms.reduce((sum, c) => sum + (c.parent_count || 0), 0)}
                </div>
                <div style={styles.statLabel}>총 학부모 수</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{schoolPosts.length}</div>
                <div style={styles.statLabel}>총 공지사항</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{schoolSchedules.length}</div>
                <div style={styles.statLabel}>총 일정 수</div>
              </div>
            </div>
          </div>

          {/* 🔗 빠른 링크 */}
          <div style={styles.quickLinks}>
            <h3 style={styles.sectionTitle}>🔗 빠른 이동</h3>
            <div style={styles.linkGrid}>
              {/* 🔥 수정: 모든 관리자 대시보드 링크에 school_id 추가 */}
              <Link to={`/admindashboard?tab=teachers&school_id=${user.school_id}`} style={styles.quickLink}>
                👨‍🏫 교사 관리
              </Link>
              <Link to={`/admindashboard?tab=classrooms&school_id=${user.school_id}`} style={styles.quickLink}>
                🏫 학급 관리
              </Link>
              <Link to={`/admindashboard?tab=codes&school_id=${user.school_id}`} style={styles.quickLink}>
                🔑 인증코드
              </Link>
              <Link to="/inquiry/form" style={styles.quickLink}>
                📞 문의하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '1rem'
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f1f5f9',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  
  loadingText: {
    color: '#64748b',
    fontSize: '1rem'
  },

  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0 0 2rem 0',
    color: '#333'
  },
  layout: {
    display: 'flex',
    gap: '2rem',
    height: '85vh'
  },
  leftSection: {
    flex: 7,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  rightSection: {
    flex: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: '#333',
    borderBottom: '2px solid #007bff',
    paddingBottom: '0.5rem'
  },
  
  // 📸 사진 갤러리 스타일
  photoGallery: {
    flex: 6,
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflowY: 'auto'
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem'
  },
  photoCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#fafafa'
  },
  photoFrame: {
    height: '150px',
    position: 'relative',
    backgroundColor: '#f0f0f0'
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999'
  },
  classInfo: {
    padding: '1rem',
    textAlign: 'center'
  },

  // 📌 공지사항 스타일
  noticeSection: {
    flex: 4,
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  postList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  postItem: {
    marginBottom: '0.8rem',
    paddingBottom: '0.8rem',
    borderBottom: '1px solid #eee'
  },
  postLink: {
    textDecoration: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  postTitle: {
    color: '#333',
    fontWeight: '500'
  },
  postDate: {
    color: '#666',
    fontSize: '0.9rem'
  },
  writeButton: {
    display: 'inline-block',
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem'
  },

  // 📅 일정 스타일
  scheduleSection: {
    flex: 4,
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  eventList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  eventItem: {
    marginBottom: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    borderLeft: '4px solid #28a745'
  },
  eventTitle: {
    fontWeight: 'bold',
    marginBottom: '0.5rem'
  },
  eventDesc: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '0.5rem'
  },
  eventDate: {
    color: '#999',
    fontSize: '0.8rem'
  },
  scheduleButton: {
    display: 'inline-block',
    padding: '0.5rem 1rem',
    backgroundColor: '#28a745',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem'
  },

  // 📊 통계 스타일
  statsSection: {
    flex: 3,
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  statCard: {
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#007bff'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '0.5rem'
  },

  // 🔗 빠른 링크 스타일
  quickLinks: {
    flex: 3,
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  linkGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.8rem'
  },
  quickLink: {
    display: 'block',
    padding: '0.8rem',
    backgroundColor: '#f8f9fa',
    color: '#333',
    textDecoration: 'none',
    borderRadius: '6px',
    textAlign: 'center',
    fontSize: '0.9rem',
    border: '1px solid #e0e0e0',
    transition: 'all 0.2s'
  },

  emptyMessage: {
    textAlign: 'center',
    color: '#999',
    padding: '2rem'
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic'
  }
};

export default AdminMainPage;