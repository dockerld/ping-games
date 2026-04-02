import type { GameState, PowerUp } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, STATION_CONFIGS } from './constants';
import type { TaskStepType } from './types';

// ── Drawing helpers ──────────────────────────────────────────────
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color;
  rr(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string, lw: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  rr(ctx, x, y, w, h, r);
  ctx.stroke();
}

function shadow(ctx: CanvasRenderingContext2D, blur: number, ox: number, oy: number, color: string) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = ox;
  ctx.shadowOffsetY = oy;
}

function resetShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// ── Main render ──────────────────────────────────────────────────
export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (!state.started) {
    drawStartScreen(ctx);
    return;
  }

  drawOffice(ctx);
  drawOfficeFurniture(ctx);
  drawStations(ctx, state);
  drawPowerUps(ctx, state.powerUps);
  drawPlayer(ctx, state);
  drawHUD(ctx, state);
  drawTaskQueue(ctx, state);
  drawActivePowerUpBar(ctx, state);

  if (state.gameOver) {
    drawGameOver(ctx, state);
  }
}

// ── Office background ────────────────────────────────────────────
function drawOffice(ctx: CanvasRenderingContext2D) {
  // Base floor
  ctx.fillStyle = COLORS.floor1;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Subtle carpet / floor pattern — alternating tiles
  const tile = 40;
  for (let x = 0; x < CANVAS_WIDTH; x += tile) {
    for (let y = 0; y < CANVAS_HEIGHT; y += tile) {
      const checker = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = checker ? COLORS.floor1 : COLORS.floor2;
      ctx.fillRect(x, y, tile, tile);
    }
  }

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= CANVAS_WIDTH; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += tile) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
  }

  // Walls — thick with a baseboard
  const wallT = 12;
  // Top wall
  const grad = ctx.createLinearGradient(0, 0, 0, wallT);
  grad.addColorStop(0, COLORS.wallSide);
  grad.addColorStop(1, COLORS.wallTop);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, wallT);
  // Left wall
  const gradL = ctx.createLinearGradient(0, 0, wallT, 0);
  gradL.addColorStop(0, COLORS.wallSide);
  gradL.addColorStop(1, COLORS.wallTop);
  ctx.fillStyle = gradL;
  ctx.fillRect(0, 0, wallT, CANVAS_HEIGHT);
  // Right wall
  const gradR = ctx.createLinearGradient(CANVAS_WIDTH - wallT, 0, CANVAS_WIDTH, 0);
  gradR.addColorStop(0, COLORS.wallTop);
  gradR.addColorStop(1, COLORS.wallSide);
  ctx.fillStyle = gradR;
  ctx.fillRect(CANVAS_WIDTH - wallT, 0, wallT, CANVAS_HEIGHT);

  // Baseboard accent
  ctx.fillStyle = COLORS.borderDark;
  ctx.fillRect(wallT, wallT, CANVAS_WIDTH - wallT * 2, 3);
  ctx.fillRect(wallT, 0, 3, CANVAS_HEIGHT);
  ctx.fillRect(CANVAS_WIDTH - wallT - 3, 0, 3, CANVAS_HEIGHT);
}

