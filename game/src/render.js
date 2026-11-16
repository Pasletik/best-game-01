// Everything on screen, and nothing else: it reads the world and the small UI state and draws.
// Buttons and panels live here too, as fixed rectangles, so main.js can click-test the same
// geometry the player sees. All coordinates are logical (1280x720); main.js scales the canvas.
import { ENEMIES, FIELD, FONT, LANTERN, PALETTE, PATH, PLOTS, ROAD_HALF, TOWERS, WAVES } from './config.js';

export const HUD_HEIGHT = 52;
export const START_BUTTON = { x: 1000, y: 656, w: 180, h: 48 };
export const SPEED_BUTTON = { x: 1056, y: 8, w: 70, h: 36 };
export const PAUSE_BUTTON = { x: 1134, y: 8, w: 44, h: 36 };
export const MUTE_BUTTON = { x: 1186, y: 8, w: 44, h: 36 };

/** A floating panel next to a plot/tower: three tower cards, or upgrade/sell buttons. */
export function panelRect(px, py) {
  const w = 300;
  const h = 78;
  let x = px - w / 2;
  let y = py - h - 16;
  if (y < HUD_HEIGHT + 6) y = py + 26;
  x = Math.max(8, Math.min(FIELD.width - w - 8, x));
  y = Math.max(HUD_HEIGHT + 6, Math.min(FIELD.height - h - 8, y));
  return { x, y, w, h };
}

export function buildCardRects(panel) {
  const cards = [];
  for (let i = 0; i < 3; i += 1) cards.push({ x: panel.x + 6 + i * 98, y: panel.y + 6, w: 92, h: panel.h - 12 });
  return cards;
}

export function towerButtonRects(panel) {
  return [
    { x: panel.x + 6, y: panel.y + 34, w: 140, h: 36 },
    { x: panel.x + 154, y: panel.y + 34, w: 140, h: 36 },
  ];
}

// Stars and ground tufts, fixed once from a seed so the night never changes.
const stars = [];
{
  let a = 1234567;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 110; i += 1) stars.push({ x: rnd() * FIELD.width, y: rnd() * 560, r: 0.5 + rnd() * 1.3, tw: rnd() * Math.PI * 2 });
}
const tufts = [];
{
  let a = 987654;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 70; i += 1) tufts.push({ x: rnd() * FIELD.width, y: 60 + rnd() * 640, s: 2 + rnd() * 3 });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRoad(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.roadEdge;
  ctx.lineWidth = ROAD_HALF * 2 + 6;
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i += 1) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.road;
  ctx.lineWidth = ROAD_HALF * 2;
  ctx.stroke();
  // Dashes down the middle, like a walked track.
  ctx.strokeStyle = 'rgba(238, 241, 245, 0.14)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 18]);
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i += 1) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLantern(ctx, world, time) {
  const flicker = 0.85 + Math.sin(time * 3.1) * 0.08 + Math.sin(time * 7.7) * 0.07;
  const glow = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 4, LANTERN.x, LANTERN.y, 130 * flicker);
  glow.addColorStop(0, 'rgba(255, 211, 77, 0.55)');
  glow.addColorStop(0.45, 'rgba(255, 157, 46, 0.22)');
  glow.addColorStop(1, 'rgba(255, 157, 46, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(LANTERN.x, LANTERN.y, 130 * flicker, 0, Math.PI * 2);
  ctx.fill();
  // Post and cage.
  ctx.fillStyle = '#3a2f22';
  ctx.fillRect(LANTERN.x - 4, LANTERN.y + 6, 8, 26);
  ctx.fillStyle = '#6b5636';
  ctx.beginPath();
  ctx.arc(LANTERN.x, LANTERN.y - 2, LANTERN.radius - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(LANTERN.x, LANTERN.y - 2, LANTERN.radius - 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.arc(LANTERN.x, LANTERN.y - 2, LANTERN.radius - 17, 0, Math.PI * 2);
  ctx.fill();
  // Hearts under the lantern.
  for (let i = 0; i < world.state.hearts; i += 1) {
    const hx = LANTERN.x - 34 + i * 17;
    const hy = LANTERN.y + 44;
    ctx.fillStyle = '#ff5d6c';
    ctx.beginPath();
    ctx.arc(hx - 3.5, hy, 4.5, 0, Math.PI * 2);
    ctx.arc(hx + 3.5, hy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 7.5, hy + 1);
    ctx.lineTo(hx + 7.5, hy + 1);
    ctx.lineTo(hx, hy + 9);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlot(ctx, plot, world, ui) {
  const selected = ui.selectedPlot === plot;
  const hovered = ui.hoverPlot === plot;
  ctx.beginPath();
  ctx.arc(plot.x, plot.y, 21, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.plot;
  ctx.fill();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = selected ? '#ffd34d' : hovered ? '#9aa3bd' : PALETTE.plotRing;
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  if (!plot.tower) {
    ctx.fillStyle = 'rgba(238, 241, 245, 0.35)';
    ctx.font = '20px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', plot.x, plot.y + 1);
  }
}

function drawTower(ctx, tower) {
  const def = TOWERS[tower.kind];
  const x = tower.x;
  const y = tower.y;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#2c3554';
  ctx.fill();
  ctx.strokeStyle = '#4a587f';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (tower.kind === 'spark') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tower.angle);
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y - 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#ffedb0';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
  } else if (tower.kind === 'cannon') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tower.angle);
    ctx.fillStyle = '#4a3428';
    ctx.fillRect(0, -6, 20, 12);
    ctx.fillStyle = '#ff7a3c';
    ctx.fillRect(16, -7, 5, 14);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#6b4a34';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff9d2e';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y - 2, 11, 0, Math.PI);
    ctx.fillStyle = '#3d6f8f';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 2);
    ctx.lineTo(x + 11, y - 2);
    ctx.lineTo(x + 7, y + 8);
    ctx.lineTo(x - 7, y + 8);
    ctx.closePath();
    ctx.fillStyle = '#2b4a63';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#bfe9ff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 8, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#7fd4ff';
    ctx.fill();
  }
  // Level pips.
  for (let i = 0; i < tower.level; i += 1) {
    ctx.beginPath();
    ctx.arc(x - 8 + i * 8, y + 15, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
  }
}

