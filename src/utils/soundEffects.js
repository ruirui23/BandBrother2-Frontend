import { Howl } from 'howler'

// ノーツヒット効果音候補リスト（フォールバック）
const ALL_SE_FILES = [
  '/audio/ow.mp3',
  '/audio/don.mp3',
  '/audio/pon.mp3',
  '/audio/po.mp3',
  '/audio/pa.mp3',
]

function getSelectedSEFile() {
  // localStorageから選択SEファイル名を取得。なければpo.mp3
  try {
    const se = localStorage.getItem('seFileName')
    if (se && ALL_SE_FILES.includes(se)) return se
  } catch {
  } catch (error) {
    console.warn('Failed to get SE file from localStorage:', error)
    return '/audio/po.mp3'
  }
  return '/audio/po.mp3'
}

// サウンドエフェクトプレイヤークラス
class SoundEffectPlayer {
  constructor() {
    this.hitSound = null
    this.enabled = true
    this.initialized = false
    this.currentSE = getSelectedSEFile()
    this.init()
  }

  init() {
    this.loadSelectedSE()
  }

  loadSelectedSE() {
    const seFile = getSelectedSEFile()
    if (this.currentSE === seFile && this.hitSound && this.initialized) return
    this.currentSE = seFile
    try {
      this.hitSound = new Howl({
        src: [seFile],
        volume: 1.0,
        preload: true,
        onload: () => {
          this.initialized = true
        },
        onloaderror: () => {
          this.initialized = false
        },
      })
    } catch {
    } catch (e) {
      console.warn('Failed to load selected sound effect:', e)
      this.initialized = false
      return
    }
  }

  // 効果音の有効/無効切り替え
  setEnabled(enabled) {
    this.enabled = enabled
  }

  // ノーツヒット音を再生（すべての判定で同じ音）
  playHitSound() {
    // 毎回選択SEを確認
    this.loadSelectedSE()
    if (!this.enabled || !this.initialized || !this.hitSound) return
    try {
      if (this.hitSound.playing()) this.hitSound.stop()
      this.hitSound.volume(1.0)
      this.hitSound.play()
    } catch {
      // ignore error and ensure block is not empty for eslint
      return
    }
  }

  // 後方互換性のために古いメソッドも残す
  playPerfect() {
    this.playHitSound()
  }

  playGood() {
    this.playHitSound()
  }

  playMiss() {
    this.playHitSound()
  }
}

// シングルトンインスタンス
console.log('Creating soundEffectPlayer instance...')
export const soundEffectPlayer = new SoundEffectPlayer()

// デバッグ用にwindowオブジェクトに登録
if (typeof window !== 'undefined') {
  window.soundEffectPlayer = soundEffectPlayer
  window.testHitSound = () => {
    console.log('Testing hit sound...')
    soundEffectPlayer.playHitSound()
  }
}

// 便利関数（判定に関係なく同じ音を再生）
export const playHitSound = () => {
  console.log('playHitSound function called!')
  // 判定タイプに関係なく、常に同じヒット音を再生
  soundEffectPlayer.playHitSound()
}

export { ALL_SE_FILES }
export default soundEffectPlayer