// ── Decorative office elements ───────────────────────────────────
function drawOfficeFurniture(ctx: CanvasRenderingContext2D) {
  // Plant in top-right area
  drawPlant(ctx, CANVAS_WIDTH - 70, 35);
  // Water cooler near center-left
  drawWaterCooler(ctx, 30, CANVAS_HEIGHT / 2 - 20);
  // Rug in the center
  drawRug(ctx, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Pot
  fillRR(ctx, x - 10, y + 8, 20, 16, 3, '#b8894e');
  fillRR(ctx, x - 12, y + 5, 24, 8, 2, '#c9a060');
  // Leaves
  ctx.fillStyle = '#4ade80';
  ctx.beginPath(); ctx.ellipse(x, y - 2, 8, 10, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath(); ctx.ellipse(x - 5, y + 2, 6, 9, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 6, y, 6, 8, 0.4, 0, Math.PI * 2); ctx.fill();
}

function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Body
  fillRR(ctx, x, y, 22, 40, 4, '#d1d5db');
  fillRR(ctx, x + 2, y + 2, 18, 14, 3, '#93c5fd');
  // Tap
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(x + 18, y + 20, 6, 3);
  // Legs
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(x + 2, y + 38, 4, 6);
  ctx.fillRect(x + 16, y + 38, 4, 6);
}

function drawRug(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = COLORS.purpleStrong;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 120, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 90, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ── Stations ─────────────────────────────────────────────────────
function drawStations(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const station of state.stations) {
    const { position: pos, width: w, height: h } = station;
    const isActive = state.player.atStation?.id === station.id;
    const isPowered = state.activePowerUps.some(p => p.stationType === station.id);
    const config = STATION_CONFIGS[station.id as TaskStepType];
    const t = Date.now();

    // Glow when powered
    if (isPowered) {
      const pulse = 0.3 + Math.sin(t / 200) * 0.15;
      ctx.globalAlpha = pulse;
      fillRR(ctx, pos.x - 6, pos.y - 6, w + 12, h + 12, 14, '#fbbf24');
      ctx.globalAlpha = 1;
    }

    // Active highlight ring
    if (isActive) {
      strokeRR(ctx, pos.x - 4, pos.y - 4, w + 8, h + 8, 12, config.color, 2.5);
    }

    // Desk shadow
    shadow(ctx, 12, 0, 4, 'rgba(0,0,0,0.12)');
    fillRR(ctx, pos.x, pos.y, w, h, 10, COLORS.surface);
    resetShadow(ctx);

    // Desk body with gradient
    const deskGrad = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + h);
    deskGrad.addColorStop(0, isPowered ? '#fef9c3' : '#ffffff');
    deskGrad.addColorStop(1, isPowered ? '#fef08a' : COLORS.surfaceAlt);
    fillRR(ctx, pos.x, pos.y, w, h, 10, '');
    ctx.fillStyle = deskGrad;
    rr(ctx, pos.x, pos.y, w, h, 10);
    ctx.fill();

    // Color accent strip
    const stripGrad = ctx.createLinearGradient(pos.x, pos.y, pos.x + w, pos.y);
    stripGrad.addColorStop(0, config.color);
    stripGrad.addColorStop(1, config.color + 'cc');
    ctx.fillStyle = stripGrad;
    rr(ctx, pos.x, pos.y, w, 5, 10);
    // Only fill the top part
    ctx.save();
    ctx.clip();
    ctx.fillRect(pos.x, pos.y, w, 5);
    ctx.restore();

    // Border
    strokeRR(ctx, pos.x, pos.y, w, h, 10, isActive ? config.color : COLORS.border, isActive ? 2 : 1);

    // Monitor on desk
    drawMonitor(ctx, pos.x + w / 2, pos.y + 20, config.color);

    // Icon
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(station.icon, pos.x + w / 2, pos.y + h / 2 + 8);
    ctx.textBaseline = 'alphabetic';

    // Label badge
    ctx.font = '600 10px Inter, sans-serif';
    const lw = Math.max(ctx.measureText(station.label).width + 12, 40);
    const lx = pos.x + (w - lw) / 2;
    const ly = pos.y + h - 18;
    fillRR(ctx, lx, ly, lw, 16, 4, config.color + '18');
    ctx.fillStyle = config.color;
    ctx.textAlign = 'center';
    ctx.fillText(station.label, pos.x + w / 2, ly + 12);

    // Powered badge
    if (isPowered) {
      const bx = pos.x + w - 22;
      const by = pos.y + 10;
      fillRR(ctx, bx, by, 20, 16, 4, '#fbbf24');
      ctx.font = '11px serif';
      ctx.fillText('⚡', bx + 10, by + 13);
    }

    // Work progress bar
    if (state.player.working && state.player.atStation?.id === station.id) {
      const progress = state.player.workProgress / station.workTime;
      const barW = w - 16;
      const barX = pos.x + 8;
      const barY = pos.y + h + 8;
      fillRR(ctx, barX, barY, barW, 8, 4, COLORS.border);
      // Progress fill with gradient
      const pGrad = ctx.createLinearGradient(barX, barY, barX + barW * progress, barY);
      pGrad.addColorStop(0, config.color);
      pGrad.addColorStop(1, config.progressColor);
      ctx.fillStyle = pGrad;
      rr(ctx, barX, barY, barW * progress, 8, 4);
      ctx.fill();
      // Shine
      ctx.globalAlpha = 0.3;
      fillRR(ctx, barX, barY, barW * progress, 3, 4, '#fff');
      ctx.globalAlpha = 1;
    }
  }
}

