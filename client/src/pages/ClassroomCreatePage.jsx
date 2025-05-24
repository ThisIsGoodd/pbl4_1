// client/src/pages/ClassroomCreatePage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ClassroomCreatePage() {
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [message, setMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false); // 🆕 로딩 상태
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const handleCreate = async () => {
    // 🔥 수정: 클라이언트 유효성 검사 추가
    if (!grade || !classNumber) {
      return setError('학년과 반을 모두 입력해주세요.');
    }

    const gradeNum = parseInt(grade);
    const classNum = parseInt(classNumber);

    // 학년 유효성 검사 (1~6학년)
    if (gradeNum < 1 || gradeNum > 6) {
      return setError('학년은 1학년부터 6학년까지만 입력 가능합니다.');
    }

    // 반 번호 유효성 검사 (1~20반)
    if (classNum < 1 || classNum > 20) {
      return setError('반 번호는 1반부터 20반까지만 입력 가능합니다.');
    }

    setError(''); // 에러 초기화
    setIsCreating(true); // 🆕 로딩 시작

    try {
      const res = await fetch('http://localhost:3001/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          grade: gradeNum,
          class_number: classNum
        })
      });

      const data = await res.json();

      if (res.ok) {
        setInviteCode(data.invite_code);
        setMessage(data.message || '학급이 생성되었습니다.');
        
        // 🔥 개선: classroom_id를 우선적으로 사용하고, 즉시 이동
        if (data.classroom_id) {
          // 🆕 성공 메시지와 함께 즉시 이동 (2초 대기 제거)
          alert('🎉 학급이 성공적으로 생성되었습니다!');
          navigate(`/main?classroom_id=${data.classroom_id}`);
        } else {
          // 🔥 fallback: classroom_id가 없으면 기존 방식 사용 (1초로 단축)
          setTimeout(async () => {
            try {
              const classroomRes = await fetch('http://localhost:3001/api/classrooms/my-classroom', {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (classroomRes.ok) {
                const classroomData = await classroomRes.json();
                navigate(`/main?classroom_id=${classroomData.classroom.classroom_id}`);
              } else {
                navigate('/classroom/dashboard');
              }
            } catch (err) {
              console.error('학급 정보 조회 실패:', err);
              navigate('/classroom/dashboard');
            }
          }, 1000); // 🔥 2초 → 1초로 단축
        }
      } else {
        setError(data.error || '학급 생성 실패');
      }
    } catch (err) {
      console.error('🔥 학급 생성 오류:', err);
      setError('서버 오류가 발생했습니다.');
    } finally {
      setIsCreating(false); // 🆕 로딩 종료
    }
  };

  return (
    <div style={styles.container}>
      <img src="/assets/logo.png" alt="로고" style={{ height: '40px', marginBottom: '1rem' }} />
      <h2>학급 생성</h2>

      <input
        type="number"
        placeholder="학년 (1-6)"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        style={styles.input}
        min="1"
        max="6"
        disabled={isCreating} // 🆕 로딩 중 비활성화
      />
      <br />
      <input
        type="number"
        placeholder="반 번호 (1-20)"
        value={classNumber}
        onChange={(e) => setClassNumber(e.target.value)}
        style={styles.input}
        min="1"
        max="20"
        disabled={isCreating} // 🆕 로딩 중 비활성화
      />
      <br />
      
      {/* 🆕 에러 메시지 표시 */}
      {error && (
        <p style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </p>
      )}
      
      <button 
        onClick={handleCreate} 
        style={{
          ...styles.createBtn,
          backgroundColor: isCreating ? '#ccc' : '#007bff',
          cursor: isCreating ? 'not-allowed' : 'pointer'
        }}
        disabled={isCreating} // 🆕 로딩 중 비활성화
      >
        {isCreating ? '생성 중...' : '학급 생성'} {/* 🆕 로딩 텍스트 */}
      </button>

      {/* 🔥 수정: 성공 메시지 간소화 (즉시 이동하므로) */}
      {message && !isCreating && (
        <div style={{ marginTop: '1.5rem' }}>
          <p><strong>{message}</strong></p>
          {inviteCode && (
            <p>초대코드: <strong style={{ fontSize: '1.2rem' }}>{inviteCode}</strong></p>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    padding: '3rem'
  },
  input: {
    padding: '0.8rem',
    width: '300px',
    margin: '1rem 0',
    fontSize: '1rem'
  },
  createBtn: {
    padding: '0.7rem 3rem',
    borderRadius: '30px',
    color: '#fff',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export default ClassroomCreatePage;