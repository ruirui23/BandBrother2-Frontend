import { playHitSound } from '../utils/soundEffects'
import { useEffect, useState, useRef, useCallback } from 'react'
import useGameLoop from '../hooks/useGameLoop'
import { useParams, useNavigate } from 'react-router-dom'
import { Howl } from 'howler'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants'
import Note from '../components/Note'
import HitLine from '../components/HitLine'
import useSimpleJoycon from '../hooks/useSimpleJoycon'

const JUDGE = { perfect: 24, good: 48 }

// レーンのY座標を定義
const LANE_Y_POSITIONS = [-96, -32, 32, 96]

// 毎回localStorageから最新のキー設定を取得
function getKeyMaps() {
  let keys = ['D', 'F', 'J', 'K']
  try {
    const obj = JSON.parse(localStorage.getItem('keySettings'))
    if (obj && Array.isArray(obj.single) && obj.single.length === 4) {
      keys = obj.single
    }
  } catch {
    // ignore
  }
  const KEY_TO_LANE = Object.fromEntries(
    keys.map((k, i) => [`Key${k.toUpperCase()}`, i])
  )
  const VALID_KEYS = Object.keys(KEY_TO_LANE)
  return { KEY_TO_LANE, VALID_KEYS }
}
import { useGameLayout } from '../store'

