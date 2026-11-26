#!/usr/bin/env node
/**
 * Server statis generik untuk artefak build (FND-027/FND-031/FND-028).
 *
 * Env:
 * - STATIC_ROOT (default apps/docs/dist)
 * - PORT (default 4174)
 * - A11Y_HARNESS=1 → redirect `/` ke `/tools/a11y-harness/`
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  process.env.STATIC_ROOT ?? path.join('apps', 'docs', 'dist'),
);
const PORT = Number(process.env.PORT ?? 4174);
const HARNESS = process.env.A11Y_HARNESS === '1';

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
  const stream = createReadStream(filePath);
  stream.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    }
    response.end('Not found');
  });
  response.writeHead(200, {
    'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
  });
  stream.pipe(response);
}

function notFound(response) {
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('Not found');
}

async function fileAt(filePath) {
  const info = await stat(filePath).catch(() => null);
  return info?.isFile() === true ? filePath : null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);

  if (url.pathname === '/' && HARNESS) {
    response.writeHead(302, { location: '/tools/a11y-harness/' });
    response.end();
    return;
  }

  const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const candidate = path.resolve(ROOT, relative);

  if (!candidate.startsWith(`${ROOT}${path.sep}`) && candidate !== ROOT) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  const directoryIndex = await fileAt(path.join(candidate, 'index.html'));
  const direct = await fileAt(candidate);
  const file = direct ?? directoryIndex;

  if (file) {
    sendFile(response, file);
    return;
  }

  // Hash routing: rute tak dikenal kembali ke index.html root jika ada.
  const fallback = await fileAt(path.join(ROOT, 'index.html'));
  if (fallback) sendFile(response, fallback);
  else notFound(response);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`static server: http://127.0.0.1:${PORT} (root: ${ROOT})`);
});
