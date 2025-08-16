import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * カスタム楽曲のスコアをFirestoreに保存する
 * @param {string} chartId - 楽曲ID
 * @param {string} userId - ユーザーID
 * @param {string} userName - ユーザー名
 * @param {Object} scoreData - スコアデータ
 * @param {number} scoreData.score - 総スコア
 * @param {number} scoreData.perfect - Perfect数
 * @param {number} scoreData.good - Good数
 * @param {number} scoreData.miss - Miss数
 * @param {number} scoreData.accuracy - 精度（%）
 * @returns {Promise<{success: boolean, isNewRecord: boolean, message: string}>}
 */
export async function saveCustomChartScore(
  chartId,
  userId,
  userName,
  scoreData
) {
  try {
    const rankingDocRef = doc(db, 'charts', chartId, 'rankings', userId)

    // 既存スコアを確認
    const existingDoc = await getDoc(rankingDocRef)
    const existingScore = existingDoc.exists() ? existingDoc.data().score : 0

    // 新しいスコアが既存スコアより高い場合のみ保存
    if (scoreData.score > existingScore) {
      await setDoc(rankingDocRef, {
        score: scoreData.score,
        perfect: scoreData.perfect,
        good: scoreData.good,
        miss: scoreData.miss,
        accuracy: scoreData.accuracy,
        userName: userName,
        timestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      return {
        success: true,
        isNewRecord: true,
        message: existingDoc.exists()
          ? `新記録！ ${existingScore} → ${scoreData.score}`
          : '初回記録を保存しました！',
      }
    } else {
      return {
        success: true,
        isNewRecord: false,
        message: `現在の最高記録: ${existingScore} （今回: ${scoreData.score}）`,
      }
    }
  } catch (error) {
    console.error('スコア保存エラー:', error)
    return {
      success: false,
      isNewRecord: false,
      message: 'スコアの保存に失敗しました',
    }
  }
}

/**
 * 精度を計算する
 * @param {Object} counts - 判定回数
 * @param {number} counts.perfect - Perfect数
 * @param {number} counts.good - Good数
 * @param {number} counts.miss - Miss数
 * @returns {number} 精度（%、小数点第1位まで）
 */
export function calculateAccuracy(counts) {
  const total = counts.perfect + counts.good + counts.miss
  if (total === 0) return 0
  return Math.round(((counts.perfect + counts.good * 0.5) / total) * 1000) / 10
}

/**
 * 楽曲の上位3名のスコアを取得する
 * @param {string} chartId - 楽曲ID
 * @returns {Promise<{success: boolean, rankings: Array, message: string}>}
 */
export async function getTopScoreForChart(chartId) {
  try {
    const rankingsRef = collection(db, 'charts', chartId, 'rankings')
    const q = query(rankingsRef, orderBy('score', 'desc'), limit(3))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return {
        success: true,
        rankings: [],
        message: 'まだスコアが記録されていません'
      }
    }
    
    const rankings = querySnapshot.docs.map((doc, index) => {
      const data = doc.data()
      return {
        rank: index + 1,
        userId: doc.id,
        score: data.score,
        userName: data.userName,
        perfect: data.perfect,
        good: data.good,
        miss: data.miss,
        accuracy: data.accuracy,
        timestamp: data.timestamp
      }
    })
    
    return {
      success: true,
      rankings: rankings,
      message: 'ランキング取得成功'
    }
  } catch (error) {
    console.error('ランキング取得エラー:', error)
    return {
      success: false,
      rankings: [],
      message: 'ランキングの取得に失敗しました'
    }
  }
}
