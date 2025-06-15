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

  // エラーコードを日本語に変換する関数
  const getErrorMessage = (error) => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    switch (error.code) {
      case 'auth/invalid-email':
        return 'メールアドレスの形式が正しくありません。';
      case 'auth/user-not-found':
        return 'ユーザーが見つかりません。';
      case 'auth/wrong-password':
        return 'パスワードが間違っています。';
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に登録されています。';
      case 'auth/weak-password':
        return 'パスワードは6文字以上で入力してください。';
      case 'auth/account-exists-with-different-credential':
        return 'このメールアドレスは他の認証方法ですでに登録されています。メールアドレスとパスワードでログインしてください。';
      default:
        return error.message || '認証エラーが発生しました。';
    }
  };

  const handleEmailLogin = async () => {
    setError('');
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowLogin(false);
      setEmail('');
      setPassword('');
      setIsRegister(false);
    } catch (error) {
      setError(getErrorMessage(error));
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
        setError(getErrorMessage(error));
      } else {
        setError(getErrorMessage(error));
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="home" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1>ログインしてください</h1>
      {user ? (
        <div style={{ margin: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p>ログイン中: {user.email || user.displayName}</p>
          <button onClick={handleLogout} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 24px', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>ログアウト</button>
          <button onClick={() => navigate('/select/tutorial')} style={{ background: '#43a047', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 32px', fontSize: 18, cursor: 'pointer', marginBottom: 12 }}>1人でプレイ</button>
          <button onClick={() => navigate('/two-player-select')} style={{ background: '#fbc02d', color: '#333', border: 'none', borderRadius: 4, padding: '10px 32px', fontSize: 18, cursor: 'pointer', marginBottom: 12 }}>2人でプレイ</button>
          <button onClick={() => navigate('/chart-editor')} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 32px', fontSize: 18, cursor: 'pointer' }}>譜面作成</button>
          <button onClick={() => nav('/match')} className="px-6 py-3 rounded-xl bg-green-500 text-lg" style={{ background: '#8e24aa', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 32px', fontSize: 18, cursor: 'pointer', marginTop: 16 }}>マッチング</button>

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
