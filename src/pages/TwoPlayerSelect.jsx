import { useNavigate } from 'react-router-dom';
import song from '../data/tutorial.json';
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const chartsQuery = query(collection(db, 'charts'), where('createdBy', '==', uid));
        const snap = await getDocs(chartsQuery);
        setCustomCharts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchCharts();
    }
  }, [showCustom]);

  if (showCustom) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-6">
        <button className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30" onClick={() => setShowCustom(false)}>戻る</button>
        <h2 className="text-2xl mb-4 text-white font-bold drop-shadow">二人プレイ オリジナル譜面選択</h2>
        <div className="flex gap-10">
          <div>
            <div className="mb-2 text-white">1P 譜面</div>
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
            <div className="mb-2 text-white">2P 譜面</div>
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-6">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >戻る</button>
      <h2 className="text-3xl font-bold mb-6 text-white drop-shadow text-center tracking-wide">二人プレイ 難易度選択</h2>
      <div className="flex flex-row gap-16 w-full max-w-3xl justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="mb-2 text-white font-semibold text-lg tracking-wide">1P 難易度</div>
          <div className="flex flex-col gap-4">
            {diffs.map((d, i) => (
              <button
                key={d}
                className={`px-8 py-4 rounded-xl text-xl font-bold shadow-lg transition text-white ${p1 === d ? 'bg-blue-500 border-4 border-white' : 'bg-gray-200 text-black'}`}
                onClick={() => setP1(d)}
              >
                {d} (Lv.{song.difficulty[d].level})
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="mb-2 text-white font-semibold text-lg tracking-wide">2P 難易度</div>
          <div className="flex flex-col gap-4">
            {diffs.map((d, i) => (
              <button
                key={d}
                className={`px-8 py-4 rounded-xl text-xl font-bold shadow-lg transition text-white ${p2 === d ? 'bg-red-500 border-4 border-white' : 'bg-gray-200 text-black'}`}
                onClick={() => setP2(d)}
              >
                {d} (Lv.{song.difficulty[d].level})
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        className="mt-8 px-8 py-4 bg-green-600 hover:bg-green-700 rounded-xl text-white text-xl font-bold shadow-lg"
        onClick={() => nav(`/play2/tutorial/${p1}/${p2}`)}
      >
        ゲーム開始
      </button>
      <button
        className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-lg font-bold shadow-lg"
        onClick={() => setShowCustom(true)}
      >
        オリジナル譜面
      </button>
    </div>
  );
}
