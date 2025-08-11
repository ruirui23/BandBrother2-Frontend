import { HIT_X } from '../constants'

export default function HitLine({ yOffset = 0 }) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4 border-yellow-400 bg-transparent z-20"
      style={{ left: HIT_X - 32, top: `calc(50% + ${yOffset}px)` }} // 中心合わせ＋オフセット
    />
  )
}
