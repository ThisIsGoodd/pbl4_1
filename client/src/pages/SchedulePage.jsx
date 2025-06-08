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
  
  // 🆕 한국 공휴일 데이터 (2025년)
  // const holidays2025 = new Set([
  //   '2025-01-01', // 신정
  //   '2025-01-28', '2025-01-29', '2025-01-30', // 설날
  //   '2025-03-01', // 삼일절
  //   '2025-05-05', // 어린이날
  //   '2025-05-13', // 부처님오신날
  //   '2025-06-06', // 현충일
  //   '2025-08-15', // 광복절
  //   '2025-10-03', '2025-10-06', // 추석
  //   '2025-10-09', // 한글날
  //   '2025-12-25'  // 크리스마스
  // ]);
  
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
      } catch {
        return null;
      }
    };
    const payload = parseJwt(token);
    setMyUserId(payload?.user_id || null);
    setMyRole(payload?.role || null);
    setIsAdmin(payload?.is_admin || false);
    
    // 🆕 디버깅 로그 추가
    console.log('🔍 사용자 정보:', {
      userId: payload?.user_id,
      role: payload?.role, 
      isAdmin: payload?.is_admin,
      schoolId,
      classroomId
    });
  }, [token, schoolId, classroomId]);

  // 학급 정보 불러오기
  useEffect(() => {
    const fetchClassroomInfo = async () => {
      if (!classroomId) return;
      try {
        const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setClassroomInfo(data);
      } catch (err) {
        console.error('학급 정보 불러오기 실패:', err);
      }
    };
    fetchClassroomInfo();
  }, [classroomId, token]);

  // 🔥 날짜를 로컬 시간으로 처리하는 헬퍼 함수들
  const formatDateForServer = (dateString) => {
    // YYYY-MM-DD 형태의 날짜를 서버에 보낼 때 시간 정보 추가
    return `${dateString}T00:00:00`;
  };

  const formatDateFromServer = (dateTimeString) => {
    // 서버에서 받은 날짜를 YYYY-MM-DD 형태로 변환
    return dateTimeString.split('T')[0];
  };

  // 일정 목록 불러오기
  const fetchSchedules = async () => {
    try {
      let url;
      if (schoolId && isAdmin) {
        url = `http://localhost:3001/api/schedules/admin?school_id=${schoolId}`;
      } else if (classroomId) {
        url = `http://localhost:3001/api/schedules?classroom_id=${classroomId}`;
      } else {
        return;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSchedules(data.schedules || []);
    } catch (err) {
      console.error('일정 불러오기 실패:', err);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [token, classroomId, schoolId, isAdmin]);

  // FullCalendar용 이벤트 데이터 변환
  const events = schedules.map((s) => ({
    id: s.schedule_id,
    title: s.title,
    // 🔥 수정: 날짜만 사용하여 타임존 문제 방지
    start: formatDateFromServer(s.start),
    end: formatDateFromServer(s.end),
    allDay: true,
    extendedProps: {
      description: s.description,
      schoolWide: s.school_wide,
      createdBy: s.created_by
    },
    color: s.school_wide ? '#9DA7E3' : '#5ADD7D'
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

  // 선택된 날짜의 일정 필터링
  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    console.log('🔍 선택된 날짜:', selectedDate);
    console.log('📅 전체 일정 목록:', schedules);
    
    return schedules.filter(s => {
      // 🔥 수정: 서버에서 받은 날짜를 안전하게 처리
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

  return (
    <div style={{
      ...styles.container,
      padding: isMobile ? '1rem' : '2rem'
    }}>
      {/* 🆕 디버깅 정보 임시 표시 */}
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
      )}
      
      {/* 헤더 */}
      <div style={{
        ...styles.header,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '1rem' : '0'
      }}>
        <h1 style={{
          ...styles.title,
          fontSize: isMobile ? '1.5rem' : '2rem',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          {schoolId && isAdmin 
            ? '🏫 학교 전체 일정 관리'  // 🔥 수정: 이모지 추가
            : classroomInfo 
            ? `📚 ${classroomInfo.grade}학년 ${classroomInfo.class_number}반 일정` // 🔥 수정: 이모지 추가
            : '일정 관리'}
        </h1>
        {/* 🔥 수정: 버튼 텍스트와 조건 개선 */}
        {(myRole === 'teacher' || isAdmin) && (  // 🔥 수정: 조건 간소화
          <button 
            style={{
              ...styles.addButton,
              width: isMobile ? '100%' : 'auto',
              backgroundColor: schoolId && isAdmin ? '#28a745' : '#007bff'  // 🔥 추가: 색상 구분
            }}
            onClick={() => {
              console.log('🔍 일정 추가 버튼 클릭:', { myRole, isAdmin, schoolId, classroomId });
              setScheduleForm({
                title: '',
                description: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                schoolWide: schoolId ? true : false // 🔥 수정: schoolId 기준으로 설정
              });
              setIsModalOpen(true);
            }}
          >
            {/* 🔥 수정: 버튼 텍스트를 상황에 맞게 표시 */}
            {schoolId && isAdmin 
              ? '🏫 학교 전체 일정 추가'
              : '📅 일정 추가'}
          </button>
        )}
      </div>

      <div style={{
        ...styles.layout,
        flexDirection: isMobile ? 'column' : 'row',
        height: isMobile ? 'auto' : '70vh'
      }}>
        {/* 왼쪽: 달력 */}
        <div style={{
          ...styles.calendarSection,
          flex: isMobile ? 'none' : 2,
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
            // 🆕 시간 표시 관련 설정 추가
            displayEventTime={false} // 이벤트에 시간 표시 안 함
            eventTimeFormat={{ // 혹시 시간이 표시될 경우의 포맷
              hour: 'numeric',
              minute: '2-digit',
              omitZeroMinute: true
            }}
            // 기존 날짜별 색상 처리
            dayCellContent={(arg) => {
              const date = arg.date;
              const dateStr = date.toISOString().split('T')[0];
              const dayOfWeek = date.getDay();
              //const isHoliday = holidays2025.has(dateStr);
              
              let color = '#333';
              if (dayOfWeek === 0 /*|| isHoliday*/) {
                color = '#dc3545';
              } else if (dayOfWeek === 6) {
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
          ...styles.sidePanel,
          flex: isMobile ? 'none' : 1
        }}>
          {/* 검색창 */}
          <div style={styles.searchSection}>
            <input
              type="text"
              placeholder="일정 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* 이벤트 상세보기 */}
          {selectedEvent ? (
            <div style={styles.eventDetailSection}>
              <div style={styles.detailHeader}>
                <h3 style={styles.sectionTitle}>📋 일정 상세</h3>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  style={styles.closeButton}
                >
                  ✕
                </button>
              </div>
              
              <div style={styles.eventDetail}>
                <h4 style={styles.eventDetailTitle}>{selectedEvent.title}</h4>
                
                <div style={styles.eventBadgeContainer}>
                  <span style={{
                    ...styles.eventBadge,
                    backgroundColor: selectedEvent.school_wide ? '#9DA7E3' : '#5ADD7D'
                  }}>
                    {selectedEvent.school_wide ? '🏫 학교' : '📚 학급'}
                  </span>
                </div>

                {selectedEvent.description && (
                  <div style={styles.eventDetailDescription}>
                    {selectedEvent.description}
                  </div>
                )}
                
                <div style={styles.eventDetailDate}>
                  📅 {formatDateRange(selectedEvent.start, selectedEvent.end)}
                </div>

                {(myRole === 'teacher' || isAdmin) && selectedEvent.created_by === myUserId && (
                  <button 
                    onClick={() => handleDelete(selectedEvent.schedule_id)} 
                    style={styles.deleteButton}
                  >
                    🗑️ 삭제
                  </button>
                )}
              </div>
            </div>
          ) : (
            // 기존 날짜별 일정 목록
            <>
              <div style={styles.dateSection}>
                <h3 style={styles.sectionTitle}>
                  {selectedDate
                    ? format(new Date(selectedDate), 'yyyy년 MM월 dd일')
                    : '날짜를 선택하거나 일정을 클릭하세요'}
                </h3>
              </div>

              <div style={styles.eventList}>
                {selectedDate && getEventsForSelectedDate().length === 0 && (
                  <div style={styles.noEventsContainer}>
                    <p style={styles.noEvents}>이 날짜에는 일정이 없습니다.</p>
                    {(myRole === 'teacher' || isAdmin) && (
                      <button 
                        style={styles.addEventButton}
                        onClick={() => {
                          setScheduleForm({
                            title: '',
                            description: '',
                            startDate: selectedDate,
                            endDate: selectedDate,
                            schoolWide: (isAdmin && schoolId) ? true : false // 🆕 학교 전체 관리자는 기본값 true
                          });
                          setIsModalOpen(true);
                        }}
                      >
                        ➕ 이 날짜에 일정 추가
                      </button>
                    )}
                  </div>
                )}

                {selectedDate && getEventsForSelectedDate().length > 0 && (
                  <>
                    {(myRole === 'teacher' || isAdmin) && (
                      <div style={styles.addButtonContainer}>
                        <button 
                          style={styles.addEventButton}
                          onClick={() => {
                            setScheduleForm({
                              title: '',
                              description: '',
                              startDate: selectedDate,
                              endDate: selectedDate,
                              schoolWide: (isAdmin && schoolId) ? true : false // 🆕 학교 전체 관리자는 기본값 true
                            });
                            setIsModalOpen(true);
                          }}
                        >
                          ➕ 일정 추가
                        </button>
                      </div>
                    )}
                    
                    {getEventsForSelectedDate().map(s => (
                      <div key={s.schedule_id} style={{
                        ...styles.eventCard,
                        borderLeft: `4px solid ${s.school_wide ? '#9DA7E3' : '#5ADD7D'}`
                      }}>
                        <div style={styles.eventHeader}>
                          <h4 
                            style={{...styles.eventTitle, cursor: 'pointer'}}
                            onClick={() => setSelectedEvent(s)}
                          >
                            {s.title}
                          </h4>
                          <span style={{
                            ...styles.eventBadge,
                            backgroundColor: s.school_wide ? '#9DA7E3' : '#5ADD7D'
                          }}>
                            {s.school_wide ? '학교' : '학급'}
                          </span>
                        </div>
                        
                        {s.description && (
                          <p style={styles.eventDescription}>{s.description}</p>
                        )}

                        <p style={styles.eventDate}>
                          {formatDateRange(s.start, s.end)}
                        </p>

                        {(myRole === 'teacher' || isAdmin) && s.created_by === myUserId && (
                          <button 
                            onClick={() => handleDelete(s.schedule_id)} 
                            style={styles.deleteButton}
                          >
                            🗑️ 삭제
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={{
            ...styles.modal,
            width: isMobile ? '95%' : '90%',
            maxWidth: isMobile ? '400px' : '500px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>일정 추가</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>제목 *</label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                  style={styles.input}
                  placeholder="일정 제목을 입력하세요"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>설명</label>
                <textarea
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
                  style={styles.textarea}
                  placeholder="일정 설명을 입력하세요"
                  rows="3"
                />
              </div>

              <div style={{
                ...styles.formRow,
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '1rem' : '1rem'
              }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>시작일 *</label>
                  <input
                    type="date"
                    value={scheduleForm.startDate}
                    onChange={(e) => setScheduleForm({...scheduleForm, startDate: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>종료일 *</label>
                  <input
                    type="date"
                    value={scheduleForm.endDate}
                    onChange={(e) => setScheduleForm({...scheduleForm, endDate: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              {/* 🆕 학교 전체/학급 일정 선택 (일반 교사만 표시) */}
              {myRole === 'teacher' && classroomId && !schoolId && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>📍 일정 범위 선택</label>
                  <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
                    <label style={{
                      ...styles.radioLabel,
                      backgroundColor: !scheduleForm.schoolWide ? '#e3f2fd' : '#f8f9fa',
                      borderColor: !scheduleForm.schoolWide ? '#2196f3' : '#e9ecef'
                    }}>
                      <input
                        type="radio"
                        name="scheduleScope"
                        checked={!scheduleForm.schoolWide}
                        onChange={() => setScheduleForm({...scheduleForm, schoolWide: false})}
                        style={styles.radio}
                      />
                      📚 학급 일정 (우리 학급에만 표시)
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                        {classroomInfo?.grade}학년 {classroomInfo?.class_number}반 학생들만 볼 수 있습니다
                      </div>
                    </label>
                    <label style={{
                      ...styles.radioLabel,
                      backgroundColor: scheduleForm.schoolWide ? '#e8f5e8' : '#f8f9fa',
                      borderColor: scheduleForm.schoolWide ? '#4caf50' : '#e9ecef'
                    }}>
                      <input
                        type="radio"
                        name="scheduleScope"
                        checked={scheduleForm.schoolWide}
                        onChange={() => setScheduleForm({...scheduleForm, schoolWide: true})}
                        style={styles.radio}
                      />
                      🏫 학교 전체 일정 (모든 학급에 표시)
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                        학교 전체 학급의 모든 학생과 학부모가 볼 수 있습니다
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* 🆕 학교 전체 관리자 안내 메시지 */}
              {schoolId && isAdmin && (
                <div style={styles.adminNotice}>
                  🏫 <strong>학교 전체 관리자</strong>로서 모든 학급에 표시되는 학교 전체 일정을 작성합니다.
                  <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#2e7d32' }}>
                    • 모든 학급의 학생과 학부모가 볼 수 있습니다<br/>
                    • 중요한 학교 행사나 전체 공지 일정에 사용하세요
                  </div>
                </div>
              )}

              <div style={{
                ...styles.buttonGroup,
                flexDirection: isMobile ? 'column' : 'row',
                gap: '1rem'
              }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    ...styles.cancelButton,
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  취소
                </button>
                <button 
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  일정 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🆕 모바일 전용 커스텀 CSS + 날짜 셀 강조 */}
      <style jsx>{`
        .fc-event {
          font-size: ${isMobile ? '11px' : '12px'} !important;
          padding: ${isMobile ? '1px 2px' : '2px 4px'} !important;
          margin-bottom: 1px !important;
        }
        .fc-daygrid-event {
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .mobile-event {
          min-height: 16px !important;
        }
        .fc-day-today {
          background-color: #fff3cd !important;
        }
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
        
        /* 공휴일 배경색 */
        .fc-day-sun {
          background-color: #ffeaea !important;
        }
        
        .fc-day-sat {
          background-color: #eaf4ff !important;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  addButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  layout: {
    display: 'flex',
    gap: '2rem'
  },
  calendarSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  sidePanel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '70vh',
    overflowY: 'auto'
  },
  searchSection: {
    marginBottom: '1.5rem'
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem'
  },
  eventDetailSection: {
    flex: 1
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #eee'
  },
  eventDetail: {
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  eventDetailTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#333'
  },
  eventBadgeContainer: {
    marginBottom: '1rem'
  },
  eventDetailDescription: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '6px',
    lineHeight: '1.6',
    color: '#555'
  },
  eventDetailDate: {
    fontSize: '1rem',
    color: '#666',
    fontWeight: '500',
    marginBottom: '1.5rem'
  },
  dateSection: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #eee'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#333'
  },
  eventList: {
    flex: 1,
    overflowY: 'auto'
  },
  noEventsContainer: {
    textAlign: 'center',
    marginTop: '2rem'
  },
  noEvents: {
    color: '#999',
    fontStyle: 'italic',
    marginBottom: '1rem'
  },
  addButtonContainer: {
    marginBottom: '1rem',
    textAlign: 'center'
  },
  addEventButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  },
  eventCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem'
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.5rem'
  },
  eventTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#333'
  },
  eventBadge: {
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  eventDate: {
    margin: '0.5rem 0',
    fontSize: '0.9rem',
    color: '#666'
  },
  eventDescription: {
    margin: '0.5rem 0',
    fontSize: '0.9rem',
    color: '#555',
    lineHeight: '1.4'
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    marginTop: '0.5rem'
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666',
    padding: '0.25rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#333'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  formRow: {
    display: 'flex',
    gap: '1rem'
  },
  label: {
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: '#333'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem'
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    resize: 'vertical'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    padding: '0.5rem',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    backgroundColor: '#f8f9fa',
    transition: 'all 0.2s ease'
  },
  radio: {
    transform: 'scale(1.1)',
    margin: 0
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  checkbox: {
    transform: 'scale(1.2)'
  },
  adminNotice: {
    padding: '1rem',
    backgroundColor: '#e8f5e8',
    border: '1px solid #4caf50',
    borderRadius: '8px',
    fontSize: '0.95rem',
    color: '#2e7d32',
    borderLeft: '4px solid #4caf50'
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1rem'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: '#f8f9fa',
    color: '#495057',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  }
};

export default SchedulePage;
                