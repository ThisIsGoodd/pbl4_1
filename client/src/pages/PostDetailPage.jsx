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
        const errorData = await res.json();
        alert(`삭제 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('🔥 게시글 삭제 오류:', err);
      alert('삭제 중 오류 발생');
    }
  };

  const handleLikeToggle = async () => {
    try {
      const method = hasLiked ? 'DELETE' : 'POST';
      const res = await fetch(`http://localhost:3001/api/posts/${id}/like`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setHasLiked(!hasLiked);
        fetchPost(); // 좋아요 수 업데이트
      } else {
        const errorData = await res.json();
        alert(`오류: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('🔥 좋아요 토글 오류:', err);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) {
      alert('댓글 내용을 입력하세요.');
      return;
    }
    
    try {
      console.log('💬 댓글 작성 요청:', `http://localhost:3001/api/posts/${id}/comments`);
      
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
        const errorData = await res.json();
        if (res.status === 404) {
          alert('댓글 작성 기능이 아직 구현되지 않았습니다.');
        } else {
          alert(`댓글 작성 실패: ${errorData.error || '알 수 없는 오류'}`);
        }
      }
    } catch (err) {
      console.error('🔥 댓글 작성 오류:', err);
      alert('댓글 작성 중 오류 발생');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>게시글을 찾을 수 없습니다.</p>
        <button 
          onClick={() => navigate(`/posts?classroom_id=${classroomId}`)}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          ← 목록으로 돌아가기
        </button>
      </div>
    );
  }

  // 🔥 권한 확인 로직 - currentUser가 로드되기 전에는 false 반환
  const canEdit = () => {
    if (!currentUser || !currentUser.user_id || !post.author_id) {
      console.log('❌ 사용자 정보가 아직 로드되지 않음');
      return false;
    }

    console.log('🔍 권한 확인:', {
      currentUserId: currentUser.user_id,
      currentUserRole: currentUser.role,
      postAuthorId: post.author_id,
      postTeacherId: post.teacher_id,
      isAuthor: currentUser.user_id === post.author_id,
      isAdmin: currentUser.role === 'admin',
      isTeacher: currentUser.role === 'teacher'
    });

    // 관리자는 모든 게시글 수정 가능
    if (currentUser.role === 'admin') {
      console.log('✅ 관리자 권한으로 수정 가능');
      return true;
    }
    
    // 게시글 작성자는 수정 가능
    if (currentUser.user_id === post.author_id) {
      console.log('✅ 게시글 작성자로 수정 가능');
      return true;
    }
    
    // 교사는 해당 학급 게시글 수정 가능
    if (currentUser.role === 'teacher' && post.teacher_id && currentUser.user_id === post.teacher_id) {
      console.log('✅ 담당 교사로 수정 가능');
      return true;
    }

    console.log('❌ 수정 권한 없음');
    return false;
  };

  const showEditButtons = canEdit();
  console.log('🔄 수정/삭제 버튼 표시 여부:', showEditButtons);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {isEditingPost ? (
        <>
          <h2 style={{ marginBottom: '1rem' }}>게시글 수정</h2>
          <input 
            value={editTitle} 
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              marginBottom: '1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
          <textarea 
            value={editPostContent} 
            onChange={(e) => setEditPostContent(e.target.value)}
            placeholder="내용을 입력하세요"
            style={{ 
              width: '100%', 
              minHeight: '200px', 
              padding: '0.75rem', 
              marginBottom: '1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ marginRight: '1rem' }}>
              <input
                type="radio"
                name="editScope"
                checked={!editSchoolWide}
                onChange={() => setEditSchoolWide(false)}
                style={{ marginRight: '0.5rem' }}
              /> 학급 게시글
            </label>
            <label>
              <input
                type="radio"
                name="editScope"
                checked={editSchoolWide}
                onChange={() => setEditSchoolWide(true)}
                style={{ marginRight: '0.5rem' }}
              /> 학교 전체 게시글
            </label>
          </div>
          <div>
            <button 
              onClick={handlePostEditSave}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                marginRight: '0.5rem',
                cursor: 'pointer'
              }}
            >
              저장
            </button>
            <button 
              onClick={() => setIsEditingPost(false)}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid #e5e7eb' }}>
            <h1 style={{ 
              fontFamily: 'Arial, sans-serif',
              fontSize: '1.8rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#1f2937'
            }}>
              {post.title}
              {post.school_wide === true && (
                <span style={{ 
                  marginLeft: '10px', 
                  color: '#3366cc', 
                  fontSize: '1rem',
                  backgroundColor: '#e3f2fd',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: 'normal'
                }}>
                  [학교 전체]
                </span>
              )}
            </h1>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontSize: '0.9rem',
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              <div>
                <strong>작성자:</strong> {post.author_name || '알 수 없음'} | 
                <strong style={{ marginLeft: '1rem' }}>작성일:</strong> {post.created_at ? new Date(post.created_at).toLocaleString() : '알 수 없음'} | 
                <strong style={{ marginLeft: '1rem' }}>조회수:</strong> {post.views || 0}
              </div>
              
              {/* 🔥 수정/삭제 버튼 - AuthContext 기반 권한 확인 */}
              {showEditButtons && (
                <div>
                  <button 
                    onClick={() => setIsEditingPost(true)}
                    style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      marginRight: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    수정
                  </button>
                  <button 
                    onClick={handlePostDelete}
                    style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 게시글 내용 - 개선된 스타일링 */}
          <div 
            className="post-content"
            style={{
              backgroundColor: '#ffffff',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '2rem',
              minHeight: '200px',
              lineHeight: '1.6'
            }}
            dangerouslySetInnerHTML={{ __html: processPostContent(post.content || '<p>내용이 없습니다.</p>') }}
          />

          {/* 첨부파일 섹션 */}
          {post.attachments && post.attachments.length > 0 && (
            <div style={{ 
              backgroundColor: '#f9fafb',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '2rem'
            }}>
              <h4 style={{ marginBottom: '1rem', color: '#374151' }}>📎 첨부파일</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {post.attachments.map(att => (
                  <li key={att.attachment_id} style={{ marginBottom: '0.5rem' }}>
                    <a 
                      href={`http://localhost:3001${att.file_path}`}
                      download={att.original_name}
                      style={{
                        color: '#3b82f6',
                        textDecoration: 'none',
                        padding: '8px 12px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        display: 'inline-block',
                        fontSize: '0.9rem'
                      }}
                    >
                      📥 {att.original_name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 좋아요 섹션 */}
          <div style={{ 
            marginBottom: '2rem',
            textAlign: 'center',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <span style={{ marginRight: '1rem' }}>❤️ 공감 수: {post.likes || 0}</span>
            <button 
              onClick={handleLikeToggle}
              style={{
                backgroundColor: hasLiked ? '#ef4444' : '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {hasLiked ? '💔 공감 취소' : '❤️ 공감하기'}
            </button>
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
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            cursor: 'pointer'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage}
            alt="확대된 이미지"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
        </div>
      )}

      {/* 댓글 섹션 */}
      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>💬 댓글 ({comments.length})</h3>
        
        {/* 댓글 작성 */}
        <div style={{ marginBottom: '2rem' }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              marginBottom: '0.5rem'
            }}
          />
          <button 
            onClick={handleCommentSubmit}
            disabled={!newComment.trim()}
            style={{
              backgroundColor: newComment.trim() ? '#3b82f6' : '#9ca3af',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: newComment.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            댓글 작성
          </button>
        </div>

        {/* 댓글 목록 */}
        {comments.length === 0 ? (
          <p style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
            아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
          </p>
        ) : (
          <div>
            {comments.map(comment => (
              <div 
                key={comment.comment_id} 
                style={{
                  backgroundColor: '#f9fafb',
                  padding: '1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: '#6b7280', 
                  marginBottom: '0.5rem' 
                }}>
                  <strong>{comment.author_name || '익명'}</strong> • {comment.created_at ? new Date(comment.created_at).toLocaleString() : '알 수 없음'}
                </div>
                <div style={{ color: '#374151' }}>{comment.content || '내용이 없습니다.'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 뒤로가기 버튼 */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button 
          onClick={() => navigate(`/posts?classroom_id=${classroomId}`)}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← 목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default PostDetailPage;