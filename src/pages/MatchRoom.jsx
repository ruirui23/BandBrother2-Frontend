import { Route } from "react-router-dom";  
import { useNavigate } from "react-router-dom";

const MatchRoom = () => {
  const navigate = useNavigate();
  
  const handleOnClick = () => {
    console.log("Button clicked!");
    // ここでマッチング処理を実行する
    // 例えば、APIを呼び出してマッチングを開始するなど
    // ここではダミーの処理として、コンソールにメッセージを表示します
    alert("マッチングを開始します！");
    // 実際のマッチング処理をここに追加
    // 例えば、APIを呼び出してマッチングを開始するなど
    console.log("マッチング処理を開始しました");
    // ここでマッチングが成功した場合の処理を追加することもできます
    // 例えば、マッチング成功後に別のページに遷移するなど
    // window.location.href = '/some-other-page'; // 例: マッチング成功後に別のページへ遷移
    // ここではダミーの処理として、コンソールにメッセージを表示します
    console.log("マッチング処理が完了しました");
    navigate("/game");
  };
  return (
    <div>
      <h1 className="text-4xl font-bold text-center mt-10">マッチングルーム</h1>
      <button onClick={handleOnClick}>マッチングする！</button>
    </div>
  );
};

export default MatchRoom;
