// client/src/pages/PostDetailPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');
  const schoolId = searchParams.get('school_id');
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [editSchoolWide, setEditSchoolWide] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const token = localStorage.getItem('token');
  const { user: currentUser } = useContext(AuthContext);

  // 권한 확인
  const showEditButtons = currentUser && post && (
    currentUser.user_id === post.author_id || 
    currentUser.is_admin
  );

  useEffect(() => {
    if (!id || (!classroomId && !schoolId)) return;
    console.log('📝 PostDetailPage 로딩 시작 - 게시글 ID:', id);
    fetchPost();
    fetchComments();
    fetchLikeStatus();
  }, [id, classroomId, schoolId, currentUser]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setPost(data);
      setEditTitle(data.title || '');
      setEditPostContent(data.content || '');
      setEditSchoolWide(data.school_wide || false);
      
      setLoading(false);
    } catch (err) {
      console.error('게시글 불러오기 실패:', err);
      alert('게시글을 불러올 수 없습니다.');
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : data.comments || []);
      } else if (res.status !== 404) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    } catch (err) {
      console.error('댓글 불러오기 실패:', err);
      setComments([]);
    }
  };

  const fetchLikeStatus = async () => {
    if (!currentUser) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/like-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setHasLiked(data.hasLiked);
      }
    } catch (err) {
      console.error('좋아요 상태 확인 실패:', err);
    }
  };

  const handleLikeToggle = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 즉시 UI 업데이트 (낙관적 업데이트)
    const previousLikeState = hasLiked;
    const previousLikeCount = post.likes || 0;
    
    setHasLiked(!hasLiked);
    setPost(prev => ({ 
      ...prev, 
      likes: hasLiked ? Math.max(0, previousLikeCount - 1) : previousLikeCount + 1 
    }));

    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        // 서버 응답으로 정확한 상태 동기화
        setHasLiked(data.hasLiked);
        setPost(prev => ({ ...prev, likes: data.likeCount }));
      } else {
        // 실패 시 이전 상태로 롤백
        setHasLiked(previousLikeState);
        setPost(prev => ({ ...prev, likes: previousLikeCount }));
        alert('좋아요 처리에 실패했습니다.');
      }
    } catch (err) {
      // 에러 시 이전 상태로 롤백
      setHasLiked(previousLikeState);
      setPost(prev => ({ ...prev, likes: previousLikeCount }));
      console.error('좋아요 처리 실패:', err);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleCommentSubmit = async () => {
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
        fetchComments();
      } else {
        alert('댓글 작성에 실패했습니다.');
      }
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  const handleCommentEdit = async (commentId) => {
    if (!editingCommentContent.trim()) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: editingCommentContent })
      });
      
      if (res.ok) {
        setEditingCommentId(null);
        setEditingCommentContent('');
        fetchComments();
      } else {
        alert('댓글 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('댓글 수정 실패:', err);
      alert('댓글 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('정말로 이 댓글을 삭제하시겠습니까?')) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchComments();
      } else {
        alert('댓글 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCommentHide = async (commentId) => {
    if (!window.confirm('이 댓글을 숨김 처리하시겠습니까?')) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/comments/${commentId}/hide`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchComments();
      } else {
        alert('댓글 숨김 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error('댓글 숨김 처리 실패:', err);
      alert('댓글 숨김 처리 중 오류가 발생했습니다.');
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.comment_id);
    setEditingCommentContent(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const handlePostDelete = async () => {
    if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        alert('게시글이 삭제되었습니다.');
        const query = schoolId ? `school_id=${schoolId}` : `classroom_id=${classroomId}`;
        navigate(`/posts?${query}`);
      } else {
        alert('게시글 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handlePostEdit = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          content: editPostContent,
          school_wide: editSchoolWide
        })
      });
      
      if (res.ok) {
        alert('게시글이 수정되었습니다.');
        setIsEditingPost(false);
        fetchPost();
      } else {
        alert('게시글 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('게시글 수정 실패:', err);
      alert('게시글 수정 중 오류가 발생했습니다.');
    }
  };

  // 게시글 내용 처리 (이미지 클릭 이벤트 추가)
  const processPostContent = (content) => {
    return content.replace(/<img([^>]+)>/g, (match, attrs) => {
      return `<img${attrs} onclick="window.handleImageClick(this.src)" style="cursor: pointer; max-width: 100%; height: auto; border-radius: 8px; margin: 0.5rem 0;"/>`;
    });
  };

  // 전역 함수로 이미지 클릭 핸들러 등록
  useEffect(() => {
    window.handleImageClick = (src) => {
      setSelectedImage(src);
    };
    
    return () => {
      delete window.handleImageClick;
    };
  }, []);

  const goBack = () => {
    const query = schoolId ? `school_id=${schoolId}` : `classroom_id=${classroomId}`;
    navigate(`/posts?${query}`);
  };

  if (loading) {
    return (
      <div className="post-detail-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">게시글을 불러오는 중...</div>
        </div>
        
        <style jsx>{`
          .post-detail-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
          }

          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .loading-text {
            font-size: 1.1rem;
            font-weight: 500;
            color: white;
            text-align: center;
          }

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
      <div className="post-detail-page">
        <div className="container">
          <div className="error-container">
            <div className="error-icon">❌</div>
            <h2 className="error-title">게시글을 찾을 수 없습니다</h2>
            <p className="error-description">
              요청하신 게시글이 존재하지 않거나 삭제되었습니다.
            </p>
            <button onClick={goBack} className="back-btn">
              목록으로 돌아가기
            </button>
          </div>
        </div>
        
        <style jsx>{`
          .post-detail-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .container {
            max-width: 600px;
            margin: 0 auto;
          }

          .error-container {
            background: var(--bg-primary, #ffffff);
            border-radius: 20px;
            padding: 3rem 2rem;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }

          .error-icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
          }

          .error-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 1rem 0;
            color: var(--text-primary, #1e293b);
          }

          .error-description {
            font-size: 1rem;
            color: var(--text-secondary, #64748b);
            margin: 0 0 2rem 0;
            line-height: 1.6;
          }

          .back-btn {
            padding: 0.875rem 2rem;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .back-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="post-detail-page">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="header-content">
            <button onClick={goBack} className="back-button">
              <span className="back-icon">←</span>
              목록으로
            </button>
            <h1 className="page-title">게시글 상세</h1>
          </div>
        </div>

        <div className="main-content">
          {/* 게시글 수정 모드 */}
          {isEditingPost ? (
            <div className="edit-section">
              <div className="edit-header">
                <h2 className="edit-title">게시글 수정</h2>
              </div>
              
              <div className="edit-form">
                <div className="form-group">
                  <label className="form-label">제목</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="form-input"
                    placeholder="게시글 제목을 입력하세요"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">내용</label>
                  <textarea
                    value={editPostContent}
                    onChange={(e) => setEditPostContent(e.target.value)}
                    className="form-textarea"
                    rows={15}
                    placeholder="게시글 내용을 입력하세요"
                  />
                </div>

                {currentUser?.is_admin && (
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editSchoolWide}
                        onChange={(e) => setEditSchoolWide(e.target.checked)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-text">학교 전체 공지</span>
                    </label>
                  </div>
                )}

                <div className="edit-actions">
                  <button onClick={handlePostEdit} className="save-btn">
                    <span className="btn-icon">💾</span>
                    저장
                  </button>
                  <button onClick={() => setIsEditingPost(false)} className="cancel-btn">
                    취소
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 게시글 상세 */}
              <div className="post-section">
                <div className="post-header">
                  <div className="post-title-area">
                    <h1 className="post-title">
                      {post.title}
                      {Boolean(post.school_wide) && (
                        <span className="school-wide-badge">학교 전체</span>
                      )}
                    </h1>
                  </div>
                  
                  <div className="post-meta">
                    <div className="meta-info">
                      <div className="meta-item">
                        <span className="meta-icon">👤</span>
                        <span className="meta-text">{post.author_name || '알 수 없음'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-icon">📅</span>
                        <span className="meta-text">
                          {post.created_at ? new Date(post.created_at).toLocaleString('ko-KR') : '알 수 없음'}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-icon">👁️</span>
                        <span className="meta-text">조회 {(post.views || 0).toString()}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-icon">❤️</span>
                        <span className="meta-text">공감 {(post.likes || 0).toString()}</span>
                      </div>
                    </div>
                    
                    {showEditButtons && (
                      <div className="post-actions">
                        <button onClick={() => setIsEditingPost(true)} className="edit-btn">
                          <span className="btn-icon">✏️</span>
                          수정
                        </button>
                        <button onClick={handlePostDelete} className="delete-btn">
                          <span className="btn-icon">🗑️</span>
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div 
                  className="post-content"
                  dangerouslySetInnerHTML={{ __html: processPostContent(post.content || '<p>내용이 없습니다.</p>') }}
                />

                {                /* 첨부파일 */}
                {post.attachments && post.attachments.length > 0 && (
                  <div className="attachments-section">
                    <h3 className="attachments-title">
                      <span className="title-icon">📎</span>
                      첨부파일
                    </h3>
                    <div className="attachments-list">
                      {post.attachments.map(att => (
                        <a 
                          key={att.attachment_id}
                          href={`http://localhost:3001${att.file_path}`}
                          download={att.original_name}
                          className="attachment-item"
                        >
                          <span className="attachment-icon">📄</span>
                          <span className="attachment-name">{att.original_name}</span>
                          <span className="download-icon">⬇️</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 좋아요 섹션 */}
                <div className="like-section">
                  <button onClick={handleLikeToggle} className={`like-btn ${hasLiked ? 'liked' : ''}`}>
                    <span className="like-icon">{hasLiked ? '❤️' : '🤍'}</span>
                    <span className="like-text">
                      {hasLiked ? '공감 취소' : '공감하기'} ({(post.likes || 0).toString()})
                    </span>
                  </button>
                </div>
              </div>

              {/* 댓글 섹션 */}
              <div className="comments-section">
                <div className="comments-header">
                  <h3 className="comments-title">
                    <span className="title-icon">💬</span>
                    댓글 ({comments.length.toString()})
                  </h3>
                </div>

                {/* 댓글 작성 */}
                <div className="comment-write">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 작성해주세요..."
                    className="comment-input"
                    rows={3}
                  />
                  <button 
                    onClick={handleCommentSubmit}
                    disabled={!newComment.trim()}
                    className="comment-submit-btn"
                  >
                    <span className="btn-icon">💬</span>
                    댓글 작성
                  </button>
                </div>

                {/* 댓글 목록 */}
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <div className="no-comments">
                      <div className="no-comments-icon">💬</div>
                      <p className="no-comments-text">
                        아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
                      </p>
                    </div>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.comment_id} className={`comment-item ${comment.is_hidden ? 'hidden-comment' : ''}`}>
                        <div className="comment-header">
                          <div className="comment-author">
                            <span className="author-icon">👤</span>
                            <span className="author-name">{comment.author_name || '익명'}</span>
                            {comment.is_hidden && (
                              <span className="hidden-badge">숨김</span>
                            )}
                          </div>
                          <div className="comment-meta">
                            <div className="comment-date">
                              {comment.created_at ? new Date(comment.created_at).toLocaleString('ko-KR') : '알 수 없음'}
                            </div>
                            <div className="comment-actions">
                              {/* 댓글 작성자나 관리자만 수정/삭제 가능 */}
                              {currentUser && (currentUser.user_id === comment.author_id || currentUser.is_admin) && (
                                <>
                                  <button 
                                    onClick={() => startEditComment(comment)}
                                    className="comment-action-btn edit"
                                    title="수정"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => handleCommentDelete(comment.comment_id)}
                                    className="comment-action-btn delete"
                                    title="삭제"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                              
                              {/* 선생님만 댓글 숨김/표시 가능 */}
                              {currentUser?.role === 'teacher' && currentUser.user_id !== comment.author_id && (
                                <button 
                                  onClick={() => handleCommentHide(comment.comment_id)}
                                  className="comment-action-btn hide"
                                  title={comment.is_hidden ? "댓글 표시" : "댓글 숨김"}
                                >
                                  {comment.is_hidden ? '👁️' : '🙈'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {editingCommentId === comment.comment_id ? (
                          // 댓글 수정 모드
                          <div className="comment-edit">
                            <textarea
                              value={editingCommentContent}
                              onChange={(e) => setEditingCommentContent(e.target.value)}
                              className="comment-edit-input"
                              rows={3}
                            />
                            <div className="comment-edit-actions">
                              <button 
                                onClick={() => handleCommentEdit(comment.comment_id)}
                                className="comment-edit-save"
                              >
                                저장
                              </button>
                              <button 
                                onClick={cancelEditComment}
                                className="comment-edit-cancel"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          // 댓글 내용 표시
                          <div className="comment-content">
                            {comment.is_hidden ? (
                              <span className="hidden-content">이 댓글은 숨김 처리되었습니다.</span>
                            ) : (
                              comment.content || '내용이 없습니다.'
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 이미지 모달 */}
      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedImage(null)}>
              ×
            </button>
            <img src={selectedImage} alt="확대 이미지" className="modal-image" />
          </div>
        </div>
      )}

      <style jsx>{`
        .post-detail-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 1.5rem 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: transparent;
          color: var(--text-primary, #1e293b);
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-button:hover {
          background: var(--bg-secondary, #f8fafc);
          transform: translateX(-2px);
        }

        .back-icon {
          font-size: 1.2rem;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* 게시글 섹션 */
        .post-section,
        .edit-section,
        .comments-section {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .post-header {
          padding-bottom: 1.5rem;
          border-bottom: 2px solid var(--border-color, #e2e8f0);
          margin-bottom: 2rem;
        }

        .post-title-area {
          margin-bottom: 1.5rem;
        }

        .post-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0;
          line-height: 1.3;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .school-wide-badge {
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .meta-info {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary, #64748b);
        }

        .meta-icon {
          font-size: 1rem;
        }

        .meta-text {
          font-weight: 500;
        }

        .post-actions {
          display: flex;
          gap: 0.75rem;
        }

        .edit-btn,
        .delete-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-btn {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .delete-btn {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .edit-btn:hover,
        .delete-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .btn-icon {
          font-size: 1rem;
        }

        .post-content {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid var(--border-color, #e2e8f0);
          line-height: 1.8;
          font-size: 1rem;
          color: var(--text-primary, #1e293b);
          min-height: 200px;
          margin-bottom: 2rem;
        }

        /* 첨부파일 섹션 */
        .attachments-section {
          margin-bottom: 2rem;
        }

        .attachments-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 1rem 0;
        }

        .title-icon {
          font-size: 1.2rem;
        }

        .attachments-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .attachment-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          text-decoration: none;
          color: var(--text-primary, #1e293b);
          transition: all 0.2s ease;
        }

        .attachment-item:hover {
          background: var(--bg-hover, #f1f5f9);
          transform: translateX(4px);
        }

        .attachment-icon {
          font-size: 1.5rem;
        }

        .attachment-name {
          flex: 1;
          font-weight: 500;
        }

        .download-icon {
          font-size: 1.2rem;
          color: #4f46e5;
        }

        /* 좋아요 섹션 */
        .like-section {
          text-align: center;
          padding: 1.5rem;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 16px;
          border: 1px solid var(--border-color, #e2e8f0);
          margin-bottom: 2rem;
        }

        .like-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
          color: var(--text-primary, #1e293b);
          user-select: none;
        }

        .like-btn.liked {
          background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
          color: #dc2626;
          transform: scale(1.02);
        }

        .like-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .like-btn.liked:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.2);
        }

        .like-btn:active {
          transform: scale(0.98);
        }

        .like-icon {
          font-size: 1.5rem;
        }

        .like-text {
          font-size: 1rem;
        }

        /* 댓글 섹션 */
        .comments-header {
          margin-bottom: 2rem;
        }

        .comments-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .comment-write {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid var(--border-color, #e2e8f0);
          margin-bottom: 2rem;
        }

        .comment-input {
          width: 100%;
          padding: 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          background: var(--bg-primary, #ffffff);
          color: var(--text-primary, #1e293b);
          resize: vertical;
          min-height: 80px;
          margin-bottom: 1rem;
          font-family: inherit;
          line-height: 1.5;
          box-sizing: border-box;
        }

        .comment-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .comment-submit-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-left: auto;
          display: flex;
        }

        .comment-submit-btn:disabled {
          background: var(--text-secondary, #94a3b8);
          cursor: not-allowed;
          transform: none;
        }

        .comment-submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .no-comments {
          text-align: center;
          padding: 3rem 2rem;
          color: var(--text-secondary, #64748b);
        }

        .no-comments-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .no-comments-text {
          font-size: 1rem;
          margin: 0;
          line-height: 1.6;
        }

        .comment-item {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid var(--border-color, #e2e8f0);
          transition: all 0.2s ease;
        }

        .comment-item:hover {
          background: var(--bg-hover, #f1f5f9);
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .comment-author {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
        }

        .author-icon {
          font-size: 1rem;
        }

        .author-name {
          font-size: 0.95rem;
        }

        .hidden-badge {
          padding: 0.125rem 0.5rem;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .comment-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .comment-date {
          font-size: 0.85rem;
          color: var(--text-secondary, #64748b);
        }

        .comment-actions {
          display: flex;
          gap: 0.25rem;
        }

        .comment-action-btn {
          background: none;
          border: none;
          padding: 0.25rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .comment-action-btn.edit:hover {
          background: rgba(245, 158, 11, 0.1);
        }

        .comment-action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .comment-action-btn.hide:hover {
          background: rgba(99, 102, 241, 0.1);
        }

        .comment-item.hidden-comment {
          opacity: 0.6;
          border-left: 4px solid #ef4444;
        }

        .hidden-content {
          font-style: italic;
          color: var(--text-secondary, #64748b);
        }

        .comment-edit {
          margin-top: 1rem;
        }

        .comment-edit-input {
          width: 100%;
          padding: 0.875rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 8px;
          font-size: 0.95rem;
          background: var(--bg-primary, #ffffff);
          color: var(--text-primary, #1e293b);
          resize: vertical;
          font-family: inherit;
          line-height: 1.5;
          margin-bottom: 0.75rem;
          box-sizing: border-box;
        }

        .comment-edit-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .comment-edit-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .comment-edit-save,
        .comment-edit-cancel {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .comment-edit-save {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .comment-edit-cancel {
          background: transparent;
          color: var(--text-primary, #1e293b);
          border: 1px solid var(--border-color, #e2e8f0);
        }

        .comment-edit-save:hover,
        .comment-edit-cancel:hover {
          transform: translateY(-1px);
        }

        .comment-edit-cancel:hover {
          background: var(--bg-secondary, #f8fafc);
        }

        .comment-content {
          font-size: 1rem;
          color: var(--text-primary, #1e293b);
          line-height: 1.6;
        }

        /* 수정 섹션 */
        .edit-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .edit-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          font-size: 1rem;
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #1e293b);
          transition: all 0.3s ease;
          font-family: inherit;
          box-sizing: border-box;
        }

        .form-textarea {
          resize: vertical;
          min-height: 300px;
          line-height: 1.6;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 1rem;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          border: 1px solid var(--border-color, #e2e8f0);
          transition: all 0.2s ease;
        }

        .checkbox-label:hover {
          background: var(--bg-hover, #f1f5f9);
        }

        .checkbox-input {
          width: 18px;
          height: 18px;
          accent-color: #4f46e5;
        }

        .checkbox-text {
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-primary, #1e293b);
        }

        .edit-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1rem;
        }

        .save-btn,
        .cancel-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .save-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .cancel-btn {
          background: transparent;
          color: var(--text-primary, #1e293b);
          border: 2px solid var(--border-color, #e2e8f0);
        }

        .save-btn:hover,
        .cancel-btn:hover {
          transform: translateY(-2px);
        }

        .cancel-btn:hover {
          background: var(--bg-secondary, #f8fafc);
        }

        /* 이미지 모달 */
        .image-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 40px;
          height: 40px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: scale(1.1);
        }

        .modal-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        /* 다크 모드 */
        @media (prefers-color-scheme: dark) {
          .post-detail-page {
            --bg-primary: #1e293b;
            --bg-secondary: #334155;
            --bg-hover: #475569;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .post-detail-page {
            padding: 0.5rem;
          }

          .header {
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .page-title {
            text-align: center;
            font-size: 1.25rem;
          }

          .post-section,
          .edit-section,
          .comments-section {
            padding: 1.5rem;
          }

          .post-title {
            font-size: 1.5rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .post-meta {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .meta-info {
            flex-direction: column;
            gap: 0.75rem;
          }

          .post-actions {
            justify-content: center;
          }

          .edit-actions {
            flex-direction: column;
          }

          .save-btn,
          .cancel-btn {
            width: 100%;
            justify-content: center;
          }

          .like-btn {
            width: 100%;
            justify-content: center;
          }

          .comment-submit-btn {
            width: 100%;
            justify-content: center;
            margin-left: 0;
          }

          .comment-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .comment-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
            width: 100%;
          }

          .comment-actions {
            align-self: flex-end;
          }

          .comment-edit-actions {
            flex-direction: column;
          }

          .comment-edit-save,
          .comment-edit-cancel {
            width: 100%;
          }

          .modal-content {
            max-width: 95vw;
            max-height: 95vh;
          }

          .modal-close {
            top: 0.5rem;
            right: 0.5rem;
            width: 32px;
            height: 32px;
            font-size: 1.2rem;
          }
        }

        @media (max-width: 480px) {
          .post-detail-page {
            padding: 0.25rem;
          }

          .header {
            padding: 1rem;
          }

          .post-section,
          .edit-section,
          .comments-section {
            padding: 1.25rem;
          }

          .post-title {
            font-size: 1.25rem;
          }

          .post-content {
            padding: 1.5rem;
          }

          .form-textarea {
            min-height: 200px;
          }

          .attachment-item {
            padding: 0.75rem;
            gap: 0.75rem;
          }

          .attachment-name {
            font-size: 0.9rem;
          }

          .comment-item {
            padding: 1.25rem;
          }

          .no-comments {
            padding: 2rem 1rem;
          }

          .no-comments-icon {
            font-size: 2.5rem;
          }
        }

        /* 접근성 */
        .back-button:focus,
        .edit-btn:focus,
        .delete-btn:focus,
        .like-btn:focus,
        .comment-submit-btn:focus,
        .save-btn:focus,
        .cancel-btn:focus,
        .form-input:focus,
        .form-textarea:focus,
        .comment-input:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        /* 애니메이션 성능 최적화 */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PostDetailPage;