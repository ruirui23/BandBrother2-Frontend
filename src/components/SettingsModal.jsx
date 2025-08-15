import React, { useState } from 'react'
import { useGameLayout } from '../store'

const defaultKeys = {
  single: ['D', 'F', 'J', 'K'],
  p1: ['Q', 'W', 'E', 'R'],
  p2: ['U', 'I', 'O', 'P'],
}

export default function SettingsModal({ onClose, onSave, initialKeys }) {
  const { isVertical, toggleDirection } = useGameLayout()
  const mergedKeys = { ...defaultKeys, ...(initialKeys || {}) }
  const [keys, setKeys] = useState(mergedKeys)
  const [editing, setEditing] = useState({ player: null, lane: null })

  const handleKeyDown = e => {
    if (editing.player && editing.lane !== null) {
      setKeys(prev => ({
        ...prev,
        [editing.player]: prev[editing.player].map((k, i) =>
          i === editing.lane ? e.key.toUpperCase() : k
        ),
      }))
      setEditing({ player: null, lane: null })
    }
  }

  React.useEffect(() => {
    if (editing.player !== null) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [editing])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 min-w-[340px] relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <span className="material-icons">close</span>
        </button>
        <h2 className="text-xl font-bold mb-4">設定</h2>
        <div className="flex items-center gap-4 mb-6">
          <span className="font-bold">縦画面/横画面</span>
          <button
            className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 transition-all duration-200 shadow ${isVertical ? 'bg-blue-500 text-white border-blue-700 scale-110' : 'bg-gray-200 text-gray-700 border-gray-400'}`}
            onClick={toggleDirection}
          >
            <span className="material-icons">
              {isVertical ? 'screen_lock_portrait' : 'screen_lock_landscape'}
            </span>
            {isVertical ? '縦画面' : '横画面'}
          </button>
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-2">キー設定</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-20 font-bold">一人プレイ</span>
              {keys.single.map((k, i) => (
                <button
                  key={i}
                  className={`px-3 py-2 rounded border text-lg font-mono transition-all duration-150 ${editing.player === 'single' && editing.lane === i ? 'bg-yellow-200 border-yellow-500' : 'bg-gray-100 border-gray-400 hover:bg-blue-100'}`}
                  onClick={() => setEditing({ player: 'single', lane: i })}
                >
                  {editing.player === 'single' && editing.lane === i
                    ? '入力...'
                    : k}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-10 font-bold">1P</span>
              {keys.p1.map((k, i) => (
                <button
                  key={i}
                  className={`px-3 py-2 rounded border text-lg font-mono transition-all duration-150 ${editing.player === 'p1' && editing.lane === i ? 'bg-yellow-200 border-yellow-500' : 'bg-gray-100 border-gray-400 hover:bg-blue-100'}`}
                  onClick={() => setEditing({ player: 'p1', lane: i })}
                >
                  {editing.player === 'p1' && editing.lane === i
                    ? '入力...'
                    : k}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-10 font-bold">2P</span>
              {keys.p2.map((k, i) => (
                <button
                  key={i}
                  className={`px-3 py-2 rounded border text-lg font-mono transition-all duration-150 ${editing.player === 'p2' && editing.lane === i ? 'bg-yellow-200 border-yellow-500' : 'bg-gray-100 border-gray-400 hover:bg-blue-100'}`}
                  onClick={() => setEditing({ player: 'p2', lane: i })}
                >
                  {editing.player === 'p2' && editing.lane === i
                    ? '入力...'
                    : k}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
            onClick={() => onSave(keys)}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
