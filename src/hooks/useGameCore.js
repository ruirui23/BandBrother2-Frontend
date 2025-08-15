import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Howl } from 'howler'
import { useScore } from '../store'
import useGameLoop from './useGameLoop'
import { HIT_X, NOTE_SPEED, WINDOW_SEC } from '../constants'
import { playHitSound } from '../utils/soundEffects'

// 共通の判定定数
const JUDGE = { perfect: 24, good: 48 }

// デフォルトのキーとレーンのマッピング
const DEFAULT_KEY_TO_LANE = {
  KeyD: 0,
  KeyF: 1,
  KeyJ: 2,
  KeyK: 3,
}
const DEFAULT_VALID_KEYS = Object.keys(DEFAULT_KEY_TO_LANE)

/**
 * 共通ゲームロジック
 * シングルプレイ・マルチプレイ共通のコアゲーム機能を提供
 */
export default function useGameCore(songData, difficulty, onGameEnd, keyMaps) {
  const { add, reset, counts, score } = useScore() // スコア管理用のフック

  // キー設定
  const KEY_TO_LANE = keyMaps?.KEY_TO_LANE || DEFAULT_KEY_TO_LANE
  const VALID_KEYS = keyMaps?.VALID_KEYS || DEFAULT_VALID_KEYS

  // songDataの構造を安全にチェック
  const difficulties = songData?.difficulty || {}
  const diffObj = difficulties[difficulty] || difficulties.Easy || { notes: [] }
  const rawNotes = useMemo(
    () => diffObj.notes ?? songData?.notes ?? [],
    [diffObj.notes, songData?.notes]
  )
  const offset = songData?.offset ?? 0

  // ゲーム状態
  const notesRef = useRef([])
  const [notes, setNotes] = useState([])
  const [started, setStarted] = useState(false)
  const [time, setTime] = useState(0)
  const [gameState, setGameState] = useState('waiting')
  const [sound, setSound] = useState(null)

  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState

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
      newSound.stop()
      newSound.unload()
    }
  }, [songData?.audio])

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
      console.log('Game started successfully! State set to playing.')
    }
  }, [started, sound])

  // ゲーム終了 (曲終了時または全ノーツ処理完了時)
  useEffect(() => {
    if (started && gameState === 'playing' && sound) {
      const duration = sound.duration ? sound.duration() : null
      const allNotesProcessed = notesRef.current.every(n => n.hit || n.missed)
      
      // 曲が終了した場合、または全ノーツが処理された場合にゲーム終了
      if ((duration && time >= duration - 0.05) || allNotesProcessed) {
        setGameState('finished')
        sound.stop()
        if (onGameEnd) {
          onGameEnd({ counts, score, time })
        }
      }
    }
  }, [time, started, gameState, counts, score, onGameEnd, sound])

  // 判定結果コールバック用の状態
  const onJudgmentRef = useRef(() => {})
  const setOnJudgment = useCallback(callback => {
    onJudgmentRef.current = callback || (() => {})
  }, [])

  // 共通のノーツ判定ロジック
  const judgeNote = useCallback(
    (lane, currentTime) => {
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
        return null // ヒット可能なノーツなし
      }

      const note = notesRef.current[bestMatchIndex]
      let judgmentType = 'good'

      if (minDistance < JUDGE.perfect) {
        add('perfect')
        judgmentType = 'perfect'
      } else {
        add('good')
        judgmentType = 'good'
      }

      // 効果音を再生
      playHitSound()

      // 判定結果をコールバック
      onJudgmentRef.current(judgmentType)

      // ノーツを「ヒット済み」にマーク
      note.hit = true
      setNotes([...notesRef.current])

      return { judgmentType, note }
    },
    [offset, add, KEY_TO_LANE, VALID_KEYS]
  )

  // キー入力処理
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

      const result = judgeNote(lane, currentTime)
      if (result) {
        console.log(`${result.judgmentType} hit!`)
      }
    },
    [time, started, gameState, judgeNote]
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
        onJudgmentRef.current('miss') // 判定結果をコールバック
        playHitSound() // ミス音を再生
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
      !n.missed &&
      n.time - time < WINDOW_SEC &&
      HIT_X + (n.time - time - offset) * NOTE_SPEED > -100 &&
      HIT_X + (n.time - time - offset) * NOTE_SPEED < window.innerWidth + 100
  )

  return {
    // ゲーム状態
    notes: visibleNotes,
    time,
    offset,
    started,
    gameState,
    score,
    counts,
    sound,

    // メソッド
    startGame,
    setGameState,
    judgeNote,
    handleKeyPress,
    setOnJudgment,

    // 定数 (外部で必要な場合)
    JUDGE,
    KEY_TO_LANE,
    VALID_KEYS,
  }
}
