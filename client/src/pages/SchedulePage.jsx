import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';

function SchedulePage() {
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');
  const schoolId = searchParams.get('school_id');
  const initialDate = searchParams.get('date'); // 🆕 MainPage에서 날짜 클릭시 받는 파라미터

  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(initialDate || null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [classroomInfo, setClassroomInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // 모달 관련 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    schoolWide: false
  });

  const token = localStorage.getItem('token');

  // 🆕 반응형 처리
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

  // JWT 토큰에서 사용자 정보 추출
  useEffect(() => {
    const parseJwt = (token) => {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
        return null;
      }
    };

    const userInfo = parseJwt(token);
    if (userInfo) {
      setMyUserId(userInfo.user_id);
      setMyRole(userInfo.role);
      setIsAdmin(userInfo.is_admin === true || userInfo.is_admin === 1);
    }
  }, [token]);

  // 🆕 학급 정보 가져오기
  useEffect(() => {
    if (classroomId && !schoolId) {
      fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          console.log('🔍 학급 정보:', data);
          setClassroomInfo(data);
        })
        .catch(err => console.error('학급 정보 조회 오류:', err));
    }
  }, [classroomId, schoolId, token]);

  // 일정 목록 가져오기
  const fetchSchedules = async () => {
    try {
      let url = '';
      if (schoolId) {
        url = `http://localhost:3001/api/schedules?school_id=${schoolId}`;
      } else if (classroomId) {
        url = `http://localhost:3001/api/schedules?classroom_id=${classroomId}`;
      } else {
        console.warn('❌ classroomId 또는 schoolId가 필요합니다.');
        return;
      }

      console.log('📅 일정 조회 요청:', url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('📅 받은 일정 데이터:', data);

      if (data.schedules && Array.isArray(data.schedules)) {
        setSchedules(data.schedules);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      console.error('🔥 일정 불러오기 실패:', err);
      setSchedules([]);
    }
  };

  useEffect(() => {
    if (myUserId && (classroomId || schoolId)) {
      fetchSchedules();
    }
  }, [myUserId, classroomId, schoolId]);

  // 🔥 수정: 서버에서 받은 날짜를 안전하게 처리하는 함수
  const formatDateFromServer = (dateValue) => {
    if (!dateValue) return '';
    
    // 이미 YYYY-MM-DD 형식이면 그대로 반환
    if (typeof dateValue === 'string' && !dateValue.includes('T')) {
      return dateValue;
    }
    
    // Date 객체나 ISO 문자열인 경우
    let date;
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      date = new Date(dateValue);
    }
    
    // 로컬 시간대로 YYYY-MM-DD 형식 반환
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // FullCalendar용 이벤트 데이터 변환 - 원래 코드와 동일
  const events = schedules.map((s) => ({
    id: s.schedule_id,
    title: s.title,
    start: formatDateFromServer(s.start),
    end: (() => {
      const endDate = new Date(formatDateFromServer(s.end));
      endDate.setDate(endDate.getDate() + 1);
      return endDate.toISOString().split('T')[0];
    })(),
    allDay: true,
    extendedProps: {
      description: s.description,
      schoolWide: s.school_wide,
      createdBy: s.created_by
    },
    color: s.school_wide ? '#9DA7E3' : '#5ADD7D'
  }));

  console.log('🎯 FullCalendar 이벤트 데이터:', events);

  // 이벤트 클릭 핸들러
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const schedule = schedules.find(s => s.schedule_id == event.id);
    
    if (schedule) {
      setSelectedEvent(schedule);
      setSelectedDate(null);
    }
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (arg) => {
    const clickedDate = arg.dateStr;
    setSelectedDate(clickedDate);
    setSelectedEvent(null);
    
    // 🆕 클릭된 날짜 셀 강조 효과
    document.querySelectorAll('.fc-day').forEach(cell => {
      cell.classList.remove('selected-date');
    });
    arg.dayEl.classList.add('selected-date');
  };

  // 일정 추가 핸들러
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    if (!scheduleForm.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    // 🔍 디버깅: 원본 날짜 확인
    console.log('🔍 [프론트엔드] 원본 날짜:', {
      startDate: scheduleForm.startDate,
      endDate: scheduleForm.endDate
    });

    try {
      const requestBody = {
        title: scheduleForm.title,
        description: scheduleForm.description,
        // 🔥 수정: 날짜를 그대로 전송 (변환하지 않음)
        start_date: scheduleForm.startDate,  // YYYY-MM-DD 그대로
        end_date: scheduleForm.endDate,      // YYYY-MM-DD 그대로
        school_wide: scheduleForm.schoolWide
      };

      console.log('🔍 [프론트엔드] 서버로 전송할 데이터:', requestBody);

      if (schoolId) {
        console.log('🏫 학교 전체 관리자 일정 등록:', requestBody);
      } else if (classroomId) {
        requestBody.classroom_id = classroomId;
        console.log('📚 학급 교사 일정 등록:', requestBody);
      } else {
        alert('학급 또는 학교 정보가 없습니다.');
        return;
      }

      const res = await fetch('http://localhost:3001/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 서버 응답 상태:', res.status);
      
      if (res.ok) {
        alert('일정이 등록되었습니다!');
        setIsModalOpen(false);
        fetchSchedules();
        setScheduleForm({
          title: '',
          description: '',
          startDate: '',
          endDate: '',
          schoolWide: schoolId ? true : false
        });
      } else {
        const errorData = await res.json();
        console.error('❌ 서버 에러:', errorData);
        alert('일정 등록에 실패했습니다: ' + (errorData.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('🔥 일정 등록 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  // 🔥 선택된 날짜의 일정 필터링 - 원래 코드와 동일
  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    console.log('🔍 선택된 날짜:', selectedDate);
    console.log('📅 전체 일정 목록:', schedules);
    
    return schedules.filter(s => {
      // 🔥 서버에서 start, end로 날짜가 옴
      const startDate = formatDateFromServer(s.start);
      const endDate = formatDateFromServer(s.end);
      const selectedDateStr = selectedDate;
      
      const isInDateRange = selectedDateStr >= startDate && selectedDateStr <= endDate;
      
      const matchesSearch = !searchKeyword || 
        s.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchKeyword.toLowerCase()));
      
      console.log(`📊 일정 "${s.title}": 시작=${startDate}, 종료=${endDate}, 선택=${selectedDateStr}, 날짜범위=${isInDateRange}, 검색매치=${matchesSearch}, 학교전체=${s.school_wide}`);
      
      return isInDateRange && matchesSearch;
    });
  };

  // 일정 삭제 핸들러
  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/schedules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        alert('삭제 완료');
        setSelectedEvent(null);
        fetchSchedules();
      } else {
        alert('삭제 실패');
      }
    } catch (err) {
      console.error('삭제 오류:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 🔥 수정: 날짜 포맷 함수
  const formatDateRange = (startDate, endDate) => {
    const start = formatDateFromServer(startDate);
    const end = formatDateFromServer(endDate);
    
    if (start === end) {
      return start;
    } else {
      return `${start} ~ ${end}`;
    }
  };

  // 🔥 복원: 선택된 날짜에 일정 추가하는 함수
  const handleAddEventForSelectedDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const dateToUse = selectedDate || today;
    
    setScheduleForm({
      title: '',
      description: '',
      startDate: dateToUse,
      endDate: dateToUse,
      schoolWide: schoolId ? true : false
    });
    setIsModalOpen(true);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem'
    }}>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        width: '100%'
      }}>
        {/* 디버깅 정보 (개발 모드에서만)
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 9999
          }}>
            Role: {myRole} | Admin: {isAdmin ? 'Y' : 'N'} | School: {schoolId} | Classroom: {classroomId}
          </div>
        )} */}

        {/* 헤더 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1rem' : '0'
        }}>
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h1 style={{
              margin: '0 0 0.5rem 0',
              color: '#1e293b',
              fontSize: isMobile ? '1.5rem' : '2rem'
            }}>
              {schoolId && isAdmin 
                ? '🏫 학교 전체 일정 관리'
                : classroomInfo 
                ? `📚 ${classroomInfo.grade}학년 ${classroomInfo.class_number}반 일정`
                : '📅 일정 관리'}
            </h1>
            <p style={{
              margin: 0,
              color: '#64748b',
              fontSize: '1.1rem'
            }}>
              {schoolId && isAdmin 
                ? '학교 전체의 중요한 일정을 관리하세요'
                : '학급의 일정을 확인하고 관리하세요'}
            </p>
          </div>
          
          {(myRole === 'teacher' || isAdmin) && (
            <button 
              style={{
                padding: '0.875rem 1.75rem',
                background: schoolId && isAdmin ? '#22c55e' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                width: isMobile ? '100%' : 'auto',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                console.log('🔍 일정 추가 버튼 클릭:', { myRole, isAdmin, schoolId, classroomId });
                setScheduleForm({
                  title: '',
                  description: '',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                  schoolWide: schoolId ? true : false
                });
                setIsModalOpen(true);
              }}
              onMouseEnter={(e) => {
                e.target.style.background = schoolId && isAdmin ? '#16a34a' : '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = schoolId && isAdmin ? '#22c55e' : '#3b82f6';
              }}
            >
              {schoolId && isAdmin 
                ? '🏫 학교 전체 일정 추가'
                : '📅 일정 추가'}
            </button>
          )}
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '2rem',
          height: isMobile ? 'auto' : '70vh'
        }}>
          {/* 왼쪽: 달력 */}
          <div style={{
            flex: isMobile ? 'none' : 2,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            marginBottom: isMobile ? '2rem' : '0'
          }}>
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={initialDate || undefined}
              locale="ko"
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              events={events}
              height={isMobile ? "auto" : "100%"}
              aspectRatio={isMobile ? 1.2 : 1.8}
              headerToolbar={{
                left: isMobile ? 'prev,next' : 'prev,next today',
                center: 'title',
                right: isMobile ? '' : 'dayGridMonth'
              }}
              titleFormat={{
                year: 'numeric',
                month: isMobile ? 'short' : 'long'
              }}
              displayEventTime={false}
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: true
              }}
              // 🔥 중요: 주말 색상 설정 유지 (토요일 파란색, 일요일 빨간색)
              dayCellContent={(arg) => {
                const date = arg.date;
                const dateStr = date.toISOString().split('T')[0];
                const dayOfWeek = date.getDay();
                
                let color = '#333';
                if (dayOfWeek === 0) { // 일요일 - 빨간색
                  color = '#dc3545';
                } else if (dayOfWeek === 6) { // 토요일 - 파란색
                  color = '#007bff';
                }
                
                return {
                  html: `<span style="color: ${color}; font-weight: 500;">${date.getDate()}</span>`
                };
              }}
              eventClassNames={isMobile ? 'mobile-event' : ''}
              dayMaxEvents={isMobile ? 2 : 3}
              eventDisplay="block"
            />
          </div>

          {/* 오른쪽: 일정 목록 또는 상세보기 */}
          <div style={{
            flex: isMobile ? 'none' : 1,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: isMobile ? 'none' : '70vh',
            overflowY: 'auto'
          }}>
            {/* 검색창 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="일정 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 이벤트 상세보기 */}
            {selectedEvent ? (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    color: '#1e293b',
                    fontSize: '1.2rem'
                  }}>📋 일정 상세</h3>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: '0.25rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
                
                <div style={{
                  padding: '1.5rem',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{
                    margin: '0 0 1rem 0',
                    color: '#1e293b',
                    fontSize: '1.1rem'
                  }}>{selectedEvent.title}</h4>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      backgroundColor: selectedEvent.school_wide ? '#9DA7E3' : '#5ADD7D',
                      color: 'white'
                    }}>
                      {selectedEvent.school_wide ? '🏫 학교' : '📚 학급'}
                    </span>
                  </div>

                  {selectedEvent.description && (
                    <div style={{
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      color: '#374151',
                      lineHeight: '1.6'
                    }}>
                      {selectedEvent.description}
                    </div>
                  )}
                  
                    <div style={{
                      color: '#64748b',
                      fontSize: '0.9rem',
                      marginBottom: '1rem'
                    }}>
                      📅 {formatDateRange(selectedEvent.start, selectedEvent.end)}
                    </div>

                  {(myRole === 'teacher' || isAdmin) && selectedEvent.created_by === myUserId && (
                    <button 
                      onClick={() => handleDelete(selectedEvent.schedule_id)} 
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      🗑️ 삭제
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // 🔥 복원: 날짜별 일정 목록 섹션
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    color: '#1e293b',
                    fontSize: '1.2rem'
                  }}>
                    {selectedDate
                      ? `📅 ${selectedDate} 일정`
                      : '📅 전체 일정'}
                  </h3>
                  
                  {/* 🔥 복원: 선택된 날짜에 일정 추가 버튼 */}
                  {selectedDate && (myRole === 'teacher' || isAdmin) && (
                    <button
                      onClick={handleAddEventForSelectedDate}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                      }}
                    >
                      + 일정 추가
                    </button>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {(selectedDate ? getEventsForSelectedDate() : schedules.filter(s => 
                    !searchKeyword || 
                    s.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                    (s.description && s.description.toLowerCase().includes(searchKeyword.toLowerCase()))
                  )).length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: '#64748b'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                      <p style={{ margin: 0 }}>
                        {selectedDate ? '이 날에는 일정이 없습니다' : '등록된 일정이 없습니다'}
                      </p>
                      {/* 🔥 복원: 빈 상태에서도 일정 추가 버튼 */}
                      {selectedDate && (myRole === 'teacher' || isAdmin) && (
                        <button
                          onClick={handleAddEventForSelectedDate}
                          style={{
                            marginTop: '1rem',
                            padding: '0.75rem 1.5rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}
                        >
                          첫 번째 일정 추가하기
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(selectedDate ? getEventsForSelectedDate() : schedules.filter(s => 
                        !searchKeyword || 
                        s.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                        (s.description && s.description.toLowerCase().includes(searchKeyword.toLowerCase()))
                      )).map(schedule => (
                        <div
                          key={schedule.schedule_id}
                          onClick={() => setSelectedEvent(schedule)}
                          style={{
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '0.5rem'
                          }}>
                            <h4 style={{
                              margin: 0,
                              color: '#1e293b',
                              fontSize: '1rem',
                              fontWeight: '600'
                            }}>{schedule.title}</h4>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '8px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              backgroundColor: schedule.school_wide ? '#9DA7E3' : '#5ADD7D',
                              color: 'white'
                            }}>
                              {schedule.school_wide ? '🏫' : '📚'}
                            </span>
                          </div>
                          
                          {schedule.description && (
                            <p style={{
                              margin: '0 0 0.5rem 0',
                              color: '#64748b',
                              fontSize: '0.85rem',
                              lineHeight: '1.4'
                            }}>
                              {schedule.description}
                            </p>
                          )}
                          
                          <div style={{
                            color: '#64748b',
                            fontSize: '0.8rem'
                          }}>
                            📅 {formatDateRange(schedule.start, schedule.end)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 일정 추가 모달 */}
        {isModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h2 style={{
                  margin: 0,
                  color: '#1e293b',
                  fontSize: '1.5rem'
                }}>
                  {schoolId && isAdmin ? '🏫 학교 전체 일정 추가' : '📅 일정 추가'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '0.25rem'
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: '600', 
                    color: '#1e293b' 
                  }}>
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                    placeholder="일정 제목을 입력하세요"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: '600', 
                    color: '#1e293b' 
                  }}>
                    설명
                  </label>
                  <textarea
                    value={scheduleForm.description}
                    onChange={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
                    placeholder="일정 설명을 입력하세요"
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem', 
                  marginBottom: '1.5rem' 
                }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontWeight: '600', 
                      color: '#1e293b' 
                    }}>
                      시작일 *
                    </label>
                    <input
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(e) => setScheduleForm({...scheduleForm, startDate: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontWeight: '600', 
                      color: '#1e293b' 
                    }}>
                      종료일 *
                    </label>
                    <input
                      type="date"
                      value={scheduleForm.endDate}
                      onChange={(e) => setScheduleForm({...scheduleForm, endDate: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* 학교 전체 공지 체크박스 (일반 교사만) */}
                {!schoolId && classroomId && (myRole === 'teacher' || isAdmin) && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.75rem',
                      background: scheduleForm.schoolWide ? '#e0f2fe' : '#f8fafc',
                      border: `2px solid ${scheduleForm.schoolWide ? '#0ea5e9' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={scheduleForm.schoolWide}
                        onChange={(e) => setScheduleForm({...scheduleForm, schoolWide: e.target.checked})}
                        style={{ margin: 0 }}
                      />
                      <span style={{ fontWeight: '500', color: '#1e293b' }}>
                        🏫 학교 전체 일정으로 등록
                      </span>
                    </label>
                    <small style={{ 
                      color: '#64748b', 
                      fontSize: '0.85rem',
                      marginTop: '0.5rem',
                      display: 'block'
                    }}>
                      체크하면 모든 학급에서 볼 수 있습니다
                    </small>
                  </div>
                )}

                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  justifyContent: 'flex-end',
                  marginTop: '2rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: schoolId && isAdmin ? '#22c55e' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}
                  >
                    등록
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* FullCalendar 커스텀 스타일 */}
      <style>{`
        .fc-button {
          padding: ${isMobile ? '0.2rem 0.4rem' : '0.3rem 0.6rem'} !important;
          font-size: ${isMobile ? '0.8rem' : '0.9rem'} !important;
        }
        .fc-toolbar-title {
          font-size: ${isMobile ? '1.1rem' : '1.3rem'} !important;
        }
        
        /* 🆕 선택된 날짜 강조 효과 */
        .selected-date {
          background-color: #e3f2fd !important;
          border: 2px solid #2196f3 !important;
          border-radius: 4px !important;
        }
        
        /* 🆕 날짜 셀 호버 효과 */
        .fc-day:hover {
          background-color: #f5f5f5 !important;
          cursor: pointer !important;
        }
        
        /* 🔥 중요: 주말 배경색 유지 (토요일 파란색, 일요일 빨간색) */
        .fc-day-sun {
          background-color: #ffeaea !important;
        }
        
        .fc-day-sat {
          background-color: #eaf4ff !important;
        }

        /* 모바일 이벤트 스타일 */
        .mobile-event {
          font-size: 0.75rem !important;
          padding: 2px !important;
        }

        /* FullCalendar 전체 스타일 개선 */
        .fc {
          font-family: inherit;
        }

        .fc-event {
          border: none !important;
          border-radius: 4px !important;
          font-weight: 500 !important;
        }

        .fc-daygrid-event {
          margin: 1px !important;
        }

        .fc-button-primary {
          background-color: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }

        .fc-button-primary:hover {
          background-color: #2563eb !important;
          border-color: #2563eb !important;
        }

        .fc-button-primary:disabled {
          background-color: #9ca3af !important;
          border-color: #9ca3af !important;
        }

        .fc-today-button {
          background-color: #10b981 !important;
          border-color: #10b981 !important;
        }

        .fc-today-button:hover {
          background-color: #059669 !important;
          border-color: #059669 !important;
        }
      `}</style>
    </div>
  );
}

export default SchedulePage;