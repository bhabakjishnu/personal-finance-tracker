/**
 * @fileoverview Zero-dependency local development server for Personal Finance Tracker.
 * Serves static files with correct MIME types for ES modules, CSS, and HTML.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const ROOT_DIR = path.resolve(__dirname);

/**
 * Creates and configures the HTTP server instance.
 */
export const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request: Malformed URI sequence');
    return;
  }

  // Normalize path and remove leading slashes
  const normalizedRelative = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, '');
  const relativePath = (normalizedRelative === '/' || normalizedRelative === '.' || normalizedRelative === '')
    ? 'index.html'
    : normalizedRelative.replace(/^[/\\]+/, '');

  const filePath = path.resolve(ROOT_DIR, relativePath);

  // Strict path traversal defense: ensure resolved file is inside ROOT_DIR
  if (filePath !== ROOT_DIR && !filePath.startsWith(ROOT_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    let actualFilePath = filePath;
    if (stats.isDirectory()) {
      actualFilePath = path.join(filePath, 'index.html');
      if (!fs.existsSync(actualFilePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
    }

    const ext = path.extname(actualFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(actualFilePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('500 Internal Server Error');
    });
    stream.pipe(res);
  });
});

// Start listening if run directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  server.listen(PORT, () => {
    console.log(`Finance Tracker server is running at http://localhost:${PORT}`);
  });

  const handleShutdown = () => {
    console.log('\nGracefully shutting down Finance Tracker server...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}
