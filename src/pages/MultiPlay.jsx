import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import song from '../data/tutorial.json'
import useRhythmGame from '../hooks/useRhythmGame'
import RhythmGameEngine from '../components/RhythmGameEngine'

export default function MultiPlay() {
  const { roomId, difficulty = 'Easy' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // 認証状態
  const [user, setUser] = useState(null)

  // 楽曲データ
  const [currentSong, setCurrentSong] = useState(song)
  const [loading, setLoading] = useState(false)

  // location.stateから楽曲データを取得
  const musicData = useMemo(() => location.state || {}, [location.state])

  // WebSocket接続
  const wsRef = useRef(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [opponentScore, setOpponentScore] = useState(0)
  const [gameStartSignal, setGameStartSignal] = useState(false)
  const [gameResultData, setGameResultData] = useState(null)

  // Firebase認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        navigate('/')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  // 楽曲データの読み込み
  useEffect(() => {
    const loadMusicData = async () => {
      if (musicData.musicType === 'custom' && musicData.chartId) {
        setLoading(true)
        try {
          const chartDoc = await getDoc(doc(db, 'charts', musicData.chartId))
          if (chartDoc.exists()) {
            const chartData = chartDoc.data()
            // カスタム楽曲データの構造を調整
            const adaptedChart = {
              ...chartData,
              difficulty: chartData.difficulty || {
                Easy: { notes: chartData.notes || [], level: 1 },
              },
            }
            setCurrentSong(adaptedChart)
          } else {
            console.error('Chart not found')
            setCurrentSong(song) // フォールバック
          }
        } catch (error) {
          console.error('Error loading chart:', error)
          setCurrentSong(song) // フォールバック
        }
        setLoading(false)
      } else if (musicData.musicData) {
        setCurrentSong(musicData.musicData)
      }
    }

    loadMusicData()
  }, [musicData])

  // リズムゲーム処理（currentSongが有効な場合のみ）
  const rhythmGame = useRhythmGame(
    currentSong || song,
    difficulty,
    gameData => {
      // WebSocketでゲーム終了通知
      if (wsRef.current && wsConnected && user) {
        wsRef.current.send(
          JSON.stringify({
            type: 'game_end',
            roomId: roomId,
            finalScore: gameData.score,
            playerId: user.uid,
          })
        )
      }
    }
  )

  // WebSocket接続
  useEffect(() => {
    if (!user) return

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8080'}/ws`
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      console.log('WebSocket接続成功')
      setWsConnected(true)
      wsRef.current.send(
        JSON.stringify({
          type: 'join',
          roomId: roomId,
          difficulty: difficulty,
          playerId: user.uid,
        })
      )
    }

    wsRef.current.onmessage = event => {
      const data = JSON.parse(event.data)
      console.log('WebSocket受信:', data)

      switch (data.type) {
        case 'game_start':
          setGameStartSignal(true)
          break
        case 'score_broadcast':
          if (data.scores && user) {
            Object.keys(data.scores).forEach(playerId => {
              if (playerId !== user.uid) {
                setOpponentScore(data.scores[playerId])
              }
            })
          }
          break
        case 'game_result':
          setGameResultData(data)
          break
      }
    }

    wsRef.current.onclose = () => {
      console.log('WebSocket接続終了')
      setWsConnected(false)
    }

    wsRef.current.onerror = error => {
      console.error('WebSocket エラー:', error)
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [roomId, difficulty, user])

  // ゲーム開始シグナルの処理
  useEffect(() => {
    if (gameStartSignal) {
      rhythmGame.setGameState('playing')
      rhythmGame.startGame()
      setGameStartSignal(false)
    }
  }, [gameStartSignal, rhythmGame])

  // バックエンドにスコアを送信
  const sendScoreToBackend = useCallback(async (finalScore, isWin) => {
    const scoreData = {
      uid: user.uid,
      room_id: parseInt(roomId),
      score: Math.max(0, finalScore), // 負のスコアを0にする
      is_win: isWin,
    }

    console.log('送信データ:', scoreData)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_RAILS_URL}/api/scores`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scoreData),
          credentials: 'include',
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log('スコア送信成功:', data)
        if (data.highscore_updated) {
          console.log('🎉 ハイスコア更新！新記録:', data.current_highscore)
        } else {
          console.log(
            'ハイスコア更新なし。現在のハイスコア:',
            data.current_highscore
          )
        }
      } else {
        const errorData = await response.json()
        console.error('スコア送信失敗:', response.status, errorData)
      }
    } catch (error) {
      console.error('スコア送信エラー:', error)
    }
  }, [user, roomId])

  // ゲーム結果の処理
  useEffect(() => {
    if (gameResultData) {
      rhythmGame.setGameState('finished')
      rhythmGame.sound.stop()

      // 勝敗判定
      const isWin = !gameResultData.tie && gameResultData.winner === user.uid

      // バックエンドにスコアを送信
      sendScoreToBackend(rhythmGame.score, isWin)

      navigate('/result', {
        state: {
          counts: rhythmGame.counts,
          score: rhythmGame.score,
          opponentScore: gameResultData.scores
            ? Object.values(gameResultData.scores).find(
                (_, i) => Object.keys(gameResultData.scores)[i] !== user.uid
              )
            : 0,
          isMultiPlayer: true,
          winner: gameResultData.winner,
          tie: gameResultData.tie,
        },
      })
      setGameResultData(null)
    }
  }, [gameResultData, rhythmGame, navigate, user, roomId, sendScoreToBackend])

  // スコア更新時に相手に送信
  useEffect(() => {
    if (
      rhythmGame.gameState === 'playing' &&
      wsRef.current &&
      wsConnected &&
      user
    ) {
      wsRef.current.send(
        JSON.stringify({
          type: 'score_update',
          roomId: roomId,
          score: rhythmGame.score,
          playerId: user.uid,
        })
      )
    }
  }, [rhythmGame.score, rhythmGame.gameState, wsConnected, roomId, user])

  if (loading || !currentSong) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white text-2xl">
        楽曲データ読み込み中...
      </div>
    )
  }

  return (
    <RhythmGameEngine
      notes={rhythmGame.notes}
      time={rhythmGame.time}
      offset={rhythmGame.offset}
    >
      {/* 接続状態表示 */}
      <div className="absolute top-4 left-4 text-white z-10">
        <div>WebSocket: {wsConnected ? '接続中' : '切断'}</div>
        <div>ルーム: {roomId}</div>
        <div>難易度: {difficulty}</div>
        <div>状態: {rhythmGame.gameState}</div>
      </div>

      {/* スコア表示 */}
      <div className="absolute top-4 right-4 text-white z-10">
        <div>自分: {rhythmGame.score}</div>
        <div>相手: {opponentScore}</div>
      </div>

      {/* 待機画面 */}
      {rhythmGame.gameState === 'waiting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white z-20">
          <div className="text-center">
            <h2 className="text-3xl mb-4">対戦相手を待っています...</h2>
            <p>相手が準備できたらゲーム開始します</p>
          </div>
        </div>
      )}
    </RhythmGameEngine>
  )
}
