import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import '../styles/editor.css';

function PostWritePage() {
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState([]);
  const [classroomInfo, setClassroomInfo] = useState(null);
  const [postType, setPostType] = useState('classroom');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSchoolId, setUserSchoolId] = useState(null);

  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');
  const schoolId = searchParams.get('school_id'); // 🆕 학교 전체 관리자용

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: '',
    placeholder: '여기에 내용을 입력하세요...',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4 border border-gray-300 rounded-md',
      },
    },
  });

  // 🆕 사용자 정보 추출
  useEffect(() => {
    const parseJwt = (token) => {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch {
        return null;
      }
    };
    
    const payload = parseJwt(token);
    if (payload) {
      setIsAdmin(payload.is_admin || false);
      setUserSchoolId(payload.school_id || null);
      
      // 🆕 학교 전체 관리자인 경우 자동으로 학교 공지로 설정
      if (payload.is_admin && schoolId && !classroomId) {
        setPostType('school');
      }
    }
  }, [token, schoolId, classroomId]);

  useEffect(() => {
    if (!classroomId) return;
    const fetchClassroomInfo = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setClassroomInfo(data);
      } catch (err) {
        console.error('학급 정보 불러오기 실패:', err);
      }
    };
    fetchClassroomInfo();
  }, [classroomId, token]);

  const handlePost = async () => {
    if (!title.trim()) return alert('제목을 입력하세요.');
    if (!editor || !editor.getHTML().trim()) return alert('내용을 입력하세요.');

    const content = editor.getHTML();
    if (title.length > 50) return alert('제목은 50자 이내로 작성하세요.');
    if (content.replace(/<[^>]*>/g, '').length > 1000) return alert('내용은 1000자 이내로 작성하세요.');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    
    // 🆕 학교 전체 관리자 처리
    if (isAdmin && schoolId && !classroomId) {
      // 학교 전체 관리자인 경우 classroom_id 없이 전송
      formData.append('school_wide', 'true');
    } else {
      // 일반 교사인 경우
      formData.append('classroom_id', classroomId);
      formData.append('school_wide', postType === 'school');
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
        if (isAdmin && schoolId && !classroomId) {
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
        {isAdmin && schoolId && !classroomId ? '학교 전체 공지 작성' : '공지사항 작성'}
      </h1>

      {/* 🆕 학교 전체 관리자인 경우 학교 정보 표시 */}
      {isAdmin && schoolId && !classroomId ? (
        <p style={{ 
          marginBottom: '1.5rem', 
          fontWeight: 'bold', 
          padding: '1rem', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px',
          border: '1px solid #90caf9'
        }}>
          🏫 학교 전체 공지사항으로 작성됩니다.
        </p>
      ) : classroomInfo ? (
        <p style={{ 
          marginBottom: '1.5rem', 
          fontWeight: 'bold', 
          padding: '1rem', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '8px' 
        }}>
          대상 학급: {classroomInfo.grade}학년 {classroomInfo.class_number}반 ({classroomInfo.school})
        </p>
      ) : null}

      {/* 🆕 공지사항 유형 선택 (일반 교사만) */}
      {!isAdmin && classroomInfo && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          border: '1px solid #d1d5db', 
          borderRadius: '8px', 
          backgroundColor: '#f9fafb' 
        }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            공지사항 유형 선택
          </label>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="classroom"
                checked={postType === 'classroom'}
                onChange={(e) => setPostType(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px' }}>
                📚 학급 공지사항 
                <small style={{ color: '#6b7280', display: 'block' }}>
                  해당 학급 학생들에게만 알림
                </small>
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="school"
                checked={postType === 'school'}
                onChange={(e) => setPostType(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px' }}>
                🏫 학교 전체 공지사항
                <small style={{ color: '#6b7280', display: 'block' }}>
                  학교 전체 학생들에게 알림
                </small>
              </span>
            </label>
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="제목 (최대 50자)"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 50))}
        style={{ 
          display: 'block', 
          marginBottom: '1.5rem', 
          width: '100%', 
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '16px'
        }}
      />

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          내용
        </label>
        <div style={{ 
          border: '1px solid #d1d5db', 
          borderRadius: '6px',
          minHeight: '200px'
        }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          본문 중간에 삽입할 이미지 선택
        </label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          style={{ padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          첨부 파일 선택 (최대 10개)
        </label>
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 10))}
          style={{ padding: '8px' }}
        />
        <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
          개당 10MB 이하만 업로드 가능
        </div>
        {files.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <strong>선택된 파일:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {files.map((file, index) => (
                <li key={index} style={{ fontSize: '14px', color: '#374151' }}>
                  {file.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button 
        onClick={handlePost}
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
      >
        {isAdmin && schoolId && !classroomId 
          ? '🏫 학교 전체 공지 작성' 
          : postType === 'school' 
          ? '🏫 학교 전체 공지 작성' 
          : '📚 학급 공지 작성'}
      </button>
    </div>
  );
}

export default PostWritePage;