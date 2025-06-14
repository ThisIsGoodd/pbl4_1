// client/src/pages/JoinInfoPage.jsx
import React, { useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function JoinInfoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshToken } = useContext(AuthContext);
  
  // 🔥 수정: state에서 schoolName 직접 받기
  const { 
    role, 
    inviteCode, 
    classroom_id, 
    school, 
    schoolName, // 🔥 추가: 학교명 직접 받기
    grade, 
    classNumber 
  } = location.state || {};

  const [childName, setChildName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!childName.trim()) {
      alert('자녀 이름을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      // 🔥 수정: join-classroom 엔드포인트로 변경 (서버에서 안정적으로 처리)
      const joinRes = await fetch('http://localhost:3001/api/classrooms/join-classroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          invite_code: inviteCode 
        }),
      });

      const joinData = await joinRes.json();

      if (!joinRes.ok) {
        throw new Error(joinData.error || '학급 가입에 실패했습니다.');
      }

      // 🔥 수정: 사용자 프로필 업데이트 (자녀 이름)
      const profileRes = await fetch('http://localhost:3001/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          child_name: childName.trim() 
        }),
      });

      if (!profileRes.ok) {
        console.warn('⚠️ 프로필 업데이트 실패 (무시하고 진행)');
      }

      // 사용자 정보 새로고침
      await refreshToken();
      
      alert(`${grade}학년 ${classNumber}반 가입이 완료되었습니다!`);
      navigate(`/main?classroom_id=${classroom_id}`);

    } catch (error) {
      console.error('🔥 학급 가입 오류:', error);
      alert(error.message || '학급 가입 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 필수 데이터가 없으면 이전 페이지로 리다이렉트
  if (!inviteCode || !classroom_id || !schoolName) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>잘못된 접근입니다</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            올바른 초대코드 검증 과정을 거쳐주세요.
          </p>
          <button 
            onClick={() => navigate('/join/invite')}
            style={{
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            초대코드 입력으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        paddingTop: '5vh'
      }}>
        {/* 헤더 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{
            margin: '0 0 0.5rem 0',
            color: '#1e293b',
            fontSize: '1.8rem'
          }}>가입 완료</h1>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '1rem'
          }}>아래 정보를 확인한 후 가입을 완료하세요</p>
        </div>

        {/* 학급 정보 카드 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 1.5rem 0',
            color: '#1e293b',
            fontSize: '1.3rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📘 학급 상세 정보
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>🏫 학교명</span>
              <span style={{ color: '#1e293b', fontWeight: '600' }}>
                {schoolName || '알 수 없음'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>📚 학년</span>
              <span style={{ color: '#1e293b', fontWeight: '600' }}>{grade}학년</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>🏛 반</span>
              <span style={{ color: '#1e293b', fontWeight: '600' }}>{classNumber}반</span>
            </div>
          </div>
        </div>

        {/* 안내사항 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            color: '#1e293b',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            💡 안내사항
          </h3>

          <div style={{ color: '#64748b', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • 가입 완료 후 학급의 모든 기능을 이용하실 수 있습니다
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • 선생님과 다른 학부모들과 소통이 가능합니다
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • 학급 공지사항과 일정을 확인하실 수 있습니다
            </p>
            <p style={{ margin: '0' }}>
              • 개인정보는 학급 내에서만 공유됩니다
            </p>
          </div>
        </div>

        {/* 자녀 이름 입력 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            color: '#1e293b',
            fontWeight: '600',
            fontSize: '1.1rem'
          }}>
            👶 자녀 이름
          </label>
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="자녀의 이름을 입력하세요"
            style={{
              width: '100%',
              padding: '1rem',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* 버튼들 */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => navigate('/join/invite')}
            disabled={isSubmitting}
            style={{
              padding: '1rem 2rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            이전으로
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !childName.trim()}
            style={{
              padding: '1rem 2rem',
              background: isSubmitting || !childName.trim() ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isSubmitting || !childName.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                가입 중...
              </span>
            ) : (
              '가입 완료하기'
            )}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default JoinInfoPage;