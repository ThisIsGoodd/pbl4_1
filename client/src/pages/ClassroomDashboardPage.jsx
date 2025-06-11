import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function ClassroomDashboardPage() {
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');
  const [classroom, setClassroom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // 반응형 처리
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

  // 학급 정보 불러오기
  const fetchClassroom = async () => {
    if (!classroomId) return;
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setClassroom({ ...data, classroom_id: classroomId });
        fetchMembers(classroomId);
      } else {
        alert(data.error || '학급 정보를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('학급 정보 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 학급 멤버 불러오기
  const fetchMembers = async (classroomId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMembers(data.members);
      }
    } catch (err) {
      console.error('멤버 불러오기 실패:', err);
    }
  };

  // 멤버 삭제 핸들러
  const handleRemoveMember = async (userId, userName) => {
    const confirmMessage = `정말로 "${userName}" 학부모를 학급에서 제거하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며, 다음 데이터가 모두 삭제됩니다:\n- 해당 학부모의 모든 채팅 기록\n- 학급 관련 알림\n- 게시글 좋아요 및 댓글`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok) {
        alert(`${userName} 학부모가 학급에서 제거되었습니다.`);
        fetchMembers(classroomId);
      } else {
        alert(`삭제 실패: ${data.error}`);
      }
    } catch (err) {
      console.error('멤버 삭제 오류:', err);
      alert('멤버 삭제 중 오류가 발생했습니다.');
    }
  };

  // 초대코드 재발급
  const regenerateCode = async () => {
    if (!classroom) return;
    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroom.classroom_id}/invite-code`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('초대코드가 재발급되었습니다.');
        setClassroom(prev => ({ ...prev, invite_code: data.invite_code }));
      }
    } catch (err) {
      console.error('초대코드 재발급 오류:', err);
    }
  };

  // 학급 삭제
  const handleDelete = async () => {
    if (!window.confirm('정말로 학급을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/classrooms/${classroom.classroom_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('학급이 삭제되었습니다.');
        navigate('/main');
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (err) {
      console.error('삭제 오류:', err);
    }
  };

  // 초대코드 복사
  const copyInviteCode = () => {
    navigator.clipboard.writeText(classroom.invite_code).then(() => {
      alert('초대코드가 클립보드에 복사되었습니다!');
    });
  };

  useEffect(() => {
    fetchClassroom();
  }, [classroomId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">학급 정보를 불러오는 중...</div>

        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .loading-text {
            color: white;
            font-size: 1.1rem;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="error-container">
        <div className="error-content">
          <h3 className="error-title">❌ 학급 정보를 찾을 수 없습니다</h3>
          <p className="error-message">학급 정보를 불러오는데 실패했습니다.</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>

        <style jsx>{`
          .error-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem;
          }

          .error-content {
            background: white;
            border-radius: 20px;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 100%;
          }

          .error-title {
            font-size: 1.5rem;
            color: #dc3545;
            margin: 0 0 1rem 0;
          }

          .error-message {
            color: #64748b;
            margin: 0 0 1.5rem 0;
            line-height: 1.5;
          }

          .retry-button {
            padding: 0.75rem 2rem;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .retry-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="classroom-dashboard">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <h1 className="main-title">📘 학급 대시보드</h1>
            <div className="classroom-info">
              <h2 className="classroom-name">
                {classroom.grade}학년 {classroom.class_number}반
              </h2>
              <p className="school-name">🏫 {classroom.school}</p>
            </div>
          </div>
        </div>

        <div className="main-content">
          {/* 초대코드 섹션 */}
          <div className="invite-section">
            <div className="section-header">
              <h3 className="section-title">
                <span className="title-icon">🔑</span>
                학급 초대코드
              </h3>
              <button 
                onClick={regenerateCode} 
                className="regenerate-button"
              >
                🔄 재발급
              </button>
            </div>
            
            <div className="invite-code-container">
              <div className="invite-code-display">
                <div className="invite-code">{classroom.invite_code}</div>
                <button 
                  className="copy-button"
                  onClick={copyInviteCode}
                >
                  📋
                </button>
              </div>
              <div className="invite-instructions">
                <p className="instruction-text">
                  💬 이 코드를 학부모님께 공유하여 학급에 초대하세요
                </p>
                <div className="instruction-steps">
                  <div className="step">
                    <span className="step-number">1</span>
                    <span className="step-text">학부모님이 앱에 로그인</span>
                  </div>
                  <div className="step">
                    <span className="step-number">2</span>
                    <span className="step-text">초대코드 입력</span>
                  </div>
                  <div className="step">
                    <span className="step-number">3</span>
                    <span className="step-text">학급 가입 완료</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 멤버 관리 섹션 */}
          <div className="members-section">
            <div className="section-header">
              <h3 className="section-title">
                <span className="title-icon">👨‍👩‍👧‍👦</span>
                가입된 학부모 목록
              </h3>
              <div className="member-count-badge">
                총 {members.length}명
              </div>
            </div>

            {members.length === 0 ? (
              <div className="empty-members">
                <div className="empty-icon">👥</div>
                <h4 className="empty-title">아직 가입한 학부모가 없습니다</h4>
                <p className="empty-text">
                  위의 초대코드를 학부모님께 공유하여 학급에 초대해보세요
                </p>
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
                        <div className="member-header">
                          <h4 className="member-name">{member.name}</h4>
                          <div className="member-role-badge">학부모</div>
                        </div>
                        <p className="member-email">{member.email}</p>
                        {member.child_name && (
                          <p className="child-name">
                            <span className="child-icon">👶</span>
                            {member.child_name}
                          </p>
                        )}
                        <p className="join-date">
                          가입일: {new Date(member.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="member-actions">
                      <button
                        className="remove-button"
                        onClick={() => handleRemoveMember(member.user_id, member.name)}
                      >
                        🗑️ 제거
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 위험 구역 */}
          <div className="danger-section">
            <div className="danger-header">
              <h3 className="danger-title">
                <span className="danger-icon">⚠️</span>
                위험 구역
              </h3>
            </div>
            <div className="danger-content">
              <div className="danger-warning">
                <h4 className="warning-title">학급 삭제</h4>
                <p className="warning-text">
                  학급을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 
                  이 작업은 되돌릴 수 없으니 신중하게 결정해주세요.
                </p>
                <ul className="deletion-list">
                  <li>모든 게시글과 댓글</li>
                  <li>채팅 기록</li>
                  <li>일정 정보</li>
                  <li>학부모 가입 정보</li>
                </ul>
              </div>
              <button 
                onClick={handleDelete} 
                className="delete-button"
              >
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

        .classroom-info {
          margin-top: 1rem;
        }

        .classroom-name {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 0.5rem 0;
        }

        .school-name {
          font-size: clamp(1rem, 2vw, 1.2rem);
          color: var(--text-secondary, #64748b);
          margin: 0;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .invite-section,
        .members-section,
        .danger-section {
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

        .regenerate-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .regenerate-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        .member-count-badge {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          white-space: nowrap;
        }

        /* 초대코드 섹션 */
        .invite-code-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .invite-code-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .invite-code {
          font-family: 'Courier New', monospace;
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.1em;
          border: 2px dashed var(--border-color, #e2e8f0);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          background-color: var(--bg-secondary, #f8fafc);
        }

        .copy-button {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.2rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .copy-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.3);
        }

        .invite-instructions {
          text-align: center;
        }

        .instruction-text {
          font-size: 1rem;
          color: var(--text-secondary, #64748b);
          margin: 0 0 1.5rem 0;
        }

        .instruction-steps {
          display: flex;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-align: left;
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .step-text {
          font-size: 0.95rem;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
        }

        /* 멤버 섹션 */
        .empty-members {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-secondary, #64748b);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 1.3rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .empty-text {
          font-size: 1rem;
          margin: 0;
          line-height: 1.5;
        }

        .members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .member-card {
          background: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .member-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .member-info {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .member-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          flex-shrink: 0;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .default-avatar {
          color: white;
          font-weight: 600;
          font-size: 1.5rem;
        }

        .member-details {
          flex: 1;
          min-width: 0;
        }

        .member-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .member-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .member-role-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .member-email {
          font-size: 0.9rem;
          color: var(--text-secondary, #64748b);
          margin: 0 0 0.25rem 0;
          font-family: monospace;
        }

        .child-name {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-primary, #1e293b);
          font-weight: 500;
          margin: 0 0 0.25rem 0;
        }

        .child-icon {
          font-size: 1rem;
        }

        .join-date {
          font-size: 0.8rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
        }

        .member-actions {
          display: flex;
          justify-content: flex-end;
        }

        .remove-button {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .remove-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        /* 위험 구역 */
        .danger-section {
          border: 2px solid #fecaca;
          background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
        }

        .danger-header {
          margin-bottom: 2rem;
        }

        .danger-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 600;
          color: #dc2626;
          margin: 0;
        }

        .danger-icon {
          font-size: 1.5rem;
        }

        .danger-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .danger-warning {
          background: white;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .warning-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #dc2626;
          margin: 0 0 0.75rem 0;
        }

        .warning-text {
          font-size: 0.95rem;
          color: #7f1d1d;
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        .deletion-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .deletion-list li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #7f1d1d;
        }

        .deletion-list li::before {
          content: '❌';
          flex-shrink: 0;
        }

        .delete-button {
          align-self: center;
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3);
        }

        .delete-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .classroom-dashboard {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 1024px) {
          .members-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          }

          .instruction-steps {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }

          .step {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .classroom-dashboard {
            padding: 0.5rem;
          }

          .header {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .invite-section,
          .members-section,
          .danger-section {
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

          .member-count-badge {
            text-align: center;
          }

          .invite-code-display {
            flex-direction: column;
            gap: 1rem;
          }

          .invite-code {
            font-size: 1.8rem;
            padding: 0.75rem 1rem;
          }

          .members-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .member-card {
            padding: 1.2rem;
          }

          .member-info {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .member-header {
            justify-content: center;
            flex-wrap: wrap;
          }

          .danger-content {
            gap: 1.5rem;
          }

          .danger-warning {
            padding: 1.2rem;
          }

          .delete-button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 1.2rem;
          }

          .invite-section,
          .members-section,
          .danger-section {
            padding: 1.2rem;
          }

          .invite-code {
            font-size: 1.5rem;
            padding: 0.6rem 0.8rem;
          }

          .copy-button {
            width: 40px;
            height: 40px;
            font-size: 1rem;
          }

          .member-avatar {
            width: 50px;
            height: 50px;
          }

          .default-avatar {
            font-size: 1.2rem;
          }

          .step {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }

          .step-text {
            font-size: 0.9rem;
          }

          .danger-warning {
            padding: 1rem;
          }

          .deletion-list {
            gap: 0.75rem;
          }
        }

        /* 접근성 */
        .regenerate-button:focus,
        .copy-button:focus,
        .remove-button:focus,
        .delete-button:focus {
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

        /* 프린트 스타일 */
        @media print {
          .classroom-dashboard {
            background: white !important;
            padding: 0 !important;
          }

          .header {
            background: white !important;
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }

          .regenerate-button,
          .copy-button,
          .remove-button,
          .delete-button {
            display: none !important;
          }

          .danger-section {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ClassroomDashboardPage;