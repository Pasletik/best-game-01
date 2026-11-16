// Headless balance check: plays the screenshot autopilot's win plan wave by wave in Node
// and prints the outcome per wave. Run with `node tests/simulate.mjs [seed]`.
import { createWorld } from '../game/src/world.js';
import { createRandom } from '../game/src/random.js';
import { WIN_PLAN } from '../game/src/shots.js';
import { STEP } from '../game/src/config.js';

const seed = Number(process.argv[2] || '1') || 1;
const world = createWorld(createRandom(seed));

function runWave(actions) {
  for (const a of actions) {
    if (a[0] === 'build') world.buildTower(a[1], a[2]);
    else if (a[0] === 'upgrade') {
      const t = world.state.plots[a[1]].tower;
      if (t) world.upgradeTower(t);
    }
  }
  if (!world.startWave()) return world.state.phase;
  let steps = 0;
  while (world.state.phase === 'wave' && steps < 60 * 180) {
    world.step(STEP, false);
    steps += 1;
  }
  return world.state.phase;
}

console.log(`--- win plan (seed ${seed}) ---`);
for (let wave = 1; wave <= WIN_PLAN.length; wave += 1) {
  const heartsBefore = world.state.hearts;
  const embersBefore = world.state.embers;
  const phase = runWave(WIN_PLAN[wave - 1]);
  const leaked = heartsBefore - world.state.hearts;
  console.log(`wave ${wave}: ${phase.padEnd(5)} leaked ${leaked} hearts=${world.state.hearts} embers ${embersBefore} -> ${world.state.embers} kills=${world.state.kills} score=${world.state.score}`);
  if (phase === 'won' || phase === 'lost') break;
}
console.log(`final: phase=${world.state.phase} hearts=${world.state.hearts} score=${world.state.score} kills=${world.state.kills} towers=${world.state.towers.filter((t) => t.active).length}`);
if (world.state.phase !== 'won') {
  console.log('NOTE: the win plan did not clear all ten waves. Tune config.js or shots.js.');
  process.exit(1);
}
console.log('OK: the win plan clears all ten waves.');
