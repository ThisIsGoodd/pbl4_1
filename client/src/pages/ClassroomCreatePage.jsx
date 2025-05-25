// client/src/pages/ClassroomCreatePage.jsx
import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function ClassroomCreatePage() {
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [message, setMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { refreshToken } = useContext(AuthContext); // 🆕 토큰 새로고침 함수
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const handleCreate = async () => {
    // 🔥 개선된 클라이언트 유효성 검사
    if (!grade || !classNumber) {
      return setError('학년과 반을 모두 입력해주세요.');
    }

    const gradeNum = parseInt(grade);
    const classNum = parseInt(classNumber);

    // 더 엄격한 유효성 검사
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) {
      return setError('학년은 1학년부터 6학년까지만 입력 가능합니다.');
    }

    if (isNaN(classNum) || classNum < 1 || classNum > 20) {
      return setError('반 번호는 1반부터 20반까지만 입력 가능합니다.');
    }

    setError('');
    setIsCreating(true);

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
        
        // 🔥 개선: 사용자 정보 새로고침 후 이동
        if (data.classroom_id) {
          try {
            // 🆕 AuthContext의 토큰 새로고침으로 최신 상태 반영
            await refreshToken();
            
            alert('🎉 학급이 성공적으로 생성되었습니다!');
            // 🔥 수정: 메인 페이지로 이동 (로고 클릭과 동일한 경로)
            navigate(`/main?classroom_id=${data.classroom_id}`);
          } catch (refreshErr) {
            console.error('토큰 새로고침 실패:', refreshErr);
            // 새로고침 실패해도 이동은 진행
            navigate(`/main?classroom_id=${data.classroom_id}`);
          }
        } else {
          // 🔥 fallback: classroom_id가 없으면 기존 방식 사용
          setTimeout(async () => {
            try {
              const classroomRes = await fetch('http://localhost:3001/api/classrooms/my-classroom', {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (classroomRes.ok) {
                const classroomData = await classroomRes.json();
                await refreshToken(); // 🆕 토큰 새로고침
                navigate(`/main?classroom_id=${classroomData.classroom.classroom_id}`);
              } else {
                navigate('/classroom/create');
              }
            } catch (err) {
              console.error('학급 정보 조회 실패:', err);
              navigate('/classroom/create');
            }
          }, 1000);
        }
      } else {
        // 🔥 개선된 에러 처리
        if (res.status === 400) {
          setError(data.error || '입력값이 올바르지 않습니다.');
        } else if (res.status === 403) {
          setError('학급 생성 권한이 없습니다. 교사 인증을 먼저 완료해주세요.');
        } else if (res.status === 500) {
          setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setError(data.error || '학급 생성에 실패했습니다.');
        }
      }
    } catch (err) {
      console.error('🔥 학급 생성 오류:', err);
      setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
    } finally {
      setIsCreating(false);
    }
  };

  // 🆕 입력 필드 검증 함수
  const handleGradeChange = (e) => {
    const value = e.target.value;
    // 빈 값이거나 1-6 범위의 숫자만 허용
    if (value === '' || (/^[1-6]$/.test(value))) {
      setGrade(value);
      setError(''); // 유효한 입력시 에러 초기화
    }
  };

  const handleClassNumberChange = (e) => {
    const value = e.target.value;
    // 빈 값이거나 1-20 범위의 숫자만 허용
    if (value === '' || (/^([1-9]|1[0-9]|20)$/.test(value))) {
      setClassNumber(value);
      setError(''); // 유효한 입력시 에러 초기화
    }
  };

  return (
    <div style={styles.container}>
      <img src="/assets/logo.png" alt="로고" style={{ height: '40px', marginBottom: '1rem' }} />
      <h2>학급 생성</h2>

      {/* 🆕 안내 메시지 */}
      <div style={styles.infoBox}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#0066cc' }}>📋 학급 생성 안내</h4>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#555' }}>
          <li>학년: 1학년부터 6학년까지 입력 가능</li>
          <li>반 번호: 1반부터 20반까지 입력 가능</li>
          <li>같은 학년, 반이 이미 존재하면 기존 학급 정보를 반환합니다</li>
        </ul>
      </div>

      <input
        type="number"
        placeholder="학년 (1-6)"
        value={grade}
        onChange={handleGradeChange}
        style={{
          ...styles.input,
          borderColor: error && (!grade || parseInt(grade) < 1 || parseInt(grade) > 6) ? '#dc3545' : '#ddd'
        }}
        min="1"
        max="6"
        disabled={isCreating}
      />
      <br />
      <input
        type="number"
        placeholder="반 번호 (1-20)"
        value={classNumber}
        onChange={handleClassNumberChange}
        style={{
          ...styles.input,
          borderColor: error && (!classNumber || parseInt(classNumber) < 1 || parseInt(classNumber) > 20) ? '#dc3545' : '#ddd'
        }}
        min="1"
        max="20"
        disabled={isCreating}
      />
      <br />
      
      {/* 🔥 개선된 에러 메시지 표시 */}
      {error && (
        <div style={styles.errorBox}>
          <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>⚠️</span>
          {error}
        </div>
      )}
      
      <button 
        onClick={handleCreate} 
        style={{
          ...styles.createBtn,
          backgroundColor: isCreating ? '#ccc' : (grade && classNumber ? '#007bff' : '#6c757d'),
          cursor: isCreating || !grade || !classNumber ? 'not-allowed' : 'pointer'
        }}
        disabled={isCreating || !grade || !classNumber}
      >
        {isCreating ? '생성 중...' : '학급 생성'}
      </button>

      {/* 🔥 성공 메시지 (간소화) */}
      {message && !isCreating && !error && (
        <div style={styles.successBox}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
          <p><strong>{message}</strong></p>
          {inviteCode && (
            <div style={styles.inviteCodeBox}>
              <p style={{ margin: '0 0 0.5rem 0' }}>초대코드</p>
              <div style={styles.inviteCode}>{inviteCode}</div>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.5rem 0 0 0' }}>
                학부모님께 이 코드를 알려주세요
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    padding: '3rem',
    maxWidth: '500px',
    margin: '0 auto'
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    border: '1px solid #b3d9ff',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    textAlign: 'left'
  },
  input: {
    padding: '0.8rem',
    width: '300px',
    margin: '0.5rem 0',
    fontSize: '1rem',
    border: '2px solid #ddd',
    borderRadius: '8px',
    transition: 'border-color 0.2s'
  },
  createBtn: {
    padding: '0.8rem 3rem',
    borderRadius: '30px',
    color: '#fff',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontSize: '1rem',
    marginTop: '1rem'
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '8px',
    padding: '0.8rem',
    marginBottom: '1rem',
    color: '#721c24',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left'
  },
  successBox: {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: '#d4edda',
    border: '1px solid #c3e6cb',
    borderRadius: '12px'
  },
  inviteCodeBox: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #28a745'
  },
  inviteCode: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#007bff',
    fontFamily: 'monospace',
    letterSpacing: '2px'
  }
};

export default ClassroomCreatePage;