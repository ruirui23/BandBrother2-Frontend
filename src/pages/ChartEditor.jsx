import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const GRID_HEIGHT = 180; // px（やや低く）
const GRID_WIDTH_BASE = 1200; // 横長に拡大
const LANE_COUNT = 1;
const NOTE_RADIUS = 18;
const DURATION = 15; // 秒

const LOCAL_SONGS = [
  { title: "Henceforth", url: "/audio/Henceforth.mp3" },
  { title: "DAYBREAK FRONTLINE", url: "/audio/DAYBREAK FRONTLINE.mp3" },
  { title: "NOMONEYDANCE", url: "/audio/NOMONEYDANCE.mp3" },
  { title: "あつまれ！パーティーピーポー", url: "/audio/あつまれ！パーティーピーポー.mp3" },
  { title: "喜志駅周辺なんもない", url: "/audio/喜志駅周辺なんもない.mp3" },
  { title: "無線LANマジ便利", url: "/audio/無線LANマジ便利.mp3" },
];

const LANE_COLORS = [
  { name: 'Orange', bg: 'bg-orange-900/50', border: 'border-orange-400', note: 'bg-orange-300', noteBorder: 'border-orange-500' },
  { name: 'Pink', bg: 'bg-pink-900/50', border: 'border-pink-400', note: 'bg-pink-300', noteBorder: 'border-pink-500' },
  { name: 'Cyan', bg: 'bg-cyan-900/50', border: 'border-cyan-400', note: 'bg-cyan-300', noteBorder: 'border-cyan-500' },
  { name: 'Green', bg: 'bg-green-900/50', border: 'border-green-400', note: 'bg-green-300', noteBorder: 'border-green-500' },
];

const EditorLane = React.memo(({ lane, notes, onNotesChange, duration, gridWidth, beatCount, gridStep, colorConfig }) => {
  const getX = (time) => (time / duration) * gridWidth;

  const handleGridClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = duration * (x / gridWidth);

    const proximityThreshold = duration * (NOTE_RADIUS * 2 / gridWidth);
    const foundIndex = notes.findIndex(n => n.lane === lane && Math.abs(n.time - time) < proximityThreshold);

    if (foundIndex !== -1) {
      onNotesChange(notes.filter((_, i) => i !== foundIndex));
    } else {
      onNotesChange([...notes, { time, lane, type: 'tap' }].sort((a,b) => a.time - b.time));
    }
  };

  return (
    <div className={`w-full h-24 ${colorConfig.bg} rounded-xl border-2 ${colorConfig.border} shadow-inner flex items-center justify-center relative overflow-x-auto`} style={{ minWidth: 800, maxWidth: 1400 }}>
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ width: gridWidth, height: '100%' }}
        onClick={handleGridClick}
      >
        {Array.from({ length: beatCount + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-white/20"
            style={{ left: i * gridStep }}
          />
        ))}
        {notes.filter(n => n.lane === lane).map((n, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${colorConfig.note} ${colorConfig.noteBorder} border-2 shadow-lg`}
            style={{
              left: getX(n.time) - NOTE_RADIUS,
              top: '50%' ,
              transform: 'translateY(-50%)',
              width: NOTE_RADIUS * 2,
              height: NOTE_RADIUS * 2,
              zIndex: 20,
            }}
          />
        ))}
      </div>
    </div>
  );
});

export default function ChartEditor() {
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(120);
  const [notes, setNotes] = useState([]); // {time, lane, type}
  const [selectedSong, setSelectedSong] = useState(LOCAL_SONGS[0].url);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef(null);
  const navigate = useNavigate();

  // 音声ファイル変更時の処理
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load(); // 新しい音声ファイルを読み込み
      setAudioError(false);
    }
  }, [selectedSong]);

  // 音声エラーハンドリング
  const handleAudioError = () => {
    setAudioError(true);
    console.error('音声ファイルの読み込みに失敗しました:', selectedSong);
  };

  // BPMに応じてボード長さを調整
  const beatCount = Math.floor((bpm / 60) * DURATION);
  const GRID_WIDTH = Math.max(GRID_WIDTH_BASE, beatCount * 40); // 1拍40pxで伸縮
  const gridStep = GRID_WIDTH / beatCount;

  // Firebase保存処理
  const saveChart = async () => {
    if (!title || !selectedSong) {
      alert('タイトルと音源は必須です');
      return;
    }
    if(notes.length === 0){
      if(!confirm('ノーツがありませんが保存しますか？')) return;
    }
    try {
      const chartData = {
        title,
        audio: selectedSong,
        bpm: Number(bpm),
        offset: 0,
        notes: notes, // Already sorted
        createdBy: auth.currentUser?.uid || 'unknown',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'charts'), chartData);
      alert(`譜面「${title}」を保存しました！`);
      navigate('/');
    } catch (e) {
      console.error('保存に失敗しました: ', e);
      alert('保存に失敗しました。');
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current && !audioError) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => setAudioError(true));
      } else {
        audioRef.current.pause();
      }
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
              className="border p-2 rounded w-48 text-lg bg-gray-300 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="譜面タイトル"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col items-start">
            <label className="text-white text-base mb-1" htmlFor="bpm-input">BPM</label>
            <input
              id="bpm-input"
              className="border p-2 rounded w-24 text-lg bg-gray-300 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              type="number"
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col items-start">
            <label className="text-white text-base mb-1" htmlFor="music-select">BGM</label>
            <select
              id="music-select"
              className="border p-2 rounded w-48 text-lg bg-gray-300 text-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={selectedSong}
              onChange={e => setSelectedSong(e.target.value)}
            >
              {LOCAL_SONGS.map(song => (
                <option key={song.url} value={song.url}>{song.title}</option>
              ))}
            </select>
            <audio 
              ref={audioRef} 
              src={selectedSong} 
              loop 
              className="hidden" 
              onError={handleAudioError}
            />
            {audioError && (
              <span className="text-xs text-red-400 mt-1">音声ファイル読み込みエラー</span>
            )}
          </div>
          {/* ボタンをグループ化 */}
          <div className="flex items-end ml-4">
            <button
              onClick={handlePlayPause}
              className={`py-2 px-6 font-bold rounded-l-xl ${
                audioError 
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              disabled={audioError}
            >
              再生/停止
            </button>
            <button
              className="py-2 px-8 bg-yellow-400 hover:bg-yellow-500 text-blue-700 font-bold rounded-r-xl shadow-lg transition text-lg"
              onClick={saveChart}
            >
              保存する
            </button>
          </div>
        </div>
        <div className="w-full flex flex-col gap-2 items-center">
          {LANE_COLORS.map((color, index) => (
            <EditorLane 
              key={index}
              lane={index}
              notes={notes}
              onNotesChange={setNotes}
              duration={DURATION}
              gridWidth={GRID_WIDTH}
              beatCount={beatCount}
              gridStep={gridStep}
              colorConfig={color}
            />
          ))}
          <span className="text-xs text-gray-300 mt-2">各レーンをクリックしてノーツを追加/削除</span>
        </div>
      </div>
    </div>
  );
}
