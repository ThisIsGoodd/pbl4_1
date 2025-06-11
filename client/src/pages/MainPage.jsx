import { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function MainPage() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [classroomId, setClassroomId] = useState(null);
  const [classroomInfo, setClassroomInfo] = useState(null);
  const [posts, setPosts] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [classPhoto, setClassPhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const isTeacher = user?.role === 'teacher';

  // 반응형 처리
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

  useEffect(() => {
    const id = searchParams.get('classroom_id');
    if (id) {
      setClassroomId(id);
    } else {
      if (!user?.joined_classrooms || user.joined_classrooms.length === 0) {
        navigate('/classroom/create');
        return;
      }
      // 첫 번째 학급으로 설정
      const firstClassroom = user.joined_classrooms[0];
      setClassroomId(firstClassroom.classroom_id);
    }
  }, [searchParams, user, navigate]);

  useEffect(() => {
    if (classroomId) {
      fetchAllData();
    }
  }, [classroomId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchClassroomInfo(),
        fetchPosts(),
        fetchTodayEvents(),
        fetchAllSchedules(),
        fetchClassPhoto()
      ]);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassroomInfo = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClassroomInfo(data.classroom);
      }
    } catch (err) {
      console.error('학급 정보 로딩 실패:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts?classroom_id=${classroomId}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('게시글 로딩 실패:', err);
    }
  };

  const fetchTodayEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`http://localhost:3001/api/schedules?classroom_id=${classroomId}&date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayEvents(data.schedules || []);
      }
    } catch (err) {
      console.error('오늘 일정 로딩 실패:', err);
    }
  };

  const fetchAllSchedules = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/schedules?classroom_id=${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error('전체 일정 로딩 실패:', err);
    }
  };

  const fetchClassPhoto = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/photo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClassPhoto(data.photo_url || '');
      }
    } catch (err) {
      console.error('학급 사진 로딩 실패:', err);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        await fetchClassPhoto();
        alert('학급 사진이 업로드되었습니다.');
      } else {
        alert('사진 업로드에 실패했습니다.');
      }
    } catch (err) {
      console.error('사진 업로드 실패:', err);
      alert('사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 캘린더 관련 함수들
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getEventsForDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allSchedules.filter(schedule => schedule.event_date?.startsWith(dateStr));
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const today = new Date();
    const monthYear = currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    
    const days = [];
    
    // 빈 칸 추가
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getDate() === day && 
                     today.getMonth() === currentDate.getMonth() && 
                     today.getFullYear() === currentDate.getFullYear();
      
      const events = getEventsForDate(day);
      
      days.push(
        <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
          <div className="day-number">{day}</div>
          <div className="event-indicators">
            {events.slice(0, 2).map((event, idx) => (
              <div key={idx} className="event-dot" title={event.title}></div>
            ))}
            {events.length > 2 && <span className="more-events">+{events.length - 2}</span>}
          </div>
        </div>
      );
    }
    
    return { days, monthYear };
  };

  if (loading) {
    return (
      <div className="main-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">학급 정보를 불러오는 중...</div>
        </div>
        
        <style jsx>{`
          .main-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
          }

          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .loading-text {
            font-size: 1.1rem;
            font-weight: 500;
            color: white;
            text-align: center;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const { days, monthYear } = renderCalendar();

  return (
    <div className="main-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">
              🏫 {classroomInfo ? `${classroomInfo.grade}학년 ${classroomInfo.class_number}반` : '학급 대시보드'}
            </h1>
            <p className="welcome-text">
              {classroomInfo?.school_name || '학교'} • {user?.name}님 환영합니다
            </p>
          </div>
        </div>

        <div className="main-content">
          {/* 왼쪽 컬럼 */}
          <div className="left-column">
            {/* 학급 사진 섹션 */}
            <div className="class-photo-section">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="title-icon">📸</span>
                  우리 반 사진
                </h3>
              </div>
              
              <div className="photo-container">
                {classPhoto ? (
                  <img src={classPhoto} alt="학급 사진" className="class-photo" />
                ) : (
                  <div className="photo-placeholder">
                    <div className="placeholder-icon">📷</div>
                    <div className="placeholder-text">학급 사진을 업로드해주세요</div>
                  </div>
                )}
                
                {isTeacher && (
                  <div className="photo-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="upload-input"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="upload-button">
                      {uploadingPhoto ? (
                        <>
                          <span className="loading-spinner-small"></span>
                          업로드 중...
                        </>
                      ) : (
                        <>
                          <span className="upload-icon">📁</span>
                          사진 업로드
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 최근 공지사항 */}
            <div className="notices-section">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="title-icon">📢</span>
                  최근 공지사항
                </h3>
                <Link to={`/posts?classroom_id=${classroomId}`} className="view-all-btn">
                  전체보기
                </Link>
              </div>
              
              <div className="notices-list">
                {posts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <p className="empty-text">아직 공지사항이 없습니다</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.post_id} className="notice-item">
                      <div className="notice-content">
                        <h4 className="notice-title">{post.title}</h4>
                        <div className="notice-meta">
                          <span className="notice-author">{post.author_name}</span>
                          <span className="notice-date">
                            {new Date(post.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                      <Link 
                        to={`/posts/${post.post_id}?classroom_id=${classroomId}`}
                        className="notice-link"
                      >
                        →
                      </Link>
                    </div>
                  ))
                )}
              </div>
              
              {isTeacher && (
                <Link 
                  to={`/posts/write?classroom_id=${classroomId}`} 
                  className="write-post-btn"
                >
                  <span className="btn-icon">✏️</span>
                  공지사항 작성
                </Link>
              )}
            </div>
          </div>

          {/* 오른쪽 컬럼 */}
          <div className="right-column">
            {/* 오늘의 일정 */}
            <div className="today-schedule-section">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="title-icon">📅</span>
                  오늘의 일정
                </h3>
                <Link to={`/schedule?classroom_id=${classroomId}`} className="view-all-btn">
                  전체보기
                </Link>
              </div>
              
              <div className="today-events">
                {todayEvents.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🗓️</div>
                    <p className="empty-text">오늘은 특별한 일정이 없습니다</p>
                  </div>
                ) : (
                  todayEvents.map((event) => (
                    <div key={event.schedule_id} className="event-item">
                      <div className="event-time">
                        {event.event_time || '하루종일'}
                      </div>
                      <div className="event-content">
                        <h4 className="event-title">{event.title}</h4>
                        {event.description && (
                          <p className="event-description">{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 달력 */}
            <div className="calendar-section">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="title-icon">📆</span>
                  학급 달력
                </h3>
              </div>
              
              <div className="calendar-container">
                <div className="calendar-header">
                  <button 
                    onClick={() => navigateMonth(-1)} 
                    className="nav-button"
                  >
                    ←
                  </button>
                  <h4 className="month-title">{monthYear}</h4>
                  <button 
                    onClick={() => navigateMonth(1)} 
                    className="nav-button"
                  >
                    →
                  </button>
                </div>
                
                <div className="weekdays">
                  {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                    <div key={day} className="weekday">{day}</div>
                  ))}
                </div>
                
                <div className="calendar-grid">
                  {days}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 퀵 액션 버튼들 */}
        <div className="quick-actions">
          <Link to={`/chat?classroom_id=${classroomId}`} className="quick-action-btn chat">
            <span className="action-icon">💬</span>
            <span className="action-text">채팅</span>
          </Link>
          <Link to={`/schedule?classroom_id=${classroomId}`} className="quick-action-btn schedule">
            <span className="action-icon">📅</span>
            <span className="action-text">일정</span>
          </Link>
          <Link to={`/posts?classroom_id=${classroomId}`} className="quick-action-btn posts">
            <span className="action-icon">📢</span>
            <span className="action-text">공지사항</span>
          </Link>
          {isTeacher && (
            <Link to="/classroom/dashboard" className="quick-action-btn admin">
              <span className="action-icon">⚙️</span>
              <span className="action-text">관리</span>
            </Link>
          )}
        </div>
      </div>

      <style jsx>{`
        .main-page {
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
          text-align: center;
        }

        .main-title {
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 1rem 0;
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
          grid-template-columns: ${isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr'};
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .left-column,
        .right-column {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* 공통 섹션 스타일 */
        .class-photo-section,
        .notices-section,
        .today-schedule-section,
        .calendar-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .title-icon {
          font-size: 1.3rem;
        }

        .view-all-btn {
          padding: 0.5rem 1rem;
          background: transparent;
          color: #4f46e5;
          text-decoration: none;
          border: 2px solid #4f46e5;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .view-all-btn:hover {
          background: #4f46e5;
          color: white;
          transform: translateY(-1px);
        }

        /* 학급 사진 섹션 */
        .photo-container {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: var(--bg-secondary, #f8fafc);
        }

        .class-photo {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }

        .photo-placeholder {
          height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary, #64748b);
        }

        .placeholder-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .placeholder-text {
          font-size: 1rem;
          font-weight: 500;
        }

        .photo-upload {
          padding: 1rem;
          border-top: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #ffffff);
        }

        .upload-input {
          display: none;
        }

        .upload-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .upload-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
        }

        .upload-icon {
          font-size: 1rem;
        }

        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* 공지사항 섹션 */
        .notices-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .notice-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          border: 1px solid var(--border-color, #e2e8f0);
          transition: all 0.2s ease;
        }

        .notice-item:hover {
          background: var(--bg-hover, #f1f5f9);
          transform: translateX(4px);
        }

        .notice-content {
          flex: 1;
          min-width: 0;
        }

        .notice-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 0.5rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notice-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.85rem;
          color: var(--text-secondary, #64748b);
        }

        .notice-link {
          padding: 0.5rem;
          color: #4f46e5;
          text-decoration: none;
          font-size: 1.2rem;
          font-weight: 700;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .notice-link:hover {
          background: rgba(79, 70, 229, 0.1);
        }

        .write-post-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .write-post-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        .btn-icon {
          font-size: 1rem;
        }

        /* 오늘의 일정 섹션 */
        .today-events {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .event-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          border-left: 4px solid #4f46e5;
        }

        .event-time {
          font-size: 0.85rem;
          font-weight: 600;
          color: #4f46e5;
          min-width: 80px;
        }

        .event-content {
          flex: 1;
        }

        .event-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 0.25rem 0;
        }

        .event-description {
          font-size: 0.85rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
          line-height: 1.4;
        }

        /* 달력 섹션 */
        .calendar-container {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .nav-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          color: #4f46e5;
          transition: all 0.2s ease;
        }

        .nav-button:hover {
          background: rgba(79, 70, 229, 0.1);
        }

        .month-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          margin-bottom: 1rem;
        }

        .weekday {
          text-align: center;
          padding: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: var(--border-color, #e2e8f0);
          border-radius: 8px;
          overflow: hidden;
        }

        .calendar-day {
          background: var(--bg-primary, #ffffff);
          min-height: 50px;
          padding: 0.5rem 0.25rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          transition: background-color 0.2s ease;
        }

        .calendar-day:hover {
          background: var(--bg-hover, #f1f5f9);
        }

        .calendar-day.empty {
          background: transparent;
        }

        .calendar-day.today {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
        }

        .day-number {
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .event-indicators {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          align-items: center;
          justify-content: center;
        }

        .event-dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
        }

        .calendar-day.today .event-dot {
          background: rgba(255, 255, 255, 0.8);
        }

        .more-events {
          font-size: 0.6rem;
          color: var(--text-secondary, #64748b);
          margin-left: 2px;
        }

        .calendar-day.today .more-events {
          color: rgba(255, 255, 255, 0.8);
        }

        /* 빈 상태 */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
        }

        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .empty-text {
          font-size: 0.95rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
        }

        /* 퀵 액션 버튼들 */
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 2rem;
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: var(--bg-primary, #ffffff);
          color: var(--text-primary, #1e293b);
          text-decoration: none;
          border-radius: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .quick-action-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .quick-action-btn.chat:hover {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          color: white;
        }

        .quick-action-btn.schedule:hover {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .quick-action-btn.posts:hover {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .quick-action-btn.admin:hover {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
        }

        .action-icon {
          font-size: 1.5rem;
        }

        .action-text {
          font-size: 1rem;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .main-page {
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
          .main-content {
            grid-template-columns: 1fr;
          }

          .left-column {
            order: 1;
          }

          .right-column {
            order: 2;
          }

          .quick-actions {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .main-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .class-photo-section,
          .notices-section,
          .today-schedule-section,
          .calendar-section {
            padding: 1.5rem;
          }

          .main-content {
            gap: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .section-title {
            justify-content: center;
          }

          .view-all-btn {
            align-self: center;
          }

          .notice-meta {
            flex-direction: column;
            gap: 0.25rem;
          }

          .calendar-day {
            min-height: 40px;
            padding: 0.25rem;
          }

          .day-number {
            font-size: 0.75rem;
          }

          .event-dot {
            width: 4px;
            height: 4px;
          }

          .quick-actions {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .quick-action-btn {
            padding: 0.875rem 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .main-page {
            padding: 0.25rem;
          }

          .header {
            padding: 1.25rem;
          }

          .class-photo-section,
          .notices-section,
          .today-schedule-section,
          .calendar-section {
            padding: 1.25rem;
          }

          .class-photo,
          .photo-placeholder {
            height: 150px;
          }

          .placeholder-icon {
            font-size: 2rem;
          }

          .empty-state {
            padding: 1.5rem;
          }

          .empty-icon {
            font-size: 2rem;
          }

          .event-item {
            flex-direction: column;
            gap: 0.5rem;
          }

          .event-time {
            min-width: auto;
            text-align: center;
          }
        }

        /* 고해상도 디스플레이 최적화 */
        @media (min-width: 1400px) {
          .container {
            max-width: 1600px;
          }

          .main-content {
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
          }

          .class-photo-section,
          .notices-section,
          .today-schedule-section,
          .calendar-section {
            padding: 2.5rem;
          }
        }

        /* 접근성 */
        .view-all-btn:focus,
        .upload-button:focus,
        .write-post-btn:focus,
        .nav-button:focus,
        .quick-action-btn:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        /* 애니메이션 성능 최적화 */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default MainPage;