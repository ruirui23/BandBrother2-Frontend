import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
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

const PlayerField = ({ notes, time, offset, yPositions, isTop }) => {
  const screenHeight = window.innerHeight;
  const fieldCenterY = isTop ? screenHeight / 4 : screenHeight * 3 / 4;

  const visibleNotes = notes.filter(
    n => !n.hit && !n.missed && Math.abs(n.time - time - offset) < WINDOW_SEC
  );

  return (
    <div className={`absolute w-full ${isTop ? 'top-0' : 'top-1/2'} h-1/2 border-b-2 border-yellow-400 box-border`}>
       {yPositions.map((y, index) => (
         <div key={index} style={{ top: `calc(50% + ${y}px)`}} className="absolute left-0 right-0 transform -translate-y-1/2">
            <HitLine lane={index} />
         </div>
      ))}
      {visibleNotes.map((n) => {
        const yPos = fieldCenterY + yPositions[n.lane];
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
  )
};

export default function TwoPlayerPlayCustom() {
  const { c1, c2 } = useParams();
  const nav = useNavigate();

  const p1NotesRef = useRef([]);
  const p2NotesRef = useRef([]);
  
  const p1ScoreRef = useRef({ perfect: 0, good: 0, miss: 0, score: 0 });
  const p2ScoreRef = useRef({ perfect: 0, good: 0, miss: 0, score: 0 });
  const p1OffsetRef = useRef(0);
  const p2OffsetRef = useRef(0);
  
  const [forceRender, setForceRender] = useState(0);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [time, setTime] = useState(0);
  const soundRef = useRef(null);
  const resultTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        const snap1 = await getDoc(doc(db, 'charts', c1));
        const snap2 = await getDoc(doc(db, 'charts', c2));
        if (!snap1.exists() || !snap2.exists()) throw new Error('Cannot find chart(s).');

        const chart1Data = snap1.data();
        const chart2Data = snap2.data();

        p1OffsetRef.current = chart1Data.offset ?? 0;
        p2OffsetRef.current = chart2Data.offset ?? 0;

        p1NotesRef.current = (chart1Data.notes ?? [])
          .map(n => ({...n, id: `p1-${n.time}-${n.lane}`, hit: false, missed: false }));
        p2NotesRef.current = (chart2Data.notes ?? [])
          .map(n => ({...n, id: `p2-${n.time}-${n.lane}`, hit: false, missed: false }));
        
        const audioUrl = chart1Data.audio?.trim() || '/audio/Henceforth.mp3';
        soundRef.current = new Howl({
          src: [audioUrl], html5: true,
          onload: () => setLoading(false),
          onerror: () => setError("Failed to load audio."),
          onend: () => {
            if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
            nav('/result', { state: { 
                counts1: p1ScoreRef.current, score1: p1ScoreRef.current.score,
                counts2: p2ScoreRef.current, score2: p2ScoreRef.current.score,
            }});
          }
        });
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    };
    p1ScoreRef.current = { perfect: 0, good: 0, miss: 0, score: 0 };
    p2ScoreRef.current = { perfect: 0, good: 0, miss: 0, score: 0 };
    fetchCharts();
    return () => {
        soundRef.current?.unload();
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    }
  }, [c1, c2, nav]);

  useEffect(() => {
    if (started) {
      resultTimeoutRef.current = setTimeout(() => {
        soundRef.current?.stop();
        nav('/result', { state: { 
            counts1: p1ScoreRef.current, score1: p1ScoreRef.current.score,
            counts2: p2ScoreRef.current, score2: p2ScoreRef.current.score,
        }});
      }, 15000);
    }
    return () => {
        if(resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    }
  }, [started, nav]);

  const handleMisses = useCallback(() => {
    const currentTime = soundRef.current?.seek() ?? 0;
    let missed = false;

    const p1Offset = p1OffsetRef.current;
    p1NotesRef.current.forEach(n => {
        if (!n.hit && !n.missed && currentTime - (n.time - p1Offset) > 0.2) {
            n.missed = true; 
            p1ScoreRef.current.miss++;
            p1ScoreRef.current.score -= 2;
            missed = true;
        }
    });

    const p2Offset = p2OffsetRef.current;
    p2NotesRef.current.forEach(n => {
        if (!n.hit && !n.missed && currentTime - (n.time - p2Offset) > 0.2) {
            n.missed = true; 
            p2ScoreRef.current.miss++;
            p2ScoreRef.current.score -= 2;
            missed = true;
        }
    });

    if (missed) setForceRender(r => r + 1);
  }, []);
  
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
    
    const offset = isP1Key ? p1OffsetRef.current : p2OffsetRef.current;
    const targetLane = isP1Key ? P1_KEY_TO_LANE[e.code] : P2_KEY_TO_LANE[e.code];
    const targetNotes = isP1Key ? p1NotesRef.current : p2NotesRef.current;
    const targetScoreRef = isP1Key ? p1ScoreRef : p2ScoreRef;

    let bestMatchIndex = -1;
    let minDistance = Infinity;

    targetNotes.forEach((n, index) => {
        if (n.lane !== targetLane || n.hit || n.missed) return;
        const distance = Math.abs(HIT_X - (HIT_X + (n.time - currentTime - offset) * NOTE_SPEED));
        if (distance < JUDGE.good && distance < minDistance) {
            minDistance = distance;
            bestMatchIndex = index;
        }
    });

    if (bestMatchIndex === -1) return;

    const note = targetNotes[bestMatchIndex];
    if (minDistance < JUDGE.perfect) {
      targetScoreRef.current.perfect++;
      targetScoreRef.current.score += 5;
    } else {
      targetScoreRef.current.good++;
      targetScoreRef.current.score += 2;
    }
    note.hit = true;
    setForceRender(r => r + 1);
  }, [started]);

   useEffect(() => {
    if(loading) return;
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
  }, [onKey, loading]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Loading Charts...</div>;
  if (error) return <div className="flex items-center justify-center h-screen bg-black text-red-500 text-2xl">{error}</div>;
  if (!started) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Press Any Key To Start</div>;

  return (
    <div className="relative h-screen overflow-hidden bg-black text-white">
      <PlayerField notes={p1NotesRef.current} time={time} offset={p1OffsetRef.current} yPositions={P1_LANE_Y_POS} isTop />
      <PlayerField notes={p2NotesRef.current} time={time} offset={p2OffsetRef.current} yPositions={P2_LANE_Y_POS} isTop={false} />
      
      <div className="absolute left-4 top-4 text-xl">1P: {p1ScoreRef.current.score}</div>
      <div className="absolute left-4 bottom-4 text-xl">2P: {p2ScoreRef.current.score}</div>
       <button
        className="absolute right-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >Back</button>
    </div>
  );
}
