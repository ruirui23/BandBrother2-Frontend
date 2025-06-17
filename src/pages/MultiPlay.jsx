import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Howl } from 'howler';
import song from '../data/tutorial.json';
import { useScore } from '../store';
import useGameLoop from '../hooks/useGameLoop';
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants';
import Note from '../components/Note';
import HitLine from '../components/HitLine';

const JUDGE = { perfect: 24, good: 48 };

export default function MultiPlay() {
  const { roomId, difficulty = 'Easy' } = useParams();
  const navigate = useNavigate();
  
  // 認証状態
  const [user, setUser] = useState(null);
  
  // WebSocket接続
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [opponentScore, setOpponentScore] = useState(0);
  const [gameState, setGameState] = useState('waiting'); // waiting, playing, finished
  
  // ゲーム関連
  const { add, reset, counts, score } = useScore();
  const diffObj = song.difficulty[difficulty] || song.difficulty.Easy;
  const rawNotes = diffObj.notes ?? [];
  const offset = song.offset ?? 0;
  
  const [notes, setNotes] = useState(rawNotes.map(n => ({ ...n, hit: false })));
  const [started, setStarted] = useState(false);
  const [sound] = useState(() => new Howl({ src: [song.audio], html5: true }));
  const [time, setTime] = useState(0);

  // Firebase認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // 未認証の場合はホームページにリダイレクト
        navigate('/');
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  // WebSocket接続
  useEffect(() => {
    if (!user) return; // ユーザー認証が完了するまで待機
    
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8080'}/ws`;
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket接続成功');
      setWsConnected(true);
      // 参加通知（Firebase UIDを使用）
      wsRef.current.send(JSON.stringify({
        type: 'join',
        roomId: roomId,
        difficulty: difficulty,
        playerId: user.uid // Firebase UIDを使用
      }));
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket受信:', data);
      
      switch (data.type) {
        case 'game_start':
          setGameState('playing');
          setStarted(true);
          sound.seek(0);
          sound.play();
          break;
        case 'score_broadcast':
          // 他のプレイヤーのスコアを更新
          if (data.scores && user) {
            Object.keys(data.scores).forEach(playerId => {
              if (playerId !== user.uid) {
                setOpponentScore(data.scores[playerId]);
              }
            });
          }
          break;
        case 'game_result':
          setGameState('finished');
          sound.stop();
          // リザルト画面に遷移
          navigate('/result', { 
            state: { 
              counts, 
              score, 
              opponentScore: data.scores ? Object.values(data.scores).find((_, i) => Object.keys(data.scores)[i] !== user.uid) : 0,
              isMultiPlayer: true,
              winner: data.winner,
              tie: data.tie
            } 
          });
          break;
      }
    };
    
    wsRef.current.onclose = () => {
      console.log('WebSocket接続終了');
      setWsConnected(false);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket エラー:', error);
    };
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, difficulty, user]);

  // ゲーム初期化
  useEffect(() => {
    reset();
  }, []);

  // ゲームループ
  useGameLoop(() => {
    if (started && gameState === 'playing') {
      setTime(sound.seek() || 0);
    }
  });

  // 15秒でゲーム終了
  useEffect(() => {
    if (started && time >= 15 && gameState === 'playing') {
      setGameState('finished');
      sound.stop();
      // WebSocketで終了通知
      if (wsRef.current && wsConnected && user) {
        wsRef.current.send(JSON.stringify({
          type: 'game_end',
          roomId: roomId,
          finalScore: score,
          playerId: user.uid
        }));
      }
    }
  }, [time, started, gameState]);

  // スコア更新時に相手に送信
  useEffect(() => {
    if (wsRef.current && wsConnected && gameState === 'playing' && user) {
      wsRef.current.send(JSON.stringify({
        type: 'score_update',
        roomId: roomId,
        score: score,
        playerId: user.uid
      }));
    }
  }, [score, wsConnected, gameState, user]);

  // キー入力判定
  const onKey = useCallback((e) => {
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
  }, [notes, time, started, gameState]);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

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
  const visible = notes.filter(
    n => !n.hit && n.time - time < WINDOW_SEC && 
         (HIT_X + (n.time - time - offset) * NOTE_SPEED) > -100 && 
         (HIT_X + (n.time - time - offset) * NOTE_SPEED) < window.innerWidth + 100
  );

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* 接続状態表示 */}
      <div className="absolute top-4 left-4 text-white z-10">
        <div>WebSocket: {wsConnected ? '接続中' : '切断'}</div>
        <div>ルーム: {roomId}</div>
        <div>難易度: {difficulty}</div>
        <div>状態: {gameState}</div>
      </div>
      
      {/* スコア表示 */}
      <div className="absolute top-4 right-4 text-white z-10">
        <div>自分: {score}</div>
        <div>相手: {opponentScore}</div>
      </div>

      {/* 待機画面 */}
      {gameState === 'waiting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white z-20">
          <div className="text-center">
            <h2 className="text-3xl mb-4">対戦相手を待っています...</h2>
            <p>相手が準備できたらゲーム開始します</p>
          </div>
        </div>
      )}

      {/* ゲーム画面 */}
      {gameState === 'playing' && (
        <>
          {visible.map((n) => (
            <Note
              key={n.time}
              x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
            />
          ))}
          <HitLine />
        </>
      )}
    </div>
  );
}
