import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Howl } from 'howler';
import song from '../data/tutorial.json';
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants';
import Note from '../components/Note';
import HitLine from '../components/HitLine';

const JUDGE = { perfect: 24, good: 48 };

export default function TwoPlayerPlay() {
  const { p1 = 'Easy', p2 = 'Easy' } = useParams();
  const nav = useNavigate();
  const offset = song.offset ?? 0;
  const notes1 = song.difficulty[p1]?.notes?.map(n => ({ ...n, hit: false })) || [];
  const notes2 = song.difficulty[p2]?.notes?.map(n => ({ ...n, hit: false })) || [];
  const [state1, setState1] = useState(notes1);
  const [state2, setState2] = useState(notes2);
  const [started, setStarted] = useState(false);
  const [sound] = useState(() => new Howl({ src: [song.audio], html5: true }));
  const [time, setTime] = useState(0);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  // missカウント用
  const [counts1, setCounts1] = useState({ perfect: 0, good: 0, miss: 0 });
  const [counts2, setCounts2] = useState({ perfect: 0, good: 0, miss: 0 });

  useEffect(() => {
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

  useEffect(() => {
    let id;
    if (started) {
      const loop = () => {
        setTime(sound.seek() || 0);
        id = requestAnimationFrame(loop);
      };
      id = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(id);
  }, [started, sound]);

  // 15秒で終了
  useEffect(() => {
    if (started && time >= 15) {
      sound.stop();
      nav('/result', { state: { counts1, score1, counts2, score2 } });
    }
  }, [time, started, nav, score1, score2, counts1, counts2, sound]);

  // ノーツ通過でmiss
  useEffect(() => {
    if (!started) return;
    setCounts1(counts => {
      let add = 0;
      state1.forEach(n => {
        if (!n.hit && time - n.time > 0.2 && !n.missed) {
          n.missed = true;
          add++;
        }
      });
      if (add > 0) setScore1(s => s - 2 * add);
      return add > 0 ? { ...counts, miss: counts.miss + add } : counts;
    });
    setCounts2(counts => {
      let add = 0;
      state2.forEach(n => {
        if (!n.hit && time - n.time > 0.2 && !n.missed) {
          n.missed = true;
          add++;
        }
      });
      if (add > 0) setScore2(s => s - 2 * add);
      return add > 0 ? { ...counts, miss: counts.miss + add } : counts;
    });
  }, [time, started, state1, state2]);

  // 判定
  const onKey = useCallback(
    (e) => {
      if (!started) return;
      if (e.code === 'KeyF') {
        const idx = state1.findIndex(n => {
          if (n.hit) return false;
          const x = HIT_X + (n.time - time - offset) * NOTE_SPEED;
          return Math.abs(x - HIT_X) < JUDGE.good;
        });
        if (idx === -1) {
          setCounts1(c => ({ ...c, miss: c.miss + 1 }));
          setScore1(s => s - 2);
          return;
        }
        const x = HIT_X + (state1[idx].time - time - offset) * NOTE_SPEED;
        if (Math.abs(x - HIT_X) < JUDGE.perfect) {
          setCounts1(c => ({ ...c, perfect: c.perfect + 1 }));
          setScore1(s => s + 5);
        } else {
          setCounts1(c => ({ ...c, good: c.good + 1 }));
          setScore1(s => s + 2);
        }
        setState1(arr => arr.map((n, i) => i === idx ? { ...n, hit: true } : n));
      }
      if (e.code === 'KeyJ') {
        const idx = state2.findIndex(n => {
          if (n.hit) return false;
          const x = HIT_X + (n.time - time - offset) * NOTE_SPEED;
          return Math.abs(x - HIT_X) < JUDGE.good;
        });
        if (idx === -1) {
          setCounts2(c => ({ ...c, miss: c.miss + 1 }));
          setScore2(s => s - 2);
          return;
        }
        const x = HIT_X + (state2[idx].time - time - offset) * NOTE_SPEED;
        if (Math.abs(x - HIT_X) < JUDGE.perfect) {
          setCounts2(c => ({ ...c, perfect: c.perfect + 1 }));
          setScore2(s => s + 5);
        } else {
          setCounts2(c => ({ ...c, good: c.good + 1 }));
          setScore2(s => s + 2);
        }
        setState2(arr => arr.map((n, i) => i === idx ? { ...n, hit: true } : n));
      }
    },
    [started, state1, state2, time, offset]
  );
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  // 描画対象ノーツ
  const visible1 = state1.filter(n => !n.hit && n.time - time < WINDOW_SEC && (HIT_X + (n.time - time - offset) * NOTE_SPEED) > -100 && (HIT_X + (n.time - time - offset) * NOTE_SPEED) < window.innerWidth + 100);
  const visible2 = state2.filter(n => !n.hit && n.time - time < WINDOW_SEC && (HIT_X + (n.time - time - offset) * NOTE_SPEED) > -100 && (HIT_X + (n.time - time - offset) * NOTE_SPEED) < window.innerWidth + 100);

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* 1Pノーツ（上段） */}
      {visible1.map((n) => (
        <Note key={n.time} x={HIT_X + (n.time - time - offset) * NOTE_SPEED} />
      ))}
      {/* 2Pノーツ（下段、y座標をずらす） */}
      {visible2.map((n) => (
        <Note key={n.time} x={HIT_X + (n.time - time - offset) * NOTE_SPEED} yOffset={80} />
      ))}
      {/* 判定枠 */}
      <HitLine />
      <HitLine yOffset={80} />
      {/* スコア表示 */}
      <div className="absolute left-4 top-4 text-white">1P: {score1}</div>
      <div className="absolute left-4 bottom-4 text-white">2P: {score2}</div>
    </div>
  );
}
