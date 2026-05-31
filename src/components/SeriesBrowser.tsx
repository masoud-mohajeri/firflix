import type { EpisodeItem } from '../types'

type Props = {
  seriesTitles: string[]
  selectedTitle: string | null
  selectedSeries: EpisodeItem[][] | undefined
  selectedSeasonIndex: number | null
  selectedEpisodeIndex: number | null
  seriesFilter: string
  episodeFilter: string
  starredTitles: string[]
  onToggleStar: (title: string) => void
  onSelectTitle: (title: string) => void
  onSelectEpisode: (seasonIndex: number, episodeIndex: number) => void
  onSeriesFilterChange: (value: string) => void
  onEpisodeFilterChange: (value: string) => void
}

export function SeriesBrowser({
  seriesTitles,
  selectedTitle,
  selectedSeries,
  selectedSeasonIndex,
  selectedEpisodeIndex,
  seriesFilter,
  episodeFilter,
  starredTitles,
  onToggleStar,
  onSelectTitle,
  onSelectEpisode,
  onSeriesFilterChange,
  onEpisodeFilterChange,
}: Props) {
  const isStarred = selectedTitle ? starredTitles.includes(selectedTitle) : false

  return (
    <section className="panel browser-panel">
      <h2>Series & Episodes</h2>

      <div className="selector-row">
        <label htmlFor="series-filter">Search series</label>
        <input
          id="series-filter"
          value={seriesFilter}
          onChange={(e) => onSeriesFilterChange(e.target.value)}
          placeholder="Type a series name"
        />
      </div>

      <div className="selector-row">
        <label htmlFor="series-select">Series</label>
        <select
          id="series-select"
          value={selectedTitle ?? ''}
          onChange={(e) => onSelectTitle(e.target.value)}
          disabled={seriesTitles.length === 0}
        >
          {seriesTitles.map((title) => (
            <option key={title} value={title}>{title}</option>
          ))}
        </select>
      </div>

      {selectedTitle ? (
        <div className="button-row">
          <button className="btn btn-muted" onClick={() => onToggleStar(selectedTitle)}>
            {isStarred ? '★ Starred' : '☆ Star this show'}
          </button>
        </div>
      ) : null}

      <div className="selector-row">
        <label htmlFor="episode-filter">Filter episodes</label>
        <input
          id="episode-filter"
          value={episodeFilter}
          onChange={(e) => onEpisodeFilterChange(e.target.value)}
          placeholder="Examples: e03, season 2, s01e05"
        />
      </div>

      {selectedSeries ? (
        <div className="season-grid">
          {selectedSeries.map((season, seasonIdx) => (
            <div key={seasonIdx} className="season-card">
              <h3>Season {seasonIdx + 1}</h3>
              <div className="episode-list">
                {season.map((episode, episodeIdx) => {
                  const code = episode.code
                  const isVisible =
                    episodeFilter.trim() === '' ||
                    code.includes(episodeFilter.trim().toLowerCase()) ||
                    `season ${seasonIdx + 1}`.includes(episodeFilter.trim().toLowerCase()) ||
                    `episode ${episodeIdx + 1}`.includes(episodeFilter.trim().toLowerCase())

                  if (!isVisible) return null

                  const isActive =
                    selectedSeasonIndex === seasonIdx && selectedEpisodeIndex === episodeIdx

                  return (
                    <button
                      key={episodeIdx}
                      className={`episode-btn ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectEpisode(seasonIdx, episodeIdx)}
                    >
                      E{String(episodeIdx + 1).padStart(2, '0')}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Pick a show to load episodes and qualities.</p>
      )}
    </section>
  )
}
