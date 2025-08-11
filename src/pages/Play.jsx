// src/pages/Play.jsx
import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import song from '../data/tutorial.json'
import useGameCore from '../hooks/useGameCore'
import { HIT_X, NOTE_SPEED } from '../constants'
import Note from '../components/Note'
import HitLine from '../components/HitLine'

// レーンのY座標を定義
const LANE_Y_POSITIONS = [-96, -32, 32, 96]

export default function Play() {
  /* ---------- URL パラメータ ---------- */
  const { difficulty = 'Easy' } = useParams()
  const nav = useNavigate()

  /* ---------- ゲーム終了時の処理 ---------- */
  const handleGameEnd = ({ counts, score }) => {
    setTimeout(() => {
      nav('/result', { state: { counts, score } })
    }, 500)
  }

  /* ---------- 共通ゲームロジック ---------- */
  const {
    notes: visibleNotes,
    time,
    offset,
    started,
    score,
    counts,
    sound,
    startGame,
    setOnJudgment,
  } = useGameCore(song, difficulty, handleGameEnd)

  /* ---------- 判定表示 ---------- */
  const [judgement, setJudgement] = useState('')
  const [visible, setVisible] = useState(false)
  const [judgementColor, setJudgementColor] = useState('text-yellow-400')
  const scoreRef = useRef({ counts, score })

  // スコア参照の更新
  useEffect(() => {
    scoreRef.current = { counts, score }
  }, [counts, score])

  // 音声読み込み状態
  const [isSoundLoaded, setIsSoundLoaded] = useState(false)

  // 音声読み込み状態の監視
  useEffect(() => {
    if (sound) {
      setIsSoundLoaded(true)
    }
  }, [sound])

  // 最初のキー入力でゲーム開始
  useEffect(() => {
    if (!sound) return

    const onFirstKey = () => {
      if (!started) {
        startGame()
      }
    }
    window.addEventListener('keydown', onFirstKey, { once: true })
    return () => {
      window.removeEventListener('keydown', onFirstKey)
    }
  }, [sound, started, startGame])

  const showJudgement = text => {
    setJudgement(text)
    setVisible(true)

    setTimeout(() => {
      setVisible(false)
    }, 500) // 0.5秒で消す
  }

  // 判定結果コールバックの設定
  useEffect(() => {
    setOnJudgment(judgmentType => {
      console.log('Judgment received:', judgmentType)
      if (judgmentType === 'perfect') {
        showJudgement('Perfect')
        setJudgementColor('text-yellow-400')
      } else if (judgmentType === 'good') {
        showJudgement('Good')
        setJudgementColor('text-orange-500')
      } else if (judgmentType === 'miss') {
        showJudgement('Miss')
        setJudgementColor('text-blue-400')
      }
    })
  }, [setOnJudgment])

  const screenCenterY =
    typeof window !== 'undefined' ? window.innerHeight / 2 : 0

  /* ---------- 描画 ---------- */
  if (!isSoundLoaded || !sound)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Loading...
      </div>
    )
  if (!started)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white text-center">
        <div className="text-2xl mb-4">
          上のレーンからD，F，J，Kを押してプレイしてね
        </div>
        <div className="text-xl text-gray-300">タップしてスタート</div>
      </div>
    )

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >
        Back
      </button>
      <div className="relative w-full h-screen bg-black overflow-hidden">
        {/* 判定表示（中央） */}
        <div
          className={`absolute top-[40%] left-1/2 transform -translate-x-1/2 text-4xl font-bold drop-shadow transition-all duration-500 pointer-events-none
          ${
            visible ? 'opacity-100 scale-150' : 'opacity-0 scale-100'
          } ${judgementColor}`}
        >
          {judgement}
        </div>
        {/* スコア表示 */}
        <div className="absolute left-4 top-16 text-xl text-white">
          Score: {score}
        </div>

        {/* 4本の判定ライン */}
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

      {/* スコア表示 */}

      {/* ノーツ表示 */}
      {visibleNotes.map(n => {
        const yPos = screenCenterY + LANE_Y_POSITIONS[n.lane || 0]
        return (
          <Note
            key={n.id}
            x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
            y={yPos}
            lane={n.lane || 0}
          />
        )
      })}
    </div>
  )
}
