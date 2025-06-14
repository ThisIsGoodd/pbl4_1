// client/src/pages/PostWritePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
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
  
  // 🔥 중복 실행 방지를 위한 ref
  const hasNavigatedRef = useRef(false);

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
    extensions: [
      StarterKit,
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      FontFamily,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height: 200px; padding: 1rem; border: none; outline: none; background: white;'
      }
    }
  });

  useEffect(() => {
    // 🔥 이미 네비게이션이 실행되었으면 중단
    if (hasNavigatedRef.current) return;

    if (!user) {
      hasNavigatedRef.current = true;
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (user.role === 'parent') {
      hasNavigatedRef.current = true;
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
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('🔍 학급 API 응답:', data);
          
          // 🔥 수정: 서버에서 data를 직접 반환하므로 data를 그대로 사용
          if (data && (data.classroom_id || data.grade)) {
            setClassroomInfo(data);
            console.log('✅ 학급 정보 로드 성공:', data);
          } else {
            throw new Error('학급 정보가 유효하지 않습니다');
          }
        })
        .catch(err => {
          console.error('🔥 학급 정보 조회 오류:', err);
          
          // 🔥 중복 실행 방지
          if (!hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            alert('학급 정보를 찾을 수 없습니다.');
            navigate(-1);
          }
        });
    } else if (!classroomId && user.role === 'teacher') {
      hasNavigatedRef.current = true;
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
          navigate(`/posts?school_id=${schoolId}`); // 학교 전체 관리자는 관리자 메인으로 posts?school_id=17
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
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
          }}>
            {isSchoolAdmin ? '🏫 학교 전체 공지 작성' : (
              postType === 'school' ? '🏫 학교 공지 작성' : '📚 학급 공지 작성'
            )}
          </h1>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '1.1rem'
          }}>새로운 소식을 공유해보세요</p>
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          {/* 🆕 학교 전체 관리자인 경우 학교 정보 표시 */}
          {isSchoolAdmin ? (
            <div style={{ 
              marginBottom: '2rem', 
              padding: '1.5rem', 
              background: '#e0f2fe', 
              borderRadius: '12px',
              border: '1px solid #0ea5e9'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: '#0369a1',
                fontWeight: '600'
              }}>
                <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  학교 전체 관리자는 학교 전체 공지사항만 작성할 수 있습니다.
                </p>
              </div>
            </div>
          ) : classroomInfo && (
            <>
              <div style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem', 
                background: '#f8fafc', 
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                {/* 🆕 일반 교사인 경우 학교 정보 표시 */}
                <p style={{ 
                  fontWeight: '600', 
                  color: '#1e293b', 
                  margin: '0 0 1rem 0',
                  fontSize: '1rem'
                }}>
                  📍 {classroomInfo.school} {classroomInfo.grade}학년 {classroomInfo.class_number}반
                </p>
                
                {/* 🆕 일반 교사는 게시 범위 선택 가능 */}
                <div>
                  <label style={{ 
                    fontWeight: '600', 
                    marginBottom: '1rem', 
                    display: 'block',
                    color: '#1e293b'
                  }}>
                    게시 범위 선택:
                  </label>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.75rem 1rem',
                      background: postType === 'classroom' ? '#e0f2fe' : 'white',
                      border: `2px solid ${postType === 'classroom' ? '#0ea5e9' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        value="classroom"
                        checked={postType === 'classroom'}
                        onChange={(e) => setPostType(e.target.value)}
                        style={{ margin: 0 }}
                      />
                      <span style={{ fontWeight: '500', color: '#1e293b' }}>
                        📚 학급 공지 (우리 반만)
                      </span>
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.75rem 1rem',
                      background: postType === 'school' ? '#e0f2fe' : 'white',
                      border: `2px solid ${postType === 'school' ? '#0ea5e9' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        value="school"
                        checked={postType === 'school'}
                        onChange={(e) => setPostType(e.target.value)}
                        style={{ margin: 0 }}
                      />
                      <span style={{ fontWeight: '500', color: '#1e293b' }}>
                        🏫 학교 공지 (전체 학교)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            {/* 제목 입력 */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                fontWeight: '600', 
                marginBottom: '0.75rem', 
                display: 'block',
                color: '#1e293b',
                fontSize: '1rem'
              }}>
                제목 (50자 이내)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  fontSize: '1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  background: 'white',
                  transition: 'border-color 0.2s ease'
                }}
                placeholder="제목을 입력하세요"
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* 내용 입력 */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                fontWeight: '600', 
                marginBottom: '0.75rem', 
                display: 'block',
                color: '#1e293b',
                fontSize: '1rem'
              }}>
                내용 (1000자 이내)
              </label>
              
              {/* 에디터 툴바 */}
              {editor && (
                <div style={{
                  border: '1px solid #d1d5db',
                  borderBottom: 'none',
                  borderRadius: '8px 8px 0 0',
                  background: '#f8fafc',
                  padding: '0.75rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}>
                  {/* 텍스트 서식 */}
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('bold') ? '#3b82f6' : 'white',
                        color: editor.isActive('bold') ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.875rem'
                      }}
                      title="굵게"
                    >
                      B
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('italic') ? '#3b82f6' : 'white',
                        color: editor.isActive('italic') ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontStyle: 'italic',
                        fontSize: '0.875rem'
                      }}
                      title="기울임"
                    >
                      I
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('underline') ? '#3b82f6' : 'white',
                        color: editor.isActive('underline') ? 'white' : '#374151',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '0.875rem'
                      }}
                      title="밑줄"
                    >
                      U
                    </button>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: '#d1d5db' }}></div>

                  {/* 제목 레벨 */}
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().setParagraph().run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('paragraph') ? '#3b82f6' : 'white',
                        color: editor.isActive('paragraph') ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="본문"
                    >
                      본문
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('heading', { level: 1 }) ? '#3b82f6' : 'white',
                        color: editor.isActive('heading', { level: 1 }) ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                      title="제목 1"
                    >
                      H1
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('heading', { level: 2 }) ? '#3b82f6' : 'white',
                        color: editor.isActive('heading', { level: 2 }) ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                      title="제목 2"
                    >
                      H2
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('heading', { level: 3 }) ? '#3b82f6' : 'white',
                        color: editor.isActive('heading', { level: 3 }) ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                      title="제목 3"
                    >
                      H3
                    </button>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: '#d1d5db' }}></div>

                  {/* 텍스트 색상 */}
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      onInput={(e) => editor.chain().focus().setColor(e.target.value).run()}
                      value={editor.getAttributes('textStyle').color || '#000000'}
                      style={{
                        width: '30px',
                        height: '30px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title="글자 색상"
                    />
                    
                    <input
                      type="color"
                      onInput={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                      style={{
                        width: '30px',
                        height: '30px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title="배경 색상"
                    />
                  </div>

                  <div style={{ width: '1px', height: '20px', background: '#d1d5db' }}></div>

                  {/* 정렬 */}
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().setTextAlign('left').run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive({ textAlign: 'left' }) ? '#3b82f6' : 'white',
                        color: editor.isActive({ textAlign: 'left' }) ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="왼쪽 정렬"
                    >
                      ←
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().setTextAlign('center').run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive({ textAlign: 'center' }) ? '#3b82f6' : 'white',
                        color: editor.isActive({ textAlign: 'center' }) ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="가운데 정렬"
                    >
                      ↔
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().setTextAlign('right').run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive({ textAlign: 'right' }) ? '#3b82f6' : 'white',
                        color: editor.isActive({ textAlign: 'right' }) ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="오른쪽 정렬"
                    >
                      →
                    </button>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: '#d1d5db' }}></div>

                  {/* 목록 */}
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('bulletList') ? '#3b82f6' : 'white',
                        color: editor.isActive('bulletList') ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="글머리 기호"
                    >
                      ●
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('orderedList') ? '#3b82f6' : 'white',
                        color: editor.isActive('orderedList') ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="번호 매기기"
                    >
                      1.
                    </button>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: '#d1d5db' }}></div>

                  {/* 기타 */}
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBlockquote().run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: editor.isActive('blockquote') ? '#3b82f6' : 'white',
                        color: editor.isActive('blockquote') ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="인용문"
                    >
                      " "
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().setHorizontalRule().run()}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="구분선"
                    >
                      ―
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{
                border: '1px solid #d1d5db',
                borderTop: editor ? 'none' : '1px solid #d1d5db',
                borderRadius: editor ? '0 0 8px 8px' : '8px',
                background: 'white',
                overflow: 'hidden'
              }}>
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* 이미지 업로드 */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                fontWeight: '600', 
                marginBottom: '0.75rem', 
                display: 'block',
                color: '#1e293b',
                fontSize: '1rem'
              }}>
                이미지 추가
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* 파일 첨부 */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                fontWeight: '600', 
                marginBottom: '0.75rem', 
                display: 'block',
                color: '#1e293b',
                fontSize: '1rem'
              }}>
                파일 첨부 (최대 3개)
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files).slice(0, 3);
                  setFiles(selectedFiles);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '0.9rem'
                }}
              />
              {files.length > 0 && (
                <div style={{ 
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{ 
                    margin: '0 0 0.5rem 0', 
                    fontWeight: '500', 
                    color: '#64748b',
                    fontSize: '0.9rem'
                  }}>
                    선택된 파일:
                  </p>
                  <ul style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    {files.map((file, idx) => (
                      <li key={idx} style={{ 
                        color: '#1e293b',
                        fontSize: '0.9rem',
                        padding: '0.25rem 0'
                      }}>
                        📎 {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 버튼 영역 */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'flex-end',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  padding: '0.875rem 1.75rem',
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
                취소
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.875rem 1.75rem',
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
                작성 완료
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PostWritePage;