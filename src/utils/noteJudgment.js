import { HIT_X, NOTE_SPEED } from '../constants'

const JUDGE = { perfect: 24, good: 48 }

export function findHittableNote(notes, time, offset) {
  return notes.findIndex(n => {
    if (n.hit) return false
    const x = HIT_X + (n.time - time - offset) * NOTE_SPEED
    return Math.abs(x - HIT_X) < JUDGE.good
  })
}

export function judgeNoteHit(noteTime, currentTime, offset) {
  const x = HIT_X + (noteTime - currentTime - offset) * NOTE_SPEED
  const distance = Math.abs(x - HIT_X)

  if (distance < JUDGE.perfect) {
    return 'perfect'
  } else if (distance < JUDGE.good) {
    return 'good'
  }
  return null
}

export function shouldNoteMiss(note, currentTime) {
  return !note.hit && currentTime - note.time > 0.2 && !note.missed
}

export function getVisibleNotes(notes, time, offset, windowSec = 4) {
  return notes.filter(
    n =>
      !n.hit &&
      n.time - time < windowSec &&
      HIT_X + (n.time - time - offset) * NOTE_SPEED > -100 &&
      HIT_X + (n.time - time - offset) * NOTE_SPEED < window.innerWidth + 100
  )
}
