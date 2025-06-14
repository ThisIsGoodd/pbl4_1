// client/src/pages/PostDetailPage.jsx - 학교 전체 관리자 지원 수정

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 🔥 수정: classroomId와 schoolId 모두 가져오기
  const classroomId = searchParams.get('classroom_id');
  const schoolId = searchParams.get('school_id');
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [editSchoolWide, setEditSchoolWide] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('token');
  
  // 🔥 AuthContext에서 사용자 정보 가져오기
  const { user: currentUser } = useContext(AuthContext);

  // 🔥 추가: 사용자 권한 확인
  const isAdmin = currentUser?.is_admin === true || currentUser?.is_admin === 1;
  const isSchoolAdmin = isAdmin && schoolId && !classroomId; // 학교 전체 관리자

  // 이미지 클릭 시 모달 표시를 위한 상태
  const [selectedImage, setSelectedImage] = useState(null);

  console.log('🔍 [PostDetailPage] 초기화:', {
    id, classroomId, schoolId, isAdmin, isSchoolAdmin, currentUser
  });

  useEffect(() => {
    // 🔥 수정: id가 있고 (classroomId 또는 schoolId 중 하나라도 있으면) 실행
    if (!id || (!classroomId && !schoolId)) {
      console.warn('⚠️ 필수 파라미터 누락:', { id, classroomId, schoolId });
      return;
    }
    
    console.log('📝 PostDetailPage 로딩 시작 - 게시글 ID:', id);
    console.log('🔍 현재 사용자 (AuthContext):', currentUser);
    fetchPost();
    fetchComments();
    fetchLikeStatus();
  }, [id, classroomId, schoolId, currentUser]); // schoolId 의존성 추가

  const fetchPost = async () => {
    try {
      console.log('🔍 게시글 상세 정보 요청:', `http://localhost:3001/api/posts/${id}`);
      
      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📡 응답 상태:', res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('📋 받은 데이터:', data);
      
      setPost(data);
      setEditTitle(data.title || '');
      setEditPostContent(data.content || '');
      setEditSchoolWide(data.school_wide || false);
      
      setLoading(false);
    } catch (err) {
      console.error('🔥 게시글 불러오기 실패:', err);
      alert('게시글을 불러올 수 없습니다.');
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      console.log('💬 댓글 목록 요청:', `http://localhost:3001/api/posts/${id}/comments`);
      
      const res = await fetch(`http://localhost:3001/api/posts/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          console.warn('댓글 API 엔드포인트를 찾을 수 없습니다.');
          setComments([]);
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('💬 댓글 데이터:', data);
      setComments(data.comments || []);
    } catch (err) {
      console.error('🔥 댓글 불러오기 실패:', err);
      setComments([]);
    }
  };

  const fetchLikeStatus = async () => {
    try {
      console.log('👍 좋아요 상태 확인:', `http://localhost:3001/api/posts/${id}/like-check`);
      
      const res = await fetch(`http://localhost:3001/api/posts/${id}/like-check`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setHasLiked(data.liked);
        console.log('👍 좋아요 상태:', data.liked);
      }
    } catch (err) {
      console.error('🔥 좋아요 상태 확인 실패:', err);
    }
  };

  const handleBackClick = () => {
    // 🔥 수정: 학교 전체 관리자와 일반 사용자 구분
    if (isSchoolAdmin) {
      navigate(`/posts?school_id=${schoolId}`);
    } else {
      navigate(`/posts?classroom_id=${classroomId}`);
    }
  };

  const handlePostEdit = async () => {
    if (!editTitle.trim()) {
      alert('제목을 입력하세요.');
      return;
    }
    if (!editPostContent.trim()) {
      alert('내용을 입력하세요.');
      return;
    }

    try {
      console.log('📝 게시글 수정 요청:', { 
        title: editTitle, 
        content: editPostContent, 
        school_wide: editSchoolWide 
      });

      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          content: editPostContent,
          school_wide: editSchoolWide // category 제거
        })
      });

      console.log('📝 수정 응답 상태:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('✅ 수정 성공:', data);
        alert('게시글이 수정되었습니다.');
        setIsEditingPost(false);
        fetchPost(); // 수정된 내용 다시 가져오기
      } else {
        const data = await res.json();
        console.error('❌ 수정 실패:', data);
        alert('수정 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('🔥 게시글 수정 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  const handlePostDelete = async () => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;

    try {
      console.log('🗑️ 게시글 삭제 요청:', `http://localhost:3001/api/posts/${id}`);
      
      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📡 삭제 응답 상태:', res.status);

      if (res.ok) {
        alert('게시글이 삭제되었습니다.');
        handleBackClick(); // 목록으로 돌아가기
      } else {
        const data = await res.json();
        console.error('❌ 삭제 실패 응답:', data);
        alert('삭제 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('🔥 게시글 삭제 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  const handleLike = async () => {
    try {
      console.log('👍 좋아요 처리:', hasLiked ? 'DELETE' : 'POST');
      
      const method = hasLiked ? 'DELETE' : 'POST';
      const res = await fetch(`http://localhost:3001/api/posts/${id}/like`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('👍 좋아요 응답 상태:', res.status);

      if (res.ok) {
        setHasLiked(!hasLiked);
        // 게시글 정보 다시 가져와서 좋아요 수 업데이트
        fetchPost();
        console.log('👍 좋아요 상태 변경:', !hasLiked);
      } else {
        const data = await res.json();
        console.error('❌ 좋아요 실패:', data);
        alert(data.error || '좋아요 처리 실패');
      }
    } catch (err) {
      console.error('🔥 좋아요 처리 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  // 🔥 댓글 숨김/표시 처리 함수 추가
  const handleCommentHide = async (commentId, isCurrentlyHidden) => {
    try {
      console.log('👁️ 댓글 숨김 처리:', { commentId, isCurrentlyHidden });
      
      const res = await fetch(`http://localhost:3001/api/comments/${commentId}/hide`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          is_hidden: !isCurrentlyHidden // 현재 상태의 반대로 토글
        })
      });

      console.log('👁️ 숨김 처리 응답 상태:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('✅ 숨김 처리 성공:', data);
        alert(data.message);
        fetchComments(); // 댓글 목록 새로고침
      } else {
        const data = await res.json();
        console.error('❌ 숨김 처리 실패:', data);
        alert('처리 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('🔥 댓글 숨김 처리 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  // 🔥 댓글 작성 함수 정의
  const handleCommentSubmit = async () => {
    if (!newComment.trim()) {
      alert('댓글 내용을 입력하세요.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (res.ok) {
        setNewComment('');
        fetchComments(); // 댓글 목록 새로고침
      } else {
        const data = await res.json();
        alert('댓글 작성 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('댓글 작성 오류:', err);
      alert('서버 오류가 발생했습니다.');
    }
  };

  // 🔥 조회수 증가 (페이지 로드 시 한 번만)
  useEffect(() => {
    if (post && id && !loading) {
      console.log('👁️ 조회수 증가 요청:', `http://localhost:3001/api/posts/${id}/view`);
      
      fetch(`http://localhost:3001/api/posts/${id}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          console.log('👁️ 조회수 응답:', data);
        })
        .catch(err => console.warn('⚠️ 조회수 증가 실패:', err));
    }
  }, [post, id, loading, token]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #4f46e5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#64748b', margin: 0 }}>게시글을 불러오는 중...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>게시글을 찾을 수 없습니다</h2>
          <button 
            onClick={handleBackClick}
            style={{
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 🔥 수정/삭제 권한 확인 - 작성자만 가능
  const canEdit = currentUser && currentUser.user_id === post.author_id;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <button
              onClick={handleBackClick}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ← 목록
            </button>
            {/* 🔥 학교 전체 관리자인 경우 [학교 전체] 표시 불필요 */}
            {!isSchoolAdmin && post.school_wide === 1 && (
              <span style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                🏫 학교 전체 공지
              </span>
            )}
          </div>

          {isEditingPost ? (
            <div>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              {/* 🔥 학교 전체 관리자가 아닌 경우만 공지 범위 선택 표시 */}
              {!isSchoolAdmin && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={editSchoolWide}
                      onChange={(e) => setEditSchoolWide(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      학교 전체 공지로 설정
                    </span>
                  </label>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handlePostEdit}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  저장
                </button>
                <button
                  onClick={() => setIsEditingPost(false)}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h1 style={{
                margin: '0 0 1rem 0',
                color: '#1e293b',
                fontSize: '1.8rem',
                lineHeight: '1.3'
              }}>
                {post.title}
              </h1>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#64748b',
                fontSize: '0.9rem'
              }}>
                <div>
                  <span>✍️ {post.author_name}</span>
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  <span>📅 {post.created_at?.slice(0, 10)}</span>
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  <span>👁️ {post.views || 0}회</span>
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setIsEditingPost(true)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={handlePostDelete}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 본문 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          {isEditingPost ? (
            <textarea
              value={editPostContent}
              onChange={(e) => setEditPostContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                lineHeight: '1.6',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          ) : (
            <div style={{
              fontSize: '1rem',
              lineHeight: '1.8',
              color: '#374151'
            }}>
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>
          )}

          {/* 첨부파일 */}
          {post.attachments && post.attachments.length > 0 && (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#1e293b',
                fontSize: '1.1rem'
              }}>
                📎 첨부파일
              </h3>
              {post.attachments.map((file, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0.5rem 0'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    📄 {file.original_name}
                  </span>
                  <a
                    href={`http://localhost:3001${file.file_path}`}
                    download
                    style={{
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontSize: '0.8rem'
                    }}
                  >
                    다운로드
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* 좋아요 */}
          <div style={{
            marginTop: '2rem',
            padding: '1rem 0',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <button
              onClick={handleLike}
              style={{
                background: hasLiked ? '#ef4444' : '#f8fafc',
                color: hasLiked ? 'white' : '#64748b',
                border: `2px solid ${hasLiked ? '#ef4444' : '#e2e8f0'}`,
                padding: '0.75rem 1.5rem',
                borderRadius: '24px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              {hasLiked ? '❤️' : '🤍'} {post.likes || 0}
            </button>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            color: '#1e293b',
            fontSize: '1.2rem'
          }}>
            💬 댓글 ({comments.length})
          </h3>

          {/* 댓글 작성 */}
          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                resize: 'vertical',
                marginBottom: '1rem',
                boxSizing: 'border-box'
              }}
            />
            <button
              onClick={handleCommentSubmit}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              댓글 작성
            </button>
          </div>

          {/* 댓글 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comments.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#9ca3af',
                fontSize: '0.9rem'
              }}>
                💭 아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.comment_id}
                  style={{
                    padding: '1.5rem',
                    background: comment.is_hidden ? '#fef2f2' : 'white', // 🔥 숨겨진 댓글은 연한 빨간색 배경
                    borderRadius: '8px',
                    border: comment.is_hidden ? '1px solid #fecaca' : '1px solid #e2e8f0',
                    opacity: comment.is_hidden ? 0.7 : 1 // 🔥 숨겨진 댓글은 투명도 조정
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 1
                    }}>
                      <span style={{
                        fontWeight: '600',
                        color: '#1e293b',
                        fontSize: '0.9rem'
                      }}>
                        {comment.author_role === 'teacher' ? '👩‍🏫' : '👨‍👩‍👧‍👦'} {comment.author_name}
                        {comment.author_role === 'parent' && comment.child_name && (
                          <span style={{ color: '#64748b', fontWeight: 'normal' }}>
                            ({comment.child_name} 학부모)
                          </span>
                        )}
                      </span>
                      {/* 🔥 숨겨진 댓글 표시 */}
                      {comment.is_hidden && (
                        <span style={{
                          background: '#ef4444',
                          color: 'white',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          숨김
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        color: '#64748b',
                        fontSize: '0.8rem'
                      }}>
                        {comment.created_at?.slice(0, 16)}
                      </span>
                      
                      {/* 🔥 교사만 댓글 숨김/표시 버튼 표시 */}
                      {currentUser?.role === 'teacher' && (
                        <button
                          onClick={() => handleCommentHide(comment.comment_id, comment.is_hidden)}
                          style={{
                            background: comment.is_hidden ? '#10b981' : '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                        >
                          {comment.is_hidden ? '표시' : '숨김'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    color: '#374151',
                    fontSize: '0.9rem',
                    lineHeight: '1.6'
                  }}>
                    {comment.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 이미지 모달 */}
      {selectedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="확대된 이미지"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain'
            }}
            onClick={(e) => {
            e.stopPropagation();
            setSelectedImage(null);
          }}
          />
        </div>
      )}
    </div>
  );
}

export default PostDetailPage;