import type { EpisodeItem, MediaLibrary } from './types'

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function parseQualityLabel(link: string): string {
  const match = /(2160p|1080p|720p|480p|360p|BluRay|WEB[- .]?DL|WEBRip|HDRip)/i.exec(link)
  return match ? match[0].replace('WEBDL', 'WEB-DL') : 'Default'
}

function parseArchiveLink(url: string) {
  const seasonMatch = /[\/._-]S(\d{1,2})[E._-]?/i.exec(url)
  const episodeMatch = /[\/._-]E(\d{1,2})/i.exec(url) || /S\d{1,2}E(\d{1,2})/i.exec(url)
  if (!seasonMatch || !episodeMatch) return null

  const season = Number(seasonMatch[1])
  const episode = Number(episodeMatch[1])
  if (!Number.isInteger(season) || !Number.isInteger(episode)) return null

  const imdbMatch = /\/series\d*\/(tt\d+)\//i.exec(url)
  const fileName = url.split('/').at(-1) ?? url
  const title = imdbMatch ? imdbMatch[1] : fileName.split('.S')[0]?.replace(/\./g, ' ') ?? fileName

  return {
    title,
    seasonIndex: season - 1,
    episodeIndex: episode - 1,
    code: `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`,
    source: { label: parseQualityLabel(url), url },
  }
}

function extractLinksFromArchive(html: string): string[] {
  return [...html.matchAll(/href=["']([^"']+\.(?:mkv|mp4|avi))["']/gi)]
    .map((item) => item[1])
    .filter((href) => href.startsWith('http'))
}

export function parseArchiveTitles(html: string): string[] {
  const titles = new Set<string>()
  for (const link of extractLinksFromArchive(html)) {
    const parsed = parseArchiveLink(link)
    if (!parsed) continue
    titles.add(parsed.title)
  }
  return [...titles].sort((a, b) => a.localeCompare(b))
}

export function parseArchiveSeriesByTitle(html: string, targetTitle: string): EpisodeItem[][] {
  const seasons: EpisodeItem[][] = []

  for (const link of extractLinksFromArchive(html)) {
    const parsed = parseArchiveLink(link)
    if (!parsed || parsed.title !== targetTitle) continue

    if (!seasons[parsed.seasonIndex]) seasons[parsed.seasonIndex] = []
    if (!seasons[parsed.seasonIndex][parsed.episodeIndex]) {
      seasons[parsed.seasonIndex][parsed.episodeIndex] = { code: parsed.code, sources: [] }
    }

    const episode = seasons[parsed.seasonIndex][parsed.episodeIndex]
    if (!episode.sources.some((source) => source.url === parsed.source.url)) {
      episode.sources.push(parsed.source)
    }
  }

  return seasons
}

export function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase())
}

export function validateLibrary(payload: unknown): MediaLibrary {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }
  return payload as MediaLibrary
}
