import { useEffect, useRef, useState } from "react";
import { Accessibility, Flame, Trophy, Info } from "lucide-react";

interface Props {
  onStart: () => void;
  onHowTo: () => void;
}

export default function MenuScreen({ onStart, onHowTo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);

  // animated background canvas (parallax speed lines)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    let t = 0;
    const lines: { x: number; y: number; len: number; speed: number }[] = [];
    for (let i = 0; i < 60; i++) {
      lines.push({ x: Math.random() * c.width, y: Math.random() * c.height, len: 20 + Math.random() * 80, speed: 2 + Math.random() * 8 });
    }
    const resize = () => { c.width = c.clientWidth; c.height = c.clientHeight; };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = "rgba(251, 146, 60, 0.4)";
      ctx.lineWidth = 2;
      for (const l of lines) {
        l.x += l.speed;
        if (l.x > c.width + 100) { l.x = -100; l.y = Math.random() * c.height; }
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x + l.len, l.y);
        ctx.stroke();
      }
      t++;
      setTick(t);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/60 to-slate-950/90" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative">
            <Accessibility size={64} className="text-amber-400" strokeWidth={2} />
            <Flame size={28} className="text-red-500 absolute -top-1 -right-1 animate-pulse" fill="currentColor" />
          </div>
        </div>

        <h1 className="font-black text-5xl sm:text-7xl leading-tight tracking-tight mb-2">
          <span className="bg-gradient-to-r from-amber-300 via-orange-500 to-red-500 bg-clip-text text-transparent">
            TAUJI TURBO
          </span>
        </h1>
        <p className="text-xl sm:text-2xl font-bold text-amber-200/90 mb-1">The Geriatric Grand Prix</p>
        <p className="text-slate-400 text-sm sm:text-base mb-10 max-w-lg">
          Elderly elders in nitro-injected wheelchairs bet their retirement funds on dangerous street races. Last racer standing — or first across the finish line — takes the entire pot.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={onStart}
            className="group relative flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-lg py-5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-orange-500/40"
          >
            <span className="flex items-center justify-center gap-2">
              <Trophy size={22} fill="currentColor" />
              START RACING
            </span>
          </button>
          <button
            onClick={onHowTo}
            className="sm:w-auto px-6 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold py-5 rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              <Info size={20} />
              How to Play
            </span>
          </button>
        </div>

        <p className="mt-10 text-xs text-slate-500 animate-pulse" key={tick % 120 === 0 ? tick : tick - 1}>
          Use keyboard on desktop &middot; touch controls on mobile
        </p>
      </div>
    </div>
  );
}
