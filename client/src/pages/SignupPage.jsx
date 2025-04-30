import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignupPage() {
  const [form, setForm] = useState({
    oauth_id: '',
    oauth_provider: 'google',
    name: '',
    email: '',
    role: 'student',
    profile_picture: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (response.ok) {
        alert('회원가입 성공!');
        navigate('/');
      } else {
        alert(data.error || '회원가입 실패');
      }
    } catch (err) {
      console.error('회원가입 오류:', err);
      alert('서버 연결 오류');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>회원가입</h1>
      <input type="text" name="oauth_id" placeholder="OAuth ID" value={form.oauth_id} onChange={handleChange} />
      <br />
      <input type="text" name="name" placeholder="이름" value={form.name} onChange={handleChange} />
      <br />
      <input type="email" name="email" placeholder="이메일" value={form.email} onChange={handleChange} />
      <br />
      <input type="text" name="profile_picture" placeholder="프로필 사진 URL" value={form.profile_picture} onChange={handleChange} />
      <br />
      <select name="role" value={form.role} onChange={handleChange}>
        <option value="student">학생</option>
        <option value="teacher">선생님</option>
      </select>
      <br /><br />
      <button onClick={handleSignup}>회원가입</button>
    </div>
  );
}

export default SignupPage;
