// client/src/pages/ClassroomListPage.jsx
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
    const confirmMsg = `정말로 ${schoolName} ${grade}학년 ${classNumber}반을 탈퇴하시겠습니까?`;
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:3001/api/classrooms/leave/${classroomId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // 학급 목록 다시 가져오기
      const updatedResponse = await axios.get(
        'http://localhost:3001/api/classrooms/user/joined-classrooms',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedClassrooms = updatedResponse.data.classrooms || [];
      setClassrooms(updatedClassrooms);
      
      // 남은 학급이 없으면 학급 생성 페이지로 이동
      if (updatedClassrooms.length === 0) {
        alert('학급 탈퇴가 완료되었습니다. 새 학급을 생성하거나 가입해주세요.');
        navigate('/classroom/create');
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
      <div className="classroom-list-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">학급 정보를 불러오는 중...</div>
        </div>
        
        <style jsx>{`
          .classroom-list-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem;
          }

          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: calc(100vh - 2rem);
            gap: 1.5rem;
          }

          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .loading-text {
            font-size: 1.1rem;
            font-weight: 500;
            color: white;
            text-align: center;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="classroom-list-page">
      <div className="container">
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">📚 내 학급 목록</h1>
            <p className="welcome-text">가입된 학급을 확인하고 관리하세요</p>
          </div>
        </div>

        <div className="main-content">
          <div className="content-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="title-icon">🏫</span>
                가입된 학급
              </h2>
              <button
                onClick={() => setShowJoinModal(true)}
                className="add-classroom-btn"
              >
                <span className="btn-icon">+</span>
                학급 추가
              </button>
            </div>

            {classrooms.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏫</div>
                <h3 className="empty-title">가입된 학급이 없습니다</h3>
                <p className="empty-description">
                  새 학급을 생성하거나 초대 코드로 기존 학급에 가입해보세요.
                </p>
                <div className="empty-actions">
                  <button
                    onClick={() => navigate('/classroom/create')}
                    className="create-classroom-btn"
                  >
                    새 학급 생성
                  </button>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="join-classroom-btn"
                  >
                    학급 가입
                  </button>
                </div>
              </div>
            ) : (
              <div className="classrooms-grid">
                {classrooms.map((classroom) => (
                  <div 
                    key={classroom.classroom_id} 
                    className={`classroom-card ${
                      classroom.classroom_id === activeClassroomId ? 'active' : ''
                    }`}
                  >
                    <div className="classroom-header">
                      <div className="school-info">
                        <h3 className="school-name">{classroom.school_name}</h3>
                        <div className="class-info">
                          {classroom.grade}학년 {classroom.class_number}반
                        </div>
                      </div>
                      {classroom.classroom_id === activeClassroomId && (
                        <div className="active-badge">활성</div>
                      )}
                    </div>

                    <div className="classroom-details">
                      <div className="detail-item">
                        <span className="detail-icon">👨‍🏫</span>
                        <span className="detail-text">{classroom.teacher_name}</span>
                      </div>
                    </div>

                    <div className="classroom-actions">
                      <button
                        onClick={() => handleSetActiveClassroom(classroom.classroom_id)}
                        className={`select-btn ${
                          classroom.classroom_id === activeClassroomId ? 'active' : ''
                        }`}
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
      </div>

      {/* 학급 가입 모달 */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">학급 가입</h2>
              <button
                onClick={() => setShowJoinModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                선생님으로부터 받은 초대 코드를 입력해주세요.
              </p>
              
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="초대 코드 입력"
                className="invite-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && inviteCode.trim()) {
                    handleJoinClassroom();
                  }
                }}
              />
              
              {joinError && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {joinError}
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button
                onClick={handleJoinClassroom}
                disabled={!inviteCode.trim()}
                className="confirm-btn"
              >
                가입하기
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setInviteCode('');
                  setJoinError('');
                }}
                className="cancel-btn"
              >
                취소
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
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
        }

        .main-title {
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 1rem 0;
          letter-spacing: -0.02em;
        }

        .welcome-text {
          font-size: clamp(1rem, 2.5vw, 1.2rem);
          color: var(--text-secondary, #64748b);
          margin: 0;
          font-weight: 300;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .content-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .add-classroom-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.2);
          white-space: nowrap;
        }

        .add-classroom-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
        }

        .btn-icon {
          font-size: 1.2rem;
          font-weight: 700;
        }

        /* 빈 상태 */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          opacity: 0.7;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
          color: var(--text-primary, #1e293b);
        }

        .empty-description {
          font-size: 1rem;
          color: var(--text-secondary, #64748b);
          margin: 0 0 2rem 0;
          max-width: 400px;
          line-height: 1.6;
        }

        .empty-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .create-classroom-btn {
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.2);
        }

        .join-classroom-btn {
          padding: 0.875rem 1.5rem;
          background: transparent;
          color: var(--text-primary, #1e293b);
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .create-classroom-btn:hover,
        .join-classroom-btn:hover {
          transform: translateY(-2px);
        }

        .join-classroom-btn:hover {
          border-color: #4f46e5;
          color: #4f46e5;
        }

        /* 학급 그리드 */
        .classrooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .classroom-card {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid var(--border-color, #e2e8f0);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .classroom-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
        }

        .classroom-card.active {
          border-color: #4f46e5;
          box-shadow: 0 10px 30px rgba(79, 70, 229, 0.2);
        }

        .classroom-card.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        }

        .classroom-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .school-name {
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: var(--text-primary, #1e293b);
        }

        .class-info {
          font-size: 1rem;
          font-weight: 600;
          color: #4f46e5;
        }

        .active-badge {
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .classroom-details {
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .detail-item:last-child {
          margin-bottom: 0;
        }

        .detail-icon {
          font-size: 1.1rem;
          width: 20px;
          text-align: center;
        }

        .detail-text {
          font-size: 0.95rem;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
        }

        .classroom-actions {
          display: flex;
          gap: 0.75rem;
        }

        .select-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .select-btn:not(.active) {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
        }

        .select-btn.active {
          background: var(--bg-primary, #ffffff);
          color: var(--text-secondary, #64748b);
          border: 2px solid var(--border-color, #e2e8f0);
          cursor: default;
        }

        .select-btn:not(.active):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
        }

        .leave-btn {
          padding: 0.75rem 1rem;
          background: transparent;
          color: #ef4444;
          border: 2px solid #ef4444;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .leave-btn:hover {
          background: #ef4444;
          color: white;
          transform: translateY(-1px);
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
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color, #e2e8f0);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }

        .modal-title {
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary, #1e293b);
        }

        .modal-close {
          width: 32px;
          height: 32px;
          border: none;
          background: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-secondary, #64748b);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          color: var(--text-primary, #1e293b);
          background: var(--bg-secondary, #f8fafc);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-description {
          font-size: 0.95rem;
          color: var(--text-secondary, #64748b);
          margin: 0 0 1.5rem 0;
          line-height: 1.6;
        }

        .invite-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #1e293b);
        }

        .invite-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 12px;
          font-size: 0.9rem;
        }

        .error-icon {
          font-size: 1rem;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid var(--border-color, #e2e8f0);
        }

        .confirm-btn {
          flex: 1;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .confirm-btn:disabled {
          background: var(--text-secondary, #94a3b8);
          cursor: not-allowed;
          transform: none;
        }

        .confirm-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
        }

        .cancel-btn {
          flex: 1;
          padding: 0.875rem 1rem;
          background: transparent;
          color: var(--text-primary, #1e293b);
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-btn:hover {
          background: var(--bg-secondary, #f8fafc);
          border-color: var(--text-secondary, #94a3b8);
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .classroom-list-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }

          .error-message {
            background: #450a0a;
            color: #fca5a5;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 1024px) {
          .classrooms-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .classroom-list-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .content-section {
            padding: 1.5rem;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .section-title {
            justify-content: center;
          }

          .add-classroom-btn {
            width: 100%;
            justify-content: center;
          }

          .classrooms-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .classroom-card {
            padding: 1.25rem;
          }

          .empty-state {
            padding: 3rem 1.5rem;
          }

          .empty-actions {
            flex-direction: column;
            width: 100%;
          }

          .create-classroom-btn,
          .join-classroom-btn {
            width: 100%;
          }

          .modal-overlay {
            padding: 0.5rem;
          }

          .modal-header,
          .modal-body,
          .modal-actions {
            padding: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .classroom-list-page {
            padding: 0.25rem;
          }

          .classroom-card {
            padding: 1rem;
          }

          .classroom-actions {
            flex-direction: column;
          }

          .select-btn,
          .leave-btn {
            width: 100%;
          }

          .empty-icon {
            font-size: 3rem;
          }

          .empty-title {
            font-size: 1.25rem;
          }
        }

        /* 접근성 */
        .add-classroom-btn:focus,
        .select-btn:focus,
        .leave-btn:focus,
        .invite-input:focus,
        .confirm-btn:focus,
        .cancel-btn:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        /* 애니메이션 성능 최적화 */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ClassroomListPage;