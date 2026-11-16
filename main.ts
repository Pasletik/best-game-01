// The competition entrypoint: copies game/ and screenshots/ from beside this file (the
// repository, /bot on the grader) into the output directory and writes the dossier that
// describes them, using the kit's buildDossier, unchanged. The grader's /input is empty,
// so nothing is read from MAKEFUN_INPUT_DIR.
import { copyFile, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

async function copyTree(src, dst) {
  await mkdir(dst, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dst, entry.name);
    if (entry.isDirectory()) await copyTree(from, to);
    else if (entry.isFile()) await copyFile(from, to);
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await copyTree(join(here, 'game'), join(output, 'game'));
if (await exists(join(here, 'screenshots'))) {
  await copyTree(join(here, 'screenshots'), join(output, 'screenshots'));
}
// buildDossier returns the dossier bytes; it does not write the file itself.
await writeFile(
  join(output, 'dossier.json'),
  buildDossier(output, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log('wrote', join(output, 'dossier.json'));
