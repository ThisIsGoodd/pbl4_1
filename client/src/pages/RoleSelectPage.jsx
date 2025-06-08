import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function RoleSelectPage() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSelectRole = async (role) => {
    try {
      const res = await fetch('http://localhost:3001/api/users/update-role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role })
      });

      if (res.ok) {
        const updatedUser = { ...user, role };
        setUser(updatedUser);
        alert('역할이 설정되었습니다.');

        // ✅ 역할별 분기 처리
        if (role === 'parent') {
          navigate('/join/invite', { state: { role } });
        } else if (role === 'teacher') {
          navigate('/teacher/auth', { state: { role } });
        }
      } else {
        const errorData = await res.json();
        alert(`역할 설정 실패: ${errorData.message || '서버 응답 없음'}`);
      }
    } catch (err) {
      console.error('역할 설정 오류:', err);
      alert('서버 오류');
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>당신의 역할을 선택하세요</h2>

      <button
        onClick={() => handleSelectRole('parent')}
        style={{ margin: '1rem', padding: '1rem 2rem', fontSize: '1.2rem' }}
      >
        👨‍👩‍👧 학부모
      </button>

      <button
        onClick={() => handleSelectRole('teacher')}
        style={{ margin: '1rem', padding: '1rem 2rem', fontSize: '1.2rem' }}
      >
        👩‍🏫 선생님
      </button>
    </div>
  );
}

export default RoleSelectPage;
