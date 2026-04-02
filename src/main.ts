import './style.css';
import { createInitialState, updateGame } from './game';
import { render } from './renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:100vh;width:100vw;">
    <canvas id="game" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" style="border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.4);max-width:100vw;max-height:100vh;"></canvas>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;

let state = createInitialState();
const keys = new Set<string>();

document.addEventListener('keydown', (e) => {
  keys.add(e.key);

  // Start / Restart
  if (!state.started && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    state.started = true;
  }
  if (state.gameOver && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    state = createInitialState();
    state.started = true;
  }

  // Pause
  if (e.key === 'Escape' && state.started && !state.gameOver) {
    state.paused = !state.paused;
  }

  // Prevent scrolling with space/arrows
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  keys.delete(e.key);
});

let lastTime = 0;

function gameLoop(timestamp: number) {
  const dt = lastTime === 0 ? 16 : Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  state = updateGame(state, dt, keys);
  render(ctx, state);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
