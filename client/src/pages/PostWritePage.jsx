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
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const token = getToken();
  const user = getCurrentUser();
  
  // 🔥 중복 실행 방지를 위한 ref
  const hasNavigatedRef = useRef(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

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
        class: 'editor-content',
        style: 'min-height: 200px; padding: 1rem; border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; outline: none; background: var(--bg-primary, #ffffff); color: var(--text-primary, #1e293b);'
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
          if (data.classroom) {
            setClassroomInfo(data.classroom);
            console.log('✅ 학급 정보 로드 성공:', data.classroom);
          } else {
            console.log('⚠️ 학급 정보가 없음 - 관리자 권한으로 진행');
          }
        })
        .catch(err => {
          console.error('❌ 학급 정보 조회 오류:', err);
          // 관리자인 경우 학급 정보가 없어도 진행 가능
          if (!isAdmin) {
            alert('학급 정보를 불러오는데 실패했습니다.');
            navigate(-1);
          } else {
            console.log('⚠️ 관리자 권한으로 학급 정보 없이 진행');
          }
        });
    }
  }, [classroomId, schoolId, user, token, navigate, isSchoolAdmin, initialType]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB 제한
      alert('이미지는 5MB 이하로 업로드해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      editor?.chain().focus().setImage({ src: e.target.result }).run();
    };
    reader.readAsDataURL(file);

    // 파일 입력 초기화
    event.target.value = '';
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    if (selectedFiles.length > 3) {
      alert('최대 3개의 파일만 첨부할 수 있습니다.');
      return;
    }

    // 파일 크기 검증 (각 파일 10MB 제한)
    const oversizedFiles = selectedFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert('각 파일은 10MB 이하로 업로드해주세요.');
      return;
    }

    setFiles(selectedFiles);
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    
    // 파일 입력 업데이트
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      newFiles.forEach(file => dt.items.add(file));
      fileInputRef.current.files = dt.files;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!editor?.getHTML() || editor.getHTML() === '<p></p>') {
      alert('내용을 입력해주세요.');
      return;
    }

    if (title.length > 50) {
      alert('제목은 50자 이내로 입력해주세요.');
      return;
    }

    const content = editor.getHTML();
    if (content.length > 5000) { // HTML 포함 길이 제한
      alert('내용이 너무 깁니다. 줄여주세요.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      
      // 🔥 postType에 따라 다른 로직
      if (postType === 'school' && schoolId) {
        formData.append('school_id', schoolId);
        formData.append('school_wide', 'true');
        console.log('🏫 학교 전체 공지로 작성');
      } else if (classroomId) {
        formData.append('classroom_id', classroomId);
        console.log('📚 학급 공지로 작성');
      } else {
        throw new Error('학급 또는 학교 정보가 필요합니다.');
      }

      // 파일 첨부
      files.forEach(file => {
        formData.append('files', file);
      });

      console.log('📤 게시글 제출:', { title, postType, classroomId, schoolId });

      const response = await fetch('http://localhost:3001/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '게시글 작성에 실패했습니다.');
      }

      const result = await response.json();
      console.log('✅ 게시글 작성 성공:', result);

      alert('게시글이 성공적으로 작성되었습니다!');
      
      // 🔥 작성 완료 후 해당 게시판으로 이동
      if (postType === 'school' && schoolId) {
        navigate(`/posts?school_id=${schoolId}`);
      } else if (classroomId) {
        navigate(`/posts?classroom_id=${classroomId}`);
      } else {
        navigate(-1);
      }

    } catch (error) {
      console.error('❌ 게시글 작성 오류:', error);
      alert(error.message || '게시글 작성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const getPageTitle = () => {
    if (isSchoolAdmin) {
      return '🏫 학교 전체 공지 작성';
    } else if (postType === 'school') {
      return '🏫 학교 공지 작성';
    } else if (classroomInfo) {
      return `📝 ${classroomInfo.grade}학년 ${classroomInfo.class_number}반 공지 작성`;
    } else if (isAdmin && classroomId) {
      return '📝 학급 공지 작성';
    } else {
      return '📝 공지 작성';
    }
  };

  const getPageSubtitle = () => {
    if (isSchoolAdmin) {
      return '학교 전체에 공지사항을 작성하세요';
    } else if (postType === 'school') {
      return '학교 전체에 공지사항을 작성하세요';
    } else {
      return '학급에 공지사항을 작성하세요';
    }
  };

  return (
    <div className="post-write-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <div className="title-section">
              <h1 className="page-title">{getPageTitle()}</h1>
              <p className="page-subtitle">{getPageSubtitle()}</p>
            </div>
            <div className="header-actions">
              <button 
                type="button"
                onClick={() => navigate(-1)}
                className="cancel-button"
              >
                <span className="button-icon">←</span>
                취소
              </button>
            </div>
          </div>
        </div>

        {/* 메인 폼 */}
        <div className="form-section">
          {/* 공지 유형 선택 (관리자만) */}
          {isAdmin && !isSchoolAdmin && (classroomId && schoolId) && (
            <div className="type-selector">
              <h3 className="section-title">📌 공지 유형 선택</h3>
              <div className="type-options">
                <label className={`type-option ${postType === 'classroom' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="postType"
                    value="classroom"
                    checked={postType === 'classroom'}
                    onChange={(e) => setPostType(e.target.value)}
                  />
                  <div className="option-content">
                    <span className="option-icon">📚</span>
                    <div className="option-text">
                      <div className="option-title">학급 공지</div>
                      <div className="option-desc">현재 학급에만 표시됩니다</div>
                    </div>
                  </div>
                </label>
                <label className={`type-option ${postType === 'school' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="postType"
                    value="school"
                    checked={postType === 'school'}
                    onChange={(e) => setPostType(e.target.value)}
                  />
                  <div className="option-content">
                    <span className="option-icon">🏫</span>
                    <div className="option-text">
                      <div className="option-title">학교 전체 공지</div>
                      <div className="option-desc">전체 학급에 표시됩니다</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="write-form">
            {/* 제목 입력 */}
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">제목</span>
                <span className="label-required">*</span>
                <span className="label-counter">({title.length}/50)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                placeholder="제목을 입력하세요"
                maxLength={50}
                required
              />
            </div>

            {/* 내용 입력 */}
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">내용</span>
                <span className="label-required">*</span>
              </label>
              <div className="editor-wrapper">
                <div className="editor-toolbar">
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`toolbar-button ${editor?.isActive('bold') ? 'active' : ''}`}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`toolbar-button ${editor?.isActive('italic') ? 'active' : ''}`}
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`toolbar-button ${editor?.isActive('bulletList') ? 'active' : ''}`}
                  >
                    •
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="toolbar-button"
                  >
                    🖼️
                  </button>
                </div>
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* 이미지 업로드 (숨김) */}
            <input 
              ref={imageInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            {/* 파일 첨부 */}
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">파일 첨부</span>
                <span className="label-optional">(최대 3개, 각 10MB 이하)</span>
              </label>
              <div className="file-upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="file-input"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="file-upload-label">
                  <span className="upload-icon">📎</span>
                  <span className="upload-text">
                    파일을 선택하거나 드래그하여 업로드하세요
                  </span>
                </label>
              </div>
              
              {/* 첨부된 파일 목록 */}
              {files.length > 0 && (
                <div className="file-list">
                  <h4 className="file-list-title">첨부된 파일 ({files.length}/3)</h4>
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-info">
                        <span className="file-icon">📄</span>
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">
                          ({(file.size / 1024 / 1024).toFixed(2)}MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="file-remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 업로드 진행률 */}
            {loading && uploadProgress > 0 && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className="progress-text">업로드 중... {uploadProgress}%</span>
              </div>
            )}

            {/* 제출 버튼 */}
            <div className="form-actions">
              <button
                type="submit"
                disabled={loading || !title.trim() || !editor?.getHTML() || editor?.getHTML() === '<p></p>'}
                className="submit-button"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    작성 중...
                  </>
                ) : (
                  <>
                    <span className="button-icon">📝</span>
                    작성 완료
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        /* CSS 변수 정의 */
        .post-write-page {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-glass: rgba(255, 255, 255, 0.95);
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --accent-color: #4f46e5;
          --accent-hover: #4338ca;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --error-color: #ef4444;
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
        }

        .post-write-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        /* 헤더 */
        .header {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-xl);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .title-section {
          flex: 1;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.5rem 0;
        }

        .page-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin: 0;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .cancel-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .cancel-button:hover {
          background: var(--text-muted);
          color: white;
          transform: translateY(-1px);
        }

        .button-icon {
          font-size: 1.1rem;
        }

        /* 폼 섹션 */
        .form-section {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          padding: 2rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        /* 타입 선택기 */
        .type-selector {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
        }

        .section-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 1.5rem 0;
        }

        .type-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .type-option {
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .type-option input[type="radio"] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .option-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: var(--bg-primary);
          border: 2px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
        }

        .type-option:hover .option-content {
          border-color: var(--accent-color);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .type-option.active .option-content {
          border-color: var(--accent-color);
          background: linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%);
          box-shadow: var(--shadow-md);
        }

        .option-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .option-text {
          flex: 1;
        }

        .option-title {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .option-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* 폼 요소 */
        .write-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .form-label {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .label-text {
          font-size: 1rem;
        }

        .label-required {
          color: var(--error-color);
          font-weight: 700;
        }

        .label-optional {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 400;
        }

        .label-counter {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 400;
          margin-left: auto;
        }

        .form-input {
          width: 100%;
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 1rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        /* 에디터 */
        .editor-wrapper {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--bg-primary);
          transition: all 0.2s ease;
        }

        .editor-wrapper:focus-within {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .editor-toolbar {
          display: flex;
          gap: 0.25rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        .toolbar-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .toolbar-button:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .toolbar-button.active {
          background: var(--accent-color);
          color: white;
        }

        :global(.editor-content) {
          min-height: 200px;
          padding: 1rem;
          line-height: 1.6;
        }

        :global(.editor-content p) {
          margin-bottom: 1rem;
        }

        :global(.editor-content ul) {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }

        :global(.editor-content img) {
          max-width: 100%;
          height: auto;
          border-radius: var(--radius-sm);
          margin: 1rem 0;
        }

        /* 파일 업로드 */
        .file-upload-area {
          position: relative;
        }

        .file-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .file-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem 2rem;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .file-upload-label:hover {
          border-color: var(--accent-color);
          background: linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%);
        }

        .upload-icon {
          font-size: 2rem;
          color: var(--text-muted);
        }

        .upload-text {
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* 파일 목록 */
        .file-list {
          margin-top: 1rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .file-list-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 1rem 0;
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--bg-primary);
          border-radius: var(--radius-sm);
          margin-bottom: 0.5rem;
          border: 1px solid var(--border-color);
        }

        .file-item:last-child {
          margin-bottom: 0;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .file-icon {
          font-size: 1.2rem;
          color: var(--text-muted);
        }

        .file-name {
          font-weight: 500;
          color: var(--text-primary);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .file-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 50%;
          background: var(--error-color);
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .file-remove:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        /* 업로드 진행률 */
        .upload-progress {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: var(--border-color);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-align: center;
        }

        /* 제출 버튼 */
        .form-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .submit-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
          min-width: 140px;
          justify-content: center;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .post-write-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --bg-glass: rgba(30, 41, 59, 0.95);
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --text-muted: #94a3b8;
            --border-color: #475569;
          }

          .type-option.active .option-content {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          }

          .file-upload-label:hover {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 1024px) {
          .container {
            max-width: 100%;
            padding: 0 0.5rem;
          }

          .header {
            padding: 1.5rem;
          }

          .page-title {
            font-size: 1.75rem;
          }

          .form-section {
            padding: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .post-write-page {
            padding: 0.5rem;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1.5rem;
          }

          .title-section {
            text-align: center;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .page-subtitle {
            font-size: 1rem;
          }

          .header-actions {
            justify-content: center;
          }

          .cancel-button {
            padding: 0.75rem 1.25rem;
          }

          .type-options {
            grid-template-columns: 1fr;
          }

          .option-content {
            padding: 1.25rem;
          }

          .form-label {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .label-counter {
            margin-left: 0;
          }

          .editor-toolbar {
            padding: 0.5rem;
            gap: 0.125rem;
          }

          .toolbar-button {
            width: 28px;
            height: 28px;
            font-size: 0.8rem;
          }

          .file-upload-label {
            padding: 2rem 1rem;
          }

          .file-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .file-name {
            white-space: normal;
            word-break: break-word;
          }

          .submit-button {
            padding: 0.875rem 1.5rem;
            min-width: 120px;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 1rem;
          }

          .page-title {
            font-size: 1.25rem;
          }

          .page-subtitle {
            font-size: 0.9rem;
          }

          .form-section {
            padding: 1rem;
          }

          .write-form {
            gap: 1.5rem;
          }

          .form-input {
            padding: 0.875rem;
          }

          :global(.editor-content) {
            min-height: 150px;
            padding: 0.875rem;
          }

          .file-upload-label {
            padding: 1.5rem 1rem;
          }

          .upload-icon {
            font-size: 1.5rem;
          }

          .upload-text {
            font-size: 0.9rem;
          }

          .file-item {
            padding: 0.625rem;
          }

          .submit-button {
            padding: 0.75rem 1.25rem;
            font-size: 0.9rem;
          }
        }

        /* 접근성 개선 */
        .cancel-button:focus,
        .submit-button:focus,
        .form-input:focus,
        .file-upload-label:focus,
        .toolbar-button:focus,
        .file-remove:focus {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }

        /* 인쇄 스타일 */
        @media print {
          .post-write-page {
            background: white;
            padding: 0;
          }

          .header,
          .form-section {
            background: white;
            box-shadow: none;
            border: 1px solid #ccc;
          }

          .header-actions,
          .form-actions,
          .file-upload-area,
          .editor-toolbar {
            display: none;
          }

          .type-selector {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default PostWritePage;

        