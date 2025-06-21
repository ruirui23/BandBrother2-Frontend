import { useState, useEffect, useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { useScore } from '../store';
import useGameLoop from './useGameLoop';
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants';

const JUDGE = { perfect: 24, good: 48 };

export default function useRhythmGame(songData, difficulty, onGameEnd) {
  const { add, reset, counts, score } = useScore();
  
  const diffObj = songData.difficulty[difficulty] || songData.difficulty.Easy;
  const rawNotes = diffObj.notes ?? [];
  const offset = songData.offset ?? 0;
  
  const [notes, setNotes] = useState(rawNotes.map(n => ({ ...n, hit: false })));
  const [started, setStarted] = useState(false);
  const [sound] = useState(() => new Howl({ src: [songData.audio], html5: true }));
  const [time, setTime] = useState(0);
  const [gameState, setGameState] = useState('waiting');
  
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // ゲーム初期化
  useEffect(() => {
    reset();
  }, []);

  // ゲームループ
  useGameLoop(() => {
    if (started && gameStateRef.current === 'playing') {
      setTime(sound.seek() || 0);
    }
  });

  // ゲーム開始
  const startGame = useCallback(() => {
    if (!started) {
      setStarted(true);
      setGameState('playing');
      sound.seek(0);
      sound.play();
    }
  }, [started, sound]);

  // 15秒でゲーム終了
  useEffect(() => {
    if (started && time >= 15 && gameState === 'playing') {
      setGameState('finished');
      sound.stop();
      if (onGameEnd) {
        onGameEnd({ counts, score, time });
      }
    }
  }, [time, started, gameState, counts, score, onGameEnd]);

  // キー入力判定
  const handleKeyPress = useCallback((e) => {
    if (gameState !== 'playing' || !started) return;
    if (e.code !== 'Space') return;
    
    const idx = notes.findIndex(n => {
      if (n.hit) return false;
      const x = HIT_X + (n.time - time - offset) * NOTE_SPEED;
      return Math.abs(x - HIT_X) < JUDGE.good;
    });
    
    if (idx === -1) { 
      add('miss'); 
      return; 
    }
    
    const x = HIT_X + (notes[idx].time - time - offset) * NOTE_SPEED;
    if (Math.abs(x - HIT_X) < JUDGE.perfect) {
      add('perfect');
    } else {
      add('good');
    }
    
    setNotes(notes => notes.map((n, i) => i === idx ? { ...n, hit: true } : n));
  }, [notes, time, started, gameState, add, offset]);

  // キーイベントリスナー
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // ノーツ通過でmiss
  useEffect(() => {
    if (gameState !== 'playing' || !started) return;
    notes.forEach((n, i) => {
      if (!n.hit && time - n.time > 0.2 && !n.missed) {
        n.missed = true;
        add('miss');
      }
    });
  }, [time, started, notes, add, gameState]);

  // 描画対象ノーツ
  const visibleNotes = notes.filter(
    n => !n.hit && n.time - time < WINDOW_SEC && 
         (HIT_X + (n.time - time - offset) * NOTE_SPEED) > -100 && 
         (HIT_X + (n.time - time - offset) * NOTE_SPEED) < window.innerWidth + 100
  );

  return {
    notes: visibleNotes,
    time,
    offset,
    started,
    gameState,
    score,
    counts,
    sound,
    startGame,
    setGameState
  };
}