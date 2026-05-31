export type MediaSource = {
  label: string
  url: string
}

export type EpisodeItem = {
  code: string
  sources: MediaSource[]
}

export type MediaLibrary = Record<string, EpisodeItem[][]>

export type ResumePoint = {
  seasonIndex: number
  episodeIndex: number
  sourceIndex: number
  currentTime: number
  updatedAt: number
}

export type ProgressMap = Record<string, ResumePoint>
