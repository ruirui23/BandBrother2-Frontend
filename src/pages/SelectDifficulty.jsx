import { useNavigate } from 'react-router-dom'
import song from '../data/tutorial.json'
import { useEffect, useState } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

export default function SelectDifficulty() {
  const nav = useNavigate()
  const diffs = Object.keys(song.difficulty)
  const [_CUSTOM_CHARTS, setCustomCharts] = useState([])
  const [_SHOW_CUSTOM, _SET_SHOW_CUSTOM] = useState(false)

  useEffect(() => {
    // Firebaseからカスタム譜面を取得（ログインユーザーのみ）
    const fetchCharts = async () => {
      const uid = auth.currentUser?.uid
      if (!uid) {
        setCustomCharts([])
        return
      }
      const chartsQuery = query(
        collection(db, 'charts'),
        where('createdBy', '==', uid)
      )
      const snap = await getDocs(chartsQuery)
      setCustomCharts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    }
    fetchCharts()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 gap-6">
      <button
        className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30"
        onClick={() => nav(-1)}
      >
        戻る
      </button>
      <h2 className="text-3xl font-bold mb-6 text-white drop-shadow">
        難易度を選択
      </h2>
      {!_SHOW_CUSTOM && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {diffs.map((d, i) => (
            <button
              key={d}
              className={`px-6 py-4 rounded-xl text-xl font-bold shadow-lg transition text-white ${i === 0 ? 'bg-green-500 hover:bg-green-600' : i === 1 ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-500 hover:bg-red-600'}`}
              onClick={() => nav(`/play/tutorial/${d}`)}
            >
              {d} (Lv.{song.difficulty[d].level})
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
