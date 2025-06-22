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

// レーンのY座標を定義
const LANE_Y_POSITIONS = [-96, -32, 32, 96]; 

// キーとレーンのマッピング
const KEY_TO_LANE = {
  'KeyD': 0,
  'KeyF': 1,
  'KeyJ': 2,
  'KeyK': 3,
};
const VALID_KEYS = Object.keys(KEY_TO_LANE);

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
      .map(n => ({ ...n, id: `${n.time}-${n.lane}`, hit: false, missed: false }));

    soundRef.current = new Howl({
      src: [song.audio],
      html5: true,
      preload: true,
      onload: () => setIsSoundLoaded(true),
      onend: () => {
        setTimeout(() => {
           nav('/result', { state: scoreRef.current });
        }, 500);
      }
    });

    return () => {
      soundRef.current?.stop();
      soundRef.current?.unload();
    };
  }, [difficulty, reset, nav, diffObj.notes]);

  useEffect(() => {
    if (started && time >= 15) {
      soundRef.current?.stop();
      if(nav) nav('/result', { state: scoreRef.current });
    }
  }, [time, started, nav]);

  useEffect(() => {
    if (!isSoundLoaded || !soundRef.current) return;

    const onFirstKey = (e) => {
      if (!soundRef.current.playing()) {
         soundRef.current.play();
         setStarted(true);
      }
    };
    window.addEventListener('keydown', onFirstKey, { once: true });
    return () => {
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
    if (!started || !VALID_KEYS.includes(e.code)) return;
    
    const lane = KEY_TO_LANE[e.code];
    const currentTime = soundRef.current?.seek() || 0;

    // 押されたキーに対応するレーンの中で、最も判定ラインに近いノーツを探す
    let bestMatchIndex = -1;
    let minDistance = Infinity;

    notesRef.current.forEach((n, index) => {
        if (n.lane !== lane || n.hit || n.missed) return;
        
        const distance = Math.abs(HIT_X - (HIT_X + (n.time - currentTime - offset) * NOTE_SPEED));
        
        if (distance < JUDGE.good && distance < minDistance) {
            minDistance = distance;
            bestMatchIndex = index;
        }
    });


    if (bestMatchIndex === -1) {
      // 対応レーンに叩けるノーツがなければミス（お好みで）
      // add('miss'); 
      return;
    }

    const note = notesRef.current[bestMatchIndex];
    if (minDistance < JUDGE.perfect) {
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
  const visibleNotes = notesRef.current.filter(
    n => !n.hit && !n.missed && Math.abs(n.time - time - offset) < WINDOW_SEC
  );
  
  const screenCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

  /* ---------- 描画 ---------- */
  if (!isSoundLoaded) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Loading...</div>;
  if (!started) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Press D, F, J, or K to start</div>;

  return (
    <div className="relative h-screen overflow-hidden bg-black">
       <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >Back</button>

      {/* スコア表示 */}
      <div className="absolute left-4 top-16 text-xl text-white">
        Score: {score}
      </div>

      {/* 4本の判定ライン */}
      {LANE_Y_POSITIONS.map((y, index) => (
         <div key={index} style={{ top: `calc(50% + ${y}px)`}} className="absolute left-0 right-0 transform -translate-y-1/2">
            <HitLine lane={index} />
         </div>
      ))}

      {/* ノーツ表示 */}
      {visibleNotes.map((n) => {
        const yPos = screenCenterY + LANE_Y_POSITIONS[n.lane];
        return (
          <Note
            key={n.id}
            x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
            y={yPos}
            lane={n.lane}
          />
        )
      })}
    </div>
  );
}
