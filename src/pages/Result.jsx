import { Link, useLocation } from 'react-router-dom';

export default function Result() {
  const { state } = useLocation();
  const { counts, score } = state || { counts: {}, score: 0 };

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-white">
      <h1 className="text-3xl font-bold">RESULT</h1>
      <div className="space-y-1 text-xl">
        <div>Perfect: {counts.perfect}</div>
        <div>Good&nbsp;&nbsp;: {counts.good}</div>
        <div>Bad&nbsp;&nbsp;&nbsp;: {counts.bad}</div>
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
