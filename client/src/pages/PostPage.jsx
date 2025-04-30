import { useState, useEffect } from 'react';

function PostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('공지');
  const [scope, setScope] = useState('classroom'); // 기본: 학급 게시판
  const [myClassrooms, setMyClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/my-classrooms', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.classrooms.length > 0) {
          setMyClassrooms(data.classrooms);
          setSelectedClassroomId(data.classrooms[0].classroom_id); // ✅ 첫 학급 기본 선택
        }
      } catch (err) {
        console.error('학급 목록 불러오기 실패:', err);
      }
    };

    fetchClassrooms();
  }, [token]);

  const handlePost = async () => {
    let postData = {
      title,
      content,
      category,
      school_wide: false,
    };

    if (scope === 'classroom') {
      postData.classroom_id = selectedClassroomId;
    } else if (scope === 'grade') {
      postData.grade = 3; // 나중에 실제 내 학년 불러오기
    } else if (scope === 'school') {
      postData.school_wide = true;
    }

    try {
      const res = await fetch('http://localhost:3001/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      });

      const data = await res.json();
      if (res.ok) {
        alert('게시글 작성 완료!');
        setTitle('');
        setContent('');
        setCategory('공지');
        setScope('classroom');
        if (myClassrooms.length > 0) {
          setSelectedClassroomId(myClassrooms[0].classroom_id);
        }
      } else {
        alert(data.error || '작성 실패');
      }
    } catch (err) {
      console.error('게시글 작성 오류:', err);
      alert('서버 연결 오류');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>게시글 작성</h1>

      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem' }}
      />

      <textarea
        placeholder="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ display: 'block', width: '300px', height: '150px', marginBottom: '1rem' }}
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
            value="grade"
            checked={scope === 'grade'}
            onChange={(e) => setScope(e.target.value)}
          />
          학년 게시판
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

      {/* ✅ 학급 선택 드롭다운 */}
      {scope === 'classroom' && myClassrooms.length > 0 && (
        <select
          value={selectedClassroomId || ''}
          onChange={(e) => setSelectedClassroomId(parseInt(e.target.value))}
          style={{ marginBottom: '1rem', display: 'block' }}
        >
          {myClassrooms.map(c => (
            <option key={c.classroom_id} value={c.classroom_id}>
              {c.grade}학년 {c.class_number}반 ({c.school})
            </option>
          ))}
        </select>
      )}

      <button onClick={handlePost}>글 작성하기</button>
    </div>
  );
}

export default PostPage;
