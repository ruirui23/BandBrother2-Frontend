import { Link, useLocation } from 'react-router-dom';

export default function Result() {
  const { state } = useLocation();
  // 二人プレイ用のスコア・判定があれば両方表示
  if (state && state.counts1 && state.counts2) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-white">
        <h1 className="text-3xl font-bold">RESULT</h1>
        <div className="flex gap-12">
          <div className="space-y-1 text-xl">
            <div className="font-bold text-blue-300">1P</div>
            <div>Perfect: {state.counts1.perfect ?? 0}</div>
            <div>Good&nbsp;&nbsp;: {state.counts1.good ?? 0}</div>
            <div>Miss&nbsp;&nbsp;: {state.counts1.miss ?? 0}</div>
            <hr className="my-2 border-gray-500" />
            <div className="text-2xl font-bold">Score: {state.score1}</div>
          </div>
          <div className="space-y-1 text-xl">
            <div className="font-bold text-red-300">2P</div>
            <div>Perfect: {state.counts2.perfect ?? 0}</div>
            <div>Good&nbsp;&nbsp;: {state.counts2.good ?? 0}</div>
            <div>Miss&nbsp;&nbsp;: {state.counts2.miss ?? 0}</div>
            <hr className="my-2 border-gray-500" />
            <div className="text-2xl font-bold">Score: {state.score2}</div>
          </div>
        </div>
        <Link
          to="/"
          className="px-6 py-3 bg-blue-500 rounded-lg text-white hover:bg-blue-600"
        >
          ホームに戻る
        </Link>
      </div>
    );
  }
  // 1人プレイ用
  const { counts = {}, score = 0 } = state || {};
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-white">
      <h1 className="text-3xl font-bold">RESULT</h1>
      <div className="space-y-1 text-xl">
        <div>Perfect: {counts.perfect ?? 0}</div>
        <div>Good&nbsp;&nbsp;: {counts.good ?? 0}</div>
        <div>Miss&nbsp;&nbsp;: {counts.miss ?? 0}</div>
        <hr className="my-2 border-gray-500" />
        <div className="text-2xl font-bold">Score: {score}</div>
      </div>
      <Link
        to="/"
        className="px-6 py-3 bg-blue-500 rounded-lg text-white hover:bg-blue-600"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
