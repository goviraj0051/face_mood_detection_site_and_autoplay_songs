import React, { useState } from 'react';
import { AppState, MoodAnalysis } from './types';
import CameraView from './components/CameraView';
import MoodDisplay from './components/MoodDisplay';
import { analyzeMoodFromImage, getAllSongs, getMoods, recommendSongsByMood } from './services/geminiService';


const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [moods, setMoods] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('');

  React.useEffect(() => {
    const fetchMoods = async () => {
      try {
        const data = await getMoods();
        setMoods(data);
      } catch (err) {
        console.error("Failed to fetch available moods:", err);
      }
    };

    fetchMoods();
  }, []);

  const handleCapture = async (base64Image: string) => {
    setState(AppState.LOADING);
    setError(null);
    try {
      const result = await analyzeMoodFromImage(base64Image);
      
      if (result.isBlurred) {
        setError("Image detected as blurry. Please try again with better lighting and hold steady.");
        setState(AppState.ERROR);
        return;
      }

      setAnalysis(result);
      setState(AppState.RESULT);
    } catch (err: any) {
      console.error("Capture handle error:", err);
      let errorMessage = err.message || "Something went wrong during analysis.";
      if (err.details) {
        errorMessage += ` Details: ${err.details}`;
      }
      setError(errorMessage);
      setState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setState(AppState.IDLE);
    setAnalysis(null);
    setError(null);
    setSelectedMood('');
  };

  const handleMoodSelect = async (mood: string) => {
    if (!mood) return;
    setState(AppState.LOADING);
    setError(null);
    setSelectedMood(mood);
    try {
      const result = await recommendSongsByMood(mood);
      setAnalysis(result);
      setState(AppState.RESULT);
    } catch (err: any) {

      setError(`Failed to load recommendations for ${mood}.`);
      setState(AppState.ERROR);
    }
  };

  const handleShuffleCSV = async () => {
    setState(AppState.LOADING);
    setError(null);
    try {
      const allSongs = await getAllSongs();
      const shuffled = [...allSongs].sort(() => Math.random() - 0.5).slice(0, 10);
      
      const analysis: MoodAnalysis = {
        mood: "Shuffle Mix",
        confidence: 1.0,
        description: "Your local Tamil music library, shuffled and ready to play.",
        color: "#6366f1", // Indigo
        recommendations: shuffled.map(s => ({
            ...s,
            filePath: (s as any).file_path || (s as any).filePath,
            reason: "Random pick from your local collection.",
            moodMatch: "Shuffle",
            youtubeVideoId: s.youtubeVideoId || "",
            youtubeUrl: s.youtubeVideoId ? `https://www.youtube.com/watch?v=${s.youtubeVideoId}` : undefined
        }))
      };
      
      setAnalysis(analysis);
      setState(AppState.RESULT);
    } catch (err: any) {
      setError("Failed to load songs from CSV.");
      setState(AppState.ERROR);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-12 px-4 selection:bg-indigo-500/30">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Tamil Music Edition
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400"> Vibe Time</span>
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
            Scan your mood and let AI curate the perfect Tamil playlist.
          </p>
        </header>

        <main className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left Column: Input */}
          <section className="space-y-6">
            <div className="relative">
              <CameraView
                onCapture={handleCapture}
                isLoading={state === AppState.LOADING}
                appState={state}
              />

              {state === AppState.RESULT && (
                <button
                  onClick={handleReset}
                  className="mt-4 w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 group shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Scan New Mood
                </button>
              )}
            </div>

            {state === AppState.ERROR && (
              <div className={`p-4 rounded-2xl text-sm shadow-xl border ${
                error?.toLowerCase().includes('blurry') 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  {error?.toLowerCase().includes('blurry') ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.103-1.103A1 1 0 0011.172 3H8.828a1 1 0 00-.707.293L7.017 4.414A1 1 0 016.31 4.707H4zm6 9a3 3 0 110-6 3 3 0 010 6z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {error?.toLowerCase().includes('blurry') ? 'Focus Required' : 'Analysis Error'}
                </div>
                <p className="mb-3">{error}</p>
                {error?.toLowerCase().includes('blurry') && (
                  <button
                    onClick={handleReset}
                    className="w-full py-2 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl border border-amber-500/30 transition-all font-semibold flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Try Again
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Right Column: Results */}
          <section className="min-h-[400px]">
            {state === AppState.IDLE && (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center bg-slate-900/20 group hover:border-indigo-500/30 transition-colors">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500 group-hover:text-indigo-400 group-hover:bg-slate-700 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-slate-300 font-medium mb-2">Ready to scan</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">Upload or snap a photo of your face.</p>
              </div>
            )}


            {state === AppState.LOADING && (
              <div className="h-full flex flex-col items-center justify-center space-y-6 bg-slate-900/10 rounded-3xl border border-slate-800/50 p-8">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-indigo-400 text-lg font-bold animate-pulse">Analyzing Vibe...</p>
                  <div className="flex gap-1 justify-center">
                    <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
                    <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-300"></span>
                  </div>
                </div>
              </div>
            )}

            {state === AppState.RESULT && analysis && (
              <MoodDisplay analysis={analysis} />
            )}
          </section>
        </main>

        {/* Footer */}
        <footer className="pt-12 pb-6 border-t border-slate-900 text-center space-y-4">
          <div className="flex justify-center gap-8">
            <span className="text-slate-600 text-[10px] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/50"></span>
              Secure Local Video
            </span>
            <span className="text-slate-600 text-[10px] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500/50"></span>
              YouTube Integrated
            </span>
          </div>
          <p className="text-slate-700 text-[10px] font-medium uppercase tracking-[0.3em]">
            Built with  Pro Vision • Tamil Edition
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
