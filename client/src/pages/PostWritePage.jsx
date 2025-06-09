// client/src/pages/PostWritePage.jsx
import React, { useState, useEffect, useRef } from 'react';
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
    extensions: [StarterKit, Image],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height: 200px; padding: 1rem; border: 1px solid #d1d5db; border-radius: 8px; outline: none;'
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
          
          // 🔥 수정: data 자체가 classroom 객체인 경우도 처리
          const classroom = data.classroom || data;
          
          // 🔥 classroom_id가 있는지 확인 (유효한 학급 정보인지 확인)
          if (classroom && (classroom.classroom_id || classroom.grade)) {
            setClassroomInfo(classroom);
            console.log('✅ 학급 정보 로드 성공:', classroom);
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
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>
            ⚠️ 학교 전체 관리자는 학교 전체 공지사항만 작성할 수 있습니다.
          </p>
        </div>
      ) : classroomInfo && (
        <>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <p style={{ fontWeight: 'bold', color: '#333' }}>
              {classroomInfo.school_name} {classroomInfo.grade}학년 {classroomInfo.class_number}반
            </p>
          </div>

          {/* 🆕 일반 교사는 게시 범위 선택 가능 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>
              게시 범위 선택:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label>
                <input
                  type="radio"
                  value="classroom"
                  checked={postType === 'classroom'}
                  onChange={(e) => setPostType(e.target.value)}
                />
                <span style={{ marginLeft: '0.5rem' }}>📚 학급 공지 (우리 반만)</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="school"
                  checked={postType === 'school'}
                  onChange={(e) => setPostType(e.target.value)}
                />
                <span style={{ marginLeft: '0.5rem' }}>🏫 학교 공지 (전체 학교)</span>
              </label>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>
            제목 (50자 이내)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
            placeholder="제목을 입력하세요"
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>
            내용 (1000자 이내)
          </label>
          <EditorContent editor={editor} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>
            이미지 추가
          </label>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>
            파일 첨부 (최대 3개)
          </label>
          <input
            type="file"
            multiple
            onChange={(e) => {
              const selectedFiles = Array.from(e.target.files).slice(0, 3);
              setFiles(selectedFiles);
            }}
          />
          {files.length > 0 && (
            <ul style={{ marginTop: '0.5rem' }}>
              {files.map((file, idx) => (
                <li key={idx} style={{ color: '#666' }}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ccc',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            취소
          </button>
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            작성 완료
          </button>
        </div>
      </form>
    </div>
  );
}

export default PostWritePage;