import { categories, featured, progress, allCurated, uniqueCurated, findCategory, findArticle, formatTitle } from './data.js';
import { requestWiki, loadArticle, remoteSearch, getIndex, loadIndex, originalUrl } from './api.js';
import { icon, brandIcon } from './icons.js';

const app = document.querySelector('#app');
const state = { searchOpen: false, searchText: '', searchRemote: [], searchBusy: false, searchError:false, mobileOpen:false, libraryVisible:40, categoryFilter:'', libraryFilter:'', routeKey:0 };
const safe = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const urlArticle = slug => '/artigo/' + encodeURIComponent(slug);
const urlCategory = id => '/categoria/' + encodeURIComponent(id);
const keyForSlug = slug => String(slug||'').toLowerCase().replace(/\/pt-br$/,'').trim();
const fold = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const currentRoute = () => {
  const p = location.pathname;
  if(p.startsWith('/categoria/')) return {type:'category',key:decodeURIComponent(p.slice('/categoria/'.length))};
  if(p.startsWith('/artigo/')) return {type:'article',key:decodeURIComponent(p.slice('/artigo/'.length))};
  if(p.startsWith('/biblioteca')) return {type:'library'};
  if(p.startsWith('/favoritos')) return {type:'favorites'};
  return {type:'home'};
};
const getSaved = () => {try{return JSON.parse(localStorage.getItem('vsc-favorites')||'[]')}catch{return []}};
const isSaved = slug => getSaved().some(k => keyForSlug(k)===keyForSlug(slug));
const lookupArticle = slug => findArticle(slug) || getIndex().find(p => keyForSlug(p.slug||p.title)===keyForSlug(slug));
const topicGroups = cat => {
 const included = cat.subgroups.flatMap(g=>g.items);
 const known = new Set(included.map(p=>keyForSlug(p.slug)));
 const extra = getIndex().filter(p=>p.category===cat.id && !known.has(keyForSlug(p.slug||p.title)))
    .map(p=>({ label:p.label||formatTitle(p.title),slug:p.slug||p.title.replace(/\/pt-br$/i,''),note:'Artigo adicional do índice da wiki' }));
 return [...cat.subgroups,...(extra.length?[{name:'Outros artigos da wiki',items:extra}]:[])];
};
const categoryCount = cat => topicGroups(cat).reduce((sum,g)=>sum+g.items.length,0);
const themePref = () => {try{return localStorage.getItem('vsc-theme')||'dark'}catch{return 'dark'}};
const setTheme = value => {document.body.classList.toggle('light-mode',value==='light');try{localStorage.setItem('vsc-theme',value)}catch{}};

