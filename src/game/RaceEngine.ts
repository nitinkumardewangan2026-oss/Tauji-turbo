import * as THREE from "three";
import type { TrackConfig, CharacterConfig, InputState, RaceState } from "./types";

const FAR = 400;
const LANE_OFFSET = 3.4;

interface Hazard {
  mesh: THREE.Object3D;
  z: number;
  lane: number;
  type: "pothole" | "cow" | "rickshaw" | "car" | "truck" | "moped";
  vx?: number;
  speed?: number;
  hit?: boolean;
  distraction?: boolean;
}

interface Racer {
  group: THREE.Group;
  z: number;
  speed: number;
  lane: number;
  targetLane: number;
  finished: boolean;
  crashed: boolean;
  color: THREE.Color;
  wobbleT: number;
}

export interface EngineCallbacks {
  onCrash: () => void;
  onPothole: () => void;
  onRubberneck: (active: boolean) => void;
  onWin: () => void;
  onState: (s: RaceState) => void;
}

export class RaceEngine {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private cb: EngineCallbacks;

  private track: TrackConfig;
  private character: CharacterConfig;
  private input: InputState = { left: false, right: false, forward: false, backward: false, drift: false, boost: false };

  private player!: THREE.Group;
  private playerWheelL!: THREE.Mesh;
  private playerWheelR!: THREE.Mesh;
  private playerWheelLGeo: THREE.Mesh[] = [];
  private road!: THREE.Mesh;
  private roadLength: number;
  private hazards: Hazard[] = [];
  private racers: Racer[] = [];

  private speed = 0;
  private playerZ = 0;
  private playerLane = 1;
  private targetLaneX = 0;
  private oxygen = 100;
  private shakeT = 0;
  private wobble = 0;
  private rubberneckT = 0;
  private rubberneckMash = 0;
  private driftActive = false;
  private boosting = false;
  private crashed = false;
  private finished = false;
  private countdown = 3.99;
  private multiplier = 1;
  private elapsed = 0;
  private stateTimer = 0;

  constructor(container: HTMLElement, track: TrackConfig, character: CharacterConfig, cb: EngineCallbacks) {
    this.cb = cb;
    this.track = track;
    this.character = character;
    this.roadLength = track.length;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(new THREE.Color(track.accentColor).getHex(), 80, FAR);
    this.scene.background = new THREE.Color(new THREE.Color(track.accentColor).multiplyScalar(0.6).getHex());

    this.camera = new THREE.PerspectiveCamera(62, container.clientWidth / container.clientHeight, 0.1, FAR);
    this.camera.position.set(0, 5.5, -8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.buildRoad();
    this.buildPlayer();
    this.buildRacers();
    this.spawnInitialHazards();
  }

  private setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, new THREE.Color(this.track.accentColor), 0.7);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(20, 40, -10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 120;
    dir.shadow.camera.left = -60;
    dir.shadow.camera.right = 60;
    dir.shadow.camera.top = 60;
    dir.shadow.camera.bottom = -60;
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(new THREE.Color(this.track.accentColor), 0.3);
    fill.position.set(-10, 10, 10);
    this.scene.add(fill);
  }