function drawEnemy(ctx, e, time) {
  const def = ENEMIES[e.kind];
  const bob = Math.sin(time * 6 + e.dist * 0.05) * 2;
  const x = e.x;
  const y = e.y + (e.kind === 'wisp' || e.kind === 'wraith' ? bob * 0.5 : 0);
  if (e.slow > 0) {
    ctx.beginPath();
    ctx.arc(x, y, e.radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (e.kind === 'wisp') {
    ctx.beginPath();
    ctx.ellipse(x, y, e.radius, e.radius * 1.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y - 4, e.radius * 0.55, e.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#d9c2ff';
    ctx.fill();
  } else if (e.kind === 'husk') {
    ctx.beginPath();
    ctx.arc(x, y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 5, y - 4, e.radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#a98f7c';
    ctx.fill();
  } else if (e.kind === 'shard') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 2 + e.dist * 0.02) * 0.15);
    ctx.beginPath();
    ctx.moveTo(0, -e.radius - 3);
    ctx.lineTo(e.radius * 0.8, 0);
    ctx.lineTo(0, e.radius + 3);
    ctx.lineTo(-e.radius * 0.8, 0);
    ctx.closePath();
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -e.radius * 0.5);
    ctx.lineTo(e.radius * 0.4, 0);
    ctx.lineTo(0, e.radius * 0.5);
    ctx.lineTo(-e.radius * 0.4, 0);
    ctx.closePath();
    ctx.fillStyle = '#e8fbff';
    ctx.fill();
    ctx.restore();
  } else if (e.kind === 'wraith') {
    ctx.beginPath();
    ctx.arc(x, y - 2, e.radius * 0.9, Math.PI, 0);
    ctx.lineTo(x + e.radius * 0.9, y + e.radius * 0.8);
    ctx.lineTo(x + e.radius * 0.45, y + e.radius * 0.3);
    ctx.lineTo(x, y + e.radius * 0.8);
    ctx.lineTo(x - e.radius * 0.45, y + e.radius * 0.3);
    ctx.lineTo(x - e.radius * 0.9, y + e.radius * 0.8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(232, 244, 255, 0.9)';
    ctx.fill();
  } else {
    // Gloom Herald: a big crowned shadow.
    const glow = ctx.createRadialGradient(x, y, 4, x, y, e.radius * 2.2);
    glow.addColorStop(0, 'rgba(255, 77, 109, 0.35)');
    glow.addColorStop(1, 'rgba(255, 77, 109, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, e.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#2a0e1e';
    ctx.fill();
    ctx.fillStyle = '#ff4d6d';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 12 - 6, y - e.radius + 4);
      ctx.lineTo(x + i * 12, y - e.radius - 12);
      ctx.lineTo(x + i * 12 + 6, y - e.radius + 4);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Eyes.
  ctx.fillStyle = e.kind === 'herald' ? '#ff2e4d' : '#fff';
  const eyeY = y - 2;
  const eyeDx = e.radius * 0.36;
  ctx.beginPath();
  ctx.arc(x - eyeDx, eyeY, e.kind === 'herald' ? 3 : 2, 0, Math.PI * 2);
  ctx.arc(x + eyeDx, eyeY, e.kind === 'herald' ? 3 : 2, 0, Math.PI * 2);
  ctx.fill();
  // Health bar when hurt.
  if (e.hp < e.maxHp) {
    const w = Math.max(22, e.radius * 2);
    ctx.fillStyle = 'rgba(10, 12, 24, 0.8)';
    ctx.fillRect(x - w / 2, y - e.radius - 11, w, 5);
    ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#7ee787' : e.hp / e.maxHp > 0.25 ? '#ffd34d' : '#ff5d6c';
    ctx.fillRect(x - w / 2, y - e.radius - 11, w * Math.max(0, e.hp / e.maxHp), 5);
  }
  // Hit flash.
  if (e.flash > 0) {
    ctx.beginPath();
    ctx.arc(x, y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();
  }
}

function drawHud(ctx, world, ui) {
  const s = world.state;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, HUD_HEIGHT - 1, FIELD.width, 1);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillStyle = PALETTE.ember;
  ctx.fillText('◉ ' + s.embers, 16, HUD_HEIGHT / 2 + 1);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '16px ' + FONT;
  ctx.fillText('Wave ' + Math.max(1, s.wave) + ' / ' + WAVES.length, 190, HUD_HEIGHT / 2 + 1);
  ctx.fillStyle = '#ff5d6c';
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)), 300, HUD_HEIGHT / 2 + 1);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Score ' + s.score, 470, HUD_HEIGHT / 2 + 1);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Kills ' + s.kills, 620, HUD_HEIGHT / 2 + 1);
  if (s.phase === 'wave') {
    const { spawned, total, alive } = world.waveProgress();
    const cleared = spawned - alive;
    const progress = Math.max(0, Math.min(1, cleared / total));
    ctx.fillStyle = 'rgba(238, 241, 245, 0.15)';
    ctx.fillRect(760, 22, 260, 8);
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(760, 22, 260 * progress, 8);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    ctx.fillText('wave ' + Math.round(progress * 100) + '%', 760, 44);
  }
  // Buttons.
  const buttons = [
    { r: SPEED_BUTTON, label: ui.speed === 2 ? '2×' : '1×' },
    { r: PAUSE_BUTTON, label: ui.paused ? '▶' : '❚❚' },
    { r: MUTE_BUTTON, label: ui.muted ? '✕' : '♪' },
  ];
  for (const b of buttons) {
    ctx.fillStyle = '#232c4a';
    roundRect(ctx, b.r.x, b.r.y, b.r.w, b.r.h, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.r.x + b.r.w / 2, b.r.y + b.r.h / 2 + 1);
  }
  ctx.textAlign = 'left';
}

