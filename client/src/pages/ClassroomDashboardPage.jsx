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
    <div style={{ padding: '2rem' }}>
      <h2>📘 학급 대시보드</h2>
      <p><strong>{classroom.grade}학년 {classroom.class_number}반</strong></p>
      <p>학교 ID: {classroom.school}</p>
      <p>초대코드: <strong>{classroom.invite_code}</strong></p>
      <button onClick={regenerateCode}>초대코드 재발급</button>
      <button onClick={handleDelete} style={{ marginLeft: '1rem', color: 'red' }}>학급 삭제</button>

      <hr style={{ margin: '2rem 0' }} />

      <h3>👨‍👩‍👧 가입된 학부모 목록</h3>
      {members.length === 0 ? (
        <p>가입된 학부모가 없습니다.</p>
      ) : (
        <ul>
          {members.map(m => (
            <li key={m.user_id}>
              {m.name} ({m.email}) {m.child_name && `- 자녀: ${m.child_name}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ClassroomDashboardPage;
