// Optional browser integration checks, using Chromium's built-in DevTools API.
// Set CODEX_TEST_BROWSER to a Chrome/Chromium/Brave executable on other systems.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {locales} from '../src/locale.js';

const browserPath=process.env.CODEX_TEST_BROWSER||'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const profile=await mkdtemp(path.join(tmpdir(),'codex-locale-test-'));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4197'},windowsHide:true,stdio:'ignore'});
let browser,socket;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label){for(let i=0;i<100;i++){try{const value=await fn();if(value)return value}catch{}await pause(100)}throw new Error(`Timed out: ${label}`)}
try{
  await until(async()=> (await fetch('http://localhost:4197')).ok,'local server');
  browser=spawn(browserPath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
  browser.on('error',err=>{console.error(err.message)});
  const port=await until(async()=>Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'browser startup');
  const pages=await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
  let seq=0;
  const pending=new Map(),errors=[];
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`))},15000);
    pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
  });
  socket.onmessage=async event=>{
    const message=JSON.parse(event.data);
    if(message.id){const entry=pending.get(message.id);if(!entry)return;clearTimeout(entry.timer);pending.delete(message.id);message.error?entry.reject(new Error(message.error.message)):entry.resolve(message.result);return}
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
    if(message.method==='Fetch.requestPaused'){
      const {requestId,request}=message.params,u=new URL(request.url);
      const title=u.searchParams.get('page')||'';
      let body;
      if(u.pathname==='/data/wiki-index.json')body={pages:[{title:'Farming/pt-br',slug:'Farming',category:'recursos',categoryName:'Wiki PT-BR'}]};
      else if(u.searchParams.get('action')==='parse'){
        body=title==='Missing translation/ja'?{error:{code:'missingtitle',info:'Missing'}}:{parse:{title,displaytitle:'Wiki '+title,text:'<h2 id="Growth">Início</h2><p>Original wiki content. Português.</p><h2 id="Tools">Ferramentas</h2><h2 id="End">Final</h2><a href="https://wiki.vintagestory.at/Farming/fr#Growth">Wiki link</a><script>throw new Error("unsafe wiki script")</script>',revid:42}};
      }else body={query:{search:[{title:'Farming/es'},{title:'Farming'},{title:'Farming/de'}]}};
      await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
    }
  };
  const evaluate=async expression=>{
    const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*','https://dl.flathub.org/*']});
  await send('Fetch.enable',{patterns:[{urlPattern:'*/api/wiki?*'},{urlPattern:'*/data/wiki-index.json'}]});
  const visit=async pathname=>{
    await send('Page.navigate',{url:'http://localhost:4197'+pathname});
    await until(()=>evaluate(`document.querySelectorAll('.mobile-bottom-nav a').length===4&&location.pathname===${JSON.stringify(pathname)}`),pathname);
    // Wait for the local index to trigger its final render before interacting.
    await until(()=>evaluate(`(async()=>(await import('/src/api.js')).getIndex().length>0)()`),'index render');
  };
  const checkInterface=async()=>{
    const untranslated=await evaluate(`(async()=>{
      const {t}=await import('/src/i18n.js');const nodes=document.createTreeWalker(document.querySelector('#app'),NodeFilter.SHOW_TEXT);let node;const missing=[];
      while(node=nodes.nextNode())if(!node.parentElement.closest('#article-live,[data-source-text],option')){const value=node.textContent.trim();if(value&&t(value)!==value)missing.push(value)}
      for(const el of document.querySelectorAll('#app [aria-label],#app [placeholder],#app [title]'))for(const attr of ['aria-label','placeholder','title']){const value=el.getAttribute(attr);if(value&&t(value)!==value)missing.push(attr+': '+value)}
      return missing;
    })()`);
    assert.deepEqual(untranslated,[],'All interface text should be localized');
  };
  for(const locale of locales){
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    for(const route of ['/','/explorar','/biblioteca','/favoritos','/categoria/iniciantes','/categoria/fabricacao']){
      await visit(`/${locale.code}${route}`);
      assert.equal(await evaluate('document.documentElement.lang'),locale.lang);
      assert.equal(await evaluate('document.querySelector("#locale-select").value'),locale.code);
      assert.equal(await evaluate(`Array.from(document.querySelectorAll('a[data-route]')).every(a=>a.pathname.startsWith('/${locale.code}/'))`),true);
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Mobile overflow: ${locale.code}${route}`);
      await checkInterface();
    }
    await visit(`/${locale.code}/artigo/Getting%20started`);
    await until(()=>evaluate('!!document.querySelector("#article-live h2")'),'wiki article');
    assert.equal(await evaluate('document.querySelector("#article-live").lang'),locale.lang);
    assert.equal(await evaluate('document.querySelector("#article-live h2").textContent'),'Início');
    assert.equal(await evaluate('document.querySelector("#article-live script")'),null);
    assert.equal(await evaluate('document.querySelector("#vs-article-walkthrough").hidden'),false);
    assert.equal(await evaluate('document.querySelectorAll(".vs-walk-buttons button").length'),3);
    await evaluate(`document.querySelectorAll('.vs-walk-buttons button')[1].click()`);
    assert.equal(await evaluate('document.querySelector(".vs-walk-group.is-current button").textContent.trim()'),'Ferramentas');
    assert.equal(await evaluate('document.querySelector("#article-live a").getAttribute("href")'),`/${locale.code}/artigo/Farming#Growth`);
    await checkInterface();
    for(const width of [320,1024,1440]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<851});
      await visit(`/${locale.code}/`);
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${locale.code} overflow at ${width}px`);
    }
    console.log(`PASS ${locale.code}: mobile routes, articles, language and internal links`);
  }
  await visit('/pt-br/biblioteca');
  assert.equal(await evaluate('document.querySelectorAll(".library-item").length'),40);
  const firstArticle=await evaluate('document.querySelector(".library-item").href');
  await evaluate('document.querySelector(".pagination a:last-child").click()');
  assert.equal(await evaluate('new URLSearchParams(location.search).get("page")'),'2');
  assert.notEqual(await evaluate('document.querySelector(".library-item").href'),firstArticle);
  assert.equal(await evaluate('document.activeElement.id'),'library-results');
  await evaluate('document.querySelector(".library-item").click()');
  await evaluate('history.back()');
  await until(()=>evaluate(`!!document.querySelector('.pagination [aria-current="page"]')`),'return to library');
  assert.equal(await evaluate('new URLSearchParams(location.search).get("page")'),'2');
  await evaluate('const filter=document.querySelector("#library-filter");filter.value="no-match-xyz";filter.dispatchEvent(new Event("input",{bubbles:true}))');
  assert.equal(await evaluate('document.querySelectorAll(".library-item").length'),0);
  assert.equal(await evaluate('new URLSearchParams(location.search).has("page")'),false);
  assert.equal(await evaluate('new URLSearchParams(location.search).get("q")'),'no-match-xyz');
  console.log('PASS pagination, article return, filter reset and empty results');
  await visit('/ja/artigo/Missing%20translation');
  await until(()=>evaluate('!!document.querySelector(".article-language.is-fallback")'),'fallback notice');
  assert.equal(await evaluate('document.querySelector("#article-live").lang'),'en');
  assert.equal(await evaluate('document.querySelector("#article-source-link").href'),'https://wiki.vintagestory.at/index.php?title=Missing_translation');
  await evaluate(`document.querySelector('[data-action="bookmark"]').click();document.querySelector('#locale-select').value='es';document.querySelector('#locale-select').dispatchEvent(new Event('change',{bubbles:true}))`);
  assert.equal(await evaluate('location.pathname'),'/es/artigo/Missing%20translation');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('vsc-favorites'))[0]`),'Missing translation');
  await evaluate(`document.querySelector('.mobile-bottom-nav a[href$="favoritos"]').click()`);
  assert.equal(await evaluate('!!document.querySelector(".library-item")'),true);
  await evaluate(`document.querySelector('[data-action="search"]').click()`);
  assert.equal(await evaluate('document.querySelector(".search-input").placeholder'),'¿Qué quieres descubrir?');
  await evaluate(`const input=document.querySelector('.search-input');input.value='Agricultura';input.dispatchEvent(new Event('input',{bubbles:true}))`);
  assert.equal(await evaluate(`document.querySelector('.search-result strong').textContent`),'Agricultura');
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
  await visit('/es/categoria/iniciantes');
  await evaluate(`const input=document.querySelector('#category-filter');input.value='Herramientas';input.dispatchEvent(new Event('input',{bubbles:true}))`);
  assert.equal(await evaluate('document.querySelector(".topic-row strong").textContent'),'Herramientas');
  await checkInterface();
  await visit('/en/');
  assert.equal(await evaluate(`(async()=>(await fetch('/src/motion.css')).headers.get('Content-Type').includes('text/css'))()`),true);
  assert.equal(await evaluate('document.querySelectorAll("#vs-fold,#vs-journey-title,.vs-glass-switch,.vs-temporal-wisp").length'),4);
  await evaluate(`document.querySelector('#vs-fold').click()`);
  assert.equal(await evaluate('document.querySelector("#vs-fold").getAttribute("aria-pressed")'),'true');
  assert.equal(await evaluate('document.querySelector(".vs-cover-hint").textContent'),'TAP TO CLOSE ↗');
  await evaluate(`document.querySelector('[data-action="journey-next"]').click()`);
  assert.equal(await evaluate('document.querySelector("#vs-journey-title").textContent'),'Prepare the essentials');
  await evaluate(`document.querySelector('.vs-glass-switch').click()`);
  assert.equal(await evaluate('document.body.classList.contains("light-mode")'),true);
  assert.equal(await evaluate('document.querySelector(".vs-glass-switch").getAttribute("aria-checked")'),'true');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".vs-temporal-wisp")).display'),'none');
  await send('Emulation.setEmulatedMedia',{features:[]});
  await checkInterface();
  for(const width of [320,390,850,1024,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<851});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Overflow at ${width}px`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.mobile-bottom-nav')).display==='none'`),width>850);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:'http://localhost:4197/'});
  await until(()=>evaluate('location.pathname==="/en/"&&!!document.querySelector(".hero")'),'saved locale');
  // Capture actual typography and image loading separately from deterministic flow tests.
  await send('Network.setBlockedURLs',{urls:['https://dl.flathub.org/*']});
  const screenshotDir=path.resolve('artifacts/ui');
  await mkdir(screenshotDir,{recursive:true});
  for(const [name,width,light] of [['desktop-dark',1440,false],['mobile-dark',390,false],['desktop-light',1440,true]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<851});
    await visit('/pt-br/');
    await evaluate(`document.body.classList.toggle('light-mode',${light})`);
    await evaluate('document.fonts.ready');
    assert.equal(await evaluate(`document.fonts.check('400 32px Fraunces')&&document.fonts.check('400 16px "Source Sans 3"')`),true,'Display and interface fonts must load');
    assert.equal(await evaluate(`(async()=>{const image=new Image();image.src='/images/homestead.jpg';await image.decode();return image.naturalWidth>0})()`),true);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Screenshot overflow: ${name}`);
    await pause(350);
    const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(path.join(screenshotDir,name+'.png'),Buffer.from(screenshot.data,'base64'));
  }
  for(const [name,route,width] of [['desktop-library','/biblioteca',1440],['mobile-article','/artigo/Getting%20started',390],['mobile-reading','/artigo/Getting%20started',390],['desktop-sections','/',1440]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<851});
    await visit('/pt-br'+route);
    await evaluate("document.body.classList.remove('light-mode')");
    if(route.startsWith('/artigo/'))await until(()=>evaluate('!!document.querySelector("#article-live h2")'),'article screenshot');
    await evaluate('document.fonts.ready');
    if(name==='mobile-reading')await evaluate("document.querySelector('#article-live').scrollIntoView({behavior:'instant'})");
    if(name==='desktop-sections'){
      await evaluate("document.querySelector('#categorias').scrollIntoView({behavior:'instant'})");
      await pause(800);
    }
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Screenshot overflow: ${name}`);
    await pause(350);
    const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(path.join(screenshotDir,name+'.png'),Buffer.from(screenshot.data,'base64'));
  }
  console.log('PASS real fonts, local images and desktop/mobile screenshots');
  assert.deepEqual(errors,[]);
  console.log('PASS fallback, language switching, shared favorites, translated search/filters, responsive widths and saved preference');
}finally{
  socket?.close();browser?.kill();server.kill();
  await pause(500);
  assert.equal(path.dirname(path.resolve(profile)),path.resolve(tmpdir()));
  assert.ok(path.basename(profile).startsWith('codex-locale-test-'));
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:500});
}
