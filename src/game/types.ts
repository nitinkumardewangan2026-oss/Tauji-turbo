export type TrackId = "express" | "dual" | "desi";

export type CharacterId = "baldev" | "ramesh" | "joe";

export type BetAmount = 50 | 100 | 250 | 1000;

export type GamePhase = "menu" | "track" | "character" | "bet" | "countdown" | "race" | "result";

export type RaceOutcome = "win" | "eliminated";

export interface TrackConfig {
  id: TrackId;
  name: string;
  difficulty: "Simple" | "Medium" | "Hard";
  description: string;
  laneCount: number;
  roadWidth: number;
  bidirectional: boolean;
  hasOncoming: boolean;
  potholeDensity: number;
  cowDensity: number;
  rickshawDensity: number;
  trafficDensity: number;
  length: number;
  accentColor: string;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  color: string;
  accent: string;
  bio: string;
  topSpeed: number;
  handling: number;
  boost: number;
}

export interface RaceState {
  speed: number;
  oxygen: number;
  progress: number;
  pot: number;
  position: number;
  totalRacers: number;
  countdown: number;
  shaking: boolean;
  wobble: number;
  rubbernecking: boolean;
  drifting: boolean;
  boosting: boolean;
  crashed: boolean;
  finished: boolean;
  rank: number;
  multiplier: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
  drift: boolean;
  boost: boolean;
}

export const TRACKS: Record<TrackId, TrackConfig> = {
  express: {
    id: "express",
    name: "Express Highway",
    difficulty: "Simple",
    description: "4-lane unidirectional expressway. Warm-up pacing with standard traffic and periodic potholes.",
    laneCount: 4,
    roadWidth: 16,
    bidirectional: false,
    hasOncoming: false,
    potholeDensity: 0.35,
    cowDensity: 0,
    rickshawDensity: 0,
    trafficDensity: 0.5,
    length: 2000,
    accentColor: "#3b82f6",
  },
  dual: {
    id: "dual",
    name: "Dual Highway",
    difficulty: "Medium",
    description: "6-lane bidirectional road. High-speed oncoming traffic with drift multiplier risk-reward.",
    laneCount: 6,
    roadWidth: 24,
    bidirectional: true,
    hasOncoming: true,
    potholeDensity: 0.5,
    cowDensity: 0,
    rickshawDensity: 0,
    trafficDensity: 0.7,
    length: 2500,
    accentColor: "#f59e0b",
  },
  desi: {
    id: "desi",
    name: "Desi Galli Havoc",
    difficulty: "Hard",
    description: "Narrow chaotic Indian road. Rickshaws, sacred cows, mopeds, and tea stalls. Reflexes required.",
    laneCount: 3,
    roadWidth: 12,
    bidirectional: true,
    hasOncoming: true,
    potholeDensity: 0.7,
    cowDensity: 0.3,
    rickshawDensity: 0.5,
    trafficDensity: 0.85,
    length: 1800,
    accentColor: "#ef4444",
  },
};

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  baldev: {
    id: "baldev",
    name: "Tauji Baldev",
    title: "The Nitro Patriarch",
    color: "#dc2626",
    accent: "#fca5a5",
    bio: "Retired army mechanic. Souped his wheelchair with a stolen scooter engine. Drinks chai at 180bpm.",
    topSpeed: 1.1,
    handling: 0.9,
    boost: 1.2,
  },
  ramesh: {
    id: "ramesh",
    name: "Chacha Ramesh",
    title: "The Drift King of Karol Bagh",
    color: "#2563eb",
    accent: "#93c5fd",
    bio: "Former auto-rickshaw champion. Knows every pothole by name. Allergic to speed bumps.",
    topSpeed: 0.95,
    handling: 1.25,
    boost: 1.0,
  },
  joe: {
    id: "joe",
    name: "Grandpa Joe",
    title: "The Oxygen Outlaw",
    color: "#16a34a",
    accent: "#86efac",
    bio: "Ex-formula-1 marshal. Smuggled a nitrous tank from the hospital. Boosts first, asks later.",
    topSpeed: 1.0,
    handling: 1.0,
    boost: 1.4,
  },
};

export const BET_OPTIONS: BetAmount[] = [50, 100, 250, 1000];

export const BET_LABELS: Record<BetAmount, string> = {
  50: "$50",
  100: "$100",
  250: "$250",
  1000: "All-In",
};
