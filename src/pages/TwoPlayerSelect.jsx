import { useNavigate } from 'react-router-dom';
import song from '../data/tutorial.json';
import { useState } from 'react';

export default function TwoPlayerSelect() {
  const nav = useNavigate();
  const diffs = Object.keys(song.difficulty);
  const [p1, setP1] = useState('Easy');
  const [p2, setP2] = useState('Easy');

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6">
      <h2 className="text-2xl mb-4">二人プレイ 難易度選択</h2>
      <div className="flex gap-10">
        <div>
          <div className="mb-2">1P 難易度</div>
          {diffs.map(d => (
            <button
              key={d}
              className={`px-4 py-2 m-1 rounded ${p1 === d ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setP1(d)}
            >
              {d} (Lv.{song.difficulty[d].level})
            </button>
          ))}
        </div>
        <div>
          <div className="mb-2">2P 難易度</div>
          {diffs.map(d => (
            <button
              key={d}
              className={`px-4 py-2 m-1 rounded ${p2 === d ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setP2(d)}
            >
              {d} (Lv.{song.difficulty[d].level})
            </button>
          ))}
        </div>
      </div>
      <button
        className="mt-6 px-8 py-3 bg-green-600 text-white rounded-xl"
        onClick={() => nav(`/play2/tutorial/${p1}/${p2}`)}
      >
        ゲーム開始
      </button>
    </div>
  );
}