function navLink(text, href, active){return `<a data-route href="${safe(href)}" class="${active?'active':''}">${safe(text)}</a>`}
function footer(){return `<footer class="footer"><div>Uma iniciativa independente da comunidade. Artigos obtidos da <a href="https://wiki.vintagestory.at/Main_Page/pt-br" target="_blank" rel="noopener noreferrer">Vintage Story Wiki</a>; créditos, histórico de edições e licenças disponíveis na fonte.<br>Codex Brasil não é afiliado à Anego Studios ou à administração da wiki.</div><div class="footer-right">FEITO PARA EXPLORAR ✧ VINTAGE STORY</div></footer>`}
function shell(route){
 const activeCategory=route.type==='category'?route.key:route.type==='article'?lookupArticle(route.key)?.category:null;
 const active = route.type;
 return `<header class="topbar">
  <button class="header-circle hamburger" data-action="mobile" aria-label="Abrir menu" title="Menu">${icon('menu')}</button>
  <a href="/" data-route class="brand" aria-label="Página inicial Codex Brasil"><span class="brand-mark">${brandIcon}</span><span class="brand-words"><strong>VINTAGE STORY</strong><span>C O D E X &nbsp; B R A S I L</span></span></a>
  <nav class="topnav" aria-label="Navegação principal">
    ${navLink('Início','/',active==='home')}${navLink('Sobrevivência',urlCategory('iniciantes'),activeCategory==='iniciantes')}${navLink('Fabricação',urlCategory('fabricacao'),activeCategory==='fabricacao')}${navLink('Exploração',urlCategory('recursos'),activeCategory==='recursos')}${navLink('Mundo',urlCategory('mundo'),activeCategory==='mundo')}${navLink('Modding',urlCategory('modding'),activeCategory==='modding')}${navLink('Biblioteca','/biblioteca',active==='library')}
  </nav>
  <div class="header-actions"><button class="search-trigger" data-action="search" aria-label="Buscar artigos">${icon('search')}<span>Buscar no Codex...</span><kbd class="kbd">⌘ K</kbd></button><a href="/favoritos" data-route class="header-circle" title="Artigos salvos" aria-label="Favoritos">${icon('bookmark')}</a><button class="header-circle" data-action="theme" title="Alternar aparência" aria-label="Alternar tema">${icon(themePref()==='light'?'sun':'moon')}</button></div>
 </header>
 <div class="mobile-backdrop ${state.mobileOpen?'show':''}" data-action="closemobile"></div>
 <aside class="sidebar ${state.mobileOpen?'open':''}" aria-label="Navegação lateral"><div class="sidebar-content">
 <div class="sidebar-label">NAVEGAÇÃO</div>
 <a data-route href="/" class="sidebar-link ${active==='home'?'active':''}">${icon('home')}Visão geral</a>
 <a data-route href="/biblioteca" class="sidebar-link ${active==='library'?'active':''}">${icon('book')}Biblioteca completa</a>
 <a data-route href="/favoritos" class="sidebar-link ${active==='favorites'?'active':''}">${icon('bookmark')}Artigos salvos<span class="sidebar-num">${getSaved().length}</span></a>
 <div class="side-rule"></div><div class="sidebar-label">EXPLORAR POR CATEGORIA</div>
 ${categories.map(cat=>`<a data-route href="${urlCategory(cat.id)}" class="sidebar-link ${activeCategory===cat.id?'active':''}">${icon(cat.icon)}${safe(cat.short)}<span class="sidebar-num">${categoryCount(cat)}</span></a>`).join('')}
 <div class="side-rule"></div><div class="sidebar-label">GUIAS ESSENCIAIS</div>
 ${[
  ['Seu primeiro dia','Survival Guide - Your first day'],['Guia de mineração','Mining'],['Instalar no Linux','Installing the game on Linux'],['Adicionar mods','Adding Mods']
 ].map(([label,slug])=>`<a data-route href="${urlArticle(slug)}" class="sidebar-link">${icon('chevron-right')}${safe(label)}</a>`).join('')}
 </div><div class="sidebar-bottom"><div class="side-callout"><strong>Conhecimento é<br>sobrevivência.</strong><p>Um novo jeito de explorar a enciclopédia criada por jogadores.</p><a href="https://wiki.vintagestory.at/Help:How_to_help/pt-br" target="_blank" rel="noopener">Contribua com a wiki ${icon('arrow-up-right')}</a></div></div><div class="side-footer">FONTE: WIKI OFICIAL · PT-BR<br>PROJETO INDEPENDENTE DA COMUNIDADE</div></aside>
 <main class="main"><div class="page" id="page-slot"></div></main>
 <button class="back-top" data-action="backtop" aria-label="Voltar ao topo">${icon('arrow-up')}</button>`;
}
const wrap = html => `${html}${footer()}`;

