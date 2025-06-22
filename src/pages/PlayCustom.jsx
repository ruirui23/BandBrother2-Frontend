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

export default function PlayCustom() {
  const { chartId } = useParams();
  const nav = useNavigate();
  const { add, reset, counts, score } = useScore();

  const notesRef = useRef([]);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const soundRef = useRef(null);
  const scoreRef = useRef({ counts, score });
  const chartDataRef = useRef(null);

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
        chartDataRef.current = chartData;

        notesRef.current = (chartData.notes ?? [])
          .sort((a, b) => a.time - b.time)
          .map(n => ({ ...n, id: `${n.time}-${n.lane}`, hit: false, missed: false }));
        
        const audioUrl = chartData.audio?.trim() || '/audio/Henceforth.mp3';
        soundRef.current = new Howl({
            src: [audioUrl],
            html5: true,
            onload: () => setLoading(false),
            onerror: () => setError('音声の読み込みに失敗しました。'),
            onend: () => {
                setTimeout(() => nav('/result', { state: scoreRef.current }), 500);
            }
        });

        // 音声の長さを検出して、その長さまでノーツを自動生成
        soundRef.current.once('load', () => {
          const audioDuration = soundRef.current.duration();
          if (audioDuration && audioDuration > 0) {
            const chartDuration = chartData.duration || 15;
            const maxTime = Math.max(audioDuration, chartDuration);
            
            // 既存のノーツの最大時間を取得
            const existingMaxTime = notesRef.current.length > 0 
              ? Math.max(...notesRef.current.map(n => n.time))
              : 0;
            
            // 音声の長さまでノーツが不足している場合、自動生成
            if (existingMaxTime < maxTime) {
              const additionalNotes = [];
              const bpm = chartData.bpm || 120;
              const beatInterval = 60 / bpm; // 1拍の間隔（秒）
              
              // 既存のノーツのパターンを分析して、そのパターンを繰り返す
              const patternNotes = notesRef.current.slice(0, 4); // 最初の4つのノーツをパターンとして使用
              
              if (patternNotes.length > 0) {
                let currentTime = existingMaxTime + beatInterval;
                while (currentTime <= maxTime) {
                  patternNotes.forEach((patternNote, index) => {
                    const newTime = currentTime + (index * beatInterval / 4);
                    if (newTime <= maxTime) {
                      additionalNotes.push({
                        time: newTime,
                        lane: patternNote.lane,
                        id: `auto-${newTime}-${patternNote.lane}`,
                        hit: false,
                        missed: false
                      });
                    }
                  });
                  currentTime += beatInterval;
                }
              } else {
                // パターンがない場合は、シンプルなパターンを生成
                let currentTime = 1;
                while (currentTime <= maxTime) {
                  for (let lane = 0; lane < 4; lane++) {
                    additionalNotes.push({
                      time: currentTime + (lane * 0.25),
                      lane: lane,
                      id: `auto-${currentTime + (lane * 0.25)}-${lane}`,
                      hit: false,
                      missed: false
                    });
                  }
                  currentTime += 1;
                }
              }
              
              // 自動生成したノーツを追加
              notesRef.current = [...notesRef.current, ...additionalNotes]
                .sort((a, b) => a.time - b.time);
              
              console.log(`音声の長さ: ${audioDuration}秒, 自動生成したノーツ: ${additionalNotes.length}個`);
            }
          }
        });

      } catch (e) {
        setError('譜面データの取得に失敗しました。');
        setLoading(false);
      }
    };
    reset();
    fetchChart();
    return () => {
        soundRef.current?.unload();
    };
  }, [chartId, reset, nav]);

  useEffect(() => {
    if (loading || !soundRef.current) return;
    const onFirstKey = () => {
      if (!soundRef.current.playing()) {
         soundRef.current.play();
         setStarted(true);
      }
    };
    window.addEventListener('keydown', onFirstKey, { once: true });
    return () => window.removeEventListener('keydown', onFirstKey);
  }, [loading]);

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
    if (!started || !VALID_KEYS.includes(e.code)) return;
    
    const lane = KEY_TO_LANE[e.code];
    const currentTime = soundRef.current?.seek() || 0;

    let bestMatchIndex = -1;
    let minDistance = Infinity;

    notesRef.current.forEach((n, index) => {
        if (n.lane !== lane || n.hit || n.missed) return;
        const distance = Math.abs(HIT_X - (HIT_X + (n.time - currentTime) * NOTE_SPEED));
        if (distance < JUDGE.good && distance < minDistance) {
            minDistance = distance;
            bestMatchIndex = index;
        }
    });

    if (bestMatchIndex === -1) return;

    const note = notesRef.current[bestMatchIndex];
    if (minDistance < JUDGE.perfect) add('perfect');
    else add('good');
    
    note.hit = true;
    setTime(currentTime);
  }, [started, add]);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  const visibleNotes = notesRef.current.filter(
    n => !n.hit && !n.missed && Math.abs(n.time - time) < WINDOW_SEC
  );
  const screenCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  
  if (loading) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Loading Chart...</div>;
  if (error) return <div className="flex items-center justify-center h-screen bg-black text-red-500 text-2xl">{error}</div>;
  if (!started) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Press D, F, J, or K to start</div>;

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >Back</button>

      {LANE_Y_POSITIONS.map((y, index) => (
         <div key={index} style={{ top: `calc(50% + ${y}px)`}} className="absolute left-0 right-0 transform -translate-y-1/2">
            <HitLine lane={index} />
         </div>
      ))}

      {visibleNotes.map((n) => {
        const yPos = screenCenterY + LANE_Y_POSITIONS[n.lane];
        return (
          <Note
            key={n.id}
            x={HIT_X + (n.time - time) * NOTE_SPEED}
            y={yPos}
            lane={n.lane}
          />
        )
      })}
    </div>
  );
}
