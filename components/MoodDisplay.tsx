import React, { useState, useEffect } from 'react';
import { MoodAnalysis } from '../types';

interface MoodDisplayProps {
  analysis: MoodAnalysis;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const MoodDisplay: React.FC<MoodDisplayProps> = ({ analysis }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [useLocal, setUseLocal] = useState(false);
  const [youtubeError, setYoutubeError] = useState<number | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const activeSong = analysis.recommendations[currentIndex];

  // Check if local file exists (simple head request or just try to play)
  useEffect(() => {
    if (activeSong?.filePath) {
      const url = `http://localhost:3005/songs/${activeSong.filePath}`;


      fetch(url, { method: 'HEAD' })
        .then(res => setUseLocal(res.ok))
        .catch(() => setUseLocal(false));
    } else {
      setUseLocal(false);
    }
  }, [activeSong]);

  // Initialize YouTube API for streaming audio in background
  useEffect(() => {
    const initPlayer = () => {
      if (document.getElementById('youtube-hidden-player') && analysis.recommendations?.[0]?.youtubeVideoId) {
        createPlayer(analysis.recommendations[0].youtubeVideoId);
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
    };
  }, []);

  // Handle manual song selection
  useEffect(() => {
    if (useLocal) {
        if (player && isPlayerReady) player.pauseVideo();
        if (audioRef.current) {
            audioRef.current.src = `http://localhost:3005/songs/${activeSong.filePath}`;
            audioRef.current.play().catch(() => setIsPlaying(false));
            setIsPlaying(true);
        }
    } else if (player && player.loadVideoById && activeSong?.youtubeVideoId && isPlayerReady) {
      if (audioRef.current) audioRef.current.pause();
      player.loadVideoById(activeSong.youtubeVideoId);
      player.unMute();
      player.setVolume(100);
      setIsPlaying(true);
    } else if (!useLocal && !activeSong?.youtubeVideoId) {
        setIsPlaying(false);
    }
    setYoutubeError(null);
  }, [currentIndex, player, isPlayerReady, useLocal]);

  const createPlayer = (videoId: string) => {
    const newPlayer = new window.YT.Player('youtube-hidden-player', {
      height: '10',
      width: '10',
      videoId: videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1,
        mute: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
          } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.BUFFERING) {
            setIsPlaying(false);
          }
          if (event.data === window.YT.PlayerState.ENDED) {
            playNext();
          }
        },
        onReady: (event: any) => {
          const targetPlayer = event.target;
          setPlayer(targetPlayer);
          setIsPlayerReady(true);
          if (!useLocal) {
            targetPlayer.unMute();
            targetPlayer.setVolume(100);
            targetPlayer.playVideo();
            setIsPlaying(true);
          }
        },
        onError: (event: any) => {
          console.error("YouTube Player Error:", event.data);
          setIsPlaying(false);
          setYoutubeError(event.data);
          // Error 150 = Embedding disabled. Error 2 = Invalid ID.
          if (event.data === 150) {
            console.warn("Video embedding blocked by owner. Try another song or watch on YouTube.");
          }
        }
      }

    });
  };

  const playNext = () => {
    setCurrentIndex((prev) => (prev + 1) % analysis.recommendations.length);
  };

  const selectSong = (index: number) => {
    setCurrentIndex(index);
  };

  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (useLocal && audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
        return;
    }
    if (player && isPlayerReady) {
      if (isPlaying) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        player.playVideo();
        setIsPlaying(true);
      }
    }
  };

  const handleSongClick = (index: number) => {
    if (currentIndex === index) {
      handleTogglePlay();
    } else {
      selectSong(index);
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hidden YouTube Player and HTML5 Audio */}
      <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
        <div id="youtube-hidden-player"></div>
        <audio 
            ref={audioRef} 
            onEnded={playNext} 
            onPlay={() => setIsPlaying(true)} 
            onPause={() => setIsPlaying(false)} 
        />
      </div>

      {/* Mood Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <div className="text-8xl">{getMoodEmoji(analysis.mood)}</div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-110"
              style={{ backgroundColor: analysis.color }}
            >
              {getMoodEmoji(analysis.mood)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white leading-none">
                Vibe: <span style={{ color: analysis.color }}>{analysis.mood}</span>
              </h2>
              <p className="text-slate-400 text-sm mt-1">Found the perfect Tamil match • {Math.round(analysis.confidence * 100)}% Match</p>
            </div>
          </div>
          <p className="text-slate-200 italic leading-relaxed max-w-md">
            "{analysis.description}"
          </p>
        </div>
      </div>

      {/* Current Song Details with Play Controls */}
      <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/80 shadow-2xl transition-all duration-500 p-6 flex flex-col md:flex-row items-center gap-6 relative">
        <div className="w-full md:w-1/3 aspect-square max-w-[200px] bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden relative border border-slate-700 group shadow-lg">
          {isPlaying ? (
            <div className="flex items-center justify-center gap-1.5 h-full w-full bg-indigo-900/40">
              <span className="w-2 bg-indigo-400 rounded-full animate-[music-bar_0.6s_ease-in-out_infinite]"></span>
              <span className="w-2 bg-indigo-400 rounded-full animate-[music-bar_0.8s_ease-in-out_infinite_0.1s]"></span>
              <span className="w-2 bg-indigo-400 rounded-full animate-[music-bar_0.7s_ease-in-out_infinite_0.2s]"></span>
              <span className="w-2 bg-indigo-400 rounded-full animate-[music-bar_0.5s_ease-in-out_infinite_0.3s]"></span>
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-500/20 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3V7.803l8-1.6v3.54a4.29 4.29 0 00-1-0.743c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3V3z" />
            </svg>
          )}
          <button
            onClick={handleTogglePlay}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 hover:scale-110 transition-transform">
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        </div>
        <div className="flex-1 text-center md:text-left w-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
              #{currentIndex + 1} Recommendation
            </div>
            {useLocal && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Local File
              </div>
            )}
            {!useLocal && isPlayerReady && activeSong?.youtubeVideoId && (
              <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full text-[10px] uppercase tracking-widest font-bold ${
                youtubeError === 150 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                  : youtubeError 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                Source: YouTube {youtubeError === 150 ? ' (Embed Blocked)' : youtubeError ? ` (Error ${youtubeError})` : ''}
              </div>
            )}
            {!useLocal && !activeSong?.youtubeVideoId && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Source Missing
              </div>
            )}

          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{activeSong?.title}</h3>
          <p className="text-slate-400 text-lg mb-2">{activeSong?.artist}</p>
          
          {!useLocal && youtubeError === 150 && (
            <div className="mt-4 mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center shadow-lg animate-in slide-in-from-top-2">
              <h4 className="text-amber-400 font-bold text-sm mb-1 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Blocked by Music Label
              </h4>
              <p className="text-amber-500/80 text-xs mb-3">This original song can only be listened to directly on YouTube's website or app.</p>
              <a 
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${activeSong?.title || ''} ${activeSong?.artist || ''} tamil song`)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-bold transition-colors"
              >
                Listen on YouTube
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </a>
            </div>
          )}

          {!useLocal && !activeSong?.youtubeVideoId && (
             <p className="text-amber-500/60 text-[10px] mb-6 italic uppercase tracking-wider font-bold">Please add this song to your 'Main songs' folder to play it.</p>
          )}
          {(useLocal || (activeSong?.youtubeVideoId && youtubeError !== 150)) && <div className="mb-6"></div>}

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button
              onClick={handleTogglePlay}
              disabled={!useLocal && (!activeSong?.youtubeVideoId || youtubeError === 150)}
              className={`px-5 py-2.5 w-full sm:w-auto text-center rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-semibold shadow-lg ${
                !useLocal && (!activeSong?.youtubeVideoId || youtubeError === 150)
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700 shadow-none' 
                  : isPlaying 
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20' 
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
            >
              {isPlaying ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause Audio
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Play Audio
                </>
              )}
            </button>
            {(!(!useLocal && youtubeError === 150)) && (
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${activeSong?.title || ''} ${activeSong?.artist || ''} tamil song`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 w-full sm:w-auto text-center bg-transparent border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                Watch Video
              </a>
            )}
            <button
              onClick={playNext}
              className="px-5 py-2.5 w-full sm:w-auto text-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              title="Play Next Song"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Recommendation List */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2 px-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3V7.803l8-1.6v3.54a4.29 4.29 0 00-1-0.743c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3V3z" />
          </svg>
          Mood Playlist
        </h3>
        <div className="space-y-3 pb-8">
          {analysis.recommendations.map((song, idx) => (
            <button
              key={`${song.title}-${idx}`}
              onClick={() => handleSongClick(idx)}
              className={`
                w-full text-left group border p-4 rounded-2xl transition-all duration-300 flex items-center gap-4
                ${currentIndex === idx
                  ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20'
                  : 'bg-slate-800/30 hover:bg-slate-700/40 border-slate-700/50 shadow-sm'
                }
              `}
            >
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all relative overflow-hidden
                ${currentIndex === idx
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                  : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'
                }
              `}>
                <span className={currentIndex === idx ? 'opacity-0' : 'group-hover:opacity-0 transition-opacity'}>{idx + 1}</span>

                {/* Explicit Pause/Play overlay */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${currentIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {currentIndex === idx ? (
                    isPlaying ? (
                      <div className="group-hover:opacity-0 transition-opacity flex gap-0.5 items-end h-4">
                        <span className="w-1 bg-white animate-[music-bar_0.6s_ease-in-out_infinite]"></span>
                        <span className="w-1 bg-white animate-[music-bar_0.8s_ease-in-out_infinite_0.1s]"></span>
                        <span className="w-1 bg-white animate-[music-bar_0.7s_ease-in-out_infinite_0.2s]"></span>
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:opacity-0 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    )
                  ) : null}

                  {/* Hover icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {currentIndex === idx && isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">{song.title}</h4>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ml-2 whitespace-nowrap border ${currentIndex === idx ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-slate-700/50 border-slate-600/50 text-slate-400'
                    }`}>
                    {song.moodMatch}
                  </span>
                </div>
                <p className="text-slate-400 text-sm font-medium">{song.artist}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1 group-hover:text-slate-400 transition-colors italic">
                  {song.reason}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 4px; }
          50% { height: 20px; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

const getMoodEmoji = (mood: string): string => {
  const m = mood.toLowerCase();
  if (m.includes('happy') || m.includes('joy')) return '😊';
  if (m.includes('sad') || m.includes('unhappy')) return '😔';
  if (m.includes('angry') || m.includes('mad')) return '😠';
  if (m.includes('surprise')) return '😲';
  if (m.includes('neutral')) return '😐';
  if (m.includes('fear') || m.includes('scared')) return '😨';
  if (m.includes('disgust')) return '🤢';
  if (m.includes('tired') || m.includes('sleepy')) return '😴';
  if (m.includes('cool') || m.includes('confident')) return '😎';
  return '✨';
};

export default MoodDisplay;