function drawStartButton(ctx, world, ui) {
  if (world.state.phase !== 'build' || ui.screen !== 'play') return;
  const b = START_BUTTON;
  const pulse = 0.9 + Math.sin(world.state.time * 4) * 0.1;
  ctx.fillStyle = '#8a5a12';
  roundRect(ctx, b.x - 2, b.y - 2, b.w + 4, b.h + 4, 12);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  roundRect(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.fillStyle = '#241a08';
  ctx.font = 'bold 19px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶ Start Wave ' + (world.state.wave + 1) + '  [Space]', b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.fillStyle = 'rgba(255, 179, 71, ' + (0.25 * pulse) + ')';
  roundRect(ctx, b.x - 6, b.y - 6, b.w + 12, b.h + 12, 14);
  ctx.stroke();
  ctx.textAlign = 'left';
}

function drawBuildPanel(ctx, world, ui) {
  const plot = ui.selectedPlot;
  if (!plot || plot.tower) return;
  const panel = panelRect(plot.x, plot.y);
  const cards = buildCardRects(panel);
  const kinds = ['spark', 'cannon', 'frost'];
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    const def = TOWERS[kinds[i]];
    const c = cards[i];
    const afford = world.state.embers >= def.cost;
    ctx.fillStyle = afford ? '#1d2440' : '#181d33';
    roundRect(ctx, c.x, c.y, c.w, c.h, 8);
    ctx.fill();
    ctx.strokeStyle = afford ? def.color : '#3a4568';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + 16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(def.short, c.x + c.w / 2, c.y + 34);
    ctx.fillStyle = afford ? PALETTE.ember : PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.fillText('◉ ' + def.cost + '  [' + def.key + ']', c.x + c.w / 2, c.y + 52);
  }
  ctx.textAlign = 'left';
}

