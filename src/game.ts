import type { GameState, Station, TaskStepType, TaskStep, PowerUp, Particle, FloatingText } from './types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SPEED, INITIAL_LIVES,
  BASE_TASK_INTERVAL, MIN_TASK_INTERVAL, BASE_DEADLINE, MIN_DEADLINE,
  POWERUP_INTERVAL, POWERUP_DURATION, COMBO_WINDOW, POINTS_PER_TASK,
  STATION_CONFIGS, CLIENT_NAMES, STATION_INTERACT_DISTANCE, POWERUP_COLLECT_DISTANCE,
} from './constants';

let taskIdCounter = 0;

// ── Helpers ──────────────────────────────────────────────────────
function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

// ── Particle factory ─────────────────────────────────────────────
export function emitParticles(
  particles: Particle[],
  x: number, y: number,
  count: number,
  color: string,
  type: Particle['type'] = 'spark',
  spread = 3,
  life = 600,
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * spread;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === 'smoke' ? 1.5 : 0),
      life,
      maxLife: life,
      size: type === 'confetti' ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
      color,
      type,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    });
  }
}

export function emitFloatingText(
  texts: FloatingText[],
  x: number, y: number,
  text: string,
  color: string,
  fontSize = 18,
): void {
  texts.push({ x, y, text, color, life: 1000, maxLife: 1000, scale: 0, fontSize });
}

// ── Stations ─────────────────────────────────────────────────────
function createStations(): Station[] {
  const stationTypes: TaskStepType[] = ['tax', 'client', 'audit', 'advisory', 'sales'];
  const stationWidth = 130;
  const stationHeight = 100;
  const margin = 30;

  const positions = [
    { x: margin + 10, y: 130 },
    { x: CANVAS_WIDTH - stationWidth - margin - 10, y: 130 },
    { x: margin + 10, y: CANVAS_HEIGHT - stationHeight - 80 },
    { x: CANVAS_WIDTH - stationWidth - margin - 10, y: CANVAS_HEIGHT - stationHeight - 80 },
    { x: (CANVAS_WIDTH - stationWidth) / 2, y: CANVAS_HEIGHT - stationHeight - 80 },
  ];

  return stationTypes.map((type, i) => {
    const config = STATION_CONFIGS[type];
    return {
      id: type,
      name: config.name,
      label: config.label,
      icon: config.icon,
      position: positions[i],
      width: stationWidth,
      height: stationHeight,
      color: config.color,
      progressColor: config.progressColor,
      occupied: false,
      workTime: config.workTime,
    };
  });
}

// ── Tasks ────────────────────────────────────────────────────────
function generateTaskSteps(difficulty: number): TaskStep[] {
  const types: TaskStepType[] = ['tax', 'client', 'audit', 'advisory', 'sales'];
  const numSteps = Math.min(2 + Math.floor(difficulty / 3), 4);
  const shuffled = [...types].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numSteps).map(t => ({ stationType: t, completed: false }));
}

function createTask(difficulty: number, time: number) {
  const steps = generateTaskSteps(difficulty);
  const deadline = Math.max(MIN_DEADLINE, BASE_DEADLINE - difficulty * 800);
  const points = POINTS_PER_TASK + Math.floor(difficulty * 15) + (steps.length - 2) * 50;
  return {
    id: taskIdCounter++,
    clientName: CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)],
    steps,
    currentStep: 0,
    deadline,
    maxDeadline: deadline,
    failed: false,
    completed: false,
    pingPoints: points,
    spawnTime: time,
    slideIn: 0,
  };
}

// ── Power-ups ────────────────────────────────────────────────────
function createPowerUp(): PowerUp {
  const types: TaskStepType[] = ['tax', 'client', 'audit', 'advisory', 'sales'];
  const type = types[Math.floor(Math.random() * types.length)];
  const config = STATION_CONFIGS[type];
  const x = 200 + Math.random() * (CANVAS_WIDTH - 400);
  const y = 220 + Math.random() * (CANVAS_HEIGHT - 420);
  return {
    id: `powerup-${Date.now()}-${Math.random()}`,
    name: `Opzer: ${config.name}`,
    icon: '⚡',
    stationType: type,
    position: { x, y },
    duration: POWERUP_DURATION,
    active: false,
    timeRemaining: POWERUP_DURATION,
  };
}

