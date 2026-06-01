import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

type Episode =
  | string
  | {
      src: string;
      subtitles?: string;
      subtitleLabel?: string;
      subtitleLanguage?: string;
    };

type MediaLibrary = Record<string, Episode[][]>;

type ResumePoint = {
  seasonIndex: number;
  episodeIndex: number;
  currentTime: number;
};

const PROGRESS_STORAGE_KEY = 'firflix-progress';

function validateLibrary(value: unknown): MediaLibrary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      'Library must be a JSON object where each key is a series title.',
    );
  }

  const parsed = value as MediaLibrary;

  for (const [title, seasons] of Object.entries(parsed)) {
    if (!Array.isArray(seasons)) {
      throw new Error(`"${title}" must be an array of seasons.`);
    }

    seasons.forEach((episodes, seasonIdx) => {
      if (!Array.isArray(episodes)) {
        throw new Error(
          `Season ${seasonIdx + 1} in "${title}" must be an array of links.`,
        );
      }
      episodes.forEach((episode, episodeIdx) => {
        if (typeof episode === 'string' && episode.trim() !== '') {
          return;
        }

        if (
          episode &&
          typeof episode === 'object' &&
          !Array.isArray(episode) &&
          typeof episode.src === 'string' &&
          episode.src.trim() !== ''
        ) {
          if (
            episode.subtitles !== undefined &&
            (typeof episode.subtitles !== 'string' ||
              episode.subtitles.trim() === '')
          ) {
            throw new Error(
              `Invalid subtitle link at "${title}" S${seasonIdx + 1}E${episodeIdx + 1}.`,
            );
          }
          return;
        }

        {
          throw new Error(
            `Invalid link at "${title}" S${seasonIdx + 1}E${episodeIdx + 1}.`,
          );
        }
      });
    });
  }

  return parsed;
}

