#!/usr/bin/env node
/**
 * Server statis untuk apps/docs/dist (FND-031).
 *
 * Dipakai Playwright webServer agar tidak bergantung pada `pnpm`/`vite preview`
 * di lingkungan CI. Jalankan `pnpm build` lebih dulu.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'apps',
  'docs',
  'dist',
);
const PORT = Number(process.env.DOCS_PORT ?? 4174);

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
};

function sendFile(response, filePath) {
  response.writeHead(200, {
    'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);
  const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const candidate = path.resolve(ROOT, relative);

  if (!candidate.startsWith(`${ROOT}${path.sep}`) && candidate !== ROOT) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  const info = await stat(candidate).catch(() => null);
  if (info?.isFile()) {
    sendFile(response, candidate);
    return;
  }

  // Hash routing: rute tak dikenal kembali ke index.html.
  sendFile(response, path.join(ROOT, 'index.html'));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`docs server: http://127.0.0.1:${PORT}`);
});
