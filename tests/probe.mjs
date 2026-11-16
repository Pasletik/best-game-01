// Difficulty probe: runs several strategies (good, mediocre, bad) and reports where each
// one dies. A good tower defense should let the win plan finish with 1-2 hearts, kill a
// mediocre plan around wave 6-7, and crush a bad plan by wave 3.
import { createWorld } from '../game/src/world.js';
import { createRandom } from '../game/src/random.js';
import { WIN_PLAN } from '../game/src/shots.js';
import { STEP } from '../game/src/config.js';

function runStrategy(name, planFn) {
  const world = createWorld(createRandom(1));
  for (let wave = 1; wave <= 10; wave += 1) {
    const actions = planFn(wave, world);
    for (const a of actions) {
      if (a[0] === 'build') world.buildTower(a[1], a[2]);
      else if (a[0] === 'upgrade') {
        const t = world.state.plots[a[1]].tower;
        if (t) world.upgradeTower(t);
      }
    }
    if (!world.startWave()) break;
    let steps = 0;
    while (world.state.phase === 'wave' && steps < 60 * 180) {
      world.step(STEP, false);
      steps += 1;
    }
    console.log(`${name} wave ${wave}: ${world.state.phase} hearts=${world.state.hearts} embers=${world.state.embers} kills=${world.state.kills} towers=${world.state.towers.filter((t) => t.active).length}`);
    if (world.state.phase === 'won' || world.state.phase === 'lost') break;
  }
  console.log(`${name} FINAL: ${world.state.phase} hearts=${world.state.hearts} score=${world.state.score}`);
  console.log('');
}

runStrategy('win-plan', (wave) => WIN_PLAN[wave - 1] || []);
runStrategy('sparks-only', (wave, w) => {
  if (wave === 1) return [['build', 2, 'spark'], ['build', 6, 'spark'], ['build', 11, 'spark']];
  return [];
});
runStrategy('one-per-wave', (wave) => {
  const spots = [2, 6, 11, 7, 12, 3, 1, 13, 10, 8];
  const kinds = ['spark', 'spark', 'spark', 'frost', 'cannon', 'spark', 'spark', 'cannon', 'frost', 'spark'];
  return [['build', spots[wave - 1], kinds[wave - 1]]];
});
runStrategy('no-upgrades', (wave) => {
  if (wave === 1) return [['build', 2, 'spark'], ['build', 6, 'spark'], ['build', 11, 'spark']];
  if (wave === 3) return [['build', 12, 'cannon'], ['build', 7, 'frost']];
  if (wave === 5) return [['build', 3, 'spark'], ['build', 13, 'cannon']];
  if (wave === 7) return [['build', 1, 'spark'], ['build', 10, 'frost']];
  return [];
});
runStrategy('no-frost', (wave) => {
  const plan = WIN_PLAN[wave - 1].filter((a) => a[2] !== 'frost');
  return plan;
});
