import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../firebase'
import {
  saveCustomChartScore,
  calculateAccuracy,
  getTopScoreForChart,
} from '../utils/scoreManager'

export default function Result() {
  const { state } = useLocation()
  const [showResult, setShowResult] = useState(false)
  const [user] = useAuthState(auth)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'success' | 'error'
  const [saveMessage, setSaveMessage] = useState('')
  const [rankings, setRankings] = useState([])
  const [rankingsLoading, setRankingsLoading] = useState(false)

  useEffect(() => {
    // 少し遅延させてから結果を表示
    const timer = setTimeout(() => setShowResult(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // カスタム楽曲のスコア保存
  useEffect(() => {
    const saveScore = async () => {
      // カスタム楽曲かつ認証済みユーザーの場合のみ保存
      if (!state?.chartId || !user || !state?.counts) return

      setSaveStatus('saving')

      const accuracy = calculateAccuracy(state.counts)
      const scoreData = {
        score: state.score || 0,
        perfect: state.counts.perfect || 0,
        good: state.counts.good || 0,
        miss: state.counts.miss || 0,
        accuracy,
      }

      const result = await saveCustomChartScore(
        state.chartId,
        user.uid,
        user.displayName || user.email || 'Anonymous',
        scoreData
      )

      if (result.success) {
        setSaveStatus('success')
        setSaveMessage(result.message)
      } else {
        setSaveStatus('error')
        setSaveMessage(result.message)
      }
    }

    saveScore()
  }, [state, user])

  // カスタム楽曲のランキング取得
  useEffect(() => {
    const fetchRankings = async () => {
      if (!state?.chartId) return

      setRankingsLoading(true)
      const result = await getTopScoreForChart(state.chartId)

      if (result.success) {
        setRankings(result.rankings)
      }
      setRankingsLoading(false)
    }

    fetchRankings()
  }, [state?.chartId])

  // マルチプレイ用の結果表示
  if (state && state.isMultiPlayer) {
    const { counts = {}, score = 0, opponentScore = 0 } = state
    const perfect = counts.perfect ?? 0
    const good = counts.good ?? 0
    const miss = counts.miss ?? 0
    const total = perfect + good + miss
    const accuracy =
      total > 0 ? Math.round(((perfect + good * 0.5) / total) * 100) : 0

    let result = '',
      color = ''
    if (score > opponentScore) {
      result = 'WIN'
      color = 'text-green-400'
    } else if (score < opponentScore) {
      result = 'LOSE'
      color = 'text-red-400'
    } else {
      result = 'DRAW'
      color = 'text-yellow-400'
    }

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div
          className={`flex flex-col items-center gap-8 transition-all duration-1000 ${
            showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className={`text-5xl font-bold ${color}`}>{result}</h1>

          <div className="flex flex-row items-start justify-center gap-16">
            {/* Your Result */}
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-4xl font-bold text-blue-300">あなた</h2>
              <div className="text-center">
                <div className="text-6xl font-bold text-yellow-400">
                  {score.toLocaleString()}
                </div>
                <div className="text-lg text-gray-300">SCORE</div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {perfect}
                  </div>
                  <div className="text-sm text-gray-400">Perfect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{good}</div>
                  <div className="text-sm text-gray-400">Good</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{miss}</div>
                  <div className="text-sm text-gray-400">Miss</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">
                  {accuracy}%
                </div>
                <div className="text-sm text-gray-400">Accuracy</div>
              </div>
            </div>

            <div className="w-px h-64 bg-gray-600"></div>

            {/* Opponent Result */}
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-4xl font-bold text-red-300">あいて</h2>
              <div className="text-center mt-8">
                <div className="text-6xl font-bold text-yellow-400">
                  {opponentScore.toLocaleString()}
                </div>
                <div className="text-lg text-gray-300">SCORE</div>
              </div>
            </div>
          </div>
          <Link
            to="/"
            className="mt-8 px-6 py-3 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-colors"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    )
  }

  // 二人プレイ用（ローカル）
  if (state && state.counts1 && state.counts2) {
    const { counts1, counts2, score1, score2 } = state
    const c1 = counts1
    const c2 = counts2
    const s1 = score1 ?? 0
    const s2 = score2 ?? 0

    const total1 = (c1.perfect ?? 0) + (c1.good ?? 0) + (c1.miss ?? 0)
    const accuracy1 =
      total1 > 0
        ? Math.round(
            (((c1.perfect ?? 0) + (c1.good ?? 0) * 0.5) / total1) * 100
          )
        : 0
    const total2 = (c2.perfect ?? 0) + (c2.good ?? 0) + (c2.miss ?? 0)
    const accuracy2 =
      total2 > 0
        ? Math.round(
            (((c2.perfect ?? 0) + (c2.good ?? 0) * 0.5) / total2) * 100
          )
        : 0

    let result1 = '',
      result2 = '',
      color1 = '',
      color2 = ''
    if (s1 > s2) {
      result1 = 'WIN'
      color1 = 'text-green-400'
      result2 = 'LOSE'
      color2 = 'text-red-400'
    } else if (s1 < s2) {
      result1 = 'LOSE'
      color1 = 'text-red-400'
      result2 = 'WIN'
      color2 = 'text-green-400'
    } else {
      result1 = 'DRAW'
      color1 = 'text-yellow-400'
      result2 = 'DRAW'
      color2 = 'text-yellow-400'
    }

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div
          className={`flex flex-col items-center gap-8 transition-all duration-1000 ${
            showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className="text-5xl font-bold">RESULT</h1>

          <div className="flex flex-row items-start justify-center gap-16">
            {/* Player 1 Result */}
            <div className="flex flex-col items-center gap-4">
              <h2 className={`text-4xl font-bold ${color1}`}>
                1P <span className="ml-2">{result1}</span>
              </h2>
              <div className="text-center">
                <div className="text-6xl font-bold text-yellow-400">
                  {s1.toLocaleString()}
                </div>
                <div className="text-lg text-gray-300">SCORE</div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {c1.perfect ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Perfect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {c1.good ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Good</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {c1.miss ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Miss</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">
                  {accuracy1}%
                </div>
                <div className="text-sm text-gray-400">Accuracy</div>
              </div>
            </div>

            <div className="w-px h-64 bg-gray-600"></div>

            {/* Player 2 Result */}
            <div className="flex flex-col items-center gap-4">
              <h2 className={`text-4xl font-bold ${color2}`}>
                2P <span className="ml-2">{result2}</span>
              </h2>
              <div className="text-center">
                <div className="text-6xl font-bold text-yellow-400">
                  {s2.toLocaleString()}
                </div>
                <div className="text-lg text-gray-300">SCORE</div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {c2.perfect ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Perfect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {c2.good ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Good</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {c2.miss ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Miss</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">
                  {accuracy2}%
                </div>
                <div className="text-sm text-gray-400">Accuracy</div>
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="mt-8 px-6 py-3 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-colors"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    )
  }

  // 1人プレイ用
  const { counts = {}, score = 0 } = state || {}
  const perfect = counts.perfect ?? 0
  const good = counts.good ?? 0
  const miss = counts.miss ?? 0
  const total = perfect + good + miss
  const accuracy =
    total > 0 ? Math.round(((perfect + good * 0.5) / total) * 100) : 0

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div
        className={`flex flex-col items-center gap-6 transition-all duration-1000 ${
          showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* タイトル */}
        <h1 className="text-4xl font-bold">RESULT</h1>

        {/* メインスコア */}
        <div className="text-center">
          <div className="text-6xl font-bold text-yellow-400 mb-2">
            {score.toLocaleString()}
          </div>
          <div className="text-lg text-gray-300">TOTAL SCORE</div>
        </div>

        {/* 判定詳細 */}
        <div className="flex gap-8 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{perfect}</div>
            <div className="text-sm text-gray-400">Perfect</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{good}</div>
            <div className="text-sm text-gray-400">Good</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{miss}</div>
            <div className="text-sm text-gray-400">Miss</div>
          </div>
        </div>

        {/* 精度率 */}
        <div className="text-center mb-6">
          <div className="text-xl font-bold text-purple-400">{accuracy}%</div>
          <div className="text-sm text-gray-400">Accuracy</div>
        </div>

        {/* スコア保存状況（カスタム楽曲の場合のみ） */}
        {state?.chartId && (
          <div className="text-center mb-6">
            {saveStatus === 'saving' && (
              <div className="text-yellow-400 text-sm">スコアを保存中...</div>
            )}
            {saveStatus === 'success' && (
              <div className="text-green-400 text-sm">✅ {saveMessage}</div>
            )}
            {saveStatus === 'error' && (
              <div className="text-red-400 text-sm">❌ {saveMessage}</div>
            )}
            {!user && (
              <div className="text-gray-400 text-sm">
                ログインするとスコアが保存されます
              </div>
            )}
          </div>
        )}

        {/* ランキング情報（カスタム楽曲の場合のみ） */}
        {state?.chartId && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-lg font-bold text-center text-white mb-4">
              🏆 ランキング TOP3
            </h3>

            {rankingsLoading && (
              <div className="text-center text-gray-400 text-sm">
                ランキングを取得中...
              </div>
            )}

            {!rankingsLoading && rankings.length > 0 && (
              <div className="space-y-3">
                {rankings.map(ranking => {
                  const getRankEmoji = rank => {
                    switch (rank) {
                      case 1:
                        return '🥇'
                      case 2:
                        return '🥈'
                      case 3:
                        return '🥉'
                      default:
                        return '🏅'
                    }
                  }

                  const getRankColor = rank => {
                    switch (rank) {
                      case 1:
                        return 'text-yellow-400'
                      case 2:
                        return 'text-gray-300'
                      case 3:
                        return 'text-amber-600'
                      default:
                        return 'text-gray-400'
                    }
                  }

                  return (
                    <div
                      key={ranking.userId}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {getRankEmoji(ranking.rank)}
                        </span>
                        <div>
                          <div className="font-semibold text-white">
                            {ranking.userName}
                          </div>
                          <div className="text-xs text-gray-400">
                            Perfect: {ranking.perfect} | Good: {ranking.good} |
                            Miss: {ranking.miss}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xl font-bold ${getRankColor(ranking.rank)}`}
                        >
                          {ranking.score.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          精度: {ranking.accuracy}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!rankingsLoading && rankings.length === 0 && (
              <div className="text-center text-gray-400 text-sm">
                まだ記録がありません
              </div>
            )}
          </div>
        )}

        {/* ホームに戻るボタン */}
        <Link
          to="/"
          className="px-6 py-3 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  )
}
