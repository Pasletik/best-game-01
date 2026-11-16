# Emberfall — Defend the Last Light

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Pasletik/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Pasletik/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A tower defense in vanilla Canvas 2D — no libraries, no build step, no network. Shadow
creatures walk a winding road to the last lantern; you build lantern-towers on the plots
beside it and hold the light through ten waves.

## Play

```sh
node serve.ts
# open http://127.0.0.1:8080/
```

Click a plot to build. **1 / 2 / 3** pick a tower, **Space** starts the next wave, **F** speeds
up, **P** pauses, **M** mutes. Towers upgrade twice and can be sold for a 70% refund.

- **Spark Spire** (40 embers) — fast, cheap, weak against armor.
- **Ember Cannon** (70 embers) — slow, heavy, splashes; cracks armor.
- **Frost Brazier** (60 embers) — chills every foe in range, barely hurts.

Five enemies: fast **Wisps**, tanky **Husks**, armored **Shards**, swift **Wraiths** (from wave
4), and the **Gloom Herald** boss on wave 10. A leak costs a heart; the lantern has five.

## How it is built

- `game/src/world.js` — the rules: road, lantern, towers, enemies, waves, economy. No drawing.
- `game/src/render.js` — everything on screen, including the HUD and panels.
- `game/src/input.js` — keyboard and pointer, as bit-flag actions.
- `game/src/sound.js` — WebAudio synth: shots, coins, leaks, horns, win and lose.
- `game/src/shots.js` — the autopilot that plays the real rules forward to stage screenshots.
- `game/src/main.js` — boot, the fixed-step loop, screens and clicks.
- `game/src/config.js` — every tuning number in one place. `game/src/random.js` — seeded RNG.

The game runs on a fixed 1/60 s step with a seeded RNG, so the same seed plays the same
game — which is what makes the four screenshots in `screenshots/` repeatable. `main.ts`
copies `game/` and `screenshots/` to the output and writes `dossier.json` with the kit's
`buildDossier`.

## Test it

```sh
node tests/simulate.mjs   # headless balance check: the win plan must clear all ten waves
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=fdvwjd8e&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
