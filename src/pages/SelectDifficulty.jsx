import { useParams, useNavigate } from 'react-router-dom';
import song from '../data/tutorial.json';
import { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function SelectDifficulty() {
  const nav = useNavigate();
  const diffs = Object.keys(song.difficulty);
  const [customCharts, setCustomCharts] = useState([]);
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    // Firebaseからカスタム譜面を取得（ログインユーザーのみ）
    const fetchCharts = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setCustomCharts([]);
        return;
      }
      const chartsQuery = query(collection(db, 'charts'), where('createdBy', '==', uid));
      const snap = await getDocs(chartsQuery);
      setCustomCharts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCharts();
  }, [auth.currentUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-6">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >戻る</button>
      <h2 className="text-3xl font-bold mb-6 text-white drop-shadow">難易度を選択</h2>
      {!showCustom && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {diffs.map((d, i) => (
            <button
              key={d}
              className={`px-6 py-4 rounded-xl text-xl font-bold shadow-lg transition text-white ${i === 0 ? 'bg-green-500 hover:bg-green-600' : i === 1 ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-500 hover:bg-red-600'}`}
              onClick={() => nav(`/play/tutorial/${d}`)}
            >
              {d} (Lv.{song.difficulty[d].level})
            </button>
          ))}
          <button
            className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-lg font-bold shadow-lg"
            onClick={() => setShowCustom(true)}
          >
            オリジナル譜面
          </button>
        </div>
      )}
      {showCustom && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <button className="mb-2 px-4 py-2 bg-gray-400 hover:bg-gray-500 rounded-lg text-white font-bold self-start" onClick={() => setShowCustom(false)}>
            ← 戻る
          </button>
          <h3 className="text-2xl font-semibold mb-2 text-white">オリジナル譜面リスト</h3>
          {customCharts.length === 0 && <div className="text-white">譜面がありません</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {customCharts.map(chart => (
              <button
                key={chart.id}
                className="px-5 py-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-white text-lg font-bold shadow-lg flex flex-col items-start gap-1 transition"
                onClick={() => nav(`/play/custom/${chart.id}`)}
              >
                <span className="text-xl">{chart.title}</span>
                <span className="text-sm text-blue-100">BPM:{chart.bpm}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
