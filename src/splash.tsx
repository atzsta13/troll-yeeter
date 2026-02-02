import './index.css';
import { trpc } from './trpc';
import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { VERSION } from './constants';

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
}

export const Splash = () => {
  const [highScore, setHighScore] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    trpc.user.getPreferences.query().then((res) => {
      setHighScore(res.highScore);
    }).catch(console.error);

    trpc.challenges.getDaily.query().then((c) => setChallenge(c ?? null)).catch(console.error);
  }, []);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-500 via-slate-900 to-slate-950 text-white font-sans p-6">

      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-4xl">☁️</div>
        <div className="absolute top-20 right-12 text-5xl">✨</div>
        <div className="absolute bottom-20 left-20 text-3xl">🚀</div>
      </div>

      <div className="z-10 flex flex-col items-center w-full max-w-sm gap-6">

        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-7xl animate-bounce">🧌</div>
          <h1 className="text-4xl font-black tracking-tight text-center">
            <span className="text-white">TROLL</span> <span className="text-[#FF4500]">YEETER</span>
          </h1>
          <p className="text-sm font-bold tracking-widest text-blue-300/80 uppercase">Vertical Pinball Launcher</p>
        </div>

        {/* Stats Row */}
        <div className="flex gap-4 w-full justify-center">
          {challenge && (
            <div className="rounded-xl bg-orange-600/20 border border-orange-500/30 px-4 py-3 text-center">
              <p className="text-xs font-black uppercase text-orange-400">Mission</p>
              <p className="text-sm font-bold text-white">{challenge.description}</p>
            </div>
          )}
          <div className="rounded-xl bg-blue-600/20 border border-blue-500/30 px-6 py-3 text-center">
            <p className="text-xs font-black uppercase text-blue-400">Best</p>
            <p className="text-2xl font-black text-white">{highScore.toLocaleString()}</p>
          </div>
        </div>

        {/* PLAY Button */}
        <button
          className="group w-full rounded-2xl bg-[#FF4500] py-5 shadow-[0_6px_0_rgb(180,50,0)] transition-all active:translate-y-1 active:shadow-none hover:bg-[#FF571A] hover:scale-[1.02]"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          <div className="flex items-center justify-center gap-4">
            <span className="text-4xl">🚀</span>
            <span className="text-2xl font-black text-white tracking-widest">YEET!</span>
          </div>
        </button>

        {/* Version */}
        <p className="text-xs opacity-40 tracking-tight">{VERSION}</p>

      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
