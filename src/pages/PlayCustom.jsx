import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
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
  const [chart, setChart] = useState(null);
  const [notes, setNotes] = useState([]);
  const [started, setStarted] = useState(false);
  const [sound, setSound] = useState(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const fetchChart = async () => {
      if (!chartId) return;
      const docRef = doc(db, 'charts', chartId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const chartData = snap.data();
        setChart(chartData);
        setNotes(Array.isArray(chartData.notes) ? chartData.notes.map(n => ({ ...n, hit: false })) : []);
        const audioUrl = chartData.audio && chartData.audio.trim() !== '' ? chartData.audio : '/audio/Henceforth.mp3';
        setSound(new Howl({ src: [audioUrl], html5: true }));
      } else {
        console.error('譜面データが存在しません');
        setChart({ notes: [] });
        setNotes([]);
      }
    };
    fetchChart();
    reset();
  }, [chartId, reset]);

  // 音源がある場合はHowl、ない場合はrequestAnimationFrameで進行
  useEffect(() => {
    if (sound === undefined) return;
    if (sound) return; // 音源がある場合はuseGameLoopで管理するのでここで何もしない
    let rafId;
    let start = null;
    let running = false;
    const onFirstKey = () => {
      if (!started) {
        setStarted(true);
        running = true;
        start = performance.now();
        const loop = (now) => {
          if (!running) return;
          setTime((now - start) / 1000);
          if ((now - start) / 1000 < 15) {
            rafId = requestAnimationFrame(loop);
          } else {
            setTime(15);
          }
        };
        rafId = requestAnimationFrame(loop);
      }
    };
    window.addEventListener('keydown', onFirstKey, { once: true });
    return () => {
      window.removeEventListener('keydown', onFirstKey);
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [sound, started]);

  useEffect(() => {
    if (!sound) return;
    const onFirstKey = () => {
      if (!started) {
        setStarted(true);
        sound.seek(0);
        sound.play();
      }
    };
    window.addEventListener('keydown', onFirstKey, { once: true });
    return () => window.removeEventListener('keydown', onFirstKey);
  }, [sound, started]);

  useGameLoop(() => {
    if (started && sound) setTime(sound.seek() || 0);
  });

  useEffect(() => {
    if (started && time >= 15 && sound) {
      sound.stop();
      nav('/result', { state: { counts, score } });
    }
  }, [time, started, sound, nav, counts, score]);

  const onKey = useCallback(
    (e) => {
      if (!started) return;
      if (e.code !== 'Space') return;
      const idx = notes.findIndex(
        n => {
          if (n.hit) return false;
          const x = HIT_X + (n.time - time) * NOTE_SPEED;
          return Math.abs(x - HIT_X) < JUDGE.good;
        }
      );
      if (idx === -1) { add('miss'); return; }
      const x = HIT_X + (notes[idx].time - time) * NOTE_SPEED;
      if (Math.abs(x - HIT_X) < JUDGE.perfect) {
        add('perfect');
      } else {
        add('good');
      }
      setNotes(notes => notes.map((n, i) => i === idx ? { ...n, hit: true } : n));
    },
    [notes, time, started, add]
  );
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  useEffect(() => {
    if (!started) return;
    setNotes(notes => notes.map(n => {
      if (!n.hit && time - n.time > 0.2 && !n.missed) {
        n.missed = true;
        add('miss');
      }
      return n;
    }));
  }, [time, started, add]);

  if (!chart || !Array.isArray(chart.notes)) return <div className="text-white">Loading...</div>;

  // ノーツを右→左に流す（HIT_Xを基準に）
  const visible = notes.filter(
    n => !n.hit && n.time - time < WINDOW_SEC && (HIT_X + (n.time - time) * NOTE_SPEED) > -100 && (HIT_X + (n.time - time) * NOTE_SPEED) < window.innerWidth + 100
  );

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {visible.map((n) => (
        <Note
          key={n.time}
          x={HIT_X + (n.time - time) * NOTE_SPEED}
          yOffset={0}
        />
      ))}
      <HitLine />
    </div>
  );
}
