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
        return;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('❌ 게시글 조회 실패:', data);
        return;
      }

      let filtered = data.posts || [];

      // 🔥 필터링 로직
      if (isSchoolAdmin) {
        // 학교 전체 관리자는 학교 전체 공지만 표시
        filtered = filtered.filter(post => post.school_wide === true || post.school_wide === 1);
      } else {
        // 일반 사용자는 scope에 따라 필터링
        if (scope === 'classroom') {
          filtered = filtered.filter(post => !post.school_wide || post.school_wide === 0);
        } else if (scope === 'school') {
          filtered = filtered.filter(post => post.school_wide === true || post.school_wide === 1);
        }
      }

      // 검색 필터링
      if (searchQuery && keywordFromNav) {
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
    <div style={{ padding: '2rem', width: '100%' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', margin: '2rem 0' }}>
        {classroomName}
      </h2>

      {/* 🔥 학교 전체 관리자가 아닌 경우만 탭 표시 */}
      {!isSchoolAdmin && (
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
      )}

      {/* 🆕 학교 전체 관리자인 경우 안내 메시지 */}
      {isSchoolAdmin && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          border: '1px solid #90caf9',
          textAlign: 'center'
        }}>
          🏫 <strong>학교 전체 공지사항</strong>만 표시됩니다.
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#1565c0' }}>
            모든 학급에서 볼 수 있는 중요한 공지사항들입니다.
          </div>
        </div>
      )}

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

      {/* 🔥 게시글 작성 버튼 - 권한별 분기 */}
      {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
          {isSchoolAdmin ? (
            // 학교 전체 관리자는 학교 전체 공지만 작성 가능
            <button 
              onClick={() => navigate(`/posts/write?school_id=${schoolId}`)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              🏫 학교 전체 공지 작성
            </button>
          ) : (
            // 일반 교사(학급 관리자)는 학급 공지와 학교 공지 둘 다 작성 가능
            <>
              <button 
                onClick={() => navigate(`/posts/write?classroom_id=${classroomId}&type=classroom`)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                📚 학급 공지 작성
              </button>
              
              <button 
                onClick={() => navigate(`/posts/write?classroom_id=${classroomId}&type=school`)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                🏫 학교 공지 작성
              </button>
            </>
          )}
        </div>
      )}

      {currentPosts.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          {isSchoolAdmin ? '학교 전체 공지사항이 없습니다.' : '게시글이 없습니다.'}
        </p>
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
                onClick={() => {
                  const query = isSchoolAdmin 
                    ? `school_id=${schoolId}` 
                    : `classroom_id=${classroomId}`;
                  navigate(`/posts/${post.post_id}?${query}`);
                }}
                style={{ cursor: 'pointer', borderBottom: '1px solid #ccc' }}
              >
                <td style={tdStyle}>{indexOfFirst + index + 1}</td>
                <td style={{ ...tdStyle, textAlign: 'left', color: '#3366cc' }}>
                  {/* 🔥 학교 전체 관리자인 경우 [학교 전체] 표시 불필요 */}
                  {!isSchoolAdmin && post.school_wide ? '[학교 전체] ' : ''}
                  {post.title}
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

      {/* 페이지네이션 */}
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