import { useState } from "react";
import { useNavigate } from "react-router-dom";

const MatchRoom = () => {
  const [isMatching, setIsMatching] = useState(false);
  const navigate = useNavigate();

  const handleOnClick = () => {
    setIsMatching(true);
    fetch(`${import.meta.env.VITE_RAILS_URL}/api/matchmaking/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) throw new Error("キュー追加失敗");
        // キュー追加成功後にポーリング開始
        const intervalId = setInterval(() => {
          fetch(`${import.meta.env.VITE_RAILS_URL}/api/notify_match`, {
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
      {!isMatching && (
        <>
          <div className="text-center mt-10">
            <p>マッチングを開始するにはボタンをクリックしてください。</p>
          </div>
          <button onClick={handleOnClick}>マッチングする！</button>
        </>
      )}
    </div>
  );
};

export default MatchRoom;
