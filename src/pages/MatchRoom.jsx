import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const MatchRoom = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const playerIdRef = useRef(null);

  // Firebase認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        playerIdRef.current = currentUser.uid;
      } else {
        // 未認証の場合はホームページにリダイレクト
        navigate('/');
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  const handleOnClick = () => {
    // ユーザーが認証されていない場合は処理を停止
    if (!user || !playerIdRef.current) {
      alert('認証が必要です。ログインしてください。');
      navigate('/');
      return;
    }

    setIsMatching(true);
    const playerId = playerIdRef.current; // Firebase UIDを使用
    
    fetch(`${import.meta.env.VITE_RAILS_URL}/api/notify_match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ player_id: playerId }),
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        
        // キュー追加成功後にポーリング開始
        const intervalId = setInterval(() => {
          fetch(`${import.meta.env.VITE_RAILS_URL}/api/notify_match?player_id=${playerId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.matched && data.roomId) {
                clearInterval(intervalId);
                setIsMatching(false);
                navigate(`/select-difficulty/${data.roomId}`);
              }
            })
            .catch((err) => {
              console.error(err);
            });
        }, 1000); // 1秒ごとにポーリング
      })
      .catch((err) => {
        setIsMatching(false);
        alert("マッチングキュー追加に失敗しました");
        console.error(err);
      });
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-center mt-10">マッチングルーム</h1>
      {isMatching && (
        <div className="text-center mt-10">
          <p>マッチング中...</p>
        </div>
      )}
      {!isMatching && user && (
        <>
          <div className="text-center mt-10">
            <p>ログイン中: {user.email || user.displayName}</p>
            <p>マッチングを開始するにはボタンをクリックしてください。</p>
          </div>
          <button 
            onClick={handleOnClick}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg text-lg font-bold hover:bg-purple-700 transition-colors"
          >
            マッチングする！
          </button>
        </>
      )}
      {!user && (
        <div className="text-center mt-10">
          <p>認証中...</p>
        </div>
      )}
    </div>
  );
};

export default MatchRoom;
