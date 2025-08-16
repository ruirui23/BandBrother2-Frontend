import { useState, useEffect, useCallback, useRef } from 'react'

export default function useSimpleJoycon() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const joyconRef = useRef(null)
  const onButtonPressRef = useRef(null)

  // ボタン押下コールバックを設定
  const setOnButtonPress = useCallback((callback) => {
    onButtonPressRef.current = callback
  }, [])

  // ジョイコン接続
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return

    setIsConnecting(true)
    setError(null)

    try {
      // joy-con-webhidライブラリを動的インポート
      const JoyCon = await import('joy-con-webhid')
      
      // ジョイコンに接続
      await JoyCon.connectJoyCon()
      
      // 接続されたジョイコンを取得
      const connectedJoyCons = Array.from(JoyCon.connectedJoyCons.values())
      if (connectedJoyCons.length === 0) {
        throw new Error('ジョイコンが見つかりません')
      }

      const joyCon = connectedJoyCons[0]
      joyconRef.current = joyCon

      // ジョイコンを開いて設定
      if (typeof joyCon.open === 'function') {
        await joyCon.open()
      }
      
      if (typeof joyCon.enableStandardFullMode === 'function') {
        await joyCon.enableStandardFullMode()
      }
      
      // 入力イベントリスナーを設定
      if (typeof joyCon.addEventListener === 'function') {
        joyCon.addEventListener('hidinput', ({ detail }) => {
          // Aボタン（右ジョイコンの下ボタン）が押されたかチェック
          if (detail.buttonStatus && detail.buttonStatus.a && onButtonPressRef.current) {
            onButtonPressRef.current('K') // Kキーとして扱う
          }
        })
      }

      setIsConnected(true)
      console.log('ジョイコンが正常に接続されました:', joyCon.device?.productName || 'Unknown')
      
    } catch (err) {
      console.error('ジョイコン接続エラー:', err)
      setError(err.message || 'ジョイコンの接続に失敗しました')
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting, isConnected])

  // 切断
  const disconnect = useCallback(async () => {
    if (joyconRef.current) {
      try {
        // closeメソッドが存在するかチェック
        if (typeof joyconRef.current.close === 'function') {
          await joyconRef.current.close()
        }
        joyconRef.current = null
        setIsConnected(false)
        console.log('ジョイコンが切断されました')
      } catch (err) {
        console.error('ジョイコン切断エラー:', err)
        // エラーが発生してもstateはリセット
        joyconRef.current = null
        setIsConnected(false)
      }
    }
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (joyconRef.current) {
        try {
          // closeメソッドが存在するかチェック
          if (typeof joyconRef.current.close === 'function') {
            joyconRef.current.close().catch(console.error)
          }
        } catch (err) {
          console.error('クリーンアップエラー:', err)
        }
      }
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    setOnButtonPress
  }
}