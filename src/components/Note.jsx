export default function Note({ x }) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full"
      style={{
        left: x,
        backgroundColor: '#f59e42',      // オレンジ
        border: '8px solid #fff',        // 太く
        zIndex: 10,                      // 前面に
      }}
    />
  );
}
