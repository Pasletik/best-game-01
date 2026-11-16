// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
//
// Emberfall: defend the last lantern. Shadow creatures walk a winding road from the top-left
// to the lantern at the bottom-right; the player builds lantern-towers on the plots beside it.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The road the creatures walk, as waypoints. The lantern sits just past the last one. */
export const PATH = [
  { x: -40, y: 120 },
  { x: 1080, y: 120 },
  { x: 1080, y: 300 },
  { x: 200, y: 300 },
  { x: 200, y: 480 },
  { x: 1080, y: 480 },
  { x: 1080, y: 620 },
  { x: 1200, y: 620 },
];

/** Half the road's width, in pixels. Plots keep clear of it. */
export const ROAD_HALF = 26;

/** Where the lantern stands, and how many hearts it has. */
export const LANTERN = { x: 1228, y: 620, radius: 26 };
export const HEARTS = 5;

/** Where towers may be built. */
export const PLOTS = [
  { x: 90, y: 210 }, { x: 290, y: 210 }, { x: 490, y: 210 }, { x: 690, y: 210 }, { x: 890, y: 210 },
  { x: 320, y: 390 }, { x: 520, y: 390 }, { x: 720, y: 390 }, { x: 920, y: 390 },
  { x: 90, y: 550 }, { x: 290, y: 550 }, { x: 490, y: 550 }, { x: 690, y: 550 }, { x: 890, y: 550 },
  { x: 90, y: 685 }, { x: 290, y: 685 }, { x: 490, y: 685 },
];

/** Embers the player starts with. */
export const START_EMBERS = 120;

/** Bonus embers for clearing a wave: 25 + 10 * wave. */
export const WAVE_BONUS = (wave) => 25 + 10 * wave;

/** Towers. `damage` is per shot; `rate` is shots per second; `armor` on an enemy subtracts
 *  from each hit (at least 1 damage always lands). `slow` is the fraction of speed removed. */
export const TOWERS = {
  spark: {
    name: 'Spark Spire',
    short: 'Spark',
    key: '1',
    cost: 40,
    range: 135,
    rate: 2.4,
    damage: 6,
    color: '#ffd34d',
    blurb: 'Fast shots, cheap. Weak against armor.',
    levels: [
      { cost: 50, damage: 10, rate: 3.0, range: 135 },
      { cost: 90, damage: 16, rate: 3.2, range: 155 },
    ],
  },
  cannon: {
    name: 'Ember Cannon',
    short: 'Cannon',
    key: '2',
    cost: 70,
    range: 115,
    rate: 0.6,
    damage: 34,
    splash: 55,
    color: '#ff7a3c',
    blurb: 'Slow, heavy, splashes. Cracks armor.',
    levels: [
      { cost: 70, damage: 56, rate: 0.6, splash: 70 },
      { cost: 110, damage: 92, rate: 0.7, splash: 85 },
    ],
  },
  frost: {
    name: 'Frost Brazier',
    short: 'Frost',
    key: '3',
    cost: 60,
    range: 125,
    rate: 1,
    damage: 3,
    slow: 0.45,
    color: '#7fd4ff',
    blurb: 'Chills all nearby foes. Barely hurts.',
    levels: [
      { cost: 60, damage: 5, slow: 0.6, range: 125 },
      { cost: 100, damage: 8, slow: 0.7, range: 145 },
    ],
  },
};

/** Enemy kinds. `hp` grows with the wave (see world.js). `hearts` is what a leak costs. */
export const ENEMIES = {
  wisp: { name: 'Wisp', hp: 16, speed: 112, armor: 0, reward: 4, hearts: 1, radius: 11, color: '#b78cff' },
  husk: { name: 'Husk', hp: 78, speed: 56, armor: 0, reward: 8, hearts: 1, radius: 16, color: '#8a6f5c' },
  shard: { name: 'Shard', hp: 48, speed: 76, armor: 3, reward: 6, hearts: 1, radius: 13, color: '#9fe8ff' },
  wraith: { name: 'Wraith', hp: 28, speed: 148, armor: 0, reward: 6, hearts: 1, radius: 11, color: '#e8f4ff' },
  herald: { name: 'Gloom Herald', hp: 2200, speed: 44, armor: 5, reward: 150, hearts: 2, radius: 26, color: '#ff4d6d' },
};

