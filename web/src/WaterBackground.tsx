import { useEffect, useRef, useState } from 'react'

// Venice's own backdrop: a still frame of dark water with the looping video
// faded in on top once it starts playing, tinted toward the page's blue-gray
// and shown at 60% opacity, mirroring how venice.ai composes it.
export default function WaterBackground() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    video.play().then(() => setPlaying(true)).catch(() => video.pause())
  }, [])

  return (
    <div className="water" aria-hidden>
      <div className="water-still" />
      <video
        ref={videoRef}
        className={`water-video ${playing ? 'visible' : ''}`}
        src="/dark-waves-loop.mp4"
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className="water-tint" />
    </div>
  )
}
