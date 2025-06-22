import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  GithubAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaSignInAlt,
  FaSignOutAlt,
  FaMusic,
  FaGamepad,
  FaPlus,
  FaGithub,
} from "react-icons/fa";

const Home = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);

      /*
      if (u) {
        const uid = u.uid;

        // emailの@の前をユーザー名として使う
        const userName =
          u.displayName ||
          (u.email ? u.email.split("@")[0] : "unknown");

        fetch(`${import.meta.env.VITE_RAILS_URL}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, user_name: userName }),
        })
          .then(() => {
            console.log("UID送信完了");
          })
          .catch((err) => {
            console.error("UID送信エラー:", err);
          });
      }
      */
    });
    return () => unsubscribe();
  }, []);

  // エラーコードを日本語に変換する関数
  const getErrorMessage = (error) => {
    if (!error) return "";
    if (typeof error === "string") return error;
    switch (error.code) {
      case "auth/invalid-email":
        return "メールアドレスの形式が正しくありません。";
      case "auth/user-not-found":
        return "ユーザーが見つかりません。";
      case "auth/wrong-password":
        return "パスワードが間違っています。";
      case "auth/email-already-in-use":
        return "このメールアドレスは既に登録されています。";
      case "auth/weak-password":
        return "パスワードは6文字以上で入力してください。";
      case "auth/account-exists-with-different-credential":
        return "このメールアドレスは他の認証方法ですでに登録されています。メールアドレスとパスワードでログインしてください。";
      default:
        return error.message || "認証エラーが発生しました。";
    }
  };

  const handleEmailLogin = async () => {
    setError("");
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowLogin(false);
      setEmail("");
      setPassword("");
      setIsRegister(false);
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  const handleGithubLogin = async () => {
    setError("");
    const provider = new GithubAuthProvider();
    try {
      await signInWithPopup(auth, provider);

      setShowLogin(false);
    } catch (error) {
      if (error.code === "auth/account-exists-with-different-credential") {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900">
      <h1 className="text-5xl font-extrabold text-white mb-10 drop-shadow-lg tracking-widest select-none">
        <FaMusic className="inline mr-2 text-yellow-400 animate-pulse" />
        バンドブラザー2
      </h1>
      {user ? (
        <div className="flex flex-col gap-6 items-center w-full max-w-xs">
          <button
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            onClick={() =>
              navigate("/select", { state: { playerId: user.uid } })
            }
          >
            <FaGamepad /> 一人プレイ
          </button>
          <button
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            onClick={() => navigate("/two-player-select")}
          >
            <FaGamepad /> 二人プレイ
          </button>
          <button
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white text-xl font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            onClick={() => navigate("/chart-editor")}
          >
            <FaPlus /> 譜面作成
          </button>
          <button
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white text-xl font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            onClick={() => navigate('/match')}
          >
            <FaGamepad /> マッチング
          </button>
          <button
            className="w-full py-4 bg-pink-600 hover:bg-pink-700 text-white text-xl font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            onClick={() => navigate('/custom-charts')}
          >
            <FaMusic /> カスタム譜面で遊ぶ
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center mt-8">
          <button
            className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white text-lg rounded-xl shadow-lg"
            onClick={() => setShowLogin(true)}
          >
            <FaSignInAlt /> ログイン/新規登録
          </button>
        </div>
      )}
      <div className="mt-10 flex flex-col items-center">
        {user ? (
          <div className="flex flex-col items-center bg-white/10 rounded-xl p-6 mt-4 shadow-lg">
            <FaUserCircle className="text-4xl text-blue-300 mb-2" />
            <span className="text-white text-lg font-semibold mb-2">
              {user.email}
            </span>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow transition"
              onClick={handleLogout}
            >
              <FaSignOutAlt /> ログアウト
            </button>
          </div>
        ) : null}
      </div>
      {showLogin && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 flex flex-col items-center relative">
            <button
              className="absolute top-2 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowLogin(false)}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {isRegister ? "新規登録" : "ログイン"}
            </h2>
            <input
              className="w-full mb-3 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full mb-3 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <button
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded mb-2 font-bold"
              onClick={handleEmailLogin}
            >
              {isRegister ? "新規登録" : "ログイン"}
            </button>
            <button
              className="w-full py-2 bg-gray-800 hover:bg-gray-900 text-white rounded mb-2 flex items-center justify-center gap-2"
              onClick={handleGithubLogin}
            >
              <FaGithub className="text-xl" /> GitHubでログイン
            </button>
            <button
              className="text-blue-500 hover:underline mt-2"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "ログイン画面へ" : "新規登録はこちら"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
