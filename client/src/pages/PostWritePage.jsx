import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function PostWritePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('공지');
  const [scope, setScope] = useState('classroom');
  const [classroomInfo, setClassroomInfo] = useState(null);
  const [file, setFile] = useState(null);

  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');

  // ✅ 학급 정보 불러오기
  useEffect(() => {
    const fetchClassroomInfo = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setClassroomInfo(data);
        }
      } catch (err) {
        console.error('학급 정보 불러오기 실패:', err);
      }
    };

    if (classroomId) {
      fetchClassroomInfo();
    }
  }, [classroomId, token]);

  const handlePost = async () => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('category', category);

    if (scope === 'classroom') {
      formData.append('classroom_id', classroomId);
    } else if (scope === 'school') {
      formData.append('school_wide', true);
    }

    if (file) {
      formData.append('file', file);
    }

    try {
      const res = await fetch('http://localhost:3001/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        alert('게시글 작성 완료!');
        navigate(`/posts?classroom_id=${classroomId}`);
      } else {
        alert(data.error || '작성 실패');
      }
    } catch (err) {
      console.error('🔥 게시글 작성 오류:', err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>게시글 작성</h1>

      {classroomInfo && (
        <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
          대상 학급: {classroomInfo.grade}학년 {classroomInfo.class_number}반 ({classroomInfo.school})
        </p>
      )}

      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem', width: '300px' }}
      />

      <textarea
        placeholder="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ width: '300px', height: '150px', marginBottom: '1rem' }}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ marginBottom: '1rem' }}
      >
        <option value="공지">공지</option>
        <option value="자유">자유</option>
        <option value="질문">질문</option>
      </select>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input
            type="radio"
            name="scope"
            value="classroom"
            checked={scope === 'classroom'}
            onChange={(e) => setScope(e.target.value)}
          />
          학급 게시판
        </label>
        <label style={{ marginLeft: '1rem' }}>
          <input
            type="radio"
            name="scope"
            value="school"
            checked={scope === 'school'}
            onChange={(e) => setScope(e.target.value)}
          />
          학교 전체 게시판
        </label>
      </div>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        style={{ marginBottom: '1rem', display: 'block' }}
      />

      <button onClick={handlePost}>글 작성하기</button>
    </div>
  );
}

export default PostWritePage;
