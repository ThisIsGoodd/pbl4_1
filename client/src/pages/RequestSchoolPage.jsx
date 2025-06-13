import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function RequestSchoolPage() {
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const formatPhoneNumber = (value) => {
    const onlyNums = value.replace(/\D/g, '');
    if (onlyNums.length <= 3) return onlyNums;
    if (onlyNums.length <= 7) return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3)}`;
    return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 7)}-${onlyNums.slice(7, 11)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneRegex = /^\d{3}-\d{4}-\d{4}$/;

    if (
      !schoolName.trim() ||
      !schoolType ||
      schoolCode.length !== 7 ||
      !name.trim() ||
      !phone.trim() ||
      !phoneRegex.test(phone)
    ) {
      setError('모든 항목을 정확히 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/schools/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schoolName, schoolType, schoolCode, name, phone }),
      });

      if (res.ok) {
        navigate('/school/pending');
      } else {
        const result = await res.json();
        setError(result.error || '요청에 실패했습니다.');
      }
    } catch (err) {
      console.error('🔥 요청 오류:', err);
      setError('서버 오류가 발생했습니다.');
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
      <div style={{ maxWidth: '500px', width: '100%' }}>
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
          }}>🏫 학교 생성 요청</h1>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '1.1rem'
          }}>새로운 학교를 등록해보세요</p>
        </div>

        {/* 메인 폼 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <form onSubmit={handleSubmit}>
            {/* 학교명 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '600', 
                color: '#1e293b',
                fontSize: '1rem'
              }}>
                학교명
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="학교명을 입력하세요"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  background: 'white'
                }}
              />
            </div>

            {/* 학교 유형 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: '600', 
                color: '#1e293b',
                fontSize: '1rem'
              }}>
                학교 유형
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '0.75rem' 
              }}>
                {['초등학교', '중학교', '고등학교'].map((type) => (
                  <label 
                    key={type} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: schoolType === type ? '#e0f2fe' : 'white',
                      border: `2px solid ${schoolType === type ? '#0ea5e9' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}
                  >
                    <input
                      type="radio"
                      name="schoolType"
                      value={type}
                      checked={schoolType === type}
                      onChange={(e) => setSchoolType(e.target.value)}
                      style={{ margin: 0 }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            {/* 학교코드 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '600', 
                color: '#1e293b',
                fontSize: '1rem'
              }}>
                학교 코드
              </label>
              <input
                type="text"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.replace(/\D/g, '').slice(0, 7))}
                maxLength={7}
                inputMode="numeric"
                placeholder="7자리 교육부 제공 학교 코드 (예: 1234567)"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  background: 'white'
                }}
              />
              <small style={{ 
                color: '#64748b', 
                fontSize: '0.85rem',
                marginTop: '0.25rem',
                display: 'block'
              }}>
                교육부에서 제공하는 7자리 학교 고유 코드를 입력하세요
              </small>
            </div>

            {/* 신청자 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: '600', 
                color: '#1e293b',
                fontSize: '1rem'
              }}>
                신청자 정보
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="성함"
                  style={{
                    padding: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white'
                  }}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  placeholder="010-1234-5678"
                  maxLength={13}
                  style={{
                    padding: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white'
                  }}
                />
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div style={{
                padding: '1rem',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <p style={{ 
                  color: '#dc2626', 
                  fontSize: '0.9rem',
                  margin: 0,
                  fontWeight: '500'
                }}>
                  ⚠️ {error}
                </p>
              </div>
            )}

            {/* 안내사항 */}
            <div style={{
              padding: '1.5rem',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              marginBottom: '2rem'
            }}>
              <h3 style={{ 
                margin: '0 0 1rem 0', 
                color: '#0369a1',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                📋 신청 안내사항
              </h3>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '1.5rem',
                color: '#0284c7',
                fontSize: '0.9rem',
                lineHeight: '1.6'
              }}>
                <li>관리자 검토 후 승인 처리됩니다 (1-3 영업일)</li>
                <li>승인 완료 시 알림으로 안내드립니다</li>
                <li>정확한 학교 정보를 입력해주세요</li>
                <li>문의사항은 고객센터로 연락주세요</li>
              </ul>
            </div>

            {/* 버튼 영역 */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem',
              paddingTop: '1rem'
            }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#4b5563'}
                onMouseLeave={(e) => e.target.style.background = '#6b7280'}
              >
                뒤로 가기
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
              >
                요청하기
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RequestSchoolPage;