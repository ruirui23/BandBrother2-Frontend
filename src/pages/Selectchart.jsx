import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const Selectchart = () => {
  const nav = useNavigate();
  const [customCharts, setCustomCharts] = useState([]);
  const diffs = ['Henceforth','hogehoge','varvar','ajdfj'];

  useEffect(() => {
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
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-6">
      <h1 className="text-4xl font-bold text-white mb-6">譜面選択</h1>
      <h2 className="text-2xl font-semibold text-white mb-4">公式譜面リスト</h2>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {diffs.map(diff => (
          <button
            key={diff}
            className="px-5 py-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-white text-lg font-bold shadow-lg flex flex-col items-start gap-1 transition"
            onClick={() => nav(`/play/tutorial/${diff.toLowerCase()}`)}
          >
            <span className="text-xl">{diff}</span>
          </button>
        ))}
      </div>
      <h3 className="text-2xl font-semibold mt-8 mb-2 text-white">オリジナル譜面リスト</h3>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {customCharts.length === 0 && <div className="text-white">オリジナル譜面はありません</div>}
        {customCharts.map(chart => (
          <button
            key={chart.id}
            className="px-5 py-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-white text-lg font-bold shadow-lg flex flex-col items-start gap-1 transition"
            onClick={() => nav(`/play/custom/${chart.id}`)}
          >
            <span className="text-xl">{chart.title || 'タイトルなし'}</span>
            <span className="text-sm text-blue-100">BPM:{chart.bpm}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Selectchart;
