// client/src/pages/PostPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, getToken } from '../utils/jwt';

function PostPage() {
  const [posts, setPosts] = useState([]);
  const [scope, setScope] = useState('classroom');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [classroomName, setClassroomName] = useState('');
  const [keywordFromNav, setKeywordFromNav] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const token = getToken();
  
  // URL 파라미터 파싱
  const searchParams = new URLSearchParams(location.search);
  const classroomId = searchParams.get('classroom_id');
  const schoolId = searchParams.get('school_id');
  
  // 사용자 권한 확인
  const isAdmin = currentUser?.is_admin === true || currentUser?.is_admin === 1;
  const isSchoolAdmin = isAdmin && schoolId && !classroomId; // 학교 전체 관리자
  
  const postsPerPage = 10;

  console.log('🔍 [PostPage] 초기화:', {
    classroomId, schoolId, isAdmin, isSchoolAdmin, currentUser
  });

  useEffect(() => {
    // 🆕 학교 전체 관리자인 경우 자동으로 학교 공지로 설정
    if (isSchoolAdmin) {
      setScope('school');
      setClassroomName('학교 전체 공지사항');
      console.log('🏫 학교 전체 관리자 - 학교 공지로 자동 설정');
    } else if (classroomId) {
      // 기존 로직: 학급 정보 가져오기
      fetch(`http://localhost:3001/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.classroom) {
            setClassroomName(`${data.classroom.grade}학년 ${data.classroom.class_number}반 공지사항`);
          }
        })
        .catch(err => console.error('학급 정보 조회 오류:', err));
    }
  }, [classroomId, schoolId, isSchoolAdmin, token]);

  const fetchPosts = async () => {
    try {
      let url = '';
      
      // 🆕 학교 전체 관리자인 경우
      if (isSchoolAdmin) {
        url = `http://localhost:3001/api/posts?school_id=${schoolId}`;
        console.log('🏫 학교 전체 공지 조회:', url);
      } 
      // 🆕 scope에 따라 다른 API 호출
      else if (scope === 'school' && classroomId) {
        // 학교 전체 공지를 보려는 경우 - classroom_id가 있는 학교 공지들 조회
        url = `http://localhost:3001/api/posts?classroom_id=${classroomId}&school_wide_only=true`;
        console.log('🏫 학교 공지 조회:', url);
      }
      // 학급 공지만 조회
      else if (scope === 'classroom' && classroomId) {
        url = `http://localhost:3001/api/posts?classroom_id=${classroomId}&classroom_only=true`;
        console.log('📚 학급 공지만 조회:', url);
      }
      // 기존 로직: 전체 조회 (기본값)
      else if (classroomId) {
        url = `http://localhost:3001/api/posts?classroom_id=${classroomId}`;
        console.log('📚 전체 공지 조회:', url);
      } else {
        console.error('❌ classroomId 또는 schoolId가 필요합니다.');
        return;
      }

      if (searchQuery) url += `${url.includes('?') ? '&' : '?'}search=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.posts) {
        let filteredPosts = data.posts;
        
        // 클라이언트 사이드 필터링 (백엔드가 지원하지 않을 경우)
        if (scope === 'school') {
          filteredPosts = filteredPosts.filter(post => post.school_wide === 1);
        } else if (scope === 'classroom') {
          filteredPosts = filteredPosts.filter(post => post.school_wide === 0);
        }
        
        // 최신순으로 정렬 (기본)
        filteredPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        setPosts(filteredPosts);
        console.log(`📊 ${scope} 공지 ${filteredPosts.length}개 로드됨`);
      }
    } catch (error) {
      console.error('게시글 조회 오류:', error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [classroomId, schoolId, searchQuery, scope, isSchoolAdmin]);

  // 페이지네이션
  const indexOfLast = currentPage * postsPerPage;
  const indexOfFirst = indexOfLast - postsPerPage;
  const currentPosts = posts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(posts.length / postsPerPage);

  const handleWritePost = () => {
    let query = '';
    if (isSchoolAdmin && schoolId) {
      query = `school_id=${schoolId}`;
    } else if (scope === 'school' && classroomId) {
      query = `classroom_id=${classroomId}&type=school`;
    } else if (classroomId) {
      query = `classroom_id=${classroomId}`;
    }
    navigate(`/posts/write?${query}`);
  };

  return (
    <div className="post-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <div className="title-section">
              <h1 className="page-title">
                📋 {classroomName || '공지사항'}
              </h1>
              <p className="page-subtitle">
                {isSchoolAdmin ? '학교 전체 공지사항을 관리하세요' : 
                 scope === 'school' ? '학교 전체 공지사항을 확인하세요' :
                 '학급 공지사항을 확인하세요'}
              </p>
            </div>
            {/* 학부모가 아닌 경우만 글쓰기 버튼 표시 */}
            {currentUser?.role !== 'parent' && (
              <button 
                onClick={handleWritePost}
                className="write-button"
              >
                <span className="button-icon">✏️</span>
                글쓰기
              </button>
            )}
          </div>
        </div>

        {/* 탭 및 검색 섹션 */}
        <div className="filters-section">
          <div className="filters-row">
            {/* 공지사항 유형 탭 (학급 관리자가 아닌 경우만) */}
            {!isSchoolAdmin && classroomId && (
              <div className="tab-group">
                <div className="tab-buttons">
                  <button 
                    onClick={() => setScope('classroom')}
                    className={`tab-button ${scope === 'classroom' ? 'active' : ''}`}
                  >
                    <span className="tab-icon">📚</span>
                    학급 공지
                  </button>
                  <button 
                    onClick={() => setScope('school')}
                    className={`tab-button ${scope === 'school' ? 'active' : ''}`}
                  >
                    <span className="tab-icon">🏫</span>
                    학교 공지
                  </button>
                </div>
              </div>
            )}

            {/* 검색 */}
            <div className="search-group">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="제목이나 내용으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <span className="search-icon">🔍</span>
              </div>
            </div>
          </div>
        </div>

        {/* 게시글 목록 */}
        <div className="posts-section">
          <div className="posts-header">
            <h3 className="section-title">
              📝 게시글 목록 
              <span className="post-count">({posts.length}개)</span>
            </h3>
          </div>

          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3 className="empty-title">
                {scope === 'school' ? '학교 공지가 없습니다' : '학급 공지가 없습니다'}
              </h3>
              <p className="empty-description">
                {currentUser?.role !== 'parent' ? '첫 번째 게시글을 작성해보세요!' : '공지사항을 기다려주세요.'}
              </p>
              {currentUser?.role !== 'parent' && (
                <button 
                  onClick={handleWritePost}
                  className="empty-action-button"
                >
                  <span className="button-icon">✏️</span>
                  첫 게시글 작성하기
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <div className="desktop-table">
                <table className="posts-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>번호</th>
                      <th style={{ width: 'auto' }}>제목</th>
                      <th style={{ width: '120px' }}>작성자</th>
                      <th style={{ width: '120px' }}>작성일</th>
                      <th style={{ width: '80px' }}>조회수</th>
                      <th style={{ width: '80px' }}>좋아요</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPosts.map((post, index) => (
                      <tr 
                        key={post.post_id}
                        onClick={() => {
                          const query = classroomId 
                            ? `classroom_id=${classroomId}` 
                            : `school_id=${schoolId}`;
                          navigate(`/posts/${post.post_id}?${query}`);
                        }}
                        className="post-row"
                      >
                        <td className="post-number">{indexOfFirst + index + 1}</td>
                        <td className="post-title">
                          {post.title}
                        </td>
                        <td className="post-author">{post.author_name || '작성자 없음'}</td>
                        <td className="post-date">{post.created_at?.slice(0, 10)}</td>
                        <td className="post-views">{post.views ?? 0}</td>
                        <td className="post-likes">{post.likes ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 */}
              <div className="mobile-cards">
                {currentPosts.map((post, index) => (
                  <div 
                    key={post.post_id}
                    onClick={() => {
                      const query = classroomId 
                        ? `classroom_id=${classroomId}` 
                        : `school_id=${schoolId}`;
                      navigate(`/posts/${post.post_id}?${query}`);
                    }}
                    className="post-card"
                  >
                    <div className="card-header">
                      <div className="card-title">
                        {post.title}
                      </div>
                      <div className="card-number">#{indexOfFirst + index + 1}</div>
                    </div>
                    <div className="card-meta">
                      <span className="card-author">👤 {post.author_name || '작성자 없음'}</span>
                      <span className="card-date">📅 {post.created_at?.slice(0, 10)}</span>
                    </div>
                    <div className="card-stats">
                      <span className="card-stat">👁️ {post.views ?? 0}</span>
                      <span className="card-stat">❤️ {post.likes ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="pagination-button"
                  >
                    ← 이전
                  </button>
                  
                  <div className="pagination-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="pagination-button"
                  >
                    다음 →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        /* CSS 변수 정의 */
        .post-page {
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

        .post-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 1200px;
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

        .write-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
          white-space: nowrap;
        }

        .write-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .button-icon {
          font-size: 1.1rem;
        }

        /* 필터 섹션 */
        .filters-section {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .filters-row {
          display: flex;
          gap: 1.5rem;
          align-items: end;
          flex-wrap: wrap;
        }

        /* 탭 관련 스타일 */
        .tab-group {
          flex: 1;
        }

        .tab-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tab-button:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .tab-button.active {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border-color: transparent;
          box-shadow: var(--shadow-md);
        }

        .tab-icon {
          font-size: 1.1rem;
        }

        .search-group {
          flex: 0 0 300px;
          max-width: 300px;
        }

        .search-container {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 1rem 0.625rem 2.5rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        /* 게시글 섹션 */
        .posts-section {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          padding: 2rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .posts-header {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .post-count {
          font-size: 1rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* 데스크톱 테이블 */
        .desktop-table {
          display: block;
          overflow-x: auto;
        }

        .posts-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .posts-table th {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 1rem;
          text-align: center;
          font-weight: 600;
          color: var(--text-primary);
          border-bottom: 2px solid var(--border-color);
          font-size: 0.875rem;
        }

        .posts-table td {
          padding: 1rem;
          text-align: center;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.875rem;
        }

        .post-row {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .post-row:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          transform: translateY(-1px);
        }

        .post-title {
          text-align: left !important;
          color: var(--accent-color);
          font-weight: 500;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .school-badge {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-right: 0.5rem;
        }

        /* 모바일 카드 */
        .mobile-cards {
          display: none;
          gap: 1rem;
        }

        .post-card {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
        }

        .post-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .card-title {
          font-weight: 600;
          color: var(--accent-color);
          flex: 1;
          line-height: 1.4;
        }

        .card-number {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          color: var(--text-secondary);
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .school-badge-mobile {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-right: 0.5rem;
          display: inline-block;
        }

        .card-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .card-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        /* 페이지네이션 */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          margin-top: 2rem;
          flex-wrap: wrap;
        }

        .pagination-button {
          padding: 0.625rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .pagination-button:hover:not(:disabled) {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }

        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-numbers {
          display: flex;
          gap: 0.25rem;
        }

        .pagination-number {
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
          font-weight: 500;
          min-width: 40px;
        }

        .pagination-number:hover {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }

        .pagination-number.active {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border-color: transparent;
        }

        /* 빈 상태 */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .empty-description {
          color: var(--text-secondary);
          font-size: 1rem;
          margin: 0 0 2rem 0;
        }

        .empty-action-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
        }

        .empty-action-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .post-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --bg-glass: rgba(30, 41, 59, 0.95);
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --text-muted: #94a3b8;
            --border-color: #475569;
          }

          .posts-table th {
            background: linear-gradient(135deg, #334155 0%, #475569 100%);
          }

          .post-row:hover {
            background: linear-gradient(135deg, #334155 0%, #475569 100%);
          }

          .card-number {
            background: linear-gradient(135deg, #475569 0%, #64748b 100%);
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

          .filters-row {
            gap: 1rem;
          }

          .posts-section {
            padding: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .post-page {
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

          .write-button {
            align-self: center;
            padding: 0.75rem 1.25rem;
          }

          .filters-row {
            flex-direction: column;
            gap: 1rem;
          }

          .tab-buttons {
            justify-content: center;
          }

          .search-group {
            flex: 1;
            max-width: none;
          }

          .desktop-table {
            display: none;
          }

          .mobile-cards {
            display: flex;
            flex-direction: column;
          }

          .pagination {
            gap: 0.25rem;
            justify-content: center;
          }

          .pagination-button {
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
          }

          .pagination-number {
            padding: 0.5rem 0.625rem;
            font-size: 0.8rem;
            min-width: 32px;
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

          .filters-section {
            padding: 1rem;
          }

          .posts-section {
            padding: 1rem;
          }

          .post-card {
            padding: 1rem;
          }

          .card-header {
            flex-direction: column;
            align-items: start;
            gap: 0.5rem;
          }

          .card-number {
            align-self: flex-end;
          }

          .card-meta {
            flex-direction: column;
            gap: 0.5rem;
          }

          .pagination {
            flex-wrap: wrap;
          }

          .pagination-numbers {
            order: -1;
            width: 100%;
            justify-content: center;
            margin-bottom: 0.5rem;
          }

          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-icon {
            font-size: 3rem;
          }

          .empty-title {
            font-size: 1.25rem;
          }

          .empty-action-button {
            padding: 0.75rem 1.25rem;
            font-size: 0.9rem;
          }
        }

        /* 애니메이션 */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .post-row,
        .post-card {
          animation: slideIn 0.3s ease-out;
        }

        .post-row:nth-child(even),
        .post-card:nth-child(even) {
          animation-delay: 0.1s;
        }

        .post-row:nth-child(odd),
        .post-card:nth-child(odd) {
          animation-delay: 0.05s;
        }

        /* 접근성 개선 */
        .write-button:focus,
        .filter-select:focus,
        .search-input:focus,
        .pagination-button:focus,
        .pagination-number:focus,
        .empty-action-button:focus {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }

        /* 인쇄 스타일 */
        @media print {
          .post-page {
            background: white;
            padding: 0;
          }

          .header,
          .filters-section,
          .posts-section {
            background: white;
            box-shadow: none;
            border: 1px solid #ccc;
          }

          .write-button,
          .filters-section,
          .pagination {
            display: none;
          }

          .posts-table {
            font-size: 0.8rem;
          }

          .mobile-cards {
            display: none;
          }

          .desktop-table {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

export default PostPage;