import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function PostDetailPage() {
  const { id } = useParams();
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
  const token = localStorage.getItem('token');

  // JWT 디코딩하여 user_id 추출
  useEffect(() => {
    const parseJwt = (token) => {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
        return null;
      }
    };
    const payload = parseJwt(token);
    setMyUserId(payload?.user_id || null);
  }, [token]);

  // 조회수 제어 로직 포함
  useEffect(() => {
    const viewKey = `viewed_post_${id}`;
    const lastViewed = localStorage.getItem(viewKey);
    const now = Date.now();

    if (!lastViewed || now - parseInt(lastViewed) > 10 * 60 * 1000) {
      increaseView();
      localStorage.setItem(viewKey, now.toString());
    } else {
      fetchPost(); // 조회수 증가 없이 조회
    }

    fetchComments();
  }, [id, token]);

  // 조회수 증가 요청
  const increaseView = async () => {
    try {
      await fetch(`http://localhost:3001/api/posts/${id}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPost();
    } catch (err) {
      console.error('조회수 증가 실패:', err);
    }
  };

  // 게시글 데이터 가져오기
  const fetchPost = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPost(data.post);
    } catch (err) {
      console.error('게시글 조회 실패:', err);
    }
  };

  // 댓글 가져오기
  const fetchComments = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setComments(data.comments);
    } catch (err) {
      console.error('댓글 조회 실패:', err);
    }
  };

  // 게시글 수정 저장
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
          category: editCategory
        })
      });
      if (res.ok) {
        setPost({ ...post, title: editTitle, content: editPostContent, category: editCategory });
        setIsEditingPost(false);
      }
    } catch (err) {
      console.error('게시글 수정 오류:', err);
    }
  };

  // 게시글 삭제
  const handlePostDelete = async () => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('삭제 완료');
        navigate('/posts');
      }
    } catch (err) {
      console.error('게시글 삭제 오류:', err);
    }
  };

  // 공감 처리
  const handleLike = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/posts/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchPost(); // 공감 반영
      } else {
        alert(data.error); // 이미 공감한 경우 처리
      }
    } catch (err) {
      console.error('공감 처리 오류:', err);
    }
  };

  // 댓글 작성
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
      }
    } catch (err) {
      console.error('댓글 작성 오류:', err);
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('댓글을 삭제할까요?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.comment_id !== commentId));
      }
    } catch (err) {
      console.error('댓글 삭제 오류:', err);
    }
  };

  const handleCommentEditStart = (commentId, content) => {
    setEditCommentId(commentId);
    setEditContent(content);
  };

  const handleCommentEditSave = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/comments/${editCommentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: editContent })
      });
      if (res.ok) {
        setEditCommentId(null);
        setEditContent('');
        fetchComments();
      }
    } catch (err) {
      console.error('댓글 수정 오류:', err);
    }
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
          <button onClick={handlePostEditSave}>저장</button>
          <button onClick={() => setIsEditingPost(false)}>취소</button>
        </>
      ) : (
        <>
          <h1>{post.title}</h1>
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
            <button onClick={handleLike} style={{ marginLeft: '0.5rem' }}>공감하기</button>
          </div>
          {(post.author_id === myUserId || post.teacher_id === myUserId) && (
            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => {
                setIsEditingPost(true);
                setEditTitle(post.title);
                setEditPostContent(post.content);
                setEditCategory(post.category);
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
                    <button onClick={() => handleCommentEditStart(comment.comment_id, comment.content)}>수정</button>
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
