import React, { useEffect, useState } from 'react'
import { useWiiboard } from '../context/WiiboardContext'

const WiiMonitor = () => {
  const { enabled } = useWiiboard()
  const [ws, setWs] = useState(null)

  useEffect(() => {
    if (enabled && !ws) {
      const socket = new window.WebSocket('wss://wii-board-controller.loca.lt') // ←実際のアドレスに変更
      socket.onmessage = event => {
        const data = JSON.parse(event.data)
        if (data.action === 'weightDetected') {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'F', code: 'KeyF' })
          )
        }
      }
      setWs(socket)
    }
    if (!enabled && ws) {
      ws.close()
      setWs(null)
    }
  }, [enabled, ws])

  useEffect(() => {
    return () => {
      if (ws) ws.close()
    }
  }, [ws])

  return null
}

export default WiiMonitor
