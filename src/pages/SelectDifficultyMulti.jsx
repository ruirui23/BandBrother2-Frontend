import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

const SelectDifficultyMulti = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedDifficulty, setSelectedDifficulty] = useState('Easy')

  // 楽曲選択データを取得
  const musicData = location.state || {}

  const difficulties = [
    { name: 'Easy', color: '#43a047' },
    { name: 'Normal', color: '#ff9800' },
    { name: 'Hard', color: '#f44336' },
  ]

  const handleStartGame = () => {
    // マルチプレイページに遷移（roomId、難易度、楽曲データを渡す）
    navigate(`/multi-play/${roomId}/${selectedDifficulty}`, {
      state: {
        ...musicData,
        difficulty: selectedDifficulty,
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-center mb-10">難易度選択</h1>
      <p className="text-lg mb-4">ルームID: {roomId}</p>
      {musicData.musicData && (
        <div className="mb-6 p-4 bg-blue-100 rounded-lg">
          <p className="font-bold">
            選択楽曲: {musicData.musicData.title || '楽曲名不明'}
          </p>
          <p>
            タイプ:{' '}
            {musicData.musicType === 'tutorial' ? 'チュートリアル' : 'カスタム'}
          </p>
        </div>
      )}

      <div className="grid gap-4 mb-8">
        {difficulties.map(diff => (
          <button
            key={diff.name}
            onClick={() => setSelectedDifficulty(diff.name)}
            className={`px-8 py-4 rounded-lg text-white font-bold text-xl transition-all ${
              selectedDifficulty === diff.name
                ? 'scale-110 shadow-lg'
                : 'hover:scale-105'
            }`}
            style={{
              backgroundColor: diff.color,
              opacity: selectedDifficulty === diff.name ? 1 : 0.7,
            }}
          >
            {diff.name}
          </button>
        ))}
      </div>

      <button
        onClick={handleStartGame}
        className="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-xl hover:bg-blue-700 transition-colors"
      >
        ゲーム開始
      </button>
    </div>
  )
}

export default SelectDifficultyMulti
