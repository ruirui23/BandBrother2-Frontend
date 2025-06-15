import { useParams, useNavigate } from 'react-router-dom';
import song from '../data/tutorial.json';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function SelectDifficulty() {
  const nav = useNavigate();
  const diffs = Object.keys(song.difficulty);
  const [customCharts, setCustomCharts] = useState([]);
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    // Firebaseからカスタム譜面を取得
    const fetchCharts = async () => {
      const snap = await getDocs(collection(db, 'charts'));
      setCustomCharts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCharts();
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <h2 className="text-2xl mb-4">難易度を選択</h2>
      {!showCustom && (
        <>
          {diffs.map(d => (
            <button
              key={d}
              className="px-5 py-2 bg-green-500 rounded-lg text-white"
              onClick={() => nav(`/play/tutorial/${d}`)}
            >
              {d} (Lv.{song.difficulty[d].level})
            </button>
          ))}
          <button
            className="mt-8 px-5 py-2 bg-blue-600 rounded-lg text-white"
            onClick={() => setShowCustom(true)}
          >
            オリジナル譜面
          </button>
        </>
      )}
      {showCustom && (
        <div className="flex flex-col items-center gap-2">
          <button className="mb-2 px-4 py-1 bg-gray-400 rounded text-white" onClick={() => setShowCustom(false)}>戻る</button>
          <h3 className="text-lg mb-2">オリジナル譜面リスト</h3>
          {customCharts.length === 0 && <div className="text-white">譜面がありません</div>}
          {customCharts.map(chart => (
            <button
              key={chart.id}
              className="px-5 py-2 bg-blue-500 rounded-lg text-white"
              onClick={() => nav(`/play/custom/${chart.id}`)}
            >
              {chart.title} (BPM:{chart.bpm})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
