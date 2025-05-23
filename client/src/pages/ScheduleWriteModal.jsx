import React, { useState } from 'react';

function ScheduleWriteModal({ onClose, onSubmit, classroomId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [schoolWide, setSchoolWide] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const res = await fetch('http://localhost:3001/api/schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        school_wide: schoolWide,
        classroom_id: classroomId,
      }),
    });

    if (res.ok) {
      onSubmit(); // 새 일정 반영 또는 새로고침 트리거
      onClose();  // 모달 닫기
    } else {
      alert('일정 등록에 실패했습니다.');
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>일정 등록</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="설명"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div>
            <label>시작일:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label>종료일:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <label>
            <input
              type="checkbox"
              checked={schoolWide}
              onChange={(e) => setSchoolWide(e.target.checked)}
            />
            학교 전체 일정
          </label>
          <br />
          <button type="submit">등록</button>
          <button type="button" onClick={onClose}>취소</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    width: '400px',
  },
};

export default ScheduleWriteModal;
