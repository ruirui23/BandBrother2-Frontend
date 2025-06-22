import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Howl } from 'howler';
import songData from '../data/tutorial.json';
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants';
import Note from '../components/Note';
import HitLine from '../components/HitLine';
import useGameLoop from '../hooks/useGameLoop';

const JUDGE = { perfect: 24, good: 48 };

// --- Player 1 (Top Screen) ---
const P1_LANE_Y_POS = [-96, -32, 32, 96]; 
const P1_KEY_TO_LANE = { 'KeyQ': 0, 'KeyW': 1, 'KeyE': 2, 'KeyR': 3 };

// --- Player 2 (Bottom Screen) ---
const P2_LANE_Y_POS = [-96, -32, 32, 96];
const P2_KEY_TO_LANE = { 'KeyU': 0, 'KeyI': 1, 'KeyO': 2, 'KeyP': 3 };

const ALL_VALID_KEYS = [...Object.keys(P1_KEY_TO_LANE), ...Object.keys(P2_KEY_TO_LANE)];

export default function TwoPlayerPlay() {
  const { p1 = 'Easy' } = useParams();
  const nav = useNavigate();
  const offset = songData.offset ?? 0;

  const [notes, setNotes] = useState({ p1: [], p2: [] });
  const p1ScoreRef = useRef({ perfect: 0, good: 0, miss: 0, score: 0 });
  const p2ScoreRef = useRef({ perfect: 0, good: 0, miss: 0, score: 0 });

  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const soundRef = useRef(null);

  useEffect(() => {
    const chartNotes = songData.difficulty[p1]?.notes ?? [];
    setNotes({
      p1: chartNotes.map(n => ({ ...n, id: `p1-${n.time}-${n.lane}`, hit: false, missed: false })),
      p2: chartNotes.map(n => ({ ...n, id: `p2-${n.time}-${n.lane}`, hit: false, missed: false }))
    });

    p1ScoreRef.current = { perfect: 0, good: 0, miss: 0, score: 0 };
    p2ScoreRef.current = { perfect: 0, good: 0, miss: 0, score: 0 };

    soundRef.current = new Howl({
      src: [songData.audio], html5: true,
      onend: () => {
        nav('/result', { 
            state: { 
                counts1: p1ScoreRef.current, score1: p1ScoreRef.current.score,
                counts2: p2ScoreRef.current, score2: p2ScoreRef.current.score,
            }
        });
      }
    });

    return () => soundRef.current?.unload();
  }, [p1, nav]);

  const handleMisses = useCallback(() => {
    const currentTime = soundRef.current?.seek() ?? 0;
    
    let p1Changed = false;
    const p1NewNotes = notes.p1.map(n => {
      if (!n.hit && !n.missed && currentTime - (n.time - offset) > 0.2) {
        p1ScoreRef.current.miss++;
        p1ScoreRef.current.score -= 2;
        p1Changed = true;
        return { ...n, missed: true };
      }
      return n;
    });

    let p2Changed = false;
    const p2NewNotes = notes.p2.map(n => {
      if (!n.hit && !n.missed && currentTime - (n.time - offset) > 0.2) {
        p2ScoreRef.current.miss++;
        p2ScoreRef.current.score -= 2;
        p2Changed = true;
        return { ...n, missed: true };
      }
      return n;
    });

    if (p1Changed || p2Changed) {
      setNotes(prev => ({
        ...prev,
        p1: p1Changed ? p1NewNotes : prev.p1,
        p2: p2Changed ? p2NewNotes : prev.p2,
      }));
    }
  }, [notes, offset]);

  useGameLoop(() => {
    if (!started || !soundRef.current) return;
    const newTime = soundRef.current.seek();
    if (typeof newTime !== 'number') return;
    setTime(newTime);
    handleMisses();
  });

  const onKey = useCallback((e) => {
    if (!started || !ALL_VALID_KEYS.includes(e.code)) return;
    
    const currentTime = soundRef.current?.seek() || 0;
    const isP1Key = Object.keys(P1_KEY_TO_LANE).includes(e.code);
    
    const player = isP1Key ? 'p1' : 'p2';
    const targetLane = isP1Key ? P1_KEY_TO_LANE[e.code] : P2_KEY_TO_LANE[e.code];
    const scoreRef = isP1Key ? p1ScoreRef : p2ScoreRef;

    let bestMatchIndex = -1;
    let minDistance = Infinity;

    notes[player].forEach((n, index) => {
      if (n.lane !== targetLane || n.hit || n.missed) return;
      const distance = Math.abs(HIT_X - (HIT_X + (n.time - currentTime - offset) * NOTE_SPEED));
      if (distance < JUDGE.good && distance < minDistance) {
        minDistance = distance;
        bestMatchIndex = index;
      }
    });

    if (bestMatchIndex === -1) return;

    if (minDistance < JUDGE.perfect) {
      scoreRef.current.perfect++;
      scoreRef.current.score += 5;
    } else {
      scoreRef.current.good++;
      scoreRef.current.score += 2;
    }

    setNotes(prev => ({
      ...prev,
      [player]: prev[player].map((n, idx) => idx === bestMatchIndex ? { ...n, hit: true } : n)
    }));
  }, [started, notes, offset]);

  useEffect(() => {
    const onFirstKey = (e) => {
      if (!soundRef.current?.playing()) {
        soundRef.current?.play();
        setStarted(true);
      }
    };
    window.addEventListener('keydown', onFirstKey, { once: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onFirstKey);
      window.removeEventListener('keydown', onKey);
    };
  }, [onKey, started]);

  if (!notes.p1.length) {
    return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Loading Chart...</div>;
  }
  if (!started) return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white text-center">
      <div className="text-2xl mb-4">１Pは上のレーンからQ，W，E，Rキー　２PはU，I，O，Pキーを押してプレイしてね</div>
      <div className="text-xl text-gray-300">タップしてスタート</div>
    </div>
  );

  const screenHeight = window.innerHeight;

  return (
    <div className="relative h-screen overflow-hidden bg-black text-white">
      {/* --- Player 1 Field (Top) --- */}
      <div className="absolute w-full top-0 h-1/2 border-b-2 border-yellow-400 box-border">
        {P1_LANE_Y_POS.map((y, index) => (
          <div key={`p1-hl-${index}`} style={{ top: `calc(50% + ${y}px)` }} className="absolute left-0 right-0 transform -translate-y-1/2">
            <HitLine lane={index} />
          </div>
        ))}
        {notes.p1
          .filter(n => !n.hit && !n.missed && Math.abs(n.time - time - offset) < WINDOW_SEC)
          .map(n => {
            const p1CenterY = screenHeight / 4;
            const yPos = p1CenterY + P1_LANE_Y_POS[n.lane];
            return <Note key={n.id} x={HIT_X + (n.time - time - offset) * NOTE_SPEED} y={yPos} lane={n.lane} />;
          })}
      </div>

      {/* --- Player 2 Field (Bottom) --- */}
      <div className="absolute w-full top-1/2 h-1/2">
        {P2_LANE_Y_POS.map((y, index) => (
          <div key={`p2-hl-${index}`} style={{ top: `calc(50% + ${y}px)` }} className="absolute left-0 right-0 transform -translate-y-1/2">
            <HitLine lane={index} />
          </div>
        ))}
        {notes.p2
          .filter(n => !n.hit && !n.missed && Math.abs(n.time - time - offset) < WINDOW_SEC)
          .map(n => {
            const p2CenterY = screenHeight / 4;
            const yPos = p2CenterY + P2_LANE_Y_POS[n.lane];
            return <Note key={n.id} x={HIT_X + (n.time - time - offset) * NOTE_SPEED} y={yPos} lane={n.lane} />;
          })}
      </div>
      
      <div className="absolute left-4 top-4 text-xl">1P: {p1ScoreRef.current.score}</div>
      <div className="absolute left-4 bottom-4 text-xl">2P: {p2ScoreRef.current.score}</div>
       <button
        className="absolute right-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >Back</button>
    </div>
  );
}
