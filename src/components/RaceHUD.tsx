import { useEffect, useRef } from "react";
import { Gauge, Wind, Flag, Trophy, AlertTriangle } from "lucide-react";
import type { RaceState, TrackConfig } from "@/game/types";

interface Props {
  state: RaceState;
  track: TrackConfig;
  pot: number;
  isMobile: boolean;
}

export default function RaceHUD({ state, track, pot, isMobile }: Props) {
  const speedNeedleRef = useRef<SVGSVGElement>(null);

  // speedometer needle
  useEffect(() => {
    const needle = speedNeedleRef.current;
    if (!needle) return;
    const speedPct = Math.min(1, state.speed / 45);
    const angle = -120 + speedPct * 240;
    needle.style.transform = `rotate(${angle}deg)`;
  }, [state.speed]);

  const speedMph = Math.round(state.speed * 3.5);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* Top center: prize pot */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-amber-500/40 rounded-full px-5 py-2 shadow-xl">
          <Trophy size={18} className="text-amber-400" fill="currentColor" />
          <span className="text-amber-300 font-black text-lg">${pot.toLocaleString()}</span>
          <span className="text-slate-400 text-xs font-semibold uppercase">Prize Pot</span>
        </div>
      </div>

      {/* Top left: race progress + position */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Flag size={14} className="text-green-400" />
            <span className="text-xs text-slate-400 font-bold uppercase">Progress</span>
          </div>
          <div className="w-40 h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-200" style={{ width: `${state.progress * 100}%` }} />
          </div>
          <p className="text-xs text-slate-300 mt-1 font-semibold">{Math.round(state.progress * 100)}% · {track.name}</p>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-2 shadow-lg">
          <span className="text-xs text-slate-400 font-bold uppercase">Position</span>
          <p className="text-2xl font-black text-white">
            {state.position}<span className="text-sm text-slate-400">/{state.totalRacers}</span>
          </p>
        </div>
      </div>

      {/* Top right: multiplier + warnings */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        {state.multiplier > 1 && (
          <div className="bg-red-500/90 border border-red-400 rounded-xl px-4 py-2 shadow-lg animate-pulse">
            <span className="text-white font-black text-lg">{state.multiplier}x ONCOMING!</span>
          </div>
        )}
        {state.rubbernecking && (
          <div className="bg-pink-500/90 border border-pink-400 rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
            <AlertTriangle size={18} className="text-white" />
            <span className="text-white font-black text-sm">RUBBERNECK! Mash DRIFT</span>
          </div>
        )}
        {state.drifting && (
          <div className="bg-cyan-500/80 border border-cyan-400 rounded-xl px-3 py-1.5 shadow-lg">
            <span className="text-white font-black text-sm">DRIFTING</span>
          </div>
        )}
      </div>

      {/* Bottom left: speedometer */}
      <div className="absolute bottom-4 left-4">
        <div className="relative w-32 h-32 sm:w-36 sm:h-36">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* dial bg */}
            <circle cx="50" cy="50" r="46" fill="rgba(15,23,42,0.85)" stroke="rgba(120,120,130,0.4)" strokeWidth="1" />
            {/* ticks */}
            {Array.from({ length: 9 }).map((_, i) => {
              const a = (-120 + (i / 8) * 240) * (Math.PI / 180);
              const x1 = 50 + Math.cos(a) * 40;
              const y1 = 50 + Math.sin(a) * 40;
              const x2 = 50 + Math.cos(a) * 44;
              const y2 = 50 + Math.sin(a) * 44;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i >= 6 ? "#ef4444" : "#94a3b8"} strokeWidth={i >= 6 ? "2" : "1"} />;
            })}
            {/* arc */}
            <path d="M 18 75 A 40 40 0 1 1 82 75" fill="none" stroke="#334155" strokeWidth="3" />
            {/* needle */}
            <g ref={speedNeedleRef} style={{ transformOrigin: "50px 50px", transition: "transform 0.15s ease-out" }}>
              <line x1="50" y1="50" x2="50" y2="16" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
            </g>
            <circle cx="50" cy="50" r="4" fill="#f59e0b" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
            <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">{speedMph}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">mph</span>
          </div>
          <div className="absolute -top-1 -right-1 bg-slate-800/80 rounded-full p-1">
            <Gauge size={16} className="text-amber-400" />
          </div>
        </div>
      </div>

      {/* Bottom right: oxygen tank */}
      <div className="absolute bottom-4 right-4">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-3 shadow-lg w-36">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wind size={14} className={state.boosting ? "text-cyan-400 animate-pulse" : "text-slate-400"} />
            <span className="text-xs text-slate-400 font-bold uppercase">O₂ Tank</span>
          </div>
          <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${state.oxygen > 30 ? "bg-gradient-to-r from-cyan-500 to-blue-400" : "bg-gradient-to-r from-red-500 to-orange-500"}`}
              style={{ width: `${state.oxygen}%` }}
            />
          </div>
          <p className="text-right text-xs text-slate-300 mt-1 font-bold tabular-nums">{Math.round(state.oxygen)}%</p>
        </div>
      </div>

      {/* Countdown overlay */}
      {state.countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-amber-400 text-2xl font-bold uppercase tracking-widest mb-2">Get Ready</p>
            <p className="text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-[ping_1s_ease-out]">
              {state.countdown > 0 ? Math.ceil(state.countdown) : "GO!"}
            </p>
          </div>
        </div>
      )}

      {/* Mobile: hint to use touch controls */}
      {isMobile && state.countdown === 0 && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 text-slate-400 text-xs font-semibold animate-pulse">
          Use on-screen controls
        </div>
      )}
    </div>
  );
}
