import { copyFile, mkdir } from 'node:fs/promises';

const dist = new URL('./dist/', import.meta.url);
await mkdir(dist, { recursive: true });
const files = ['index.html', 'styles.css', 'app.mjs', 'model.mjs', 'icon.svg'];
await Promise.all(files.map(file => copyFile(new URL(file, import.meta.url), new URL(file, dist))));
console.log('Built dist/ (5 static files)');