function App() {
  const [library, setLibrary] = useState<MediaLibrary>({});
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number | null>(
    null,
  );
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState<
    number | null
  >(null);
  const [resumeMap, setResumeMap] = useState<Record<string, ResumePoint>>({});
  const [subtitlesVisible, setSubtitlesVisible] = useState(true);
  const [hasSubtitles, setHasSubtitles] = useState(false);

  const playerRef = useRef<HTMLVideoElement | null>(null);
  const shouldAutoplayNextRef = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}library.json`);
        if (!response.ok) return;
        const parsed = validateLibrary((await response.json()) as unknown);
        setLibrary(parsed);
      } catch {
        // Ignore bootstrap fetch errors so app can still render without data.
      }
    })();

    const persistedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (persistedProgress) {
      try {
        const parsed = JSON.parse(persistedProgress) as Record<
          string,
          ResumePoint
        >;
        setResumeMap(parsed);
      } catch {
        setResumeMap({});
      }
    }
  }, []);

  const titles = useMemo(() => Object.keys(library), [library]);

  useEffect(() => {
    if (!selectedTitle && titles.length > 0) {
      setSelectedTitle(titles[0]);
    }
  }, [selectedTitle, titles]);

  const selectedSeries = selectedTitle ? library[selectedTitle] : undefined;
  const selectedEpisodeLink =
    selectedSeries &&
    selectedSeasonIndex !== null &&
    selectedEpisodeIndex !== null &&
    selectedSeries[selectedSeasonIndex]?.[selectedEpisodeIndex]
      ? typeof selectedSeries[selectedSeasonIndex][selectedEpisodeIndex] ===
        'string'
        ? selectedSeries[selectedSeasonIndex][selectedEpisodeIndex]
        : selectedSeries[selectedSeasonIndex][selectedEpisodeIndex].src
      : null;
  const selectedEpisode =
    selectedSeries &&
    selectedSeasonIndex !== null &&
    selectedEpisodeIndex !== null
      ? selectedSeries[selectedSeasonIndex]?.[selectedEpisodeIndex]
      : null;
  const selectedSubtitle =
    selectedEpisode && typeof selectedEpisode !== 'string'
      ? selectedEpisode.subtitles
      : undefined;

  const resumeForSeries = selectedTitle ? resumeMap[selectedTitle] : undefined;

  const playNextEpisode = () => {
    if (
      !selectedSeries ||
      selectedSeasonIndex === null ||
      selectedEpisodeIndex === null
    ) {
      return;
    }

    const currentSeason = selectedSeries[selectedSeasonIndex];
    const nextEpisodeIndex = selectedEpisodeIndex + 1;

    if (currentSeason?.[nextEpisodeIndex]) {
      shouldAutoplayNextRef.current = true;
      setSelectedEpisodeIndex(nextEpisodeIndex);
      return;
    }

    const nextSeasonIndex = selectedSeasonIndex + 1;

    if (selectedSeries[nextSeasonIndex]?.[0]) {
      shouldAutoplayNextRef.current = true;
      setSelectedSeasonIndex(nextSeasonIndex);
      setSelectedEpisodeIndex(0);
    }
  };

  useEffect(() => {
    if (!selectedSeries) {
      setSelectedSeasonIndex(null);
      setSelectedEpisodeIndex(null);
      return;
    }

    if (
      resumeForSeries &&
      selectedSeries[resumeForSeries.seasonIndex]?.[
        resumeForSeries.episodeIndex
      ]
    ) {
      setSelectedSeasonIndex(resumeForSeries.seasonIndex);
      setSelectedEpisodeIndex(resumeForSeries.episodeIndex);
      return;
    }

    setSelectedSeasonIndex(0);
    setSelectedEpisodeIndex(0);
  }, [selectedSeries, selectedTitle]);

  useEffect(() => {
    if (!playerRef.current || !selectedTitle || !selectedEpisodeLink) return;

    const video = playerRef.current;
    const resume = resumeMap[selectedTitle];

    const onLoadedMeta = () => {
      if (
        resume &&
        selectedSeasonIndex === resume.seasonIndex &&
        selectedEpisodeIndex === resume.episodeIndex
      ) {
        video.currentTime = resume.currentTime;
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMeta);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMeta);
    };
  }, [
    resumeMap,
    selectedTitle,
    selectedEpisodeLink,
    selectedSeasonIndex,
    selectedEpisodeIndex,
  ]);

  useEffect(() => {
    if (!playerRef.current || !selectedEpisodeLink || !shouldAutoplayNextRef.current) {
      return;
    }

    const video = playerRef.current;

    const playWhenReady = () => {
      shouldAutoplayNextRef.current = false;
      void video.play();
    };

    video.addEventListener('loadedmetadata', playWhenReady, { once: true });

    return () => {
      video.removeEventListener('loadedmetadata', playWhenReady);
    };
  }, [selectedEpisodeLink]);

  useEffect(() => {
    if (!playerRef.current || !selectedTitle) return;

    const video = playerRef.current;

    const saveProgress = () => {
      if (selectedSeasonIndex === null || selectedEpisodeIndex === null) return;

      const nextProgress = {
        ...resumeMap,
        [selectedTitle]: {
          seasonIndex: selectedSeasonIndex,
          episodeIndex: selectedEpisodeIndex,
          currentTime: Math.floor(video.currentTime),
        },
      };

      setResumeMap(nextProgress);
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(nextProgress));
    };

    video.addEventListener('timeupdate', saveProgress);
    video.addEventListener('pause', saveProgress);
    const handleEnded = () => {
      saveProgress();
      playNextEpisode();
    };

    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', saveProgress);
      video.removeEventListener('pause', saveProgress);
      video.removeEventListener('ended', handleEnded);
    };
  }, [
    resumeMap,
    selectedTitle,
    selectedSeasonIndex,
    selectedEpisodeIndex,
    selectedSeries,
  ]);

  useEffect(() => {
    const video = playerRef.current;
    if (!video) return;

    const updateTextTracks = () => {
      const tracks = Array.from(video.textTracks);
      setHasSubtitles(Boolean(selectedSubtitle) || tracks.length > 0);

      tracks.forEach((track, index) => {
        track.mode = subtitlesVisible && index === 0 ? 'showing' : 'disabled';
      });
    };

    updateTextTracks();

    video.textTracks.addEventListener('addtrack', updateTextTracks);
    video.addEventListener('loadedmetadata', updateTextTracks);

    return () => {
      video.textTracks.removeEventListener('addtrack', updateTextTracks);
      video.removeEventListener('loadedmetadata', updateTextTracks);
    };
  }, [selectedEpisodeLink, selectedSubtitle, subtitlesVisible]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const recentlyWatched = useMemo(
    () =>
      Object.entries(resumeMap)
        .filter(
          ([title, point]) =>
            library[title]?.[point.seasonIndex]?.[point.episodeIndex],
        )
        .sort((a, b) => b[1].currentTime - a[1].currentTime),
    [library, resumeMap],
  );

  return (
    <div className='app-shell'>
      <header className='app-header'>
        <div>
          <p className='kicker'>FIRFLIX</p>
          <h1>Your Private Streaming Hub</h1>
          <p className='subtitle'>Keep watching!!! </p>
        </div>
      </header>

      <main className='layout'>
        <section className='panel player-panel'>
          <h2>Player</h2>
          {selectedEpisodeLink ? (
            <>
              <video
                key={`${selectedTitle}-${selectedSeasonIndex}-${selectedEpisodeIndex}`}
                ref={playerRef}
                controls
                preload='metadata'
                src={selectedEpisodeLink}
              >
                {selectedSubtitle ? (
                  <track
                    key={selectedSubtitle}
                    kind='subtitles'
                    src={selectedSubtitle}
                    srcLang={
                      typeof selectedEpisode === 'string'
                        ? 'en'
                        : selectedEpisode?.subtitleLanguage ?? 'en'
                    }
                    label={
                      typeof selectedEpisode === 'string'
                        ? 'Subtitles'
                        : selectedEpisode?.subtitleLabel ?? 'Subtitles'
                    }
                    default={subtitlesVisible}
                  />
                ) : null}
              </video>
              <button
                className='subtitle-toggle'
                onClick={() => setSubtitlesVisible((visible) => !visible)}
                disabled={!hasSubtitles}
              >
                {subtitlesVisible ? 'Hide subtitles' : 'Show subtitles'}
              </button>
              {!hasSubtitles ? (
                <p className='subtitle-note'>
                  Embedded MKV softsubs are not exposed by most browsers. Add a
                  WebVTT subtitle file in library.json to show subtitles.
                </p>
              ) : null}
            </>
          ) : (
            <p className='empty'>Select an episode to start playback.</p>
          )}
        </section>

        <aside className='panel recent-panel'>
          <h2>Recently Watched</h2>
          {recentlyWatched.length === 0 ? (
            <p className='empty'>No watch history yet.</p>
          ) : (
            <div className='recent-list'>
              {recentlyWatched.map(([title, point]) => (
                <button
                  key={title}
                  className='recent-item'
                  onClick={() => {
                    setSelectedTitle(title);
                    setSelectedSeasonIndex(point.seasonIndex);
                    setSelectedEpisodeIndex(point.episodeIndex);
                  }}
                >
                  <strong>{title}</strong>
                  <span>
                    S{point.seasonIndex + 1}E{point.episodeIndex + 1} at{' '}
                    {formatTime(point.currentTime)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className='panel browser-panel'>
          <h2>Series & Episodes</h2>

          {titles.length === 0 ? (
            <p className='empty'>No library loaded yet.</p>
          ) : (
            <>
              <div className='series-chip-list' aria-label='Series'>
                  {titles.map((title) => (
                    <button
                      key={title}
                      className={`series-chip ${selectedTitle === title ? 'active' : ''}`}
                      onClick={() => setSelectedTitle(title)}
                    >
                      {title}
                    </button>
                  ))}
              </div>

              <div className='season-grid'>
                {selectedSeries?.map((season, seasonIdx) => (
                  <div key={seasonIdx} className='season-card'>
                    <h3>Season {seasonIdx + 1}</h3>
                    <div className='episode-list'>
                      {season.map((_, episodeIdx) => {
                        const isActive =
                          selectedSeasonIndex === seasonIdx &&
                          selectedEpisodeIndex === episodeIdx;

                        return (
                          <button
                            key={episodeIdx}
                            className={`episode-btn ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedSeasonIndex(seasonIdx);
                              setSelectedEpisodeIndex(episodeIdx);
                            }}
                          >
                            E{String(episodeIdx + 1).padStart(2, '0')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {resumeForSeries ? (
                <p className='resume'>
                  Resume point: S{resumeForSeries.seasonIndex + 1}E
                  {resumeForSeries.episodeIndex + 1} at{' '}
                  {formatTime(resumeForSeries.currentTime)}
                </p>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
