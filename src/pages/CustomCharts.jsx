import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { FaPlay, FaMusic, FaClock, FaUser, FaSyncAlt } from 'react-icons/fa';

export default function CustomCharts() {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchCharts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 全ての譜面を作成日時の降順で取得
      const q = query(collection(db, 'charts'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const chartsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCharts(chartsData);
    } catch (err) {
      console.error('譜面の取得に失敗しました:', err);
      setError('譜面の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharts();
  }, []);

  const playChart = (chartId) => {
    navigate(`/play-custom/${chartId}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '不明';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ja-JP');
    } catch {
      return '不明';
    }
  };

  const getCreatorDisplay = (createdBy) => {
    if (!createdBy) return '不明';
    if (createdBy === auth.currentUser?.uid) return '自分';
    return createdBy.substring(0, 8) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900">
        <div className="text-white text-2xl">譜面を読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-4">
        <div className="text-red-400 text-xl">{error}</div>
        <button
          onClick={fetchCharts}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <FaSyncAlt /> 再試行
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <button
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            onClick={() => navigate(-1)}
          >
            戻る
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <FaMusic className="text-yellow-400" />
            カスタム譜面
          </h1>
          <button
            onClick={fetchCharts}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
          >
            <FaSyncAlt /> 更新
          </button>
        </div>

        {/* 譜面一覧 */}
        {charts.length === 0 ? (
          <div className="text-center text-gray-400 text-xl mt-16">
            カスタム譜面がありません
          </div>
        ) : (
          <div className="grid gap-4">
            {charts.map((chart) => (
              <div
                key={chart.id}
                className="bg-white/10 rounded-xl p-6 shadow-lg hover:bg-white/15 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {chart.title || '無題'}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        <FaMusic className="text-yellow-400" />
                        BPM: {chart.bpm || '不明'}
                      </div>
                      <div className="flex items-center gap-1">
                        <FaClock className="text-blue-400" />
                        長さ: {chart.duration || 15}秒
                      </div>
                      <div className="flex items-center gap-1">
                        <FaUser className="text-green-400" />
                        作成者: {getCreatorDisplay(chart.createdBy)}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      音源: {chart.audioTitle || '不明'} | 
                      作成日: {formatDate(chart.createdAt)} |
                      ノーツ数: {chart.notes?.length || 0}
                    </div>
                  </div>
                  <button
                    onClick={() => playChart(chart.id)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-bold transition-colors ml-4"
                  >
                    <FaPlay /> プレイ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}