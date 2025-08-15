import { useNavigate } from 'react-router-dom'

export default function TutorialMenu() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-black to-blue-900">
      <h2 className="text-3xl font-bold text-white mb-8">チュートリアル譜面</h2>
      <button
        className="w-72 py-4 mb-4 rounded-lg bg-blue-600 text-white text-2xl font-bold shadow-lg hover:bg-blue-700 transition"
        onClick={() => navigate('/play/tutorial/Easy')}
      >
        🎮 一人プレイ
      </button>
      <button
        className="w-72 py-4 mb-4 rounded-lg bg-green-600 text-white text-2xl font-bold shadow-lg hover:bg-green-700 transition"
        onClick={() => navigate('/twoplayer/play/tutorial/Easy')}
      >
        🎮 二人プレイ
      </button>
      <button
        className="w-72 py-2 mt-8 rounded bg-gray-600 text-white"
        onClick={() => navigate('/')}
      >
        ← 戻る
      </button>
    </div>
  )
}
