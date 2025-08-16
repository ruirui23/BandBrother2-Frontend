// src/pages/Play.jsx
import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import song from '../data/tutorial.json'
import useGameCore from '../hooks/useGameCore'
import { HIT_X, NOTE_SPEED } from '../constants'
import { playHitSound } from '../utils/soundEffects'
import { useGameLayout } from '../store.js'
import Note from '../components/Note'
import HitLine from '../components/HitLine'

// localStorageからキー設定を取得
function getSingleKeyMaps() {
  const saved = localStorage.getItem('keySettings')
  let keys = ['D', 'F', 'J', 'K']
  if (saved) {
    try {
      const obj = JSON.parse(saved)
      if (obj.single && Array.isArray(obj.single) && obj.single.length === 4) {
        keys = obj.single
      }
    } catch {
      // ignore
    }
  }
  // 例: { KeyD:0, KeyF:1, KeyJ:2, KeyK:3 }
  const KEY_TO_LANE = {}
  keys.forEach((k, i) => {
    KEY_TO_LANE['Key' + k.toUpperCase()] = i
  })
  const VALID_KEYS = Object.keys(KEY_TO_LANE)
  return { KEY_TO_LANE, VALID_KEYS }
}

// レーンのX座標を定義
const LANE_X_POSITIONS = [-96, -32, 32, 96]

