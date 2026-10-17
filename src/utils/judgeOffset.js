// レーンごとの判定オフセット(ms)。入力デバイス(キーボード/Joy-Con/Wiiボード等)ごとの遅延補正用。
// 正の値: 判定を遅らせる(入力が遅れて届く環境向け) / 負の値: 判定を早める
// ノーツの見た目は音楽に合わせたまま、判定にだけ反映する。
export const JUDGE_OFFSET_KEY = 'laneJudgeOffsetsMs'
export const JUDGE_OFFSET_MIN = -200
export const JUDGE_OFFSET_MAX = 200
export const LANE_COUNT = 4

const clamp = v =>
  Math.min(JUDGE_OFFSET_MAX, Math.max(JUDGE_OFFSET_MIN, Math.round(v) || 0))

function load() {
  try {
    const arr = JSON.parse(localStorage.getItem(JUDGE_OFFSET_KEY))
    if (Array.isArray(arr)) {
      return Array.from({ length: LANE_COUNT }, (_, i) => clamp(arr[i]))
    }
  } catch {
    // 読めない環境では0として扱う
  }
  return Array(LANE_COUNT).fill(0)
}

// 毎フレーム呼ばれるため、localStorageの読み込みはキャッシュする
let cache = null
const offsets = () => (cache ??= load())

export function getLaneJudgeOffsetsMs() {
  return [...offsets()]
}

export function setLaneJudgeOffsetMs(lane, ms) {
  const next = [...offsets()]
  next[lane] = clamp(ms)
  cache = next
  try {
    localStorage.setItem(JUDGE_OFFSET_KEY, JSON.stringify(next))
  } catch {
    // 保存できない環境では現セッションのみ反映
  }
  return [...next]
}

// 判定時刻に足す補正(秒)。ノーツの判定時刻 = ノーツ時刻 + この値
export function getLaneJudgeOffsetSec(lane) {
  return (offsets()[lane] ?? 0) / 1000
}
