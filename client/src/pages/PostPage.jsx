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

  const { user: currentUser } = useContext(AuthContext);
  const postsPerPage = 10;
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

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

  const fetchPosts = async () => {
    if (!classroomId) return;

    try {
      let url = `http://localhost:3001/api/posts?classroom_id=${classroomId}`;
      if (keywordFromNav.trim()) {
        url += `&search=${encodeURIComponent(keywordFromNav.trim())}`;
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

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', margin: '2rem 0' }}>
        {classroomName}
      </h2>

      <div style={{ marginBottom: '1rem' }}>
        {['classroom', 'school'].map(type => (
          <button
            key={type}
            onClick={() => setScope(type)}
            style={{
              padding: '0.5rem 1.2rem',
              border: '1px solid #aaa',
              borderRadius: '5px',
              backgroundColor: scope === type ? '#f6f2e8' : '#fff',
              fontWeight: scope === type ? 'bold' : 'normal',
              marginRight: '1rem',
              cursor: 'pointer'
            }}
          >
            {type === 'classroom' ? '학급 공지사항' : '학교 공지사항'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="제목 또는 내용 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '0.5rem',
            width: '200px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
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
          <button onClick={() => navigate(`/posts/write?classroom_id=${classroomId}`)}>게시글 작성</button>
        </div>
      )}

      {currentPosts.length === 0 ? (
        <p>게시글이 없습니다.</p>
      ) : (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '1rem'
        }}>
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
                onClick={() => navigate(`/posts/${post.post_id}?classroom_id=${classroomId}`)}
                style={{ cursor: 'pointer', borderBottom: '1px solid #ccc' }}
              >
                <td style={tdStyle}>{indexOfFirst + index + 1}</td>
                <td style={{ ...tdStyle, textAlign: 'left', color: '#3366cc' }}>
                  {post.school_wide ? '[학교 전체] ' : ''}{post.title}
                </td>
                <td style={tdStyle}>{post.author_name || '작성자 없음'}</td>
                <td style={tdStyle}>{post.created_at?.slice(0, 10)}</td>
                <td style={tdStyle}>{post.views ?? 0}</td>
                <td style={tdStyle}>{post.likes ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', gap: '0.5rem' }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: currentPage === page ? '#e6e6ff' : '#fff',
              fontWeight: currentPage === page ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}

const thStyle = {
  borderBottom: '2px solid #ccc',
  padding: '12px',
  backgroundColor: '#f9f9f9'
};

const tdStyle = {
  padding: '12px',
  textAlign: 'center'
};

export default PostPage;
