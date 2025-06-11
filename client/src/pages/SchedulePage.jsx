import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function SchedulePage() {
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');
  const schoolId = searchParams.get('school_id');
  const initialDate = searchParams.get('date');

  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(initialDate || null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [classroomInfo, setClassroomInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    schoolWide: false
  });

  const token = localStorage.getItem('token');

  // 반응형 처리
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
      } catch {
        return null;
      }
    };

    if (token) {
      const decoded = parseJwt(token);
      if (decoded) {
        setMyUserId(decoded.user_id);
        setMyRole(decoded.role);
        setIsAdmin(decoded.is_admin === true || decoded.is_admin === 1);
      }
    }
  }, [token]);

  // 학급 정보 가져오기
  useEffect(() => {
    const fetchClassroomInfo = async () => {
      if (!classroomId) return;
      
      try {
        const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setClassroomInfo(data.classroom);
        }
      } catch (err) {
        console.error('학급 정보 가져오기 실패:', err);
      }
    };

    fetchClassroomInfo();
  }, [classroomId, token]);

  // 캘린더 렌더링 후 주말 색상 적용
  useEffect(() => {
    const applyWeekendColors = () => {
      // 헤더 요일명 색상 적용
      const headerCells = document.querySelectorAll('.fc-col-header-cell');
      headerCells.forEach((cell, index) => {
        const cushion = cell.querySelector('.fc-col-header-cell-cushion');
        if (cushion) {
          if (index === 0) { // 일요일
            cushion.style.color = '#dc2626';
            cushion.style.fontWeight = '600';
          } else if (index === 6) { // 토요일
            cushion.style.color = '#2563eb';
            cushion.style.fontWeight = '600';
          }
        }
      });

      // 날짜 숫자 색상 적용
      const dayCells = document.querySelectorAll('.fc-daygrid-day');
      dayCells.forEach(cell => {
        const dateStr = cell.getAttribute('data-date');
        if (dateStr) {
          const date = new Date(dateStr);
          const dayOfWeek = date.getDay();
          const dayNumber = cell.querySelector('.fc-daygrid-day-number');
          
          if (dayNumber) {
            if (dayOfWeek === 0) { // 일요일
              dayNumber.style.color = '#dc2626';
              dayNumber.style.fontWeight = '600';
              dayNumber.classList.add('weekend-sunday');
            } else if (dayOfWeek === 6) { // 토요일
              dayNumber.style.color = '#2563eb';
              dayNumber.style.fontWeight = '600';
              dayNumber.classList.add('weekend-saturday');
            }
          }
        }
      });
    };

    // 컴포넌트 마운트 후 잠시 대기하여 적용
    const timer = setTimeout(applyWeekendColors, 100);
    
    // 캘린더 이벤트가 변경될 때마다 다시 적용
    const observer = new MutationObserver(applyWeekendColors);
    const calendarElement = document.querySelector('.fc');
    if (calendarElement) {
      observer.observe(calendarElement, {
        childList: true,
        subtree: true
      });
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [schedules]); // schedules가 변경될 때마다 재적용

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      let url = '';
      if (schoolId) {
        url = `http://localhost:3001/api/schedules?school_id=${schoolId}`;
      } else if (classroomId) {
        url = `http://localhost:3001/api/schedules?classroom_id=${classroomId}`;
      } else {
        console.error('❌ classroomId 또는 schoolId가 필요합니다.');
        return;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      } else {
        console.error('일정 가져오기 실패:', res.status);
      }
    } catch (err) {
      console.error('일정 가져오기 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜 포맷 함수
  const formatDateFromServer = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // FullCalendar용 이벤트 변환
  const calendarEvents = schedules.map(schedule => ({
    id: schedule.schedule_id,
    title: schedule.title,
    start: formatDateFromServer(schedule.start),
    end: formatDateFromServer(schedule.end),
    backgroundColor: schedule.school_wide ? '#667eea' : '#10b981',
    borderColor: schedule.school_wide ? '#4f46e5' : '#059669',
    textColor: '#ffffff'
  }));

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
    setSelectedDate(arg.dateStr);
    setSelectedEvent(null);
  };

  // 일정 추가 핸들러
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    if (!scheduleForm.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      const requestBody = {
        title: scheduleForm.title,
        description: scheduleForm.description,
        start_date: scheduleForm.startDate,
        end_date: scheduleForm.endDate,
        school_wide: scheduleForm.schoolWide
      };

      if (schoolId) {
        // 학교 전체 관리자
      } else if (classroomId) {
        requestBody.classroom_id = classroomId;
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
        alert('일정 등록에 실패했습니다: ' + (errorData.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('일정 등록 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  // 선택된 날짜의 일정 필터링
  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    return schedules.filter(s => {
      const startDate = formatDateFromServer(s.start);
      const endDate = formatDateFromServer(s.end);
      const selectedDateStr = selectedDate;
      
      const isInDateRange = selectedDateStr >= startDate && selectedDateStr <= endDate;
      const matchesSearch = !searchKeyword || 
        s.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchKeyword.toLowerCase()));
      
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

  // 날짜 포맷 함수
  const formatDateRange = (startDate, endDate) => {
    const start = formatDateFromServer(startDate);
    const end = formatDateFromServer(endDate);
    
    if (start === end) {
      return start;
    } else {
      return `${start} ~ ${end}`;
    }
  };

  if (isLoading) {
    return (
      <div className="schedule-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <div className="title-section">
              <h1 className="page-title">
                📅 학급 일정
              </h1>
              <p className="page-subtitle">
                {classroomInfo 
                  ? `${classroomInfo.grade}학년 ${classroomInfo.class_number}반 일정표`
                  : '일정을 확인하고 관리하세요'
                }
              </p>
            </div>
            
            {(myRole === 'teacher' || isAdmin) && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="add-button"
              >
                <span className="button-icon">➕</span>
                일정 추가
              </button>
            )}
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className={`content-layout ${isMobile ? 'mobile' : ''}`}>
          {/* 캘린더 섹션 */}
          <div className="calendar-section">
            <div className="calendar-container">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate={initialDate}
                events={calendarEvents}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                height={isMobile ? 400 : 600}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: ''
                }}
                locale="ko"
                dayMaxEvents={isMobile ? 2 : 3}
                eventDisplay="block"
                dayHeaderFormat={{ weekday: 'short' }}
                titleFormat={{ year: 'numeric', month: 'long' }}
              />
            </div>
          </div>

          {/* 사이드 패널 */}
          <div className="side-panel">
            {/* 검색 섹션 */}
            <div className="search-section">
              <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="일정 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* 이벤트 상세보기 또는 날짜별 일정 */}
            {selectedEvent ? (
              <div className="event-detail-section">
                <div className="section-header">
                  <h3 className="section-title">
                    <span className="section-icon">📋</span>
                    일정 상세
                  </h3>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="close-button"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="event-detail">
                  <h4 className="event-title">{selectedEvent.title}</h4>
                  
                  <div className="event-badge-container">
                    <span className={`event-badge ${selectedEvent.school_wide ? 'school' : 'classroom'}`}>
                      {selectedEvent.school_wide ? '🏫 학교' : '📚 학급'}
                    </span>
                  </div>

                  {selectedEvent.description && (
                    <div className="event-description">
                      <strong>상세 내용:</strong>
                      <p>{selectedEvent.description}</p>
                    </div>
                  )}
                  
                  <div className="event-date">
                    <strong>📅 일정:</strong>
                    <span>{formatDateRange(selectedEvent.start, selectedEvent.end)}</span>
                  </div>

                  {(myRole === 'teacher' || isAdmin) && selectedEvent.created_by === myUserId && (
                    <button 
                      onClick={() => handleDelete(selectedEvent.schedule_id)} 
                      className="delete-button"
                    >
                      <span className="button-icon">🗑️</span>
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="date-events-section">
                <h3 className="section-title">
                  <span className="section-icon">📋</span>
                  {selectedDate 
                    ? `${selectedDate} 일정`
                    : '날짜를 선택하세요'
                  }
                </h3>
                
                {selectedDate ? (
                  <div className="events-list">
                    {getEventsForSelectedDate().length > 0 ? (
                      getEventsForSelectedDate().map(event => (
                        <div 
                          key={event.schedule_id} 
                          className="event-item"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="event-item-header">
                            <h4 className="event-item-title">{event.title}</h4>
                            <span className={`event-badge ${event.school_wide ? 'school' : 'classroom'}`}>
                              {event.school_wide ? '🏫' : '📚'}
                            </span>
                          </div>
                          {event.description && (
                            <p className="event-item-description">{event.description}</p>
                          )}
                          <div className="event-item-date">
                            {formatDateRange(event.start, event.end)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-events">
                        <span className="no-events-icon">📭</span>
                        <p>해당 날짜에 일정이 없습니다.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-date-selected">
                    <span className="calendar-icon">📅</span>
                    <p>캘린더에서 날짜를 클릭하여<br/>해당 날짜의 일정을 확인하세요.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <span className="modal-icon">➕</span>
                새 일정 추가
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">제목</span>
                  <span className="label-required">*</span>
                </label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                  placeholder="일정 제목을 입력하세요"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">상세 내용</span>
                </label>
                <textarea
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
                  placeholder="상세 내용을 입력하세요"
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-text">시작일</span>
                    <span className="label-required">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.startDate}
                    onChange={(e) => setScheduleForm({...scheduleForm, startDate: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-text">종료일</span>
                    <span className="label-required">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.endDate}
                    onChange={(e) => setScheduleForm({...scheduleForm, endDate: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={scheduleForm.schoolWide}
                      onChange={(e) => setScheduleForm({...scheduleForm, schoolWide: e.target.checked})}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">
                      🏫 학교 전체 일정으로 등록
                    </span>
                  </label>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="button-secondary"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="button-primary"
                >
                  <span className="button-icon">✅</span>
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        /* CSS 변수 정의 */
        .schedule-page {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-glass: rgba(255, 255, 255, 0.95);
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --accent-color: #4f46e5;
          --accent-hover: #4338ca;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --error-color: #ef4444;
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
        }

        /* 다크모드 */
        @media (prefers-color-scheme: dark) {
          .schedule-page {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-glass: rgba(15, 23, 42, 0.95);
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --text-muted: #64748b;
            --border-color: #334155;
          }
        }

        .schedule-page {
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
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        /* 로딩 상태 */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: white;
          text-align: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 헤더 */
        .header {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-xl);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .title-section {
          flex: 1;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.5rem 0;
        }

        .page-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin: 0;
          font-weight: 500;
        }

        .add-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
        }

        .add-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .button-icon {
          font-size: 1.1rem;
        }

        /* 메인 컨텐츠 레이아웃 */
        .content-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        .content-layout.mobile {
          grid-template-columns: 1fr;
        }

        /* 캘린더 섹션 */
        .calendar-section {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .calendar-container {
          /* FullCalendar 스타일 오버라이드 */
        }

        :global(.fc) {
          font-family: inherit;
        }

        :global(.fc-header-toolbar) {
          margin-bottom: 1.5rem;
        }

        :global(.fc-button-primary) {
          background-color: var(--accent-color) !important;
          border-color: var(--accent-color) !important;
        }

        :global(.fc-button-primary:hover) {
          background-color: var(--accent-hover) !important;
          border-color: var(--accent-hover) !important;
        }

        :global(.fc-daygrid-day:hover) {
          background-color: rgba(79, 70, 229, 0.05);
          cursor: pointer;
        }

        :global(.fc-day-today) {
          background-color: rgba(79, 70, 229, 0.1) !important;
        }

        :global(.selected-date) {
          background-color: rgba(79, 70, 229, 0.2) !important;
        }

        /* 주말 색상 스타일 - 다양한 셀렉터로 적용 */
        :global(.fc-day-sat .fc-daygrid-day-number),
        :global(.fc-daygrid-day[data-date*="-06"] .fc-daygrid-day-number),
        :global(.fc-day:nth-child(7) .fc-daygrid-day-number) {
          color: #2563eb !important;
          font-weight: 600;
        }

        :global(.fc-day-sun .fc-daygrid-day-number),
        :global(.fc-daygrid-day[data-date*="-01"] .fc-daygrid-day-number),
        :global(.fc-day:nth-child(1) .fc-daygrid-day-number) {
          color: #dc2626 !important;
          font-weight: 600;
        }

        /* 헤더 요일명 색상 */
        :global(.fc-col-header-cell.fc-day-sat .fc-col-header-cell-cushion),
        :global(.fc-col-header-cell:nth-child(7) .fc-col-header-cell-cushion) {
          color: #2563eb !important;
          font-weight: 600;
        }

        :global(.fc-col-header-cell.fc-day-sun .fc-col-header-cell-cushion),
        :global(.fc-col-header-cell:nth-child(1) .fc-col-header-cell-cushion) {
          color: #dc2626 !important;
          font-weight: 600;
        }

        /* JavaScript로 동적 적용을 위한 추가 스타일 */
        :global(.weekend-saturday) {
          color: #2563eb !important;
          font-weight: 600;
        }

        :global(.weekend-sunday) {
          color: #dc2626 !important;
          font-weight: 600;
        }

        /* 다크모드에서도 주말 색상 유지 */
        @media (prefers-color-scheme: dark) {
          :global(.fc-day-sat .fc-daygrid-day-number),
          :global(.fc-daygrid-day[data-date*="-06"] .fc-daygrid-day-number),
          :global(.fc-day:nth-child(7) .fc-daygrid-day-number),
          :global(.weekend-saturday) {
            color: #60a5fa !important;
          }

          :global(.fc-day-sun .fc-daygrid-day-number),
          :global(.fc-daygrid-day[data-date*="-01"] .fc-daygrid-day-number),
          :global(.fc-day:nth-child(1) .fc-daygrid-day-number),
          :global(.weekend-sunday) {
            color: #f87171 !important;
          }

          :global(.fc-col-header-cell.fc-day-sat .fc-col-header-cell-cushion),
          :global(.fc-col-header-cell:nth-child(7) .fc-col-header-cell-cushion) {
            color: #60a5fa !important;
          }

          :global(.fc-col-header-cell.fc-day-sun .fc-col-header-cell-cushion),
          :global(.fc-col-header-cell:nth-child(1) .fc-col-header-cell-cushion) {
            color: #f87171 !important;
          }
        }

        /* 사이드 패널 */
        .side-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* 검색 섹션 */
        .search-section {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          font-size: 1.1rem;
          color: var(--text-muted);
        }

        .search-input {
          width: 100%;
          padding: 1rem 1rem 1rem 2.5rem;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 1rem;
          color: var(--text-primary);
          background: var(--bg-primary);
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .search-input::placeholder {
          color: var(--text-muted);
        }

        /* 섹션 공통 스타일 */
        .event-detail-section,
        .date-events-section {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.3);
          flex: 1;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-icon {
          font-size: 1.3rem;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.2rem;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        /* 이벤트 상세 */
        .event-detail {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .event-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .event-badge-container {
          display: flex;
          gap: 0.5rem;
        }

        .event-badge {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
        }

        .event-badge.school {
          background: linear-gradient(135deg, #667eea 0%, #4f46e5 100%);
        }

        .event-badge.classroom {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .event-description {
          background: var(--bg-secondary);
          padding: 1rem;
          border-radius: var(--radius-md);
          border-left: 4px solid var(--accent-color);
        }

        .event-description strong {
          color: var(--text-primary);
          display: block;
          margin-bottom: 0.5rem;
        }

        .event-description p {
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .event-date {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
        }

        .event-date strong {
          color: var(--text-primary);
          font-weight: 600;
        }

        .event-date span {
          color: var(--text-secondary);
        }

        .delete-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, var(--error-color) 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 1rem;
        }

        .delete-button:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        /* 이벤트 목록 */
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .event-item {
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .event-item:hover {
          border-color: var(--accent-color);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .event-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .event-item-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .event-item-description {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin: 0 0 0.5rem 0;
          line-height: 1.4;
        }

        .event-item-date {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        /* 빈 상태 */
        .no-events,
        .no-date-selected {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
          color: var(--text-muted);
        }

        .no-events-icon,
        .calendar-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .no-events p,
        .no-date-selected p {
          margin: 0;
          line-height: 1.5;
        }

        /* 모달 */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          border: 1px solid rgba(255, 255, 255, 0.3);
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem 2rem 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .modal-icon {
          font-size: 1.4rem;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.3rem;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .modal-form {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* 폼 요소 */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-label {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.95rem;
        }

        .label-text {
          color: var(--text-primary);
        }

        .label-required {
          color: var(--error-color);
        }

        .form-input,
        .form-textarea {
          padding: 1rem;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 1rem;
          color: var(--text-primary);
          background: var(--bg-primary);
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: var(--text-muted);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
        }

        .checkbox-label:hover {
          background: var(--border-color);
        }

        .checkbox-input {
          margin: 0;
          accent-color: var(--accent-color);
          transform: scale(1.2);
        }

        .checkbox-text {
          color: var(--text-primary);
          font-weight: 500;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .button-primary,
        .button-secondary {
          flex: 1;
          padding: 1rem 1.5rem;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .button-primary {
          background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
          color: white;
          box-shadow: var(--shadow-md);
        }

        .button-primary:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .button-secondary {
          background: var(--bg-primary);
          color: var(--text-primary);
          border: 2px solid var(--border-color);
        }

        .button-secondary:hover {
          background: var(--bg-secondary);
          border-color: var(--accent-color);
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .schedule-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
            margin-bottom: 1rem;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .page-subtitle {
            font-size: 1rem;
          }

          .content-layout {
            gap: 1rem;
          }

          .calendar-section,
          .search-section,
          .event-detail-section,
          .date-events-section {
            padding: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .modal {
            margin: 1rem;
          }

          .modal-header,
          .modal-form {
            padding: 1.5rem;
          }

          .modal-actions {
            flex-direction: column;
          }
        }

        /* 태블릿 */
        @media (max-width: 1024px) and (min-width: 769px) {
          .container {
            max-width: 100%;
          }

          .content-layout {
            grid-template-columns: 1.5fr 1fr;
          }
        }

        /* 접근성 개선 */
        .form-input:focus,
        .form-textarea:focus,
        .search-input:focus,
        .add-button:focus,
        .delete-button:focus,
        .button-primary:focus,
        .button-secondary:focus,
        .close-button:focus,
        .modal-close:focus {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }

        .event-item:focus {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
          border-color: var(--accent-color);
        }

        /* 프린트 스타일 */
        @media print {
          .schedule-page {
            background: white;
            padding: 0;
          }

          .header,
          .calendar-section,
          .search-section,
          .event-detail-section,
          .date-events-section {
            background: white;
            box-shadow: none;
            border: 1px solid #ccc;
          }

          .add-button,
          .delete-button,
          .modal-overlay {
            display: none;
          }

          .content-layout {
            display: block;
          }

          .side-panel {
            margin-top: 2rem;
          }
        }

        /* 애니메이션 */
        .calendar-section {
          animation: slideUp 0.6s ease-out;
        }

        .side-panel > * {
          animation: slideUp 0.6s ease-out;
        }

        .side-panel > *:nth-child(2) {
          animation-delay: 0.1s;
        }

        .side-panel > *:nth-child(3) {
          animation-delay: 0.2s;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal {
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default SchedulePage;