export default function Play() {
  // FPS監視用
  const [lowFps, setLowFps] = useState(false)
  const fpsRef = useRef({ last: performance.now(), frames: 0, fps: 60, lowCount: 0 })

  useEffect(() => {
    let running = true
    function checkFps() {
      const now = performance.now()
      fpsRef.current.frames++
      if (now - fpsRef.current.last >= 1000) {
        const fps = fpsRef.current.frames / ((now - fpsRef.current.last) / 1000)
        fpsRef.current.fps = fps
        fpsRef.current.last = now
        fpsRef.current.frames = 0
        if (fps < 50) {
          fpsRef.current.lowCount++
        } else {
          fpsRef.current.lowCount = 0
        }
        setLowFps(fpsRef.current.lowCount >= 2) // 2秒連続で50未満なら警告
      }
      if (running) requestAnimationFrame(checkFps)
    }
    requestAnimationFrame(checkFps)
    return () => { running = false }
  }, [])
  // ノーツスピード倍率をlocalStorageから取得
  const getNoteSpeedMultiplier = () => {
    try {
      return parseFloat(localStorage.getItem('noteSpeedMultiplier')) || 1.0
    } catch {
      return 1.0
    }
  }
  const [noteSpeedMultiplier, setNoteSpeedMultiplier] = useState(
    getNoteSpeedMultiplier()
  )
  useEffect(() => {
    const onStorage = e => {
      if (e.key === 'noteSpeedMultiplier') {
        setNoteSpeedMultiplier(getNoteSpeedMultiplier())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  /* ---------- URL パラメータ ---------- */
  const { difficulty = 'Easy' } = useParams()
  const nav = useNavigate()

  /* ---------- ゲーム終了時の処理 ---------- */
  const handleGameEnd = ({ counts, score, maxCombo }) => {
    // 合計コンボ数 = perfect + good
    const lastCombo = (counts.perfect ?? 0) + (counts.good ?? 0)
    setTimeout(() => {
      nav('/result', { state: { counts, score, maxCombo, lastCombo } })
    }, 500)
  }

  /* ---------- 共通ゲームロジック ---------- */
  const keyMaps = getSingleKeyMaps()
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
    KEY_TO_LANE,
    VALID_KEYS,
    maxCombo,
    // combo,
  } = useGameCore(song, difficulty, handleGameEnd, keyMaps)

  /* ---------- 判定表示 ---------- */
  const [judgement, setJudgement] = useState('') // 判定表示用の状態
  const [visible, setVisible] = useState(false)
  const [judgementColor, setJudgementColor] = useState('text-yellow-400')
  const scoreRef = useRef({ counts, score })

  // スコア参照の更新
  useEffect(() => {
    scoreRef.current = { counts, score }
  }, [counts, score])

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
      if (judgmentType === 'perfect') {
        playHitSound()
        showJudgement('Perfect')
        setJudgementColor('text-yellow-400')
      } else if (judgmentType === 'good') {
        playHitSound()
        showJudgement('Good')
        setJudgementColor('text-orange-500')
      } else if (judgmentType === 'miss') {
        showJudgement('Miss')
        setJudgementColor('text-blue-400')
      }
    })
  }, [setOnJudgment])

  const { isVertical } = useGameLayout()
  // 画面サイズ・判定枠座標
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 600
  const HIT_Y = screenHeight - 100
  const HIT_X = 160
  const circleSize = 64
  const yPos = HIT_Y - circleSize / 4

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* FPS低下警告 */}
      {lowFps && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-red-600 text-white text-lg font-bold rounded shadow-lg animate-pulse">
          ⚠️ フレームレートが低下しています（50FPS未満）
        </div>
      )}
      {/* スコア表示（大きく・目立つUI） */}
      <div className="absolute left-8 top-8 flex flex-col gap-2 z-20">
        <div className="text-5xl font-extrabold text-yellow-300 drop-shadow-lg">
          <span className="text-white text-3xl align-top">Score</span>
          <span className="ml-4 text-yellow-400 text-6xl">{score}</span>
        </div>
        <div className="flex gap-8 mt-2">
          <div className="text-2xl font-bold text-blue-300 bg-black/60 rounded px-4 py-2 border-2 border-blue-400 shadow">
            最大コンボ
            <br />
            <span className="text-4xl text-blue-200">{maxCombo ?? 0}</span>
          </div>
          <div className="text-2xl font-bold text-pink-300 bg-black/60 rounded px-4 py-2 border-2 border-pink-400 shadow">
            合計コンボ
            <br />
            <span className="text-4xl text-pink-200">
              {(counts.perfect ?? 0) + (counts.good ?? 0)}
            </span>
          </div>
        </div>
      </div>
      {/* 判定ライン・ノーツ描画 */}
      {isVertical ? (
        // 縦画面（上から下）
        <div
          className="absolute flex justify-center w-full"
          style={{ top: `${yPos}px`, pointerEvents: 'none' }}
        >
          <div style={{ display: 'flex' }}>
            {[0, 1, 2, 3].map(index => (
              <HitLine key={index} yOffset={0} />
            ))}
          </div>
        </div>
      ) : (
        // 横画面（右から左）
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: `${circleSize * 2}px`, // 〇2つ分右にずらす
            top: `${screenHeight / 2 - circleSize * 2}px`,
            height: `${circleSize * 4}px`,
            pointerEvents: 'none',
          }}
        >
          {[0, 1, 2, 3].map((lane, idx) => (
            <HitLine key={idx} yOffset={0} />
          ))}
        </div>
      )}
      {/* ノーツ表示 */}
      {visibleNotes.map(n => {
        if (isVertical) {
          // 上から下
          const xPos = screenWidth / 2 + LANE_X_POSITIONS[n.lane || 0]
          return (
            <Note
              key={n.id}
              x={xPos}
              y={
                HIT_Y -
                (n.time - time - offset) * NOTE_SPEED * noteSpeedMultiplier
              }
              lane={n.lane || 0}
            />
          )
        } else {
          // 右から左
          const yPos = screenHeight / 2 + LANE_X_POSITIONS[n.lane || 0]
          return (
            <Note
              key={n.id}
              x={
                HIT_X +
                (n.time - time - offset) * NOTE_SPEED * noteSpeedMultiplier
              }
              y={yPos}
              lane={n.lane || 0}
            />
          )
        }
      })}
      {/* 判定表示（画面中央） */}
      <div
        className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold drop-shadow transition-all duration-500 pointer-events-none ${visible ? 'opacity-100 scale-150' : 'opacity-0 scale-100'} ${judgementColor}`}
      >
        {judgement}
      </div>
    </div>
  )
}