export default function PlayCustom() {
  const { chartId } = useParams()
  const nav = useNavigate()
  const { isVertical } = useGameLayout()
  const notesRef = useRef([])
  const [started, setStarted] = useState(false)
  const [time, setTime] = useState(0)
  
  // ジョイコン機能
  const { isConnected, isConnecting, error: joyconError, connect, disconnect, setOnButtonPress } = useSimpleJoycon()
  // ゲームループで時間を進める
  useGameLoop(() => {
    if (!started || !soundRef.current) return
    const newTime = soundRef.current.seek()
    if (typeof newTime !== 'number') return
    setTime(newTime)

    // 曲の終了条件: durationが1秒未満やNaNなら判定しない
    const duration = soundRef.current.duration
      ? soundRef.current.duration()
      : null
    if (duration && duration > 1 && newTime >= duration - 0.05) {
      // 多少の誤差を許容
      soundRef.current.stop()
      nav('/result', {
        state: {
          score: scoreRef.current,
          counts: countsRef.current,
          chartId,
          chartTitle: chartDataRef.current?.title || '無題',
        },
      })
    }

    // Miss判定
    notesRef.current = notesRef.current.map(n => {
      if (!n.hit && !n.missed && newTime - (n.time - offset) > 0.2) {
        playHitSound()
        showJudgement('Miss', 'text-blue-400')
        setScore(s => {
          const next = s - 2
          scoreRef.current = next
          return next
        })
        countsRef.current.miss += 1
        return { ...n, missed: true }
      }
      return n
    })
  })
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState(null)
  const soundRef = useRef(null)
  const [score, setScore] = useState(0)
  const [judgement, setJudgement] = useState('')
  const [visible, setVisible] = useState(false)
  const [judgementColor, setJudgementColor] = useState('text-yellow-400')
  const [offset, setOffset] = useState(0)
  const chartDataRef = useRef(null)

  // 判定カウント
  const countsRef = useRef({ perfect: 0, good: 0, miss: 0 })
  // スコア参照
  const scoreRef = useRef(0)

  // 画面サイズ
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 600
  const HIT_Y = screenHeight - 120
  const HIT_X = 160
  const circleSize = 64
  const yPos = HIT_Y - circleSize / 4

  // 判定表示コールバック
  const showJudgement = (text, color) => {
    setJudgement(text)
    setJudgementColor(color)
    setVisible(true)
    setTimeout(() => setVisible(false), 500)
  }
  useEffect(() => {
    const fetchChart = async () => {
      try {
        if (!chartId) throw new Error('Chart ID is missing.')
        const docRef = doc(db, 'charts', chartId)
        const snap = await getDoc(docRef)
        if (!snap.exists()) throw new Error('Chart data does not exist.')
        chartDataRef.current = snap.data()
        setOffset(chartDataRef.current.offset || 0)
        notesRef.current = (chartDataRef.current.notes ?? [])
          .sort((a, b) => a.time - b.time)
          .map(n => ({
            ...n,
            id: `${n.time}-${n.lane}`,
            hit: false,
            missed: false,
          }))
        const audioUrl = (
          chartDataRef.current.audio?.trim() || '/audio/Henceforth.mp3'
        )
          .replace(/ /g, '_')
          .replace(/[！-～]/g, s =>
            String.fromCharCode(s.charCodeAt(0) - 0xfee0)
          ) // 全角→半角
        soundRef.current = new Howl({
          src: [audioUrl],
          html5: true,
          onload: () => setLoading(false),
          onerror: () => setError('音声の読み込みに失敗しました。'),
          onend: () => {
            setTimeout(
              () =>
                nav('/result', {
                  state: {
                    score: scoreRef.current,
                    counts: countsRef.current,
                    chartId,
                    chartTitle: chartDataRef.current?.title || '無題',
                  },
                }),
              500
            )
          },
        })
      } catch {
        setError('譜面データの取得に失敗しました。')
        setLoading(false)
      }
    }
    setScore(0)
    fetchChart()
    return () => {
      soundRef.current?.unload()
    }
  }, [chartId, nav])

  // スコア変更時にscoreRefも更新
  useEffect(() => {
    scoreRef.current = score
  }, [score])

  const onKey = useCallback(
    e => {
      const { KEY_TO_LANE, VALID_KEYS } = getKeyMaps()
      if (!started || !VALID_KEYS.includes(e.code)) return
      const lane = KEY_TO_LANE[e.code]
      const currentTime = soundRef.current?.seek() || 0
      let bestMatchIndex = -1
      let minDistance = Infinity
      notesRef.current.forEach((n, index) => {
        if (n.lane !== lane || n.hit || n.missed) return
        const distance = Math.abs(
          HIT_X - (HIT_X + (n.time - currentTime - offset) * NOTE_SPEED)
        )
        if (distance < JUDGE.good && distance < minDistance) {
          minDistance = distance
          bestMatchIndex = index
        }
      })
      if (bestMatchIndex === -1) return
      if (minDistance < JUDGE.perfect) {
        playHitSound()
        showJudgement('Perfect', 'text-yellow-400')
        setScore(s => {
          const next = s + 5
          scoreRef.current = next
          return next
        })
        countsRef.current.perfect += 1
      } else {
        playHitSound()
        showJudgement('Good', 'text-orange-500')
        setScore(s => {
          const next = s + 2
          scoreRef.current = next
          return next
        })
        countsRef.current.good += 1
      }
      notesRef.current[bestMatchIndex].hit = true
    },
    [started, offset]
  )

  // ジョイコンボタン入力をキー入力として処理
  useEffect(() => {
    setOnButtonPress((key) => {
      // ゲーム未開始時は開始
      if (!started && !soundRef.current?.playing()) {
        soundRef.current?.play()
        setStarted(true)
      }
      
      // 現在のキー設定から4番目のレーン（インデックス3）のキーを取得
      const currentKeyMaps = getKeyMaps()
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
        onKey(simulatedEvent)
      }
    })
  }, [setOnButtonPress, started, onKey])

  useEffect(() => {
    if (loading) return
    const onFirstKey = () => {
      if (!soundRef.current?.playing()) {
        soundRef.current?.play()
        setStarted(true)
      }
    }
    window.addEventListener('keydown', onFirstKey, { once: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onFirstKey)
      window.removeEventListener('keydown', onKey)
    }
  }, [onKey, loading])

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Loading Chart...
      </div>
    )
  if (_error)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-red-500 text-2xl">
        {_error}
      </div>
    )
  if (!started) {
    // キー設定を取得
    let keys = ['D', 'F', 'J', 'K']
    try {
      const obj = JSON.parse(localStorage.getItem('keySettings'))
      if (obj && Array.isArray(obj.single) && obj.single.length === 4) {
        keys = obj.single
      }
    } catch {
      // ignore
    }
    return (
      <div
        className="flex flex-col items-center justify-center h-screen bg-black text-white text-center"
        onClick={() => setStarted(true)}
      >
        <div className="text-2xl mb-4">
          上のレーンから{keys.join('，')}を押してプレイしてね
        </div>
        <div className="text-xl text-gray-300">タップしてスタート</div>
      </div>
    )
  }

  // ノーツの表示リスト
  const visibleNotes = notesRef.current.filter(
    n => !n.hit && !n.missed && Math.abs(n.time - time - offset) < WINDOW_SEC
  )

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
        {joyconError && (
          <div className="text-red-400 text-sm mt-1 max-w-48">
            {joyconError}
          </div>
        )}
      </div>

      {/* スコア表示 */}
      <div className="absolute left-4 top-16 text-xl text-white">
        Score: {score}
      </div>
      {/* 判定ライン・ノーツ描画 */}
      {isVertical ? (
        <>
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
          {visibleNotes.map(n => {
            const xPos = screenWidth / 2 + LANE_Y_POSITIONS[n.lane || 0]
            const y = screenHeight - 120 - (n.time - time - offset) * NOTE_SPEED
            return <Note key={n.id} x={xPos} y={y} lane={n.lane} />
          })}
        </>
      ) : (
        <>
          <div
            className="absolute flex flex-col items-center"
            style={{
              left: `${circleSize * 2}px`,
              top: `${screenHeight / 2 - circleSize * 2}px`,
              height: `${circleSize * 4}px`,
              pointerEvents: 'none',
            }}
          >
            {[0, 1, 2, 3].map((lane, idx) => (
              <HitLine key={idx} yOffset={0} />
            ))}
          </div>
          {visibleNotes.map(n => {
            const yPos = screenHeight / 2 + LANE_Y_POSITIONS[n.lane || 0]
            return (
              <Note
                key={n.id}
                x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
                y={yPos}
                lane={n.lane}
              />
            )
          })}
        </>
      )}
      {/* 判定表示（中央） */}
      <div
        className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold drop-shadow transition-all duration-500 pointer-events-none ${visible ? 'opacity-100 scale-150' : 'opacity-0 scale-100'} ${judgementColor}`}
      >
        {judgement}
      </div>
    </div>
  )
}
