import test from 'node:test';
import assert from 'node:assert/strict';
import {locales,localizedPath,unlocalizedPath,cleanWikiTitle,wikiTitle,wikiLanguage,setLocale,getLocale} from '../src/locale.js';
import {messages,t} from '../src/i18n.js';
import {categories,featured,progress,formatTitle} from '../src/data.js';

test('all interface messages and curated metadata have six translations',()=>{
  const keys=Object.keys(messages['pt-br']);
  for(const locale of locales){
    assert.deepEqual(Object.keys(messages[locale.code]),keys);
    for(const key of keys)assert.ok(messages[locale.code][key].trim(),`${locale.code}: ${key}`);
  }
  for(const cat of categories){
    for(const value of [cat.name,cat.short,cat.description,...cat.subgroups.flatMap(g=>[g.name,...g.items.flatMap(i=>[i.label,i.note])])]){
      if(!value||value==='VS Model Creator')continue;
      assert.ok(Object.hasOwn(messages.en,value),`Missing curated message: ${value}`);
    }
  }
  for(const item of [...featured,...progress])for(const key of ['title','summary','subtitle','tag']){
    if(item[key])assert.ok(Object.hasOwn(messages.en,item[key]),item[key]);
  }
});
test('locale URLs preserve canonical article slugs, query strings and hashes',()=>{
  for(const locale of locales){
    const url=localizedPath('/pt-br/artigo/Modding%3ABasics?q=a#Section',locale.code);
    assert.equal(url,`/${locale.code}/artigo/Modding%3ABasics?q=a#Section`);
    assert.equal(localizedPath(url,locale.code),url);
    assert.equal(unlocalizedPath(url),'/artigo/Modding%3ABasics?q=a#Section');
    assert.equal(localizedPath('/',locale.code),`/${locale.code}/`);
  }
  assert.equal(localizedPath('https://example.com'),'https://example.com');
  assert.equal(localizedPath('//example.com'),'//example.com');
});
test('canonical wiki titles strip language suffixes but keep real subpages',()=>{
  assert.equal(cleanWikiTitle('Getting_started/ja'),'Getting started');
  assert.equal(cleanWikiTitle('Modding:API'),'Modding:API');
  assert.equal(cleanWikiTitle('Modding/API'),'Modding/API');
  assert.equal(cleanWikiTitle('Water wheel/13/pt-br'),'Water wheel/13');
  assert.equal(wikiTitle('Getting started/de','en'),'Getting started');
  assert.equal(wikiTitle('Getting started/de','ja'),'Getting started/ja');
  assert.equal(wikiLanguage('Getting started'),'en');
  assert.equal(wikiLanguage('Getting started/fr'),'fr');
  assert.equal(formatTitle('Getting_started/ja'),'Getting started');
});
test('composite labels, counts and whitespace are translated',()=>{
  assert.equal(t('01 / SOBREVIVÊNCIA · BIBLIOTECA','en'),'01 / SURVIVAL · LIBRARY');
  assert.equal(t('ARQUIVO / ','en'),'ARCHIVE / ');
  assert.equal(t(' abrir artigo · ','en'),' open article · ');
  assert.equal(t(' 14 ARTIGOS ','de'),' 14 ARTIKEL ');
  assert.equal(t('Carregar mais 40 artigos','es'),'Cargar 40 artículos más');
  assert.equal(t('· índice sincronizado','en'),'· synced index');
  assert.equal(t('Natureza & recursos.','en'),'Nature & resources.');
  assert.equal(t('Untranslated wiki title','ja'),'Untranslated wiki title');
  setLocale('ja');assert.equal(getLocale(),'ja');assert.equal(t('Início'),'ホーム');setLocale('pt-br');
});

let apiCount=0;
const withApi=async (handler,run)=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async url=>{
    const parsed=new URL(url,'https://codex.test');calls.push(parsed);
    const payload=await handler(parsed);
    return new Response(JSON.stringify(payload));
  };
  try{await run(await import(`../src/api.js?test=${++apiCount}`),calls)}finally{globalThis.fetch=original}
};
const article=(title,html='<h2>Original heading</h2>')=>({parse:{title,text:html,displaytitle:'Localized title',revid:42}});

test('all six languages request the appropriate wiki title',async()=>{
  for(const locale of locales)await withApi(u=>article(u.searchParams.get('page')),async(api,calls)=>{
    const result=await api.loadArticle('Getting started/pt-br',locale.code);
    assert.equal(calls[0].searchParams.get('page'),wikiTitle('Getting started',locale.code));
    assert.equal(result.language,locale.code);assert.equal(result.fallback,false);
    assert.equal(result.displayTitle,'Localized title');
  });
});
test('missing translation uses English with explicit language provenance',async()=>{
  await withApi(u=>u.searchParams.get('page').endsWith('/ja')?{error:{code:'missingtitle',info:'Missing'}}:article('Farming'),async(api,calls)=>{
    const result=await api.loadArticle('Farming','ja');
    assert.equal(result.language,'en');assert.equal(result.requestedLocale,'ja');assert.equal(result.fallback,true);
    assert.deepEqual(calls.map(u=>u.searchParams.get('page')),['Farming/ja','Farming']);
  });
});
test('network failures do not claim a translation is unavailable',async()=>{
  await withApi(()=>{throw new Error('Offline')},async(api,calls)=>{
    await assert.rejects(api.loadArticle('Farming','es'),/Offline/);
    assert.equal(calls.length,2);assert.ok(calls.every(u=>u.searchParams.get('page')==='Farming/es'));
  });
});
test('Portuguese snapshots are bypassed for other languages',async()=>{
  await withApi(u=>u.pathname==='/data/wiki-index.json'?{pages:[{title:'Farming/pt-br',slug:'Farming',cacheUrl:'/data/pages/farming.json'}]}:article(u.searchParams.get('page')),async(api,calls)=>{
    await api.loadIndex();
    const result=await api.loadArticle('Farming','es');
    assert.equal(result.language,'es');assert.equal(result.cached,undefined);
    assert.ok(!calls.some(u=>u.pathname==='/data/pages/farming.json'));
  });
});
test('matching Portuguese snapshots retain their source and revision metadata',async()=>{
  await withApi(u=>u.pathname==='/data/wiki-index.json'?{pages:[{title:'Farming/pt-br',slug:'Farming',cacheUrl:'/data/pages/farming.json'}]}:{title:'Farming',sourceTitle:'Farming/pt-br',html:'<p>Português</p>',revid:5},async api=>{
    await api.loadIndex();const result=await api.loadArticle('Farming','pt-br');
    assert.equal(result.cached,true);assert.equal(result.language,'pt-br');assert.equal(result.revid,5);assert.equal(result.fallback,false);
  });
});
test('search prioritizes the selected language and deduplicates translations',async()=>{
  await withApi(()=>({query:{search:[{title:'Farming'},{title:'Farming/es'},{title:'Farming/pt-br'},{title:'Mining'},{title:'Mining/de'}]}}),async api=>{
    const hits=await api.remoteSearch('farm','es');
    assert.deepEqual(hits.map(h=>h.slug),['Farming','Mining']);
    assert.equal(hits[0].categoryName,'Tradução da wiki');
    assert.equal(hits[1].categoryName,'Wiki original');
  });
});
