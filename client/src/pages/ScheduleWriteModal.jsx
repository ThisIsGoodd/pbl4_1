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
    <div className="schedule-modal-overlay" onClick={onClose}>
      <div className="schedule-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="schedule-modal-header">
          <h2>일정 등록</h2>
          <button type="button" onClick={onClose} className="close-button">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="schedule-form">
          <div className="form-group">
            <label>제목</label>
            <input
              type="text"
              placeholder="일정 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>설명</label>
            <textarea
              placeholder="일정 설명을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            />
          </div>

          <div className="date-row">
            <div className="date-group">
              <label>시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="date-group">
              <label>종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={schoolWide}
                onChange={(e) => setSchoolWide(e.target.checked)}
              />
              <span>학교 전체 일정</span>
            </label>
          </div>

          <div className="button-row">
            <button type="button" onClick={onClose} className="cancel-button">
              취소
            </button>
            <button type="submit" className="submit-button">
              등록
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .schedule-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .schedule-modal-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .schedule-modal-header {
          background: rgba(248, 250, 252, 0.8);
          backdrop-filter: blur(5px);
          padding: 1.5rem 2rem;
          border-bottom: 1px solid rgba(226, 232, 240, 0.6);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .schedule-modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #64748b;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: rgba(226, 232, 240, 0.6);
          color: #374151;
        }

        .schedule-form {
          padding: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid rgba(226, 232, 240, 0.8);
          border-radius: 8px;
          font-size: 0.9rem;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.8);
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          font-family: inherit;
        }

        .date-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .date-group {
          flex: 1;
        }

        .date-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }

        .date-group input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid rgba(226, 232, 240, 0.8);
          border-radius: 8px;
          font-size: 0.9rem;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.8);
        }

        .date-group input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .checkbox-group {
          margin-bottom: 2rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 0.9rem;
          color: #374151;
        }

        .checkbox-label input {
          margin-right: 0.5rem;
          transform: scale(1.1);
        }

        .button-row {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .submit-button,
        .cancel-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .submit-button {
          background: #4f46e5;
          color: white;
        }

        .submit-button:hover {
          background: #3730a3;
          transform: translateY(-1px);
        }

        .cancel-button {
          background: #64748b;
          color: white;
        }

        .cancel-button:hover {
          background: #475569;
          transform: translateY(-1px);
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .schedule-modal-container {
            margin: 0.5rem;
            max-width: calc(100% - 1rem);
          }

          .schedule-modal-header {
            padding: 1rem 1.5rem;
          }

          .schedule-form {
            padding: 1.5rem;
          }

          .date-row {
            flex-direction: column;
            gap: 0;
          }

          .button-row {
            flex-direction: column;
          }

          .submit-button,
          .cancel-button {
            width: 100%;
            order: 1;
          }

          .cancel-button {
            order: 2;
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ScheduleWriteModal;