import { useCallback, useEffect, useRef, useState } from "react";
import MenuScreen from "@/components/MenuScreen";
import HowToPlay from "@/components/HowToPlay";
import PreRaceScreen from "@/components/PreRaceScreen";
import RaceHUD from "@/components/RaceHUD";
import TouchControls from "@/components/TouchControls";
import ResultScreen from "@/components/ResultScreen";
import { RaceEngine, type EngineCallbacks } from "@/game/RaceEngine";
import {
  TRACKS, CHARACTERS, BET_OPTIONS,
  type TrackId, type CharacterId, type BetAmount, type RaceState, type InputState,
} from "@/game/types";
import {
  unlockAudio, startEngine, stopEngine, updateEngine, playHorn, playCrash,
  playPothole, playBoost, playDrift, playCountdownBeep, playCountdownGo, playWin, playLose,
} from "@/game/audio";

type Screen = "menu" | "howto" | "pre" | "race" | "result";

const DEFAULT_STATE: RaceState = {
  speed: 0, oxygen: 100, progress: 0, pot: 0, position: 1, totalRacers: 4,
  countdown: 4, shaking: false, wobble: 0, rubbernecking: false, drifting: false,
  boosting: false, crashed: false, finished: false, rank: 1, multiplier: 1,
};

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [wallet, setWallet] = useState(1000);
  const [trackId, setTrackId] = useState<TrackId>("express");
  const [charId, setCharId] = useState<CharacterId>("baldev");
  const [bet, setBet] = useState<BetAmount>(100);
  const [raceState, setRaceState] = useState<RaceState>(DEFAULT_STATE);
  const [outcome, setOutcome] = useState<"win" | "eliminated">("win");
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RaceEngine | null>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, forward: false, backward: false, drift: false, boost: false });
  const lastCountdownRef = useRef(4);
  const potRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // --- Start race ---
  const startRace = useCallback((t: TrackId, c: CharacterId, b: BetAmount) => {
    setTrackId(t);
    setCharId(c);
    setBet(b);
    // All-In (1000 sentinel) uses the actual wallet amount
    const actualBet = b === 1000 ? wallet : b;
    // AI racers add to pot too (3 AI * same bet)
    const totalPot = actualBet * 4;
    potRef.current = totalPot;
    setRaceState({ ...DEFAULT_STATE, pot: totalPot, countdown: 4 });
    lastCountdownRef.current = 4;
    finishedRef.current = false;
    setScreen("race");
  }, [wallet]);

  // --- Init engine when entering race screen ---
  useEffect(() => {
    if (screen !== "race" || !containerRef.current) return;
    unlockAudio();

    const track = TRACKS[trackId];
    const character = CHARACTERS[charId];
    let countdownBeeped: number[] = [];

    const callbacks: EngineCallbacks = {
      onCrash: () => {
        playCrash();
        stopEngine();
      },
      onPothole: () => {
        playPothole();
      },
      onRubberneck: () => {
        playDrift();
      },
      onWin: () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        playWin();
        stopEngine();
        setTimeout(() => {
          setOutcome("win");
          setWallet((w) => w + potRef.current);
          setScreen("result");
        }, 1200);
      },
      onState: (s) => {
        // countdown beeps
        if (s.countdown > 0 && s.countdown !== lastCountdownRef.current) {
          lastCountdownRef.current = s.countdown;
          if (!countdownBeeped.includes(s.countdown)) {
            countdownBeeped.push(s.countdown);
            if (s.countdown > 0) playCountdownBeep();
          }
        }
        // GO beep when countdown hits 0
        if (s.countdown === 0 && lastCountdownRef.current !== 0) {
          lastCountdownRef.current = 0;
          playCountdownGo();
          startEngine();
        }
        setRaceState({ ...s, pot: potRef.current });
        updateEngine(s.speed / 45, s.boosting);
        // check elimination
        if (s.crashed && !finishedRef.current) {
          finishedRef.current = true;
          playLose();
          setOutcome("eliminated");
          setTimeout(() => setScreen("result"), 1800);
        }
      },
    };

    const engine = new RaceEngine(containerRef.current, track, character, callbacks);
    engineRef.current = engine;
    engine.setInput(inputRef.current);
    engine.start();

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.dispose();
      engineRef.current = null;
      stopEngine();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // --- Keyboard input ---
  useEffect(() => {
    if (screen !== "race") return;
    const onDown = (e: KeyboardEvent) => {
      handleKey(e, true);
    };
    const onUp = (e: KeyboardEvent) => {
      handleKey(e, false);
    };
    const handleKey = (e: KeyboardEvent, val: boolean) => {
      switch (e.key) {
        case "a": case "A": case "ArrowLeft":
          e.preventDefault(); inputRef.current.left = val; break;
        case "d": case "D": case "ArrowRight":
          e.preventDefault(); inputRef.current.right = val; break;
        case "w": case "W": case "ArrowUp":
          e.preventDefault(); inputRef.current.forward = val; break;
        case "s": case "S": case "ArrowDown":
          e.preventDefault(); inputRef.current.backward = val; break;
        case " ":
          e.preventDefault();
          inputRef.current.drift = val;
          if (val) engineRef.current?.mashDrift();
          break;
        case "Shift": case "e": case "E":
          e.preventDefault(); inputRef.current.boost = val;
          if (val) playBoost();
          break;
        case "h": case "H":
          if (val) playHorn();
          break;
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      inputRef.current = { left: false, right: false, forward: false, backward: false, drift: false, boost: false };
    };
  }, [screen]);

  const restart = () => {
    // Double or Nothing: wager same bet if wallet allows, otherwise wager what's left
    if (wallet < 50) { setWallet(1000); startRace(trackId, charId, 50); return; }
    const canBet: BetAmount = (wallet >= bet ? bet : (wallet >= 250 ? 250 : wallet >= 100 ? 100 : 50)) as BetAmount;
    if (canBet === 1000) {
      setWallet(0);
    } else {
      setWallet((w) => Math.max(0, w - canBet));
    }
    startRace(trackId, charId, canBet);
  };

  const handlePreComplete = (t: TrackId, c: CharacterId, b: BetAmount) => {
    if (b === 1000) setWallet(0);
    else setWallet((w) => w - b);
    startRace(t, c, b);
  };

  const handleResultMenu = () => {
    // If wallet too low, reset to starting amount
    if (wallet < 50) setWallet(1000);
    setScreen("menu");
  };

  if (screen === "menu") {
    return (
      <>
        <MenuScreen onStart={() => setScreen("pre")} onHowTo={() => setScreen("howto")} />
      </>
    );
  }

  if (screen === "howto") {
    return <HowToPlay onBack={() => setScreen("menu")} />;
  }

  if (screen === "pre") {
    return (
      <PreRaceScreen
        wallet={wallet}
        onComplete={handlePreComplete}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "race") {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
        <div ref={containerRef} className="absolute inset-0" />
        <RaceHUD state={raceState} track={TRACKS[trackId]} pot={potRef.current} isMobile={isMobile} />
        {isMobile && (
          <TouchControls
            inputRef={inputRef}
            onMash={() => engineRef.current?.mashDrift()}
          />
        )}
      </div>
    );
  }

  if (screen === "result") {
    return (
      <ResultScreen
        outcome={outcome}
        pot={potRef.current}
        bet={bet}
        character={CHARACTERS[charId]}
        onRestart={restart}
        onMenu={handleResultMenu}
      />
    );
  }

  return null;
}

export default App;
