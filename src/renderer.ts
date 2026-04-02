import type { GameState, PowerUp } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, STATION_CONFIGS } from './constants';

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (!state.started) {
    drawStartScreen(ctx);
    return;
  }

  drawFloor(ctx);
  drawStations(ctx, state);
  drawPowerUps(ctx, state.powerUps);
  drawActivePowerUpIndicators(ctx, state);
  drawPlayer(ctx, state);
  drawHUD(ctx, state);
  drawTaskQueue(ctx, state);

  if (state.gameOver) {
    drawGameOver(ctx, state);
  }
}

function drawFloor(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Tile pattern
  ctx.strokeStyle = COLORS.floorTile;
  ctx.lineWidth = 1;
  const tileSize = 48;
  for (let x = 0; x < CANVAS_WIDTH; x += tileSize) {
    for (let y = 0; y < CANVAS_HEIGHT; y += tileSize) {
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }

  // Office walls (top)
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 8);
  ctx.fillRect(0, 0, 8, CANVAS_HEIGHT);
  ctx.fillRect(CANVAS_WIDTH - 8, 0, 8, CANVAS_HEIGHT);
}

function drawStations(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const station of state.stations) {
    const { position: pos, width: w, height: h } = station;
    const isActive = state.player.atStation?.id === station.id;
    const isPowered = state.activePowerUps.some(p => p.stationType === station.id);

    // Desk shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    roundRect(ctx, pos.x + 3, pos.y + 3, w, h, 8);
    ctx.fill();

    // Desk body
    ctx.fillStyle = isPowered ? '#ffe066' : isActive ? '#fff' : COLORS.surface;
    roundRect(ctx, pos.x, pos.y, w, h, 8);
    ctx.fill();

    // Station color strip at top
    ctx.fillStyle = station.color;
    roundRectTop(ctx, pos.x, pos.y, w, 6, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = isActive ? station.color : COLORS.border;
    ctx.lineWidth = isActive ? 2.5 : 1;
    roundRect(ctx, pos.x, pos.y, w, h, 8);
    ctx.stroke();

    // Icon
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.fillText(station.icon, pos.x + w / 2, pos.y + h / 2 + 2);

    // Label
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText(station.label, pos.x + w / 2, pos.y + h - 10);

    // Powered indicator
    if (isPowered) {
      ctx.font = '14px serif';
      ctx.fillText('⚡', pos.x + w - 16, pos.y + 20);
    }

    // Work progress bar
    if (state.player.working && state.player.atStation?.id === station.id) {
      const progress = state.player.workProgress / station.workTime;
      const barWidth = w - 20;
      const barX = pos.x + 10;
      const barY = pos.y + h + 6;
      ctx.fillStyle = '#ddd';
      roundRect(ctx, barX, barY, barWidth, 6, 3);
      ctx.fill();
      ctx.fillStyle = station.progressColor;
      roundRect(ctx, barX, barY, barWidth * progress, 6, 3);
      ctx.fill();
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  const { position: pos, working } = state.player;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y + 16, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = working ? COLORS.orangeStrong : COLORS.purple;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y - 4, 16, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#fad5a5';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y - 20, 10, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = COLORS.text;
  ctx.beginPath();
  ctx.arc(pos.x - 3, pos.y - 22, 1.5, 0, Math.PI * 2);
  ctx.arc(pos.x + 3, pos.y - 22, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Tie
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y - 10);
  ctx.lineTo(pos.x - 3, pos.y);
  ctx.lineTo(pos.x + 3, pos.y);
  ctx.closePath();
  ctx.fill();

  // Working indicator
  if (working) {
    const bob = Math.sin(Date.now() / 150) * 3;
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✍️', pos.x + 20, pos.y - 20 + bob);
  }

  // Interaction hint
  if (state.player.atStation && !working) {
    const canWork = state.tasks.some(t => {
      if (t.completed || t.failed) return false;
      const step = t.steps[t.currentStep];
      return step && step.stationType === state.player.atStation!.id;
    });
    if (canWork) {
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 300) * 0.4;
      ctx.fillText('[SPACE] Work', pos.x, pos.y + 30);
      ctx.globalAlpha = 1;
    }
  }
}

function drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) {
  for (const pu of powerUps) {
    const bob = Math.sin(Date.now() / 400 + pu.position.x) * 4;
    const pulse = 1 + Math.sin(Date.now() / 300) * 0.1;

    // Glow
    ctx.fillStyle = 'rgba(255, 224, 102, 0.3)';
    ctx.beginPath();
    ctx.arc(pu.position.x, pu.position.y + bob, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', pu.position.x, pu.position.y + bob + 8);

    // Label
    ctx.font = '500 9px Inter, sans-serif';
    ctx.fillStyle = COLORS.purpleStrong;
    ctx.fillText('OPZER', pu.position.x, pu.position.y + bob + 24);
  }
}

function drawActivePowerUpIndicators(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.activePowerUps.length === 0) return;

  const startX = CANVAS_WIDTH / 2 - (state.activePowerUps.length * 80) / 2;
  const y = CANVAS_HEIGHT - 40;

  state.activePowerUps.forEach((pu, i) => {
    const x = startX + i * 80;
    const pct = pu.timeRemaining / pu.duration;

    ctx.fillStyle = 'rgba(255,224,102,0.8)';
    roundRect(ctx, x, y, 70, 24, 6);
    ctx.fill();

    // Progress
    ctx.fillStyle = 'rgba(255,200,0,0.6)';
    roundRect(ctx, x, y, 70 * pct, 24, 6);
    ctx.fill();

    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText(`⚡ ${STATION_CONFIGS[pu.stationType].label}`, x + 35, y + 16);
  });
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  // Top bar background
  ctx.fillStyle = 'rgba(47, 43, 39, 0.92)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 44);

  // Score
  ctx.font = '600 16px Inter, sans-serif';
  ctx.fillStyle = COLORS.orange;
  ctx.textAlign = 'left';
  ctx.fillText(`${state.score} PP`, 16, 28);

  // Combo
  if (state.combo > 1) {
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`x${state.combo} COMBO`, 120, 28);
  }

  // Timer
  const mins = Math.floor(state.time / 60000);
  const secs = Math.floor((state.time % 60000) / 1000);
  ctx.font = '400 14px "IBM Plex Serif", serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, CANVAS_WIDTH / 2, 28);

  // Lives
  ctx.textAlign = 'right';
  ctx.font = '16px serif';
  let heartsStr = '';
  for (let i = 0; i < state.maxLives; i++) {
    heartsStr += i < state.lives ? '❤️' : '🖤';
  }
  ctx.fillText(heartsStr, CANVAS_WIDTH - 16, 30);
}

