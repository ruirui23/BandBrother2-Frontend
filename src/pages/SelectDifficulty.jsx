import { useParams, useNavigate } from 'react-router-dom';
import song from '../data/tutorial.json';

export default function SelectDifficulty() {
  const nav = useNavigate();
  const diffs = Object.keys(song.difficulty);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <h2 className="text-2xl mb-4">難易度を選択</h2>
      {diffs.map(d => (
        <button
          key={d}
          className="px-5 py-2 bg-green-500 rounded-lg text-white"
          onClick={() => nav(`/play/tutorial/${d}`)}
        >
          {d} (Lv.{song.difficulty[d].level})
        </button>
      ))}
    </div>
  );
}