function drawTowerPanel(ctx, world, ui) {
  const tower = ui.selectedTower;
  if (!tower || !tower.active) return;
  const panel = panelRect(tower.x, tower.y);
  const def = TOWERS[tower.kind];
  const stats = world.towerStats(tower.kind, tower.level);
  const cost = world.upgradeCost(tower.kind, tower.level);
  const [upRect, sellRect] = towerButtonRects(panel);
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText(def.name + '  ·  Lv ' + tower.level, panel.x + 10, panel.y + 18);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '12px ' + FONT;
  ctx.fillText('dmg ' + stats.damage + '   range ' + stats.range + '   ' + (def.splash ? 'splash ' + stats.splash : def.slow ? 'slow ' + Math.round(stats.slow * 100) + '%' : ''), panel.x + 10, panel.y + 34 - 12);
  const canUp = cost !== null && world.state.embers >= cost;
  ctx.fillStyle = cost === null ? '#181d33' : canUp ? '#1d2440' : '#181d33';
  roundRect(ctx, upRect.x, upRect.y, upRect.w, upRect.h, 8);
  ctx.fill();
  ctx.strokeStyle = cost === null ? '#3a4568' : canUp ? '#ffd34d' : '#3a4568';
  ctx.stroke();
  ctx.fillStyle = cost === null ? PALETTE.muted : canUp ? PALETTE.text : PALETTE.muted;
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(cost === null ? 'MAX LEVEL' : 'Upgrade  ◉ ' + cost, upRect.x + upRect.w / 2, upRect.y + upRect.h / 2 + 1);
  const refund = Math.floor((() => {
    let total = def.cost;
    for (let i = 0; i < tower.level - 1; i += 1) total += def.levels[i].cost;
    return total * 0.7;
  })());
  ctx.fillStyle = '#1d2440';
  roundRect(ctx, sellRect.x, sellRect.y, sellRect.w, sellRect.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#3a4568';
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Sell  +◉ ' + refund, sellRect.x + sellRect.w / 2, sellRect.y + sellRect.h / 2 + 1);
  ctx.textAlign = 'left';
}

function drawRangeRing(ctx, world, ui) {
  let x = 0;
  let y = 0;
  let range = 0;
  let show = false;
  if (ui.selectedTower && ui.selectedTower.active) {
    x = ui.selectedTower.x;
    y = ui.selectedTower.y;
    range = world.towerStats(ui.selectedTower.kind, ui.selectedTower.level).range;
    show = true;
  } else if (ui.selectedPlot && ui.hoverTowerKind) {
    x = ui.selectedPlot.x;
    y = ui.selectedPlot.y;
    range = TOWERS[ui.hoverTowerKind].range;
    show = true;
  }
  if (!show) return;
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 211, 77, 0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 211, 77, 0.5)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
}

function centerText(ctx, text, y, size, color, weight) {
  ctx.fillStyle = color;
  ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, FIELD.width / 2, y);
}

function drawTitle(ctx, world, ui) {
  ctx.fillStyle = 'rgba(10, 12, 26, 0.68)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  centerText(ctx, 'EMBERFALL', 190, 84, '#ffd34d');
  centerText(ctx, 'Defend the Last Light', 258, 30, '#eef1f5', 'normal');
  ctx.fillStyle = '#9aa3bd';
  ctx.font = '17px ' + FONT;
  ctx.textAlign = 'center';
  const lines = [
    'Shadow creatures walk the road to your lantern. Build towers on the plots beside it.',
    'Click a plot to build · 1 / 2 / 3 pick a tower · Space starts the next wave',
    'F to speed up · P to pause · M to mute · 10 waves · if the lantern falls, the light dies.',
  ];
  for (let i = 0; i < lines.length; i += 1) ctx.fillText(lines[i], FIELD.width / 2, 330 + i * 28);
  const pulse = 0.75 + Math.sin(world.state.time * 3) * 0.25;
  ctx.fillStyle = 'rgba(255, 179, 71, ' + pulse + ')';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText('Click or press Space to play', FIELD.width / 2, 470);
  if (ui.best > 0) {
    ctx.fillStyle = '#9aa3bd';
    ctx.font = '16px ' + FONT;
    ctx.fillText('Best score: ' + ui.best, FIELD.width / 2, 510);
  }
}

