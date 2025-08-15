import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Howl } from 'howler'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useScore } from '../store'
// import useGameLoop from '../hooks/useGameLoop' // 未使用のため削除
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants'
import Note from '../components/Note'
import HitLine from '../components/HitLine'

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
export default function PlayCustom() {
  const { chartId } = useParams()
  const nav = useNavigate()
  const { add, reset, counts, score } = useScore()

  const notesRef = useRef([])
  const [started] = useState(false) // setStarted未使用のため削除
  const [time, setTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const soundRef = useRef(null)
  const scoreRef = useRef({ counts, score })
  const chartDataRef = useRef(null)

  /* ---------- 判定表示 ---------- */
  const [_ANIMATING, _SET_ANIMATING] = useState(false)
  // const timeoutRef = useRef(null) // 未使用のため削除
  // const { isVertical } = useGameLayout() // 未使用のため削除
  useEffect(() => {
    return useScore.subscribe(
      state => (scoreRef.current = { counts: state.counts, score: state.score })
    )
  }, [])
  useEffect(() => {
    const fetchChart = async () => {
      try {
        if (!chartId) throw new Error('Chart ID is missing.')
        const docRef = doc(db, 'charts', chartId)
        const snap = await getDoc(docRef)
        if (!snap.exists()) throw new Error('Chart data does not exist.')

        // chartDataRef.currentを使う
        chartDataRef.current = snap.data()
        notesRef.current = (chartDataRef.current.notes ?? [])
          .sort((a, b) => a.time - b.time)
          .map(n => ({
            ...n,
            id: `${n.time}-${n.lane}`,
            hit: false,
            missed: false,
          }))

        const audioUrl =
          chartDataRef.current.audio?.trim() || '/audio/Henceforth.mp3'
        soundRef.current = new Howl({
          src: [audioUrl],
          html5: true,
          onload: () => setLoading(false),
          onerror: () => setError('音声の読み込みに失敗しました。'),
          onend: () => {
            setTimeout(() => nav('/result', { state: scoreRef.current }), 500)
          },
        })
      } catch {
        setError('譜面データの取得に失敗しました。')
        setLoading(false)
      }
    }
    reset()
    fetchChart()
    return () => {
      soundRef.current?.unload()
    }
  }, [chartId, reset, nav])

  // showJudgement未使用のため削除

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
          HIT_X - (HIT_X + (n.time - currentTime) * NOTE_SPEED)
        )
        if (distance < JUDGE.good && distance < minDistance) {
          minDistance = distance
          bestMatchIndex = index
        }
      })
      if (bestMatchIndex === -1) return
      const note = notesRef.current[bestMatchIndex]
      if (minDistance < JUDGE.perfect) {
        add('perfect')
      } else {
        add('good')
      }
      note.hit = true
      setTime(currentTime)
    },
    [started, add]
  )

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  useEffect(() => {
    if (
      started &&
      chartDataRef.current &&
      time >= (chartDataRef.current.duration || 15)
    ) {
      soundRef.current?.stop()
      nav('/result', { state: scoreRef.current })
    }
  }, [time, started, nav])

  // visibleNotes未使用のため削除

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Loading Chart...
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
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white text-center">
        <div className="text-2xl mb-4">
          上のレーンから{keys.join('，')}を押してプレイしてね
        </div>
        <div className="text-xl text-gray-300">タップしてスタート</div>
      </div>
    )
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* ここに既存のJSX（スコア表示、ノーツ描画など）を挿入 */}
    </div>
  )
}
