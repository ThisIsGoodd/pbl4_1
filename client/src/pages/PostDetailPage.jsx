import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

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
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSchoolWide, setEditSchoolWide] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const payload = JSON.parse(atob(token.split('.')[1]));
    setMyUserId(payload?.user_id || null);
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
    if (res.ok) setPost(data.post);
  };

  const fetchComments = async () => {
    const res = await fetch(`http://localhost:3001/api/posts/${id}/comments`, {
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
        category: editCategory,
        school_wide: editSchoolWide
      })
    });
    if (res.ok) {
      setPost({
        ...post,
        title: editTitle,
        content: editPostContent,
        category: editCategory,
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
    await fetch(`http://localhost:3001/api/posts/${id}/comments`, {
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

  if (!post) return <p>로딩 중...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      {isEditingPost ? (
        <>
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          <textarea value={editPostContent} onChange={(e) => setEditPostContent(e.target.value)} />
          <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
            <option value="공지">공지</option>
            <option value="자유">자유</option>
            <option value="질문">질문</option>
          </select>
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
          <button onClick={handlePostEditSave}>저장</button>
          <button onClick={() => setIsEditingPost(false)}>취소</button>
        </>
      ) : (
        <>
          <h1>
            {post.title}
            {post.school_wide && (
              <span style={{ marginLeft: '10px', color: '#3366cc', fontSize: '1rem' }}>
                [학교 전체]
              </span>
            )}
          </h1>
          <p><strong>작성자:</strong> {post.author_name}</p>
          <p><strong>카테고리:</strong> {post.category}</p>
          <p><strong>작성일:</strong> {new Date(post.created_at).toLocaleString()}</p>
          <p><strong>조회수:</strong> {post.views}</p>
          <p>{post.content}</p>
          {post.attachment_url && (
            <div>
              <a href={`http://localhost:3001${post.attachment_url}`} target="_blank" rel="noreferrer">첨부파일 열기</a>
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
                setEditCategory(post.category);
                setEditSchoolWide(post.school_wide);
              }}>수정</button>
              <button onClick={handlePostDelete} style={{ marginLeft: '0.5rem', color: 'red' }}>삭제</button>
            </div>
          )}
        </>
      )}

      <hr />
      <h3>댓글</h3>
      <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} />
      <button onClick={handleCommentSubmit}>댓글 작성</button>

      <ul>
        {comments.map(comment => (
          <li key={comment.comment_id}>
            <strong>{comment.author_name}</strong> ({new Date(comment.created_at).toLocaleString()})<br />
            {editCommentId === comment.comment_id ? (
              <>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                <button onClick={handleCommentEditSave}>저장</button>
                <button onClick={() => setEditCommentId(null)}>취소</button>
              </>
            ) : (
              <>
                <p>{comment.content}</p>
                {comment.author_id === myUserId && (
                  <>
                    <button onClick={() => {
                      setEditCommentId(comment.comment_id);
                      setEditContent(comment.content);
                    }}>수정</button>
                    <button onClick={() => handleCommentDelete(comment.comment_id)} style={{ color: 'red' }}>삭제</button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PostDetailPage;
