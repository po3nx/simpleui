#!/usr/bin/env node
/**
 * Server statis untuk fixture E2E (FND-006).
 *
 * Halaman yang diuji belum ada (apps/playground belum dibuat), jadi harness
 * Playwright diarahkan ke fixture deterministik ini. Saat playground siap,
 * ganti `webServer.command` di playwright.config.ts.
 */

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT ?? 4173);
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${HOST}:${PORT}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  // `pathname` selalu diawali '/', sehingga `.${pathname}` = './index.html'.
  const filePath = path.resolve(ROOT, `.${pathname}`);

  if (!filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'content-type':
        CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`fixture server: http://${HOST}:${PORT}`);
});
