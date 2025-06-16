import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Howl } from 'howler';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import Note from '../components/Note';
import HitLine from '../components/HitLine';
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants';

const JUDGE = { perfect: 24, good: 48 };

export default function TwoPlayerPlayCustom() {
  const { c1, c2 } = useParams();
  const nav = useNavigate();
  const [chart1, setChart1] = useState(null);
  const [chart2, setChart2] = useState(null);
  const [notes1, setNotes1] = useState([]);
  const [notes2, setNotes2] = useState([]);
  const [started, setStarted] = useState(false);
  const [sound, setSound] = useState(null);
  const [time, setTime] = useState(0);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [counts1, setCounts1] = useState({ perfect: 0, good: 0, miss: 0 });
  const [counts2, setCounts2] = useState({ perfect: 0, good: 0, miss: 0 });

  useEffect(() => {
    const fetchCharts = async () => {
      let chart1Data = null, chart2Data = null;
      try {
        const snap1 = await getDoc(doc(db, 'charts', c1));
        const snap2 = await getDoc(doc(db, 'charts', c2));
        if (snap1.exists()) chart1Data = snap1.data();
        if (snap2.exists()) chart2Data = snap2.data();
      } catch (e) {
        console.error('譜面データの取得に失敗しました', e);
      }
      setChart1(chart1Data);
      setChart2(chart2Data);
      setNotes1((chart1Data?.notes || []).map(n => ({ ...n, hit: false, missed: false })));
      setNotes2((chart2Data?.notes || []).map(n => ({ ...n, hit: false, missed: false })));
      const audioUrl = (chart1Data && chart1Data.audio && chart1Data.audio.trim() !== '') ? chart1Data.audio : '/audio/Henceforth.mp3';
      setSound(new Howl({ src: [audioUrl], html5: true }));
    };
    fetchCharts();
  }, [c1, c2]);

  // 音源がある場合はHowl、ない場合はrequestAnimationFrameで進行
  useEffect(() => {
    if (sound === undefined) return;
    let rafId;
    let start = null;
    let running = false;
    const onFirstKey = () => {
      if (!started) {
        setStarted(true);
        if (sound) {
          sound.seek(0);
          sound.play();
        } else {
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
    let id;
    if (started && sound) {
      const loop = () => {
        setTime(sound.seek() || 0);
        id = requestAnimationFrame(loop);
      };
      id = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(id);
  }, [started, sound]);

  useEffect(() => {
    if (started && time >= 15 && sound) {
      sound.stop();
      nav('/result', { state: { counts1, score1, counts2, score2 } });
    }
  }, [time, started, sound, nav, counts1, score1, counts2, score2]);

  useEffect(() => {
    if (!started) return;
    setNotes1(arr => arr.map(n => {
      if (!n.hit && time - n.time > 0.2 && !n.missed) {
        setCounts1(c => ({ ...c, miss: c.miss + 1 }));
        setScore1(s => s - 2);
        return { ...n, missed: true };
      }
      return n;
    }));
    setNotes2(arr => arr.map(n => {
      if (!n.hit && time - n.time > 0.2 && !n.missed) {
        setCounts2(c => ({ ...c, miss: c.miss + 1 }));
        setScore2(s => s - 2);
        return { ...n, missed: true };
      }
      return n;
    }));
  }, [time, started]);

  useEffect(() => {
    const onKey = (e) => {
      if (!started) return;
      if (e.code === 'KeyF') {
        const idx = notes1.findIndex(n => {
          if (n.hit) return false;
          const x = HIT_X + NOTE_SPEED * (n.time - time);
          return Math.abs(x - HIT_X) < JUDGE.good;
        });
        if (idx === -1) {
          setCounts1(c => ({ ...c, miss: c.miss + 1 }));
          setScore1(s => s - 2);
          return;
        }
        const x = HIT_X + NOTE_SPEED * (notes1[idx].time - time);
        if (Math.abs(x - HIT_X) < JUDGE.perfect) {
          setCounts1(c => ({ ...c, perfect: c.perfect + 1 }));
          setScore1(s => s + 5);
        } else {
          setCounts1(c => ({ ...c, good: c.good + 1 }));
          setScore1(s => s + 2);
        }
        setNotes1(arr => arr.map((n, i) => i === idx ? { ...n, hit: true } : n));
      }
      if (e.code === 'KeyJ') {
        const idx = notes2.findIndex(n => {
          if (n.hit) return false;
          const x = HIT_X + NOTE_SPEED * (n.time - time);
          return Math.abs(x - HIT_X) < JUDGE.good;
        });
        if (idx === -1) {
          setCounts2(c => ({ ...c, miss: c.miss + 1 }));
          setScore2(s => s - 2);
          return;
        }
        const x = HIT_X + NOTE_SPEED * (notes2[idx].time - time);
        if (Math.abs(x - HIT_X) < JUDGE.perfect) {
          setCounts2(c => ({ ...c, perfect: c.perfect + 1 }));
          setScore2(s => s + 5);
        } else {
          setCounts2(c => ({ ...c, good: c.good + 1 }));
          setScore2(s => s + 2);
        }
        setNotes2(arr => arr.map((n, i) => i === idx ? { ...n, hit: true } : n));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, notes1, notes2, time]);

  if (!chart1 || !chart2) return <div className="text-white">譜面データの取得に失敗しました</div>;

  // 1Pノーツ（中央）
  const visible1 = notes1.filter(
    n => !n.hit && n.time - time < WINDOW_SEC && (HIT_X + (n.time - time) * NOTE_SPEED) > -100 && (HIT_X + (n.time - time) * NOTE_SPEED) < window.innerWidth + 100
  );
  // 2Pノーツ（下段）
  const visible2 = notes2.filter(
    n => !n.hit && n.time - time < WINDOW_SEC && (HIT_X + (n.time - time) * NOTE_SPEED) > -100 && (HIT_X + (n.time - time) * NOTE_SPEED) < window.innerWidth + 100
  );

  return (
    <div className="relative h-screen overflow-hidden bg-black flex flex-col items-center justify-center">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >戻る</button>
      <div className="absolute left-4 top-16 text-white">1P: {score1}</div>
      <div className="absolute left-4 bottom-4 text-white">2P: {score2}</div>
      {/* ノーツ表示 */}
      {visible1.map((n) => (
        <Note key={n.time} x={HIT_X + (n.time - time) * NOTE_SPEED} yOffset={0} />
      ))}
      {visible2.map((n) => (
        <Note key={n.time} x={HIT_X + (n.time - time) * NOTE_SPEED} yOffset={80} />
      ))}
      {/* 判定枠 */}
      <HitLine />
      <HitLine yOffset={80} />
    </div>
  );
}
