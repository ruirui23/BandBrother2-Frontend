import { useNavigate } from 'react-router-dom'
import song from '../data/tutorial.json'
import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

export default function TwoPlayerSelect() {
  const nav = useNavigate()
  const diffs = Object.keys(song.difficulty)
  const [p1, setP1] = useState('Easy')
  const [p2, setP2] = useState('Easy')
  const [showCustom, setShowCustom] = useState(false)
  const [customCharts, setCustomCharts] = useState([])
  const [loadingCharts, setLoadingCharts] = useState(false)
  const [error, setError] = useState(null)
  const [c1, setC1] = useState(null)
  const [_C2, setC2] = useState(null)

  useEffect(() => {
    if (showCustom) {
      const fetchCharts = async () => {
        setLoadingCharts(true)
        setError(null)
        try {
          const uid = auth.currentUser?.uid
          if (!uid) {
            // デモ用、もしくはログインしていないユーザー向けの譜面
            // 本来は 'createdBy' == 'public' のようなクエリが良い
            const chartsQuery = query(collection(db, 'charts'))
            const snap = await getDocs(chartsQuery)
            setCustomCharts(
              snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            )
          } else {
            const chartsQuery = query(
              collection(db, 'charts'),
              where('createdBy', '==', uid)
            )
            const snap = await getDocs(chartsQuery)
            setCustomCharts(
              snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            )
          }
        } catch (e) {
          console.error('Failed to fetch charts:', e)
          setError('譜面の読み込みに失敗しました。')
        } finally {
          setLoadingCharts(false)
        }
      }
      fetchCharts()
    }
  }, [showCustom])

  const _HANDLE_SHOW_CUSTOM = () => {
    setC1(null)
    setC2(null)
    setShowCustom(true)
  }

  if (showCustom) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-6 p-4">
        <button
          className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
          onClick={() => setShowCustom(false)}
        >
          戻る
        </button>
        <h2 className="text-2xl mb-4 text-white font-bold drop-shadow">
          二人プレイ オリジナル譜面選択
        </h2>

        {loadingCharts && <p className="text-white">譜面を読み込み中...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loadingCharts && !error && (
          <>
            <div className="flex flex-col md:flex-row gap-10">
              <div>
                <div className="mb-2 text-white text-center">1P 譜面</div>
                <div className="max-h-60 overflow-y-auto p-2 bg-black/20 rounded-lg">
                  {customCharts.map(chart => (
                    <button
                      key={chart.id}
                      className={`block w-full text-left px-4 py-2 m-1 rounded ${c1 === chart.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'}`}
                      onClick={() => setC1(chart.id)}
                    >
                      {chart.title} (BPM:{chart.bpm})
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-gray-500 text-center">
                  2P 譜面 (1Pと同じ)
                </div>
                <div className="max-h-60 overflow-y-auto p-2 bg-black/20 rounded-lg opacity-50">
                  {customCharts.map(chart => (
                    <button
                      key={chart.id}
                      disabled
                      className={`block w-full text-left px-4 py-2 m-1 rounded ${c1 === chart.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                    >
                      {chart.title} (BPM:{chart.bpm})
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              className="mt-6 px-8 py-3 bg-green-600 text-white rounded-xl disabled:bg-gray-500"
              disabled={!c1}
              onClick={() => nav(`/play2/custom/${c1}`)}
            >
              ゲーム開始
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-6">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >
        戻る
      </button>
      <h2 className="text-3xl font-bold mb-6 text-white drop-shadow text-center tracking-wide">
        二人プレイ 難易度選択
      </h2>
      <div className="flex flex-row gap-16 w-full max-w-3xl justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="mb-2 text-white font-semibold text-lg tracking-wide">
            1P 難易度
          </div>
          <div className="flex flex-col gap-4">
            {diffs.map(d => (
              <button
                key={d}
                className={`px-8 py-4 rounded-xl text-xl font-bold shadow-lg transition text-white ${p1 === d ? 'bg-blue-500 border-4 border-white' : 'bg-gray-200 text-black'}`}
                onClick={() => setP1(d)}
              >
                {d} (Lv.{song.difficulty[d].level})
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="mb-2 text-white font-semibold text-lg tracking-wide">
            2P 難易度
          </div>
          <div className="flex flex-col gap-4">
            {diffs.map(d => (
              <button
                key={d}
                className={`px-8 py-4 rounded-xl text-xl font-bold shadow-lg transition text-white ${p2 === d ? 'bg-red-500 border-4 border-white' : 'bg-gray-200 text-black'}`}
                onClick={() => setP2(d)}
              >
                {d} (Lv.{song.difficulty[d].level})
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        className="mt-8 px-8 py-4 bg-green-600 hover:bg-green-700 rounded-xl text-white text-xl font-bold shadow-lg"
        onClick={() => nav(`/play2/tutorial/${p1}/${p2}`)}
      >
        ゲーム開始
      </button>
    </div>
  )
}
