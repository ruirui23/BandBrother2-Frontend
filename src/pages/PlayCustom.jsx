import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useScore } from '../store';
import useGameLoop from '../hooks/useGameLoop';
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants';
import Note from '../components/Note';
import HitLine from '../components/HitLine';

const JUDGE = { perfect: 24, good: 48 };

export default function PlayCustom() {
  const { chartId } = useParams();
  const nav = useNavigate();
  const { add, reset, counts, score } = useScore();

  const notesRef = useRef([]);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSoundLoaded, setIsSoundLoaded] = useState(false);

  const soundRef = useRef(null);
  const scoreRef = useRef({ counts, score });
  
  useEffect(() => {
    return useScore.subscribe(
      (state) => (scoreRef.current = { counts: state.counts, score: state.score })
    );
  }, []);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        if (!chartId) throw new Error("Chart ID is missing.");
        const docRef = doc(db, 'charts', chartId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) throw new Error("Chart data does not exist.");
        
        const chartData = snap.data();
        const sortedNotes = (Array.isArray(chartData.notes) ? chartData.notes : [])
          .sort((a, b) => a.time - b.time)
          .map(n => ({ ...n, hit: false, missed: false }));
        notesRef.current = sortedNotes;
        
        const audioUrl = chartData.audio && chartData.audio.trim() !== '' ? chartData.audio : '/audio/Henceforth.mp3';
        soundRef.current = new Howl({
            src: [audioUrl],
            html5: true,
            onload: () => setIsSoundLoaded(true),
        });
      } catch (e) {
        console.error('Failed to fetch chart data:', e);
        setError('譜面データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchChart();
    reset();

    return () => {
        soundRef.current?.stop();
        soundRef.current?.unload();
    };
  }, [chartId]);

  useEffect(() => {
    if (loading || !isSoundLoaded || !soundRef.current) return;
    
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
  }, [loading, isSoundLoaded]);

  useGameLoop(() => {
    if (!started || !soundRef.current) return;

    const newTime = soundRef.current.seek();
    if (typeof newTime !== 'number') return;
    
    setTime(newTime);
    
    let misses = 0;
    for (const n of notesRef.current) {
        if (!n.hit && !n.missed && newTime - n.time > 0.2) {
            n.missed = true;
            misses++;
        }
    }
    if (misses > 0) {
        for(let i=0; i<misses; i++) add('miss');
    }
  });

  const onKey = useCallback((e) => {
      if (!started || e.code !== 'Space') return;

      const currentTime = soundRef.current?.seek() || 0;
      const targetNoteIndex = notesRef.current.findIndex(n => {
        if (n.hit || n.missed) return false;
        const x = HIT_X + (n.time - currentTime) * NOTE_SPEED;
        return Math.abs(x - HIT_X) < JUDGE.good;
      });

      if (targetNoteIndex === -1) { 
        add('miss'); 
        return; 
      }
      
      const note = notesRef.current[targetNoteIndex];
      const x = HIT_X + (note.time - currentTime) * NOTE_SPEED;

      if (Math.abs(x - HIT_X) < JUDGE.perfect) {
        add('perfect');
      } else {
        add('good');
      }
      note.hit = true;
      setTime(currentTime);

    }, [started, add]);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  useEffect(() => {
    if (started && time >= 15) {
      soundRef.current?.stop();
      nav('/result', { state: scoreRef.current });
    }
  }, [time, started, nav]);

  if (loading || !isSoundLoaded) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">譜面と音源を読み込んでいます...</div>;
  if (error) return <div className="text-white">{error}</div>;
  if (!started) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Press any key to start</div>;

  const visible = notesRef.current.filter(n => !n.hit && !n.missed && n.time - time < WINDOW_SEC);

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {visible.map((n) => (
        <Note key={`${n.time}-${n.lane}`} x={HIT_X + (n.time - time) * NOTE_SPEED} yOffset={0} />
      ))}
      <HitLine />
    </div>
  );
}