function drawMonitor(ctx: CanvasRenderingContext2D, cx: number, cy: number, accent: string) {
  // Stand
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(cx - 2, cy + 6, 4, 5);
  ctx.fillRect(cx - 5, cy + 10, 10, 2);
  // Screen
  fillRR(ctx, cx - 12, cy - 6, 24, 14, 2, '#374151');
  fillRR(ctx, cx - 10, cy - 4, 20, 10, 1, accent + '30');
  // Power light
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.arc(cx, cy + 5, 1, 0, Math.PI * 2);
  ctx.fill();
}

// ── Player ───────────────────────────────────────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  const { position: pos, working } = state.player;
  const t = Date.now();
  const bobY = working ? Math.sin(t / 120) * 1.5 : 0;

  // Ground shadow
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y + 18, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Legs
  ctx.fillStyle = '#374151';
  ctx.fillRect(pos.x - 6, pos.y + 6 + bobY, 4, 12);
  ctx.fillRect(pos.x + 2, pos.y + 6 + bobY, 4, 12);

  // Shoes
  ctx.fillStyle = '#1f2937';
  fillRR(ctx, pos.x - 7, pos.y + 16 + bobY, 6, 3, 1.5, '#1f2937');
  fillRR(ctx, pos.x + 1, pos.y + 16 + bobY, 6, 3, 1.5, '#1f2937');

  // Body (shirt)
  const bodyGrad = ctx.createLinearGradient(pos.x, pos.y - 10, pos.x, pos.y + 10);
  bodyGrad.addColorStop(0, working ? '#ea580c' : '#6366f1');
  bodyGrad.addColorStop(1, working ? '#c2410c' : '#4f46e5');
  ctx.fillStyle = bodyGrad;
  rr(ctx, pos.x - 12, pos.y - 10 + bobY, 24, 20, 6);
  ctx.fill();

  // Arms
  const armColor = working ? '#ea580c' : '#6366f1';
  if (working) {
    // Arms forward for typing
    ctx.fillStyle = armColor;
    ctx.fillRect(pos.x - 16, pos.y - 4 + bobY, 6, 4);
    ctx.fillRect(pos.x + 10, pos.y - 4 + bobY, 6, 4);
    // Hands
    ctx.fillStyle = '#fad5a5';
    ctx.beginPath();
    ctx.arc(pos.x - 17, pos.y - 2 + bobY, 3, 0, Math.PI * 2);
    ctx.arc(pos.x + 17, pos.y - 2 + bobY, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = armColor;
    ctx.fillRect(pos.x - 15, pos.y - 6 + bobY, 5, 14);
    ctx.fillRect(pos.x + 10, pos.y - 6 + bobY, 5, 14);
    // Hands
    ctx.fillStyle = '#fad5a5';
    ctx.beginPath();
    ctx.arc(pos.x - 13, pos.y + 9 + bobY, 3, 0, Math.PI * 2);
    ctx.arc(pos.x + 13, pos.y + 9 + bobY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Collar
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(pos.x - 4, pos.y - 10 + bobY);
  ctx.lineTo(pos.x, pos.y - 6 + bobY);
  ctx.lineTo(pos.x + 4, pos.y - 10 + bobY);
  ctx.closePath();
  ctx.fill();

  // Tie
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y - 8 + bobY);
  ctx.lineTo(pos.x - 3, pos.y + 2 + bobY);
  ctx.lineTo(pos.x, pos.y + 4 + bobY);
  ctx.lineTo(pos.x + 3, pos.y + 2 + bobY);
  ctx.closePath();
  ctx.fill();

  // Head
  const headGrad = ctx.createRadialGradient(pos.x - 2, pos.y - 20 + bobY, 0, pos.x, pos.y - 18 + bobY, 12);
  headGrad.addColorStop(0, '#fce3c0');
  headGrad.addColorStop(1, '#f0c894');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y - 20 + bobY, 11, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#4a3728';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y - 24 + bobY, 11, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(pos.x - 11, pos.y - 24 + bobY, 22, 4);

  // Eyes
  ctx.fillStyle = '#2f2b27';
  ctx.beginPath();
  ctx.ellipse(pos.x - 4, pos.y - 21 + bobY, 1.8, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(pos.x + 4, pos.y - 21 + bobY, 1.8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye highlights
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(pos.x - 3.5, pos.y - 22 + bobY, 0.7, 0, Math.PI * 2);
  ctx.arc(pos.x + 4.5, pos.y - 22 + bobY, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = working ? '#c2410c' : '#a08060';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (working) {
    // Concentrating
    ctx.moveTo(pos.x - 3, pos.y - 15 + bobY);
    ctx.lineTo(pos.x + 3, pos.y - 15 + bobY);
  } else {
    // Slight smile
    ctx.arc(pos.x, pos.y - 16 + bobY, 3, 0.1, Math.PI - 0.1);
  }
  ctx.stroke();

  // Working indicator — typing effect
  if (working) {
    const dots = Math.floor(t / 200) % 4;
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = COLORS.orangeStrong;
    ctx.textAlign = 'center';
    ctx.fillText('typing' + '.'.repeat(dots), pos.x, pos.y - 36 + bobY);
  }

  // Interaction hint
  if (state.player.atStation && !working) {
    const canWork = state.tasks.some(t => {
      if (t.completed || t.failed) return false;
      const step = t.steps[t.currentStep];
      return step && step.stationType === state.player.atStation!.id;
    });
    if (canWork) {
      const pulse = 0.5 + Math.sin(Date.now() / 250) * 0.5;
      // Pill badge
      ctx.globalAlpha = pulse;
      const hw = 52;
      shadow(ctx, 6, 0, 2, 'rgba(0,0,0,0.15)');
      fillRR(ctx, pos.x - hw / 2, pos.y + 24, hw, 20, 10, COLORS.purple);
      resetShadow(ctx);
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('SPACE', pos.x, pos.y + 37);
      ctx.globalAlpha = 1;
    }
  }
}

// ── Power-ups ────────────────────────────────────────────────────
function drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) {
  const t = Date.now();
  for (const pu of powerUps) {
    const bob = Math.sin(t / 350 + pu.position.x) * 5;
    const pulse = 1 + Math.sin(t / 250) * 0.12;
    const { x, y } = pu.position;

    // Outer glow rings
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(x, y + bob, 32 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.15;
    ctx.beginPath(); ctx.arc(x, y + bob, 22 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Inner circle
    shadow(ctx, 10, 0, 2, 'rgba(251,191,36,0.4)');
    const g = ctx.createRadialGradient(x, y + bob - 4, 0, x, y + bob, 16);
    g.addColorStop(0, '#fef08a');
    g.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y + bob, 16, 0, Math.PI * 2); ctx.fill();
    resetShadow(ctx);

    // Lightning bolt
    ctx.fillStyle = '#fff';
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', x, y + bob + 6);

    // Label
    ctx.font = '700 8px Inter, sans-serif';
    ctx.fillStyle = COLORS.purpleStrong;
    fillRR(ctx, x - 18, y + bob + 20, 36, 14, 4, COLORS.purpleLight);
    ctx.fillStyle = COLORS.purpleStrong;
    ctx.fillText('OPZER', x, y + bob + 30);
  }
}

// ── Active power-up bar ──────────────────────────────────────────
function drawActivePowerUpBar(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.activePowerUps.length === 0) return;

  const barH = 28;
  const barW = 90;
  const gap = 8;
  const totalW = state.activePowerUps.length * (barW + gap) - gap;
  const startX = (CANVAS_WIDTH - totalW) / 2;
  const y = CANVAS_HEIGHT - 42;

  state.activePowerUps.forEach((pu, i) => {
    const x = startX + i * (barW + gap);
    const pct = pu.timeRemaining / pu.duration;
    const config = STATION_CONFIGS[pu.stationType];

    // Background pill
    shadow(ctx, 6, 0, 2, 'rgba(0,0,0,0.1)');
    fillRR(ctx, x, y, barW, barH, 6, COLORS.hudBg);
    resetShadow(ctx);

    // Progress fill
    ctx.save();
    rr(ctx, x, y, barW, barH, 6);
    ctx.clip();
    const pGrad = ctx.createLinearGradient(x, y, x + barW * pct, y);
    pGrad.addColorStop(0, '#fbbf24');
    pGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = pGrad;
    ctx.fillRect(x, y, barW * pct, barH);
    ctx.restore();

    // Border
    strokeRR(ctx, x, y, barW, barH, 6, 'rgba(251,191,36,0.4)', 1);

    // Text
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`⚡ ${config.label}`, x + barW / 2, y + 18);
  });
}

// ── HUD ──────────────────────────────────────────────────────────
function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  // Top bar with gradient
  const hudGrad = ctx.createLinearGradient(0, 0, 0, 48);
  hudGrad.addColorStop(0, COLORS.hudBg);
  hudGrad.addColorStop(1, COLORS.hudBgLight);
  ctx.fillStyle = hudGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 48);

  // Bottom line accent
  ctx.fillStyle = COLORS.purple + '40';
  ctx.fillRect(0, 46, CANVAS_WIDTH, 2);

  // Score section
  ctx.font = '300 10px Inter, sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'left';
  ctx.fillText('PING POINTS', 16, 17);

  ctx.font = '700 20px Inter, sans-serif';
  ctx.fillStyle = COLORS.orange;
  ctx.fillText(state.score.toLocaleString(), 16, 38);

  // Combo
  if (state.combo > 1) {
    const comboPulse = 1 + Math.sin(Date.now() / 150) * 0.08;
    ctx.save();
    ctx.translate(140, 28);
    ctx.scale(comboPulse, comboPulse);
    fillRR(ctx, -24, -12, 48, 24, 12, '#fbbf24');
    ctx.font = '700 13px Inter, sans-serif';
    ctx.fillStyle = COLORS.hudBg;
    ctx.textAlign = 'center';
    ctx.fillText(`x${state.combo}`, 0, 5);
    ctx.restore();
  }

  // Timer
  const mins = Math.floor(state.time / 60000);
  const secs = Math.floor((state.time % 60000) / 1000);
  ctx.font = '400 12px Inter, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.textAlign = 'center';
  ctx.fillText('TIME', CANVAS_WIDTH / 2, 17);
  ctx.font = '600 18px "IBM Plex Serif", serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, CANVAS_WIDTH / 2, 38);

  // Lives
  ctx.textAlign = 'right';
  ctx.font = '400 10px Inter, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('LIVES', CANVAS_WIDTH - 16, 17);
  // Heart icons
  const heartSize = 18;
  const heartStartX = CANVAS_WIDTH - 16 - (state.maxLives * (heartSize + 4));
  for (let i = 0; i < state.maxLives; i++) {
    const hx = heartStartX + i * (heartSize + 4);
    const alive = i < state.lives;
    drawHeart(ctx, hx + heartSize / 2, 36, heartSize / 2, alive ? '#ef4444' : '#4b5563');
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(cx, cy + s * 0.4);
  ctx.bezierCurveTo(cx + s * 0.8, cy - s * 0.2, cx + s * 1, cy - s * 0.8, cx, cy - s * 0.4);
  ctx.bezierCurveTo(cx - s * 1, cy - s * 0.8, cx - s * 0.8, cy - s * 0.2, cx, cy + s * 0.4);
  ctx.fill();
}

// ── Task Queue ───────────────────────────────────────────────────
function drawTaskQueue(ctx: CanvasRenderingContext2D, state: GameState) {
  const activeTasks = state.tasks.filter(t => !t.completed && !t.failed);
  const startX = 10;
  const y = 56;
  const cardW = 156;
  const cardH = 62;
  const gap = 6;

  activeTasks.slice(0, 6).forEach((task, i) => {
    const x = startX + i * (cardW + gap);
    const urgency = task.deadline / task.maxDeadline;
    const isUrgent = urgency < 0.25;
    const isWarning = urgency < 0.5;

    // Card shadow
    shadow(ctx, 6, 0, 2, isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.06)');
    const cardBg = isUrgent ? '#fef2f2' : isWarning ? '#fffbeb' : '#fff';
    fillRR(ctx, x, y, cardW, cardH, 8, cardBg);
    resetShadow(ctx);

    // Urgent pulse border
    if (isUrgent) {
      const p = 0.5 + Math.sin(Date.now() / 200) * 0.5;
      strokeRR(ctx, x, y, cardW, cardH, 8, `rgba(239,68,68,${p * 0.6})`, 2);
    } else {
      strokeRR(ctx, x, y, cardW, cardH, 8, COLORS.border, 1);
    }

    // Client name
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    const displayName = task.clientName.length > 16 ? task.clientName.slice(0, 15) + '...' : task.clientName;
    ctx.fillText(displayName, x + 8, y + 15);

    // Points badge
    ctx.font = '600 8px Inter, sans-serif';
    ctx.fillStyle = COLORS.orange;
    ctx.textAlign = 'right';
    ctx.fillText(`+${task.pingPoints}`, x + cardW - 8, y + 14);

    // Step pills
    task.steps.forEach((step, si) => {
      const config = STATION_CONFIGS[step.stationType];
      const isCurrent = si === task.currentStep;
      const sw = 30;
      const sx = x + 8 + si * (sw + 4);
      const sy = y + 22;

      if (step.completed) {
        fillRR(ctx, sx, sy, sw, 22, 5, COLORS.successLight);
        strokeRR(ctx, sx, sy, sw, 22, 5, COLORS.successDark + '40', 1);
      } else if (isCurrent) {
        fillRR(ctx, sx, sy, sw, 22, 5, config.colorLight);
        strokeRR(ctx, sx, sy, sw, 22, 5, config.color, 1.5);
      } else {
        fillRR(ctx, sx, sy, sw, 22, 5, '#f5f5f4');
        strokeRR(ctx, sx, sy, sw, 22, 5, COLORS.border, 0.5);
      }

      ctx.font = step.completed ? '11px serif' : '13px serif';
      ctx.textAlign = 'center';
      ctx.fillText(step.completed ? '✅' : config.icon, sx + sw / 2, sy + 16);
    });

    // Deadline bar
    const barH = 4;
    const barY = y + cardH - barH - 4;
    const barX = x + 6;
    const barW = cardW - 12;
    fillRR(ctx, barX, barY, barW, barH, 2, '#e5e5e5');
    const barColor = isUrgent ? COLORS.danger : isWarning ? COLORS.warning : COLORS.success;
    const barGrad = ctx.createLinearGradient(barX, barY, barX + barW * urgency, barY);
    barGrad.addColorStop(0, barColor);
    barGrad.addColorStop(1, barColor + 'aa');
    ctx.fillStyle = barGrad;
    rr(ctx, barX, barY, barW * urgency, barH, 2);
    ctx.fill();
  });
}

// ── Start Screen ─────────────────────────────────────────────────
function drawStartScreen(ctx: CanvasRenderingContext2D) {
  const t = Date.now();

  // Dark gradient background
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bg.addColorStop(0, '#1a1714');
  bg.addColorStop(0.5, '#2a2520');
  bg.addColorStop(1, '#1a1714');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Subtle pattern
  ctx.globalAlpha = 0.03;
  for (let x = 0; x < CANVAS_WIDTH; x += 30) {
    for (let y = 0; y < CANVAS_HEIGHT; y += 30) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  // Floating decorative icons
  const icons = ['📊', '📞', '🔍', '💡', '🤝', '⚡', '📋', '💼'];
  ctx.globalAlpha = 0.08;
  ctx.font = '32px serif';
  ctx.textAlign = 'center';
  icons.forEach((icon, i) => {
    const angle = (t / 4000 + i * 0.8) % (Math.PI * 2);
    const radius = 180 + i * 20;
    const ix = CANVAS_WIDTH / 2 + Math.cos(angle) * radius;
    const iy = CANVAS_HEIGHT / 2 + Math.sin(angle) * radius * 0.5;
    ctx.fillText(icon, ix, iy);
  });
  ctx.globalAlpha = 1;

  // Title glow
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = COLORS.purple;
  ctx.beginPath();
  ctx.ellipse(CANVAS_WIDTH / 2, 190, 200, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ping Games logo area
  ctx.font = '300 14px Inter, sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'center';
  ctx.fillText('P I N G   G A M E S', CANVAS_WIDTH / 2, 140);

  // Horizontal rule
  const lineW = 120;
  ctx.strokeStyle = COLORS.muted + '40';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2 - lineW, 155);
  ctx.lineTo(CANVAS_WIDTH / 2 + lineW, 155);
  ctx.stroke();

  // Title
  ctx.font = '600 56px "IBM Plex Serif", serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('Office Overload', CANVAS_WIDTH / 2, 210);

  // Subtitle
  ctx.font = '400 16px "IBM Plex Serif", serif';
  ctx.fillStyle = COLORS.orange;
  ctx.fillText('Can you survive the accounting chaos?', CANVAS_WIDTH / 2, 245);

  // Instructions card
  const cardW = 480;
  const cardH = 200;
  const cardX = (CANVAS_WIDTH - cardW) / 2;
  const cardY = 275;
  fillRR(ctx, cardX, cardY, cardW, cardH, 12, 'rgba(255,255,255,0.05)');
  strokeRR(ctx, cardX, cardY, cardW, cardH, 12, 'rgba(255,255,255,0.08)', 1);

  // Controls
  const controls = [
    { key: 'WASD / Arrows', desc: 'Move between stations' },
    { key: 'SPACE', desc: 'Work at a station' },
    { key: 'ESC', desc: 'Pause game' },
  ];

  ctx.textAlign = 'left';
  controls.forEach((c, i) => {
    const cy = cardY + 30 + i * 34;
    // Key badge
    fillRR(ctx, cardX + 24, cy - 10, 110, 24, 6, 'rgba(255,255,255,0.1)');
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = COLORS.purple;
    ctx.fillText(c.key, cardX + 34, cy + 5);

    ctx.font = '400 13px Inter, sans-serif';
    ctx.fillStyle = '#d4d0cb';
    ctx.fillText(c.desc, cardX + 150, cy + 5);
  });

  // Tips
  ctx.textAlign = 'center';
  ctx.font = '400 12px Inter, sans-serif';
  ctx.fillStyle = '#9ca3af';
  const tips = [
    '⚡ Collect Opzer power-ups to automate stations',
    '🔥 Complete tasks back-to-back for combo multipliers',
    '❤️ Don\'t let deadlines expire — you only get 3 lives!',
  ];
  tips.forEach((tip, i) => {
    ctx.fillText(tip, CANVAS_WIDTH / 2, cardY + 140 + i * 22);
  });

  // Start button
  const btnW = 260;
  const btnH = 48;
  const btnX = (CANVAS_WIDTH - btnW) / 2;
  const btnY = 530;
  const pulse = 0.85 + Math.sin(t / 350) * 0.15;

  ctx.globalAlpha = pulse;
  shadow(ctx, 20, 0, 4, COLORS.purple + '60');
  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, COLORS.purple);
  btnGrad.addColorStop(1, COLORS.purpleStrong);
  ctx.fillStyle = btnGrad;
  rr(ctx, btnX, btnY, btnW, btnH, 24);
  ctx.fill();
  resetShadow(ctx);

  ctx.font = '600 16px Inter, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('Press SPACE to Start', CANVAS_WIDTH / 2, btnY + 30);
  ctx.globalAlpha = 1;
}

// ── Game Over ────────────────────────────────────────────────────
function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState) {
  // Dark overlay
  ctx.fillStyle = 'rgba(20, 18, 15, 0.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Card
  const cardW = 420;
  const cardH = 340;
  const cardX = (CANVAS_WIDTH - cardW) / 2;
  const cardY = (CANVAS_HEIGHT - cardH) / 2;

  shadow(ctx, 30, 0, 8, 'rgba(0,0,0,0.3)');
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, '#ffffff');
  cardGrad.addColorStop(1, '#f8f7f4');
  ctx.fillStyle = cardGrad;
  rr(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  resetShadow(ctx);

  // Red accent at top
  const accentGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
  accentGrad.addColorStop(0, COLORS.danger);
  accentGrad.addColorStop(1, COLORS.orange);
  ctx.fillStyle = accentGrad;
  ctx.save();
  rr(ctx, cardX, cardY, cardW, 6, 16);
  ctx.clip();
  ctx.fillRect(cardX, cardY, cardW, 6);
  ctx.restore();

  // Title
  ctx.font = '600 32px "IBM Plex Serif", serif';
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', CANVAS_WIDTH / 2, cardY + 55);

  // Divider
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 40, cardY + 72);
  ctx.lineTo(cardX + cardW - 40, cardY + 72);
  ctx.stroke();

  // Score
  ctx.font = '300 12px Inter, sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('FINAL SCORE', CANVAS_WIDTH / 2, cardY + 100);

  ctx.font = '700 52px Inter, sans-serif';
  ctx.fillStyle = COLORS.orange;
  ctx.fillText(state.score.toLocaleString(), CANVAS_WIDTH / 2, cardY + 155);

  ctx.font = '400 14px Inter, sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('Ping Points', CANVAS_WIDTH / 2, cardY + 175);

  // Stats row
  const mins = Math.floor(state.time / 60000);
  const secs = Math.floor((state.time % 60000) / 1000);
  const completed = state.tasks.filter(t => t.completed).length;

  const stats = [
    { label: 'Time', value: `${mins}:${secs.toString().padStart(2, '0')}` },
    { label: 'Tasks Done', value: `${completed}` },
    { label: 'Best Combo', value: `x${state.combo || 1}` },
  ];

  const statW = 100;
  const statStartX = CANVAS_WIDTH / 2 - (stats.length * statW) / 2;
  stats.forEach((s, i) => {
    const sx = statStartX + i * statW + statW / 2;
    const sy = cardY + 210;
    fillRR(ctx, sx - 40, sy - 5, 80, 44, 8, COLORS.surfaceAlt);
    ctx.font = '600 18px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText(s.value, sx, sy + 18);
    ctx.font = '400 9px Inter, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(s.label, sx, sy + 33);
  });

  // Restart button
  const btnW = 240;
  const btnH = 44;
  const btnX = (CANVAS_WIDTH - btnW) / 2;
  const btnY = cardY + cardH - 65;
  const pulse = 0.85 + Math.sin(Date.now() / 350) * 0.15;
  ctx.globalAlpha = pulse;
  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, COLORS.purple);
  btnGrad.addColorStop(1, COLORS.purpleStrong);
  ctx.fillStyle = btnGrad;
  rr(ctx, btnX, btnY, btnW, btnH, 22);
  ctx.fill();
  ctx.font = '600 14px Inter, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('Press SPACE to Play Again', CANVAS_WIDTH / 2, btnY + 28);
  ctx.globalAlpha = 1;
}