function drawTaskQueue(ctx: CanvasRenderingContext2D, state: GameState) {
  const activeTasks = state.tasks.filter(t => !t.completed && !t.failed);
  const startX = 12;
  const y = 52;
  const cardWidth = 148;
  const cardHeight = 58;
  const gap = 6;

  activeTasks.slice(0, 6).forEach((task, i) => {
    const x = startX + i * (cardWidth + gap);
    const urgency = task.deadline / task.maxDeadline;

    // Card bg
    ctx.fillStyle = urgency < 0.25 ? '#fff0f0' : urgency < 0.5 ? '#fff8f0' : COLORS.surface;
    roundRect(ctx, x, y, cardWidth, cardHeight, 6);
    ctx.fill();
    ctx.strokeStyle = urgency < 0.25 ? COLORS.danger : COLORS.border;
    ctx.lineWidth = urgency < 0.25 ? 1.5 : 1;
    roundRect(ctx, x, y, cardWidth, cardHeight, 6);
    ctx.stroke();

    // Client name
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(task.clientName, x + 6, y + 14);

    // Steps
    task.steps.forEach((step, si) => {
      const sx = x + 6 + si * 30;
      const sy = y + 22;
      const config = STATION_CONFIGS[step.stationType];
      const isCurrent = si === task.currentStep;

      ctx.fillStyle = step.completed ? '#d4f5d4' : isCurrent ? '#fff3cd' : '#f0f0f0';
      roundRect(ctx, sx, sy, 26, 20, 4);
      ctx.fill();
      if (isCurrent && !step.completed) {
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 1.5;
        roundRect(ctx, sx, sy, 26, 20, 4);
        ctx.stroke();
      }

      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(step.completed ? '✅' : config.icon, sx + 13, sy + 15);
    });

    // Deadline bar
    const barY = y + cardHeight - 6;
    ctx.fillStyle = '#eee';
    roundRect(ctx, x + 4, barY, cardWidth - 8, 3, 1.5);
    ctx.fill();
    ctx.fillStyle = urgency < 0.25 ? COLORS.danger : urgency < 0.5 ? COLORS.orange : COLORS.success;
    roundRect(ctx, x + 4, barY, (cardWidth - 8) * urgency, 3, 1.5);
    ctx.fill();
  });
}

function drawStartScreen(ctx: CanvasRenderingContext2D) {
  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Title
  ctx.font = '600 48px "IBM Plex Serif", serif';
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText('Office Overload', CANVAS_WIDTH / 2, 200);

  // Subtitle
  ctx.font = '400 20px "IBM Plex Serif", serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('A Ping Games Production', CANVAS_WIDTH / 2, 240);

  // Instructions
  ctx.font = '400 15px Inter, sans-serif';
  ctx.fillStyle = COLORS.text;
  const lines = [
    'You are an accountant. Clients are flooding in.',
    'Run between stations to complete their requests before time runs out!',
    '',
    '🎮  WASD or Arrow Keys to move',
    '⌨️  SPACE to work at a station',
    '⚡  Collect Opzer power-ups for automation boosts',
    '',
    'Complete tasks to earn Ping Points.',
    'Miss too many and it\'s game over!',
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, 300 + i * 26);
  });

  // Start prompt
  const pulse = 0.6 + Math.sin(Date.now() / 400) * 0.4;
  ctx.globalAlpha = pulse;
  ctx.font = '600 22px Inter, sans-serif';
  ctx.fillStyle = COLORS.purple;
  ctx.fillText('Press SPACE or ENTER to Start', CANVAS_WIDTH / 2, 560);
  ctx.globalAlpha = 1;
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState) {
  // Overlay
  ctx.fillStyle = 'rgba(47, 43, 39, 0.85)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Card
  const cardW = 400;
  const cardH = 300;
  const cardX = (CANVAS_WIDTH - cardW) / 2;
  const cardY = (CANVAS_HEIGHT - cardH) / 2;
  ctx.fillStyle = COLORS.surface;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  // Title
  ctx.font = '600 36px "IBM Plex Serif", serif';
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', CANVAS_WIDTH / 2, cardY + 60);

  // Score
  ctx.font = '400 18px Inter, sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('Final Score', CANVAS_WIDTH / 2, cardY + 100);

  ctx.font = '700 48px Inter, sans-serif';
  ctx.fillStyle = COLORS.orange;
  ctx.fillText(`${state.score} PP`, CANVAS_WIDTH / 2, cardY + 155);

  // Time survived
  const mins = Math.floor(state.time / 60000);
  const secs = Math.floor((state.time % 60000) / 1000);
  ctx.font = '400 16px Inter, sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`Survived ${mins}:${secs.toString().padStart(2, '0')}`, CANVAS_WIDTH / 2, cardY + 190);

  // Tasks completed
  const completed = state.tasks.filter(t => t.completed).length;
  ctx.fillText(`${completed} tasks completed`, CANVAS_WIDTH / 2, cardY + 215);

  // Restart
  const pulse = 0.6 + Math.sin(Date.now() / 400) * 0.4;
  ctx.globalAlpha = pulse;
  ctx.font = '600 16px Inter, sans-serif';
  ctx.fillStyle = COLORS.purple;
  ctx.fillText('Press SPACE or ENTER to Play Again', CANVAS_WIDTH / 2, cardY + 270);
  ctx.globalAlpha = 1;
}

// Helpers
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectTop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
