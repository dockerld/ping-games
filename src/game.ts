import type { GameState, Station, Task, TaskStepType, TaskStep, PowerUp } from './types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SPEED, INITIAL_LIVES,
  BASE_TASK_INTERVAL, MIN_TASK_INTERVAL, BASE_DEADLINE, MIN_DEADLINE,
  POWERUP_INTERVAL, POWERUP_DURATION, COMBO_WINDOW, POINTS_PER_TASK,
  STATION_CONFIGS, CLIENT_NAMES, STATION_INTERACT_DISTANCE, POWERUP_COLLECT_DISTANCE,
} from './constants';

let taskIdCounter = 0;

function createStations(): Station[] {
  const stationTypes: TaskStepType[] = ['tax', 'client', 'audit', 'advisory', 'sales'];
  const stationWidth = 130;
  const stationHeight = 100;
  const margin = 30;

  // Arrange stations around the perimeter — U shape with room to run between
  const positions = [
    { x: margin + 10, y: 130 }, // tax - left upper
    { x: CANVAS_WIDTH - stationWidth - margin - 10, y: 130 }, // client - right upper
    { x: margin + 10, y: CANVAS_HEIGHT - stationHeight - 80 }, // audit - left lower
    { x: CANVAS_WIDTH - stationWidth - margin - 10, y: CANVAS_HEIGHT - stationHeight - 80 }, // advisory - right lower
    { x: (CANVAS_WIDTH - stationWidth) / 2, y: CANVAS_HEIGHT - stationHeight - 80 }, // sales - bottom center
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

function generateTaskSteps(difficulty: number): TaskStep[] {
  const types: TaskStepType[] = ['tax', 'client', 'audit', 'advisory', 'sales'];
  const numSteps = Math.min(2 + Math.floor(difficulty / 3), 4);
  const shuffled = types.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numSteps).map(t => ({ stationType: t, completed: false }));
}

function createTask(difficulty: number): Task {
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
  };
}

function createPowerUp(): PowerUp {
  const types: TaskStepType[] = ['tax', 'client', 'audit', 'advisory', 'sales'];
  const type = types[Math.floor(Math.random() * types.length)];
  const config = STATION_CONFIGS[type];
  // Spawn in the middle area
  const x = 200 + Math.random() * (CANVAS_WIDTH - 400);
  const y = 200 + Math.random() * (CANVAS_HEIGHT - 450);
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

export function createInitialState(): GameState {
  const stations = createStations();
  return {
    player: {
      position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      targetPosition: null,
      speed: PLAYER_SPEED,
      atStation: null,
      working: false,
      workProgress: 0,
      currentTask: null,
      carryingDocument: null,
    },
    stations,
    tasks: [],
    powerUps: [],
    activePowerUps: [],
    score: 0,
    lives: INITIAL_LIVES,
    maxLives: INITIAL_LIVES,
    time: 0,
    gameOver: false,
    started: false,
    paused: false,
    difficulty: 0,
    nextTaskTime: 2000, // first task comes quickly
    nextPowerUpTime: POWERUP_INTERVAL,
    combo: 0,
    comboTimer: 0,
  };
}

export function updateGame(state: GameState, dt: number, keys: Set<string>): GameState {
  if (!state.started || state.gameOver || state.paused) return state;

  state.time += dt;
  state.difficulty = Math.floor(state.time / 15000); // increase every 15s

  // Spawn tasks
  state.nextTaskTime -= dt;
  if (state.nextTaskTime <= 0) {
    const interval = Math.max(MIN_TASK_INTERVAL, BASE_TASK_INTERVAL - state.difficulty * 400);
    state.nextTaskTime = interval;
    if (state.tasks.filter(t => !t.completed && !t.failed).length < 6) {
      state.tasks.push(createTask(state.difficulty));
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
      if (state.lives <= 0) {
        state.gameOver = true;
        return state;
      }
    }
  }

  // Clean up old tasks
  state.tasks = state.tasks.filter(t => {
    if (t.failed) return state.time - (t.maxDeadline - t.deadline + state.time - t.maxDeadline) < 2000 || !t.failed;
    return true;
  });
  // Just keep recent failed ones for a bit, remove old completed
  state.tasks = state.tasks.filter(t => !t.completed || state.tasks.indexOf(t) > state.tasks.length - 10);

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
        if (task.currentStep >= task.steps.length) {
          task.completed = true;
          state.combo++;
          state.comboTimer = COMBO_WINDOW;
          const comboMultiplier = 1 + (state.combo - 1) * 0.25;
          state.score += Math.floor(task.pingPoints * comboMultiplier);
        }
      }
    }
  }

  // Move player
  const player = state.player;
  let dx = 0, dy = 0;
  if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy = -1;
  if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy = 1;
  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx = -1;
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx = 1;

  if (dx !== 0 || dy !== 0) {
    // Cancel work if moving
    if (player.working) {
      player.working = false;
      player.workProgress = 0;
    }
    const mag = Math.sqrt(dx * dx + dy * dy);
    player.position.x += (dx / mag) * player.speed * (dt / 16);
    player.position.y += (dy / mag) * player.speed * (dt / 16);
    // Clamp to bounds
    player.position.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, player.position.x));
    player.position.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, player.position.y));
    player.atStation = null;
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
    // Find a task that needs this station
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
    }
  }

  // Progress work
  if (player.working && player.atStation && player.currentTask) {
    player.workProgress += dt;
    const requiredTime = player.atStation.workTime;
    if (player.workProgress >= requiredTime) {
      // Complete step
      const task = player.currentTask;
      const step = task.steps[task.currentStep];
      if (step) {
        step.completed = true;
        task.currentStep++;
        if (task.currentStep >= task.steps.length) {
          task.completed = true;
          state.combo++;
          state.comboTimer = COMBO_WINDOW;
          const comboMultiplier = 1 + (state.combo - 1) * 0.25;
          state.score += Math.floor(task.pingPoints * comboMultiplier);
        }
      }
      player.working = false;
      player.workProgress = 0;
      player.currentTask = null;
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
    }
  }

  return state;
}
