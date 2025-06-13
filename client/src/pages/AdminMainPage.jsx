import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function AdminMainPage() {
  const { user } = useContext(AuthContext);
  const [schoolName, setSchoolName] = useState('');
  const [schoolClassrooms, setSchoolClassrooms] = useState([]);
  const [schoolPosts, setSchoolPosts] = useState([]);
  const [schoolSchedules, setSchoolSchedules] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [user?.school_id]);

  const fetchData = async () => {
    if (!user?.school_id || !token) return;

    setLoading(true);
    try {
      // 학교 정보 조회
      const schoolRes = await fetch(`http://localhost:3001/api/schools/${user.school_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (schoolRes.ok) {
        const schoolData = await schoolRes.json();
        setSchoolName(schoolData.name || '학교');
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
      const postsRes = await fetch(`http://localhost:3001/api/posts?school_id=${user.school_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setSchoolPosts(postsData.posts || []);
      }

      // 학교 일정 조회
      const schedulesRes = await fetch(`http://localhost:3001/api/schedules?school_id=${user.school_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchoolSchedules(schedulesData.schedules || []);
        
        // 오늘 일정 필터링
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const filtered = (schedulesData.schedules || []).filter(e => e.start <= todayStr && e.end >= todayStr);
        setTodayEvents(filtered);
      }

    } catch (err) {
      console.error('데이터 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-text">데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-main-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>🏫 {schoolName} 관리자</h1>
          <p>안녕하세요, {user?.name}님! 학교 전체를 관리하는 중앙 허브입니다.</p>
        </div>

        {/* 통계 카드 */}
        <div className="stats-section">
          <h2>📊 현황</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🏫</div>
              <div className="stat-number">{schoolClassrooms.length}</div>
              <div className="stat-label">학급 수</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👨‍🏫</div>
              <div className="stat-number">{schoolClassrooms.filter(c => c.teacher_name).length}</div>
              <div className="stat-label">담임교사</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📢</div>
              <div className="stat-number">{schoolPosts.length}</div>
              <div className="stat-label">학교 공지</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-number">{todayEvents.length}</div>
              <div className="stat-label">오늘 일정</div>
            </div>
          </div>
        </div>

        <div className="content-grid">
          {/* 왼쪽 섹션 */}
          <div className="left-section">
            {/* 최근 공지사항 */}
            <div className="section">
              <div className="section-header">
                <h3>📢 최근 학교 공지</h3>
                <Link 
                  to={`/posts?school_id=${user.school_id}`}
                  className="view-all-btn"
                >
                  전체보기
                </Link>
              </div>
              
              {schoolPosts.length === 0 ? (
                <div className="empty-state">
                  <p>등록된 공지사항이 없습니다</p>
                </div>
              ) : (
                <div className="posts-list">
                  {schoolPosts.slice(0, 5).map((post) => (
                    <div key={post.post_id} className="post-item">
                      <Link to={`/posts/${post.post_id}`} className="post-link">
                        <h4 className="post-title">{post.title}</h4>
                        <div className="post-meta">
                          <span>{post.author_name}</span>
                          <span>•</span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 학급 목록 */}
            <div className="section">
              <div className="section-header">
                <h3>🏫 학급 현황</h3>
                <Link 
                  to={`/admindashboard?tab=classrooms&school_id=${user.school_id}`}
                  className="view-all-btn"
                >
                  관리하기
                </Link>
              </div>
              
              {schoolClassrooms.length === 0 ? (
                <div className="empty-state">
                  <p>등록된 학급이 없습니다</p>
                </div>
              ) : (
                <div className="classrooms-grid">
                  {schoolClassrooms.map((classroom) => (
                    <div key={classroom.classroom_id} className="classroom-card">
                      <div className="classroom-info">
                        <h4>{classroom.grade}학년 {classroom.class_number}반</h4>
                        <p>담임: {classroom.teacher_name || '미배정'}</p>
                        <p>학부모: {classroom.student_count || 0}명</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽 섹션 */}
          <div className="right-section">
            {/* 오늘 일정 */}
            <div className="section">
              <div className="section-header">
                <h3>📅 오늘 일정</h3>
                <Link 
                  to={`/schedules?school_id=${user.school_id}`}
                  className="view-all-btn"
                >
                  일정 관리
                </Link>
              </div>
              
              {todayEvents.length === 0 ? (
                <div className="empty-state">
                  <p>오늘 일정이 없습니다</p>
                </div>
              ) : (
                <div className="events-list">
                  {todayEvents.map((event) => (
                    <div key={event.schedule_id} className="event-item">
                      <div className="event-info">
                        <h4>{event.title}</h4>
                        <p>{event.description}</p>
                        <span className="event-date">
                          {event.start === event.end 
                            ? new Date(event.start).toLocaleDateString()
                            : `${new Date(event.start).toLocaleDateString()} ~ ${new Date(event.end).toLocaleDateString()}`
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 빠른 링크 */}
            <div className="section">
              <h3>🔗 빠른 이동</h3>
              <div className="quick-links">
                <Link 
                  to={`/admindashboard?tab=teachers&school_id=${user.school_id}`}
                  className="quick-link"
                >
                  <span className="link-icon">👨‍🏫</span>
                  <span>교사 관리</span>
                </Link>
                <Link 
                  to={`/admindashboard?tab=codes&school_id=${user.school_id}`}
                  className="quick-link"
                >
                  <span className="link-icon">🔑</span>
                  <span>인증코드</span>
                </Link>
                <Link 
                  to="/inquiry/form"
                  className="quick-link"
                >
                  <span className="link-icon">📞</span>
                  <span>문의하기</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-main-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 1.2rem;
        }

        /* 헤더 */
        .header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 2rem;
        }

        .header p {
          margin: 0;
          color: #64748b;
          font-size: 1.1rem;
        }

        /* 통계 섹션 */
        .stats-section {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .stats-section h2 {
          margin: 0 0 1.5rem 0;
          color: #1e293b;
          font-size: 1.3rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background: #f8fafc;
          padding: 1.5rem 1rem;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .stat-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #4f46e5;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        /* 콘텐츠 그리드 */
        .content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        .left-section,
        .right-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* 섹션 */
        .section {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .section h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
          font-size: 1.1rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-header h3 {
          margin: 0;
        }

        .view-all-btn {
          padding: 0.5rem 1rem;
          background: #4f46e5;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .view-all-btn:hover {
          background: #3730a3;
        }

        /* 게시글 목록 */
        .posts-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .post-item {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.75rem;
        }

        .post-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .post-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }

        .post-link:hover .post-title {
          color: #4f46e5;
        }

        .post-title {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          transition: color 0.2s ease;
        }

        .post-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #64748b;
        }

        /* 학급 그리드 */
        .classrooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .classroom-card {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .classroom-info h4 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1rem;
        }

        .classroom-info p {
          margin: 0 0 0.25rem 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        /* 일정 목록 */
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .event-item {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .event-info h4 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1rem;
        }

        .event-info p {
          margin: 0 0 0.5rem 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        .event-date {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        /* 빠른 링크 */
        .quick-links {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 1rem;
        }

        .quick-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #f8fafc;
          color: #1e293b;
          text-decoration: none;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .quick-link:hover {
          background: #4f46e5;
          color: white;
          transform: translateY(-2px);
        }

        .link-icon {
          font-size: 1.5rem;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 2rem 1rem;
          color: #64748b;
        }

        .empty-state p {
          margin: 0;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .classrooms-grid {
            grid-template-columns: 1fr;
          }

          .quick-links {
            grid-template-columns: repeat(3, 1fr);
          }

          .header h1 {
            font-size: 1.5rem;
          }

          .header p {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .quick-links {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminMainPage;