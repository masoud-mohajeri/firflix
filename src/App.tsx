import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type MediaLibrary = Record<string, string[][]>

type ResumePoint = {
  seasonIndex: number
  episodeIndex: number
  currentTime: number
}

const LIBRARY_STORAGE_KEY = 'firflix-library'
const PROGRESS_STORAGE_KEY = 'firflix-progress'

function validateLibrary(value: unknown): MediaLibrary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Library must be a JSON object where each key is a series title.')
  }

  const parsed = value as MediaLibrary

  for (const [title, seasons] of Object.entries(parsed)) {
    if (!Array.isArray(seasons)) {
      throw new Error(`"${title}" must be an array of seasons.`)
    }

    seasons.forEach((episodes, seasonIdx) => {
      if (!Array.isArray(episodes)) {
        throw new Error(`Season ${seasonIdx + 1} in "${title}" must be an array of links.`)
      }
      episodes.forEach((link, episodeIdx) => {
        if (typeof link !== 'string' || link.trim() === '') {
          throw new Error(`Invalid link at "${title}" S${seasonIdx + 1}E${episodeIdx + 1}.`)
        }
      })
    })
  }

  return parsed
}

function App() {
  const [library, setLibrary] = useState<MediaLibrary>({})
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number | null>(null)
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState<number | null>(null)
  const [resumeMap, setResumeMap] = useState<Record<string, ResumePoint>>({})

  const playerRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const persistedLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY)
    if (persistedLibrary) {
      try {
        const parsed = validateLibrary(JSON.parse(persistedLibrary))
        setLibrary(parsed)
      } catch {
        localStorage.removeItem(LIBRARY_STORAGE_KEY)
      }
    } else {
      void (async () => {
        try {
          const response = await fetch('/library.json')
          if (!response.ok) return
          const parsed = validateLibrary((await response.json()) as unknown)
          setLibrary(parsed)
          localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(parsed))
        } catch {
          // Ignore bootstrap fetch errors so app can still render without data.
        }
      })()
    }

    const persistedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (persistedProgress) {
      try {
        const parsed = JSON.parse(persistedProgress) as Record<string, ResumePoint>
        setResumeMap(parsed)
      } catch {
        setResumeMap({})
      }
    }
  }, [])

  const titles = useMemo(() => Object.keys(library), [library])

  useEffect(() => {
    if (!selectedTitle && titles.length > 0) {
      setSelectedTitle(titles[0])
    }
  }, [selectedTitle, titles])

  const selectedSeries = selectedTitle ? library[selectedTitle] : undefined
  const selectedEpisodeLink =
    selectedSeries &&
    selectedSeasonIndex !== null &&
    selectedEpisodeIndex !== null &&
    selectedSeries[selectedSeasonIndex]?.[selectedEpisodeIndex]
      ? selectedSeries[selectedSeasonIndex][selectedEpisodeIndex]
      : null

  const resumeForSeries = selectedTitle ? resumeMap[selectedTitle] : undefined

  useEffect(() => {
    if (!selectedSeries) {
      setSelectedSeasonIndex(null)
      setSelectedEpisodeIndex(null)
      return
    }

    if (
      resumeForSeries &&
      selectedSeries[resumeForSeries.seasonIndex]?.[resumeForSeries.episodeIndex]
    ) {
      setSelectedSeasonIndex(resumeForSeries.seasonIndex)
      setSelectedEpisodeIndex(resumeForSeries.episodeIndex)
      return
    }

    setSelectedSeasonIndex(0)
    setSelectedEpisodeIndex(0)
  }, [selectedSeries, resumeForSeries])

  useEffect(() => {
    if (!playerRef.current || !selectedTitle || !selectedEpisodeLink) return

    const video = playerRef.current
    const resume = resumeMap[selectedTitle]

    const onLoadedMeta = () => {
      if (
        resume &&
        selectedSeasonIndex === resume.seasonIndex &&
        selectedEpisodeIndex === resume.episodeIndex
      ) {
        video.currentTime = resume.currentTime
      }
    }

    video.addEventListener('loadedmetadata', onLoadedMeta)

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMeta)
    }
  }, [resumeMap, selectedTitle, selectedEpisodeLink, selectedSeasonIndex, selectedEpisodeIndex])

  useEffect(() => {
    if (!playerRef.current || !selectedTitle) return

    const video = playerRef.current

    const saveProgress = () => {
      if (selectedSeasonIndex === null || selectedEpisodeIndex === null) return

      const nextProgress = {
        ...resumeMap,
        [selectedTitle]: {
          seasonIndex: selectedSeasonIndex,
          episodeIndex: selectedEpisodeIndex,
          currentTime: Math.floor(video.currentTime),
        },
      }

      setResumeMap(nextProgress)
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(nextProgress))
    }

    video.addEventListener('timeupdate', saveProgress)
    video.addEventListener('pause', saveProgress)
    video.addEventListener('ended', saveProgress)

    return () => {
      video.removeEventListener('timeupdate', saveProgress)
      video.removeEventListener('pause', saveProgress)
      video.removeEventListener('ended', saveProgress)
    }
  }, [resumeMap, selectedTitle, selectedSeasonIndex, selectedEpisodeIndex])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const recentlyWatched = useMemo(
    () =>
      Object.entries(resumeMap)
        .filter(([title, point]) => library[title]?.[point.seasonIndex]?.[point.episodeIndex])
        .sort((a, b) => b[1].currentTime - a[1].currentTime),
    [library, resumeMap],
  )

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="kicker">FIRFLIX</p>
          <h1>Your Private Streaming Hub</h1>
          <p className="subtitle">Load your JSON library, pick a series, and continue right where you left off.</p>
        </div>
      </header>

      <main className="layout">
        <aside className="panel recent-panel">
          <h2>Recently Watched</h2>
          {recentlyWatched.length === 0 ? (
            <p className="empty">No watch history yet.</p>
          ) : (
            <div className="recent-list">
              {recentlyWatched.map(([title, point]) => (
                <button
                  key={title}
                  className="recent-item"
                  onClick={() => {
                    setSelectedTitle(title)
                    setSelectedSeasonIndex(point.seasonIndex)
                    setSelectedEpisodeIndex(point.episodeIndex)
                  }}
                >
                  <strong>{title}</strong>
                  <span>
                    S{point.seasonIndex + 1}E{point.episodeIndex + 1} at {formatTime(point.currentTime)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="panel browser-panel">
          <h2>Series & Episodes</h2>

          {titles.length === 0 ? (
            <p className="empty">No library loaded yet.</p>
          ) : (
            <>
              <div className="selector-row">
                <label htmlFor="series-select">Series</label>
                <select
                  id="series-select"
                  value={selectedTitle ?? ''}
                  onChange={(e) => setSelectedTitle(e.target.value)}
                >
                  {titles.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div className="season-grid">
                {selectedSeries?.map((season, seasonIdx) => (
                  <div key={seasonIdx} className="season-card">
                    <h3>Season {seasonIdx + 1}</h3>
                    <div className="episode-list">
                      {season.map((_, episodeIdx) => {
                        const isActive =
                          selectedSeasonIndex === seasonIdx && selectedEpisodeIndex === episodeIdx

                        return (
                          <button
                            key={episodeIdx}
                            className={`episode-btn ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedSeasonIndex(seasonIdx)
                              setSelectedEpisodeIndex(episodeIdx)
                            }}
                          >
                            E{String(episodeIdx + 1).padStart(2, '0')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {resumeForSeries ? (
                <p className="resume">
                  Resume point: S{resumeForSeries.seasonIndex + 1}E{resumeForSeries.episodeIndex + 1} at{' '}
                  {formatTime(resumeForSeries.currentTime)}
                </p>
              ) : null}
            </>
          )}
        </section>

        <section className="panel player-panel">
          <h2>Player</h2>
          {selectedEpisodeLink ? (
            <video
              key={`${selectedTitle}-${selectedSeasonIndex}-${selectedEpisodeIndex}`}
              ref={playerRef}
              controls
              preload="metadata"
              src={selectedEpisodeLink}
            />
          ) : (
            <p className="empty">Select an episode to start playback.</p>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
