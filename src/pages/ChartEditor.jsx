import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const GRID_HEIGHT = 300; // px
const GRID_WIDTH_BASE = 800; // px, BPMで伸縮
const LANE_COUNT = 1; // 1レーン（拡張可）
const NOTE_RADIUS = 18;
const DURATION = 15; // 秒

export default function ChartEditor() {
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(120);
  const [audio, setAudio] = useState('');
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
        bpm,
        audio,
        notes,
        createdAt: serverTimestamp(),
      });
      alert('譜面を保存しました！');
      navigate('/');
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-black text-white">
      <h2 className="text-2xl font-bold mb-4">譜面作成</h2>
      <div className="flex flex-col items-start w-64 mb-2">
        <label className="text-white text-lg mb-1" htmlFor="title-input">譜面タイトル</label>
        <input
          id="title-input"
          className="border p-2 rounded w-full text-white text-lg bg-black placeholder-gray-400"
          placeholder="譜面タイトル"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ color: 'white' }}
        />
      </div>
      <div className="flex flex-col items-start w-64 mb-2">
        <label className="text-white text-lg mb-1" htmlFor="bpm-input">BPM</label>
        <input
          id="bpm-input"
          className="border p-2 rounded w-full text-white text-lg bg-black placeholder-gray-400"
          placeholder="BPM"
          type="number"
          value={bpm}
          min={40}
          max={300}
          onChange={e => setBpm(Number(e.target.value))}
          style={{ color: 'white' }}
        />
      </div>
      <input
        className="border p-2 rounded w-64 text-black"
        placeholder="音源URL（例: /audio/Henceforth.mp3）"
        value={audio}
        onChange={e => setAudio(e.target.value)}
      />
      <div
        style={{ width: GRID_WIDTH, height: GRID_HEIGHT, background: '#222', position: 'relative', margin: '24px 0', borderRadius: 12, cursor: 'pointer', overflow: 'auto' }}
        onClick={handleGridClick}
      >
        {/* グリッド線 */}
        {[...Array(beatCount + 1)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: i * gridStep - 1,
              width: 1,
              height: '100%',
              background: i % 4 === 0 ? '#fff' : '#888',
              opacity: 0.3
            }}
          />
        ))}
        {/* ノーツ */}
        {notes.map((n, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: GRID_HEIGHT / 2 - NOTE_RADIUS,
              left: getX(n.time) - NOTE_RADIUS,
              width: NOTE_RADIUS * 2,
              height: NOTE_RADIUS * 2,
              background: '#f7931e',
              borderRadius: '50%',
              border: '4px solid #fff',
              boxSizing: 'border-box',
              zIndex: 2
            }}
          />
        ))}
      </div>
      <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={saveChart}>譜面を保存</button>
      <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => navigate('/')}>キャンセル</button>
      <div className="mt-4 w-96">
        <h3 className="font-bold">ノーツリスト</h3>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto text-black" style={{maxHeight:200}}>{JSON.stringify(notes, null, 2)}</pre>
      </div>
    </div>
  );
}
