export default function Note({ x, yOffset = 0 }) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full"
      style={{
        left: x,
        top: `calc(50% + ${yOffset}px)`,
        backgroundColor: '#f59e42',      // オレンジ
        border: '8px solid #fff',        // 太く
        zIndex: 10,                      // 前面に
      }}
    />
  );
}
