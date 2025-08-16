import { playHitSound } from '../utils/soundEffects'
// 339:13 error  Empty block statement  no-empty
import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Howl } from 'howler'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants'
import { useGameLayout } from '../store'
import Note from '../components/Note'
import HitLine from '../components/HitLine'
import useGameLoop from '../hooks/useGameLoop'

const JUDGE = { perfect: 24, good: 48 }

// --- Player 1/2 キー設定をlocalStorageから取得 ---
const P1_LANE_Y_POS = [-96, -32, 32, 96]
const P2_LANE_Y_POS = [-96, -32, 32, 96]
function getKeySettings() {
  try {
    return (
      JSON.parse(localStorage.getItem('keySettings')) || {
        p1: ['Q', 'W', 'E', 'R'],
        p2: ['U', 'I', 'O', 'P'],
      }
    )
  } catch {
    return { p1: ['Q', 'W', 'E', 'R'], p2: ['U', 'I', 'O', 'P'] }
  }
}
const userKeys = getKeySettings()
const P1_KEY_TO_LANE = Object.fromEntries(
  (userKeys.p1 || ['Q', 'W', 'E', 'R']).map((k, i) => [
    `Key${k.toUpperCase()}`,
    i,
  ])
)
const P2_KEY_TO_LANE = Object.fromEntries(
  (userKeys.p2 || ['U', 'I', 'O', 'P']).map((k, i) => [
    `Key${k.toUpperCase()}`,
    i,
  ])
)
const ALL_VALID_KEYS = [
  ...Object.keys(P1_KEY_TO_LANE),
  ...Object.keys(P2_KEY_TO_LANE),
]

