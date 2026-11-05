#!/usr/bin/env node
// A tiny static file server for local development.
//
// It serves the repository root; manifest discovery is documented in
// docs/public/reference/plugin-contract.md.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PLUGIN_TYPES,
  manifestFor,
  manifestText,
  scanPluginIds,
} from './plugin-manifests.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_PORT = 8000;
const MANIFEST_PATH = new RegExp(
  '^/plugins/(' + PLUGIN_TYPES.join('|') + ')/manifest\\.json$'
);

const MIME_TYPES = {
  '.csv': 'text/csv; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};

function readOption(name, fallback) {
  const at = process.argv.indexOf(name);
  if (at === -1) return fallback;
  return process.argv[at + 1] || fallback;
}

function isInsideRoot(pathname) {
  return pathname === ROOT || pathname.startsWith(ROOT + sep);
}

function statusFor(error) {
  if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return 404;
  if (error.code === 'EACCES') return 403;
  return 500;
}

async function resolvePath(requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  const decoded = decodeURIComponent(url.pathname);
  const target = resolve(ROOT, '.' + decoded);

  if (!isInsideRoot(target)) throw Object.assign(new Error('Forbidden'), {
    code: 'EACCES',
  });

  const info = await stat(target);
  if (info.isDirectory()) {
    const index = resolve(target, 'index.html');
    return { pathname: index, size: (await stat(index)).size };
  }
  return { pathname: target, size: info.size };
}

function sendError(response, status) {
  const body = status === 404 ? 'Not found\n' : 'Server error\n';
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

function sendText(response, text, type) {
  response.writeHead(200, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(text);
}

async function manifestResponse(requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  const match = url.pathname.match(MANIFEST_PATH);
  if (!match) return null;
  const type = match[1];
  const ids = await scanPluginIds(resolve(ROOT, 'plugins'), type);
  return manifestText(manifestFor(type, ids));
}

const server = createServer(async (request, response) => {
  try {
    const manifest = await manifestResponse(request.url || '/');
    if (manifest !== null) {
      if (request.method === 'HEAD') {
        response.writeHead(200, { 'Cache-Control': 'no-store' });
        response.end();
      } else {
        sendText(response, manifest, 'application/json; charset=utf-8');
      }
      return;
    }

    const file = await resolvePath(request.url || '/');
    const extension = extname(file.pathname);
    const type = MIME_TYPES[extension] || 'text/plain; charset=utf-8';

    response.writeHead(200, {
      'Content-Type': type,
      'Content-Length': file.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(file.pathname).pipe(response);
  } catch (error) {
    sendError(response, statusFor(error));
  }
});

const port = Number(readOption('--port', process.env.PORT || DEFAULT_PORT));
const host = readOption('--host', process.env.HOST || '127.0.0.1');

server.listen(port, host, () => {
  console.log('Serving ' + ROOT);
  console.log('Open http://' + host + ':' + port + '/');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