function drawEnd(ctx, world, ui, won) {
  ctx.fillStyle = won ? 'rgba(20, 32, 16, 0.78)' : 'rgba(32, 12, 18, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  centerText(ctx, won ? 'THE LIGHT ENDURES' : 'THE LIGHT HAS FALLEN', 230, 64, won ? '#7ee787' : '#ff5d6c');
  centerText(ctx, won ? 'All ten waves are broken against your lanterns.' : 'The creatures reached the lantern on wave ' + Math.max(1, world.state.wave) + '.', 300, 24, '#eef1f5', 'normal');
  centerText(ctx, 'Score  ' + world.state.score, 370, 30, '#ffd34d');
  centerText(ctx, 'Kills  ' + world.state.kills + '    ·    Best  ' + Math.max(ui.best, world.state.score), 410, 18, '#9aa3bd', 'normal');
  const pulse = 0.75 + Math.sin(world.state.time * 3) * 0.25;
  ctx.fillStyle = 'rgba(255, 179, 71, ' + pulse + ')';
  ctx.font = 'bold 22px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('Click or press Space to play again', FIELD.width / 2, 490);
}

export function draw(ctx, world, ui) {
  const s = world.state;
  const time = s.time;
  ctx.save();
  if (s.shake > 0) {
    ctx.translate((Math.random() - 0.5) * s.shake * 18, (Math.random() - 0.5) * s.shake * 18);
  }
  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.sky);
  sky.addColorStop(1, '#0a0d1f');
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, FIELD.width + 40, FIELD.height + 40);
  // Stars.
  for (const st of stars) {
    const a = 0.35 + Math.sin(time * 1.4 + st.tw) * 0.25;
    ctx.fillStyle = 'rgba(238, 241, 245, ' + a.toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Moon.
  const moon = ctx.createRadialGradient(1120, 70, 8, 1120, 70, 70);
  moon.addColorStop(0, 'rgba(240, 244, 255, 0.9)');
  moon.addColorStop(0.4, 'rgba(200, 212, 240, 0.35)');
  moon.addColorStop(1, 'rgba(200, 212, 240, 0)');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(1120, 70, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8edf7';
  ctx.beginPath();
  ctx.arc(1120, 70, 30, 0, Math.PI * 2);
  ctx.fill();
  // Ground.
  ctx.fillStyle = PALETTE.ground;
  ctx.beginPath();
  ctx.ellipse(FIELD.width / 2, FIELD.height + 120, FIELD.width * 0.75, 300, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.groundSoft;
  for (const t of tufts) {
    ctx.fillRect(t.x, t.y, t.s, 2);
  }
  drawRoad(ctx);
  drawLantern(ctx, world, time);
  drawRangeRing(ctx, world, ui);
  for (const plot of s.plots) drawPlot(ctx, plot, world, ui);
  for (const tower of s.towers) if (tower.active) drawTower(ctx, tower);
  for (const e of s.enemies) if (e.active) drawEnemy(ctx, e, time);
  // Shots.
  for (const sh of s.shots) {
    if (!sh.active) continue;
    ctx.fillStyle = sh.color;
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, sh.kind === 'cannon' ? 6 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, sh.kind === 'cannon' ? 2.5 : 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Particles.
  for (const p of s.particles) {
    if (!p.active) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Floating texts.
  ctx.font = 'bold 14px ' + FONT;
  ctx.textAlign = 'center';
  for (const f of s.floaters) {
    if (!f.active) continue;
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  drawHud(ctx, world, ui);
  drawStartButton(ctx, world, ui);
  drawBuildPanel(ctx, world, ui);
  drawTowerPanel(ctx, world, ui);
  if (ui.screen === 'title') drawTitle(ctx, world, ui);
  if (ui.screen === 'won') drawEnd(ctx, world, ui, true);
  if (ui.screen === 'lost') drawEnd(ctx, world, ui, false);
  if (ui.paused && ui.screen === 'play') {
    ctx.fillStyle = 'rgba(10, 12, 26, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    centerText(ctx, 'PAUSED', 330, 56, '#eef1f5');
    centerText(ctx, 'P to resume', 400, 20, '#9aa3bd', 'normal');
  }
  ctx.restore();
}
