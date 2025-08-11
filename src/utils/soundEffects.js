import { Howl } from 'howler'

// ノーツヒット効果音候補リスト（フォールバック）
const HIT_SOUND_FILES = [
  '/audio/ow.mp3',
  '/audio/don.mp3',
  '/audio/pon.mp3',
  '/audio/po.mp3',
  '/audio/pa.mp3'
]

// サウンドエフェクトプレイヤークラス
class SoundEffectPlayer {
  constructor() {
    this.hitSound = null
    this.enabled = true
    this.initialized = false
    this.init()
  }

  init() {
    console.log('Initializing sound effects...')
    console.log('Trying HIT_SOUND_FILES:', HIT_SOUND_FILES)
    
    this.tryLoadSound(0)
  }

  tryLoadSound(index) {
    if (index >= HIT_SOUND_FILES.length) {
      console.error('All sound files failed to load')
      this.enabled = false
      return
    }

    const soundFile = HIT_SOUND_FILES[index]
    console.log(`Trying to load: ${soundFile}`)

    try {
      this.hitSound = new Howl({
        src: [soundFile],
        volume: 1.0, // 最大音量
        preload: true,
        onload: () => {
          console.log(`Hit sound loaded successfully: ${soundFile}`)
          this.initialized = true
        },
        onloaderror: (id, error) => {
          console.warn(`Failed to load ${soundFile}:`, error)
          this.tryLoadSound(index + 1) // 次のファイルを試す
        }
      })
    } catch (error) {
      console.warn(`Failed to initialize ${soundFile}:`, error)
      this.tryLoadSound(index + 1) // 次のファイルを試す
    }
  }

  // 効果音の有効/無効切り替え
  setEnabled(enabled) {
    this.enabled = enabled
  }

  // ノーツヒット音を再生（すべての判定で同じ音）
  playHitSound() {
    console.log('Attempting to play hit sound effect')
    console.log(`Enabled: ${this.enabled}, Initialized: ${this.initialized}`)
    
    if (!this.enabled || !this.initialized || !this.hitSound) {
      console.log('Hit sound effect not available')
      return
    }

    try {
      // 既に再生中の場合は停止してから新しく再生（重複防止）
      if (this.hitSound.playing()) {
        this.hitSound.stop()
      }
      
      // 音量を最大に設定して再生
      this.hitSound.volume(1.0)
      this.hitSound.play()
      console.log('Successfully started playing hit sound effect at max volume')
    } catch (error) {
      console.warn('Failed to play hit sound:', error)
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
  
  // 簡単なテスト用グローバル関数
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

export default soundEffectPlayer