import type { RefObject } from 'react'

type QualityOption = {
  label: string
  value: number
}

type Props = {
  episodeLink: string | null
  qualityOptions: QualityOption[]
  selectedQualityIndex: number
  onSelectQuality: (index: number) => void
  videoRef: RefObject<HTMLVideoElement | null>
  videoKey: string
}

export function PlayerPanel({
  episodeLink,
  qualityOptions,
  selectedQualityIndex,
  onSelectQuality,
  videoRef,
  videoKey,
}: Props) {
  return (
    <section className="panel player-panel">
      <h2>Player</h2>

      <div className="selector-row">
        <label htmlFor="quality-select">Quality</label>
        <select
          id="quality-select"
          value={selectedQualityIndex}
          onChange={(e) => onSelectQuality(Number(e.target.value))}
          disabled={qualityOptions.length === 0}
        >
          {qualityOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {episodeLink ? (
        <video key={videoKey} ref={videoRef} controls preload="metadata" src={episodeLink} />
      ) : (
        <p className="empty">Select an episode to start playback.</p>
      )}
    </section>
  )
}
