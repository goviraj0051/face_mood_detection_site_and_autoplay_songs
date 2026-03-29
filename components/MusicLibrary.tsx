import React, { useState, useEffect } from 'react';
import { Song } from '../types';
import { getSongs } from '../services/geminiService';

interface MusicLibraryProps {
  onSelectSong: (song: Song) => void;
  currentSongId?: string;
}

const MusicLibrary: React.FC<MusicLibraryProps> = ({ onSelectSong, currentSongId }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const data = await getSongs();
        setSongs(data);
      } catch (err) {
        setError('Failed to load music library');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 animate-pulse">Loading Library...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-3xl">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search songs or artists..."
          className="w-full bg-slate-900/50 border border-slate-700/50 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all placeholder:text-slate-600"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filteredSongs.length > 0 ? (
          filteredSongs.map((song, idx) => (
            <button
              key={`${song.youtubeVideoId}-${idx}`}
              onClick={() => onSelectSong(song)}
              className={`
                w-full text-left group border p-4 rounded-2xl transition-all duration-300 flex items-center gap-4
                ${currentSongId === song.youtubeVideoId
                  ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20'
                  : 'bg-slate-800/30 hover:bg-slate-700/40 border-slate-700/50 shadow-sm'
                }
              `}
            >
              <div className={`
                flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all relative overflow-hidden
                ${currentSongId === song.youtubeVideoId
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                  : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'
                }
              `}>
                {currentSongId === song.youtubeVideoId ? (
                   <div className="flex gap-0.5 items-end h-4">
                      <span className="w-1 bg-white animate-[music-bar_0.6s_ease-in-out_infinite]"></span>
                      <span className="w-1 bg-white animate-[music-bar_0.8s_ease-in-out_infinite_0.1s]"></span>
                      <span className="w-1 bg-white animate-[music-bar_0.7s_ease-in-out_infinite_0.2s]"></span>
                   </div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">{song.title}</h4>
                <p className="text-slate-400 text-sm">{song.artist}</p>
              </div>
              <div className="hidden sm:block text-slate-600 group-hover:text-indigo-400/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl">
            <p className="text-slate-500">No songs found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
      `}</style>
    </div>
  );
};

export default MusicLibrary;
