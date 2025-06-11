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
      setLoading(true);

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
      const postsRes = await fetch(`http://localhost:3001/api/posts?school_id=${user.school_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        console.log('📝 학교 전체 공지사항 조회 결과:', postsData);
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
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">데이터를 불러오는 중...</div>

        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .loading-text {
            color: white;
            font-size: 1.1rem;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-main-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">
              🏫 {schoolName} 관리자 대시보드
            </h1>
            <p className="welcome-text">
              안녕하세요, {user?.name}님! 학교 전체를 관리하는 중앙 허브입니다.
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="main-content">
          {/* 왼쪽 섹션 */}
          <div className="left-section">
            {/* 통계 카드 */}
            <div className="stats-section">
              <h3 className="section-title">📊 학교 현황</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🏫</div>
                  <div className="stat-number">{schoolClassrooms.length}</div>
                  <div className="stat-label">전체 학급</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👨‍🏫</div>
                  <div className="stat-number">
                    {schoolClassrooms.filter(c => c.teacher_name).length}
                  </div>
                  <div className="stat-label">담임 교사</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👨‍👩‍👧‍👦</div>
                  <div className="stat-number">
                    {schoolClassrooms.reduce((sum, c) => sum + (c.parent_count || 0), 0)}
                  </div>
                  <div className="stat-label">학부모</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📝</div>
                  <div className="stat-number">{schoolPosts.length}</div>
                  <div className="stat-label">전체 공지</div>
                </div>
              </div>
            </div>

            {/* 학급 갤러리 */}
            <div className="classroom-gallery">
              <h3 className="section-title">🎓 학급 갤러리</h3>
              {schoolClassrooms.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏫</div>
                  <p className="empty-text">등록된 학급이 없습니다</p>
                  <p className="empty-subtext">교사가 가입하여 학급을 생성하면 여기에 표시됩니다</p>
                </div>
              ) : (
                <div className="classroom-grid">
                  {schoolClassrooms.map(classroom => (
                    <div key={classroom.classroom_id} className="classroom-card">
                      <div className="classroom-image">
                        {classroom.class_photo ? (
                          <img 
                            src={`http://localhost:3001${classroom.class_photo}`} 
                            alt={`${classroom.grade}학년 ${classroom.class_number}반`}
                            className="class-photo"
                          />
                        ) : (
                          <div className="photo-placeholder">
                            <div className="placeholder-icon">📷</div>
                            <div className="placeholder-text">사진 없음</div>
                          </div>
                        )}
                      </div>
                      <div className="classroom-info">
                        <div className="class-name">
                          {classroom.grade}학년 {classroom.class_number}반
                        </div>
                        <div className="teacher-info">
                          담임: {classroom.teacher_name || '미배정'}
                        </div>
                        <div className="parent-count">
                          학부모: {classroom.parent_count || 0}명
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 학교 공지사항 */}
            <div className="notices-section">
              <div className="section-header">
                <h3 className="section-title">📌 학교 전체 공지사항</h3>
                <Link 
                  to={`/posts/write?school_id=${user.school_id}`} 
                  className="write-button"
                >
                  ✏️ 공지 작성
                </Link>
              </div>
              
              {schoolPosts.length === 0 ? (
                <div className="empty-state-small">
                  <p className="empty-text">학교 전체 공지사항이 없습니다</p>
                </div>
              ) : (
                <div className="posts-list">
                  {schoolPosts.slice(0, 5).map(post => (
                    <div key={post.post_id} className="post-item">
                      <Link to={`/posts/${post.post_id}`} className="post-link">
                        <div className="post-content">
                          <div className="post-title">{post.title}</div>
                          <div className="post-meta">
                            <span className="post-date">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                            <span className="post-author">작성자: {post.author_name}</span>
                          </div>
                        </div>
                        <div className="post-arrow">→</div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽 섹션 */}
          <div className="right-section">
            {/* 오늘의 일정 */}
            <div className="schedule-section">
              <h3 className="section-title">🗓️ 오늘의 학교 일정</h3>
              {todayEvents.length === 0 ? (
                <div className="empty-state-small">
                  <div className="empty-icon-small">📅</div>
                  <p className="empty-text">오늘 예정된 일정이 없습니다</p>
                </div>
              ) : (
                <div className="events-list">
                  {todayEvents.map(event => (
                    <div key={event.schedule_id} className="event-item">
                      <div className="event-indicator"></div>
                      <div className="event-content">
                        <div className="event-title">{event.title}</div>
                        {event.description && (
                          <div className="event-description">{event.description}</div>
                        )}
                        <div className="event-date">
                          {event.start === event.end ? 
                            new Date(event.start).toLocaleDateString() :
                            `${new Date(event.start).toLocaleDateString()} ~ ${new Date(event.end).toLocaleDateString()}`
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link 
                to={`/schedules?school_id=${user.school_id}`} 
                className="schedule-button"
              >
                📅 전체 일정 관리
              </Link>
            </div>

            {/* 빠른 링크 */}
            <div className="quick-links">
              <h3 className="section-title">🔗 빠른 이동</h3>
              <div className="links-grid">
                <Link 
                  to={`/admindashboard?tab=teachers&school_id=${user.school_id}`} 
                  className="quick-link"
                >
                  <span className="link-icon">👨‍🏫</span>
                  <span className="link-text">교사 관리</span>
                </Link>
                <Link 
                  to={`/admindashboard?tab=classrooms&school_id=${user.school_id}`} 
                  className="quick-link"
                >
                  <span className="link-icon">🏫</span>
                  <span className="link-text">학급 관리</span>
                </Link>
                <Link 
                  to={`/admindashboard?tab=codes&school_id=${user.school_id}`} 
                  className="quick-link"
                >
                  <span className="link-icon">🔑</span>
                  <span className="link-text">인증코드</span>
                </Link>
                <Link 
                  to="/inquiry/form" 
                  className="quick-link"
                >
                  <span className="link-icon">📞</span>
                  <span className="link-text">문의하기</span>
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
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .header-content {
          text-align: center;
        }

        .main-title {
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.02em;
        }

        .welcome-text {
          font-size: clamp(1rem, 2.5vw, 1.2rem);
          color: var(--text-secondary, #64748b);
          margin: 0;
          font-weight: 300;
        }

        .main-content {
          display: grid;
          grid-template-columns: ${isMobile ? '1fr' : '2fr 1fr'};
          gap: 2rem;
          align-items: start;
        }

        .left-section,
        .right-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .section-title {
          font-size: 1.4rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        /* 통계 섹션 */
        .stats-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s ease;
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .stat-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .stat-number {
          font-size: 2.2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.9rem;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
        }

        /* 학급 갤러리 */
        .classroom-gallery {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .classroom-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .classroom-card {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .classroom-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .classroom-image {
          height: 160px;
          position: relative;
          background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
        }

        .class-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary, #64748b);
        }

        .placeholder-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          opacity: 0.7;
        }

        .placeholder-text {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .classroom-info {
          padding: 1.5rem;
        }

        .class-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin-bottom: 0.5rem;
        }

        .teacher-info,
        .parent-count {
          font-size: 0.85rem;
          color: var(--text-secondary, #64748b);
          margin-bottom: 0.25rem;
        }

        /* 공지사항 섹션 */
        .notices-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .write-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .write-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        .posts-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .post-item {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          transition: all 0.2s ease;
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .post-item:hover {
          background: var(--bg-hover, #f1f5f9);
          transform: translateX(4px);
        }

        .post-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          text-decoration: none;
          color: inherit;
          width: 100%;
        }

        .post-content {
          flex: 1;
        }

        .post-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .post-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: var(--text-secondary, #64748b);
        }

        .post-arrow {
          font-size: 1.2rem;
          color: var(--text-secondary, #64748b);
          transition: transform 0.2s ease;
        }

        .post-item:hover .post-arrow {
          transform: translateX(4px);
        }

        /* 일정 섹션 */
        .schedule-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .event-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          border-left: 4px solid #10b981;
          transition: all 0.2s ease;
        }

        .event-item:hover {
          background: var(--bg-hover, #f1f5f9);
          transform: translateX(4px);
        }

        .event-indicator {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          margin-top: 0.5rem;
          flex-shrink: 0;
        }

        .event-content {
          flex: 1;
        }

        .event-title {
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin-bottom: 0.25rem;
        }

        .event-description {
          font-size: 0.9rem;
          color: var(--text-secondary, #64748b);
          margin-bottom: 0.25rem;
          line-height: 1.4;
        }

        .event-date {
          font-size: 0.8rem;
          color: var(--text-secondary, #64748b);
        }

        .schedule-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s ease;
          width: 100%;
          justify-content: center;
        }

        .schedule-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
        }

        /* 빠른 링크 */
        .quick-links {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
        }

        .quick-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem 1rem;
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #1e293b);
          text-decoration: none;
          border-radius: 16px;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid var(--border-color, #e2e8f0);
          transition: all 0.3s ease;
        }

        .quick-link:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
        }

        .link-icon {
          font-size: 1.8rem;
        }

        .link-text {
          font-weight: 600;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-secondary, #64748b);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0 0 0.5rem 0;
        }

        .empty-subtext {
          font-size: 0.9rem;
          margin: 0;
          opacity: 0.8;
        }

        .empty-state-small {
          text-align: center;
          padding: 2rem 1rem;
          color: var(--text-secondary, #64748b);
        }

        .empty-icon-small {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          opacity: 0.5;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .admin-main-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --bg-hover: #475569;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 1024px) {
          .header {
            padding: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .classroom-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }

          .links-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .admin-main-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.2rem;
            margin-bottom: 1.5rem;
          }

          .main-content {
            gap: 1.5rem;
          }

          .left-section,
          .right-section {
            gap: 1.5rem;
          }

          .stats-section,
          .classroom-gallery,
          .notices-section,
          .schedule-section,
          .quick-links {
            padding: 1.5rem;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }

          .stat-card {
            padding: 1.2rem;
          }

          .stat-number {
            font-size: 1.8rem;
          }

          .classroom-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .classroom-image {
            height: 140px;
          }

          .classroom-info {
            padding: 1.2rem;
          }

          .post-link {
            padding: 1rem;
          }

          .event-item {
            padding: 1rem;
          }

          .links-grid {
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }

          .quick-link {
            padding: 1.2rem 0.8rem;
          }

          .link-icon {
            font-size: 1.5rem;
          }

          .write-button,
          .schedule-button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 1rem;
          }

          .stats-section,
          .classroom-gallery,
          .notices-section,
          .schedule-section,
          .quick-links {
            padding: 1.2rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .stat-card {
            padding: 1rem;
          }

          .stat-number {
            font-size: 1.5rem;
          }

          .classroom-image {
            height: 120px;
          }

          .classroom-info {
            padding: 1rem;
          }

          .class-name {
            font-size: 1rem;
          }

          .post-meta {
            flex-direction: column;
            gap: 0.25rem;
          }

          .event-item {
            padding: 0.8rem;
          }

          .links-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .quick-link {
            padding: 1rem;
            flex-direction: row;
            text-align: left;
          }

          .link-icon {
            font-size: 1.3rem;
          }

          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-icon {
            font-size: 3rem;
          }

          .empty-text {
            font-size: 1rem;
          }
        }

        /* 애니메이션 성능 최적화 */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* 포커스 접근성 */
        .write-button:focus,
        .schedule-button:focus,
        .quick-link:focus,
        .post-link:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        /* 프린트 스타일 */
        @media print {
          .admin-main-page {
            background: white !important;
            padding: 0 !important;
          }

          .header {
            background: white !important;
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }

          .write-button,
          .schedule-button,
          .quick-link {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminMainPage;