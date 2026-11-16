// A tiny static file server for local playtesting: serves this project's game/ on
// http://127.0.0.1:8080. It is a development convenience, not part of the entry.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const port = Number(process.env.PORT ?? 8080);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  const path = url === '/' ? 'index.html' : url.slice(1);
  const file = join(root, path);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  try {
    const stat = await readFile(file, { flag: 'r' }).then(() => true).catch(() => false);
    if (!stat) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500);
    res.end('error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Emberfall dev server: http://127.0.0.1:${port}/`);
});
