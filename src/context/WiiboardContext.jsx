import React, { createContext, useContext, useState } from 'react'

const WiiboardContext = createContext()

export function WiiboardProvider({ children }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('wiiboardEnabled') === 'true'
    } catch {
      return false
    }
  })

  const toggleEnabled = () => {
    setEnabled(prev => {
      localStorage.setItem('wiiboardEnabled', (!prev).toString())
      return !prev
    })
  }

  return (
    <WiiboardContext.Provider value={{ enabled, toggleEnabled }}>
      {children}
    </WiiboardContext.Provider>
  )
}

export function useWiiboard() {
  return useContext(WiiboardContext)
}
