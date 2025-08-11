import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants';
import Note from './Note';
import HitLine from './HitLine';

// 4レーンのY座標を定義
const LANE_Y_POSITIONS = [-96, -32, 32, 96]; 

export default function RhythmGameEngine({ notes, time, offset, children }) {
  const screenCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  
  // 表示範囲内のノーツをフィルタリング
  const visibleNotes = notes.filter(
    n => !n.hit && !n.missed && Math.abs(n.time - time - offset) < WINDOW_SEC
  );

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {children}
      
      {/* 4本の判定ライン */}
      {LANE_Y_POSITIONS.map((y, index) => (
        <div key={index} style={{ top: `calc(50% + ${y}px)`}} className="absolute left-0 right-0 transform -translate-y-1/2">
          <HitLine lane={index} />
        </div>
      ))}

      {/* ノーツ表示 */}
      {visibleNotes.map((n) => {
        const yPos = screenCenterY + LANE_Y_POSITIONS[n.lane || 0];
        return (
          <Note
            key={`${n.time}-${n.lane || 0}`}
            x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
            y={yPos}
            lane={n.lane || 0}
          />
        );
      })}
    </div>
  );
}