import type { ResumePoint } from '../types'
import { formatTime } from '../utils'

type Props = {
  title: string
  resume: ResumePoint
  onResume: () => void
  onDelete: () => void
}

export function ContinueWatchingCard({ title, resume, onResume, onDelete }: Props) {
  return (
    <section className="panel continue-panel">
      <p className="kicker">Continue Watching</p>
      <h2>{title}</h2>
      <p className="subtitle">
        Season {resume.seasonIndex + 1}, Episode {resume.episodeIndex + 1} at {formatTime(resume.currentTime)}
      </p>
      <div className="button-row">
        <button className="btn btn-primary" onClick={onResume}>Resume now</button>
        <button className="btn btn-muted" onClick={onDelete}>Delete</button>
      </div>
    </section>
  )
}