// ── Screen shake ─────────────────────────────────────────────────
function triggerShake(state: GameState, intensity: number, duration: number) {
  state.screenShake = { intensity, duration, elapsed: 0 };
}

// ── Initial state ────────────────────────────────────────────────
export function createInitialState(): GameState {
  const stations = createStations();
  return {
    player: {
      position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 20 },
      targetPosition: null,
      speed: PLAYER_SPEED,
      atStation: null,
      working: false,
      workProgress: 0,
      currentTask: null,
      carryingDocument: null,
      direction: 0,
      velocityX: 0,
      velocityY: 0,
      squash: 1,
      trail: [],
    },
    stations,
    tasks: [],
    powerUps: [],
    activePowerUps: [],
    particles: [],
    floatingTexts: [],
    screenShake: { intensity: 0, duration: 0, elapsed: 0 },
    score: 0,
    lives: INITIAL_LIVES,
    maxLives: INITIAL_LIVES,
    time: 0,
    gameOver: false,
    started: false,
    paused: false,
    difficulty: 0,
    nextTaskTime: 2000,
    nextPowerUpTime: POWERUP_INTERVAL,
    combo: 0,
    comboTimer: 0,
    transition: 1, // start with transition in
    maxCombo: 0,
  };
}

// ── Update loop ──────────────────────────────────────────────────
export function updateGame(state: GameState, dt: number, keys: Set<string>): GameState {
  // Update particles always (even on menus)
  updateParticles(state, dt);
  updateFloatingTexts(state, dt);
  updateScreenShake(state, dt);

  // Scene transition
  if (state.transition > 0) {
    state.transition = Math.max(0, state.transition - dt / 800);
  }

  if (!state.started || state.gameOver || state.paused) return state;

  state.time += dt;
  state.difficulty = Math.floor(state.time / 15000);

  // Task slide-in animations
  for (const task of state.tasks) {
    if (task.slideIn < 1) {
      task.slideIn = Math.min(1, task.slideIn + dt / 400);
    }
  }

  // Spawn tasks
  state.nextTaskTime -= dt;
  if (state.nextTaskTime <= 0) {
    const interval = Math.max(MIN_TASK_INTERVAL, BASE_TASK_INTERVAL - state.difficulty * 400);
    state.nextTaskTime = interval;
    if (state.tasks.filter(t => !t.completed && !t.failed).length < 6) {
      state.tasks.push(createTask(state.difficulty, state.time));
    }
  }

  // Spawn power-ups
  state.nextPowerUpTime -= dt;
  if (state.nextPowerUpTime <= 0) {
    state.nextPowerUpTime = POWERUP_INTERVAL - Math.min(state.difficulty * 500, 8000);
    if (state.powerUps.length < 2) {
      state.powerUps.push(createPowerUp());
    }
  }

  // Update task deadlines
  for (const task of state.tasks) {
    if (task.completed || task.failed) continue;
    task.deadline -= dt;
    if (task.deadline <= 0) {
      task.failed = true;
      state.lives--;
      state.combo = 0;
      triggerShake(state, 6, 400);
      // Red particles
      emitParticles(state.particles, CANVAS_WIDTH / 2, 80, 20, '#ef4444', 'confetti', 4, 800);
      if (state.lives <= 0) {
        state.gameOver = true;
        triggerShake(state, 10, 600);
        emitParticles(state.particles, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 60, '#ef4444', 'confetti', 6, 1200);
        return state;
      }
    }
  }

  // Clean up old tasks
  state.tasks = state.tasks.filter(t => {
    if (t.completed) return false; // Remove completed immediately (we already celebrated)
    if (t.failed && t.deadline < -2000) return false;
    return true;
  });

  // Update combo timer
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
    }
  }

  // Update active power-ups
  for (const pu of state.activePowerUps) {
    pu.timeRemaining -= dt;
  }
  state.activePowerUps = state.activePowerUps.filter(p => p.timeRemaining > 0);

  // Auto-complete steps at powered-up stations
  for (const pu of state.activePowerUps) {
    for (const task of state.tasks) {
      if (task.completed || task.failed) continue;
      const step = task.steps[task.currentStep];
      if (step && step.stationType === pu.stationType && !step.completed) {
        step.completed = true;
        task.currentStep++;
        // Station sparks
        const station = state.stations.find(s => s.id === pu.stationType);
        if (station) {
          emitParticles(state.particles, station.position.x + station.width / 2, station.position.y + station.height / 2, 8, '#fbbf24', 'star', 2);
        }
        if (task.currentStep >= task.steps.length) {
          completeTask(state, task);
        }
      }
    }
  }

  // Move player with easing
  const player = state.player;
  let dx = 0, dy = 0;
  if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy = -1;
  if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy = 1;
  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx = -1;
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx = 1;

  if (dx !== 0 || dy !== 0) {
    if (player.working) {
      player.working = false;
      player.workProgress = 0;
    }
    const mag = Math.sqrt(dx * dx + dy * dy);
    const targetVx = (dx / mag) * player.speed;
    const targetVy = (dy / mag) * player.speed;

    // Smooth acceleration
    const accel = 0.15;
    player.velocityX += (targetVx - player.velocityX) * accel * (dt / 16);
    player.velocityY += (targetVy - player.velocityY) * accel * (dt / 16);
    player.direction = dx;

    // Squash when starting to move
    player.squash = Math.max(0.85, player.squash - 0.02);
  } else {
    // Decelerate
    player.velocityX *= 0.88;
    player.velocityY *= 0.88;
    if (Math.abs(player.velocityX) < 0.05) player.velocityX = 0;
    if (Math.abs(player.velocityY) < 0.05) player.velocityY = 0;

    // Return squash to normal
    player.squash += (1 - player.squash) * 0.1;
  }

  player.position.x += player.velocityX * (dt / 16);
  player.position.y += player.velocityY * (dt / 16);

  // Clamp to bounds
  player.position.x = Math.max(30, Math.min(CANVAS_WIDTH - 30, player.position.x));
  player.position.y = Math.max(30, Math.min(CANVAS_HEIGHT - 30, player.position.y));

  // Trail
  const speed = Math.sqrt(player.velocityX ** 2 + player.velocityY ** 2);
  if (speed > 1.5) {
    player.trail.push({ x: player.position.x, y: player.position.y });
    if (player.trail.length > 8) player.trail.shift();
  } else {
    if (player.trail.length > 0) player.trail.shift();
  }

  // Check station proximity
  let nearestStation: Station | null = null;
  let nearestDist = Infinity;
  for (const station of state.stations) {
    const cx = station.position.x + station.width / 2;
    const cy = station.position.y + station.height / 2;
    const dist = Math.sqrt(
      (player.position.x - cx) ** 2 + (player.position.y - cy) ** 2
    );
    if (dist < STATION_INTERACT_DISTANCE && dist < nearestDist) {
      nearestStation = station;
      nearestDist = dist;
    }
  }
  player.atStation = nearestStation;

  // Work at station (space key)
  if (player.atStation && keys.has(' ') && !player.working) {
    const stationType = player.atStation.id as TaskStepType;
    const task = state.tasks.find(t => {
      if (t.completed || t.failed) return false;
      const step = t.steps[t.currentStep];
      return step && step.stationType === stationType;
    });
    if (task) {
      player.working = true;
      player.workProgress = 0;
      player.currentTask = task;
      // Squash effect on start
      player.squash = 0.8;
    }
  }

  // Progress work
  if (player.working && player.atStation && player.currentTask) {
    player.workProgress += dt;
    const requiredTime = player.atStation.workTime;

    // Work particles (sparse)
    if (Math.random() < 0.08) {
      const sx = player.atStation.position.x + player.atStation.width / 2;
      const sy = player.atStation.position.y + player.atStation.height / 2;
      emitParticles(state.particles, sx + (Math.random() - 0.5) * 30, sy - 10, 1, player.atStation.color, 'smoke', 0.8, 500);
    }

    if (player.workProgress >= requiredTime) {
      const task = player.currentTask;
      const step = task.steps[task.currentStep];
      if (step) {
        step.completed = true;
        task.currentStep++;

        // Step completion particles
        const sx = player.atStation.position.x + player.atStation.width / 2;
        const sy = player.atStation.position.y + player.atStation.height / 2;
        emitParticles(state.particles, sx, sy, 12, player.atStation.color, 'star', 3, 600);
        triggerShake(state, 2, 150);

        if (task.currentStep >= task.steps.length) {
          completeTask(state, task);
        }
      }
      player.working = false;
      player.workProgress = 0;
      player.currentTask = null;
      player.squash = 1.2; // Stretch on completion
    }
  }

  // Collect power-ups
  for (let i = state.powerUps.length - 1; i >= 0; i--) {
    const pu = state.powerUps[i];
    const dist = Math.sqrt(
      (player.position.x - pu.position.x) ** 2 +
      (player.position.y - pu.position.y) ** 2
    );
    if (dist < POWERUP_COLLECT_DISTANCE) {
      pu.active = true;
      pu.timeRemaining = pu.duration;
      state.activePowerUps.push(pu);
      state.powerUps.splice(i, 1);
      // Collect effects
      emitParticles(state.particles, pu.position.x, pu.position.y, 20, '#fbbf24', 'star', 4, 700);
      emitFloatingText(state.floatingTexts, pu.position.x, pu.position.y - 20, 'OPZER!', '#fbbf24', 22);
      triggerShake(state, 3, 200);
      player.squash = 0.75;
    }
  }

  return state;
}

