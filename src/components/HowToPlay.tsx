import { ArrowLeft, Keyboard, Smartphone, AlertTriangle, Wind, Gauge, Hand, Flame } from "lucide-react";

interface Props {
  onBack: () => void;
}

const CONTROLS = [
  { keys: "A / ←", action: "Steer left", icon: "⬅" },
  { keys: "D / →", action: "Steer right", icon: "➡" },
  { keys: "W / ↑", action: "Push wheels / accelerate", icon: "⬆" },
  { keys: "S / ↓", action: "Brake / reverse push", icon: "⬇" },
  { keys: "Space", action: "Handbrake drift slide", icon: "✋" },
  { keys: "Shift / E", action: "Nitrous boost (drains O₂)", icon: "💨" },
];

const HAZARDS = [
  { title: "Vehicle Collisions", desc: "Striking any moving car or truck triggers ragdoll ejection and instant elimination.", color: "text-red-400" },
  { title: "Potholes & Craters", desc: "Running over potholes causes violent screen shake, speed drop, and wheel wobble for 1.5s.", color: "text-amber-400" },
  { title: "Rubbernecking", desc: "Passing glamorous roadside distractions halves your speed for 2s — mash Space to break free!", color: "text-pink-400" },
  { title: "Oncoming Multiplier", desc: "Racing in oncoming lanes on Dual Highway grants a 2x drift multiplier — high risk, high reward.", color: "text-cyan-400" },
];

export default function HowToPlay({ onBack }: Props) {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-y-auto">
      <div className="sticky top-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center gap-3 z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors font-semibold">
          <ArrowLeft size={18} /> Back to Menu
        </button>
        <h1 className="text-xl font-black ml-2">How to Play</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Controls */}
        <section className="mb-10">
          <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
            <Keyboard size={24} className="text-amber-400" /> Keyboard Controls
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONTROLS.map((c) => (
              <div key={c.keys} className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                <kbd className="min-w-20 text-center bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm font-bold text-amber-300">
                  {c.keys}
                </kbd>
                <span className="text-slate-300 text-sm font-medium">{c.action}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-400 flex items-center gap-2">
            <Smartphone size={16} /> On mobile, on-screen touch controls appear automatically.
          </p>
        </section>

        {/* HUD Legend */}
        <section className="mb-10">
          <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
            <Gauge size={24} className="text-amber-400" /> Your Dashboard
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <LegendCard icon={<Gauge size={20} className="text-amber-400" />} title="Speedometer" desc="Retro analog gauge showing your current speed." />
            <LegendCard icon={<Wind size={20} className="text-cyan-400" />} title="O₂ Tank" desc="Nitrous boost gauge. Drains when boosting, refills otherwise." />
            <LegendCard icon={<Flame size={20} className="text-red-400" />} title="Prize Pot" desc="Total wagered cash at the top. Winner takes all." />
            <LegendCard icon={<Hand size={20} className="text-slate-300" />} title="Race Progress" desc="Your position vs. AI competitors and remaining distance." />
          </div>
        </section>

        {/* Hazards */}
        <section className="mb-10">
          <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
            <AlertTriangle size={24} className="text-red-400" /> Hazards & Mechanics
          </h2>
          <div className="space-y-3">
            {HAZARDS.map((h) => (
              <div key={h.title} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
                <h3 className={`font-black mb-1 ${h.color}`}>{h.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Flow */}
        <section>
          <h2 className="text-2xl font-black mb-4">Race Flow</h2>
          <div className="flex flex-col gap-3">
            {[
              { n: 1, t: "Select your track", d: "Express Highway (easy), Dual Highway (medium), or Desi Galli (hard)." },
              { n: 2, t: "Pick your Tauji", d: "Each character has different speed, handling, and boost stats." },
              { n: 3, t: "Place your bet", d: "Wager $50, $100, $250, or go All-In. The pot grows with every bet." },
              { n: 4, t: "Race!", d: "First to the finish line or last racer standing takes the entire pot." },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-4 bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-white">{s.t}</h3>
                  <p className="text-slate-400 text-sm">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function LegendCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="mb-2">{icon}</div>
      <h3 className="font-bold text-sm text-white mb-1">{title}</h3>
      <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}
