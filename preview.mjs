import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const root = new URL('./dist/', import.meta.url);
const files = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/styles.css': ['styles.css', 'text/css'],
  '/app.mjs': ['app.mjs', 'text/javascript'],
  '/model.mjs': ['model.mjs', 'text/javascript'],
  '/icon.svg': ['icon.svg', 'image/svg+xml']
};
const port = Number(process.env.PORT || 4173);
createServer(async (request, response) => {
  const entry = files[new URL(request.url, 'http://localhost').pathname];
  if (!Array.isArray(entry)) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const contents = await readFile(new URL(entry[0], root));
    response.writeHead(200, { 'Content-Type': entry[1] + '; charset=utf-8' }).end(contents);
  } catch {
    response.writeHead(500).end('Run npm run build first.');
  }
}).listen(port, '127.0.0.1', () => console.log('Loopstock http://127.0.0.1:' + port));
