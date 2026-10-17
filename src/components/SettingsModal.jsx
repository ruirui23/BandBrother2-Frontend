import React, { useState } from 'react'
import { ALL_SE_FILES } from '../utils/soundEffects'
import { useGameLayout } from '../store'
import { useWiiboard } from '../context/WiiboardContext'
import useSimpleJoycon from '../hooks/useSimpleJoycon'
import {
  JUDGE_OFFSET_MIN,
  JUDGE_OFFSET_MAX,
  getLaneJudgeOffsetsMs,
  setLaneJudgeOffsetMs,
} from '../utils/judgeOffset'

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
  // SE選択
  const [seFile, setSeFile] = useState(() => {
    try {
      return localStorage.getItem('seFileName') || '/audio/po.mp3'
    } catch {
      return '/audio/po.mp3'
    }
  })
  // ノーツスピード倍率
  const speedOptions = [1.0, 1.5, 2.0, 4.0]
  const [noteSpeed, setNoteSpeed] = useState(() => {
    try {
      return parseFloat(localStorage.getItem('noteSpeedMultiplier')) || 1.0
    } catch {
      return 1.0
    }
  })

  // ノーツ判定調整(レーンごとのms)
  const [laneOffsets, setLaneOffsets] = useState(getLaneJudgeOffsetsMs)

  const { enabled, toggleEnabled } = useWiiboard()

  // ジョイコン機能
  const {
    isConnected,
    isConnecting,
    error: joyconError,
    connect,
    disconnect,
  } = useSimpleJoycon()

  const handleSEChange = e => {
    setSeFile(e.target.value)
    localStorage.setItem('seFileName', e.target.value)
  }

  // ノーツスピード倍率変更
  const handleSpeedChange = e => {
    const val = parseFloat(e.target.value)
    setNoteSpeed(val)
    localStorage.setItem('noteSpeedMultiplier', val)
  }

  const handleLaneOffsetChange = (lane, e) => {
    setLaneOffsets(setLaneJudgeOffsetMs(lane, parseInt(e.target.value, 10)))
  }

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
        <h2 className="text-xl font-bold mb-4">⚙設定</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="mb-4">
            <div className="font-semibold mb-2">効果音（SE）</div>
            <select
              className="w-full px-3 py-2 border rounded"
              value={seFile}
              onChange={handleSEChange}
            >
              {ALL_SE_FILES.map(f => (
                <option key={f} value={f}>
                  {f.replace('/audio/', '').replace('.mp3', '')}
                </option>
              ))}
            </select>
          </div>
          <span className="font-bold">縦画面/横画面</span>
          <button
            className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 transition-all duration-200 shadow ${isVertical ? 'bg-blue-500 text-white border-blue-700 scale-110' : 'bg-gray-200 text-gray-700 border-gray-400'}`}
            onClick={toggleDirection}
          >
            {isVertical ? '縦画面' : '横画面'}
          </button>
        </div>
        {/* ノーツスピード設定 */}
        <div className="mb-6">
          <div className="font-semibold mb-2">ノーツスピード</div>
          <select
            className="w-full px-3 py-2 border rounded"
            value={noteSpeed}
            onChange={handleSpeedChange}
          >
            {speedOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt}倍
              </option>
            ))}
          </select>
        </div>
        {/* ノーツ判定調整 */}
        <div className="mb-6">
          <div className="font-semibold mb-2">ノーツ判定調整</div>
          <div className="flex flex-col gap-2">
            {laneOffsets.map((ms, lane) => (
              <div key={lane} className="flex items-center gap-2">
                <span className="w-14 font-mono font-bold">
                  {lane + 1}レーン({keys.single[lane]})
                </span>
                <input
                  type="range"
                  className="flex-1"
                  min={JUDGE_OFFSET_MIN}
                  max={JUDGE_OFFSET_MAX}
                  step={5}
                  value={ms}
                  onChange={e => handleLaneOffsetChange(lane, e)}
                />
                <span className="w-16 text-right font-mono">
                  {ms > 0 ? '+' : ''}
                  {ms}ms
                </span>
              </div>
            ))}
          </div>
          <div className="text-gray-600 text-sm mt-1">
            キーボード・Joy-Con・Wiiバランスボードなど、入力デバイスごとの遅延差をレーン単位で補正します。
            + で判定を遅らせ、− で早めます。
          </div>
        </div>
        {/* WebSocket連携設定 */}
        <div className="flex items-center gap-4 mb-6">
          <span className="font-bold">WiiBoard WebSocket連携</span>
          <button
            className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 transition-all duration-200 shadow ${enabled ? 'bg-green-500 text-white border-green-700 scale-110' : 'bg-gray-200 text-gray-700 border-gray-400'}`}
            onClick={toggleEnabled}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Joy-Con設定 */}
        <div className="mb-6">
          <div className="font-bold mb-2">🎮 Joy-Con接続</div>
          <div className="flex items-center gap-4">
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
                <span className="text-green-600 font-semibold">
                  🎮 接続済み
                </span>
                <button
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  onClick={disconnect}
                >
                  切断
                </button>
              </div>
            )}
          </div>
          {joyconError && (
            <div className="text-red-600 text-sm mt-2">{joyconError}</div>
          )}
          <div className="text-gray-600 text-sm mt-2">
            Aボタンで4番目のレーン（{keys.single[3]}キー）を操作できます
          </div>
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
