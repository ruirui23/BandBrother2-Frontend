import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import song from '../data/tutorial.json'

export default function MultiMusicSelect() {
  const nav = useNavigate()
  const [customCharts, setCustomCharts] = useState([])
  const [showCustom, setShowCustom] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Firebase認証チェック
    if (!auth.currentUser) {
      nav('/')
      return
    }

    // Firebaseからカスタム譜面を取得
    const fetchCharts = async () => {
      setLoading(true)
      try {
        const chartsQuery = collection(db, 'charts')
        const snap = await getDocs(chartsQuery)
        setCustomCharts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      } catch (error) {
        console.error('Error fetching charts:', error)
      }
      setLoading(false)
    }

    fetchCharts()
  }, [nav])

  const handleTutorialSelect = difficulty => {
    // チュートリアル楽曲でマッチング開始
    nav('/match', {
      state: {
        musicType: 'tutorial',
        difficulty,
        musicData: song,
      },
    })
  }

  const handleCustomSelect = chart => {
    // カスタム楽曲でマッチング開始
    nav('/match', {
      state: {
        musicType: 'custom',
        chartId: chart.id,
        musicData: chart,
      },
    })
  }

  const difficulties = Object.keys(song.difficulty)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-6">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >
        戻る
      </button>

      <h2 className="text-3xl font-bold mb-6 text-white drop-shadow">
        マルチプレイ楽曲選択
      </h2>

      {!showCustom && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <h3 className="text-xl font-semibold text-white text-center mb-2">
            チュートリアル楽曲
          </h3>
          {difficulties.map((d, i) => (
            <button
              key={d}
              className={`px-6 py-4 rounded-xl text-xl font-bold shadow-lg transition text-white ${
                i === 0
                  ? 'bg-green-500 hover:bg-green-600'
                  : i === 1
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-red-500 hover:bg-red-600'
              }`}
              onClick={() => handleTutorialSelect(d)}
            >
              {song.title} - {d} (Lv.{song.difficulty[d].level})
            </button>
          ))}
          <button
            className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-lg font-bold shadow-lg"
            onClick={() => setShowCustom(true)}
          >
            カスタム楽曲
          </button>
        </div>
      )}

      {showCustom && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <button
            className="mb-2 px-4 py-2 bg-gray-400 hover:bg-gray-500 rounded-lg text-white font-bold self-start"
            onClick={() => setShowCustom(false)}
          >
            ← 戻る
          </button>
          <h3 className="text-2xl font-semibold mb-2 text-white">
            カスタム楽曲リスト
          </h3>

          {loading && <div className="text-white">読み込み中...</div>}
          {!loading && customCharts.length === 0 && (
            <div className="text-white">楽曲がありません</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-h-96 overflow-y-auto">
            {customCharts.map(chart => (
              <button
                key={chart.id}
                className="px-5 py-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-white text-lg font-bold shadow-lg flex flex-col items-start gap-1 transition"
                onClick={() => handleCustomSelect(chart)}
              >
                <span className="text-xl">{chart.title || '無題'}</span>
                <span className="text-sm text-blue-100">
                  BPM: {chart.bpm || 120}
                </span>
                <span className="text-xs text-blue-200">
                  作成者: {chart.createdBy}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
