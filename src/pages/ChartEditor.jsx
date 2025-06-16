import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth,db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const GRID_HEIGHT = 180; // px（やや低く）
const GRID_WIDTH_BASE = 1200; // 横長に拡大
const LANE_COUNT = 1;
const NOTE_RADIUS = 18;
const DURATION = 15; // 秒

export default function ChartEditor() {
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(120);
  const [notes, setNotes] = useState([]); // {time, lane, type}
  const navigate = useNavigate();

  // BPMに応じてボード長さを調整
  const beatCount = Math.floor((bpm / 60) * DURATION);
  const GRID_WIDTH = Math.max(GRID_WIDTH_BASE, beatCount * 40); // 1拍40pxで伸縮
  const gridStep = GRID_WIDTH / beatCount;

  // ノーツ追加/削除
  const handleGridClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // 左→右に時間が進む
    const t = DURATION * (x / GRID_WIDTH);
    // 既存ノーツが近くにあれば削除
    const found = notes.findIndex(n => Math.abs(n.time - t) < 0.2);
    if (found !== -1) {
      setNotes(notes.filter((_, i) => i !== found));
    } else {
      setNotes([...notes, { time: t, lane: 0, type: 'tap' }]);
    }
  };

  // ノーツのX座標計算（左→右）
  const getX = (time) => (time / DURATION) * GRID_WIDTH;

  // Firebase保存処理
  const saveChart = async () => {
    if (!title || notes.length === 0) {
      alert('タイトル・ノーツを入力してください');
      return;
    }
    try {
      await addDoc(collection(db, 'charts'), {
        title,
        bpm: Number(bpm),
        offset: 0,
        notes,
        createdBy: auth.currentUser.uid,    
        createdAt: serverTimestamp(),
      });
      alert('譜面を保存しました！');
      navigate('/');
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-6">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => navigate(-1)}
      >戻る</button>
      <h2 className="text-3xl font-bold mb-6 text-white drop-shadow">譜面作成</h2>
      <div className="bg-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-4xl flex flex-col items-center gap-6">
        {/* 上部コントロールを横並びで中央配置 */}
        <div className="flex flex-row items-end gap-6 w-full justify-center mb-4">
          <div className="flex flex-col items-start">
            <label className="text-white text-base mb-1" htmlFor="title-input">譜面タイトル</label>
            <input
              id="title-input"
              className="border p-2 rounded w-48 text-lg bg-black/60 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="譜面タイトル"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col items-start">
            <label className="text-white text-base mb-1" htmlFor="bpm-input">BPM</label>
            <input
              id="bpm-input"
              className="border p-2 rounded w-24 text-lg bg-white/60 placeholder-white-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              type="number"
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
            />
          </div>
          <button
            className="ml-4 py-2 px-8 bg-yellow-400 hover:bg-yellow-500 text-blue-700 font-bold rounded-xl shadow-lg transition text-lg"
            onClick={saveChart}
          >
            保存する
          </button>
        </div>
        <div className="flex flex-col items-center w-full">
          <div className="w-full h-56 bg-gradient-to-b from-gray-800 via-black to-gray-900 rounded-xl border-4 border-yellow-400 shadow-inner flex items-center justify-center relative overflow-x-auto" style={{ minWidth: 800, maxWidth: 1400 }}>
            <div
              className="absolute inset-0 cursor-pointer"
              style={{ width: GRID_WIDTH, height: GRID_HEIGHT }}
              onClick={handleGridClick}
            >
              {/* 判定ライン */}
              <div
                className="absolute left-8 right-8 top-1/2 h-0.5 bg-yellow-300 opacity-80 z-10"
                style={{ top: GRID_HEIGHT / 2 }}
              />
              {/* ガイド線（1小節ごと） */}
              {Array.from({ length: beatCount + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-100 opacity-30"
                  style={{ left: i * gridStep }}
                />
              ))}
              {/* ノーツ描画 */}
              {notes.map((n, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border-4 border-yellow-400 bg-yellow-200 shadow-lg animate-pulse hover:scale-110 transition"
                  style={{
                    left: getX(n.time) - NOTE_RADIUS,
                    top: GRID_HEIGHT / 2 - NOTE_RADIUS,
                    width: NOTE_RADIUS * 2,
                    height: NOTE_RADIUS * 2,
                    zIndex: 20,
                  }}
                />
              ))}
            </div>
          </div>
          <span className="text-xs text-gray-300 mt-2">クリックでノーツ追加/削除</span>
        </div>
      </div>
    </div>
  );
}
