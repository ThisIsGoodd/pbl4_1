import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function ClassroomDashboardPage() {
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');

  const [classroom, setClassroom] = useState(null);
  const [members, setMembers] = useState([]);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // 학급 정보 불러오기
  const fetchClassroom = async () => {
    if (!classroomId) return;
    try {
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

  // 🆕 멤버 삭제 핸들러
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
        // 멤버 목록 새로고침
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

  useEffect(() => {
    fetchClassroom();
  }, [classroomId]);

  if (!classroom) return <p style={{ padding: '2rem' }}>⏳ 학급 정보를 불러오는 중...</p>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📘 학급 대시보드</h2>
        <div style={styles.classroomInfo}>
          <h3 style={styles.classroomName}>
            {classroom.grade}학년 {classroom.class_number}반
          </h3>
          <p style={styles.schoolName}>학교명: {classroom.school}</p>
        </div>
      </div>

      {/* 초대코드 섹션 */}
      <div style={styles.inviteSection}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>📋 학급 초대코드</h4>
          <button onClick={regenerateCode} style={styles.regenerateBtn}>
            🔄 코드 재발급
          </button>
        </div>
        <div style={styles.inviteCodeBox}>
          <span style={styles.inviteCode}>{classroom.invite_code}</span>
          <p style={styles.inviteNote}>
            이 코드를 학부모님께 알려주시면 학급에 가입할 수 있습니다
          </p>
        </div>
      </div>

      {/* 학급 멤버 섹션 */}
      <div style={styles.membersSection}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>👨‍👩‍👧 가입된 학부모 목록</h4>
          <span style={styles.memberCount}>총 {members.length}명</span>
        </div>

        {members.length === 0 ? (
          <div style={styles.noMembers}>
            <div style={styles.noMembersIcon}>👥</div>
            <p>아직 가입된 학부모가 없습니다.</p>
            <p style={styles.noMembersSubtext}>
              위의 초대코드를 학부모님께 공유해주세요
            </p>
          </div>
        ) : (
          <div style={styles.membersList}>
            {members.map((member, index) => (
              <div key={member.user_id} style={styles.memberCard}>
                <div style={styles.memberInfo}>
                  <div style={styles.memberHeader}>
                    <span style={styles.memberNumber}>#{index + 1}</span>
                    <h5 style={styles.memberName}>{member.name}</h5>
                  </div>
                  <div style={styles.memberDetails}>
                    <p style={styles.memberEmail}>
                      📧 {member.email}
                    </p>
                    {member.child_name && (
                      <p style={styles.childName}>
                        👶 자녀: {member.child_name}
                      </p>
                    )}
                  </div>
                </div>
                
                <div style={styles.memberActions}>
                  <button
                    onClick={() => handleRemoveMember(member.user_id, member.name)}
                    style={styles.removeBtn}
                    title={`${member.name} 학부모를 학급에서 제거`}
                  >
                    🗑️ 제거
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 위험 영역 */}
      <div style={styles.dangerSection}>
        <h4 style={styles.dangerTitle}>⚠️ 위험 영역</h4>
        <p style={styles.dangerDescription}>
          아래 작업은 되돌릴 수 없습니다. 신중하게 결정해주세요.
        </p>
        <button 
          onClick={handleDelete} 
          style={styles.deleteBtn}
        >
          🗑️ 학급 삭제
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh'
  },

  header: {
    marginBottom: '2rem',
    textAlign: 'center'
  },

  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#495057',
    margin: '0 0 1rem 0'
  },

  classroomInfo: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },

  classroomName: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#007bff'
  },

  schoolName: {
    margin: 0,
    fontSize: '1rem',
    color: '#6c757d'
  },

  inviteSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },

  sectionTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#495057'
  },

  regenerateBtn: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },

  inviteCodeBox: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '8px',
    border: '2px dashed #dee2e6',
    textAlign: 'center'
  },

  inviteCode: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#007bff',
    fontFamily: 'monospace',
    letterSpacing: '4px'
  },

  inviteNote: {
    margin: '0.5rem 0 0 0',
    fontSize: '0.9rem',
    color: '#6c757d'
  },

  membersSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },

  memberCount: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },

  noMembers: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#6c757d'
  },

  noMembersIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },

  noMembersSubtext: {
    fontSize: '0.9rem',
    fontStyle: 'italic'
  },

  membersList: {
    display: 'grid',
    gap: '1rem'
  },

  memberCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    transition: 'box-shadow 0.2s'
  },

  memberInfo: {
    flex: 1
  },

  memberHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },

  memberNumber: {
    backgroundColor: '#6c757d',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    marginRight: '0.75rem',
    fontWeight: 'bold'
  },

  memberName: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#495057'
  },

  memberDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },

  memberEmail: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#6c757d'
  },

  childName: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#28a745',
    fontWeight: '500'
  },

  memberActions: {
    display: 'flex',
    gap: '0.5rem'
  },

  removeBtn: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },

  dangerSection: {
    backgroundColor: '#fff5f5',
    border: '2px solid #fecaca',
    padding: '1.5rem',
    borderRadius: '12px',
    textAlign: 'center'
  },

  dangerTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#dc2626'
  },

  dangerDescription: {
    margin: '0 0 1.5rem 0',
    fontSize: '0.95rem',
    color: '#7f1d1d'
  },

  deleteBtn: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  }
};

export default ClassroomDashboardPage;