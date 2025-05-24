import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getToken } from '../utils/jwt';

function InquiryFormPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const token = getToken();

  // URL에서 기본 카테고리 설정 (school-pending 페이지에서 온 경우)
  React.useEffect(() => {
    if (location.state?.category) {
      setCategory(location.state.category);
    }
    if (location.state?.defaultTitle) {
      setTitle(location.state.defaultTitle);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('http://localhost:3001/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert('문의사항이 등록되었습니다.');
        navigate(-1); // 이전 페이지로 돌아가기
      } else {
        alert(data.error || '문의사항 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('문의사항 등록 오류:', err);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>문의사항 작성</h2>

      <form onSubmit={handleSubmit}>
        {/* 문의 유형 선택 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            문의 유형
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          >
            <option value="general">일반 문의</option>
            <option value="technical">기술적 문제</option>
            <option value="school_request">학교 승인 관련</option>
            <option value="account">계정 관련</option>
            <option value="other">기타</option>
          </select>
        </div>

        {/* 제목 입력 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            제목 *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문의사항 제목을 입력하세요"
            maxLength={100}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          <small style={{ color: '#666' }}>
            {title.length}/100자
          </small>
        </div>

        {/* 내용 입력 */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            내용 *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="문의하실 내용을 자세히 작성해주세요"
            rows={10}
            maxLength={2000}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              resize: 'vertical'
            }}
          />
          <small style={{ color: '#666' }}>
            {content.length}/2000자
          </small>
        </div>

        {/* 안내 메시지 */}
        <div style={{
          backgroundColor: '#f0f8ff',
          border: '1px solid #b3d9ff',
          borderRadius: '6px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#0066cc' }}>📋 문의사항 작성 안내</h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#333' }}>
            <li>관리자가 확인 후 답변을 드립니다.</li>
            <li>긴급한 사항은 전화나 이메일로 직접 연락해주세요.</li>
            <li>개인정보가 포함된 내용은 작성하지 마세요.</li>
            <li>답변은 알림을 통해 확인하실 수 있습니다.</li>
          </ul>
        </div>

        {/* 버튼 그룹 */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            style={{
              padding: '0.75rem 2rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
            style={{
              padding: '0.75rem 2rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: isSubmitting ? '#ccc' : '#007bff',
              color: 'white',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {isSubmitting ? '등록 중...' : '문의사항 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InquiryFormPage;