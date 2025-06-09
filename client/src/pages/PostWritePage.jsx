// client/src/pages/PostWritePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { getCurrentUser, getToken } from '../utils/jwt';

function PostWritePage() {
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState([]);
  const [classroomInfo, setClassroomInfo] = useState(null);
  const [postType, setPostType] = useState('classroom'); // 'classroom' 또는 'school'
  const navigate = useNavigate();
  const location = useLocation();
  const token = getToken();
  const user = getCurrentUser();

  // URL 파라미터 파싱
  const searchParams = new URLSearchParams(location.search);
  const classroomId = searchParams.get('classroom_id');
  const schoolId = searchParams.get('school_id');
  const initialType = searchParams.get('type'); // URL에서 type 파라미터 가져오기
  
  // 사용자 권한 확인
  const isAdmin = user?.is_admin === true || user?.is_admin === 1;
  const isSchoolAdmin = isAdmin && schoolId && !classroomId; // 학교 전체 관리자

  console.log('🔍 [PostWritePage] 초기화:', {
    classroomId, schoolId, isAdmin, isSchoolAdmin, user
  });

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height: 200px; padding: 1rem; border: 1px solid #d1d5db; border-radius: 8px; outline: none;'
      }
    }
  });

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (user.role === 'parent') {
      alert('학부모는 게시글을 작성할 수 없습니다.');
      navigate(-1);
      return;
    }

    // 🔥 학교 전체 관리자인 경우
    if (isSchoolAdmin) {
      console.log('🏫 학교 전체 관리자 - 학교 전체 공지만 작성 가능');
      setPostType('school'); // 강제로 학교 전체 공지로 설정
      return; // 학급 정보 조회 불필요
    }

    // 🆕 URL에서 type 파라미터가 있으면 초기 설정
    if (initialType === 'school') {
      setPostType('school');
      console.log('🏫 URL 파라미터로 학교 공지 선택됨');
    } else if (initialType === 'classroom') {
      setPostType('classroom');
      console.log('📚 URL 파라미터로 학급 공지 선택됨');
    }

    // 🔥 일반 교사인 경우 - 학급 정보 필요
    if (classroomId && user.role === 'teacher') {
      fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.classroom) {
            setClassroomInfo(data.classroom);
            console.log('📚 학급 정보 로드:', data.classroom);
          } else {
            alert('학급 정보를 찾을 수 없습니다.');
            navigate(-1);
          }
        })
        .catch(err => {
          console.error('🔥 학급 정보 조회 오류:', err);
          alert('학급 정보 조회 중 오류가 발생했습니다.');
          navigate(-1);
        });
    } else if (!classroomId && user.role === 'teacher') {
      alert('학급 정보가 필요합니다.');
      navigate(-1);
    }
  }, [user, classroomId, schoolId, isSchoolAdmin, initialType, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) return alert('제목을 입력하세요.');
    if (!editor || !editor.getHTML().trim()) return alert('내용을 입력하세요.');

    const content = editor.getHTML();
    if (title.length > 50) return alert('제목은 50자 이내로 작성하세요.');
    if (content.replace(/<[^>]*>/g, '').length > 1000) return alert('내용은 1000자 이내로 작성하세요.');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    
    // 🆕 학교 전체 관리자 처리
    if (isSchoolAdmin) {
      // 학교 전체 관리자인 경우 classroom_id 없이 전송
      formData.append('school_wide', 'true');
      console.log('🏫 학교 전체 관리자 게시글 작성');
    } else {
      // 일반 교사인 경우
      formData.append('classroom_id', classroomId);
      formData.append('school_wide', postType === 'school');
      console.log('👩‍🏫 일반 교사 게시글 작성:', { postType, classroomId });
    }
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('http://localhost:3001/api/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert('게시글 작성 완료!');
        
        // 🆕 작성 완료 후 이동 경로 결정
        if (isSchoolAdmin) {
          navigate('/admin/main'); // 학교 전체 관리자는 관리자 메인으로
        } else {
          navigate(`/posts?classroom_id=${classroomId}`); // 일반 교사는 해당 학급 게시판으로
        }
      } else {
        alert(data.error || '작성 실패');
      }
    } catch (err) {
      console.error('🔥 게시글 작성 오류:', err);
      alert('서버 오류');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !editor) return;

    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch('http://localhost:3001/api/posts/upload-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (res.ok && data.url) {
      editor.chain().focus().setImage({ src: `http://localhost:3001${data.url}` }).run();
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>
        {isSchoolAdmin ? '🏫 학교 전체 공지 작성' : (
          postType === 'school' ? '🏫 학교 공지 작성' : '📚 학급 공지 작성'
        )}
      </h1>

      {/* 🆕 학교 전체 관리자인 경우 학교 정보 표시 */}
      {isSchoolAdmin ? (
        <div style={{ 
          marginBottom: '1.5rem', 
          fontWeight: 'bold', 
          padding: '1rem', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px',
          border: '1px solid #90caf9',
          textAlign: 'center'
        }}>
          🏫 <strong>학교 전체 공지사항</strong>으로 작성됩니다.
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#1565c0' }}>
            모든 학급의 학생과 학부모가 볼 수 있습니다.
          </div>
        </div>
      ) : classroomInfo ? (
        <p style={{ 
          marginBottom: '1.5rem', 
          fontWeight: 'bold', 
          padding: '1rem', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          📚 대상 학급: {classroomInfo.grade}학년 {classroomInfo.class_number}반 ({classroomInfo.school})
        </p>
      ) : null}

      {/* 🔥 공지사항 유형 선택 (일반 교사만 표시) */}
      {!isSchoolAdmin && classroomInfo && (
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1.5rem', 
          border: '2px solid #e5e7eb', 
          borderRadius: '12px', 
          backgroundColor: '#fafbfc' 
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            fontWeight: '600', 
            color: '#374151', 
            fontSize: '1.1rem',
            textAlign: 'center'
          }}>
            📢 공지사항 유형을 선택하세요
          </h3>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            {/* 학급 공지 옵션 */}
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '1.5rem 2rem',
              border: `3px solid ${postType === 'classroom' ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '12px',
              backgroundColor: postType === 'classroom' ? '#eff6ff' : 'white',
              transition: 'all 0.2s ease',
              minWidth: '200px',
              boxShadow: postType === 'classroom' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <input
                type="radio"
                name="postType"
                value="classroom"
                checked={postType === 'classroom'}
                onChange={(e) => setPostType(e.target.value)}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📚</div>
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '1rem', 
                color: postType === 'classroom' ? '#1d4ed8' : '#374151',
                marginBottom: '0.5rem'
              }}>
                학급 공지사항
              </div>
              <div style={{ 
                fontSize: '0.85rem', 
                color: '#6b7280', 
                textAlign: 'center',
                lineHeight: '1.4'
              }}>
                우리 학급 학생들에게만<br/>표시되는 공지사항
              </div>
            </label>

            {/* 학교 전체 공지 옵션 */}
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '1.5rem 2rem',
              border: `3px solid ${postType === 'school' ? '#10b981' : '#e5e7eb'}`,
              borderRadius: '12px',
              backgroundColor: postType === 'school' ? '#ecfdf5' : 'white',
              transition: 'all 0.2s ease',
              minWidth: '200px',
              boxShadow: postType === 'school' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <input
                type="radio"
                name="postType"
                value="school"
                checked={postType === 'school'}
                onChange={(e) => setPostType(e.target.value)}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏫</div>
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '1rem', 
                color: postType === 'school' ? '#047857' : '#374151',
                marginBottom: '0.5rem'
              }}>
                학교 전체 공지사항
              </div>
              <div style={{ 
                fontSize: '0.85rem', 
                color: '#6b7280', 
                textAlign: 'center',
                lineHeight: '1.4'
              }}>
                학교 전체 학급에<br/>표시되는 중요 공지사항
              </div>
            </label>
          </div>

          {/* 🆕 선택된 유형에 따른 안내 메시지 */}
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: postType === 'school' ? '#fef3c7' : '#dbeafe',
            border: `1px solid ${postType === 'school' ? '#f59e0b' : '#3b82f6'}`,
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '0.9rem'
          }}>
            {postType === 'school' ? (
              <span style={{ color: '#92400e' }}>
                ⚠️ <strong>학교 전체 공지</strong>는 모든 학급에 표시되므로 신중하게 작성해주세요.
              </span>
            ) : (
              <span style={{ color: '#1e40af' }}>
                ℹ️ <strong>학급 공지</strong>는 {classroomInfo?.grade}학년 {classroomInfo?.class_number}반 학생들에게만 표시됩니다.
              </span>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 제목 입력 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            제목 <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요 (최대 50자)"
            maxLength={50}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
            required
          />
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {title.length}/50자
          </div>
        </div>

        {/* 내용 입력 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            내용 <span style={{ color: 'red' }}>*</span>
          </label>
          
          {/* 에디터 툴바 */}
          <div style={{ 
            marginBottom: '0.5rem', 
            padding: '0.5rem', 
            backgroundColor: '#f9fafb', 
            borderRadius: '8px 8px 0 0',
            border: '1px solid #d1d5db',
            borderBottom: 'none'
          }}>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              style={{
                padding: '0.25rem 0.5rem',
                margin: '0 0.25rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: editor?.isActive('bold') ? '#3b82f6' : 'white',
                color: editor?.isActive('bold') ? 'white' : 'black',
                cursor: 'pointer'
              }}
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              style={{
                padding: '0.25rem 0.5rem',
                margin: '0 0.25rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: editor?.isActive('italic') ? '#3b82f6' : 'white',
                color: editor?.isActive('italic') ? 'white' : 'black',
                cursor: 'pointer'
              }}
            >
              <em>I</em>
            </button>
            <label style={{
              padding: '0.25rem 0.5rem',
              margin: '0 0.25rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}>
              📷 이미지
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          
          <EditorContent editor={editor} />
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
            ⚠️ 내용은 1000자 이내로 작성해주세요.
          </div>
        </div>

        {/* 첨부파일 */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            첨부파일 (선택사항)
          </label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px'
            }}
          />
          {files.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
              선택된 파일: {files.map(f => f.name).join(', ')}
            </div>
          )}
        </div>

        {/* 작성 버튼 */}
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: isSchoolAdmin ? '#28a745' : (postType === 'school' ? '#10b981' : '#3b82f6'),
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
        >
          {isSchoolAdmin 
            ? '🏫 학교 전체 공지 작성' 
            : postType === 'school' 
            ? '🏫 학교 전체 공지 작성' 
            : '📚 학급 공지 작성'}
        </button>
      </form>
    </div>
  );
}

export default PostWritePage;