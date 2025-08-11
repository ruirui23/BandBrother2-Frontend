import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Howl } from 'howler'
import { useScore } from '../store'
import useGameLoop from './useGameLoop'
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants'
import { playHitSound } from '../utils/soundEffects'

const JUDGE = { perfect: 24, good: 48 }

// キーとレーンのマッピング
const KEY_TO_LANE = {
  KeyD: 0,
  KeyF: 1,
  KeyJ: 2,
  KeyK: 3,
}
const VALID_KEYS = Object.keys(KEY_TO_LANE)

export default function useRhythmGame(songData, difficulty, onGameEnd) {
  const { add, reset, counts, score } = useScore()

  // songDataの構造を安全にチェック
  const difficulties = songData?.difficulty || {}
  const diffObj = difficulties[difficulty] || difficulties.Easy || { notes: [] }
  const rawNotes = useMemo(
    () => diffObj.notes ?? songData?.notes ?? [],
    [diffObj.notes, songData?.notes]
  )
  const offset = songData?.offset ?? 0

  const notesRef = useRef([])
  const [notes, setNotes] = useState([])

  // ノーツ初期化
  useEffect(() => {
    notesRef.current = rawNotes
      .sort((a, b) => a.time - b.time)
      .map(n => ({
        ...n,
        id: `${n.time}-${n.lane || 0}`,
        hit: false,
        missed: false,
      }))
    setNotes(notesRef.current)
  }, [rawNotes])
  const [started, setStarted] = useState(false)
  const [sound, setSound] = useState(null)
  const [time, setTime] = useState(0)
  const [gameState, setGameState] = useState('waiting')

  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState

  // 音声ファイル初期化
  useEffect(() => {
    const audioSrc = songData?.audio || ''
    const newSound = new Howl({
      src: [audioSrc],
      html5: true,
    })
    setSound(newSound)

    // クリーンアップ: 前の音声を停止・削除
    return () => {
      if (sound) {
        sound.stop()
        sound.unload()
      }
    }
  }, [songData?.audio, sound])

  // ゲーム初期化
  useEffect(() => {
    reset()
  }, [reset])

  // ゲームループ
  useGameLoop(() => {
    if (started && gameStateRef.current === 'playing' && sound) {
      setTime(sound.seek() || 0)
    }
  })

  // ゲーム開始
  const startGame = useCallback(() => {
    console.log('startGame called. Started:', started, 'Sound:', !!sound)
    if (!started && sound) {
      setStarted(true)
      setGameState('playing')
      sound.seek(0)
      sound.play()

      // オーディオコンテキストを有効化（ユーザーインタラクションが必要）
      console.log('Game started successfully! State set to playing.')
    }
  }, [started, sound])

  // 15秒でゲーム終了
  useEffect(() => {
    if (started && time >= 15 && gameState === 'playing' && sound) {
      setGameState('finished')
      sound.stop()
      if (onGameEnd) {
        onGameEnd({ counts, score, time })
      }
    }
  }, [time, started, gameState, counts, score, onGameEnd, sound])

  // キー入力判定
  const handleKeyPress = useCallback(
    e => {
      console.log(
        'Key pressed:',
        e.code,
        'Game state:',
        gameState,
        'Started:',
        started,
        'Valid key:',
        VALID_KEYS.includes(e.code)
      )

      if (gameState !== 'playing' || !started || !VALID_KEYS.includes(e.code))
        return

      const lane = KEY_TO_LANE[e.code]
      const currentTime = time

      console.log(
        'Looking for notes. Current time:',
        currentTime,
        'Lane:',
        lane,
        'Total notes:',
        notesRef.current.length
      )

      // 押されたキーに対応するレーンの中で、最も判定ラインに近いノーツを探す
      let bestMatchIndex = -1
      let minDistance = Infinity

      notesRef.current.forEach((n, index) => {
        if (n.lane !== lane || n.hit || n.missed) return

        const distance = Math.abs(
          HIT_X - (HIT_X + (n.time - currentTime - offset) * NOTE_SPEED)
        )

        if (distance < JUDGE.good && distance < minDistance) {
          minDistance = distance
          bestMatchIndex = index
        }
      })

      if (bestMatchIndex === -1) {
        // 対応レーンに叩けるノーツがなければ何もしない
        return
      }

      const note = notesRef.current[bestMatchIndex]
      if (minDistance < JUDGE.perfect) {
        add('perfect')
        console.log('Perfect hit!')
      } else {
        add('good')
        console.log('Good hit!')
      }

      // ノーツヒット音を再生
      console.log('About to call playHitSound...')
      playHitSound()
      console.log('Called playHitSound')

      note.hit = true
      setNotes([...notesRef.current]) // Force re-render
    },
    [time, started, gameState, add, offset]
  )

  // キーイベントリスナー
  useEffect(() => {
    console.log('Setting up key event listener...')

    const keyHandler = e => {
      console.log('Global key pressed:', e.code)
      handleKeyPress(e)
    }

    window.addEventListener('keydown', keyHandler)
    return () => {
      console.log('Removing key event listener...')
      window.removeEventListener('keydown', keyHandler)
    }
  }, [handleKeyPress])

  // ノーツ通過でmiss
  useEffect(() => {
    if (gameState !== 'playing' || !started) return
    let missedAny = false
    const updatedNotes = notesRef.current.map(n => {
      if (!n.hit && !n.missed && time - (n.time - offset) > 0.2) {
        add('miss')
        console.log('Miss detected!')
        console.log('About to call playHitSound for miss...')
        playHitSound() // ミス音を再生
        console.log('Called playHitSound for miss')
        missedAny = true
        return { ...n, missed: true }
      }
      return n
    })

    if (missedAny) {
      notesRef.current = updatedNotes
      setNotes([...notesRef.current])
    }
  }, [time, started, gameState, add, offset])

  // 描画対象ノーツ
  const visibleNotes = notes.filter(
    n =>
      !n.hit &&
      n.time - time < WINDOW_SEC &&
      HIT_X + (n.time - time - offset) * NOTE_SPEED > -100 &&
      HIT_X + (n.time - time - offset) * NOTE_SPEED < window.innerWidth + 100
  )

  return {
    notes: visibleNotes,
    time,
    offset,
    started,
    gameState,
    score,
    counts,
    sound,
    startGame,
    setGameState,
  }
}