function categoryCard(cat){
 const count = categoryCount(cat);
 return `<a data-route href="${urlCategory(cat.id)}" class="cat-card" style="--cat-color:${cat.color}">
 <div class="cat-card-top"><span class="cat-ico">${icon(cat.icon)}</span><span class="cat-arrow">${icon('arrow-up-right')}</span></div>
 <div class="cat-card-content"><h3>${safe(cat.name)}</h3><p>${safe(cat.description)}</p><div class="cat-card-meta">${String(count).padStart(2,'0')} ARTIGOS GUIADOS</div></div></a>`;
}
function guideCard(g,i){
 const spots=['#b49c5a30','#c8794b24','#79a77a2c'];
 return `<a data-route href="${urlArticle(g.slug)}" class="guide-card" style="--spot:${spots[i%3]}"><div class="guide-num"><span>${safe(g.tag)}</span>${icon('arrow-up-right')}</div><h3>${safe(g.title)}</h3><p>${safe(g.summary)}</p><span class="read-more">Ler guia ${icon('arrow-right')}</span></a>`;
}
function renderHome(){
 const total = uniqueCurated.length;
 return wrap(`<div class="intro-strip"><span class="home-crumb">ARQUIVO / <b>PÁGINA INICIAL</b></span><span class="live"><i class="pulse"></i> CONHECIMENTO EM CONSTANTE EVOLUÇÃO</span></div>
 <section class="hero" aria-label="Bem-vindo ao Codex"><div class="hero-photo"></div><div class="hero-corner">✦ EDIÇÃO COMUNITÁRIA</div><div class="hero-content">
  <div class="hero-kicker"><span class="diamond">◇</span> A ENCICLOPÉDIA DO SOBREVIVENTE</div>
  <h1>O mundo é antigo.<br><em>O conhecimento</em><br>é seu.</h1>
  <p>Dos primeiros passos à última era dos metais. Tudo o que você precisa para dominar Vintage Story, organizado para a sua jornada.</p>
  <div class="buttons"><a data-route class="btn btn-primary" href="${urlCategory('iniciantes')}">Começar a explorar ${icon('arrow-right')}</a><a data-route class="btn btn-outline" href="/biblioteca">Abrir biblioteca ${icon('book')}</a></div>
 </div><div class="hero-coordinates">✧ DOCUMENTAÇÃO • PT-BR</div></section>
 <div class="underhero"><div class="meta-cluster"><div class="meta-item">${icon('layers')}<span><b>08</b> categorias</span></div><div class="meta-item">${icon('book')}<span><b>${total}</b> guias em destaque</span></div><div class="meta-item">${icon('globe')}<span>Leitura em <b>português</b> quando disponível</span></div></div><a href="https://wiki.vintagestory.at/Main_Page/pt-br" target="_blank" rel="noopener">Fonte: Vintage Story Wiki ${icon('external')}</a></div>
 <section class="section" id="categorias"><div class="section-heading"><div class="section-title-wrap"><div class="eyebrow">EXPLORE SEU CAMINHO</div><h2 class="section-title">Um universo de possibilidades.</h2><p class="section-description">Encontre exatamente o que procura, sem se perder no caminho.</p></div><a class="section-action" data-route href="/biblioteca">Ver todos os artigos ${icon('arrow-right')}</a></div><div class="categories-grid">${categories.map(categoryCard).join('')}</div></section>
 <section class="section"><div class="section-heading"><div class="section-title-wrap"><div class="eyebrow">SELEÇÃO DO CODEX</div><h2 class="section-title">Comece por estas histórias.</h2><p class="section-description">Guias essenciais para transformar curiosidade em domínio.</p></div></div><div class="guide-grid">${featured.map(guideCard).join('')}</div></section>
 <section class="section"><div class="section-heading"><div class="section-title-wrap"><div class="eyebrow">PROGRESSÃO</div><h2 class="section-title">Construa sua própria era.</h2><p class="section-description">Cada conquista abre caminho para novas descobertas.</p></div></div>
 <div class="progress-panel"><div class="progress-head"><strong>Da pedra ao aço.</strong><span>UMA JORNADA EM QUATRO ETAPAS</span></div><div class="progress-steps">${progress.map((p,i)=>`<a data-route href="${urlArticle(p.slug)}" class="progress-step"><div class="step-ico">${i===0?icon('check'):icon('chevron-right')}</div><h4>${safe(p.title)}</h4><p>${safe(p.subtitle)}</p></a>`).join('')}</div></div></section>
 <section class="bottom-banner"><div><h2>O conhecimento cresce<br>quando é compartilhado.</h2><p>Ajude a melhorar os artigos e traduções diretamente na wiki original.</p></div><a class="btn btn-primary" href="https://wiki.vintagestory.at/Help:How_to_help/pt-br" target="_blank" rel="noopener">Como contribuir ${icon('arrow-up-right')}</a></section>`);
}
function breadcrumbs(crumbs){return `<nav class="breadcrumbs" aria-label="Caminho de navegação"><a data-route href="/">Início</a>${crumbs.map(c=>`${icon('chevron-right')}${c.href?`<a data-route href="${safe(c.href)}">${safe(c.label)}</a>`:`<strong>${safe(c.label)}</strong>`}`).join('')}</nav>`}
function topicRow(it){return `<a data-route href="${urlArticle(it.slug)}" class="topic-row"><span class="topic-marker">${icon('book')}</span><span class="topic-info"><strong>${safe(it.label)}</strong>${it.note?`<small>${safe(it.note)}</small>`:''}</span><span class="topic-end">${icon('chevron-right')}</span></a>`}
function renderCategory(id){
 const cat=findCategory(id);
 if(!cat) return renderNotFound();
 const groups=topicGroups(cat);
 const all=groups.flatMap(g=>g.items);
 const q=fold(state.categoryFilter);
 const sections=groups.map(group=>({...group,items:group.items.filter(it=>fold(it.label+' '+it.note+' '+it.slug).includes(q))})).filter(group=>group.items.length);
 return wrap(`${breadcrumbs([{label:cat.name}])}<section class="category-hero" style="--cat-color:${cat.color}"><div class="eyebrow">${safe(cat.kicker)} · BIBLIOTECA</div><h1>${safe(cat.name)}.</h1><p>${safe(cat.description)} Acesse os artigos originais e aprofunde-se em cada tema.</p><div class="category-count">${String(all.length).padStart(2,'0')} GUIAS SELECIONADOS</div></section>
 <div class="directory-header"><div><h2>Índice de conteúdos</h2><p>Explore os tópicos desta categoria</p></div><input id="category-filter" class="mini-filter" type="search" placeholder="Filtrar assuntos..." value="${safe(state.categoryFilter)}" aria-label="Filtrar artigos da categoria"></div>
 <div id="category-results">${sections.length?sections.map(group=>`<div class="topic-group"><div class="topic-group-title"><h3>${safe(group.name)}</h3><span>${group.items.length} ${group.items.length===1?'ARTIGO':'ARTIGOS'}</span></div>${group.items.map(topicRow).join('')}</div>`).join(''):`<div class="no-results">Nenhum artigo corresponde à sua pesquisa nesta categoria.</div>`}</div>
 <div class="cat-more"><span>Quer descobrir mais? A biblioteca também pesquisa artigos que não aparecem nessa curadoria.</span><button class="section-action" data-action="search">Pesquisar na wiki ${icon('arrow-right')}</button></div>`);
}
function combinedIndex(){
 const collected = getIndex().map(p => ({label:p.label||p.title?.replace(/\/pt-br$/i,'')||p.slug,slug:p.slug||(p.title||'').replace(/\/pt-br$/i,''),categoryName:p.categoryName||'Wiki PT-BR',cacheUrl:p.cacheUrl})).filter(p=>p.slug);
 return [...new Map([...uniqueCurated,...collected].map(p=>[keyForSlug(p.slug),p])).values()].sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
}
function renderLibrary(favorites=false){
 let entries = favorites ? getSaved().map(slug=>findArticle(slug)||getIndex().find(p=>keyForSlug(p.slug||p.title)===keyForSlug(slug))||{slug,label:formatTitle(slug),categoryName:'Salvo'}) : combinedIndex();
 entries=entries.map(p=>({...p,slug:p.slug||(p.title||'').replace(/\/pt-br$/i,''),label:p.label||(p.title||p.slug),categoryName:p.categoryName||'Wiki PT-BR'}));
 const total=entries.length;
 const q=fold(state.libraryFilter);
 entries=entries.filter(p=>fold(p.label+' '+p.slug+' '+p.categoryName).includes(q));
 const shown=entries.slice(0,state.libraryVisible);
 return wrap(`${breadcrumbs([{label:favorites?'Artigos salvos':'Biblioteca'}])}<section class="category-hero" style="--cat-color:#c3b186"><div class="eyebrow">ARQUIVO / ${favorites?'SUA COLEÇÃO':'ACERVO COMPLETO'}</div><h1>${favorites?'Suas descobertas.':'Toda a biblioteca.'}</h1><p>${favorites?'Artigos que você marcou para consultar depois, guardados neste navegador.':'Explore a curadoria principal e, após sincronizar o índice, todas as páginas disponíveis da wiki em português.'}</p><div class="category-count">${total} ARTIGOS NO ÍNDICE</div></section>
 <div class="library-toolbar"><p>${entries.length} artigos encontrados ${getIndex().length?'· índice sincronizado':'· seleção inicial'}${favorites?' · seus favoritos':''}</p><input id="library-filter" class="mini-filter" placeholder="Filtrar biblioteca..." aria-label="Filtrar biblioteca" type="search" value="${safe(state.libraryFilter)}"></div>
 <div id="library-results">${shown.length?`<div class="library-items">${shown.map(it=>`<a data-route href="${urlArticle(it.slug)}" class="library-item">${icon('book')}<div class="library-label"><strong>${safe(formatTitle(it.label))}</strong><span>${safe(it.categoryName)}</span></div><span class="arr">${icon('arrow-up-right')}</span></a>`).join('')}</div>`:`<div class="no-results">${favorites?'Você ainda não salvou artigos, ou a busca não encontrou correspondências.':'Nenhum artigo corresponde à busca.'}</div>`}</div>
 ${entries.length>shown.length?`<div class="results-more"><button data-action="more" data-amount="40">Carregar mais ${Math.min(40,entries.length-shown.length)} artigos ${icon('arrow-right')}</button></div>`:''}
 <div class="cat-more"><span>Não encontrou? A pesquisa também consulta a wiki original.</span><button class="section-action" data-action="search">Abrir pesquisa ${icon('search')}</button></div>`);
}
function renderArticleShell(slug){
 const item=lookupArticle(slug);
 const cat=item?.category?findCategory(item.category):null;
 const title=item?.label||formatTitle(slug);
 return wrap(`${breadcrumbs([{label:cat?.name||'Biblioteca',href:cat?urlCategory(cat.id):'/biblioteca'},{label:title}])}<div class="article-layout"><div class="article-main">
 <div class="article-head"><div class="eyebrow">${cat?safe(cat.kicker):'ARTIGO DA ENCICLOPÉDIA'}</div><h1>${safe(title)}</h1>
 <div class="article-meta"><span>${icon('book')} Conteúdo da Vintage Story Wiki</span><span>${icon('globe')} Português quando disponível</span></div>
 <div class="article-toolbar"><button class="tool-chip ${isSaved(slug)?'saved':''}" data-action="bookmark" data-slug="${safe(slug)}">${icon(isSaved(slug)?'bookmark-check':'bookmark')}${isSaved(slug)?'Salvo':'Salvar artigo'}</button><button class="tool-chip" data-action="copy" data-copy="${safe(location.href)}">${icon('link')}Copiar link</button><a class="tool-chip" href="${safe(originalUrl(slug+'/pt-br'))}" target="_blank" rel="noopener noreferrer">${icon('external')}Ver na wiki</a></div></div>
 <div id="article-live" class="article-content" aria-live="polite"><div class="loading-block xl"></div><div class="loading-block"></div><div class="loading-block"></div><div class="loading-block med"></div><div class="loading-block" style="margin-top:40px"></div><div class="loading-block short"></div><div class="loading-block"></div></div>
 <div id="article-footnote"></div></div><aside class="article-toc" id="article-toc"><h3>NESTE ARTIGO</h3><div class="article-status">Carregando seções...</div></aside></div>`);
}
function renderNotFound(){return wrap(`${breadcrumbs([{label:'Página não encontrada'}])}<div class="article-empty">${icon('compass')}<h2>Este caminho ainda não foi mapeado.</h2><p>Não encontramos a página solicitada. Você pode explorar a biblioteca ou tentar uma busca.</p><div class="buttons" style="justify-content:center"><a class="btn btn-primary" data-route href="/">Voltar ao início ${icon('arrow-right')}</a><button data-action="search" class="btn btn-outline">Pesquisar ${icon('search')}</button></div></div>`)}

