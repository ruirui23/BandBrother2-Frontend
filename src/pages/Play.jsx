// src/pages/Play.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Howl } from 'howler';
import song from '../data/tutorial.json';
import { useScore } from '../store';
import useGameLoop from '../hooks/useGameLoop';
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants';
import Note from '../components/Note';
import HitLine from '../components/HitLine';

const JUDGE = { perfect: 24, good: 48 }; // px単位: perfect=24px(0.04s*300), good=48px(0.10s*300)

export default function Play() {
  /* ---------- URL パラメータ ---------- */
  const { difficulty = 'Easy' } = useParams();
  const nav = useNavigate();

  /* ---------- スコア ---------- */
  const { add, reset, counts, score } = useScore();

  /* ---------- 曲・譜面データ ---------- */
  const diffObj = song.difficulty[difficulty] || song.difficulty.Easy;
  const rawNotes = diffObj.notes ?? [];
  const offset   = song.offset ?? 0;                  // undefined → 0

  const notesRef = useRef([]);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [isSoundLoaded, setIsSoundLoaded] = useState(false);
  
  const soundRef = useRef(null);
  const scoreRef = useRef({ counts, score });

  useEffect(() => {
    return useScore.subscribe(
      (state) => (scoreRef.current = { counts: state.counts, score: state.score })
    );
  }, []);

  useEffect(() => {
    reset();
    notesRef.current = (diffObj.notes ?? [])
      .sort((a, b) => a.time - b.time)
      .map(n => ({ ...n, hit: false, missed: false }));

    soundRef.current = new Howl({
      src: [song.audio],
      html5: true,
      preload: true,
      onload: () => setIsSoundLoaded(true),
    });

    return () => {
      soundRef.current?.stop();
      soundRef.current?.unload();
    };
  }, [difficulty]);

  useEffect(() => {
    if (started && time >= 15) {
      soundRef.current?.stop();
      nav('/result', { state: scoreRef.current });
    }
  }, [time, started, nav]);

  useEffect(() => {
    if (!isSoundLoaded || !soundRef.current) return;
    const handlePlay = () => setStarted(true);
    const onFirstKey = () => {
      if (!soundRef.current.playing()) {
        soundRef.current.play();
      }
    };
    soundRef.current.on('play', handlePlay);
    window.addEventListener('keydown', onFirstKey, { once: true });
    return () => {
      soundRef.current?.off('play', handlePlay);
      window.removeEventListener('keydown', onFirstKey);
    };
  }, [isSoundLoaded]);

  useGameLoop(() => {
    if (!started || !soundRef.current) return;
    const newTime = soundRef.current.seek();
    if (typeof newTime !== 'number') return;
    setTime(newTime);
    
    let misses = 0;
    for (const n of notesRef.current) {
      if (!n.hit && !n.missed && newTime - (n.time - offset) > 0.2) {
        n.missed = true;
        misses++;
      }
    }
    if (misses > 0) {
      for (let i = 0; i < misses; i++) add('miss');
    }
  });

  const onKey = useCallback((e) => {
    if (!started || e.code !== 'Space') return;
    
    const currentTime = soundRef.current?.seek() || 0;
    const targetNoteIndex = notesRef.current.findIndex(n => {
      if (n.hit || n.missed) return false;
      const x = HIT_X + (n.time - currentTime - offset) * NOTE_SPEED;
      return Math.abs(x - HIT_X) < JUDGE.good;
    });

    if (targetNoteIndex === -1) {
      add('miss');
      return;
    }

    const note = notesRef.current[targetNoteIndex];
    const x = HIT_X + (note.time - currentTime - offset) * NOTE_SPEED;
    if (Math.abs(x - HIT_X) < JUDGE.perfect) {
      add('perfect');
    } else {
      add('good');
    }
    note.hit = true;
    setTime(currentTime); // Force re-render

  }, [started, offset, add]);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  /* ---------- 描画対象ノーツ ---------- */
  // ノーツを右端から左端へ流す
  const screenW = window.innerWidth;
  const visible = notesRef.current.filter(
    n => !n.hit && !n.missed && n.time - time < WINDOW_SEC && n.time - time > -1.5
  );

  /* ---------- 描画 ---------- */
  if (!isSoundLoaded) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">音源を読み込んでいます...</div>;
  if (!started) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Press any key to start</div>;

  return (
    <div className="relative h-screen overflow-hidden bg-black flex flex-col items-center justify-center">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >戻る</button>
      {/* ノーツ表示 */}
      {visible.map((n) => (
        <Note
          key={n.time}
          x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
          yOffset={0}
        />
      ))}
      <HitLine />
    </div>
  );
}
