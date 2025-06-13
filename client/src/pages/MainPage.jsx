// client/src/pages/MainPage.jsx
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

  useEffect(() => {
    const id = searchParams.get('classroom_id');
    if (id) {
      setClassroomId(id);
    } else {
      alert('학급 정보가 없습니다. 다시 로그인해주세요.');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (classroomId && token) {
      fetchClassroomInfo();
      fetchPosts();
      fetchTodayEvents();
      fetchAllSchedules();
    }
  }, [classroomId, token]);

  const fetchClassroomInfo = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setClassroomInfo(data);
        if (data.class_photo) {
          setClassPhoto(`http://localhost:3001${data.class_photo}`);
        }
      }
    } catch (err) {
      console.error('학급 정보 불러오기 실패:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts?classroom_id=${classroomId}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('게시글 불러오기 실패:', err);
    }
  };

  const fetchTodayEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`http://localhost:3001/api/schedules?classroom_id=${classroomId}&date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.schedules) {
        setTodayEvents(data.schedules);
      }
    } catch (err) {
      console.error('오늘 일정 불러오기 실패:', err);
    }
  };

  const fetchAllSchedules = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/schedules?classroom_id=${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.schedules) {
        setAllSchedules(data.schedules);
      }
    } catch (err) {
      console.error('전체 일정 불러오기 실패:', err);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    setUploadingPhoto(true);
    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setClassPhoto(`http://localhost:3001${data.photo_url}`);
        alert('사진 업로드 완료!');
      } else {
        alert(data.error || '업로드 실패');
      }
    } catch (err) {
      console.error('사진 업로드 오류:', err);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 커스텀 달력 관련 함수들
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // 이전 달의 마지막 날들로 빈 칸 채우기
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    
    // 로컬 시간대로 날짜 문자열 생성 (UTC 변환 없이)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return allSchedules.filter(event => {
      return dateStr >= event.start && dateStr <= event.end;
    });
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSunday = (date) => {
    if (!date) return false;
    return date.getDay() === 0;
  };

  const isSaturday = (date) => {
    if (!date) return false;
    return date.getDay() === 6;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    if (date) {
      navigate(`/schedules?classroom_id=${classroomId}`);
    }
  };

  if (user === undefined) return null;

  const days = getDaysInMonth(currentDate);

  return (
    <div className="main-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1 className="page-title">
            {classroomInfo
              ? `${classroomInfo.school} - ${classroomInfo.grade}학년 ${classroomInfo.class_number}반`
              : '학급 정보 불러오는 중...'}
          </h1>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="main-content">
          {/* 왼쪽 영역 */}
          <div className="left-section">
            {/* 단체사진 섹션 */}
            <div className="photo-section">
              <h3>📸 단체사진</h3>
              <div className="photo-container">
                {classPhoto ? (
                  <img 
                    src={classPhoto} 
                    alt="단체사진" 
                    className="class-photo"
                  />
                ) : (
                  <div className="empty-photo">
                    <span className="photo-icon">📷</span>
                    <p>단체사진이 없습니다</p>
                  </div>
                )}
                {isTeacher && (
                  <label className="upload-button">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      style={{ display: 'none' }}
                    />
                    📷 {uploadingPhoto ? '업로드 중...' : '사진 변경'}
                  </label>
                )}
              </div>
            </div>

            {/* 최근 공지 섹션 */}
            <div className="notice-section">
              <h3>📢 최근 공지</h3>
              <div className="notice-list">
                {posts.length === 0 ? (
                  <p className="empty-message">공지사항이 없습니다</p>
                ) : (
                  posts.map(post => (
                    <Link 
                      key={post.post_id}
                      to={`/posts/${post.post_id}?classroom_id=${classroomId}`}
                      className="notice-item"
                    >
                      <span className="notice-title">{post.title}</span>
                      <span className="notice-date">{post.created_at?.slice(0, 10)}</span>
                    </Link>
                  ))
                )}
              </div>
              <Link 
                to={`/posts?classroom_id=${classroomId}`}
                className="view-all-btn"
              >
                전체 공지 보기
              </Link>
            </div>
          </div>

          {/* 오른쪽 영역 */}
          <div className="right-section">
            {/* 오늘 일정 섹션 */}
            <div className="today-section">
              <h3>🗓️ 오늘 일정</h3>
              <div className="today-events">
                {todayEvents.length === 0 ? (
                  <p className="empty-message">오늘 일정이 없습니다</p>
                ) : (
                  todayEvents.map(event => (
                    <div key={event.schedule_id} className="event-item">
                      <div className="event-title">{event.title}</div>
                      {event.description && (
                        <div className="event-description">{event.description}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <button 
                onClick={() => navigate(`/schedules?classroom_id=${classroomId}`)}
                className="calendar-btn"
              >
                전체 캘린더 보기
              </button>
            </div>

            {/* 미니 캘린더 섹션 */}
            <div className="calendar-section">
              <h3>📅 미니 캘린더</h3>
              <div className="mini-calendar">
                {/* 달력 헤더 */}
                <div className="calendar-header">
                  <button 
                    onClick={goToPreviousMonth}
                    className="nav-btn"
                  >
                    ◀
                  </button>
                  <h4 className="month-title">{formatMonth(currentDate)}</h4>
                  <button 
                    onClick={goToNextMonth}
                    className="nav-btn"
                  >
                    ▶
                  </button>
                </div>

                {/* 요일 헤더 */}
                <div className="week-header">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                    <div key={day} className={`week-day ${
                      index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''
                    }`}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="date-grid">
                  {days.map((date, index) => {
                    const events = getEventsForDate(date);
                    const hasEvents = events.length > 0;
                    
                    return (
                      <div
                        key={index}
                        className={`date-cell ${
                          date ? 'clickable' : 'empty'
                        } ${
                          isToday(date) ? 'today' : ''
                        } ${
                          isSunday(date) ? 'sunday' : isSaturday(date) ? 'saturday' : ''
                        }`}
                        onClick={() => handleDateClick(date)}
                      >
                        {date && (
                          <>
                            <span className="date-number">{date.getDate()}</span>
                            {hasEvents && (
                              <div className="event-indicators">
                                {events.slice(0, 3).map((event, idx) => (
                                  <div key={idx} className="event-dot"></div>
                                ))}
                                {events.length > 3 && (
                                  <span className="more-events">+{events.length - 3}</span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .main-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* 헤더 */
        .header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .page-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        /* 메인 콘텐츠 */
        .main-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .left-section,
        .right-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* 공통 섹션 스타일 */
        .photo-section,
        .notice-section,
        .today-section,
        .calendar-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .photo-section h3,
        .notice-section h3,
        .today-section h3,
        .calendar-section h3 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
        }

        /* 단체사진 섹션 */
        .photo-container {
          position: relative;
          text-align: center;
        }

        .class-photo {
          width: 100%;
          max-height: 300px;
          object-fit: contain;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }

        .empty-photo {
          height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          color: #64748b;
        }

        .photo-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .upload-button {
          display: inline-block;
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #4f46e5;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.3s ease;
        }

        .upload-button:hover {
          background: #4338ca;
        }

        /* 공지 섹션 */
        .notice-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .notice-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s ease;
        }

        .notice-item:hover {
          background: #e2e8f0;
          transform: translateX(4px);
        }

        .notice-title {
          flex: 1;
          color: #1e293b;
          font-weight: 500;
        }

        .notice-date {
          color: #64748b;
          font-size: 0.85rem;
        }

        .view-all-btn {
          display: block;
          text-align: center;
          margin-top: 1rem;
          padding: 0.75rem;
          background: #4f46e5;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.3s ease;
        }

        .view-all-btn:hover {
          background: #4338ca;
        }

        /* 오늘 일정 섹션 */
        .today-events {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .event-item {
          padding: 0.75rem;
          background: #f0f9ff;
          border-radius: 8px;
          border-left: 4px solid #0ea5e9;
        }

        .event-title {
          font-weight: 600;
          color: #0c4a6e;
          margin-bottom: 0.25rem;
        }

        .event-description {
          color: #0369a1;
          font-size: 0.9rem;
        }

        .calendar-btn {
          width: 100%;
          margin-top: 1rem;
          padding: 0.75rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .calendar-btn:hover {
          background: #059669;
        }

        .empty-message {
          text-align: center;
          color: #64748b;
          font-style: italic;
          margin: 0;
        }

        /* 미니 캘린더 */
        .mini-calendar {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .nav-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
          color: #4f46e5;
          transition: background 0.3s ease;
        }

        .nav-btn:hover {
          background: rgba(79, 70, 229, 0.1);
        }

        .month-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .week-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: #f1f5f9;
        }

        .week-day {
          text-align: center;
          padding: 0.75rem 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          color: #475569;
        }

        /* 🔥 주말 색상 적용 - 요일 헤더 */
        .week-day.sunday {
          color: #dc2626; /* 일요일 빨간색 */
        }

        .week-day.saturday {
          color: #2563eb; /* 토요일 파란색 */
        }

        .date-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: #e2e8f0;
        }

        .date-cell {
          background: white;
          min-height: 40px;
          padding: 0.25rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          transition: background-color 0.2s ease;
        }

        .date-cell.clickable {
          cursor: pointer;
        }

        .date-cell.clickable:hover {
          background: #f1f5f9;
        }

        .date-cell.today {
          background: #fef3c7;
        }

        .date-cell.empty {
          opacity: 0.3;
        }

        .date-number {
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
          color: #374151;
        }

        /* 🔥 주말 색상 적용 - 날짜 숫자 */
        .date-cell.sunday .date-number {
          color: #dc2626; /* 일요일 빨간색 */
          font-weight: 600;
        }

        .date-cell.saturday .date-number {
          color: #2563eb; /* 토요일 파란색 */
          font-weight: 600;
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
          border-radius: 50%;
          background: #4f46e5;
          flex-shrink: 0;
        }

        .more-events {
          font-size: 0.6rem;
          color: #64748b;
          margin-left: 2px;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .main-content {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .header {
            padding: 1.5rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .photo-section,
          .notice-section,
          .today-section,
          .calendar-section {
            padding: 1.25rem;
          }

          .class-photo {
            max-height: 200px;
          }

          .empty-photo {
            height: 150px;
          }

          .date-cell {
            min-height: 35px;
          }

          .calendar-header {
            padding: 0.75rem;
          }

          .week-day {
            padding: 0.5rem 0.25rem;
            font-size: 0.8rem;
          }

          .date-number {
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .main-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.25rem;
          }

          .page-title {
            font-size: 1.25rem;
          }

          .photo-section,
          .notice-section,
          .today-section,
          .calendar-section {
            padding: 1rem;
          }
        }

        /* 다크모드 대응 */
        @media (prefers-color-scheme: dark) {
          .header,
          .photo-section,
          .notice-section,
          .today-section,
          .calendar-section {
            background: rgba(30, 30, 30, 0.95);
            color: #e5e7eb;
          }

          .page-title,
          .photo-section h3,
          .notice-section h3,
          .today-section h3,
          .calendar-section h3 {
            color: #f9fafb;
          }

          .notice-item {
            background: #374151;
          }

          .notice-item:hover {
            background: #4b5563;
          }

          .notice-title {
            color: #e5e7eb;
          }

          .event-item {
            background: rgba(56, 178, 172, 0.2);
            border-left-color: #14b8a6;
          }

          .empty-photo {
            background: #374151;
            border-color: #4b5563;
          }

          .calendar-header {
            background: #374151;
            border-bottom-color: #4b5563;
          }

          .week-header {
            background: #4b5563;
          }

          .date-cell {
            background: #1f2937;
          }

          .date-cell:hover {
            background: #374151;
          }

          .mini-calendar {
            border-color: #4b5563;
          }
        }
      `}</style>
    </div>
  );
}

export default MainPage;