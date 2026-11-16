// Boot, the loop, screens and clicks. The world does the rules, the renderer draws, this file
// is the glue between them and the player.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createWorld, EVENT_KILL, EVENT_LEAK, EVENT_LOSE, EVENT_SHOT, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { createInput, ACTION_ESCAPE, ACTION_MUTE, ACTION_PAUSE, ACTION_SPEED, ACTION_START, ACTION_TOWER_1, ACTION_TOWER_2, ACTION_TOWER_3 } from './input.js';
import { buildCardRects, draw, HUD_HEIGHT, MUTE_BUTTON, panelRect, PAUSE_BUTTON, SPEED_BUTTON, START_BUTTON, towerButtonRects } from './render.js';
import { createRandom } from './random.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shotName = params.get('shot');
const shotSeed = Number(params.get('shotSeed') || seed) || 1;

const world = createWorld(createRandom(shotName !== null ? shotSeed : seed));
const input = createInput();
const sound = createSound();
input.attach(canvas);

const ui = {
  screen: 'title',
  paused: false,
  muted: false,
  speed: 1,
  selectedPlot: null,
  selectedTower: null,
  hoverPlot: null,
  hoverTowerKind: null,
  best: 0,
};
try {
  ui.best = Number(window.localStorage.getItem(BEST_KEY) || '0') || 0;
} catch {
  ui.best = 0;
}

function saveBest() {
  if (world.state.score > ui.best) {
    ui.best = world.state.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(ui.best));
    } catch {
      // Best score is a nicety; a storage failure must not break the game.
    }
  }
}

function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function plotAt(x, y) {
  for (const plot of world.state.plots) {
    if (Math.hypot(plot.x - x, plot.y - y) <= 26) return plot;
  }
  return null;
}

function startGame() {
  world.reset();
  ui.screen = 'play';
  ui.selectedPlot = null;
  ui.selectedTower = null;
  ui.paused = false;
  sound.unlock();
  sound.horn();
}

let lastShotSound = 0;

function handleEvents(events) {
  if (events & EVENT_SHOT) {
    // Many towers fire at once; one blip per frame is enough.
    const now = performance.now();
    if (now - lastShotSound > 90) {
      lastShotSound = now;
      sound.shoot('spark');
    }
  }
  if (events & EVENT_KILL) sound.kill();
  if (events & EVENT_LEAK) sound.leak();
  if (events & EVENT_WAVE_CLEAR) sound.coin();
  if (events & EVENT_WIN) {
    saveBest();
    ui.screen = 'won';
    sound.win();
  }
  if (events & EVENT_LOSE) {
    saveBest();
    ui.screen = 'lost';
    sound.lose();
  }
}

function selectPlot(plot) {
  ui.selectedPlot = plot;
  ui.selectedTower = plot.tower || null;
  ui.hoverTowerKind = null;
}

function buildAt(plot, kind) {
  if (world.buildTower(world.state.plots.indexOf(plot), kind)) {
    sound.build();
    ui.selectedTower = plot.tower;
    ui.selectedPlot = null;
    ui.hoverTowerKind = null;
  }
}

function handleClick(click) {
  sound.unlock();
  const { x, y } = click;
  if (ui.screen === 'title' || ui.screen === 'won' || ui.screen === 'lost') {
    startGame();
    return;
  }
  if (ui.screen !== 'play') return;
  if (inside(MUTE_BUTTON, x, y)) {
    ui.muted = !ui.muted;
    sound.setMuted(ui.muted);
    return;
  }
  if (inside(PAUSE_BUTTON, x, y)) {
    ui.paused = !ui.paused;
    return;
  }
  if (inside(SPEED_BUTTON, x, y)) {
    ui.speed = ui.speed === 1 ? 2 : 1;
    return;
  }
  if (world.state.phase === 'build' && inside(START_BUTTON, x, y)) {
    if (world.startWave()) sound.horn();
    ui.selectedPlot = null;
    ui.selectedTower = null;
    return;
  }
  if (ui.selectedTower && ui.selectedTower.active) {
    const panel = panelRect(ui.selectedTower.x, ui.selectedTower.y);
    const [upRect, sellRect] = towerButtonRects(panel);
    if (inside(upRect, x, y)) {
      if (world.upgradeTower(ui.selectedTower)) sound.build();
      return;
    }
    if (inside(sellRect, x, y)) {
      world.sellTower(ui.selectedTower);
      sound.click();
      ui.selectedTower = null;
      return;
    }
  }
  if (ui.selectedPlot && !ui.selectedPlot.tower) {
    const panel = panelRect(ui.selectedPlot.x, ui.selectedPlot.y);
    const cards = buildCardRects(panel);
    const kinds = ['spark', 'cannon', 'frost'];
    for (let i = 0; i < 3; i += 1) {
      if (inside(cards[i], x, y)) {
        buildAt(ui.selectedPlot, kinds[i]);
        return;
      }
    }
  }
  const plot = plotAt(x, y);
  if (plot) {
    selectPlot(plot);
    sound.click();
    return;
  }
  ui.selectedPlot = null;
  ui.selectedTower = null;
}

