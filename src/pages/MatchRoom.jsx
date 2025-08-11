import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const MatchRoom = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const playerIdRef = useRef(null);
  const intervalIdRef = useRef(null);
  
  // 楽曲選択データを取得
  const musicData = location.state || {};

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

  // コンポーネントのアンマウント時にポーリングをクリーンアップ
  useEffect(() => {
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, []);

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
                intervalIdRef.current = null;
                setIsMatching(false);
                // 楽曲データと一緒に難易度選択画面へ
                navigate(`/select-difficulty/${data.roomId}`, { 
                  state: musicData 
                });
              }
            })
            .catch((err) => {
              console.error(err);
            });
        }, 1000); // 1秒ごとにポーリング
        intervalIdRef.current = intervalId;
      })
      .catch((err) => {
        setIsMatching(false);
        alert("マッチングキュー追加に失敗しました");
        console.error(err);
      });
  };

  const handleOnCancel = () => {
    if (!user || !playerIdRef.current) {
      alert('認証が必要です。ログインしてください。');
      navigate('/');
      return;
    }
    
    // ポーリングを停止
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    
    const playerId = playerIdRef.current;
    
    fetch(`${import.meta.env.VITE_RAILS_URL}/api/cancel_match`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ player_id: playerId }),
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setIsMatching(false);
          alert("マッチングをキャンセルしました");
        } else {
          alert(data.error || "キャンセルに失敗しました");
        }
      })
      .catch((err) => {
        console.error("キャンセル処理中にエラーが発生しました:", err);
        alert("キャンセル処理中にエラーが発生しました");
        setIsMatching(false); // エラー時もマッチング状態を解除
      });
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-center mt-10">マッチングルーム</h1>
      {isMatching && (
        <>
          <div className="text-center mt-10">
            <p>マッチング中...</p>
          </div>
          <button
            onClick={() => handleOnCancel()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg text-lg font-bold hover:bg-red-700 transition-colors"
          >
            マッチングキャンセル
          </button>
        </>
      )}
      {!isMatching && user && (
        <>
          <div className="text-center mt-10">
            <p>ログイン中: {user.email || user.displayName}</p>
            {musicData.musicType && (
              <div className="mb-4 p-4 bg-blue-100 rounded-lg">
                <p className="font-bold">選択楽曲:</p>
                <p>{musicData.musicData?.title || '楽曲名不明'}</p>
                {musicData.difficulty && <p>難易度: {musicData.difficulty}</p>}
              </div>
            )}
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