function sanitizeWikiHtml(html){
 const parsed = new DOMParser().parseFromString(html,'text/html');
 parsed.querySelectorAll('script,style,iframe,object,embed,form,meta,link,base,button,input,textarea,select').forEach(el=>el.remove());
 const root=parsed.querySelector('.mw-parser-output')||parsed.body;
 root.querySelectorAll('.mw-editsection,.mw-parser-output > .toc,.printfooter,.catlinks,.mw-jump-link,.mw-indicators').forEach(el=>el.remove());
 root.querySelectorAll('*').forEach(el=>{
  [...el.attributes].forEach(a=>{
   const k=a.name.toLowerCase(),v=a.value.trim();
   if(k.startsWith('on')||['style','srcdoc','formaction'].includes(k)) el.removeAttribute(a.name);
   if(['href','src','poster','xlink:href'].includes(k)&&/^(javascript|vbscript|data|file):/i.test(v)) el.removeAttribute(a.name);
  });
  if(el.tagName==='IMG'){el.loading='lazy';el.decoding='async';}
 });
 const holder=document.createElement('div');
 holder.append(...Array.from(root.childNodes).map(n=>document.importNode(n,true)));
 holder.querySelectorAll('a[href]').forEach(a=>{
  const href=a.getAttribute('href');
  if(!href||href.startsWith('#'))return;
  try{
   const u=new URL(href,'https://wiki.vintagestory.at/');
   if(u.hostname==='wiki.vintagestory.at'){
    let title='';
    if(u.pathname==='/index.php') title=u.searchParams.get('title')||'';
    else if(u.pathname.startsWith('/Special:MyLanguage/')) title=u.pathname.slice('/Special:MyLanguage/'.length);
    else title=u.pathname.slice(1);
    try{title=decodeURIComponent(title).replace(/_/g,' ')}catch{}
    if(title && !/^(File|Special|User|Template|Media|Talk|Help:|Vintage Story Wiki:)/i.test(title)){
     a.setAttribute('href',urlArticle(title.replace(/\/pt-br$/,'')));a.dataset.route='';
    } else {a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';}
   }else {a.target='_blank';a.rel='noopener noreferrer';}
  }catch{a.removeAttribute('href')}
 });
 return holder;
}
async function hydrateArticle(slug, routeKey){
 const container=document.querySelector('#article-live'),toc=document.querySelector('#article-toc'),footnote=document.querySelector('#article-footnote');
 if(!container)return;
 try{
  const result=await loadArticle(slug);
  if(state.routeKey!==routeKey||!document.querySelector('#article-live'))return;
  const doc=sanitizeWikiHtml(result.html);
  container.replaceChildren(...Array.from(doc.childNodes));
  const headings=[...container.querySelectorAll('h2,h3')].filter(h=>h.textContent?.trim());
  const usedIds=new Set();
  headings.forEach((h,i)=>{let id=h.id||h.querySelector('[id]')?.id||`secao-${i+1}`;if(usedIds.has(id))id+=`-${i}`;usedIds.add(id);h.id=id;});
  toc.innerHTML=`<h3>NESTE ARTIGO</h3>${headings.length?headings.slice(0,45).map(h=>`<a class="${h.tagName==='H3'?'sub':''}" data-action="section" href="#${encodeURIComponent(h.id)}" data-section="${safe(h.id)}">${safe(h.textContent.trim())}</a>`).join(''):'<div class="article-status">Artigo sem seções</div>'}<div class="toc-source"><a href="${safe(originalUrl(result.sourceTitle))}" target="_blank" rel="noopener">Ver fonte original ${icon('external')}</a></div>`;
  footnote.innerHTML=`<div class="article-source-note">${icon('info')} Este artigo é exibido a partir da <a href="${safe(originalUrl(result.sourceTitle))}" target="_blank" rel="noopener">Vintage Story Wiki</a> (${result.sourceTitle.endsWith('/pt-br')?'versão em português':'versão original disponível'}). Alterações, histórico de autores, créditos de imagens e condições de reutilização devem ser consultados na página de origem. Este site é uma interface comunitária independente.</div>`;
  document.title=`${formatTitle(result.title)} — Vintage Story Codex Brasil`;
 }catch(e){
  if(state.routeKey!==routeKey)return;
  container.innerHTML=`<div class="article-empty">${icon('alert')}<h2>Não foi possível carregar o artigo.</h2><p>O servidor da wiki está indisponível, a API não permitiu o acesso ou o título desta página mudou. Você ainda pode ler o conteúdo no site original.</p><div class="buttons" style="justify-content:center"><button data-action="retry" data-slug="${safe(slug)}" class="btn btn-outline">Tentar novamente</button><a class="btn btn-primary" href="${safe(originalUrl(slug))}" target="_blank" rel="noopener">Abrir wiki ${icon('external')}</a></div></div>`;
  toc.innerHTML='<h3>NESTE ARTIGO</h3><div class="article-status">Não foi possível consultar as seções.</div>';
  console.warn('Falha ao carregar artigo',e);
 }
}

function render(){
 const r=currentRoute();state.routeKey++;
 app.innerHTML=shell(r);
 const slot=document.querySelector('#page-slot');
 slot.innerHTML=r.type==='home'?renderHome():r.type==='category'?renderCategory(r.key):r.type==='article'?renderArticleShell(r.key):r.type==='library'?renderLibrary(false):r.type==='favorites'?renderLibrary(true):renderNotFound();
 if(r.type==='article')hydrateArticle(r.key,state.routeKey);
 const t = r.type==='category'?findCategory(r.key)?.name:r.type==='article'?lookupArticle(r.key)?.label||formatTitle(r.key):r.type==='library'?'Biblioteca':r.type==='favorites'?'Salvos':'Início';
 document.title=`${t||'Codex'} — Vintage Story Codex Brasil`;
 updateBackToTop();
 if(state.searchOpen) renderSearch();
}
function navigate(to){
 if(!to)return;
 if(location.pathname!==to)history.pushState(null,'',to);
 state.mobileOpen=false;state.categoryFilter='';state.libraryFilter='';state.libraryVisible=40;
 closeSearch();render();window.scrollTo({top:0,behavior:'instant'});
}

function searchHits(){
 const q=fold(state.searchText.trim());
 if(!q)return uniqueCurated.slice(0,6);
 const local=[...uniqueCurated,...getIndex().map(p=>({label:p.label||p.title,slug:p.slug||p.title?.replace(/\/pt-br$/,''),categoryName:p.categoryName||'Wiki PT-BR'}))].filter(p=>p.slug&&fold(p.label+' '+p.slug+' '+p.categoryName).includes(q));
 return [...new Map([...local,...state.searchRemote].map(p=>[keyForSlug(p.slug),p])).values()].slice(0,20);
}
function renderSearch(){
 const old=document.querySelector('#search-overlay');if(old)old.remove();
 if(!state.searchOpen)return;
 const hits=searchHits();
 const modal=document.createElement('div');modal.id='search-overlay';modal.className='search-overlay';modal.dataset.action='close-search-area';
 modal.innerHTML=`<div class="search-dialog" role="dialog" aria-modal="true" aria-label="Pesquisar na biblioteca"><div class="search-form">${icon('search')}<input type="search" id="search-input" class="search-input" autocomplete="off" placeholder="O que você deseja descobrir?" value="${safe(state.searchText)}" aria-label="Termo de busca"><button class="search-close" data-action="close-search" aria-label="Fechar busca">ESC</button></div><div class="search-content" id="search-content"><div class="search-label">${state.searchText?'RESULTADOS PARA SUA BUSCA':'SUGESTÕES PARA EXPLORAR'} ${state.searchBusy?' · CONSULTANDO A WIKI…':''}</div>${hits.map(p=>`<a data-route href="${urlArticle(p.slug)}" class="search-result">${icon('book')}<div><strong>${safe(formatTitle(p.label))}</strong><small>${safe(p.categoryName||'Artigo da wiki')}</small></div>${icon('arrow-up-right')}</a>`).join('')}${hits.length===0?'<div class="no-results">Nenhum artigo encontrado. Tente outro termo ou consulte a wiki original.</div>':''}</div><div class="search-help"><span><kbd>ENTER</kbd> abrir artigo · <kbd>ESC</kbd> fechar</span><span>BUSCA WIKI + CODEX</span></div></div>`;
 document.body.append(modal);
 modal.querySelector('input').focus();
 try{modal.querySelector('input').setSelectionRange(state.searchText.length,state.searchText.length)}catch{}
}
let searchTimer=0;
function openSearch(){state.searchOpen=true;state.searchText='';state.searchRemote=[];state.searchBusy=false;renderSearch();}
function closeSearch(){state.searchOpen=false;document.querySelector('#search-overlay')?.remove();}
async function querySearch(q){
 if(q.length<2){state.searchRemote=[];state.searchBusy=false;updateSearchResults();return;}
 state.searchBusy=true;updateSearchResults();
 try{const remote=await remoteSearch(q);if(q===state.searchText.trim()){state.searchRemote=remote;state.searchBusy=false;updateSearchResults()}}
 catch {if(q===state.searchText.trim()){state.searchBusy=false;state.searchError=true;updateSearchResults()}}
}
function updateSearchResults(){
 const c=document.querySelector('#search-content');if(!c)return;
 const hits=searchHits();
 c.innerHTML=`<div class="search-label">${state.searchText?'RESULTADOS':'SUGESTÕES'}${state.searchBusy?' · PESQUISANDO NA WIKI…':''}</div>${hits.map(p=>`<a data-route href="${urlArticle(p.slug)}" class="search-result">${icon('book')}<div><strong>${safe(formatTitle(p.label))}</strong><small>${safe(p.categoryName||'Artigo da wiki')}</small></div>${icon('arrow-up-right')}</a>`).join('')}${hits.length===0?'<div class="no-results">Nenhum artigo encontrado. Tente outra palavra.</div>':''}`;
}
function updateBackToTop(){document.querySelector('.back-top')?.classList.toggle('visible',scrollY>450)}

// Todas as ações são delegadas. Assim os novos artigos e resultados continuam navegáveis.
document.addEventListener('click',async e=>{
 const link=e.target.closest('a[data-route]');
 if(link){if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();navigate(link.pathname+link.search);return;}
 const btn=e.target.closest('[data-action]');if(!btn)return;
 const action=btn.dataset.action;
 if(action==='mobile'){state.mobileOpen=!state.mobileOpen;render();return;}
 if(action==='closemobile'){state.mobileOpen=false;render();return;}
 if(action==='search'){openSearch();return;}
 if(action==='close-search'){closeSearch();return;}
 if(action==='close-search-area'&&e.target===btn){closeSearch();return;}
 if(action==='theme'){setTheme(themePref()==='light'?'dark':'light');render();return;}
 if(action==='backtop'){window.scrollTo({top:0,behavior:'smooth'});return;}
 if(action==='more'){state.libraryVisible+=Number(btn.dataset.amount)||40;render();return;}
 if(action==='bookmark'){
  const slug=btn.dataset.slug;let saved=getSaved();const prev=saved.some(k=>keyForSlug(k)===keyForSlug(slug));saved=prev?saved.filter(k=>keyForSlug(k)!==keyForSlug(slug)):[...saved,slug];try{localStorage.setItem('vsc-favorites',JSON.stringify(saved))}catch{}render();return;
 }
 if(action==='copy'){
  try{await navigator.clipboard.writeText(btn.dataset.copy||location.href);btn.innerHTML=`${icon('check')}Copiado!`;setTimeout(()=>{if(btn.isConnected)btn.innerHTML=`${icon('link')}Copiar link`},1600)}catch{btn.textContent='Não foi possível copiar'}return;
 }
 if(action==='section'){e.preventDefault();const target=document.getElementById(btn.dataset.section);target?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(action==='retry'){hydrateArticle(btn.dataset.slug,state.routeKey);return;}
});
document.addEventListener('input',e=>{
 if(e.target.id==='search-input'){
  state.searchText=e.target.value;state.searchRemote=[];updateSearchResults();clearTimeout(searchTimer);searchTimer=setTimeout(()=>querySearch(state.searchText.trim()),350);
 }
 if(e.target.id==='category-filter'){state.categoryFilter=e.target.value;const route=currentRoute();if(route.type==='category'){
  const cat=findCategory(route.key),q=fold(state.categoryFilter),groups=topicGroups(cat).map(g=>({...g,items:g.items.filter(it=>fold(it.label+' '+it.slug+' '+it.note).includes(q))})).filter(g=>g.items.length);
  document.querySelector('#category-results').innerHTML=groups.length?groups.map(g=>`<div class="topic-group"><div class="topic-group-title"><h3>${safe(g.name)}</h3><span>${g.items.length} ARTIGOS</span></div>${g.items.map(topicRow).join('')}</div>`).join(''):'<div class="no-results">Nenhum artigo corresponde à sua pesquisa nesta categoria.</div>';
 }}
 if(e.target.id==='library-filter'){state.libraryFilter=e.target.value;const route=currentRoute();const slot=document.querySelector('#page-slot');const point=window.scrollY;slot.innerHTML=renderLibrary(route.type==='favorites');window.scrollTo({top:point,behavior:'instant'});document.querySelector('#library-filter')?.focus();document.querySelector('#library-filter')?.setSelectionRange(state.libraryFilter.length,state.libraryFilter.length);}
});
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();return;}
 if(e.key==='Escape'){if(state.searchOpen){closeSearch();return}if(state.mobileOpen){state.mobileOpen=false;render();return}}
 if(e.key==='Enter'&&document.activeElement?.id==='search-input'){const first=document.querySelector('.search-result');if(first){e.preventDefault();navigate(first.pathname)}}
 if(e.key==='/'&&!state.searchOpen&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();openSearch()}
});
window.addEventListener('popstate',()=>{state.mobileOpen=false;closeSearch();render()});
window.addEventListener('scroll',updateBackToTop,{passive:true});
setTheme(themePref());render();loadIndex().then(()=>{const r=currentRoute();if(r.type!=='article')render();});
