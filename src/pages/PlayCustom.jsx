import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { Howl } from "howler";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useScore } from "../store";
import useGameLoop from "../hooks/useGameLoop";
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from "../constants";
import Note from "../components/Note";
import HitLine from "../components/HitLine";

const JUDGE = { perfect: 24, good: 48 };

// レーンのY座標を定義
const LANE_Y_POSITIONS = [-96, -32, 32, 96];

// キーとレーンのマッピング
const KEY_TO_LANE = {
  KeyD: 0,
  KeyF: 1,
  KeyJ: 2,
  KeyK: 3,
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

  /* ---------- 判定表示 ---------- */
  const [judgement, setJudgement] = useState("");
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef(null);
  const [judgementColor, setJudgementColor] = useState("text-yellow-400");

  useEffect(() => {
    return useScore.subscribe(
      (state) =>
        (scoreRef.current = { counts: state.counts, score: state.score })
    );
  }, []);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        if (!chartId) throw new Error("Chart ID is missing.");
        const docRef = doc(db, "charts", chartId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) throw new Error("Chart data does not exist.");

        const chartData = snap.data();
        chartDataRef.current = chartData;

        notesRef.current = (chartData.notes ?? [])
          .sort((a, b) => a.time - b.time)
          .map((n) => ({
            ...n,
            id: `${n.time}-${n.lane}`,
            hit: false,
            missed: false,
          }));

        const audioUrl = chartData.audio?.trim() || "/audio/Henceforth.mp3";
        soundRef.current = new Howl({
          src: [audioUrl],
          html5: true,
          onload: () => setLoading(false),
          onerror: () => setError("音声の読み込みに失敗しました。"),
          onend: () => {
            setTimeout(() => nav("/result", { state: scoreRef.current }), 500);
          },
        });
      } catch (e) {
        setError("譜面データの取得に失敗しました。");
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
    window.addEventListener("keydown", onFirstKey, { once: true });
    return () => window.removeEventListener("keydown", onFirstKey);
  }, [loading]);

  useGameLoop(() => {
    if (!started || !soundRef.current) return;
    const newTime = soundRef.current.seek();
    if (typeof newTime !== "number") return;
    setTime(newTime);

    let misses = 0;
    for (const n of notesRef.current) {
      if (!n.hit && !n.missed && newTime - n.time > 0.2) {
        n.missed = true;
        misses++;
      }
    }
    if (misses > 0) {
      for (let i = 0; i < misses; i++) {
        add("miss");
        showJudgement("Miss");
        setJudgementColor("text-blue-400");
      }
    }
  });

  const showJudgement = (text) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setJudgement(text);
    setVisible(true);

    setTimeout(() => {
      setVisible(false);
      setAnimating(false);
    }, 500); // 0.5秒で消す
  };

  const onKey = useCallback(
    (e) => {
      if (!started || !VALID_KEYS.includes(e.code)) return;

      const lane = KEY_TO_LANE[e.code];
      const currentTime = soundRef.current?.seek() || 0;

      let bestMatchIndex = -1;
      let minDistance = Infinity;

      notesRef.current.forEach((n, index) => {
        if (n.lane !== lane || n.hit || n.missed) return;
        const distance = Math.abs(
          HIT_X - (HIT_X + (n.time - currentTime) * NOTE_SPEED)
        );
        if (distance < JUDGE.good && distance < minDistance) {
          minDistance = distance;
          bestMatchIndex = index;
        }
      });

      if (bestMatchIndex === -1) return;

      const note = notesRef.current[bestMatchIndex];
      if (minDistance < JUDGE.perfect) {
        add("perfect");
        showJudgement("Perfect");
        setJudgementColor("text-yellow-400");
      } else {
        add("good");
        showJudgement("Good");
        setJudgementColor("text-orange-500");
      }

      note.hit = true;
      setTime(currentTime);
    },
    [started, add]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  useEffect(() => {
    if (started && chartDataRef.current && time >= (chartDataRef.current.duration || 15)) {
      soundRef.current?.stop();
      nav('/result', { state: scoreRef.current });
    }
  }, [time, started, nav]);

  const visibleNotes = notesRef.current.filter(
    (n) => !n.hit && !n.missed && Math.abs(n.time - time) < WINDOW_SEC
  );

  const screenCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  
  if (loading) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Loading Chart...</div>;
  if (error) return <div className="flex items-center justify-center h-screen bg-black text-red-500 text-2xl">{error}</div>;
  if (!started) return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white text-center">
      <div className="text-2xl mb-4">上のレーンからD，F，J，Kを押してプレイしてね</div>
      <div className="text-xl text-gray-300">タップしてスタート</div>
    </div>
  );

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >
        Back
      </button>

      {/* スコア表示 */}
      <div className="absolute left-4 top-16 text-xl text-white">
        Score: {score}
      </div>

      <div className="relative w-full h-screen bg-black overflow-hidden">
        {/* 判定表示（中央） */}
        <div
          className={`absolute top-[40%] left-1/2 transform -translate-x-1/2 text-4xl font-bold drop-shadow transition-all duration-500 pointer-events-none
          ${
            visible ? "opacity-100 scale-150" : "opacity-0 scale-100"
          } ${judgementColor}`}
        >
          {judgement}
        </div>
        {LANE_Y_POSITIONS.map((y, index) => (
          <div
            key={index}
            style={{ top: `calc(50% + ${y}px)` }}
            className="absolute left-0 right-0 transform -translate-y-1/2"
          >
            <HitLine lane={index} />
          </div>
        ))}
      </div>

      {visibleNotes.map((n) => {
        const yPos = screenCenterY + LANE_Y_POSITIONS[n.lane];
        return (
          <Note
            key={n.id}
            x={HIT_X + (n.time - time) * NOTE_SPEED}
            y={yPos}
            lane={n.lane}
          />
        );
      })}
    </div>
  );
}
