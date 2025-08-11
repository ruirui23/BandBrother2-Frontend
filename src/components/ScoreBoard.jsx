import { useScore } from '../store';

export default function ScoreBoard() {
  const { counts, score } = useScore();

  return (
    <div className="absolute top-4 right-4 text-white text-lg space-y-1">
      <div>Perfect: {counts.perfect}</div>
      <div>Good&nbsp;&nbsp;: {counts.good}</div>
      <div>Bad&nbsp;&nbsp;&nbsp;: {counts.bad}</div>
      <hr className="my-1 border-gray-600" />
      <div className="text-xl font-bold">Score: {score}</div>
    </div>
  );
}
