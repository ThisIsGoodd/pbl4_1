// client/src/pages/PostDetailPage.jsx - AuthContext 사용하도록 수정

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');
  
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

  // 이미지 클릭 시 모달 표시를 위한 상태
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (!id || !classroomId) return;
    console.log('📝 PostDetailPage 로딩 시작 - 게시글 ID:', id);
    console.log('🔍 현재 사용자 (AuthContext):', currentUser);
    fetchPost();
    fetchComments();
    fetchLikeStatus();
  }, [id, classroomId, currentUser]); // currentUser 의존성 추가

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
      console.log('💬 받은 댓글 데이터:', data);
      
      if (data.comments) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error('🔥 댓글 불러오기 실패:', err);
      setComments([]);
    }
  };

  const fetchLikeStatus = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/like-check`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setHasLiked(data.liked || false);
      }
    } catch (err) {
      console.error('🔥 좋아요 상태 확인 실패:', err);
    }
  };

  // 이미지 클릭 핸들러
  const handleImageClick = (src) => {
    setSelectedImage(src);
  };

  // 게시글 내용에서 이미지 클릭 가능하게 만드는 함수
  const processPostContent = (content) => {
    if (!content) return '';
    
    // 이미지 태그에 클릭 이벤트 추가
    return content.replace(
      /<img([^>]*?)src="([^"]*?)"([^>]*?)>/g,
      (match, before, src, after) => {
        const fullSrc = src.startsWith('http') ? src : `http://localhost:3001${src}`;
        return `<img${before}src="${fullSrc}"${after} onclick="window.handleImageClick('${fullSrc}')" style="cursor: pointer;">`;
      }
    );
  };

  // 글로벌 함수로 이미지 클릭 핸들러 등록
  useEffect(() => {
    window.handleImageClick = handleImageClick;
    return () => {
      delete window.handleImageClick;
    };
  }, []);

  const handlePostEditSave = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          content: editPostContent,
          category: '공지사항', // 기본값
          school_wide: editSchoolWide
        })
      });
      
      if (res.ok) {
        alert('수정 완료');
        setIsEditingPost(false);
        fetchPost();
      } else {
        const errorData = await res.json();
        alert(`수정 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('🔥 게시글 수정 오류:', err);
      alert('수정 중 오류 발생');
    }
  };

  const handlePostDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert('삭제 완료');
        navigate(`/posts?classroom_id=${classroomId}`);
      } else {
        throw new Error('삭제 실패');
      }
    } catch (err) {
      console.error('🔥 게시글 삭제 오류:', err);
      alert('삭제 중 오류 발생');
    }
  };

  const handleLikeToggle = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setHasLiked(data.hasLiked);
        // 게시글 정보도 다시 불러와서 좋아요 수 업데이트
        fetchPost();
      }
    } catch (err) {
      console.error('좋아요 처리 실패:', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

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
        throw new Error('댓글 작성 실패');
      }
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성에 실패했습니다.');
    }
  };

  // 수정/삭제 권한 확인
  const showEditButtons = currentUser && post && (
    currentUser.user_id === post.author_id ||
    currentUser.role === 'teacher' ||
    currentUser.is_admin
  );

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '1rem'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            color: '#1e293b'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f1f5f9',
              borderTop: '3px solid #4f46e5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p>게시글을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '1rem'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            color: '#1e293b'
          }}>
            <h2>게시글을 찾을 수 없습니다</h2>
            <button 
              onClick={() => navigate(-1)}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                marginTop: '1rem'
              }}
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {isEditingPost ? (
          /* 수정 모드 */
          <>
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
              }}>게시글 수정</h1>
              <p style={{
                margin: 0,
                color: '#64748b',
                fontSize: '1.1rem'
              }}>게시글 내용을 수정하세요</p>
            </div>
            
            {/* 수정 폼 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '600', 
                  color: '#1e293b' 
                }}>제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="제목을 입력하세요"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '600', 
                  color: '#1e293b' 
                }}>내용</label>
                <textarea
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    minHeight: '200px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  placeholder="내용을 입력하세요"
                />
              </div>

              {(currentUser?.role === 'teacher' || currentUser?.is_admin) && (
                <div style={{ marginBottom: '1.5rem' }}>
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
                    학교 전체 공지
                  </label>
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'flex-end', 
                marginTop: '2rem' 
              }}>
                <button 
                  onClick={() => setIsEditingPost(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  취소
                </button>
                <button 
                  onClick={handlePostEditSave}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  수정 완료
                </button>
              </div>
            </div>
          </>
        ) : (
          /* 보기 모드 */
          <>
            {/* 헤더 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <h1 style={{
                margin: '0 0 1rem 0',
                color: '#1e293b',
                fontSize: '1.75rem',
                lineHeight: '1.3',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}>
                {post.title}
                {post.school_wide === 1 && (
                  <span style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>[학교 전체]</span>
                )}
              </h1>
              <div style={{
                display: 'flex',
                gap: '1rem',
                color: '#64748b',
                fontSize: '0.9rem',
                flexWrap: 'wrap'
              }}>
                <span>작성자: {post.author_name || '알 수 없음'}</span>
                <span>작성일: {post.created_at ? new Date(post.created_at).toLocaleString() : '알 수 없음'}</span>
                <span>조회수: {post.views || 0}</span>
              </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              {/* 액션 버튼들 */}
              {showEditButtons && (
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginBottom: '2rem',
                  justifyContent: 'flex-end'
                }}>
                  <button 
                    onClick={() => setIsEditingPost(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    수정
                  </button>
                  <button 
                    onClick={handlePostDelete}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    삭제
                  </button>
                </div>
              )}

              {/* 게시글 내용 */}
              <div style={{ marginBottom: '2rem' }}>
                <div 
                  className="post-content"
                  style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    lineHeight: '1.7',
                    color: '#1e293b',
                    minHeight: '200px'
                  }}
                  dangerouslySetInnerHTML={{ __html: processPostContent(post.content || '<p>내용이 없습니다.</p>') }}
                />
              </div>

              {/* 첨부파일 섹션 */}
              {post.attachments && post.attachments.length > 0 && (
                <div style={{
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{
                    margin: '0 0 1rem 0',
                    color: '#1e293b',
                    fontSize: '1.1rem'
                  }}>📎 첨부파일</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {post.attachments.map(att => (
                      <a 
                        key={att.attachment_id}
                        href={`http://localhost:3001${att.file_path}`}
                        download={att.original_name}
                        style={{
                          display: 'inline-block',
                          padding: '0.75rem 1rem',
                          background: 'white',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          color: '#3b82f6',
                          textDecoration: 'none',
                          fontSize: '0.9rem'
                        }}
                      >
                        📥 {att.original_name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 좋아요 섹션 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                padding: '1.5rem',
                background: '#f8fafc',
                borderRadius: '12px',
                marginBottom: '2rem'
              }}>
                <span style={{ fontSize: '1rem', color: '#64748b' }}>
                  ❤️ 공감 수: {post.likes || 0}
                </span>
                <button 
                  onClick={handleLikeToggle}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: hasLiked ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {hasLiked ? '💖 공감 취소' : '💗 공감하기'}
                </button>
              </div>

              {/* 댓글 섹션 */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  color: '#1e293b',
                  fontSize: '1.25rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid #e2e8f0'
                }}>💬 댓글 ({comments.length})</h3>
                
                {/* 댓글 작성 */}
                <form onSubmit={handleCommentSubmit} style={{
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      resize: 'vertical',
                      fontSize: '0.9rem',
                      marginBottom: '1rem',
                      boxSizing: 'border-box'
                    }}
                    rows="3"
                  />
                  <button 
                    type="submit" 
                    disabled={!newComment.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: newComment.trim() ? '#3b82f6' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                      fontWeight: '600'
                    }}
                  >
                    댓글 작성
                  </button>
                </form>

                {/* 댓글 목록 */}
                {comments.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#64748b',
                    fontStyle: 'italic'
                  }}>
                    <p>아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {comments.map(comment => (
                      <div 
                        key={comment.comment_id}
                        style={{
                          padding: '1.25rem',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.75rem',
                          fontSize: '0.9rem'
                        }}>
                          <strong style={{ color: '#1e293b' }}>
                            {comment.author_name || '익명'}
                          </strong>
                          <span style={{ color: '#64748b' }}>
                            {comment.created_at ? new Date(comment.created_at).toLocaleString() : '알 수 없음'}
                          </span>
                        </div>
                        <div style={{ color: '#374151', lineHeight: '1.6' }}>
                          {comment.content || '내용이 없습니다.'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
                <button 
                  onClick={() => navigate(`/posts?classroom_id=${classroomId}`)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ← 목록으로 돌아가기
                </button>
              </div>
            </div>
          </>
        )}

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
              zIndex: 1000,
              padding: '2rem'
            }}
            onClick={() => setSelectedImage(null)}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <img 
                src={selectedImage} 
                alt="확대 이미지"
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  borderRadius: '8px'
                }}
              />
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '-15px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .post-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1rem 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .post-content img:hover {
          transform: scale(1.02);
        }

        .post-content p {
          margin-bottom: 1rem;
          word-wrap: break-word;
        }

        .post-content h1, 
        .post-content h2, 
        .post-content h3,
        .post-content h4, 
        .post-content h5, 
        .post-content h6 {
          color: #1e293b;
          margin: 1.5rem 0 1rem 0;
          line-height: 1.3;
        }

        .post-content ul, 
        .post-content ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .post-content blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #64748b;
          background-color: #f8fafc;
          padding: 1rem;
          border-radius: 0 8px 8px 0;
        }

        .post-content code {
          background-color: #f1f5f9;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          color: #1e293b;
        }

        .post-content pre {
          background-color: #f1f5f9;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1rem 0;
          border: 1px solid #e2e8f0;
        }

        @media (max-width: 768px) {
          .post-content {
            padding: 1.5rem !important;
          }
          
          .post-content img {
            margin: 0.5rem 0;
            border-radius: 6px;
          }
          
          .post-content {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
}

export default PostDetailPage;