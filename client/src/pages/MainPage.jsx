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
      navigate('/join/invite');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!classroomId) return;

    // ✅ 학급 정보 가져오기
    fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setClassroomInfo(data);
        if (data.class_photo) {
          setClassPhoto(`http://localhost:3001${data.class_photo}`);
        }
      })
      .catch(err => {
        console.error('학급 정보 불러오기 실패:', err);
      });
  }, [classroomId]);

  useEffect(() => {
    if (!user || !classroomId) return;

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
          setAllSchedules(data.schedules);
          const today = new Date().toISOString().split('T')[0];
          const filtered = data.schedules.filter(e => e.start <= today && e.end >= today);
          setTodayEvents(filtered);
        }
      });
  }, [user, classroomId]);

  // ✅ 단체사진 업로드 핸들러
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('class_photo', file);

      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setClassPhoto(`http://localhost:3001${data.photo_url}`);
        alert('단체사진이 업로드되었습니다!');
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

  // 🆕 커스텀 달력 관련 함수들
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
    const dateStr = date.toISOString().split('T')[0];
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

  const isWeekend = (date) => {
    if (!date) return false;
    const day = date.getDay();
    return day === 0 || day === 6; // 일요일(0) 또는 토요일(6)
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
    <div style={isMobile ? styles.mobileWrapper : styles.wrapper}>
      <h2 style={{
        ...styles.title,
        fontSize: isMobile ? '1.5rem' : '2rem',
        margin: isMobile ? '1rem 0' : '2rem 0'
      }}>
        {classroomInfo
          ? `${classroomInfo.school} - ${classroomInfo.grade}학년 ${classroomInfo.class_number}반`
          : '학급 정보 불러오는 중...'}
      </h2>

      <div style={isMobile ? styles.mobileLayout : styles.layout}>
        {/* 왼쪽 영역 */}
        <div style={isMobile ? styles.mobileLeft : styles.left}>
          <div style={{
            ...styles.photoBox,
            minHeight: isMobile ? '200px' : '300px'
          }}>
            {classPhoto ? (
              <img
                src={classPhoto}
                alt="단체사진"
                style={styles.classPhoto}
                onError={(e) => {
                  e.target.style.display = 'none';
                  setClassPhoto('');
                }}
              />
            ) : (
              <div style={styles.photoPlaceholder}>
                <div style={{ fontSize: isMobile ? '2rem' : '3rem', marginBottom: '1rem' }}>📸</div>
                <div>단체 사진 없음</div>
                {isTeacher && (
                  <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                    아래 버튼으로 사진을 업로드하세요
                  </div>
                )}
              </div>
            )}
            {/* 교사만 업로드 버튼 표시 */}
            {isTeacher && (
              <div style={styles.uploadButtonContainer}>
                <input
                  type="file"
                  id="photoUpload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={uploadingPhoto}
                />
                <label 
                  htmlFor="photoUpload" 
                  style={{
                    ...styles.uploadButton,
                    opacity: uploadingPhoto ? 0.7 : 1,
                    cursor: uploadingPhoto ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploadingPhoto ? '업로드 중...' : classPhoto ? '📷 사진 변경' : '📷 사진 업로드'}
                </label>
              </div>
            )}
          </div>

          <div style={{
            ...styles.noticeBox,
            minHeight: isMobile ? '150px' : 'auto'
          }}>
            <h3>📌 최근 공지사항</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
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
        <div style={isMobile ? styles.mobileRight : styles.right}>
          <div style={styles.todaySection}>
            <h3>🗓️ 오늘 일정</h3>
            {todayEvents.length === 0 ? (
              <p>오늘 일정 없음</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {todayEvents.map(ev => (
                  <li key={ev.schedule_id} style={{ marginBottom: '0.5rem' }}>
                    <strong>{ev.title}</strong><br />
                    <small>{ev.description}</small>
                  </li>
                ))}
              </ul>
            )}
            <button 
              onClick={() => navigate(`/schedules?classroom_id=${classroomId}`)}
              style={styles.scheduleButton}
            >
              전체 캘린더 보기
            </button>
          </div>

          <hr style={{ margin: '1rem 0' }} />
          
          {/* 🆕 커스텀 미니 캘린더 */}
          <div style={styles.calendarSection}>
            <h3>📅 미니 캘린더</h3>
            <div style={styles.calendarContainer}>
              {/* 달력 헤더 */}
              <div style={styles.calendarHeader}>
                <button 
                  onClick={goToPreviousMonth}
                  style={styles.navButton}
                >
                  ◀
                </button>
                <h4 style={styles.monthTitle}>{formatMonth(currentDate)}</h4>
                <button 
                  onClick={goToNextMonth}
                  style={styles.navButton}
                >
                  ▶
                </button>
              </div>

              {/* 요일 헤더 */}
              <div style={styles.weekHeader}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                  <div key={day} style={{
                    ...styles.weekDay,
                    color: index === 0 ? '#dc3545' : index === 6 ? '#007bff' : '#333'
                  }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div style={styles.dateGrid}>
                {days.map((date, index) => {
                  const events = getEventsForDate(date);
                  const hasEvents = events.length > 0;
                  
                  return (
                    <div
                      key={index}
                      style={{
                        ...styles.dateCell,
                        backgroundColor: isToday(date) ? '#fff3cd' : 'transparent',
                        cursor: date ? 'pointer' : 'default',
                        opacity: date ? 1 : 0.3
                      }}
                      onClick={() => handleDateClick(date)}
                    >
                      {date && (
                        <>
                          <span style={{
                            ...styles.dateNumber,
                            color: isSunday(date) ? '#dc3545' : 
                                   isSaturday(date) ? '#007bff' : '#333',
                            fontWeight: isToday(date) ? 'bold' : 'normal'
                          }}>
                            {date.getDate()}
                          </span>
                          {hasEvents && (
                            <div style={styles.eventIndicator}>
                              {events.slice(0, 2).map((event, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    ...styles.eventDot,
                                    backgroundColor: event.school_wide ? '#9DA7E3' : '#5ADD7D'
                                  }}
                                  title={event.title}
                                />
                              ))}
                              {events.length > 2 && (
                                <span style={styles.moreEvents}>+{events.length - 2}</span>
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
  );
}

const styles = {
  wrapper: {
    padding: '2rem',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  mobileWrapper: {
    padding: '1rem',
    width: '100%'
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center'
  },
  layout: {
    display: 'flex',
    gap: '2rem',
    marginTop: '2rem',
    minHeight: '80vh',
    height: 'auto'
  },
  mobileLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem'
  },
  left: {
    flex: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    height: 'fit-content'
  },
  mobileLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  photoBox: {
    flex: 4,
    border: '1px solid #ccc',
    backgroundColor: '#f8f8f8',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  classPhoto: {
    width: '100%',
    height: '100%', 
    objectFit: 'cover',
    borderRadius: '8px'
  },
  photoPlaceholder: {
    textAlign: 'center', 
    color: '#777',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  uploadButtonContainer: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2
  },
  uploadButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    border: 'none',
    display: 'inline-block',
    textDecoration: 'none'
  },
  noticeBox: {
    flex: 4,
    border: '1px solid #ccc',
    padding: '1rem',
    backgroundColor: '#fff',
    overflowY: 'auto',
    borderRadius: '8px'
  },
  right: {
    flex: 4,
    border: '1px solid #ccc',
    padding: '1rem',
    backgroundColor: '#fff',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column'
  },
  mobileRight: {
    border: '1px solid #ccc',
    padding: '1rem',
    backgroundColor: '#fff',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column'
  },
  todaySection: {
    marginBottom: '1rem'
  },
  scheduleButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  calendarSection: {
    flex: 1
  },
  calendarContainer: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1rem',
    backgroundColor: '#fafafa'
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  navButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '4px',
    color: '#007bff'
  },
  monthTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    marginBottom: '0.5rem'
  },
  weekDay: {
    textAlign: 'center',
    padding: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  dateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    backgroundColor: '#ddd'
  },
  dateCell: {
    backgroundColor: 'white',
    minHeight: '35px',
    padding: '2px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    transition: 'background-color 0.2s'
  },
  dateNumber: {
    fontSize: '0.9rem',
    marginBottom: '2px'
  },
  eventIndicator: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1px',
    alignItems: 'center'
  },
  eventDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0
  },
  moreEvents: {
    fontSize: '0.6rem',
    color: '#666',
    marginLeft: '2px'
  }
};

export default MainPage;