import { useEffect, useRef, useState, useCallback } from 'react'

const TRACKS = {
  lobby: '/audio/lobby.mp3',
  think: '/audio/think.mp3',
  buildup: '/audio/winner-buildup.mp3',
  fanfare: '/audio/winner-fanfare.mp3',
}

export function useAudio() {
  // Single audio element reused — like a music channel
  const audioRef = useRef(null)
  const [muted, setMuted] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(null)

  // Lazy-create the single shared audio element
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio()
      a.preload = 'auto'
      audioRef.current = a
    }
    return audioRef.current
  }, [])

  // Restore mute pref
  useEffect(() => {
    const saved = localStorage.getItem('scars-jeopardy-muted')
    if (saved === 'true') setMuted(true)
  }, [])

  useEffect(() => {
    localStorage.setItem('scars-jeopardy-muted', String(muted))
    if (audioRef.current) audioRef.current.muted = muted
  }, [muted])

  const play = useCallback(
    (key, { loop = true, volume = 0.5 } = {}) => {
      if (muted) return
      const src = TRACKS[key]
      if (!src) {
        console.warn('[audio] unknown track:', key)
        return
      }
      const a = getAudio()
      // Skip if we're already playing this exact track
      if (currentTrack === key && !a.paused && !a.ended) return

      a.src = src
      a.loop = loop
      a.volume = volume
      a.muted = muted
      a.currentTime = 0

      const p = a.play()
      if (p?.catch) {
        p.catch((err) => {
          console.warn('[audio]', key, 'failed:', err.message)
        })
      }
      setCurrentTrack(key)
    },
    [muted, currentTrack, getAudio]
  )

  const stopAll = useCallback(() => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    setCurrentTrack(null)
  }, [])

  // Unlock = a single user-gesture-triggered play. Browser then trusts us
  // to play audio later without further gestures.
  const unlock = useCallback(() => {
    if (unlocked) return
    const a = getAudio()
    // Just play the lobby track right now — this happens inside a click handler
    a.src = TRACKS.lobby
    a.volume = 0.35
    a.loop = true
    a.muted = false
    const p = a.play()
    if (p?.then) {
      p.then(() => {
        setUnlocked(true)
        setCurrentTrack('lobby')
      }).catch((err) => {
        console.warn('[audio] unlock failed:', err.message)
      })
    } else {
      setUnlocked(true)
      setCurrentTrack('lobby')
    }
  }, [unlocked, getAudio])

  const toggleMute = () => setMuted((m) => !m)

  return { play, stopAll, muted, toggleMute, currentTrack, unlock, unlocked }
}
