import { useEffect, useRef, useState } from "react";
import { Trophy, HeartCrack, RotateCcw, DollarSign } from "lucide-react";
import type { RaceOutcome, CharacterConfig } from "@/game/types";

interface Props {
  outcome: RaceOutcome;
  pot: number;
  bet: number;
  character: CharacterConfig;
  onRestart: () => void;
  onMenu: () => void;
}

export default function ResultScreen({ outcome, pot, bet, character, onRestart, onMenu }: Props) {
  const isWin = outcome === "win";
  const payout = isWin ? pot : 0;
  const loss = isWin ? 0 : bet;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isWin) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    c.width = c.clientWidth;
    c.height = c.clientHeight;
    type P = { x: number; y: number; vx: number; vy: number; size: number; color: string; rot: number; vr: number };
    const colors = ["#fbbf24", "#f59e0b", "#22c55e", "#10b981", "#ef4444", "#3b82f6"];
    const particles: P[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: c.width / 2,
        y: c.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 4,
        size: 8 + Math.random() * 14,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
      });
    }
    let raf = 0;
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      particles.forEach((p) => {
        p.vy += 0.4;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      frame++;
      if (frame % 10 === 0) setCount(frame);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [isWin]);

  return (
    <div className={`relative min-h-screen w-full overflow-hidden flex items-center justify-center ${isWin ? "bg-gradient-to-b from-amber-950 via-slate-950 to-slate-900" : "bg-gradient-to-b from-slate-950 via-slate-900 to-red-950"} text-white px-6`}>
      {isWin && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}

      <div className="relative z-10 flex flex-col items-center text-center max-w-xl">
        {isWin ? (
          <>
            <div className="mb-4">
              <Trophy size={80} className="text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]" fill="currentColor" />
            </div>
            <h1 className="text-6xl sm:text-7xl font-black mb-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              VICTORY!
            </h1>
            <p className="text-amber-200/80 text-lg mb-1 font-semibold">{character.name} takes the pot!</p>
            <div className="my-6 flex items-center gap-2">
              <DollarSign size={28} className="text-green-400" />
              <span className="text-5xl font-black text-green-400 tabular-nums">+${payout.toLocaleString()}</span>
            </div>
            <p className="text-slate-400 text-sm mb-8">Your wheelchair does a glorious victory spin as cash rains from the sky.</p>
          </>
        ) : (
          <>
            <div className="mb-4 animate-[wiggle_0.5s_ease-in-out_infinite]">
              <HeartCrack size={80} className="text-red-500" />
            </div>
            <h1 className="text-5xl sm:text-6xl font-black mb-3 text-red-500 tracking-tight">
              TOTALED!
            </h1>
            <p className="text-red-200/80 text-lg mb-1 font-semibold">You're out of the race!</p>
            <p className="text-slate-400 text-sm mb-2">{character.name}'s wheelchair lies in pieces by the roadside.</p>
            <div className="my-6 flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-400">Pension lost:</span>
              <span className="text-4xl font-black text-red-400 tabular-nums">-${loss.toLocaleString()}</span>
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <button
            onClick={onRestart}
            className={`flex-1 flex items-center justify-center gap-2 font-black text-lg py-5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-2xl ${isWin ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-orange-500/40" : "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-red-500/40"}`}
          >
            <RotateCcw size={22} />
            {isWin ? "Race Again" : "Double or Nothing"}
          </button>
          <button
            onClick={onMenu}
            className="sm:w-auto px-6 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold py-5 rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            Main Menu
          </button>
        </div>
      </div>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
      {/* keep count used to re-render particle overlay */}
      <span className="hidden">{count}</span>
    </div>
  );
}
