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
  workTime: number; // ms to complete work at this station
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
  deadline: number; // ms remaining
  maxDeadline: number;
  failed: boolean;
  completed: boolean;
  pingPoints: number;
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
}

export interface PowerUp {
  id: string;
  name: string;
  icon: string;
  stationType: TaskStepType;
  position: Position;
  duration: number; // ms
  active: boolean;
  timeRemaining: number;
}

export interface GameState {
  player: Player;
  stations: Station[];
  tasks: Task[];
  powerUps: PowerUp[];
  activePowerUps: PowerUp[];
  score: number;
  lives: number;
  maxLives: number;
  time: number; // ms elapsed
  gameOver: boolean;
  started: boolean;
  paused: boolean;
  difficulty: number;
  nextTaskTime: number;
  nextPowerUpTime: number;
  combo: number;
  comboTimer: number;
}
