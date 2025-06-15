import { useNavigate } from 'react-router-dom';
import song from '../data/tutorial.json';
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function TwoPlayerSelect() {
  const nav = useNavigate();
  const diffs = Object.keys(song.difficulty);
  const [p1, setP1] = useState('Easy');
  const [p2, setP2] = useState('Easy');
  const [showCustom, setShowCustom] = useState(false);
  const [customCharts, setCustomCharts] = useState([]);
  const [c1, setC1] = useState(null);
  const [c2, setC2] = useState(null);

  useEffect(() => {
    if (showCustom) {
      const fetchCharts = async () => {
        const snap = await getDocs(collection(db, 'charts'));
        setCustomCharts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchCharts();
    }
  }, [showCustom]);

  if (showCustom) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6">
        <button className="mb-2 px-4 py-1 bg-gray-400 rounded text-white" onClick={() => setShowCustom(false)}>戻る</button>
        <h2 className="text-2xl mb-4">二人プレイ オリジナル譜面選択</h2>
        <div className="flex gap-10">
          <div>
            <div className="mb-2">1P 譜面</div>
            {customCharts.map(chart => (
              <button
                key={chart.id}
                className={`px-4 py-2 m-1 rounded ${c1 === chart.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setC1(chart.id)}
              >
                {chart.title} (BPM:{chart.bpm})
              </button>
            ))}
          </div>
          <div>
            <div className="mb-2">2P 譜面</div>
            {customCharts.map(chart => (
              <button
                key={chart.id}
                className={`px-4 py-2 m-1 rounded ${c2 === chart.id ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setC2(chart.id)}
              >
                {chart.title} (BPM:{chart.bpm})
              </button>
            ))}
          </div>
        </div>
        <button
          className="mt-6 px-8 py-3 bg-green-600 text-white rounded-xl"
          disabled={!c1 || !c2}
          onClick={() => nav(`/play2/custom/${c1}/${c2}`)}
        >
          ゲーム開始
        </button>
      </div>
    );
  }

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
      <button
        className="mt-4 px-5 py-2 bg-blue-600 rounded-lg text-white"
        onClick={() => setShowCustom(true)}
      >
        オリジナル譜面
      </button>
    </div>
  );
}
