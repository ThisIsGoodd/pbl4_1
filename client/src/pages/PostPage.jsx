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
      // 기존 로직: 일반 사용자
      else if (classroomId) {
        url = `http://localhost:3001/api/posts?classroom_id=${classroomId}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        console.log('📚 학급 공지 조회:', url);
      } else {
        console.error('❌ classroomId 또는 schoolId가 필요합니다.');
        setPosts([]); // 빈 배열로 설정
        return;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('❌ 게시글 조회 실패:', data);
        setPosts([]); // 오류 시 빈 배열로 설정
        return;
      }

      let filtered = data.posts || [];

      // 🔥 필터링 로직
      if (isSchoolAdmin) {
        // 학교 전체 관리자는 학교 전체 공지만 표시 (서버에서 이미 필터링됨)
        console.log('🏫 학교 전체 관리자 - 필터링 불필요');
      } else {
        // 일반 사용자는 scope에 따라 필터링
        if (scope === 'classroom') {
          filtered = filtered.filter(post => !post.school_wide || post.school_wide === 0);
        } else if (scope === 'school') {
          filtered = filtered.filter(post => post.school_wide === true || post.school_wide === 1);
        }
      }

      // 검색 필터링
      if (searchQuery) {
        filtered = filtered.filter(post =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // 정렬
      if (sortOption === 'latest') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (sortOption === 'views') {
        filtered.sort((a, b) => b.views - a.views);
      }

      setPosts(filtered);
      console.log('✅ 게시글 조회 완료:', filtered.length, '개');
    } catch (err) {
      console.error('🔥 게시글 목록 불러오기 실패:', err);
      setPosts([]); // 오류 시 빈 배열로 설정
    }
  };

  useEffect(() => {
    fetchPosts();
    setCurrentPage(1);
  }, [scope, categoryFilter, searchQuery, sortOption, keywordFromNav, classroomId, schoolId, isSchoolAdmin]);

  const indexOfLast = currentPage * postsPerPage;
  const indexOfFirst = indexOfLast - postsPerPage;
  const currentPosts = posts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(posts.length / postsPerPage);

  const handleWriteClick = () => {
    if (isSchoolAdmin) {
      // 학교 전체 관리자는 학교 전체 공지 작성
      navigate(`/posts/write?school_id=${schoolId}`);
    } else {
      // 일반 사용자는 학급 공지 작성
      navigate(`/posts/write?classroom_id=${classroomId}`);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
          }}>{classroomName}</h1>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '1.1rem'
          }}>공지사항을 확인하고 소통하세요</p>
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          {/* 🔥 학교 전체 관리자가 아닌 경우만 탭 표시 */}
          {!isSchoolAdmin && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '1rem'
              }}>
                {['classroom', 'school'].map(type => (
                  <button
                    key={type}
                    onClick={() => setScope(type)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      borderRadius: '8px',
                      background: scope === type ? '#4f46e5' : '#e2e8f0',
                      color: scope === type ? 'white' : '#64748b',
                      fontWeight: scope === type ? '600' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {type === 'classroom' ? '학급 공지사항' : '학교 공지사항'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 🆕 학교 전체 관리자인 경우 안내 메시지 */}
          {isSchoolAdmin && (
            <div style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              background: '#e0f2fe',
              borderRadius: '12px',
              border: '1px solid #0ea5e9',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0369a1', marginBottom: '0.5rem' }}>
                🏫 학교 전체 공지사항
              </div>
              <div style={{ fontSize: '0.9rem', color: '#0284c7' }}>
                모든 학급에서 볼 수 있는 중요한 공지사항들입니다.
              </div>
            </div>
          )}

          {/* 검색 및 필터 영역 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label style={{ marginRight: '0.5rem', color: '#1e293b', fontWeight: '500' }}>정렬:</label>
                <select 
                  value={sortOption} 
                  onChange={(e) => setSortOption(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: 'white'
                  }}
                >
                  <option value="latest">최신순</option>
                  <option value="views">조회수순</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="제목 또는 내용 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.75rem',
                  width: '250px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />

              {/* 🔥 게시글 작성 버튼 - 권한별 분기 */}
              {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
                <button
                  onClick={handleWriteClick}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ✏️ 글쓰기
                </button>
              )}
            </div>
          </div>

          {/* 게시글 목록 */}
          {posts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 2rem',
              color: '#64748b'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>게시글이 없습니다</h3>
              <p style={{ margin: 0 }}>첫 번째 게시글을 작성해보세요!</p>
            </div>
          ) : (
            <>
              {/* 테이블 헤더 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 120px 120px 80px 80px',
                gap: '1rem',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#1e293b',
                fontSize: '0.9rem'
              }}>
                <div style={{ textAlign: 'center' }}>번호</div>
                <div>제목</div>
                <div style={{ textAlign: 'center' }}>작성자</div>
                <div style={{ textAlign: 'center' }}>작성일</div>
                <div style={{ textAlign: 'center' }}>조회수</div>
                <div style={{ textAlign: 'center' }}>공감</div>
              </div>

              {/* 게시글 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentPosts.map((post, index) => (
                  <div
                    key={post.post_id}
                    onClick={() => {
                      const query = isSchoolAdmin ? 
                        `school_id=${schoolId}` 
                        : `classroom_id=${classroomId}`;
                      navigate(`/posts/${post.post_id}?${query}`);
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 120px 120px 80px 80px',
                      gap: '1rem',
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                      {indexOfFirst + index + 1}
                    </div>
                    <div style={{ color: '#3b82f6', fontWeight: '500' }}>
                      {/* 🔥 학교 전체 관리자인 경우 [학교 전체] 표시 불필요 */}
                      {!isSchoolAdmin && post.school_wide === 1 && (
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          marginRight: '0.5rem'
                        }}>
                          [학교 전체]
                        </span>
                      )}
                      {post.title}
                    </div>
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                      {post.author_name || '작성자 없음'}
                    </div>
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                      {post.created_at?.slice(0, 10)}
                    </div>
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                      {post.views ?? 0}
                    </div>
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                      {post.likes ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginTop: '2rem', 
              gap: '0.5rem' 
            }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === page ? '#4f46e5' : 'white',
                    color: currentPage === page ? 'white' : '#64748b',
                    fontWeight: currentPage === page ? '600' : 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .grid-container {
            display: block !important;
          }
          
          .grid-container > div {
            padding: 0.75rem !important;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .grid-container > div:last-child {
            border-bottom: none;
          }
        }
      `}</style>
    </div>
  );
}

export default PostPage;