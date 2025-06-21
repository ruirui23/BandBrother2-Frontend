import { HIT_X, NOTE_SPEED } from '../constants';
import Note from './Note';
import HitLine from './HitLine';

export default function RhythmGameEngine({ notes, time, offset, children }) {
  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {children}
      
      {/* ゲーム画面 */}
      {notes.map((n) => (
        <Note
          key={n.time}
          x={HIT_X + (n.time - time - offset) * NOTE_SPEED}
        />
      ))}
      <HitLine />
    </div>
  );
}