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
import useSimpleJoycon from '../hooks/useSimpleJoycon'

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
    handleKeyPress,
  } = useGameCore(song, difficulty, handleGameEnd, keyMaps)

  /* ---------- ジョイコン機能 ---------- */
  const { isConnected, isConnecting, error, connect, disconnect, setOnButtonPress } = useSimpleJoycon()

  /* ---------- 判定表示 ---------- */
  const [judgement, setJudgement] = useState('') // 判定表示用の状態
  const [visible, setVisible] = useState(false)
  const [judgementColor, setJudgementColor] = useState('text-yellow-400')
  const scoreRef = useRef({ counts, score })

  // スコア参照の更新
  useEffect(() => {
    scoreRef.current = { counts, score }
  }, [counts, score])

  // ジョイコンボタン入力をキー入力として処理
  useEffect(() => {
    setOnButtonPress((key) => {
      // ゲーム未開始時は開始
      if (!started && sound) {
        startGame()
      }
      
      // 現在のキー設定から4番目のレーン（インデックス3）のキーを取得
      const currentKeyMaps = getSingleKeyMaps()
      const fourthLaneKeys = Object.keys(currentKeyMaps.KEY_TO_LANE).filter(
        keyCode => currentKeyMaps.KEY_TO_LANE[keyCode] === 3
      )
      
      if (fourthLaneKeys.length > 0) {
        const keyCode = fourthLaneKeys[0] // 4番目のレーンのキーコード
        const keyChar = keyCode.replace('Key', '') // 'KeyK' -> 'K'
        
        const simulatedEvent = {
          code: keyCode,
          key: keyChar,
          preventDefault: () => {},
          stopPropagation: () => {}
        }
        handleKeyPress(simulatedEvent)
      }
    })
  }, [setOnButtonPress, started, sound, startGame, handleKeyPress])

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
  const HIT_Y = screenHeight - 120
  const HIT_X = 160
  const circleSize = 64
  const yPos = HIT_Y - circleSize / 4

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >
        Back
      </button>
      
      {/* ジョイコン接続UI */}
      <div className="absolute right-4 top-4 z-30">
        {!isConnected ? (
          <button
            className={`px-4 py-2 text-white rounded ${
              isConnecting 
                ? 'bg-yellow-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={connect}
            disabled={isConnecting}
          >
            {isConnecting ? '接続中...' : 'Joy-Con接続'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-green-400">🎮 Joy-Con接続済み</span>
            <button
              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              onClick={disconnect}
            >
              切断
            </button>
          </div>
        )}
        {error && (
          <div className="text-red-400 text-sm mt-1 max-w-48">
            {error}
          </div>
        )}
      </div>

      {/* スコア表示 */}
      <div className="absolute left-4 top-16 text-xl text-white">
        Score: {score}
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
              y={HIT_Y - (n.time - time - offset) * NOTE_SPEED}
              lane={n.lane || 0}
            />
          )
        } else {
          // 右から左
          const yPos = screenHeight / 2 + LANE_X_POSITIONS[n.lane || 0]
          return (
            <Note
              key={n.id}
              x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
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
