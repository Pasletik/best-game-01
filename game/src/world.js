// The game's rules and state, with no drawing and no browser in it: the road, the lantern,
// towers, enemies, shots, particles, the economy and the waves. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react without the world
// knowing about screens or sound. Nothing here allocates after createWorld returns.
import {
  ENEMIES, FIELD, HEARTS, HP_GROWTH, LANTERN, PATH, PLOTS, POOL,
  ROAD_HALF, SCORE, START_EMBERS, STEP, TOWERS, WAVE_BONUS, WAVES,
} from './config.js';

export const EVENT_KILL = 1;
export const EVENT_LEAK = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_LOSE = 16;
export const EVENT_SHOT = 32;

/** Path geometry, built once: cumulative lengths so a distance maps to a point. */
const SEGMENTS = [];
let PATH_LENGTH = 0;
for (let i = 0; i < PATH.length - 1; i += 1) {
  const a = PATH[i];
  const b = PATH[i + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  SEGMENTS.push({ a, b, len, start: PATH_LENGTH });
  PATH_LENGTH += len;
}

export function pointAt(dist) {
  let d = Math.max(0, Math.min(PATH_LENGTH, dist));
  for (let i = 0; i < SEGMENTS.length; i += 1) {
    const s = SEGMENTS[i];
    if (d <= s.start + s.len || i === SEGMENTS.length - 1) {
      const t = s.len === 0 ? 0 : Math.max(0, Math.min(1, (d - s.start) / s.len));
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
    }
  }
  return { x: PATH[PATH.length - 1].x, y: PATH[PATH.length - 1].y };
}

/** Stats of a tower of `kind` at `level` (1-based). */
export function towerStats(kind, level) {
  const def = TOWERS[kind];
  const out = { range: def.range, rate: def.rate, damage: def.damage, splash: def.splash ?? 0, slow: def.slow ?? 0 };
  for (let i = 0; i < level - 1; i += 1) {
    const up = def.levels[i];
    if (up.damage !== undefined) out.damage = up.damage;
    if (up.rate !== undefined) out.rate = up.rate;
    if (up.range !== undefined) out.range = up.range;
    if (up.splash !== undefined) out.splash = up.splash;
    if (up.slow !== undefined) out.slow = up.slow;
  }
  return out;
}

/** What an upgrade to the next level costs, or null at max level. */
export function upgradeCost(kind, level) {
  const def = TOWERS[kind];
  if (level >= 1 + def.levels.length) return null;
  return def.levels[level - 1].cost;
}

/** Total embers sunk into a tower (build + upgrades), for the sell refund. */
function invested(tower) {
  let total = TOWERS[tower.kind].cost;
  for (let i = 0; i < tower.level - 1; i += 1) total += TOWERS[tower.kind].levels[i].cost;
  return total;
}

export function createWorld(random) {
  const towers = [];
  const enemies = [];
  const shots = [];
  const particles = [];
  const floaters = [];
  for (let i = 0; i < POOL.enemy; i += 1) {
    enemies.push({ active: false, kind: 'wisp', x: 0, y: 0, hp: 0, maxHp: 0, speed: 0, armor: 0, reward: 0, hearts: 1, radius: 10, dist: 0, lateral: 0, slow: 0, slowUntil: 0, flash: 0 });
  }
  for (let i = 0; i < POOL.shot; i += 1) {
    shots.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, target: null, damage: 0, splash: 0, color: '#fff', speed: 0, kind: 'spark' });
  }
  for (let i = 0; i < POOL.particle; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', gravity: 0 });
  }
  for (let i = 0; i < POOL.floater; i += 1) {
    floaters.push({ active: false, x: 0, y: 0, text: '', life: 0, maxLife: 1, color: '#fff' });
  }

  const state = {
    embers: START_EMBERS,
    hearts: HEARTS,
    score: 0,
    kills: 0,
    wave: 0,
    phase: 'build',
    time: 0,
    waveTime: 0,
    shake: 0,
    towers,
    enemies,
    shots,
    particles,
    floaters,
    plots: PLOTS.map((p) => ({ x: p.x, y: p.y, tower: null })),
  };
  let groups = [];
  let attractTimer = 0;

  function reset() {
    state.embers = START_EMBERS;
    state.hearts = HEARTS;
    state.score = 0;
    state.kills = 0;
    state.wave = 0;
    state.phase = 'build';
    state.time = 0;
    state.waveTime = 0;
    state.shake = 0;
    towers.length = 0;
    for (const e of enemies) e.active = false;
    for (const s of shots) s.active = false;
    for (const p of particles) p.active = false;
    for (const f of floaters) f.active = false;
    for (const p of state.plots) p.tower = null;
    groups = [];
    attractTimer = 0;
  }

  function free(list) {
    for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
    return null;
  }

  function burst(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (p === null) return;
      const a = random() * Math.PI * 2;
      const v = speed * (0.3 + random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v;
      p.maxLife = life * (0.6 + random() * 0.4);
      p.life = p.maxLife;
      p.size = size * (0.6 + random() * 0.8);
      p.color = color;
      p.gravity = 0;
    }
  }

  function floater(x, y, text, color) {
    const f = free(floaters);
    if (f === null) return;
    f.active = true;
    f.x = x;
    f.y = y;
    f.text = text;
    f.maxLife = 1.1;
    f.life = f.maxLife;
    f.color = color;
  }

  function spawnEnemy(kind) {
    const e = free(enemies);
    if (e === null) return;
    const def = ENEMIES[kind];
    const hp = Math.round(def.hp * (1 + HP_GROWTH * (state.wave - 1)));
    e.active = true;
    e.kind = kind;
    e.dist = 0;
    e.lateral = (random() - 0.5) * (ROAD_HALF - def.radius);
    e.hp = hp;
    e.maxHp = hp;
    e.speed = def.speed;
    e.armor = def.armor;
    e.reward = def.reward;
    e.hearts = def.hearts;
    e.radius = def.radius;
    e.slow = 0;
    e.slowUntil = 0;
    e.flash = 0;
    const p = pointAt(0);
    e.x = p.x;
    e.y = p.y;
  }

  function hurtEnemy(e, damage, events) {
    const dealt = Math.max(1, Math.round(damage - e.armor));
    e.hp -= dealt;
    e.flash = 0.09;
    if (e.hp <= 0 && e.active) {
      e.active = false;
      state.kills += 1;
      state.score += SCORE.kill;
      state.embers += e.reward;
      burst(e.x, e.y, ENEMIES[e.kind].color, e.kind === 'herald' ? 26 : 10, 130, 0.6, 3);
      floater(e.x, e.y - 14, `+${e.reward}`, '#ffb347');
      return events | EVENT_KILL;
    }
    return events;
  }

  function startWave() {
    if (state.phase !== 'build') return false;
    state.wave += 1;
    state.phase = 'wave';
    state.waveTime = 0;
    groups = WAVES[state.wave - 1].map((g) => ({ ...g, spawned: 0, timer: 0 }));
    return true;
  }

  function buildTower(plotIndex, kind) {
    const plot = state.plots[plotIndex];
    if (!plot || plot.tower || state.phase === 'won' || state.phase === 'lost') return false;
    if (state.embers < TOWERS[kind].cost) return false;
    const tower = { active: true, plot: plotIndex, kind, level: 1, cooldown: 0, angle: -Math.PI / 2, x: plot.x, y: plot.y };
    towers.push(tower);
    plot.tower = tower;
    state.embers -= TOWERS[kind].cost;
    burst(plot.x, plot.y, TOWERS[kind].color, 12, 90, 0.5, 3);
    return true;
  }

  function upgradeTower(tower) {
    const cost = upgradeCost(tower.kind, tower.level);
    if (cost === null || state.embers < cost) return false;
    state.embers -= cost;
    tower.level += 1;
    burst(tower.x, tower.y, TOWERS[tower.kind].color, 14, 110, 0.6, 3);
    return true;
  }

  function sellTower(tower) {
    const plot = state.plots[tower.plot];
    if (plot) plot.tower = null;
    state.embers += Math.floor(invested(tower) * 0.7);
    tower.active = false;
    const index = towers.indexOf(tower);
    if (index !== -1) towers.splice(index, 1);
    return true;
  }

  function aliveEnemies() {
    let n = 0;
    for (const e of enemies) if (e.active) n += 1;
    return n;
  }

  /** How far through the current wave the player is: spawned so far, total, and still alive. */
  function waveProgress() {
    let total = 0;
    let spawned = 0;
    for (const g of groups) {
      total += g.count;
      spawned += g.spawned;
    }
    return { spawned, total, alive: aliveEnemies() };
  }

  function spawningLeft() {
    for (const g of groups) if (g.spawned < g.count) return true;
    return false;
  }

  /** One fixed step. `attract` runs the title backdrop: wisps drift the road, nothing fights. */
  function step(dt, attract) {
    let events = 0;
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.6);

    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt + p.gravity * dt * dt;
      p.vy += p.gravity * dt;
    }
    for (const f of floaters) {
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) { f.active = false; continue; }
      f.y -= 26 * dt;
    }

    if (attract) {
      attractTimer -= dt;
      if (attractTimer <= 0) {
        attractTimer = 1.4 + random() * 0.8;
        const kinds = ['wisp', 'wisp', 'husk', 'shard'];
        spawnEnemy(kinds[Math.floor(random() * kinds.length)]);
      }
      for (const e of enemies) {
        if (!e.active) continue;
        e.dist += e.speed * 0.55 * dt;
        const p = pointAt(e.dist);
        e.x = p.x;
        e.y = p.y + e.lateral;
        if (e.dist >= PATH_LENGTH) {
          e.active = false;
          burst(LANTERN.x, LANTERN.y, '#ffd34d', 8, 70, 0.5, 2.5);
        }
      }
      return 0;
    }

    if (state.phase === 'wave') {
      state.waveTime += dt;
      for (const g of groups) {
        if (g.spawned >= g.count || state.waveTime < g.delay) continue;
        g.timer -= dt;
        if (g.timer <= 0) {
          spawnEnemy(g.kind);
          g.spawned += 1;
          g.timer = g.gap;
        }
      }
    }

    // Towers fire.
    for (const t of towers) {
      if (!t.active) continue;
      const stats = towerStats(t.kind, t.level);
      t.cooldown -= dt;
      if (t.kind === 'frost') {
        for (const e of enemies) {
          if (!e.active) continue;
          const dx = e.x - t.x;
          const dy = e.y - t.y;
          if (dx * dx + dy * dy <= stats.range * stats.range) {
            e.slow = Math.max(e.slow, stats.slow);
            e.slowUntil = state.time + 0.35;
            e.hp -= stats.damage * dt;
            if (e.hp <= 0) events = hurtEnemy(e, 0, events);
          }
        }
        continue;
      }
      if (t.cooldown > 0) continue;
      let best = null;
      let bestDist = -1;
      for (const e of enemies) {
        if (!e.active) continue;
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        if (dx * dx + dy * dy <= stats.range * stats.range && e.dist > bestDist) {
          best = e;
          bestDist = e.dist;
        }
      }
      if (best === null) continue;
      t.cooldown = 1 / stats.rate;
      t.angle = Math.atan2(best.y - t.y, best.x - t.x);
      const s = free(shots);
      if (s === null) continue;
      s.active = true;
      s.x = t.x;
      s.y = t.y - 14;
      const dist = Math.max(1, Math.hypot(best.x - s.x, best.y - s.y));
      s.vx = ((best.x - s.x) / dist) * 520;
      s.vy = ((best.y - s.y) / dist) * 520;
      s.target = best;
      s.damage = stats.damage;
      s.splash = stats.splash;
      s.color = TOWERS[t.kind].color;
      s.speed = 520;
      s.kind = t.kind;
      events |= EVENT_SHOT;
      burst(s.x, s.y, s.color, 2, 40, 0.2, 2);
    }

    // Shots fly and land.
    for (const s of shots) {
      if (!s.active) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const target = s.target;
      let hit = false;
      if (target && target.active) {
        const dx = target.x - s.x;
        const dy = target.y - s.y;
        if (dx * dx + dy * dy <= (target.radius + 6) * (target.radius + 6)) hit = true;
      } else if (target === null) {
        hit = true;
      }
      if (!hit && (s.x < -20 || s.x > FIELD.width + 20 || s.y < -20 || s.y > FIELD.height + 20)) {
        s.active = false;
        continue;
      }
      if (!hit) continue;
      s.active = false;
      if (s.splash > 0) {
        burst(s.x, s.y, s.color, 8, 120, 0.4, 3);
        for (const e of enemies) {
          if (!e.active) continue;
          const dx = e.x - s.x;
          const dy = e.y - s.y;
          if (dx * dx + dy * dy <= s.splash * s.splash) events = hurtEnemy(e, s.damage, events);
        }
      } else if (target && target.active) {
        burst(s.x, s.y, s.color, 3, 80, 0.25, 2);
        events = hurtEnemy(target, s.damage, events);
      }
    }

    // Enemies walk the road.
    for (const e of enemies) {
      if (!e.active) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.slowUntil < state.time) e.slow = 0;
      const factor = e.slow > 0 ? 1 - e.slow : 1;
      e.dist += e.speed * factor * dt;
      const p = pointAt(e.dist);
      e.x = p.x;
      e.y = p.y + e.lateral;
      if (e.dist >= PATH_LENGTH) {
        e.active = false;
        state.hearts -= e.hearts;
        state.shake = 0.4;
        burst(LANTERN.x, LANTERN.y, '#ff5d6c', 16, 150, 0.6, 3);
        events |= EVENT_LEAK;
        if (state.hearts <= 0) {
          state.hearts = 0;
          state.phase = 'lost';
          return events | EVENT_LOSE;
        }
      }
    }

    // Wave cleared?
    if (state.phase === 'wave' && !spawningLeft() && aliveEnemies() === 0) {
      const bonus = WAVE_BONUS(state.wave);
      state.embers += bonus;
      state.score += SCORE.wave;
      floater(LANTERN.x - 60, LANTERN.y - 50, `Wave ${state.wave} clear  +${bonus}`, '#7ee787');
      events |= EVENT_WAVE_CLEAR;
      if (state.wave >= WAVES.length) {
        state.phase = 'won';
        state.score += state.hearts * SCORE.heart + Math.floor(state.embers / 10) * SCORE.embers;
        return events | EVENT_WIN;
      }
      state.phase = 'build';
    }

    // A few embers always drift up from the lantern, for life.
    if (random() < dt * 2.5) {
      const p = free(particles);
      if (p !== null) {
        p.active = true;
        p.x = LANTERN.x + (random() - 0.5) * 30;
        p.y = LANTERN.y + 10;
        p.vx = (random() - 0.5) * 12;
        p.vy = -(14 + random() * 22);
        p.maxLife = 1.6 + random();
        p.life = p.maxLife;
        p.size = 2 + random() * 1.5;
        p.color = random() < 0.5 ? '#ffd34d' : '#ff9d2e';
        p.gravity = -6;
      }
    }
    return events;
  }

  reset();

  return {
    state,
    reset,
    step,
    startWave,
    buildTower,
    upgradeTower,
    sellTower,
    aliveEnemies,
    spawningLeft,
    waveProgress,
    towerStats,
    upgradeCost,
    pointAt,
  };
}