function completeTask(state: GameState, task: typeof state.tasks[0]) {
  task.completed = true;
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  state.comboTimer = COMBO_WINDOW;
  const comboMultiplier = 1 + (state.combo - 1) * 0.25;
  const points = Math.floor(task.pingPoints * comboMultiplier);
  state.score += points;

  // Celebration effects
  const px = state.player.position.x;
  const py = state.player.position.y;
  emitParticles(state.particles, px, py - 10, 25, '#22c55e', 'confetti', 5, 900);
  if (state.combo > 1) {
    emitParticles(state.particles, px, py - 10, 15, '#fbbf24', 'star', 3, 700);
  }
  emitFloatingText(state.floatingTexts, px, py - 40, `+${points}`, '#22c55e', 20);
  if (state.combo > 1) {
    emitFloatingText(state.floatingTexts, px + 40, py - 55, `x${state.combo}!`, '#fbbf24', 16);
  }
  triggerShake(state, 3, 200);
  state.player.squash = 1.3;
}

// ── Particle update ──────────────────────────────────────────────
function updateParticles(state: GameState, dt: number) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * (dt / 16);
    p.y += p.vy * (dt / 16);
    p.vy += 0.03 * (dt / 16); // gravity
    p.rotation += p.rotationSpeed * (dt / 16);
    if (p.type === 'smoke') {
      p.vy -= 0.06 * (dt / 16); // float up
      p.vx *= 0.98;
    }
  }
  // Cap particles
  if (state.particles.length > 150) {
    state.particles.splice(0, state.particles.length - 150);
  }
}

function updateFloatingTexts(state: GameState, dt: number) {
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.life -= dt;
    if (ft.life <= 0) {
      state.floatingTexts.splice(i, 1);
      continue;
    }
    ft.y -= 0.8 * (dt / 16);
    const t = 1 - ft.life / ft.maxLife;
    // Scale: spring in, then settle
    if (t < 0.2) {
      ft.scale = smoothstep(t / 0.2) * 1.3;
    } else if (t < 0.35) {
      ft.scale = 1.3 - (t - 0.2) / 0.15 * 0.3;
    } else {
      ft.scale = 1;
    }
  }
}

function updateScreenShake(state: GameState, dt: number) {
  if (state.screenShake.duration > 0) {
    state.screenShake.elapsed += dt;
    if (state.screenShake.elapsed >= state.screenShake.duration) {
      state.screenShake = { intensity: 0, duration: 0, elapsed: 0 };
    }
  }
}
