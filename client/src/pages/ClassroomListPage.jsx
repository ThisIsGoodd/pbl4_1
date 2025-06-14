import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ClassroomListPage = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [activeClassroomId, setActiveClassroomId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:3001/api/classrooms/user/joined-classrooms',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const fetchedClassrooms = response.data.classrooms || [];
      setClassrooms(fetchedClassrooms);
      setActiveClassroomId(response.data.activeClassroomId || null);
      
      // 학급이 없으면 학급 생성 페이지로 이동
      if (fetchedClassrooms.length === 0) {
        navigate('/classroom/create');
        return;
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      setClassrooms([]);
      // 에러 발생 시에도 학급 생성 페이지로 이동
      navigate('/classroom/create');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveClassroom = async (classroomId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:3001/api/classrooms/user/set-active',
        { classroom_id: classroomId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      navigate(`/main?classroom_id=${classroomId}`);
    } catch (error) {
      console.error('Error setting active classroom:', error);
      alert('학급 전환에 실패했습니다.');
    }
  };

  const handleJoinClassroom = async () => {
    setJoinError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3001/api/classrooms/join-additional',
        { invite_code: inviteCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.classroom) {
        setShowJoinModal(false);
        setInviteCode('');
        
        const newClassroomId = response.data.classroom.classroom_id;
        navigate(`/main?classroom_id=${newClassroomId}`);
      }
    } catch (error) {
      setJoinError(error.response?.data?.error || '학급 가입에 실패했습니다.');
    }
  };

  const handleLeaveClassroom = async (classroomId, schoolName, grade, classNumber) => {
    const classroomName = `${schoolName} ${grade}학년 ${classNumber}반`;
    
    if (!window.confirm(`정말로 "${classroomName}"에서 탈퇴하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // 수정: API 경로 변경 (classrooms -> users)
      await axios.delete(
        `http://localhost:3001/api/users/leave-classroom/${classroomId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 탈퇴한 학급을 목록에서 제거
      const updatedClassrooms = classrooms.filter(c => c.classroom_id !== classroomId);
      setClassrooms(updatedClassrooms);

      // 탈퇴한 학급이 현재 활성 학급이었다면 활성 학급 해제
      if (activeClassroomId === classroomId) {
        setActiveClassroomId(null);
      }

      // 학급이 모두 없어지면 학급 생성 페이지로 이동
      if (updatedClassrooms.length === 0) {
        alert('모든 학급에서 탈퇴했습니다. 새 학급에 가입해주세요.');
        navigate('/join/invite');
        return;
      }
      
      alert('학급 탈퇴가 완료되었습니다.');
    } catch (error) {
      console.error('Error leaving classroom:', error);
      alert('학급 탈퇴에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-text">학급 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="classroom-list-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>📚 내 학급 목록</h1>
          <p>가입된 학급을 확인하고 관리하세요</p>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="content">
          <div className="section-header">
            <h2>🏫 가입된 학급</h2>
            <button
              onClick={() => setShowJoinModal(true)}
              className="add-btn"
            >
              + 학급 추가
            </button>
          </div>

          {classrooms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏫</div>
              <h3>가입된 학급이 없습니다</h3>
              <p>새 학급을 생성하거나 초대 코드로 기존 학급에 가입해보세요.</p>
              <div className="empty-actions">
                <button
                  onClick={() => navigate('/classroom/create')}
                  className="create-btn"
                >
                  새 학급 생성
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="join-btn"
                >
                  초대코드로 가입
                </button>
              </div>
            </div>
          ) : (
            <div className="classrooms-grid">
              {classrooms.map((classroom) => (
                <div 
                  key={classroom.classroom_id} 
                  className={`classroom-card ${classroom.classroom_id === activeClassroomId ? 'active' : ''}`}
                >
                  <div className="classroom-info">
                    <h3>{classroom.grade}학년 {classroom.class_number}반</h3>
                    <p className="school-name">{classroom.school_name}</p>
                    <p className="teacher-info">담임: {classroom.teacher_name || '미배정'}</p>
                  </div>
                  
                  <div className="classroom-actions">
                    <button
                      onClick={() => handleSetActiveClassroom(classroom.classroom_id)}
                      className={`select-btn ${classroom.classroom_id === activeClassroomId ? 'active' : ''}`}
                    >
                      {classroom.classroom_id === activeClassroomId ? '현재 학급' : '이 학급 선택'}
                    </button>
                    <button
                      onClick={() => handleLeaveClassroom(
                        classroom.classroom_id,
                        classroom.school_name,
                        classroom.grade,
                        classroom.class_number
                      )}
                      className="leave-btn"
                    >
                      탈퇴
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 학급 가입 모달 */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>학급 가입</h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p>선생님으로부터 받은 초대 코드를 입력해주세요.</p>
              <input
                type="text"
                placeholder="초대 코드 입력"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setJoinError('');
                }}
                className="invite-input"
              />
              {joinError && (
                <div className="error-message">{joinError}</div>
              )}
            </div>
            
            <div className="modal-actions">
              <button
                onClick={() => setShowJoinModal(false)}
                className="cancel-btn"
              >
                취소
              </button>
              <button
                onClick={handleJoinClassroom}
                disabled={!inviteCode.trim()}
                className="confirm-btn"
              >
                가입하기
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .classroom-list-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 1.2rem;
        }

        /* 헤더 */
        .header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 2rem;
        }

        .header p {
          margin: 0;
          color: #64748b;
          font-size: 1.1rem;
        }

        /* 콘텐츠 */
        .content {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .section-header h2 {
          margin: 0;
          color: #1e293b;
          font-size: 1.3rem;
        }

        .add-btn {
          padding: 0.75rem 1.5rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .add-btn:hover {
          background: #3730a3;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.3rem;
        }

        .empty-state p {
          margin: 0 0 2rem 0;
          line-height: 1.5;
        }

        .empty-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .create-btn, .join-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .create-btn {
          background: #4f46e5;
          color: white;
        }

        .create-btn:hover {
          background: #3730a3;
        }

        .join-btn {
          background: white;
          color: #1e293b;
          border: 2px solid #e2e8f0;
        }

        .join-btn:hover {
          border-color: #4f46e5;
          color: #4f46e5;
        }

        /* 학급 그리드 */
        .classrooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .classroom-card {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .classroom-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .classroom-card.active {
          border-color: #4f46e5;
          background: #f0f9ff;
        }

        .classroom-info h3 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.2rem;
        }

        .school-name {
          margin: 0 0 0.5rem 0;
          color: #64748b;
          font-weight: 600;
        }

        .teacher-info {
          margin: 0 0 1.5rem 0;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .classroom-actions {
          display: flex;
          gap: 0.5rem;
        }

        .select-btn, .leave-btn {
          flex: 1;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .select-btn {
          background: #4f46e5;
          color: white;
        }

        .select-btn:hover {
          background: #3730a3;
        }

        .select-btn.active {
          background: #059669;
        }

        .leave-btn {
          background: #ef4444;
          color: white;
        }

        .leave-btn:hover {
          background: #dc2626;
        }

        /* 모달 */
        .modal-overlay {
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

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h3 {
          margin: 0;
          color: #1e293b;
          font-size: 1.2rem;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #64748b;
          padding: 0.25rem;
        }

        .modal-close:hover {
          color: #1e293b;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-body p {
          margin: 0 0 1rem 0;
          color: #64748b;
        }

        .invite-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .invite-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .error-message {
          margin-top: 0.5rem;
          color: #dc2626;
          font-size: 0.9rem;
        }

        .modal-actions {
          display: flex;
          gap: 0.5rem;
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .cancel-btn, .confirm-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .cancel-btn {
          background: #f1f5f9;
          color: #64748b;
        }

        .cancel-btn:hover {
          background: #e2e8f0;
        }

        .confirm-btn {
          background: #4f46e5;
          color: white;
        }

        .confirm-btn:hover:not(:disabled) {
          background: #3730a3;
        }

        .confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .classrooms-grid {
            grid-template-columns: 1fr;
          }

          .empty-actions {
            flex-direction: column;
            align-items: center;
          }

          .create-btn, .join-btn {
            width: 200px;
          }

          .classroom-actions {
            flex-direction: column;
          }

          .header h1 {
            font-size: 1.5rem;
          }

          .header p {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .classroom-list-page {
            padding: 0.5rem;
          }

          .header, .content {
            padding: 1.5rem;
          }

          .modal-overlay {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ClassroomListPage;