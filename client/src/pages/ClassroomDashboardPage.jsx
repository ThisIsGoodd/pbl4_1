import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function ClassroomDashboardPage() {
  const [classroom, setClassroom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const classroomId = searchParams.get('classroom_id');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [classroomId]);

  const fetchData = async () => {
    if (!classroomId || !token) {
      setError('필수 정보가 누락되었습니다.');
      setLoading(false);
      return;
    }

    try {
      // 학급 정보 조회
      const classroomRes = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!classroomRes.ok) {
        throw new Error('학급 정보를 불러올 수 없습니다.');
      }

      const classroomData = await classroomRes.json();
      setClassroom(classroomData);

      // 멤버 목록 조회
      const membersRes = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }

    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateCode = async () => {
    if (!window.confirm('초대 코드를 재발급하시겠습니까? 기존 코드는 사용할 수 없게 됩니다.')) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/invite-code`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setClassroom(prev => ({ ...prev, invite_code: data.invite_code }));
        alert('초대 코드가 재발급되었습니다.');
      } else {
        alert('코드 재발급에 실패했습니다: ' + data.error);
      }
    } catch (err) {
      console.error('코드 재발급 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(classroom.invite_code).then(() => {
      alert('초대 코드가 클립보드에 복사되었습니다!');
    }).catch(() => {
      alert('복사에 실패했습니다. 직접 선택하여 복사해주세요.');
    });
  };

  const removeMember = async (memberId, memberName) => {
    if (!window.confirm(`정말로 ${memberName}님을 학급에서 제거하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.user_id !== memberId));
        alert(`${memberName}님이 학급에서 제거되었습니다.`);
      } else {
        alert('멤버 제거에 실패했습니다: ' + data.error);
      }
    } catch (err) {
      console.error('멤버 제거 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  const deleteClassroom = async () => {
    const confirmText = `${classroom.grade}학년 ${classroom.class_number}반`;
    const userInput = prompt(`학급을 삭제하려면 "${confirmText}"를 정확히 입력하세요:`);
    
    if (userInput !== confirmText) {
      alert('입력이 일치하지 않습니다.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert('학급이 삭제되었습니다.');
        navigate('/classroom/create');
      } else {
        const data = await res.json();
        alert('학급 삭제에 실패했습니다: ' + data.error);
      }
    } catch (err) {
      console.error('학급 삭제 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-text">학급 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <div className="error-content">
          <h2>오류 발생</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-button">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="classroom-dashboard">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1>📘 학급 대시보드</h1>
          <div className="classroom-info">
            <h2>{classroom.grade}학년 {classroom.class_number}반</h2>
            <p>🏫 {classroom.school}</p>
          </div>
        </div>

        <div className="content">
          {/* 초대 코드 섹션 */}
          <div className="section">
            <div className="section-header">
              <h3>🔑 초대 코드</h3>
              <button onClick={regenerateCode} className="regenerate-btn">
                🔄 재발급
              </button>
            </div>
            
            <div className="invite-code-container">
              <div className="invite-code">{classroom.invite_code}</div>
              <button onClick={copyInviteCode} className="copy-btn">
                📋 복사
              </button>
            </div>
            
            <div className="instructions">
              <p>💬 이 코드를 학부모님께 공유하여 학급에 초대하세요</p>
              <div className="steps">
                <div className="step">
                  <span className="step-number">1</span>
                  <span>학부모님이 앱에 로그인</span>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <span>초대코드 입력</span>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <span>학급 가입 완료</span>
                </div>
              </div>
            </div>
          </div>

          {/* 멤버 관리 섹션 */}
          <div className="section">
            <div className="section-header">
              <h3>👨‍👩‍👧‍👦 가입된 학부모 목록</h3>
              <div className="member-count">총 {members.length}명</div>
            </div>

            {members.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h4>아직 가입한 학부모가 없습니다</h4>
                <p>위의 초대코드를 학부모님께 공유하여 학급에 초대해보세요</p>
              </div>
            ) : (
              <div className="members-grid">
                {members.map(member => (
                  <div key={member.user_id} className="member-card">
                    <div className="member-info">
                      <div className="member-avatar">
                        {member.profile_picture ? (
                          <img 
                            src={`http://localhost:3001${member.profile_picture}`} 
                            alt={member.name}
                            className="avatar-image"
                          />
                        ) : (
                          <div className="default-avatar">
                            {member.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="member-details">
                        <h4>{member.name}</h4>
                        <p>{member.email}</p>
                        {member.child_name && (
                          <span className="child-name">자녀: {member.child_name}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMember(member.user_id, member.name)}
                      className="remove-btn"
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 위험 구역 */}
          <div className="danger-section">
            <h3>🚨 위험 구역</h3>
            <div className="danger-content">
              <div className="danger-info">
                <h4>학급 삭제</h4>
                <p>학급을 삭제하면 모든 데이터가 영구적으로 삭제됩니다:</p>
                <ul>
                  <li>모든 게시글과 댓글</li>
                  <li>채팅 기록</li>
                  <li>일정 정보</li>
                  <li>학부모 가입 정보</li>
                </ul>
              </div>
              <button onClick={deleteClassroom} className="delete-btn">
                🗑️ 학급 삭제하기
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .classroom-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading, .error {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 1.2rem;
        }

        .error-content {
          background: white;
          color: #1e293b;
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .retry-button {
          padding: 0.75rem 2rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 1rem;
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
          margin: 0 0 1rem 0;
          color: #1e293b;
          font-size: 2rem;
        }

        .classroom-info h2 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.5rem;
        }

        .classroom-info p {
          margin: 0;
          color: #64748b;
          font-size: 1.1rem;
        }

        /* 콘텐츠 */
        .content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .section {
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
          margin-bottom: 1.5rem;
        }

        .section-header h3 {
          margin: 0;
          color: #1e293b;
          font-size: 1.3rem;
        }

        .member-count {
          background: #4f46e5;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        /* 초대 코드 */
        .invite-code-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .invite-code {
          flex: 1;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 2rem;
          font-weight: 700;
          color: #4f46e5;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          border: 2px solid #4f46e5;
          text-align: center;
          letter-spacing: 0.1em;
        }

        .regenerate-btn, .copy-btn {
          padding: 0.75rem 1.5rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .regenerate-btn:hover, .copy-btn:hover {
          background: #3730a3;
        }

        /* 사용 방법 */
        .instructions p {
          margin: 0 0 1rem 0;
          color: #64748b;
          font-weight: 500;
        }

        .steps {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex: 1;
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: #4f46e5;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .step span:last-child {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h4 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.2rem;
        }

        .empty-state p {
          margin: 0;
          line-height: 1.5;
        }

        /* 멤버 그리드 */
        .members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .member-card {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .member-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .member-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          background: #e2e8f0;
          border: 3px solid #e2e8f0;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .default-avatar {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #4f46e5;
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .member-details h4 {
          margin: 0 0 0.25rem 0;
          color: #1e293b;
          font-size: 1.1rem;
        }

        .member-details p {
          margin: 0 0 0.25rem 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        .child-name {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .remove-btn {
          padding: 0.5rem 1rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .remove-btn:hover {
          background: #dc2626;
        }

        /* 위험 구역 */
        .danger-section {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border: 2px solid #fecaca;
        }

        .danger-section h3 {
          margin: 0 0 1.5rem 0;
          color: #dc2626;
          font-size: 1.3rem;
        }

        .danger-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .danger-info {
          flex: 1;
        }

        .danger-info h4 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.1rem;
        }

        .danger-info p {
          margin: 0 0 1rem 0;
          color: #64748b;
          line-height: 1.5;
        }

        .danger-info ul {
          margin: 0;
          padding-left: 1.5rem;
          color: #64748b;
        }

        .danger-info li {
          margin-bottom: 0.25rem;
        }

        .delete-btn {
          padding: 1rem 2rem;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .delete-btn:hover {
          background: #b91c1c;
          transform: translateY(-1px);
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .invite-code-container {
            flex-direction: column;
          }

          .invite-code {
            font-size: 1.5rem;
          }

          .steps {
            flex-direction: column;
            gap: 1rem;
          }

          .step {
            flex-direction: row;
            text-align: left;
            gap: 1rem;
          }

          .step-number {
            margin-bottom: 0;
          }

          .members-grid {
            grid-template-columns: 1fr;
          }

          .member-card {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .danger-content {
            flex-direction: column;
          }

          .header h1 {
            font-size: 1.5rem;
          }

          .classroom-info h2 {
            font-size: 1.2rem;
          }
        }

        @media (max-width: 480px) {
          .classroom-dashboard {
            padding: 0.5rem;
          }

          .section {
            padding: 1.5rem;
          }

          .invite-code {
            font-size: 1.2rem;
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ClassroomDashboardPage;