  private buildRoad() {
    const w = this.track.roadWidth;
    const len = this.roadLength;
    const geo = new THREE.PlaneGeometry(w, len);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.95 });
    this.road = new THREE.Mesh(geo, mat);
    this.road.rotation.x = -Math.PI / 2;
    this.road.position.z = len / 2;
    this.road.receiveShadow = true;
    this.scene.add(this.road);

    // Lane markings via canvas texture
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1024;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#2a2a2e";
    g.fillRect(0, 0, 256, 1024);
    const lanes = this.track.laneCount;
    const halfW = 128;
    const laneW = (w * 128) / 256 / (this.track.bidirectional ? lanes / 2 : lanes);

    if (this.track.id === "desi") {
      // no markings, but draw faded edge
      g.strokeStyle = "rgba(255,255,255,0.15)";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(20, 0); g.lineTo(20, 1024);
      g.moveTo(236, 0); g.lineTo(236, 1024);
      g.stroke();
    } else {
      // dashed white lane dividers
      g.strokeStyle = "#f4f4f5";
      g.lineWidth = 3;
      g.setLineDash([40, 50]);
      const scaleX = 256 / w;
      const totalSegments = this.track.bidirectional ? lanes : lanes;
      const segLaneW = (w / totalSegments) * scaleX;
      for (let i = 1; i < totalSegments; i++) {
        const x = i * segLaneW;
        if (this.track.bidirectional && i === lanes / 2) {
          // yellow broken center line
          g.strokeStyle = "#fbbf24";
          g.setLineDash([30, 30]);
          g.beginPath();
          g.moveTo(x, 0); g.lineTo(x, 1024);
          g.stroke();
          g.strokeStyle = "#f4f4f5";
          g.setLineDash([40, 50]);
        } else {
          g.beginPath();
          g.moveTo(x, 0); g.lineTo(x, 1024);
          g.stroke();
        }
      }
      // solid edges
      g.setLineDash([]);
      g.strokeStyle = "#e5e7eb";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(0, 1024);
      g.moveTo(256, 0); g.lineTo(256, 1024);
      g.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, Math.floor(len / 20));
    (this.road.material as THREE.MeshStandardMaterial).map = tex;
    (this.road.material as THREE.MeshStandardMaterial).needsUpdate = true;

    // Roadside ground
    const groundGeo = new THREE.PlaneGeometry(w * 6, len);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1f3d2a, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.position.z = len / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Roadside props (trees/lamps/tea stalls)
    this.buildRoadside();
  }

  private buildRoadside() {
    const w = this.track.roadWidth;
    const isDesi = this.track.id === "desi";
    for (let z = 20; z < this.roadLength; z += 40) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (w / 2 + 3 + Math.random() * 4);

      if (isDesi && Math.random() < 0.4) {
        // tea stall
        const stall = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
        base.position.y = 1;
        base.castShadow = true;
        stall.add(base);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 2.4), new THREE.MeshStandardMaterial({ color: 0xea580c }));
        roof.position.y = 2.2;
        stall.add(roof);
        stall.position.set(x, 0, z);
        this.scene.add(stall);
      } else {
        // palm / tree
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 4, 6), new THREE.MeshStandardMaterial({ color: 0x5b3a1a }));
        trunk.position.y = 2;
        trunk.castShadow = true;
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2f7d32 }));
        leaves.position.y = 4.4;
        leaves.castShadow = true;
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(leaves);
        tree.position.set(x, 0, z);
        this.scene.add(tree);
      }

      // lamp post on highway
      if (!isDesi && z % 80 === 0) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0x6b7280 }));
        pole.position.y = 3;
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfff7ed, emissive: 0xfbbf24, emissiveIntensity: 0.6 }));
        lamp.position.y = 6;
        const post = new THREE.Group();
        post.add(pole);
        post.add(lamp);
        post.position.set(-side * (w / 2 + 1), 0, z);
        this.scene.add(post);
      }
    }
  }

  private buildWheelchair(color: THREE.Color, accent: THREE.Color): THREE.Group {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: color.getHex(), roughness: 0.6, metalness: 0.2 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accent.getHex(), roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.3, metalness: 0.8 });

    // seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 1.0), bodyMat);
    seat.position.y = 0.7;
    seat.castShadow = true;
    g.add(seat);

    // backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.12), bodyMat);
    back.position.set(0, 1.15, 0.5);
    back.castShadow = true;
    g.add(back);

    // elder torso (sphere-ish)
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf1c27d }));
    torso.position.set(0, 1.5, 0.1);
    torso.castShadow = true;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf1c27d }));
    head.position.set(0, 2.0, 0.05);
    head.castShadow = true;
    g.add(head);
    // turban/hat accent
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.18, 10), accentMat);
    hat.position.set(0, 2.18, 0.05);
    g.add(hat);

    // footrest
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.4), metalMat);
    foot.position.set(0, 0.25, -0.5);
    g.add(foot);

    // big wheels
    const wheelGeo = new THREE.TorusGeometry(0.5, 0.08, 8, 18);
    const wheelMat = metalMat;
    const wL = new THREE.Mesh(wheelGeo, wheelMat);
    wL.rotation.y = Math.PI / 2;
    wL.position.set(-0.55, 0.5, 0.2);
    wL.castShadow = true;
    g.add(wL);
    const wR = new THREE.Mesh(wheelGeo, wheelMat);
    wR.rotation.y = Math.PI / 2;
    wR.position.set(0.55, 0.5, 0.2);
    wR.castShadow = true;
    g.add(wR);

    // caster wheel front
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), metalMat);
    caster.position.set(0, 0.2, -0.55);
    g.add(caster);

    // nitro tank
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), accentMat);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 0.6, -0.5);
    g.add(tank);

    g.userData.wheels = [wL, wR];
    return g;
  }

  private buildPlayer() {
    const c = new THREE.Color(this.character.color);
    const a = new THREE.Color(this.character.accent);
    this.player = this.buildWheelchair(c, a);
    this.player.position.set(0, 0, 0);
    this.scene.add(this.player);
    const wheels = this.player.userData.wheels as THREE.Mesh[];
    this.playerWheelL = wheels[0];
    this.playerWheelR = wheels[1];
    this.playerWheelLGeo = wheels;
    this.targetLaneX = this.laneToX(1);
  }

  private laneToX(lane: number): number {
    const half = this.track.roadWidth / 2;
    const lanes = this.track.bidirectional ? this.track.laneCount : this.track.laneCount;
    const laneW = this.track.roadWidth / lanes;
    return -half + laneW * (lane + 0.5);
  }

  private buildRacers() {
    const colors = [new THREE.Color("#a855f7"), new THREE.Color("#06b6d4"), new THREE.Color("#f97316")];
    const accents = [new THREE.Color("#e9d5ff"), new THREE.Color("#a5f3fc"), new THREE.Color("#fed7aa")];
    const total = 4; // 3 AI + player
    for (let i = 0; i < 3; i++) {
      const chair = this.buildWheelchair(colors[i], accents[i]);
      const lane = Math.floor(Math.random() * this.track.laneCount);
      chair.position.set(this.laneToX(lane), 0, -10 - i * 5);
      this.scene.add(chair);
      this.racers.push({
        group: chair,
        z: -10 - i * 5,
        speed: 18 + Math.random() * 6,
        lane,
        targetLane: lane,
        finished: false,
        crashed: false,
        color: colors[i],
        wobbleT: 0,
      });
    }
    void total;
  }

  // --- Hazard spawning ---
  private spawnCar(z: number, oncoming: boolean): Hazard {
    const lane = Math.floor(Math.random() * this.track.laneCount);
    const isTruck = Math.random() < 0.25;
    const group = new THREE.Group();
    const w = isTruck ? 2.2 : 1.8;
    const h = isTruck ? 2.4 : 1.3;
    const l = isTruck ? 4.5 : 3.6;
    const bodyColor = new THREE.Color().setHSL(Math.random(), 0.5, 0.5);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), new THREE.MeshStandardMaterial({ color: bodyColor.getHex(), roughness: 0.4, metalness: 0.3 }));
    body.position.y = h / 2 + 0.3;
    body.castShadow = true;
    group.add(body);
    // windshield
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.5 }));
    glass.position.set(0, h / 2 + 0.4, oncoming ? l / 2 - 0.1 : -l / 2 + 0.1);
    group.add(glass);
    // wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 10);
    const wheelPos: [number, number, number][] = [
      [-w / 2, 0.35, l / 2.5], [w / 2, 0.35, l / 2.5],
      [-w / 2, 0.35, -l / 2.5], [w / 2, 0.35, -l / 2.5],
    ];
    wheelPos.forEach(([x, y, z2]) => {
      const wmesh = new THREE.Mesh(wheelGeo, wheelMat);
      wmesh.rotation.z = Math.PI / 2;
      wmesh.position.set(x, y, z2);
      group.add(wmesh);
    });
    group.position.set(this.laneToX(lane), 0, z);
    if (oncoming) group.rotation.y = Math.PI;
    this.scene.add(group);
    const baseSpeed = isTruck ? 16 : 22;
    return {
      mesh: group,
      z,
      lane,
      type: isTruck ? "truck" : "car",
      speed: oncoming ? -baseSpeed - Math.random() * 8 : baseSpeed * 0.4,
      vx: 0,
    };
  }

  private spawnPothole(z: number): Hazard {
    const r = 0.5 + Math.random() * 0.6;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.1, 10),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 })
    );
    mesh.rotation.x = Math.PI / 2;
    const lane = Math.floor(Math.random() * this.track.laneCount);
    mesh.position.set(this.laneToX(lane) + (Math.random() - 0.5) * 1.5, 0.02, z);
    this.scene.add(mesh);
    return { mesh, z, lane, type: "pothole" };
  }

  private spawnCow(z: number): Hazard {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 2.6), new THREE.MeshStandardMaterial({ color: 0xf5f5f4 }));
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.6), new THREE.MeshStandardMaterial({ color: 0xf5f5f4 }));
    head.position.set(0, 1.0, 1.5);
    group.add(head);
    // spots
    for (let i = 0; i < 4; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1c1917 }));
      spot.position.set((Math.random() - 0.5) * 1.5, 1.2 + Math.random() * 0.2, (Math.random() - 0.5) * 2);
      group.add(spot);
    }
    const lane = Math.floor(Math.random() * this.track.laneCount);
    group.position.set(this.laneToX(lane), 0, z);
    this.scene.add(group);
    return { mesh: group, z, lane, type: "cow", speed: 0 };
  }

  private spawnRickshaw(z: number): Hazard {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.0), new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 }));
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 2.0), new THREE.MeshStandardMaterial({ color: 0x1c1917 }));
    canopy.position.y = 1.5;
    group.add(canopy);
    const lane = Math.floor(Math.random() * this.track.laneCount);
    group.position.set(this.laneToX(lane), 0, z);
    const oncoming = Math.random() < 0.4;
    if (oncoming) group.rotation.y = Math.PI;
    this.scene.add(group);
    return { mesh: group, z, lane, type: "rickshaw", speed: oncoming ? -12 - Math.random() * 5 : 8, vx: (Math.random() - 0.5) * 3 };
  }

  private spawnMoped(z: number): Hazard {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 1.4), new THREE.MeshStandardMaterial({ color: 0x0ea5e9 }));
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);
    const lane = Math.floor(Math.random() * this.track.laneCount);
    group.position.set(this.laneToX(lane), 0, z);
    const oncoming = Math.random() < 0.5;
    if (oncoming) group.rotation.y = Math.PI;
    this.scene.add(group);
    return { mesh: group, z, lane, type: "moped", speed: oncoming ? -14 - Math.random() * 4 : 10, vx: (Math.random() - 0.5) * 2 };
  }

  private spawnDistraction(z: number) {
    // glamorous roadside pedestrian billboard
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (this.track.roadWidth / 2 + 4);
    const board = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4, 6), new THREE.MeshStandardMaterial({ color: 0x6b7280 }));
    post.position.y = 2;
    board.add(post);
    const img = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.2, side: THREE.DoubleSide }));
    img.position.set(0, 3.2, 0);
    if (side < 0) img.rotation.y = Math.PI / 2;
    else img.rotation.y = -Math.PI / 2;
    board.add(img);
    board.position.set(x, 0, z);
    this.scene.add(board);
    this.hazards.push({ mesh: board, z, lane: -1, type: "pothole", distraction: true, hit: false });
  }

  private spawnInitialHazards() {
    let z = 40;
    while (z < this.roadLength - 20) {
      const r = Math.random();
      if (this.track.cowDensity > 0 && r < this.track.cowDensity * 0.15) {
        this.hazards.push(this.spawnCow(z));
      } else if (this.track.rickshawDensity > 0 && r < this.track.rickshawDensity * 0.3) {
        this.hazards.push(this.spawnRickshaw(z));
      } else if (r < this.track.trafficDensity * 0.5) {
        this.hazards.push(this.spawnCar(z, this.track.hasOncoming && Math.random() < 0.4));
      } else if (r < this.track.trafficDensity * 0.5 + this.track.potholeDensity * 0.4) {
        this.hazards.push(this.spawnPothole(z));
      } else if (this.track.id === "desi" && r < 0.75) {
        this.hazards.push(this.spawnMoped(z));
      }
      // roadside distractions
      if (Math.random() < 0.12) this.spawnDistraction(z);
      z += 14 + Math.random() * 16;
    }
  }

  // --- Input ---
  // Store the live reference (not a copy) so keyboard/touch mutations are seen each frame.
  setInput(input: InputState) {
    this.input = input;
    if (input.drift && !this.driftActive) {
      this.driftActive = true;
    }
    if (!input.drift) this.driftActive = false;
  }

  // mash spacebar to break rubbernecking
  mashDrift() {
    if (this.rubberneckT > 0) {
      this.rubberneckMash++;
      if (this.rubberneckMash >= 6) {
        this.rubberneckT = 0;
        this.cb.onRubberneck(false);
      }
    }
  }

  // --- Loop ---
  start() {
    this.clock.start();
    this.loop();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private emitState() {
    const playerRank = this.computeRank();
    this.cb.onState({
      speed: this.speed,
      oxygen: this.oxygen,
      progress: Math.min(1, this.playerZ / this.roadLength),
      pot: 0, // set by React layer
      position: playerRank,
      totalRacers: this.racers.length + 1,
      countdown: Math.max(0, Math.ceil(this.countdown)),
      shaking: this.shakeT > 0,
      wobble: this.wobble,
      rubbernecking: this.rubberneckT > 0,
      drifting: this.driftActive,
      boosting: this.boosting,
      crashed: this.crashed,
      finished: this.finished,
      rank: playerRank,
      multiplier: this.multiplier,
    });
  }

  private computeRank(): number {
    let rank = 1;
    for (const r of this.racers) {
      if (r.z > this.playerZ) rank++;
    }
    return rank;
  }

  private update(dt: number) {
    if (this.crashed) {
      // ragdoll spin
      this.player.rotation.z += dt * 6;
      this.player.position.y = Math.max(0, this.player.position.y - dt * 2);
      this.updateCamera(dt);
      this.stateTimer += dt;
      if (this.stateTimer > 0.05) {
        this.stateTimer = 0;
        this.emitState();
      }
      return;
    }

    if (this.countdown > 0) {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.countdown = 0;
      }
      this.updateCamera(dt);
      this.emitState();
      return;
    }

    this.elapsed += dt;

    // steering
    const maxLane = this.track.laneCount - 1;
    if (this.input.left && this.playerLane > 0) {
      if (this.targetLaneX === this.player.position.x) this.playerLane--;
    }
    if (this.input.right && this.playerLane < maxLane) {
      if (this.targetLaneX === this.player.position.x) this.playerLane++;
    }
    this.targetLaneX = this.laneToX(this.playerLane);
    const steerSpeed = (this.character.handling * 8) * dt;
    this.player.position.x = THREE.MathUtils.lerp(this.player.position.x, this.targetLaneX, Math.min(1, steerSpeed));

    // oncoming lane multiplier (dual/desi)
    if (this.track.bidirectional) {
      const half = this.track.laneCount / 2;
      const inOncoming = this.playerLane >= half;
      this.multiplier = inOncoming ? 2 : 1;
    } else {
      this.multiplier = 1;
    }

    // speed
    const baseMax = 32 * this.character.topSpeed;
    let accel = 0;
    if (this.input.forward) accel = 18;
    else if (this.input.backward) accel = -25;
    else accel = -6;

    this.boosting = this.input.boost && this.oxygen > 0;
    if (this.boosting) {
      accel += 30 * this.character.boost;
      this.oxygen = Math.max(0, this.oxygen - 22 * dt);
    } else {
      this.oxygen = Math.min(100, this.oxygen + 8 * dt);
    }

    // rubbernecking halves speed
    if (this.rubberneckT > 0) {
      accel *= 0.5;
      this.rubberneckT -= dt;
      if (this.rubberneckT <= 0) this.cb.onRubberneck(false);
    }

    // pothole wobble
    if (this.wobble > 0) {
      accel *= 0.6;
      this.wobble -= dt;
      this.player.position.x += Math.sin(this.elapsed * 40) * 0.05;
    }

    this.speed += accel * dt;
    this.speed = Math.max(0, Math.min(this.speed, this.boosting ? baseMax * 1.4 : baseMax));

    // drift reduces speed but allows tighter steer visual
    if (this.driftActive) {
      this.speed = Math.max(this.speed * 0.97, 8);
    }

    // distance
    const moveZ = this.speed * dt * this.multiplier;
    this.playerZ += moveZ;

    // player mesh position
    this.player.position.z = this.playerZ;
    // tilt player based on steering
    const tilt = (this.targetLaneX - this.player.position.x) * 0.3;
    this.player.rotation.z = THREE.MathUtils.lerp(this.player.rotation.z, -tilt, 0.1);
    // wheel spin
    const spin = this.speed * dt * 0.5;
    this.playerWheelLGeo.forEach((w) => (w.rotation.x += spin));
    // bob
    this.player.position.y = Math.abs(Math.sin(this.elapsed * 8)) * 0.05;

    // update AI racers
    for (const r of this.racers) {
      if (r.finished || r.crashed) continue;
      // simple AI: move forward, occasionally change lanes, dodge hazards
      r.z += r.speed * dt;
      if (Math.random() < 0.01) r.targetLane = Math.max(0, Math.min(this.track.laneCount - 1, r.targetLane + (Math.random() > 0.5 ? 1 : -1)));
      const tx = this.laneToX(r.targetLane);
      r.group.position.x = THREE.MathUtils.lerp(r.group.position.x, tx, dt * 3);
      r.group.position.z = r.z;
      r.wobbleT += dt;
      r.group.position.y = Math.abs(Math.sin(r.wobbleT * 8)) * 0.05;
      const wheels = r.group.userData.wheels as THREE.Mesh[];
      if (wheels) wheels.forEach((w) => (w.rotation.x += r.speed * dt * 0.5));
      if (r.z > this.roadLength) r.finished = true;
    }

    // update hazards
    for (const h of this.hazards) {
      if (h.type === "car" || h.type === "truck" || h.type === "rickshaw" || h.type === "moped") {
        h.z += (h.speed || 0) * dt;
        if (h.vx) {
          const cur = h.mesh.position.x + h.vx * dt;
          const halfW = this.track.roadWidth / 2;
          if (Math.abs(cur) > halfW - 1) h.vx = -h.vx;
          h.mesh.position.x = cur;
        }
        h.mesh.position.z = h.z;
        // recycle oncoming cars that pass behind
        if (h.z < this.playerZ - 30 && (h.speed || 0) < 0) {
          h.z = this.playerZ + 100 + Math.random() * 80;
          h.mesh.position.z = h.z;
        }
        if (h.z > this.playerZ + 120 && (h.speed || 0) > 0) {
          // far ahead, keep
        }
      }
    }

    // collisions
    this.checkCollisions();

    // shake decay
    if (this.shakeT > 0) this.shakeT -= dt;

    // camera
    this.updateCamera(dt);

    // win condition
    if (this.playerZ >= this.roadLength && !this.finished) {
      this.finished = true;
      this.cb.onWin();
    }

    // emit state throttled
    this.stateTimer += dt;
    if (this.stateTimer > 0.08) {
      this.stateTimer = 0;
      this.emitState();
    }
  }

  private updateCamera(dt: number) {
    const targetX = this.player.position.x * 0.5;
    const shake = this.shakeT > 0 ? (Math.random() - 0.5) * 0.6 : 0;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX + shake, dt * 4);
    this.camera.position.y = 5.5 + shake;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.player.position.z - 9, dt * 6);
    this.camera.lookAt(this.player.position.x * 0.3, 1.5, this.player.position.z + 8);
  }

  private checkCollisions() {
    const px = this.player.position.x;
    const pz = this.playerZ;
    for (const h of this.hazards) {
      if (h.hit) continue;
      const dz = Math.abs(h.z - pz);
      if (dz > 3) continue;
      const dx = Math.abs(h.mesh.position.x - px);
      if (h.distraction) {
        // roadside distraction trigger
        if (dx < this.track.roadWidth / 2 + 2 && dx > this.track.roadWidth / 2 - 1 && dz < 8 && this.rubberneckT <= 0) {
          this.rubberneckT = 2;
          this.rubberneckMash = 0;
          this.cb.onRubberneck(true);
          h.hit = true;
        }
        continue;
      }
      const collisionR = h.type === "pothole" ? 1.2 : 1.8;
      if (dx < collisionR && dz < (h.type === "pothole" ? 1.0 : 2.2)) {
        if (h.type === "pothole") {
          h.hit = true;
          this.shakeT = 0.4;
          this.wobble = 1.5;
          this.speed *= 0.5;
          this.cb.onPothole();
        } else {
          // vehicle collision => crash
          h.hit = true;
          this.crashed = true;
          this.cb.onCrash();
          return;
        }
      }
    }
  }

  resize() {
    const el = this.renderer.domElement.parentElement;
    if (!el) return;
    this.camera.aspect = el.clientWidth / el.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(el.clientWidth, el.clientHeight);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
        else m.material.dispose();
      }
    });
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

export { LANE_OFFSET };
