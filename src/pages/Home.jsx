import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signOut, GithubAuthProvider, signInWithPopup, onAuthStateChanged, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Firebase新規登録後にバックエンドへユーザー作成リクエストを送る関数
  const sendUserToBackend = async (user) => {
    await fetch(`${import.meta.env.VITE_RAILS_URL}/api/user/${user.uid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        // 必要に応じて他のユーザーデータも追加
      }),
    });
  };

  const handleEmailLogin = async () => {
    setError('');
    try {
      let createdUser = null;
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        createdUser = userCredential.user;
        await sendUserToBackend(createdUser);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowLogin(false);
      setEmail('');
      setPassword('');
      setIsRegister(false);
    } catch (error) {
      setError(error.message || 'エラーが発生しました');
    }
  };

  const handleGithubLogin = async () => {
    setError('');
    const provider = new GithubAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setShowLogin(false);
    } catch (error) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        // 既存の認証方法を取得して案内
        const email = error.customData && error.customData.email;
        let msg = 'このメールアドレスは他の認証方法ですでに登録されています。';
        if (email) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.includes('password')) {
              msg += '\nメールアドレスとパスワードでログインしてください。ログイン後、アカウント設定からGitHub連携が可能です。';
            } else if (methods.length > 0) {
              msg += `\n利用可能な認証方法: ${methods.join(', ')}`;
            }
          } catch {}
        }
        setError(msg);
      } else {
        setError(error.message || 'GitHubログインに失敗しました');
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="home" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1>Welcome to Band Brother 2</h1>
      {user ? (
        <div style={{ margin: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p>ログイン中: {user.email || user.displayName}</p>
          <button onClick={handleLogout} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 24px', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>ログアウト</button>
          <button onClick={() => navigate('/select/tutorial')} style={{ background: '#43a047', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 32px', fontSize: 18, cursor: 'pointer', marginBottom: 12 }}>1人でプレイ</button>
          <button onClick={() => navigate('/two-player-select')} style={{ background: '#fbc02d', color: '#333', border: 'none', borderRadius: 4, padding: '10px 32px', fontSize: 18, cursor: 'pointer' }}>2人でプレイ</button>
          <button onClick={() => navigate('/match')} className="px-6 py-3 rounded-xl bg-green-500 text-lg" style={{ background: '#8e24aa', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 32px', fontSize: 18, cursor: 'pointer', marginTop: 16 }}>マッチング</button>
        </div>
      ) : (
        <button onClick={() => setShowLogin(true)} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 24px', fontSize: 16, cursor: 'pointer', margin: 24 }}>ログイン</button>
      )}
      {showLogin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 10, minWidth: 340, boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 32, marginRight: 8 }}>🔒</span>
              <span style={{ fontSize: 28, fontWeight: 'bold' }}>{isRegister ? '新規登録' : 'ログイン'}</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#555', marginBottom: 4 }}>メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ccc', borderRadius: 4 }}
              />
              <label style={{ display: 'block', color: '#555', marginBottom: 4 }}>パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 16, border: '1px solid #ccc', borderRadius: 4 }}
              />
              <button
                onClick={handleEmailLogin}
                style={{ width: '100%', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 0', fontSize: 16, marginBottom: 8, cursor: 'pointer' }}
              >{isRegister ? '新規登録' : 'ログイン'}</button>
              <button
                onClick={() => setIsRegister(!isRegister)}
                style={{ width: '100%', background: '#eee', color: '#1976d2', border: 'none', borderRadius: 4, padding: '8px 0', fontSize: 14, marginBottom: 8, cursor: 'pointer' }}
              >{isRegister ? 'ログイン画面へ' : '新規登録はこちら'}</button>
            </div>
            <button
              onClick={handleGithubLogin}
              style={{ width: '100%', background: '#24292f', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 0', fontSize: 16, marginBottom: 8, cursor: 'pointer' }}
            >GitHubで{isRegister ? '新規登録/ログイン' : 'ログイン'}</button>
            <button
              onClick={() => { setShowLogin(false); setError(''); setIsRegister(false); }}
              style={{ width: '100%', background: '#eee', color: '#333', border: 'none', borderRadius: 4, padding: '8px 0', fontSize: 14, marginBottom: 0, cursor: 'pointer' }}
            >キャンセル</button>
            {error && <div style={{ color: 'red', marginTop: 12, whiteSpace: 'pre-wrap', fontSize: 14 }}>{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
