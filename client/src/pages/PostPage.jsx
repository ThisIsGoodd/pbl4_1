import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function PostPage() {
  const [posts, setPosts] = useState([]);
  const [classroomName, setClassroomName] = useState('-학년 -반');
  const [scope, setScope] = useState('classroom');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [sortOption, setSortOption] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const keywordFromNav = searchParams.get('search') || '';
  const classroomId = searchParams.get('classroom_id');

  const { currentUser } = useContext(AuthContext);
  const postsPerPage = 10;
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // ✅ 학급 이름 가져오기 (쿼리 기반)
  useEffect(() => {
    const fetchClassroomName = async () => {
      if (!classroomId) return;
      try {
        const res = await fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setClassroomName(`${data.grade}학년 ${data.class_number}반`);
        }
      } catch (err) {
        console.error('학급 정보 불러오기 실패:', err);
      }
    };

    fetchClassroomName();
  }, [classroomId, token]);

  // ✅ 게시글 목록 불러오기
  const fetchPosts = async () => {
    try {
      let url = 'http://localhost:3001/api/posts';
      if (keywordFromNav.trim()) {
        url += `?search=${encodeURIComponent(keywordFromNav.trim())}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '게시글 불러오기 실패');
        return;
      }

      let filtered = data.posts || [];

      if (scope === 'classroom') {
        filtered = filtered.filter(p => p.classroom_id && !p.school_wide);
      } else if (scope === 'school') {
        filtered = filtered.filter(p => p.school_wide);
      }

      if (categoryFilter !== '전체') {
        filtered = filtered.filter(p => p.category === categoryFilter);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
          p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
        );
      }

      if (sortOption === 'latest') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (sortOption === 'views') {
        filtered.sort((a, b) => b.views - a.views);
      }

      setPosts(filtered);
    } catch (err) {
      console.error('게시글 목록 불러오기 실패:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
    setCurrentPage(1);
  }, [scope, categoryFilter, searchQuery, sortOption, keywordFromNav]);

  const indexOfLast = currentPage * postsPerPage;
  const indexOfFirst = indexOfLast - postsPerPage;
  const currentPosts = posts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(posts.length / postsPerPage);

  // ✅ 스타일 정의
  const pageTitleStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '2rem 0'
  };

  const tabButtonStyle = (selected) => ({
    padding: '0.5rem 1.2rem',
    border: '1px solid #aaa',
    borderRadius: '5px',
    backgroundColor: selected ? '#f6f2e8' : '#fff',
    fontWeight: selected ? 'bold' : 'normal',
    marginRight: '1rem',
    cursor: 'pointer'
  });

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem'
  };

  const thStyle = {
    borderBottom: '2px solid #ccc',
    padding: '12px 10px',
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    fontSize: '0.95rem'
  };

  const tdStyle = {
    padding: '12px 10px',
    textAlign: 'center',
    fontSize: '0.9rem'
  };

  const searchContainerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '1.5rem'
  };

  const searchInputStyle = {
    padding: '0.5rem',
    width: '200px',
    border: '1px solid #ccc',
    borderRadius: '4px'
  };

  const paginationStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1.5rem',
    gap: '0.5rem'
  };

  const paginationButtonStyle = (active) => ({
    padding: '6px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: active ? '#e6e6ff' : '#fff',
    fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer'
  });

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <h2 style={pageTitleStyle}>{classroomName}</h2>

      <div style={{ marginBottom: '1rem' }}>
        {['classroom', 'school'].map(type => (
          <button
            key={type}
            onClick={() => setScope(type)}
            style={tabButtonStyle(scope === type)}
          >
            {type === 'classroom' ? '학급 공지사항' : '학교 공지사항'}
          </button>
        ))}
      </div>

      <div style={searchContainerStyle}>
        <input
          type="text"
          placeholder="제목 또는 내용 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label>카테고리: </label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="전체">전체</option>
            <option value="공지">공지</option>
            <option value="자유">자유</option>
            <option value="질문">질문</option>
          </select>
        </div>
        <div>
          <label>정렬: </label>
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
            <option value="latest">최신순</option>
            <option value="views">조회수순</option>
          </select>
        </div>
      </div>

      {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => navigate('/posts/write')}>게시글 작성</button>
        </div>
      )}

      {currentPosts.length === 0 ? (
        <p>게시글이 없습니다.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>번호</th>
              <th style={thStyle}>제목</th>
              <th style={thStyle}>작성자</th>
              <th style={thStyle}>등록일</th>
              <th style={thStyle}>조회수</th>
              <th style={thStyle}>공감수</th>
            </tr>
          </thead>
          <tbody>
            {currentPosts.map((post, index) => (
              <tr
                key={post.post_id}
                onClick={() => navigate(`/posts/${post.post_id}`)}
                style={{ cursor: 'pointer', borderBottom: '1px solid #ccc' }}
              >
                <td style={tdStyle}>{indexOfFirst + index + 1}</td>
                <td style={{ ...tdStyle, textAlign: 'left', color: '#3366cc' }}>{post.title}</td>
                <td style={tdStyle}>{post.author_name || '작성자 없음'}</td>
                <td style={tdStyle}>{post.created_at?.slice(0, 10)}</td>
                <td style={tdStyle}>{post.views ?? 0}</td>
                <td style={tdStyle}>{post.likes ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={paginationStyle}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            style={paginationButtonStyle(currentPage === page)}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}

export default PostPage;
