import { useEffect, useRef } from 'react'

export default function useGameLoop(callback) {
  const last = useRef(performance.now())

  useEffect(() => {
    let animationFrameId
    const loop = () => {
      const dt = (performance.now() - last.current) / 1000 // 秒
      last.current = performance.now()
      callback(dt)
      animationFrameId = requestAnimationFrame(loop)
    }
    animationFrameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [callback])
}