/** Waves. Each group spawns `count` of one kind, `gap` seconds apart, `delay` seconds after
 *  the wave starts (groups run on their own clocks, so they overlap). */
export const WAVES = [
  [{ kind: 'wisp', count: 8, gap: 1.0, delay: 0 }],
  [{ kind: 'wisp', count: 10, gap: 0.9, delay: 0 }, { kind: 'husk', count: 3, gap: 1.6, delay: 4 }],
  [{ kind: 'wisp', count: 12, gap: 0.8, delay: 0 }, { kind: 'husk', count: 5, gap: 1.4, delay: 4 }, { kind: 'shard', count: 2, gap: 1.8, delay: 8 }],
  [{ kind: 'wisp', count: 8, gap: 0.7, delay: 0 }, { kind: 'husk', count: 4, gap: 1.2, delay: 3 }, { kind: 'shard', count: 4, gap: 1.5, delay: 6 }, { kind: 'wraith', count: 4, gap: 1.1, delay: 9 }],
  [{ kind: 'wisp', count: 16, gap: 0.6, delay: 0 }, { kind: 'husk', count: 8, gap: 1.1, delay: 3 }, { kind: 'shard', count: 6, gap: 1.3, delay: 6 }, { kind: 'wraith', count: 6, gap: 1.0, delay: 9 }],
  [{ kind: 'wisp', count: 12, gap: 0.55, delay: 0 }, { kind: 'husk', count: 10, gap: 1.0, delay: 3 }, { kind: 'shard', count: 8, gap: 1.2, delay: 6 }, { kind: 'wraith', count: 8, gap: 0.9, delay: 9 }],
  [{ kind: 'wisp', count: 14, gap: 0.5, delay: 0 }, { kind: 'husk', count: 10, gap: 0.9, delay: 3 }, { kind: 'shard', count: 10, gap: 1.1, delay: 6 }, { kind: 'wraith', count: 10, gap: 0.8, delay: 9 }],
  [{ kind: 'wisp', count: 18, gap: 0.45, delay: 0 }, { kind: 'husk', count: 12, gap: 0.8, delay: 3 }, { kind: 'shard', count: 11, gap: 1.0, delay: 6 }, { kind: 'wraith', count: 11, gap: 0.7, delay: 9 }],
  [{ kind: 'wisp', count: 20, gap: 0.4, delay: 0 }, { kind: 'husk', count: 14, gap: 0.75, delay: 3 }, { kind: 'shard', count: 12, gap: 0.9, delay: 6 }, { kind: 'wraith', count: 12, gap: 0.65, delay: 9 }],
  [{ kind: 'herald', count: 1, gap: 1, delay: 2 }, { kind: 'wraith', count: 8, gap: 0.8, delay: 0 }, { kind: 'shard', count: 10, gap: 1.0, delay: 5 }, { kind: 'wisp', count: 12, gap: 0.5, delay: 8 }],
];

/** How much an enemy's hp grows per wave: hp * (1 + 0.20 * (wave - 1)). */
export const HP_GROWTH = 0.2;

/** Score: per kill, per wave cleared, and at victory per heart and per 10 embers left. */
export const SCORE = { kill: 10, wave: 100, heart: 150, embers: 1 };

/** Pools, allocated once at boot: no allocation during play. */
export const POOL = { enemy: 96, shot: 128, particle: 256, floater: 48 };

export const PALETTE = {
  sky: '#0d1026',
  skyTop: '#131740',
  ground: '#141a2e',
  groundSoft: '#1a2140',
  road: '#2b3350',
  roadEdge: '#454f78',
  plot: '#232c4a',
  plotRing: '#4a587f',
  lantern: '#ffd34d',
  lanternGlow: '#ff9d2e',
  panel: 'rgba(16, 20, 40, 0.92)',
  panelEdge: '#3a4568',
  text: '#eef1f5',
  muted: '#9aa3bd',
  danger: '#ff5d6c',
  ember: '#ffb347',
  ok: '#7ee787',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberfall.best';
