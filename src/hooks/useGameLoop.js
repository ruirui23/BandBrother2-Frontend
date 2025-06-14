import { useEffect, useRef } from 'react';

export default function useGameLoop(callback) {
  const last = useRef(performance.now());

  useEffect(() => {
    let id;
    const loop = now => {
      const dt = (now - last.current) / 1000; // 秒
      last.current = now;
      callback(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [callback]);
}
