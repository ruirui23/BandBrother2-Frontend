// src/pages/Play.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
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

  /* hit フラグ付きノーツ */
  const [notes, setNotes] = useState(rawNotes.map(n => ({ ...n, hit: false })));
  const [started, setStarted] = useState(false);
  const [sound] = useState(() => new Howl({ src: [song.audio], html5: true }));
  const [time, setTime] = useState(0);

  /* ---------- 初回再生 & クリーンアップ ---------- */
  useEffect(() => {
    reset();

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

  /* ---------- 毎フレーム時間更新 ---------- */
  useGameLoop(() => {
    if (started) setTime(sound.seek() || 0);
  });

  // 15秒で音楽停止＆リザルト遷移
  useEffect(() => {
    if (started && time >= 15) {
      sound.stop();
      nav('/result', { state: { counts, score } });
    }
  }, [time, started]);

  // キー入力判定
  const onKey = useCallback(
    (e) => {
      if (!started) return;
      if (e.code !== 'Space') return;
      const idx = notes.findIndex(
        n => {
          if (n.hit) return false;
          const x = HIT_X + (n.time - time - offset) * NOTE_SPEED;
          return Math.abs(x - HIT_X) < JUDGE.good;
        }
      );
      if (idx === -1) { add('miss'); return; } // missに変更
      const x = HIT_X + (notes[idx].time - time - offset) * NOTE_SPEED;
      if (Math.abs(x - HIT_X) < JUDGE.perfect) {
        add('perfect'); // 5点
      } else {
        add('good');    // 1点
      }
      setNotes(notes => notes.map((n, i) => i === idx ? { ...n, hit: true } : n));
    },
    [notes, time, started]
  );
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  // ノーツ通過でmiss
  useEffect(() => {
    if (!started) return;
    notes.forEach((n, i) => {
      if (!n.hit && time - n.time > 0.2 && !n.missed) {
        n.missed = true;
        add('miss');
      }
    });
  }, [time, started, notes, add]);

  /* ---------- 描画対象ノーツ ---------- */
  // ノーツを右端から左端へ流す
  const screenW = window.innerWidth;
  const visible = notes.filter(
    n => !n.hit && n.time - time < WINDOW_SEC && n.time - time > -1.5
  );

  /* ---------- 描画 ---------- */
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
