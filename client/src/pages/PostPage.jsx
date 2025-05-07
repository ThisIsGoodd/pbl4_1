import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function PostPage() {
  const [posts, setPosts] = useState([]);
  const [scope, setScope] = useState('classroom');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const fetchPosts = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/posts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '게시글 불러오기 실패');
        return;
      }

      let filtered = data.posts || [];

      // ✅ 필터 적용
      if (scope === 'classroom') {
        filtered = filtered.filter(p => p.classroom_id && !p.school_wide);
      } else if (scope === 'grade') {
        filtered = filtered.filter(p => p.grade && !p.school_wide);
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
  }, [scope, categoryFilter, searchQuery, sortOption]);

  const indexOfLast = currentPage * postsPerPage;
  const indexOfFirst = indexOfLast - postsPerPage;
  const currentPosts = posts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(posts.length / postsPerPage);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>게시글 목록</h1>

      {/* 범위 탭 */}
      <div style={{ marginBottom: '1rem' }}>
        {['classroom', 'grade', 'school'].map(type => (
          <button
            key={type}
            onClick={() => setScope(type)}
            style={{
              marginRight: '1rem',
              fontWeight: scope === type ? 'bold' : 'normal'
            }}
          >
            {type === 'classroom' ? '학급 게시판' : type === 'grade' ? '학년 게시판' : '학교 전체 게시판'}
          </button>
        ))}
      </div>

      {/* 카테고리 필터 */}
      <div style={{ marginBottom: '1rem' }}>
        <label>카테고리: </label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ marginLeft: '0.5rem' }}
        >
          <option value="전체">전체</option>
          <option value="공지">공지</option>
          <option value="자유">자유</option>
          <option value="질문">질문</option>
        </select>
      </div>

      {/* 정렬 필터 */}
      <div style={{ marginBottom: '1rem' }}>
        <label>정렬: </label>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          style={{ marginLeft: '0.5rem' }}
        >
          <option value="latest">최신순</option>
          <option value="views">조회수순</option>
        </select>
      </div>

      {/* 작성 버튼 */}
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/posts/write')}>게시글 작성</button>
      </div>

      {/* 게시글 목록 */}
      {currentPosts.length === 0 ? (
        <p>게시글이 없습니다.</p>
      ) : (
        <ul>
          {currentPosts.map(post => (
            <li key={post.post_id} style={{ marginBottom: '1.5rem' }}>
              <Link to={`/posts/${post.post_id}`}>
                <strong>{post.title}</strong> ({post.category})<br />
                <small>{new Date(post.created_at).toLocaleString()}</small>
              </Link>
              <hr />
            </li>
          ))}
        </ul>
      )}

      {/* 페이지네이션 */}
      <div style={{ marginTop: '1rem' }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            style={{
              margin: '0 5px',
              fontWeight: currentPage === page ? 'bold' : 'normal'
            }}
          >
            {page}
          </button>
        ))}
      </div>

      {/* 검색창 */}
      <div style={{ marginTop: '2rem' }}>
        <label>검색: </label>
        <input
          type="text"
          placeholder="제목 또는 내용 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '300px', padding: '0.5rem', marginLeft: '0.5rem' }}
        />
      </div>
    </div>
  );
}

export default PostPage;
