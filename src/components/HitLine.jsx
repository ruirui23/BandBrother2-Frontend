import { HIT_X } from '../constants'

export default function HitLine({ yOffset = 0 }) {
  return (
    <div
      className="w-16 h-16 rounded-full border-4 border-yellow-400 bg-transparent z-20"
      style={{ marginTop: yOffset }}
    />
  )
}
