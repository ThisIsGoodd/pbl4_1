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
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        {/* 헤더 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            margin: '0 0 0.5rem 0',
            color: '#1e293b',
            fontSize: '2rem'
          }}>🎭 역할 선택</h1>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '1.1rem'
          }}>클래스피드에서의 역할을 선택해주세요</p>
        </div>

        {/* 역할 선택 카드 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* 학부모 카드 */}
            <div
              onClick={() => handleSelectRole('parent')}
              style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                border: '2px solid transparent',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={{
                fontSize: '4rem',
                marginBottom: '1rem'
              }}>
                👨‍👩‍👧‍👦
              </div>
              <h2 style={{
                margin: '0 0 1rem 0',
                color: '#92400e',
                fontSize: '1.5rem',
                fontWeight: '700'
              }}>
                학부모
              </h2>
              <p style={{
                margin: 0,
                color: '#a16207',
                fontSize: '1rem',
                lineHeight: '1.5'
              }}>
                자녀의 학교 생활을 확인하고<br />
                선생님과 소통하세요
              </p>
              
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#92400e',
                  fontWeight: '500'
                }}>
                  📱 이용 가능한 기능
                </div>
                <ul style={{
                  margin: '0.5rem 0 0 0',
                  padding: 0,
                  listStyle: 'none',
                  fontSize: '0.85rem',
                  color: '#a16207',
                  lineHeight: '1.4'
                }}>
                  <li>• 공지사항 및 학급 소식 확인</li>
                  <li>• 선생님과 1:1 채팅</li>
                  <li>• 학급 일정 및 행사 안내</li>
                  <li>• 알림 설정 및 관리</li>
                </ul>
              </div>
            </div>

            {/* 선생님 카드 */}
            <div
              onClick={() => handleSelectRole('teacher')}
              style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, #dbeafe 0%, #60a5fa 100%)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                border: '2px solid transparent',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={{
                fontSize: '4rem',
                marginBottom: '1rem'
              }}>
                👩‍🏫
              </div>
              <h2 style={{
                margin: '0 0 1rem 0',
                color: '#1e40af',
                fontSize: '1.5rem',
                fontWeight: '700'
              }}>
                선생님
              </h2>
              <p style={{
                margin: 0,
                color: '#1d4ed8',
                fontSize: '1rem',
                lineHeight: '1.5'
              }}>
                학급을 관리하고<br />
                학부모와 소통하세요
              </p>
              
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#1e40af',
                  fontWeight: '500'
                }}>
                  🎓 이용 가능한 기능
                </div>
                <ul style={{
                  margin: '0.5rem 0 0 0',
                  padding: 0,
                  listStyle: 'none',
                  fontSize: '0.85rem',
                  color: '#1d4ed8',
                  lineHeight: '1.4'
                }}>
                  <li>• 공지사항 작성 및 관리</li>
                  <li>• 학부모와 1:1 상담 채팅</li>
                  <li>• 학급 일정 등록 및 관리</li>
                  <li>• 학생 및 학부모 관리</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 안내사항 */}
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <h3 style={{ 
                margin: 0, 
                color: '#0369a1',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                역할 선택 안내
              </h3>
            </div>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '1.5rem',
              color: '#0284c7',
              fontSize: '0.9rem',
              lineHeight: '1.6'
            }}>
              <li><strong>학부모</strong>: 초대 코드를 통해 학급에 참여합니다</li>
              <li><strong>선생님</strong>: 학교 인증을 통해 학급을 생성하고 관리합니다</li>
              <li>역할은 가입 후 변경이 어려우니 신중히 선택해주세요</li>
              <li>문의사항은 고객센터로 연락주시기 바랍니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleSelectPage;