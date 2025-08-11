import React from 'react'

const NOTE_SIZE = 64 // 判定枠(64px)に合わせる

// レーンごとの色を定義
const LANE_COLORS = {
  0: {
    // オレンジ
    gradient: 'radial-gradient(circle at 60% 40%, #FFD580 40%, #FF8C00 100%)',
    border: '4px solid gold',
  },
  1: {
    // ピンク
    gradient: 'radial-gradient(circle at 60% 40%, #FFC0CB 40%, #FF69B4 100%)',
    border: '4px solid #FF1493',
  },
  2: {
    // 水色
    gradient: 'radial-gradient(circle at 60% 40%, #B0E0E6 40%, #00BFFF 100%)',
    border: '4px solid #1E90FF',
  },
  3: {
    // 黄緑
    gradient: 'radial-gradient(circle at 60% 40%, #D2FFD2 40%, #7CFC00 100%)',
    border: '4px solid #32CD32',
  },
}

const Note = ({ x, y, lane = 0 }) => {
  // laneを確実に数値として扱う
  const laneIndex = parseInt(lane, 10) || 0
  const colors = LANE_COLORS[laneIndex] || LANE_COLORS[0]

  return (
    <div
      style={{
        position: 'absolute',
        left: x - NOTE_SIZE / 2,
        top: y - NOTE_SIZE / 2,
        width: `${NOTE_SIZE}px`,
        height: `${NOTE_SIZE}px`,
        background: colors.gradient,
        border: colors.border,
        borderRadius: '50%',
        zIndex: 10,
      }}
    />
  )
}

export default React.memo(Note)
