import { ChevronLeft, ChevronRight, Gauge, Hand, Zap, Flame } from "lucide-react";
import type { InputState } from "@/game/types";

interface Props {
  inputRef: React.MutableRefObject<InputState>;
  onMash: () => void;
}

export default function TouchControls({ inputRef, onMash }: Props) {
  const set = (key: keyof InputState, val: boolean) => {
    inputRef.current[key] = val;
  };

  const press = (key: keyof InputState) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); set(key, true); },
    onPointerUp: () => set(key, false),
    onPointerLeave: () => set(key, false),
    onPointerCancel: () => set(key, false),
  });

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Left side: steer left + push */}
      <div className="absolute bottom-6 left-4 flex items-end gap-3 pointer-events-auto">
        <TouchBtn icon={<ChevronLeft size={32} />} label="LEFT" {...press("left")} />
        <TouchBtn icon={<ChevronRight size={32} />} label="RIGHT" {...press("right")} />
      </div>

      {/* Right side: push, drift, boost */}
      <div className="absolute bottom-6 right-4 flex items-end gap-3 pointer-events-auto">
        <TouchBtn icon={<Hand size={26} />} label="DRIFT" color="cyan" onPointerDown={(e) => { e.preventDefault(); onMash(); set("drift", true); }} onPointerUp={() => set("drift", false)} onPointerLeave={() => set("drift", false)} onPointerCancel={() => set("drift", false)} />
        <TouchBtn icon={<Zap size={26} />} label="BOOST" color="blue" {...press("boost")} />
        <TouchBtn icon={<Flame size={26} />} label="PUSH" color="amber" {...press("forward")} />
      </div>

      {/* Brake (bottom center-left) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <TouchBtn icon={<Gauge size={24} />} label="BRAKE" color="red" {...press("backward")} />
      </div>
    </div>
  );
}

function TouchBtn({
  icon,
  label,
  color = "slate",
  ...handlers
}: {
  icon: React.ReactNode;
  label: string;
  color?: "slate" | "amber" | "blue" | "cyan" | "red";
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  onPointerCancel?: () => void;
}) {
  const colors: Record<string, string> = {
    slate: "bg-slate-800/80 border-slate-500 text-slate-200",
    amber: "bg-amber-600/80 border-amber-400 text-white",
    blue: "bg-blue-600/80 border-blue-400 text-white",
    cyan: "bg-cyan-600/80 border-cyan-400 text-white",
    red: "bg-red-600/80 border-red-400 text-white",
  };
  return (
    <button
      className={`flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 backdrop-blur-md active:scale-90 transition-transform shadow-xl ${colors[color]}`}
      {...handlers}
    >
      {icon}
      <span className="text-[10px] font-black mt-0.5">{label}</span>
    </button>
  );
}
