import React from 'react';
import { HIT_X } from '../constants';

const NOTE_SIZE = 64; // 判定枠(64px)に合わせる

const Note = ({ x, yOffset = 0 }) => {
  // 判定枠の中心に合わせる
  const y = `calc(50% + ${yOffset}px - ${NOTE_SIZE / 2}px)`;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - NOTE_SIZE / 2,
        top: y,
        width: `${NOTE_SIZE}px`,
        height: `${NOTE_SIZE}px`,
        background: 'radial-gradient(circle at 60% 40%, #FFD580 40%, #FF8C00 100%)',
        border: '4px solid gold',
        borderRadius: '50%',
        zIndex: 10,
        transition: 'left 0.03s linear',
      }}
    />
  );
};

export default Note;