function handleActions(actions) {
  if (actions & ACTION_MUTE) {
    ui.muted = !ui.muted;
    sound.setMuted(ui.muted);
  }
  if (actions & ACTION_START) {
    sound.unlock();
    if (ui.screen === 'title' || ui.screen === 'won' || ui.screen === 'lost') {
      startGame();
    } else if (ui.screen === 'play' && world.state.phase === 'build' && !ui.paused) {
      if (world.startWave()) sound.horn();
      ui.selectedPlot = null;
      ui.selectedTower = null;
    }
  }
  if (actions & ACTION_PAUSE && ui.screen === 'play') ui.paused = !ui.paused;
  if (actions & ACTION_ESCAPE) {
    ui.selectedPlot = null;
    ui.selectedTower = null;
  }
  if (actions & ACTION_SPEED) ui.speed = ui.speed === 1 ? 2 : 1;
  if (ui.selectedPlot && !ui.selectedPlot.tower && ui.screen === 'play') {
    if (actions & ACTION_TOWER_1) buildAt(ui.selectedPlot, 'spark');
    else if (actions & ACTION_TOWER_2) buildAt(ui.selectedPlot, 'cannon');
    else if (actions & ACTION_TOWER_3) buildAt(ui.selectedPlot, 'frost');
  }
}

function updateHover() {
  const { x, y } = input.input;
  ui.hoverPlot = null;
  ui.hoverTowerKind = null;
  if (x < 0 || ui.screen !== 'play') return;
  if (y < HUD_HEIGHT) return;
  const plot = plotAt(x, y);
  if (plot) ui.hoverPlot = plot;
  if (ui.selectedPlot && !ui.selectedPlot.tower) {
    const panel = panelRect(ui.selectedPlot.x, ui.selectedPlot.y);
    const cards = buildCardRects(panel);
    const kinds = ['spark', 'cannon', 'frost'];
    for (let i = 0; i < 3; i += 1) {
      if (inside(cards[i], x, y)) ui.hoverTowerKind = kinds[i];
    }
  }
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = Math.round(FIELD.width * scale * dpr);
  canvas.height = Math.round(FIELD.height * scale * dpr);
  canvas.style.width = FIELD.width * scale + 'px';
  canvas.style.height = FIELD.height * scale + 'px';
  ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
}

window.addEventListener('resize', resize);
resize();

let accumulator = 0;
let last = performance.now();

function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  const click = input.takeClick();
  if (click !== null) handleClick(click);
  handleActions(input.takeActions());
  updateHover();
  if (ui.screen === 'title') {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      world.step(STEP, true);
      accumulator -= STEP;
    }
  } else if (ui.screen === 'play' && !ui.paused) {
    accumulator += elapsed * ui.speed;
    let guard = 0;
    while (accumulator >= STEP && guard < 600) {
      const events = world.step(STEP, false);
      handleEvents(events);
      accumulator -= STEP;
      guard += 1;
    }
  }
  draw(ctx, world, ui);
  if (shotName === null) requestAnimationFrame(frame);
}

// Shot mode: stage the scene on the real world, paint it twice, and say so.
if (shotName !== null) {
  const result = stageShot(world, shotName);
  ui.screen = result.screen;
  if (result.screen === 'won' || result.screen === 'lost') saveBest();
  draw(ctx, world, ui);
  draw(ctx, world, ui);
  // The summary goes to the console, not the page: the status line would show in the shot.
  console.log('shot ' + shotName + ' ready:', JSON.stringify(result.summary));
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
