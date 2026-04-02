import type { TaskStepType } from './types';

// Canvas
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;

// Colors (Ping brand)
export const COLORS = {
  bg: '#f7f6f2',
  surface: '#fefefd',
  text: '#2f2b27',
  muted: '#666666',
  orange: '#fb923c',
  orangeStrong: '#f07510',
  purple: '#8f88f9',
  purpleStrong: '#645be9',
  success: '#1a7d42',
  border: '#e7e7e7',
  danger: '#e53e3e',
  dangerLight: '#fed7d7',
  floor: '#ede9e3',
  floorTile: '#e5e0d8',
  wall: '#d4cec6',
  desk: '#c4a882',
  deskDark: '#a8895e',
} as const;

// Station configs
export const STATION_CONFIGS: Record<TaskStepType, { name: string; label: string; icon: string; color: string; progressColor: string; workTime: number }> = {
  tax: { name: 'Tax Prep', label: 'TAX', icon: '📊', color: '#4a90d9', progressColor: '#2d6cb5', workTime: 2000 },
  client: { name: 'Client Calls', label: 'CLIENT', icon: '📞', color: '#e8833a', progressColor: '#c66a25', workTime: 1800 },
  audit: { name: 'Auditing', label: 'AUDIT', icon: '🔍', color: '#7c5cbf', progressColor: '#5e3fa3', workTime: 2500 },
  advisory: { name: 'Advisory', label: 'ADVISORY', icon: '💡', color: '#2ea85a', progressColor: '#1e8a42', workTime: 2200 },
  sales: { name: 'Sales', label: 'SALES', icon: '🤝', color: '#d94a6e', progressColor: '#b53355', workTime: 1500 },
};

// Client names
export const CLIENT_NAMES = [
  'Acme Corp', 'TechStart Inc', 'Green Valley LLC', 'Summit Partners',
  'Blue Harbor Co', 'Peak Ventures', 'Iron Bridge Ltd', 'Coral Bay Inc',
  'Nova Systems', 'Redwood Capital', 'Cascade Group', 'Falcon Industries',
  'Maple & Sons', 'Horizon Labs', 'Silver Creek Co', 'Oakwood Partners',
];

// Gameplay
export const PLAYER_SPEED = 4;
export const INITIAL_LIVES = 3;
export const BASE_TASK_INTERVAL = 8000; // ms between tasks
export const MIN_TASK_INTERVAL = 3000;
export const BASE_DEADLINE = 25000;
export const MIN_DEADLINE = 10000;
export const POWERUP_INTERVAL = 20000;
export const POWERUP_DURATION = 12000;
export const COMBO_WINDOW = 5000;
export const POINTS_PER_TASK = 100;
export const STATION_INTERACT_DISTANCE = 60;
export const POWERUP_COLLECT_DISTANCE = 40;
