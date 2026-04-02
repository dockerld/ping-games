import type { TaskStepType } from './types';

// Canvas
export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 680;

// Colors (Ping brand — refined)
export const COLORS = {
  // Backgrounds
  bg: '#f7f6f2',
  surface: '#fefefd',
  surfaceAlt: '#f3f1ec',
  // Text
  text: '#2f2b27',
  textLight: '#4a4540',
  muted: '#8a8580',
  // Brand
  orange: '#fb923c',
  orangeStrong: '#f07510',
  orangeLight: '#fde1c5',
  purple: '#8f88f9',
  purpleStrong: '#645be9',
  purpleLight: '#dedcfe',
  // Status
  success: '#22c55e',
  successDark: '#16a34a',
  successLight: '#dcfce7',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  dangerLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  // Office
  border: '#e5e2dd',
  borderDark: '#d1cdc6',
  floor1: '#e8e4dd',
  floor2: '#e2ded6',
  wallTop: '#c9c3b8',
  wallSide: '#b8b2a5',
  carpet: '#d4cfc7',
  // Desk
  deskTop: '#d4a76a',
  deskSide: '#b8894e',
  deskShadow: '#a07838',
  // HUD
  hudBg: '#1e1b18',
  hudBgLight: '#2a2622',
} as const;

// Station configs — richer colors
export const STATION_CONFIGS: Record<TaskStepType, { name: string; label: string; icon: string; color: string; colorLight: string; progressColor: string; workTime: number }> = {
  tax:      { name: 'Tax Prep',     label: 'TAX',      icon: '📊', color: '#3b82f6', colorLight: '#dbeafe', progressColor: '#2563eb', workTime: 2000 },
  client:   { name: 'Client Calls', label: 'CLIENT',   icon: '📞', color: '#f97316', colorLight: '#ffedd5', progressColor: '#ea580c', workTime: 1800 },
  audit:    { name: 'Auditing',     label: 'AUDIT',    icon: '🔍', color: '#8b5cf6', colorLight: '#ede9fe', progressColor: '#7c3aed', workTime: 2500 },
  advisory: { name: 'Advisory',     label: 'ADVISORY', icon: '💡', color: '#22c55e', colorLight: '#dcfce7', progressColor: '#16a34a', workTime: 2200 },
  sales:    { name: 'Sales',        label: 'SALES',    icon: '🤝', color: '#ec4899', colorLight: '#fce7f3', progressColor: '#db2777', workTime: 1500 },
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
export const BASE_TASK_INTERVAL = 8000;
export const MIN_TASK_INTERVAL = 3000;
export const BASE_DEADLINE = 25000;
export const MIN_DEADLINE = 10000;
export const POWERUP_INTERVAL = 20000;
export const POWERUP_DURATION = 12000;
export const COMBO_WINDOW = 5000;
export const POINTS_PER_TASK = 100;
export const STATION_INTERACT_DISTANCE = 70;
export const POWERUP_COLLECT_DISTANCE = 40;
