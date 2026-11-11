#!/usr/bin/env node
// Sincronização incremental dos artigos publicamente disponíveis da wiki.
// Uso: npm run sync          -> indexa títulos disponíveis em PT-BR
//      npm run sync:full     -> indexa e guarda HTML de todos os títulos PT-BR
//      node scripts/sync-wiki.mjs --full --include-original
// OBS: Execute apenas respeitando as políticas da wiki, direitos de autoria,
// licença efetiva dos artigos e respectivas imagens, e limites operacionais.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {autoCategory} from '../src/data.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const full=process.argv.includes('--full');
const includeOriginal=process.argv.includes('--include-original');
const categoryLookup=!process.argv.includes('--no-category-lookup');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const api='https://wiki.vintagestory.at/api.php';
const namespaces=[0,4,12,14];
const indexPath=path.join(root,'public/data/wiki-index.json');
const pageDir=path.join(root,'public/data/pages');
const labelFor=t=>t.replace(/\/pt-br$/i,'').replace(/_/g,' ').replace(/^Category:/,'Categoria:');

async function query(args,attempt=1){
 const u=new URL(api);
 Object.entries({action:'query',format:'json',formatversion:'2',...args}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
 try{
  const response=await fetch(u,{headers:{'User-Agent':'VintageStoryCodexBrasil/0.1 (non-commercial community study; original wiki attribution)','Accept':'application/json'},signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(data.error)throw new Error(data.error.info||data.error.code);
  return data;
 }catch(err){
  if(attempt<4){console.warn(`   Aviso: ${err.message}. Nova tentativa (${attempt}/3).`);await delay(attempt*3000);return query(args,attempt+1)}
  throw err;
 }
}

async function crawlIndex(){
 let titles=[];
 for(const ns of namespaces){
  let cont='',batch=0;
  do{
   const data=await query({list:'allpages',apnamespace:ns,aplimit:'max',...(cont?{apcontinue:cont}:{})});
   titles.push(...(data.query?.allpages||[]).map(a=>({title:a.title,ns})));
   cont=data.continue?.apcontinue||'';batch++;
   console.log(`namespace ${ns} / lote ${batch} / total ${titles.length}`);
   await delay(650);
  }while(cont);
 }
 const portug=titles.filter(p=>/\/pt-br$/i.test(p.title));
 let chosen=portug;
 if(includeOriginal){
  const seen=new Set(portug.map(p=>p.title.replace(/\/pt-br$/i,'').toLowerCase()));
  chosen=[...portug,...titles.filter(p=>p.ns===0&&!/\/(pt-br|en|fr|es|de|ru|zh|ja|ko|pt|it|nl|pl|tr|uk|sv)$/i.test(p.title)&&!seen.has(p.title.toLowerCase()))];
 }
 return chosen.map(p=>({title:p.title,slug:p.title.replace(/\/pt-br$/i,''),label:labelFor(p.title),categoryName:p.ns===14?'Categoria da wiki':p.ns===12?'Ajuda / documentação':p.title.endsWith('/pt-br')?'Wiki PT-BR':'Wiki original',namespace:p.ns}));
}

async function classifyPages(pages){
 const batchSize=35;
 for(let i=0;i<pages.length;i+=batchSize){
  const batch=pages.slice(i,i+batchSize);
  try{
   const data=await query({prop:'categories',titles:batch.map(p=>p.title).join('|'),cllimit:'max'});
   const pagesFromWiki=data.query?.pages||[];
   const byTitle=new Map(pagesFromWiki.map(p=>[p.title,p]));
   for(const item of batch){
    const categories=(byTitle.get(item.title)?.categories||[]).map(c=>c.title);
    item.sourceCategories=categories;
    item.category=autoCategory(item.title,categories);
   }
  }catch(err){
   console.warn(`Falha ao identificar categorias para lote ${Math.floor(i/batchSize)+1}: ${err.message}`);
   for(const item of batch)item.category=autoCategory(item.title);
  }
  if(i%350===0)console.log(`Classificação: ${Math.min(i+batchSize,pages.length)}/${pages.length}`);
  await delay(650);
 }
}

async function main(){
 console.log('Vintage Story Codex Brasil — coletando o índice da MediaWiki.');
 console.log('Fonte: https://wiki.vintagestory.at | Artigos pertencem aos respectivos autores.');
 await fs.mkdir(pageDir,{recursive:true});
 const pages=await crawlIndex();
 console.log(`${pages.length} páginas selecionadas para o índice.`);
 if(categoryLookup) await classifyPages(pages);
 else pages.forEach(p=>{p.category=autoCategory(p.title)});
 if(full){
  let completed=0,failed=0;
  for(const p of pages){
   const hash=crypto.createHash('sha1').update(p.title).digest('hex').slice(0,20);
   const relative=`/data/pages/${hash}.json`;
   const dest=path.join(pageDir,`${hash}.json`);
   try{
    const stored=JSON.parse(await fs.readFile(dest,'utf8'));
    if(stored?.html){p.cacheUrl=relative;p.revid=stored.revid;completed++;continue;}
   }catch{}
   try{
    const u=new URL(api);
    Object.entries({action:'parse',format:'json',formatversion:'2',page:p.title,prop:'text|sections|revid',redirects:'1',disableeditsection:'1'}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
    const res=await fetch(u,{headers:{'User-Agent':'VintageStoryCodexBrasil/0.1 (community project; source attribution)','Accept':'application/json'},signal:AbortSignal.timeout(25000)});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const data=await res.json();
    if(!data.parse?.text)throw new Error(data.error?.info||'Sem HTML');
    const obj={title:labelFor(data.parse.title||p.title),sourceTitle:data.parse.title||p.title,html:data.parse.text,sections:data.parse.sections||[],revid:data.parse.revid||null,sourceUrl:`https://wiki.vintagestory.at/index.php?title=${encodeURIComponent(p.title.replace(/ /g,'_'))}`,capturedAt:new Date().toISOString()};
    await fs.writeFile(dest,JSON.stringify(obj));
    p.cacheUrl=relative;p.revid=obj.revid;completed++;
   }catch(err){failed++;console.warn(`[${completed+failed}/${pages.length}] ${p.title}: ${err.message}`)}
   if((completed+failed)%30===0)console.log(`Progresso: ${completed} artigos armazenados; ${failed} falhas`);
   await delay(950);
  }
  console.log(`Concluído: ${completed} guardados, ${failed} falhas. URLs restantes permanecem acessíveis pela wiki ao vivo.`);
 }
 await fs.writeFile(indexPath,JSON.stringify({generatedAt:new Date().toISOString(),source:api,sourceLicense:'Consultar a licença de cada página na wiki antes de republicar.',pages},null,2));
 console.log(`Índice salvo em: ${indexPath}`);
}
main().catch(err=>{console.error(`Falha: ${err.message}`);process.exitCode=1});
