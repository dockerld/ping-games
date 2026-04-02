import type { GameState, Particle, FloatingText, PowerUp } from './types';
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

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ── Main render ──────────────────────────────────────────────────
export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (!state.started) {
    drawStartScreen(ctx, state);
    return;
  }

  // Apply screen shake
  ctx.save();
  if (state.screenShake.duration > 0) {
    const progress = state.screenShake.elapsed / state.screenShake.duration;
    const decay = 1 - progress;
    const intensity = state.screenShake.intensity * decay;
    const sx = (Math.random() - 0.5) * intensity * 2;
    const sy = (Math.random() - 0.5) * intensity * 2;
    ctx.translate(sx, sy);
  }

  drawOffice(ctx);
  drawOfficeFurniture(ctx, state);
  drawStations(ctx, state);
  drawPowerUps(ctx, state.powerUps);
  drawPlayerTrail(ctx, state);
  drawPlayer(ctx, state);
  drawParticles(ctx, state.particles);
  drawFloatingTexts(ctx, state.floatingTexts);

  ctx.restore(); // End screen shake

  drawHUD(ctx, state);
  drawTaskQueue(ctx, state);
  drawActivePowerUpBar(ctx, state);

  // Scene transition (circle wipe)
  if (state.transition > 0) {
    drawTransition(ctx, state.transition);
  }

  if (state.gameOver) {
    drawGameOver(ctx, state);
  }
}

// ── Scene transition ─────────────────────────────────────────────
function drawTransition(ctx: CanvasRenderingContext2D, t: number) {
  const maxRadius = Math.sqrt(CANVAS_WIDTH ** 2 + CANVAS_HEIGHT ** 2) / 2;
  const radius = maxRadius * (1 - t);
  ctx.save();
  ctx.fillStyle = COLORS.hudBg;
  ctx.beginPath();
  ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.max(0, radius), 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();
}

// ── Office background ────────────────────────────────────────────
function drawOffice(ctx: CanvasRenderingContext2D) {
  // Base
  ctx.fillStyle = COLORS.floor1;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Checkered floor
  const tile = 40;
  for (let x = 0; x < CANVAS_WIDTH; x += tile) {
    for (let y = 0; y < CANVAS_HEIGHT; y += tile) {
      const checker = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = checker ? COLORS.floor1 : COLORS.floor2;
      ctx.fillRect(x, y, tile, tile);
    }
  }

  // Subtle grid
  ctx.strokeStyle = 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= CANVAS_WIDTH; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += tile) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
  }

  // Walls
  const wallT = 12;
  const grad = ctx.createLinearGradient(0, 0, 0, wallT);
  grad.addColorStop(0, COLORS.wallSide);
  grad.addColorStop(1, COLORS.wallTop);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, wallT);

  const gradL = ctx.createLinearGradient(0, 0, wallT, 0);
  gradL.addColorStop(0, COLORS.wallSide);
  gradL.addColorStop(1, COLORS.wallTop);
  ctx.fillStyle = gradL;
  ctx.fillRect(0, 0, wallT, CANVAS_HEIGHT);

  const gradR = ctx.createLinearGradient(CANVAS_WIDTH - wallT, 0, CANVAS_WIDTH, 0);
  gradR.addColorStop(0, COLORS.wallTop);
  gradR.addColorStop(1, COLORS.wallSide);
  ctx.fillStyle = gradR;
  ctx.fillRect(CANVAS_WIDTH - wallT, 0, wallT, CANVAS_HEIGHT);

  ctx.fillStyle = COLORS.borderDark;
  ctx.fillRect(wallT, wallT, CANVAS_WIDTH - wallT * 2, 3);
  ctx.fillRect(wallT, 0, 3, CANVAS_HEIGHT);
  ctx.fillRect(CANVAS_WIDTH - wallT - 3, 0, 3, CANVAS_HEIGHT);
}

