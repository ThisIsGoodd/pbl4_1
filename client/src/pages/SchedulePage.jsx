import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';

function SchedulePage() {
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');

  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [classroomInfo, setClassroomInfo] = useState(null);
  
  // 🆕 모달 관련 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    schoolWide: false
  });

  const token = localStorage.getItem('token');

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
  }, [token]);

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

  // 일정 목록 불러오기
  const fetchSchedules = async () => {
    if (!classroomId) return;

    try {
      const res = await fetch(`http://localhost:3001/api/schedules?classroom_id=${classroomId}`, {
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
  }, [token, classroomId]);

  // FullCalendar용 이벤트 데이터 변환
  const events = schedules.map((s) => ({
    id: s.schedule_id,
    title: s.title,
    start: s.start,
    end: s.end,
    extendedProps: {
      description: s.description,
      schoolWide: s.school_wide,
      createdBy: s.created_by
    },
    color: s.school_wide ? '#9DA7E3' : '#5ADD7D'
  }));

  // 날짜 클릭 핸들러
  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    if (myRole === 'teacher') {
      setScheduleForm({
        title: '',
        description: '',
        startDate: arg.dateStr,
        endDate: arg.dateStr,
        schoolWide: false
      });
      setIsModalOpen(true);
    }
  };

  // 일정 추가 핸들러
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    if (!scheduleForm.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: scheduleForm.title,
          description: scheduleForm.description,
          start_date: scheduleForm.startDate,
          end_date: scheduleForm.endDate,
          school_wide: scheduleForm.schoolWide,
          classroom_id: classroomId,
        }),
      });

      if (res.ok) {
        alert('일정이 등록되었습니다!');
        setIsModalOpen(false);
        fetchSchedules(); // 일정 목록 새로고침
        setScheduleForm({
          title: '',
          description: '',
          startDate: '',
          endDate: '',
          schoolWide: false
        });
      } else {
        const errorData = await res.json();
        alert('일정 등록에 실패했습니다: ' + errorData.error);
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
      const isInDate = selectedDate >= s.start && selectedDate <= s.end;
      const matchesSearch =
        s.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        s.description.toLowerCase().includes(searchKeyword.toLowerCase());
      return isInDate && (!searchKeyword || matchesSearch);
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
        fetchSchedules();
      } else {
        alert('삭제 실패');
      }
    } catch (err) {
      console.error('삭제 오류:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          {classroomInfo 
            ? `${classroomInfo.grade}학년 ${classroomInfo.class_number}반 일정` 
            : '일정 관리'}
        </h1>
        {myRole === 'teacher' && (
          <button 
            style={styles.addButton}
            onClick={() => {
              setScheduleForm({
                title: '',
                description: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                schoolWide: false
              });
              setIsModalOpen(true);
            }}
          >
            ➕ 일정 추가
          </button>
        )}
      </div>

      <div style={styles.layout}>
        {/* 왼쪽: 달력 */}
        <div style={styles.calendarSection}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            dateClick={handleDateClick}
            events={events}
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth'
            }}
            dayCellContent={(arg) => arg.date.getDate()}
          />
        </div>

        {/* 오른쪽: 일정 목록 */}
        <div style={styles.sidePanel}>
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

          {/* 선택된 날짜 표시 */}
          <div style={styles.dateSection}>
            <h3 style={styles.sectionTitle}>
              {selectedDate
                ? format(new Date(selectedDate), 'yyyy년 MM월 dd일')
                : '날짜를 선택하세요'}
            </h3>
          </div>

          {/* 일정 목록 */}
          <div style={styles.eventList}>
            {selectedDate && getEventsForSelectedDate().length === 0 && (
              <p style={styles.noEvents}>일정이 없습니다.</p>
            )}

            {selectedDate && getEventsForSelectedDate().map(s => (
              <div key={s.schedule_id} style={{
                ...styles.eventCard,
                borderLeft: `4px solid ${s.school_wide ? '#9DA7E3' : '#5ADD7D'}`
              }}>
                <div style={styles.eventHeader}>
                  <h4 style={styles.eventTitle}>{s.title}</h4>
                  <span style={{
                    ...styles.eventBadge,
                    backgroundColor: s.school_wide ? '#9DA7E3' : '#5ADD7D'
                  }}>
                    {s.school_wide ? '학교' : '학급'}
                  </span>
                </div>
                
                <p style={styles.eventDate}>
                  {s.start} ~ {s.end}
                </p>
                
                {s.description && (
                  <p style={styles.eventDescription}>{s.description}</p>
                )}

                {myRole === 'teacher' && s.created_by === myUserId && (
                  <button 
                    onClick={() => handleDelete(s.schedule_id)} 
                    style={styles.deleteButton}
                  >
                    🗑️ 삭제
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
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

              <div style={styles.formRow}>
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

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={scheduleForm.schoolWide}
                    onChange={(e) => setScheduleForm({...scheduleForm, schoolWide: e.target.checked})}
                    style={styles.checkbox}
                  />
                  학교 전체 일정으로 등록
                </label>
              </div>

              <div style={styles.buttonGroup}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={styles.cancelButton}
                >
                  취소
                </button>
                <button 
                  type="submit"
                  style={styles.submitButton}
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
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
    gap: '2rem',
    height: '70vh'
  },
  calendarSection: {
    flex: 2,
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  sidePanel: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column'
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
  noEvents: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: '2rem'
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
    width: '90%',
    maxWidth: '500px',
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
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666',
    padding: '0.25rem'
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
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  }
};

export default SchedulePage;