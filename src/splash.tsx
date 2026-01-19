import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#87CEEB] to-[#1a1a1d] text-white">
      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 text-4xl opacity-50 animate-bounce">☁️</div>
      <div className="absolute top-20 right-20 text-5xl opacity-50 animate-pulse">☁️</div>

      <div className="z-10 flex flex-col items-center gap-6">
        <div className="text-8xl animate-[spin_3s_linear_infinite]">
          🧌
        </div>

        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-lg">
            TROLL
          </h1>
          <h1 className="text-6xl font-black tracking-tighter text-[#FF4500] drop-shadow-xl">
            YEETER
          </h1>
        </div>

        <p className="text-lg font-medium text-gray-200 opacity-90">
          Yeet the troll into the stratosphere!
        </p>

        <button
          className="mt-4 flex transform items-center gap-3 rounded-full bg-[#FF4500] px-8 py-4 text-2xl font-bold text-white shadow-[0_4px_0_rgb(180,50,0)] transition-all active:translate-y-1 active:shadow-none hover:bg-[#ff571a]"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          🚀 START YEETING
        </button>
      </div>

      <div className="absolute bottom-8 text-sm text-gray-400">
        v0.6 • Built with Phaser & Devvit
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
