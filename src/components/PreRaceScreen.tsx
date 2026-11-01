import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { TRACKS, CHARACTERS, BET_OPTIONS, BET_LABELS, type TrackId, type CharacterId, type BetAmount, type TrackConfig, type CharacterConfig } from "@/game/types";
import { playUiClick, playUiSelect } from "@/game/audio";

interface Props {
  onComplete: (track: TrackId, character: CharacterId, bet: BetAmount) => void;
  onBack: () => void;
  wallet: number;
}

type Step = "track" | "character" | "bet";

export default function PreRaceScreen({ onComplete, onBack, wallet }: Props) {
  const [step, setStep] = useState<Step>("track");
  const [track, setTrack] = useState<TrackId | null>(null);
  const [character, setCharacter] = useState<CharacterId | null>(null);
  const [bet, setBet] = useState<BetAmount | null>(null);

  const next = (s: Step) => { playUiSelect(); setStep(s); };
  const back = () => { playUiClick(); onBack(); };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col">
      {/* progress dots */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
        <button onClick={step === "track" ? back : () => setStep(step === "character" ? "track" : "character")} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-2">
          {(["track", "character", "bet"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-2 rounded-full transition-all duration-300 ${step === s ? "w-8 bg-amber-400" : stepIndex(s) < stepIndex(step) ? "w-4 bg-amber-600" : "w-4 bg-slate-700"}`} />
              {i < 2 && <div className="w-4 h-px bg-slate-700" />}
            </div>
          ))}
        </div>
        <div className="text-sm font-bold text-amber-300">Wallet: ${wallet.toLocaleString()}</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === "track" && (
          <TrackSelect
            tracks={Object.values(TRACKS)}
            selected={track}
            onSelect={(id) => { playUiClick(); setTrack(id); }}
            onNext={() => track && next("character")}
          />
        )}
        {step === "character" && (
          <CharacterSelect
            characters={Object.values(CHARACTERS)}
            selected={character}
            onSelect={(id) => { playUiClick(); setCharacter(id); }}
            onNext={() => character && next("bet")}
          />
        )}
        {step === "bet" && (
          <BetSelect
            wallet={wallet}
            selected={bet}
            onSelect={(b) => { playUiClick(); setBet(b); }}
            onNext={() => { if (bet) { playUiSelect(); onComplete(track!, character!, bet); } }}
          />
        )}
      </div>
    </div>
  );
}

function stepIndex(s: Step): number {
  return { track: 0, character: 1, bet: 2 }[s];
}

// --- Track Select ---
function TrackSelect({ tracks, selected, onSelect, onNext }: { tracks: TrackConfig[]; selected: TrackId | null; onSelect: (id: TrackId) => void; onNext: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h2 className="text-3xl font-black mb-1">Select Your Track</h2>
      <p className="text-slate-400 mb-6">Pick your battlefield. Difficulty rises with each road.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tracks.map((t, i) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`group relative text-left rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:scale-[1.03] ${selected === t.id ? "border-amber-400 ring-4 ring-amber-400/30" : "border-slate-700 hover:border-slate-500"}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* visual */}
            <div className="relative h-44 overflow-hidden">
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${t.accentColor}cc, ${t.accentColor}44)` }} />
              <div className="absolute inset-0 flex items-end justify-center pb-3">
                <div className="w-3/4 h-2 bg-slate-800 rounded-full relative overflow-hidden">
                  {Array.from({ length: t.laneCount }).map((_, j) => (
                    <div key={j} className="absolute top-0 h-full w-px bg-amber-300/40" style={{ left: `${(j / t.laneCount) * 100}%` }} />
                  ))}
                  {t.bidirectional && <div className="absolute top-0 left-1/2 w-0.5 h-full bg-amber-400" />}
                </div>
              </div>
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <span className={`text-xs font-black px-2 py-1 rounded-full ${t.difficulty === "Simple" ? "bg-green-500" : t.difficulty === "Medium" ? "bg-amber-500" : "bg-red-500"} text-white`}>
                  {t.difficulty.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="p-5 bg-slate-900">
              <h3 className="text-xl font-black mb-1">{t.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Tag>{t.laneCount} lanes</Tag>
                {t.bidirectional && <Tag>Bidirectional</Tag>}
                {t.hasOncoming && <Tag>Oncoming traffic</Tag>}
                {t.cowDensity > 0 && <Tag>Sacred cows</Tag>}
                {t.rickshawDensity > 0 && <Tag>Auto-rickshaws</Tag>}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <button disabled={!selected} onClick={onNext} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-black px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:scale-100">
          Choose Character <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-full font-semibold">{children}</span>;
}

// --- Character Select ---
function CharacterSelect({ characters, selected, onSelect, onNext }: { characters: CharacterConfig[]; selected: CharacterId | null; onSelect: (id: CharacterId) => void; onNext: () => void }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h2 className="text-3xl font-black mb-1">Choose Your Tauji</h2>
      <p className="text-slate-400 mb-6">Each elder has unique speed, handling, and boost stats.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {characters.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`group relative text-left rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:scale-[1.03] ${selected === c.id ? "ring-4" : "border-slate-700 hover:border-slate-500"}`}
            style={selected === c.id ? { borderColor: c.color, boxShadow: `0 0 30px ${c.color}40` } : {}}
          >
            <div className="relative h-48 flex items-center justify-center" style={{ background: `linear-gradient(160deg, ${c.color}55, ${c.accent}22)` }}>
              {/* wheelchair emoji-style icon */}
              <div className="text-7xl" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }}>
                <WheelchairIcon color={c.color} accent={c.accent} />
              </div>
              <div className="absolute top-3 right-3">
                <span className="text-xs font-black px-2 py-1 rounded-full bg-slate-900/70 text-white">{c.title}</span>
              </div>
            </div>
            <div className="p-5 bg-slate-900">
              <h3 className="text-xl font-black" style={{ color: c.accent }}>{c.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mt-1 mb-4">{c.bio}</p>
              <div className="space-y-2">
                <StatBar label="Top Speed" value={c.topSpeed} color={c.color} />
                <StatBar label="Handling" value={c.handling} color={c.color} />
                <StatBar label="Boost" value={c.boost} color={c.color} />
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <button disabled={!selected} onClick={onNext} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-black px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:scale-100">
          Place Your Bet <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, (value / 1.4) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-20 font-semibold">{label}</span>
      <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function WheelchairIcon({ color, accent }: { color: string; accent: string }) {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="28" cy="42" r="12" />
      <circle cx="28" cy="42" r="3" fill={accent} stroke="none" />
      <path d="M28 42 L36 24 L48 24" />
      <path d="M36 24 L40 16" stroke={accent} />
      <circle cx="44" cy="20" r="4" fill={accent} stroke="none" />
      <path d="M28 30 L20 30 L16 38" />
    </svg>
  );
}

// --- Bet Select ---
function BetSelect({ wallet, selected, onSelect, onNext }: { wallet: number; selected: BetAmount | null; onSelect: (b: BetAmount) => void; onNext: () => void }) {
  const allIn: BetAmount = 1000;
  const canAllIn = wallet >= 1000;
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-3xl font-black mb-1">Place Your Bet</h2>
      <p className="text-slate-400 mb-6">Deposit your wager into the central prize pot. Win the race to take it all.</p>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700 mb-6 text-center">
        <p className="text-slate-400 text-sm font-semibold mb-2">CURRENT WALLET</p>
        <p className="text-5xl font-black text-amber-300">${wallet.toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {BET_OPTIONS.map((b) => {
          const isAllIn = b === allIn;
          const disabled = isAllIn && !canAllIn;
          return (
            <button
              key={b}
              disabled={disabled}
              onClick={() => onSelect(b)}
              className={`relative rounded-2xl p-6 border-2 font-black transition-all duration-300 ${selected === b ? "scale-105" : "hover:scale-105"} ${disabled ? "opacity-40 cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500" : selected === b ? "border-amber-400 bg-amber-500/15 text-amber-300 ring-4 ring-amber-400/30" : "border-slate-700 bg-slate-800/60 text-white hover:border-slate-500"}`}
            >
              {isAllIn ? (
                <div className="flex flex-col items-center gap-1">
                  <FlameIcon />
                  <span className="text-2xl">ALL-IN</span>
                  <span className="text-xs font-semibold opacity-70">Bet everything</span>
                </div>
              ) : (
                <span className="text-3xl">{BET_LABELS[b]}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button disabled={!selected} onClick={onNext} className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-950 font-black px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:scale-100 shadow-lg shadow-orange-500/30">
          Start The Race <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
      <path d="M12 2c-1 4-4 5-4 9a4 4 0 008 0c0-2-1-3-2-4 0 2-1 3-2 3 1-4-1-6 0-8z" />
    </svg>
  );
}
