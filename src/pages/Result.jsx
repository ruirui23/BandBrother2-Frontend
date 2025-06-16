import { Link, useLocation } from 'react-router-dom';

export default function Result() {
  const { state } = useLocation();
  
  // マルチプレイ用の結果表示
  if (state && state.isMultiPlayer) {
    const { counts = {}, score = 0, opponentScore = 0 } = state;
    let result = '';
    if (score > opponentScore) {
      result = 'WIN';
    } else if (score < opponentScore) {
      result = 'LOSE';
    } else {
      result = 'DRAW';
    }
    
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-white">
        <h1 className="text-3xl font-bold">MATCH RESULT</h1>
        <div className="text-6xl font-bold mb-4" style={{
          color: result === 'WIN' ? '#4CAF50' : result === 'LOSE' ? '#F44336' : '#FF9800'
        }}>
          {result}
        </div>
        <div className="flex gap-12">
          <div className="space-y-1 text-xl">
            <div className="font-bold text-blue-300">あなた</div>
            <div>Perfect: {counts.perfect ?? 0}</div>
            <div>Good&nbsp;&nbsp;: {counts.good ?? 0}</div>
            <div>Miss&nbsp;&nbsp;: {counts.miss ?? 0}</div>
            <hr className="my-2 border-gray-500" />
            <div className="text-2xl font-bold">Score: {score}</div>
          </div>
          <div className="space-y-1 text-xl">
            <div className="font-bold text-red-300">相手</div>
            <div className="text-2xl font-bold">Score: {opponentScore}</div>
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
  
  // 二人プレイ用のスコア・判定があれば両方表示
  if (state && state.counts1 && state.counts2) {
    const c1 = state.counts1;
    const c2 = state.counts2;
    const s1 = state.score1 ?? 0;
    const s2 = state.score2 ?? 0;
    let result1 = '', result2 = '';
    if (s1 > s2) {
      result1 = 'WIN';
      result2 = 'LOSE';
    } else if (s1 < s2) {
      result1 = 'LOSE';
      result2 = 'WIN';
    } else {
      result1 = result2 = 'DRAW';
    }
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-white">
        <h1 className="text-3xl font-bold">RESULT</h1>
        <div className="flex gap-12">
          <div className="space-y-1 text-xl">
            <div className="font-bold text-blue-300">1P <span className="ml-2">{result1}</span></div>
            <div>Perfect: {c1.perfect ?? 0}</div>
            <div>Good&nbsp;&nbsp;: {c1.good ?? 0}</div>
            <div>Miss&nbsp;&nbsp;: {c1.miss ?? 0}</div>
            <hr className="my-2 border-gray-500" />
            <div className="text-2xl font-bold">Score: {s1}</div>
          </div>
          <div className="space-y-1 text-xl">
            <div className="font-bold text-red-300">2P <span className="ml-2">{result2}</span></div>
            <div>Perfect: {c2.perfect ?? 0}</div>
            <div>Good&nbsp;&nbsp;: {c2.good ?? 0}</div>
            <div>Miss&nbsp;&nbsp;: {c2.miss ?? 0}</div>
            <hr className="my-2 border-gray-500" />
            <div className="text-2xl font-bold">Score: {s2}</div>
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