export default function TwoPlayerPlayCustom() {
  const { isVertical } = useGameLayout() // レイアウトの方向を取得
  const { chartId } = useParams()
  const nav = useNavigate()

  const [notes, setNotes] = useState({ p1: [], p2: [] })
  const [offset, setOffset] = useState(0)

  const p1ScoreRef = useRef({ perfect: 0, good: 0, miss: 0, score: 0 })
  const p2ScoreRef = useRef({ perfect: 0, good: 0, miss: 0, score: 0 })
  const [p1Score, setP1Score] = useState({
    perfect: 0,
    good: 0,
    miss: 0,
    score: 0,
  })
  const [p2Score, setP2Score] = useState({
    perfect: 0,
    good: 0,
    miss: 0,
    score: 0,
  })

  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [time, setTime] = useState(0)
  const soundRef = useRef(null)
  const resultTimeoutRef = useRef(null)
  /*一人目の判定表示用*/
  const [judgement1, setJudgement1] = useState('')
  const [visible1, setVisible1] = useState(false)
  const [_ANIMATING1, setAnimating1] = useState(false)
  const timeoutRef1 = useRef(null)
  const [judgementColor1, setJudgementColor1] = useState('text-yellow-400')
  /*二人目の判定表示用*/
  const [judgement2, setJudgement2] = useState('')
  const [visible2, setVisible2] = useState(false)
  const [_ANIMATING2, setAnimating2] = useState(false)
  const timeoutRef2 = useRef(null)
  const [judgementColor2, setJudgementColor2] = useState('text-yellow-400')

  const chartDataRef = useRef(null)

  const p1ComboRef = useRef(0)
  const p1MaxComboRef = useRef(0)
  const p2ComboRef = useRef(0)
  const p2MaxComboRef = useRef(0)

  useEffect(() => {
    const fetchChart = async () => {
      try {
        if (!chartId) {
          console.error('chartId from useParams is missing')
          throw new Error('譜面IDが指定されていません。')
        }
        const snap = await getDoc(doc(db, 'charts', chartId))
        if (!snap.exists()) throw new Error('指定された譜面が見つかりません。')

        const chartData = snap.data()
        chartDataRef.current = chartData
        setOffset(chartData.offset || 0)

        // 取得した譜面のノーツをプレイヤー1と2に複製する
        const baseNotes = (chartData.notes ?? []).sort(
          (a, b) => a.time - b.time
        )

        setNotes({
          p1: baseNotes.map(n => ({
            ...n,
            id: `p1-${n.time}-${n.lane}`,
            hit: false,
            missed: false,
          })),
          p2: baseNotes.map(n => ({
            ...n,
            id: `p2-${n.time}-${n.lane}`,
            hit: false,
            missed: false,
          })),
        })

        const audioUrl = chartData.audio?.trim() || '/audio/Henceforth.mp3'
        soundRef.current = new Howl({
          src: [audioUrl],
          html5: true,
          onload: () => setLoading(false),
          onerror: (id, err) => {
            console.error('Audio load error:', err)
            setError('音声の読み込みに失敗しました。')
            setLoading(false)
          },
          onend: () => {
            if (!resultTimeoutRef.current) {
              resultTimeoutRef.current = setTimeout(() => {
                // リザルト画面に渡すデータを整形
                const resultData = {
                  counts1: p1ScoreRef.current,
                  score1: p1ScoreRef.current.score,
                  lastCombo1: (p1ScoreRef.current.perfect ?? 0) + (p1ScoreRef.current.good ?? 0),
                  maxCombo1: p1MaxComboRef.current,
                  counts2: p2ScoreRef.current,
                  score2: p2ScoreRef.current.score,
                  lastCombo2: (p2ScoreRef.current.perfect ?? 0) + (p2ScoreRef.current.good ?? 0),
                  maxCombo2: p2MaxComboRef.current,
                }
                nav('/result', { state: resultData })
              }, 500)
            }
          },
        })
      } catch (e) {
        console.error('Chart fetch error:', e)
        setError(e.message || '譜面データの取得に失敗しました。')
        setLoading(false)
      }
    }

    p1ScoreRef.current = { perfect: 0, good: 0, miss: 0, score: 0 }
    p2ScoreRef.current = { perfect: 0, good: 0, miss: 0, score: 0 }
    setP1Score({ perfect: 0, good: 0, miss: 0, score: 0 })
    setP2Score({ perfect: 0, good: 0, miss: 0, score: 0 })
    fetchChart()
    return () => {
      soundRef.current?.unload()
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
    }
  }, [chartId, nav])

  const showJudgement1 = text => {
    if (timeoutRef1.current) clearTimeout(timeoutRef1.current)
    setJudgement1(text)
    setVisible1(true)

    setTimeout(() => {
      setVisible1(false)
      setAnimating1(false)
    }, 500) // 0.5秒で消す
  }

  const showJudgement2 = text => {
    if (timeoutRef2.current) clearTimeout(timeoutRef2.current)
    setJudgement2(text)
    setVisible2(true)

    setTimeout(() => {
      setVisible2(false)
      setAnimating2(false)
    }, 500) // 0.5秒で消す
  }

  const handleMisses = useCallback(() => {
    const currentTime = soundRef.current?.seek() ?? 0

    let p1Changed = false
    const p1NewNotes = notes.p1.map(n => {
      if (!n.hit && !n.missed && currentTime - (n.time - offset) > 0.2) {
        p1ScoreRef.current.miss++
        showJudgement1('Miss')
        setJudgementColor1('text-blue-400')
        p1ScoreRef.current.score -= 2
        p1ComboRef.current = 0 // ミスでコンボリセット
        setP1Score({ ...p1ScoreRef.current })
        p1Changed = true
        return { ...n, missed: true }
      }
      return n
    })

    let p2Changed = false
    const p2NewNotes = notes.p2.map(n => {
      if (!n.hit && !n.missed && currentTime - (n.time - offset) > 0.2) {
        p2ScoreRef.current.miss++
        showJudgement2('Miss')
        setJudgementColor2('text-blue-400')
        p2ScoreRef.current.score -= 2
        p2ComboRef.current = 0 // ミスでコンボリセット
        setP2Score({ ...p2ScoreRef.current })
        p2Changed = true
        return { ...n, missed: true }
      }
      return n
    })

    if (p1Changed || p2Changed) {
      setNotes({
        p1: p1Changed ? p1NewNotes : notes.p1,
        p2: p2Changed ? p2NewNotes : notes.p2,
      })
    }
  }, [notes, offset])

  useGameLoop(() => {
    if (!started || !soundRef.current) return
    const newTime = soundRef.current.seek()
    if (typeof newTime !== 'number') return
    setTime(newTime)

    // 可変長の譜面に対応した終了条件
    if (
      chartDataRef.current &&
      newTime >= (chartDataRef.current.duration || 15)
    ) {
      soundRef.current.stop()
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
      nav('/result', {
        state: {
          counts1: p1ScoreRef.current,
          score1: p1ScoreRef.current.score,
          lastCombo1: (p1ScoreRef.current.perfect ?? 0) + (p1ScoreRef.current.good ?? 0),
          maxCombo1: p1MaxComboRef.current,
          counts2: p2ScoreRef.current,
          score2: p2ScoreRef.current.score,
          lastCombo2: (p2ScoreRef.current.perfect ?? 0) + (p2ScoreRef.current.good ?? 0),
          maxCombo2: p2MaxComboRef.current,
        },
      })
      return
    }

    handleMisses()
  })

  const onKey = useCallback(
    e => {
      if (!started || !ALL_VALID_KEYS.includes(e.code)) return

      const currentTime = soundRef.current?.seek() || 0
      const isP1Key = Object.keys(P1_KEY_TO_LANE).includes(e.code)

      const player = isP1Key ? 'p1' : 'p2'
      const targetLane = isP1Key
        ? P1_KEY_TO_LANE[e.code]
        : P2_KEY_TO_LANE[e.code]
      const scoreRef = isP1Key ? p1ScoreRef : p2ScoreRef
      const currentNotes = notes[player]

      let bestMatchIndex = -1
      let minDistance = Infinity

      currentNotes.forEach((n, index) => {
        if (n.lane !== targetLane || n.hit || n.missed) return
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
        scoreRef.current.perfect++
        scoreRef.current.score += 5
        if (isP1Key) {
          p1ComboRef.current++
          if (p1ComboRef.current > p1MaxComboRef.current) p1MaxComboRef.current = p1ComboRef.current
        } else {
          p2ComboRef.current++
          if (p2ComboRef.current > p2MaxComboRef.current) p2MaxComboRef.current = p2ComboRef.current
        }
        if (isP1Key) {
          showJudgement1('Perfect')
          setJudgementColor1('text-yellow-400')
        } else {
          showJudgement2('Perfect')
          setJudgementColor2('text-yellow-400')
        }
      } else {
        playHitSound()
        scoreRef.current.good++
        scoreRef.current.score += 2
        if (isP1Key) {
          p1ComboRef.current++
          if (p1ComboRef.current > p1MaxComboRef.current) p1MaxComboRef.current = p1ComboRef.current
        } else {
          p2ComboRef.current++
          if (p2ComboRef.current > p2MaxComboRef.current) p2MaxComboRef.current = p2ComboRef.current
        }
        if (isP1Key) {
          showJudgement1('Good')
          setJudgementColor1('text-orange-500')
        } else {
          showJudgement2('Good')
          setJudgementColor2('text-orange-500')
        }
      }

      setNotes(prev => ({
        ...prev,
        [player]: prev[player].map((n, idx) =>
          idx === bestMatchIndex ? { ...n, hit: true } : n
        ),
      }))
    },
    [started, notes, offset]
  )

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
        Loading Charts...
      </div>
    )
  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-red-500 text-2xl">
        {error}
      </div>
    )
  if (!started) {
    // キー設定を取得
    let p1 = ['Q', 'W', 'E', 'R']
    let p2 = ['U', 'I', 'O', 'P']
    try {
      const obj = JSON.parse(localStorage.getItem('keySettings'))
      if (obj && Array.isArray(obj.p1) && obj.p1.length === 4) p1 = obj.p1
      if (obj && Array.isArray(obj.p2) && obj.p2.length === 4) p2 = obj.p2
    } catch {
      // ignore
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white text-center">
        <div className="text-2xl mb-4">
          1Pは上のレーンから{p1.join('，')}キー
          <br />
          2Pは{p2.join('，')}キーを押してプレイしてね
        </div>
        <div className="text-xl text-gray-300">タップしてスタート</div>
      </div>
    )
  }

  const screenHeight = window.innerHeight
  const screenWidth = window.innerWidth
  const LANE_X_POSITIONS = [-96, -32, 32, 96]

  if (isVertical) {
    // 1Pフィールド
    const p1FieldLeft = 0
    const p1FieldWidth = screenWidth / 2
    const p1FieldCenterX = p1FieldLeft + p1FieldWidth / 2
    // 2Pフィールド
    const p2FieldLeft = screenWidth / 2
    const p2FieldWidth = screenWidth / 2
    const p2FieldCenterX = p2FieldLeft + p2FieldWidth / 2

    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
        {/* 1P判定表示 */}
        <div
          className={`absolute left-[25%] top-[40%] -translate-x-1/2 text-4xl font-bold drop-shadow transition-all duration-500 pointer-events-none z-20
            ${visible1 ? 'opacity-100 scale-150' : 'opacity-0 scale-100'} ${judgementColor1}`}
        >
          {judgement1}
        </div>
        {/* 2P判定表示 */}
        <div
          className={`absolute left-[75%] top-[40%] -translate-x-1/2 text-4xl font-bold drop-shadow transition-all duration-500 pointer-events-none z-20
            ${visible2 ? 'opacity-100 scale-150' : 'opacity-0 scale-100'} ${judgementColor2}`}
        >
          {judgement2}
        </div>
        {/* 1P判定枠 */}
        {P1_LANE_Y_POS.map((y, index) => (
          <div
            key={`p1-hl-v-${index}`}
            style={{
              left: `${p1FieldCenterX - 128 + index * 64}px`,
              top: `${screenHeight - 136}px`,
            }}
            className="absolute"
          >
            <HitLine lane={index} />
          </div>
        ))}
        {/* 2P判定枠 */}
        {P2_LANE_Y_POS.map((y, index) => (
          <div
            key={`p2-hl-v-${index}`}
            style={{
              left: `${p2FieldCenterX - 128 + index * 64}px`,
              top: `${screenHeight - 136}px`,
            }}
            className="absolute"
          >
            <HitLine lane={index} />
          </div>
        ))}
        {/* 1Pノーツ */}
        {notes.p1
          .filter(
            n =>
              !n.hit &&
              !n.missed &&
              Math.abs(n.time - time - offset) < WINDOW_SEC
          )
          .map(n => (
            <Note
              key={n.id}
              x={p1FieldCenterX - 96 + n.lane * 64}
              y={screenHeight - 120 - (n.time - time - offset) * NOTE_SPEED}
              lane={n.lane}
            />
          ))}
        {/* 2Pノーツ */}
        {notes.p2
          .filter(
            n =>
              !n.hit &&
              !n.missed &&
              Math.abs(n.time - time - offset) < WINDOW_SEC
          )
          .map(n => (
            <Note
              key={n.id}
              x={p2FieldCenterX - 96 + n.lane * 64}
              y={screenHeight - 120 - (n.time - time - offset) * NOTE_SPEED}
              lane={n.lane}
            />
          ))}
        {/* スコア・戻るボタン */}
        <div className="absolute left-4 top-4 text-xl">
          1P: {p1ScoreRef.current.score}<br />
          <span>最大コンボ: {p1MaxComboRef.current}　合計コンボ: {(p1ScoreRef.current.perfect ?? 0) + (p1ScoreRef.current.good ?? 0)}</span>
        </div>
        <div className="absolute right-4 top-4 text-xl">
          2P: {p2ScoreRef.current.score}<br />
          <span>最大コンボ: {p2MaxComboRef.current}　合計コンボ: {(p2ScoreRef.current.perfect ?? 0) + (p2ScoreRef.current.good ?? 0)}</span>
        </div>
        <button
          className="absolute left-1/2 top-4 -translate-x-1/2 px-4 py-2 bg-gray-600 text-white rounded z-30"
          onClick={() => nav(-1)}
        >
          Back
        </button>
        {/* 中央仕切り線 */}
        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-yellow-400 opacity-70 z-10" />
      </div>
    )
  }

  // 横画面（従来のUI）
  return (
    <div className="relative h-screen overflow-hidden bg-black text-white">
      {/* --- 1P判定表示（上画面中央） --- */}
      <div
        className={`absolute top-[35%] left-1/2 transform -translate-x-1/2 text-4xl font-bold drop-shadow transition-all duration-500 pointer-events-none z-20
          ${
            visible1 ? 'opacity-100 scale-150' : 'opacity-0 scale-100'
          } ${judgementColor1}`}
      >
        {judgement1}
      </div>

      {/* --- 2P判定表示（下画面中央） --- */}
      <div
        className={`absolute top-[75%] left-1/2 transform -translate-x-1/2 text-4xl font-bold drop-shadow transition-all duration-500 pointer-events-none z-20
          ${
            visible2 ? 'opacity-100 scale-150' : 'opacity-0 scale-100'
          } ${judgementColor2}`}
      >
        {judgement2}
      </div>
      {/* --- Player 1 Field (Top) --- */}
      <div className="absolute w-full top-0 h-1/2 border-b-2 border-yellow-400 box-border">
        {P1_LANE_Y_POS.map((y, index) => (
          <div
            key={`p1-hl-${index}`}
            style={{ top: `calc(50% + ${y}px)`, left: '128px', right: 0 }}
            className="absolute left-0 right-0 transform -translate-y-1/2"
          >
            <HitLine lane={index} />
          </div>
        ))}
        {notes.p1
          .filter(
            n =>
              !n.hit &&
              !n.missed &&
              Math.abs(n.time - time - offset) < WINDOW_SEC
          )
          .map(n => {
            const p1CenterY = screenHeight / 4
            const yPos = p1CenterY + P1_LANE_Y_POS[n.lane]
            return (
              <Note
                key={n.id}
                x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
                y={yPos}
                lane={n.lane}
              />
            )
          })}
      </div>

      {/* --- Player 2 Field (Bottom) --- */}
      <div className="absolute w-full top-1/2 h-1/2">
        {P2_LANE_Y_POS.map((y, index) => (
          <div
            key={`p2-hl-${index}`}
            style={{
              top: `calc(50% + ${y}px)`,
              left: '128px', // 右に2つ分(64*2)ずらす
              right: 0,
            }}
            className="absolute transform -translate-y-1/2"
          >
            <HitLine lane={index} />
          </div>
        ))}
        {notes.p2
          .filter(
            n =>
              !n.hit &&
              !n.missed &&
              Math.abs(n.time - time - offset) < WINDOW_SEC
          )
          .map(n => {
            const p2CenterY = screenHeight / 4
            const yPos = p2CenterY + P2_LANE_Y_POS[n.lane]
            return (
              <Note
                key={n.id}
                x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
                y={yPos}
                lane={n.lane}
              />
            )
          })}
      </div>

      <div className="absolute left-4 top-4 text-xl">
        1P: {p1ScoreRef.current.score}<br />
        <span>最大コンボ: {p1MaxComboRef.current}　合計コンボ: {(p1ScoreRef.current.perfect ?? 0) + (p1ScoreRef.current.good ?? 0)}</span>
      </div>
      <div className="absolute left-4 bottom-4 text-xl">
        2P: {p2ScoreRef.current.score}<br />
        <span>最大コンボ: {p2MaxComboRef.current}　合計コンボ: {(p2ScoreRef.current.perfect ?? 0) + (p2ScoreRef.current.good ?? 0)}</span>
      </div>
    </div>
  )
}
