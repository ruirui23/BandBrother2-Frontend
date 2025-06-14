import { useNavigate } from 'react-router-dom';

export default function Home() {
  const nav = useNavigate();
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">バンドブラザー２</h1>
      <button
        className="px-6 py-3 rounded-xl bg-blue-500 text-lg"
        onClick={() => nav('/select/tutorial')}
      >
        1人プレイ
      </button>
      <button
        className="px-6 py-3 rounded-xl bg-pink-500 text-white text-lg"
        onClick={() => nav('/two-player-select')}
      >
        二人プレイ
      </button>
      <button
        className="px-6 py-3 rounded-xl bg-green-500 text-lg"
        onClick={() => nav('/match')}
      >
        マッチング
      </button>
    </div>
  );
}
