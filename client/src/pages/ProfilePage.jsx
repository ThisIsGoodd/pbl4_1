import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [childName, setChildName] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
        setName(res.data.user.name);
        setRole(res.data.user.role);
        setChildName(res.data.user.child_name || '');
        setPreview(`http://localhost:3001${res.data.user.profile_picture}`);
      } catch (err) {
        console.error('❌ 프로필 호출 실패:', err);
        alert('프로필 불러오기 실패');
      }
    };

    fetchProfile();
  }, [token]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('child_name', childName);
      if (image) formData.append('profile_picture', image);

      await axios.patch('http://localhost:3001/api/users/profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      await axios.patch('http://localhost:3001/api/users/role', { role }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('프로필 수정 완료');
      window.location.reload();
    } catch (err) {
      console.error('❌ 수정 실패:', err.response?.data || err.message);
      alert('수정 실패');
    }
  };

  if (!user) return <div>⏳ 불러오는 중...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>프로필 설정</h2>

      <label>이름:</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />

      <br /><br />

      <br /><br />

      <label>자녀 이름:</label>
      <input
        type="text"
        placeholder="자녀 이름 입력"
        value={childName}
        onChange={(e) => setChildName(e.target.value)}
      />

      <br /><br />

      <label>프로필 사진:</label>
      <input type="file" onChange={handleImageChange} />

      {preview && (
        <div>
          <img
            src={preview}
            alt="미리보기"
            style={{ width: 120, borderRadius: '50%' }}
          />
        </div>
      )}

      <button onClick={handleSave}>저장</button>

      <hr />

      <h3>소속 정보</h3>
      {user.school ? (
        <>
          <p>학교: {user.school}</p>
          <p>{user.grade}학년 {user.class_number}반</p>
        </>
      ) : (
        <p>학급 미가입</p>
      )}
    </div>
  );
}

export default ProfilePage;
