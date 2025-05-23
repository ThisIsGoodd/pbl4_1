import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import ScheduleWriteModal from './ScheduleWriteModal';

function SchedulePage() {
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');

  const [showModal, setShowModal] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const token = localStorage.getItem('token');

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

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    if (myRole === 'teacher') {
      setShowModal(true);
    }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제할까요?')) return;
    const res = await fetch(`http://localhost:3001/api/schedules/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      alert('삭제 완료');
      fetchSchedules();
    }
  };

  return (
    <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
      {/* 달력 */}
      <div style={{
        flex: 2,
        borderRadius: '1rem',
        boxShadow: '0 0 12px rgba(0,0,0,0.08)',
        padding: '1rem',
        backgroundColor: '#fff'
      }}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          dateClick={handleDateClick}
          events={events}
          height="auto"
        />
      </div>

      {/* 일정 목록 */}
      <div style={{
        flex: 1,
        borderRadius: '1rem',
        boxShadow: '0 0 12px rgba(0,0,0,0.08)',
        padding: '1.5rem',
        backgroundColor: '#fff'
      }}>
        <input
          type="text"
          placeholder="일정 제목 또는 내용 검색"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{
            width: '100%',
            marginBottom: '1rem',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <h3 style={{ marginBottom: '1rem' }}>
          {selectedDate
            ? format(new Date(selectedDate), 'yyyy년 MM월 dd일 일정')
            : '날짜를 선택하세요'}
        </h3>

        {selectedDate && getEventsForSelectedDate().length === 0 && (
          <p style={{ color: '#999' }}>일정이 없습니다.</p>
        )}

        {selectedDate && getEventsForSelectedDate().map(s => (
          <div key={s.schedule_id} style={{
            backgroundColor: '#fceef0',
            borderLeft: `6px solid ${s.school_wide ? '#9DA7E3' : '#5ADD7D'}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <strong>{s.title}</strong>{' '}
            <span style={{ color: s.school_wide ? '#9DA7E3' : '#5ADD7D' }}>
              [{s.school_wide ? '학교' : '학급'}]
            </span>
            <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {s.start} ~ {s.end}<br />
              {s.description}
            </div>
            {myRole === 'teacher' && s.created_by === myUserId && (
              <div style={{ marginTop: '0.5rem' }}>
                <button onClick={() => handleDelete(s.schedule_id)} style={{ color: 'red' }}>삭제</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <ScheduleWriteModal
          onClose={() => setShowModal(false)}
          onSubmit={fetchSchedules}
          classroomId={classroomId}
        />
      )}
    </div>
  );
}

export default SchedulePage;
