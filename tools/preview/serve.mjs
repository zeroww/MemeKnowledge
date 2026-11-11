import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const port = Number(process.env.PORT || 8931);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(root, urlPath === '/' ? '/tools/preview/preview.html' : urlPath);
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('not found: ' + urlPath);
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`preview server http://127.0.0.1:${port}/tools/preview/preview.html`);
  });
