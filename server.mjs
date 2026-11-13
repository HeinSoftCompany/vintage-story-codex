// Dev server sem dependências: npm start -> http://localhost:4173
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/wiki.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,`http://localhost:${port}`).pathname);
  if(pathname==='/api/wiki'){
   const adapter={status(n){res.statusCode=n;return this},json(o){res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(o))},send(t){res.end(t)},setHeader(k,v){res.setHeader(k,v)}};
   await handler(req,adapter);return;
  }
  const publicAsset=pathname.startsWith('/data/')||pathname.startsWith('/images/');
  const target=path.resolve(root, publicAsset ? './public'+pathname : '.'+pathname);
  if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);res.end('Forbidden');return;}
  let data,extension=path.extname(target);
  try{data=await fs.readFile(target)}catch{
   if(publicAsset){res.writeHead(404);res.end('Not found');return;}
   data=await fs.readFile(path.join(root,'index.html'));extension='.html';
  }
  res.setHeader('Content-Type',mime[extension]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);
 }catch(err){res.writeHead(500);res.end(String(err.message))}
}).listen(port,()=>console.log(`Vintage Story Codex Brasil — http://localhost:${port}`));
