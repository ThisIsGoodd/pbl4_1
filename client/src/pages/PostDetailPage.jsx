import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentUserId, getToken } from '../utils/jwt';

function PostDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroom_id');
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editCommentId, setEditCommentId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [myUserId, setMyUserId] = useState(null);
  const [myRole, setMyRole] = useState(null); // 🆕 사용자 역할 추가
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [editSchoolWide, setEditSchoolWide] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const token = getToken();

  useEffect(() => {
    setMyUserId(getCurrentUserId());
    
    // 🆕 JWT에서 사용자 역할 추출
    const parseJwt = (token) => {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch {
        return null;
      }
    };
    
    const payload = parseJwt(token);
    setMyRole(payload?.role || null);
  }, [token]);

  useEffect(() => {
    const viewKey = `viewed_post_${id}`;
    const lastViewed = localStorage.getItem(viewKey);
    const now = Date.now();

    if (!lastViewed || now - parseInt(lastViewed) > 10 * 60 * 1000) {
      increaseView();
      localStorage.setItem(viewKey, now.toString());
    } else {
      fetchPost();
    }

    fetchComments();
    fetchLikeStatus();
  }, [id, token]);

  const increaseView = async () => {
    await fetch(`http://localhost:3001/api/posts/${id}/view`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchPost();
  };

  const fetchPost = async () => {
    const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (res.ok) {
      const fullPost = { ...data.post, attachments: data.attachments || [] };
      setPost(fullPost);
    }
  };

  const fetchComments = async () => {
    const res = await fetch(`http://localhost:3001/api/comments/posts/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) setComments(data.comments);
  };

  const fetchLikeStatus = async () => {
    const res = await fetch(`http://localhost:3001/api/posts/${id}/like-check`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) setHasLiked(data.liked);
  };

  const handlePostEditSave = async () => {
    const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: editTitle,
        content: editPostContent,
        category: '공지사항',
        school_wide: editSchoolWide
      })
    });
    if (res.ok) {
      setPost({
        ...post,
        title: editTitle,
        content: editPostContent,
        school_wide: editSchoolWide
      });
      setIsEditingPost(false);
    }
  };

  const handlePostDelete = async () => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      alert('삭제 완료');
      navigate(`/posts?classroom_id=${classroomId}`);
    }
  };

  const handleLikeToggle = async () => {
    const method = hasLiked ? 'DELETE' : 'POST';
    const res = await fetch(`http://localhost:3001/api/posts/${id}/like`, {
      method,
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      fetchPost();
      setHasLiked(!hasLiked);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    await fetch(`http://localhost:3001/api/comments/posts/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content: newComment })
    });
    setNewComment('');
    fetchComments();
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('댓글을 삭제할까요?')) return;
    await fetch(`http://localhost:3001/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setComments(prev => prev.filter(c => c.comment_id !== commentId));
  };

  const handleCommentEditSave = async () => {
    await fetch(`http://localhost:3001/api/comments/${editCommentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content: editContent })
    });
    setEditCommentId(null);
    setEditContent('');
    fetchComments();
  };

  // 🆕 댓글 숨김/표시 처리 (선생님 전용)
  const handleCommentHide = async (commentId, isCurrentlyHidden) => {
    const action = isCurrentlyHidden ? '표시' : '숨김';
    if (!window.confirm(`이 댓글을 ${action} 처리하시겠습니까?`)) return;

    try {
      const res = await fetch(`http://localhost:3001/api/comments/${commentId}/hide`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_hidden: !isCurrentlyHidden })
      });

      if (res.ok) {
        alert(`댓글 ${action} 처리가 완료되었습니다.`);
        fetchComments(); // 댓글 목록 새로고침
      } else {
        const errorData = await res.json();
        alert(`${action} 처리 실패: ${errorData.error}`);
      }
    } catch (err) {
      console.error('댓글 숨김 처리 오류:', err);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  if (!post) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      {isEditingPost ? (
        <>
          <input 
            value={editTitle} 
            onChange={(e) => setEditTitle(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          />
          <textarea 
            value={editPostContent} 
            onChange={(e) => setEditPostContent(e.target.value)}
            style={{ width: '100%', minHeight: '200px', padding: '0.5rem', marginBottom: '1rem' }}
          />
          <div style={{ marginTop: '1rem' }}>
            <label>
              <input
                type="radio"
                name="editScope"
                checked={!editSchoolWide}
                onChange={() => setEditSchoolWide(false)}
              /> 학급 게시글
            </label>
            <label style={{ marginLeft: '1rem' }}>
              <input
                type="radio"
                name="editScope"
                checked={editSchoolWide}
                onChange={() => setEditSchoolWide(true)}
              /> 학교 전체 게시글
            </label>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button onClick={handlePostEditSave}>저장</button>
            <button onClick={() => setIsEditingPost(false)} style={{ marginLeft: '0.5rem' }}>취소</button>
          </div>
        </>
      ) : (
        <>
          <h1 style={{ fontFamily: 'Arial, sans-serif' }}>
            {post.title}
            {post.school_wide === true && (
              <span style={{ marginLeft: '10px', color: '#3366cc', fontSize: '1rem' }}>
                [학교 전체]
              </span>
            )}
          </h1>
          <p><strong>작성자:</strong> {post.author_name}</p>
          <p><strong>작성일:</strong> {new Date(post.created_at).toLocaleString()}</p>
          <p><strong>조회수:</strong> {post.views}</p>
          <div dangerouslySetInnerHTML={{ __html: post.content }} />

          {post.attachments && post.attachments.length > 0 && (
            <div>
              <h4>첨부파일:</h4>
              <ul>
                {post.attachments.map(att => (
                  <li key={att.attachment_id}>
                    <a 
                      href={`http://localhost:3001${att.file_path}`}
                      download={att.original_name} // 이 속성이 중요!
                      style={{ textDecoration: 'underline', color: 'blue' }}
                      onClick={(e) => {
                        // 🔥 강제 다운로드를 위한 JavaScript
                        e.preventDefault();
                        const link = document.createElement('a');
                        link.href = `http://localhost:3001${att.file_path}`;
                        link.download = att.original_name;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      📎 {att.original_name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            ❤️ 공감 수: {post.likes || 0}
            <button onClick={handleLikeToggle} style={{ marginLeft: '0.5rem' }}>
              {hasLiked ? '💔 공감 취소하기' : '❤️ 공감하기'}
            </button>
          </div>
          {(post.author_id === myUserId || post.teacher_id === myUserId) && (
            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => {
                setIsEditingPost(true);
                setEditTitle(post.title);
                setEditPostContent(post.content);
                setEditSchoolWide(post.school_wide);
              }}>수정</button>
              <button onClick={handlePostDelete} style={{ marginLeft: '0.5rem', color: 'red' }}>삭제</button>
            </div>
          )}
        </>
      )}

      <hr style={{ margin: '2rem 0' }} />
      <h3>댓글</h3>
      <textarea 
        value={newComment} 
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="댓글을 입력하세요..."
        style={{ width: '100%', minHeight: '80px', padding: '0.5rem', marginBottom: '0.5rem' }}
      />
      <button onClick={handleCommentSubmit}>댓글 작성</button>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {comments.map(comment => (
          <li key={comment.comment_id} style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            border: '1px solid #eee', 
            borderRadius: '4px',
            // 🆕 숨겨진 댓글 스타일
            backgroundColor: comment.is_hidden ? '#f8f8f8' : 'white',
            opacity: comment.is_hidden ? 0.7 : 1
          }}>
            {/* 🆕 숨겨진 댓글 표시 */}
            {comment.is_hidden && myRole === 'teacher' && (
              <div style={{ 
                color: '#dc3545', 
                fontSize: '0.9rem', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                🚫 숨겨진 댓글 (선생님에게만 보임)
              </div>
            )}
            
            <strong>{comment.author_name}</strong> 
            <span style={{ color: '#666', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
              ({new Date(comment.created_at).toLocaleString()})
            </span>
            
            {/* 🆕 댓글 작성자 역할 표시 */}
            {comment.author_role === 'teacher' && (
              <span style={{ 
                marginLeft: '0.5rem', 
                backgroundColor: '#007bff', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '10px', 
                fontSize: '0.7rem' 
              }}>
                선생님
              </span>
            )}
            
            <br />
            {editCommentId === comment.comment_id ? (
              <>
                <textarea 
                  value={editContent} 
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{ width: '100%', minHeight: '60px', padding: '0.5rem', margin: '0.5rem 0' }}
                />
                <button onClick={handleCommentEditSave}>저장</button>
                <button onClick={() => setEditCommentId(null)} style={{ marginLeft: '0.5rem' }}>취소</button>
              </>
            ) : (
              <>
                <p style={{ margin: '0.5rem 0' }}>{comment.content}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {/* 작성자 본인 버튼들 */}
                  {comment.author_id === myUserId && (
                    <>
                      <button onClick={() => {
                        setEditCommentId(comment.comment_id);
                        setEditContent(comment.content);
                      }}>수정</button>
                      <button 
                        onClick={() => handleCommentDelete(comment.comment_id)} 
                        style={{ color: 'red' }}
                      >
                        삭제
                      </button>
                    </>
                  )}
                  
                  {/* 🆕 선생님 전용 숨김/표시 버튼 */}
                  {myRole === 'teacher' && comment.author_id !== myUserId && (
                    <button 
                      onClick={() => handleCommentHide(comment.comment_id, comment.is_hidden)}
                      style={{ 
                        backgroundColor: comment.is_hidden ? '#28a745' : '#ffc107',
                        color: comment.is_hidden ? 'white' : 'black',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}
                    >
                      {comment.is_hidden ? '👁️ 표시' : '🚫 숨김'}
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PostDetailPage;