// ── Decorative furniture ─────────────────────────────────────────
function drawOfficeFurniture(ctx: CanvasRenderingContext2D, state: GameState) {
  const t = state.time || Date.now();
  drawRug(ctx, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  drawPlant(ctx, CANVAS_WIDTH - 60, 30, t);
  drawPlant(ctx, 55, 30, t + 1000);
  drawWaterCooler(ctx, 25, CANVAS_HEIGHT / 2 - 20, t);
  drawBookshelf(ctx, CANVAS_WIDTH - 55, CANVAS_HEIGHT / 2 - 30);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const sway = Math.sin(t / 1200) * 2;
  ctx.save();
  ctx.translate(x, y);
  // Pot
  fillRR(ctx, -11, 10, 22, 16, 4, '#a0785a');
  fillRR(ctx, -13, 7, 26, 8, 3, '#b8894e');
  // Soil
  fillRR(ctx, -10, 7, 20, 4, 2, '#5c3d20');
  // Leaves with sway
  ctx.fillStyle = '#22c55e';
  ctx.beginPath(); ctx.ellipse(sway, -4, 8, 11, -0.3 + sway * 0.02, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#16a34a';
  ctx.beginPath(); ctx.ellipse(-5 + sway * 0.5, 0, 6, 10, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4ade80';
  ctx.beginPath(); ctx.ellipse(6 + sway * 0.5, -2, 6, 9, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  fillRR(ctx, x, y + 38, 4, 6, 1, '#6b7280');
  fillRR(ctx, x + 16, y + 38, 4, 6, 1, '#6b7280');
  fillRR(ctx, x, y, 22, 42, 5, '#d1d5db');
  fillRR(ctx, x + 1, y + 1, 20, 14, 4, '#93c5fd');
  // Bubbles
  const bubbleY = y + 6 + Math.sin(t / 600) * 3;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.arc(x + 8, bubbleY, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 14, bubbleY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
  // Tap
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(x + 18, y + 20, 6, 3);
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  fillRR(ctx, x - 12, y, 28, 60, 3, '#8b7355');
  fillRR(ctx, x - 10, y + 2, 24, 2, 1, '#a0845c');
  // Shelves
  ctx.fillStyle = '#a0845c';
  ctx.fillRect(x - 10, y + 18, 24, 2);
  ctx.fillRect(x - 10, y + 36, 24, 2);
  // Books
  const bookColors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
  for (let row = 0; row < 3; row++) {
    for (let b = 0; b < 4; b++) {
      const bx = x - 8 + b * 6;
      const by = y + 4 + row * 18;
      const bh = 12 + Math.sin(b * 2 + row) * 2;
      ctx.fillStyle = bookColors[(row * 4 + b) % bookColors.length];
      fillRR(ctx, bx, by + (14 - bh), 4, bh, 1, bookColors[(row * 4 + b) % bookColors.length]);
    }
  }
}

function drawRug(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = COLORS.purpleStrong;
  ctx.beginPath(); ctx.ellipse(cx, cy, 130, 75, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath(); ctx.ellipse(cx, cy, 100, 55, 0, 0, Math.PI * 2); ctx.fill();
  // Rug pattern — dotted ring
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = COLORS.purpleStrong;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 8]);
  ctx.beginPath(); ctx.ellipse(cx, cy, 115, 65, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// ── Stations ─────────────────────────────────────────────────────
function drawStations(ctx: CanvasRenderingContext2D, state: GameState) {
  const t = Date.now();
  for (const station of state.stations) {
    const { position: pos, width: w, height: h } = station;
    const isActive = state.player.atStation?.id === station.id;
    const isPowered = state.activePowerUps.some(p => p.stationType === station.id);
    const config = STATION_CONFIGS[station.id as TaskStepType];

    // Idle bob for stations
    const bob = Math.sin(t / 2000 + pos.x * 0.01) * 1;

    ctx.save();
    ctx.translate(0, bob);

    // Glow when powered — pulsing aura
    if (isPowered) {
      const pulse = 0.2 + Math.sin(t / 180) * 0.12;
      ctx.globalAlpha = pulse;
      shadow(ctx, 20, 0, 0, '#fbbf24');
      fillRR(ctx, pos.x - 8, pos.y - 8, w + 16, h + 16, 16, '#fbbf2440');
      resetShadow(ctx);
      ctx.globalAlpha = 1;
    }

    // Active interaction ring (expanding)
    if (isActive) {
      const ringPulse = (t % 1500) / 1500;
      ctx.globalAlpha = 0.3 * (1 - ringPulse);
      strokeRR(ctx, pos.x - 4 - ringPulse * 6, pos.y - 4 - ringPulse * 6,
        w + 8 + ringPulse * 12, h + 8 + ringPulse * 12,
        14 + ringPulse * 4, config.color, 2);
      ctx.globalAlpha = 1;
    }

    // Main desk shadow
    shadow(ctx, 14, 0, 5, 'rgba(0,0,0,0.15)');
    fillRR(ctx, pos.x, pos.y, w, h, 12, '#fff');
    resetShadow(ctx);

    // Desk fill gradient
    const dg = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + h);
    dg.addColorStop(0, isPowered ? '#fef9c3' : '#ffffff');
    dg.addColorStop(1, isPowered ? '#fde68a' : COLORS.surfaceAlt);
    ctx.fillStyle = dg;
    rr(ctx, pos.x, pos.y, w, h, 12);
    ctx.fill();

    // Thick outline (game art style)
    strokeRR(ctx, pos.x, pos.y, w, h, 12, isActive ? config.color : COLORS.borderDark, isActive ? 3 : 2);

    // Color accent bar at top
    ctx.save();
    rr(ctx, pos.x, pos.y, w, 6, 12);
    ctx.clip();
    const accentGrad = ctx.createLinearGradient(pos.x, pos.y, pos.x + w, pos.y);
    accentGrad.addColorStop(0, config.color);
    accentGrad.addColorStop(1, config.color + 'aa');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(pos.x, pos.y, w, 6);
    ctx.restore();

    // Monitor
    drawMonitor(ctx, pos.x + w / 2, pos.y + 22, config.color, isPowered, t);

    // Icon with slight bounce
    const iconBob = Math.sin(t / 800 + pos.x * 0.02) * 2;
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(station.icon, pos.x + w / 2, pos.y + h / 2 + 10 + iconBob);
    ctx.textBaseline = 'alphabetic';

    // Label badge
    ctx.font = '700 10px Inter, sans-serif';
    const lw = Math.max(ctx.measureText(station.label).width + 16, 44);
    const lx = pos.x + (w - lw) / 2;
    const ly = pos.y + h - 20;
    fillRR(ctx, lx, ly, lw, 18, 9, config.color);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(station.label, pos.x + w / 2, ly + 13);

    // Powered badge
    if (isPowered) {
      const badgePulse = 1 + Math.sin(t / 150) * 0.15;
      ctx.save();
      ctx.translate(pos.x + w - 14, pos.y + 14);
      ctx.scale(badgePulse, badgePulse);
      fillRR(ctx, -12, -10, 24, 20, 6, '#fbbf24');
      strokeRR(ctx, -12, -10, 24, 20, 6, '#f59e0b', 1.5);
      ctx.font = '13px serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', 0, 6);
      ctx.restore();
    }

    // Work progress bar
    if (state.player.working && state.player.atStation?.id === station.id) {
      const progress = state.player.workProgress / station.workTime;
      const barW = w - 12;
      const barX = pos.x + 6;
      const barY = pos.y + h + 10;

      // Bar background
      fillRR(ctx, barX, barY, barW, 10, 5, '#e5e5e5');
      strokeRR(ctx, barX, barY, barW, 10, 5, COLORS.borderDark, 1.5);

      // Fill with gradient
      const pGrad = ctx.createLinearGradient(barX, barY, barX + barW * progress, barY);
      pGrad.addColorStop(0, config.color);
      pGrad.addColorStop(1, config.progressColor);
      ctx.fillStyle = pGrad;
      rr(ctx, barX, barY, Math.max(barW * progress, 6), 10, 5);
      ctx.fill();

      // Shine
      ctx.globalAlpha = 0.35;
      fillRR(ctx, barX + 1, barY + 1, Math.max(barW * progress - 2, 4), 4, 4, '#fff');
      ctx.globalAlpha = 1;

      // Sparkle at fill edge
      if (progress > 0.1) {
        const sparkX = barX + barW * progress;
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5 + Math.sin(t / 80) * 0.5;
        ctx.beginPath();
        ctx.arc(sparkX - 2, barY + 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore(); // bob
  }
}

function drawMonitor(ctx: CanvasRenderingContext2D, cx: number, cy: number, accent: string, powered: boolean, t: number) {
  // Stand
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(cx - 2, cy + 7, 4, 5);
  ctx.fillRect(cx - 6, cy + 11, 12, 2);
  // Screen body
  fillRR(ctx, cx - 14, cy - 8, 28, 17, 3, '#1f2937');
  strokeRR(ctx, cx - 14, cy - 8, 28, 17, 3, '#374151', 1);
  // Screen content
  const screenColor = powered ? '#fef08a' : accent + '25';
  fillRR(ctx, cx - 12, cy - 6, 24, 13, 2, screenColor);
  // Scanlines
  if (powered) {
    const scanY = (t / 30) % 13;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(cx - 12, cy - 6 + scanY, 24, 2);
  }
  // Power light
  ctx.fillStyle = powered ? '#fbbf24' : '#4ade80';
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

// ── Player trail ─────────────────────────────────────────────────
function drawPlayerTrail(ctx: CanvasRenderingContext2D, state: GameState) {
  const trail = state.player.trail;
  for (let i = 0; i < trail.length; i++) {
    const t = i / trail.length;
    ctx.globalAlpha = t * 0.15;
    ctx.fillStyle = state.player.working ? COLORS.orangeStrong : COLORS.purpleStrong;
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, 8 * t, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Player ───────────────────────────────────────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  const { position: pos, working, squash, direction } = state.player;
  const t = Date.now();
  const speed = Math.sqrt(state.player.velocityX ** 2 + state.player.velocityY ** 2);

  // Walking animation
  const walkCycle = speed > 0.5 ? Math.sin(t / 100) : 0;
  const idleBob = Math.sin(t / 600) * 1.5;
  const bobY = working ? Math.sin(t / 120) * 1.5 : idleBob;

  // Squash and stretch
  const scaleX = 1 / squash;
  const scaleY = squash;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.scale(scaleX, scaleY);

  // Flip direction
  const flip = direction === -1 ? -1 : 1;

  // Ground shadow
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 18 / scaleY, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Legs with walk animation
  const legOffset = walkCycle * 4;
  ctx.fillStyle = '#374151';
  fillRR(ctx, -7, 6 + bobY, 5, 13 + legOffset, 2, '#374151');
  fillRR(ctx, 2, 6 + bobY, 5, 13 - legOffset, 2, '#374151');

  // Shoes
  fillRR(ctx, -8, 17 + bobY + legOffset, 7, 4, 2, '#1f2937');
  fillRR(ctx, 1, 17 + bobY - legOffset, 7, 4, 2, '#1f2937');

  // Body (shirt) with outline
  const bodyColor = working ? '#ea580c' : '#6366f1';
  const bodyColorDark = working ? '#c2410c' : '#4f46e5';
  const bodyGrad = ctx.createLinearGradient(0, -10, 0, 10);
  bodyGrad.addColorStop(0, bodyColor);
  bodyGrad.addColorStop(1, bodyColorDark);
  ctx.fillStyle = bodyGrad;
  rr(ctx, -13, -11 + bobY, 26, 21, 7);
  ctx.fill();
  // Outline
  strokeRR(ctx, -13, -11 + bobY, 26, 21, 7, bodyColorDark, 2);

  // Arms
  if (working) {
    ctx.fillStyle = bodyColor;
    fillRR(ctx, -18 * flip, -5 + bobY, 7, 5, 3, bodyColor);
    fillRR(ctx, 11 * flip, -5 + bobY, 7, 5, 3, bodyColor);
    ctx.fillStyle = '#fad5a5';
    ctx.beginPath();
    ctx.arc(-19 * flip, -3 + bobY, 3.5, 0, Math.PI * 2);
    ctx.arc(19 * flip, -3 + bobY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const armSwing = walkCycle * 3;
    ctx.fillStyle = bodyColor;
    fillRR(ctx, -16, -7 + bobY - armSwing, 5, 15, 3, bodyColor);
    fillRR(ctx, 11, -7 + bobY + armSwing, 5, 15, 3, bodyColor);
    ctx.fillStyle = '#fad5a5';
    ctx.beginPath();
    ctx.arc(-14, 9 + bobY - armSwing, 3.5, 0, Math.PI * 2);
    ctx.arc(14, 9 + bobY + armSwing, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Collar
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(-5, -11 + bobY);
  ctx.lineTo(0, -7 + bobY);
  ctx.lineTo(5, -11 + bobY);
  ctx.closePath();
  ctx.fill();

  // Tie
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.moveTo(0, -9 + bobY);
  ctx.lineTo(-3.5, 2 + bobY);
  ctx.lineTo(0, 4 + bobY);
  ctx.lineTo(3.5, 2 + bobY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.orangeStrong;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Head
  const headGrad = ctx.createRadialGradient(-2, -22 + bobY, 0, 0, -20 + bobY, 13);
  headGrad.addColorStop(0, '#fce3c0');
  headGrad.addColorStop(1, '#e8b888');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -21 + bobY, 12, 0, Math.PI * 2);
  ctx.fill();
  // Head outline
  ctx.strokeStyle = '#c09060';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hair
  ctx.fillStyle = '#3d2b1a';
  ctx.beginPath();
  ctx.arc(0, -25 + bobY, 12, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.fillRect(-12, -26 + bobY, 24, 5);

  // Eyes
  ctx.fillStyle = '#2f2b27';
  ctx.beginPath();
  ctx.ellipse(-4 * flip, -22 + bobY, 2, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(4 * flip, -22 + bobY, 2, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Highlights
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-3.5 * flip, -23 + bobY, 0.9, 0, Math.PI * 2);
  ctx.arc(4.5 * flip, -23 + bobY, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#a08060';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (working) {
    // Concentrating
    ctx.moveTo(-3, -15 + bobY);
    ctx.lineTo(3, -15 + bobY);
  } else if (speed > 1) {
    // Open mouth (rushing)
    ctx.fillStyle = '#a08060';
    ctx.beginPath();
    ctx.ellipse(0, -15 + bobY, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Smile
    ctx.arc(0, -17 + bobY, 3.5, 0.15, Math.PI - 0.15);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.restore();

  // Working status (outside transform)
  if (working) {
    const dots = Math.floor(t / 180) % 4;
    // Pill bg
    const tw = 50;
    fillRR(ctx, pos.x - tw / 2, pos.y - 48, tw, 18, 9, 'rgba(0,0,0,0.7)');
    ctx.font = '700 10px Inter, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('WORKING' + '.'.repeat(dots), pos.x, pos.y - 36);
  }

  // Interaction hint
  if (state.player.atStation && !working) {
    const canWork = state.tasks.some(t => {
      if (t.completed || t.failed) return false;
      const step = t.steps[t.currentStep];
      return step && step.stationType === state.player.atStation!.id;
    });
    if (canWork) {
      const pulse = 0.6 + Math.sin(Date.now() / 200) * 0.4;
      ctx.globalAlpha = pulse;
      shadow(ctx, 8, 0, 2, 'rgba(99,102,241,0.3)');
      fillRR(ctx, pos.x - 30, pos.y + 24, 60, 22, 11, '#6366f1');
      resetShadow(ctx);
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('SPACE', pos.x, pos.y + 39);
      ctx.globalAlpha = 1;
    }
  }
}

// ── Particles ────────────────────────────────────────────────────
function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const life = p.life / p.maxLife;
    ctx.globalAlpha = life;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    const size = p.size * (0.5 + life * 0.5);

    switch (p.type) {
      case 'spark':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'star': {
        ctx.fillStyle = p.color;
        drawStar(ctx, 0, 0, size, size * 0.4, 4);
        break;
      }
      case 'smoke':
        ctx.fillStyle = p.color + '60';
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'confetti':
        ctx.fillStyle = p.color;
        ctx.fillRect(-size / 2, -size / 4, size, size / 2);
        break;
      case 'ring':
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, size * (1 + (1 - life) * 2), 0, Math.PI * 2);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// ── Floating text ────────────────────────────────────────────────
function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  for (const ft of texts) {
    const life = ft.life / ft.maxLife;
    ctx.globalAlpha = life;
    ctx.save();
    ctx.translate(ft.x, ft.y);
    ctx.scale(ft.scale, ft.scale);

    // Text outline
    ctx.font = `800 ${ft.fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText(ft.text, 0, 0);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, 0, 0);

    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
}

// ── Power-ups ────────────────────────────────────────────────────
function drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) {
  const t = Date.now();
  for (const pu of powerUps) {
    const bob = Math.sin(t / 300 + pu.position.x) * 6;
    const pulse = 1 + Math.sin(t / 200) * 0.15;
    const { x, y } = pu.position;
    const rotation = t / 1000;

    // Rotating ring
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(rotation);
    ctx.strokeStyle = '#fbbf2440';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Outer glow
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(x, y + bob, 28 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Inner orb
    shadow(ctx, 15, 0, 0, '#fbbf2480');
    const g = ctx.createRadialGradient(x - 3, y + bob - 4, 0, x, y + bob, 18);
    g.addColorStop(0, '#fef9c3');
    g.addColorStop(0.5, '#fbbf24');
    g.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y + bob, 18, 0, Math.PI * 2); ctx.fill();
    resetShadow(ctx);
    // Outline
    ctx.strokeStyle = '#e8a00c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 5, y + bob - 6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Lightning icon
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', x, y + bob + 7);

    // Label pill
    fillRR(ctx, x - 22, y + bob + 24, 44, 16, 8, COLORS.purpleStrong);
    ctx.font = '700 9px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('OPZER', x, y + bob + 35);
  }
}

// ── Active power-up bar ──────────────────────────────────────────
function drawActivePowerUpBar(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.activePowerUps.length === 0) return;

  const barH = 30;
  const barW = 100;
  const gap = 8;
  const totalW = state.activePowerUps.length * (barW + gap) - gap;
  const startX = (CANVAS_WIDTH - totalW) / 2;
  const y = CANVAS_HEIGHT - 44;

  state.activePowerUps.forEach((pu, i) => {
    const x = startX + i * (barW + gap);
    const pct = pu.timeRemaining / pu.duration;
    const config = STATION_CONFIGS[pu.stationType];

    shadow(ctx, 8, 0, 2, 'rgba(0,0,0,0.15)');
    fillRR(ctx, x, y, barW, barH, 8, COLORS.hudBg);
    resetShadow(ctx);
    strokeRR(ctx, x, y, barW, barH, 8, '#fbbf2460', 1.5);

    // Fill
    ctx.save();
    rr(ctx, x, y, barW, barH, 8);
    ctx.clip();
    const pGrad = ctx.createLinearGradient(x, y, x + barW * pct, y);
    pGrad.addColorStop(0, '#fbbf24');
    pGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = pGrad;
    ctx.fillRect(x, y, barW * pct, barH);
    // Shine
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, barW * pct, barH / 2);
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.font = '700 10px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`⚡ ${config.label}`, x + barW / 2, y + 19);
  });
}

// ── HUD ──────────────────────────────────────────────────────────
function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  // Top bar
  const hudGrad = ctx.createLinearGradient(0, 0, 0, 50);
  hudGrad.addColorStop(0, '#1a1714');
  hudGrad.addColorStop(1, '#252220');
  ctx.fillStyle = hudGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 50);

  // Accent line
  const lineGrad = ctx.createLinearGradient(0, 49, CANVAS_WIDTH, 49);
  lineGrad.addColorStop(0, COLORS.purple + '00');
  lineGrad.addColorStop(0.3, COLORS.purple + '60');
  lineGrad.addColorStop(0.7, COLORS.purple + '60');
  lineGrad.addColorStop(1, COLORS.purple + '00');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, 48, CANVAS_WIDTH, 2);

  // Score
  ctx.font = '400 9px Inter, sans-serif';
  ctx.fillStyle = '#6b6560';
  ctx.textAlign = 'left';
  ctx.letterSpacing = '1px';
  ctx.fillText('PING POINTS', 18, 18);
  ctx.letterSpacing = '0px';

  ctx.font = '700 22px Inter, sans-serif';
  ctx.fillStyle = COLORS.orange;
  ctx.fillText(state.score.toLocaleString(), 18, 42);

  // Combo
  if (state.combo > 1) {
    const t = Date.now();
    const comboPulse = 1 + Math.sin(t / 120) * 0.1;
    ctx.save();
    ctx.translate(150, 30);
    ctx.scale(comboPulse, comboPulse);
    shadow(ctx, 6, 0, 0, '#fbbf2450');
    fillRR(ctx, -26, -14, 52, 28, 14, '#fbbf24');
    resetShadow(ctx);
    ctx.font = '800 14px Inter, sans-serif';
    ctx.fillStyle = '#1a1714';
    ctx.textAlign = 'center';
    ctx.fillText(`x${state.combo}`, 0, 5);
    ctx.restore();
  }

  // Timer
  const mins = Math.floor(state.time / 60000);
  const secs = Math.floor((state.time % 60000) / 1000);
  ctx.font = '400 9px Inter, sans-serif';
  ctx.fillStyle = '#6b6560';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1px';
  ctx.fillText('TIME', CANVAS_WIDTH / 2, 18);
  ctx.letterSpacing = '0px';
  ctx.font = '600 20px "IBM Plex Serif", serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, CANVAS_WIDTH / 2, 42);

  // Lives
  ctx.textAlign = 'right';
  ctx.font = '400 9px Inter, sans-serif';
  ctx.fillStyle = '#6b6560';
  ctx.letterSpacing = '1px';
  ctx.fillText('LIVES', CANVAS_WIDTH - 18, 18);
  ctx.letterSpacing = '0px';
  const heartSize = 10;
  const heartStartX = CANVAS_WIDTH - 18 - (state.maxLives * (heartSize * 2 + 6));
  for (let i = 0; i < state.maxLives; i++) {
    const hx = heartStartX + i * (heartSize * 2 + 6) + heartSize;
    const alive = i < state.lives;
    drawHeart(ctx, hx, 38, heartSize, alive ? '#ef4444' : '#3b3835', alive ? '#dc2626' : '#2a2725');
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string, outline: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(cx, cy + s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.8, cy - s * 0.15, cx + s * 1, cy - s * 0.75, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx - s * 1, cy - s * 0.75, cx - s * 0.8, cy - s * 0.15, cx, cy + s * 0.35);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ── Task Queue ───────────────────────────────────────────────────
function drawTaskQueue(ctx: CanvasRenderingContext2D, state: GameState) {
  const activeTasks = state.tasks.filter(t => !t.completed && !t.failed);
  const startX = 10;
  const y = 58;
  const cardW = 160;
  const cardH = 66;
  const gap = 6;

  activeTasks.slice(0, 6).forEach((task, i) => {
    const x = startX + i * (cardW + gap);
    const urgency = task.deadline / task.maxDeadline;
    const isUrgent = urgency < 0.25;
    const isWarning = urgency < 0.5;

    // Slide-in animation (from top with bounce)
    const slideT = easeOutBack(Math.min(task.slideIn, 1));
    const slideY = y - (1 - slideT) * 40;
    const slideAlpha = Math.min(task.slideIn * 2, 1);

    ctx.globalAlpha = slideAlpha;
    ctx.save();
    ctx.translate(0, slideY - y);

    // Urgent shake
    if (isUrgent) {
      const shake = Math.sin(Date.now() / 50) * 1.5;
      ctx.translate(shake, 0);
    }

    // Card shadow
    shadow(ctx, 8, 0, 3, isUrgent ? 'rgba(239,68,68,0.25)' : 'rgba(0,0,0,0.08)');
    const cardBg = isUrgent ? '#fef2f2' : isWarning ? '#fffbeb' : '#fff';
    fillRR(ctx, x, y, cardW, cardH, 10, cardBg);
    resetShadow(ctx);

    // Outline
    strokeRR(ctx, x, y, cardW, cardH, 10,
      isUrgent ? '#ef4444' : isWarning ? '#f59e0b40' : COLORS.borderDark, isUrgent ? 2 : 1.5);

    // Client name
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    const displayName = task.clientName.length > 14 ? task.clientName.slice(0, 13) + '..' : task.clientName;
    ctx.fillText(displayName, x + 8, y + 16);

    // Points badge
    fillRR(ctx, x + cardW - 42, y + 4, 36, 16, 8, COLORS.orangeLight);
    ctx.font = '700 9px Inter, sans-serif';
    ctx.fillStyle = COLORS.orangeStrong;
    ctx.textAlign = 'center';
    ctx.fillText(`+${task.pingPoints}`, x + cardW - 24, y + 15);

    // Step pills
    task.steps.forEach((step, si) => {
      const config = STATION_CONFIGS[step.stationType];
      const isCurrent = si === task.currentStep;
      const sw = 32;
      const sx = x + 8 + si * (sw + 3);
      const sy = y + 24;

      if (step.completed) {
        fillRR(ctx, sx, sy, sw, 24, 6, '#dcfce7');
        strokeRR(ctx, sx, sy, sw, 24, 6, '#16a34a', 1.5);
      } else if (isCurrent) {
        fillRR(ctx, sx, sy, sw, 24, 6, config.colorLight);
        strokeRR(ctx, sx, sy, sw, 24, 6, config.color, 2);
        // Pulse dot
        const pd = 0.4 + Math.sin(Date.now() / 250) * 0.4;
        ctx.globalAlpha = pd * slideAlpha;
        fillRR(ctx, sx, sy, sw, 24, 6, config.color + '20');
        ctx.globalAlpha = slideAlpha;
      } else {
        fillRR(ctx, sx, sy, sw, 24, 6, '#f5f5f4');
        strokeRR(ctx, sx, sy, sw, 24, 6, '#e5e5e5', 1);
      }

      ctx.font = step.completed ? '12px serif' : '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText(step.completed ? '✅' : config.icon, sx + sw / 2, sy + 17);
    });

    // Deadline bar
    const barH = 5;
    const barY = y + cardH - barH - 5;
    const barX = x + 6;
    const bW = cardW - 12;
    fillRR(ctx, barX, barY, bW, barH, 2.5, '#e5e5e5');
    const barColor = isUrgent ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';
    const bGrad = ctx.createLinearGradient(barX, barY, barX + bW * urgency, barY);
    bGrad.addColorStop(0, barColor);
    bGrad.addColorStop(1, barColor + 'cc');
    ctx.fillStyle = bGrad;
    rr(ctx, barX, barY, Math.max(bW * urgency, 4), barH, 2.5);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  });
}

// ── Start Screen ─────────────────────────────────────────────────
function drawStartScreen(ctx: CanvasRenderingContext2D, state: GameState) {
  const t = Date.now();

  // Dark bg with vignette
  const bg = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 100, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 500);
  bg.addColorStop(0, '#2a2520');
  bg.addColorStop(1, '#0f0d0b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Animated grid
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = COLORS.purple;
  ctx.lineWidth = 0.5;
  const gridOff = (t / 40) % 40;
  for (let x = -40 + gridOff; x < CANVAS_WIDTH + 40; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
  }
  for (let y = -40 + gridOff; y < CANVAS_HEIGHT + 40; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Floating decorative icons
  const icons = ['📊', '📞', '🔍', '💡', '🤝', '⚡', '📋', '💼', '🏢', '📱'];
  ctx.globalAlpha = 0.07;
  ctx.font = '36px serif';
  ctx.textAlign = 'center';
  icons.forEach((icon, i) => {
    const angle = (t / 5000 + i * 0.63) % (Math.PI * 2);
    const radius = 160 + (i % 3) * 50;
    const ix = CANVAS_WIDTH / 2 + Math.cos(angle) * radius;
    const iy = CANVAS_HEIGHT / 2 + Math.sin(angle) * radius * 0.6;
    ctx.fillText(icon, ix, iy);
  });
  ctx.globalAlpha = 1;

  // Title glow
  ctx.globalAlpha = 0.12;
  const glow = ctx.createRadialGradient(CANVAS_WIDTH / 2, 195, 0, CANVAS_WIDTH / 2, 195, 180);
  glow.addColorStop(0, COLORS.purple);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.globalAlpha = 1;

  // "PING GAMES" header
  ctx.font = '300 13px Inter, sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText('PING GAMES', CANVAS_WIDTH / 2, 130);
  ctx.letterSpacing = '0px';

  // Line
  const lineGrad = ctx.createLinearGradient(CANVAS_WIDTH / 2 - 80, 0, CANVAS_WIDTH / 2 + 80, 0);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.5, COLORS.muted + '40');
  lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2 - 100, 146);
  ctx.lineTo(CANVAS_WIDTH / 2 + 100, 146);
  ctx.stroke();

  // Title with shadow
  ctx.font = '600 60px "IBM Plex Serif", serif';
  // Text shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText('Office Overload', CANVAS_WIDTH / 2 + 2, 207);
  // Main text
  ctx.fillStyle = '#fff';
  ctx.fillText('Office Overload', CANVAS_WIDTH / 2, 205);

  // Subtitle
  ctx.font = '400 17px "IBM Plex Serif", serif';
  ctx.fillStyle = COLORS.orange;
  ctx.fillText('Can you survive the accounting chaos?', CANVAS_WIDTH / 2, 242);

  // Instructions card
  const cardW = 500;
  const cardH = 210;
  const cardX = (CANVAS_WIDTH - cardW) / 2;
  const cardY = 270;
  fillRR(ctx, cardX, cardY, cardW, cardH, 14, 'rgba(255,255,255,0.04)');
  strokeRR(ctx, cardX, cardY, cardW, cardH, 14, 'rgba(255,255,255,0.06)', 1);

  // Controls
  const controls = [
    { key: 'WASD / Arrows', desc: 'Run between stations' },
    { key: 'SPACE', desc: 'Work at a station' },
    { key: 'ESC', desc: 'Pause game' },
  ];

  ctx.textAlign = 'left';
  controls.forEach((c, i) => {
    const cy = cardY + 32 + i * 36;
    fillRR(ctx, cardX + 28, cy - 12, 114, 26, 7, 'rgba(99,102,241,0.15)');
    strokeRR(ctx, cardX + 28, cy - 12, 114, 26, 7, 'rgba(99,102,241,0.25)', 1);
    ctx.font = '700 11px Inter, sans-serif';
    ctx.fillStyle = COLORS.purple;
    ctx.fillText(c.key, cardX + 38, cy + 4);
    ctx.font = '400 13px Inter, sans-serif';
    ctx.fillStyle = '#bbb';
    ctx.fillText(c.desc, cardX + 160, cy + 4);
  });

  // Tips
  ctx.textAlign = 'center';
  ctx.font = '400 12px Inter, sans-serif';
  ctx.fillStyle = '#7a7570';
  const tips = [
    '⚡ Collect Opzer power-ups to automate stations',
    '🔥 Complete tasks back-to-back for combo multipliers',
    '❤️ Don\'t let deadlines expire — you only get 3 lives!',
  ];
  tips.forEach((tip, i) => {
    ctx.fillText(tip, CANVAS_WIDTH / 2, cardY + 148 + i * 22);
  });

  // Start button
  const btnW = 280;
  const btnH = 52;
  const btnX = (CANVAS_WIDTH - btnW) / 2;
  const btnY = 535;
  const pulse = 0.9 + Math.sin(t / 300) * 0.1;

  ctx.globalAlpha = pulse;
  shadow(ctx, 24, 0, 4, COLORS.purple + '70');
  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, '#7c6cf6');
  btnGrad.addColorStop(1, COLORS.purpleStrong);
  ctx.fillStyle = btnGrad;
  rr(ctx, btnX, btnY, btnW, btnH, 26);
  ctx.fill();
  // Button outline
  strokeRR(ctx, btnX, btnY, btnW, btnH, 26, '#9f97fd40', 1);
  resetShadow(ctx);

  // Button highlight
  ctx.globalAlpha = 0.15 * pulse;
  fillRR(ctx, btnX + 2, btnY + 2, btnW - 4, btnH / 2, 26, '#fff');
  ctx.globalAlpha = pulse;

  ctx.font = '600 17px Inter, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('Press SPACE to Start', CANVAS_WIDTH / 2, btnY + 32);
  ctx.globalAlpha = 1;

  // Transition
  if (state.transition > 0) {
    drawTransition(ctx, state.transition);
  }
}

// ── Game Over ────────────────────────────────────────────────────
function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = 'rgba(15, 13, 11, 0.9)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cardW = 440;
  const cardH = 360;
  const cardX = (CANVAS_WIDTH - cardW) / 2;
  const cardY = (CANVAS_HEIGHT - cardH) / 2;

  shadow(ctx, 40, 0, 10, 'rgba(0,0,0,0.4)');
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, '#ffffff');
  cardGrad.addColorStop(1, '#f8f7f4');
  ctx.fillStyle = cardGrad;
  rr(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();
  resetShadow(ctx);
  strokeRR(ctx, cardX, cardY, cardW, cardH, 20, COLORS.border, 1);

  // Red-to-orange gradient accent
  ctx.save();
  rr(ctx, cardX, cardY, cardW, 6, 20);
  ctx.clip();
  const accentGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
  accentGrad.addColorStop(0, '#ef4444');
  accentGrad.addColorStop(1, COLORS.orange);
  ctx.fillStyle = accentGrad;
  ctx.fillRect(cardX, cardY, cardW, 6);
  ctx.restore();

  // Title
  ctx.font = '600 34px "IBM Plex Serif", serif';
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', CANVAS_WIDTH / 2, cardY + 55);

  // Divider
  const divGrad = ctx.createLinearGradient(cardX + 60, 0, cardX + cardW - 60, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.5, COLORS.border);
  divGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 40, cardY + 72);
  ctx.lineTo(cardX + cardW - 40, cardY + 72);
  ctx.stroke();

  // Score
  ctx.font = '400 10px Inter, sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.letterSpacing = '2px';
  ctx.fillText('FINAL SCORE', CANVAS_WIDTH / 2, cardY + 100);
  ctx.letterSpacing = '0px';

  ctx.font = '700 56px Inter, sans-serif';
  ctx.fillStyle = COLORS.orange;
  shadow(ctx, 0, 1, 1, 'rgba(0,0,0,0.1)');
  ctx.fillText(state.score.toLocaleString(), CANVAS_WIDTH / 2, cardY + 162);
  resetShadow(ctx);

  ctx.font = '400 14px Inter, sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('Ping Points', CANVAS_WIDTH / 2, cardY + 182);

  // Stats
  const mins = Math.floor(state.time / 60000);
  const secs = Math.floor((state.time % 60000) / 1000);
  const completed = state.tasks.filter(t => t.completed).length;

  const stats = [
    { label: 'TIME', value: `${mins}:${secs.toString().padStart(2, '0')}` },
    { label: 'COMPLETED', value: `${completed}` },
    { label: 'BEST COMBO', value: `x${state.maxCombo || 1}` },
  ];

  const statW = 110;
  const statStartX = CANVAS_WIDTH / 2 - (stats.length * statW) / 2;
  stats.forEach((s, i) => {
    const sx = statStartX + i * statW + statW / 2;
    const sy = cardY + 210;
    fillRR(ctx, sx - 46, sy - 5, 92, 50, 10, COLORS.surfaceAlt);
    strokeRR(ctx, sx - 46, sy - 5, 92, 50, 10, COLORS.border, 1);
    ctx.font = '700 20px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText(s.value, sx, sy + 20);
    ctx.font = '400 8px Inter, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.letterSpacing = '1px';
    ctx.fillText(s.label, sx, sy + 38);
    ctx.letterSpacing = '0px';
  });

  // Restart button
  const btnW = 260;
  const btnH = 48;
  const btnX = (CANVAS_WIDTH - btnW) / 2;
  const btnY = cardY + cardH - 70;
  const pulse = 0.9 + Math.sin(Date.now() / 300) * 0.1;

  ctx.globalAlpha = pulse;
  shadow(ctx, 16, 0, 3, COLORS.purple + '50');
  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, '#7c6cf6');
  btnGrad.addColorStop(1, COLORS.purpleStrong);
  ctx.fillStyle = btnGrad;
  rr(ctx, btnX, btnY, btnW, btnH, 24);
  ctx.fill();
  resetShadow(ctx);

  ctx.globalAlpha = 0.15 * pulse;
  fillRR(ctx, btnX + 2, btnY + 2, btnW - 4, btnH / 2, 24, '#fff');
  ctx.globalAlpha = pulse;

  ctx.font = '600 15px Inter, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('Press SPACE to Play Again', CANVAS_WIDTH / 2, btnY + 30);
  ctx.globalAlpha = 1;
}
