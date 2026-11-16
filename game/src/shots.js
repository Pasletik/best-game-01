// Screenshot staging: an autopilot that plays the real rules forward, so every screenshot is
// a genuine moment of the game, not a mock-up. The same script is used by the balance test
// in tests/simulate.mjs, so what the screenshots show is what a good player can actually do.
import { STEP } from './config.js';

/** The winning build plan, one list of actions per wave (applied in the build phase before it).
 *  `['build', plotIndex, kind]` spends embers on a new tower; `['upgrade', plotIndex]` levels it. */
export const WIN_PLAN = [
  [['build', 2, 'spark'], ['build', 6, 'spark'], ['build', 11, 'spark']],
  [['build', 7, 'frost']],
  [['build', 12, 'cannon']],
  [['upgrade', 2], ['upgrade', 6], ['build', 1, 'spark']],
  [['upgrade', 12], ['upgrade', 7], ['upgrade', 11]],
  [['build', 3, 'spark'], ['upgrade', 12], ['upgrade', 2]],
  [['upgrade', 7], ['upgrade', 6], ['upgrade', 11]],
  [['build', 13, 'cannon'], ['upgrade', 3], ['upgrade', 1], ['build', 10, 'frost']],
  [['upgrade', 13], ['upgrade', 3], ['upgrade', 1], ['upgrade', 10], ['build', 8, 'spark']],
  [['upgrade', 13], ['upgrade', 10], ['upgrade', 8], ['build', 0, 'cannon'], ['upgrade', 8]],
];

const MAX_STEPS_PER_WAVE = 60 * 180;

function applyActions(world, actions, log) {
  for (const action of actions) {
    if (action[0] === 'build') {
      const ok = world.buildTower(action[1], action[2]);
      if (!ok && log) log.push('build failed: plot ' + action[1] + ' ' + action[2]);
    } else if (action[0] === 'upgrade') {
      const tower = world.state.plots[action[1]].tower;
      const ok = tower !== null && tower !== undefined && world.upgradeTower(tower);
      if (!ok && log) log.push('upgrade failed: plot ' + action[1]);
    }
  }
}

/** Plays one wave to its end (cleared, won or lost). Returns the ending phase. */
function runWave(world, actions, log) {
  applyActions(world, actions, log);
  if (!world.startWave()) return world.state.phase;
  let steps = 0;
  while (world.state.phase === 'wave' && steps < MAX_STEPS_PER_WAVE) {
    world.step(STEP, false);
    steps += 1;
  }
  return world.state.phase;
}

/** Plays the win plan up to (but not including) `untilWave`, then optionally `extraSeconds`
 *  into the next wave. Returns a summary of where the game ended up. */
export function playPlan(world, untilWave, extraSeconds) {
  const log = [];
  for (let wave = 1; wave <= untilWave; wave += 1) {
    const phase = runWave(world, WIN_PLAN[wave - 1] || [], log);
    if (phase === 'won' || phase === 'lost') break;
  }
  if (extraSeconds > 0 && world.state.phase === 'build') {
    world.startWave();
    const steps = Math.round(extraSeconds / STEP);
    for (let i = 0; i < steps && world.state.phase === 'wave'; i += 1) world.step(STEP, false);
  }
  return {
    log,
    phase: world.state.phase,
    wave: world.state.wave,
    hearts: world.state.hearts,
    embers: world.state.embers,
    kills: world.state.kills,
    score: world.state.score,
    towers: world.state.towers.filter((t) => t.active).length,
  };
}

/** Stages one named scene and returns the screen the renderer should show. */
export function stageShot(world, name) {
  world.reset();
  if (name === 'start') {
    for (let i = 0; i < 60 * 7; i += 1) world.step(STEP, true);
    return { screen: 'title', summary: { phase: world.state.phase } };
  }
  if (name === 'play') {
    const summary = playPlan(world, 2, 18);
    return { screen: 'play', summary };
  }
  if (name === 'win') {
    const summary = playPlan(world, 10, 0);
    return { screen: summary.phase === 'won' ? 'won' : 'play', summary };
  }
  if (name === 'lose') {
    let steps = 0;
    while (world.state.phase !== 'lost' && steps < 60 * 300) {
      if (world.state.phase === 'build') world.startWave();
      world.step(STEP, false);
      steps += 1;
    }
    return { screen: world.state.phase === 'lost' ? 'lost' : 'play', summary: { phase: world.state.phase, wave: world.state.wave, hearts: world.state.hearts, kills: world.state.kills } };
  }
  return { screen: 'title', summary: {} };
}
