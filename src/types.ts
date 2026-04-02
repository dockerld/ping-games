export interface Position {
  x: number;
  y: number;
}

export interface Station {
  id: string;
  name: string;
  label: string;
  icon: string;
  position: Position;
  width: number;
  height: number;
  color: string;
  progressColor: string;
  occupied: boolean;
  workTime: number;
}

export type TaskStepType = 'tax' | 'client' | 'audit' | 'advisory' | 'sales';

export interface TaskStep {
  stationType: TaskStepType;
  completed: boolean;
}

export interface Task {
  id: number;
  clientName: string;
  steps: TaskStep[];
  currentStep: number;
  deadline: number;
  maxDeadline: number;
  failed: boolean;
  completed: boolean;
  pingPoints: number;
  // Animation
  spawnTime: number;
  slideIn: number; // 0-1 animation progress
}

export interface Player {
  position: Position;
  targetPosition: Position | null;
  speed: number;
  atStation: Station | null;
  working: boolean;
  workProgress: number;
  currentTask: Task | null;
  carryingDocument: TaskStepType | null;
  // Animation
  direction: number; // -1 left, 0 neutral, 1 right
  velocityX: number;
  velocityY: number;
  squash: number; // squash-and-stretch factor
  trail: Position[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'star' | 'smoke' | 'confetti' | 'ring';
  rotation: number;
  rotationSpeed: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
  fontSize: number;
}

export interface PowerUp {
  id: string;
  name: string;
  icon: string;
  stationType: TaskStepType;
  position: Position;
  duration: number;
  active: boolean;
  timeRemaining: number;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
}

export interface GameState {
  player: Player;
  stations: Station[];
  tasks: Task[];
  powerUps: PowerUp[];
  activePowerUps: PowerUp[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  screenShake: ScreenShake;
  score: number;
  lives: number;
  maxLives: number;
  time: number;
  gameOver: boolean;
  started: boolean;
  paused: boolean;
  difficulty: number;
  nextTaskTime: number;
  nextPowerUpTime: number;
  combo: number;
  comboTimer: number;
  // Scene transition
  transition: number; // 0 = none, >0 = transitioning in
  maxCombo: number;
}
