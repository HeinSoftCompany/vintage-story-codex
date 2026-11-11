// Gera a pasta estática que a Vercel publica, sem bibliotecas adicionais.
// O diretório /api continua na raiz e é publicado pela Vercel como função.
import { mkdir, rm, cp, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await copyFile(path.join(root, 'index.html'), path.join(out, 'index.html'));
await cp(path.join(root, 'src'), path.join(out, 'src'), { recursive: true });
await cp(path.join(root, 'public'), out, { recursive: true, force: true });
console.log('Build estático pronto em dist/ (index.html, src/, data/)');
