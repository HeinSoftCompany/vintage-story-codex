import { categories, featured, progress, allCurated, uniqueCurated, findCategory, findArticle, formatTitle } from './data.js';
import { requestWiki, loadArticle, remoteSearch, getIndex, loadIndex, originalUrl } from './api.js';
import { icon, brandIcon } from './icons.js';
import { locales, getLocale, setLocale, localeInfo, routeLocale, isLocale, unlocalizedPath, localizedPath, cleanWikiTitle, wikiTitle } from './locale.js';
import { t, localizeHtml } from './i18n.js';

const app = document.querySelector('#app');
const state = { searchOpen: false, searchText: '', searchRemote: [], searchBusy: false, searchError:false, mobileOpen:false, libraryVisible:40, categoryFilter:'', libraryFilter:'', routeKey:0, dayNightOpen:false, motionStep:0, walkStage:0 };
const safe = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const urlArticle = slug => '/artigo/' + encodeURIComponent(slug);
const urlCategory = id => '/categoria/' + encodeURIComponent(id);
const keyForSlug = slug => cleanWikiTitle(slug).toLowerCase();
const fold = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const currentRoute = () => {
  const p = unlocalizedPath(location.pathname).replace(/\/$/,'')||'/';
  if(p==='/explorar') return {type:'explore'};
  if(p.startsWith('/categoria/')) return {type:'category',key:decodeURIComponent(p.slice('/categoria/'.length))};
  if(p.startsWith('/artigo/')) return {type:'article',key:decodeURIComponent(p.slice('/artigo/'.length))};
  if(p==='/biblioteca') return {type:'library'};
  if(p==='/favoritos') return {type:'favorites'};
  return {type:p==='/'?'home':'notfound'};
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
function footer(){return `<footer class="footer"><div>Uma iniciativa independente da comunidade. Artigos obtidos da <a href="${safe(originalUrl(wikiTitle("Main Page")))}" target="_blank" rel="noopener noreferrer">Vintage Story Wiki</a>; créditos, histórico de edições e licenças disponíveis na fonte.<br>Codex Brasil não é afiliado à Anego Studios ou à administração da wiki.</div><div class="footer-right">FEITO PARA EXPLORAR ✧ VINTAGE STORY</div></footer>`}
function shell(route){
 const activeCategory=route.type==='category'?route.key:route.type==='article'?lookupArticle(route.key)?.category:null;
 const active = route.type;
 return `<header class="topbar">
  <button class="header-circle hamburger" data-action="mobile" aria-label="Abrir menu" title="Menu">${icon('menu')}</button>
  <a href="/" data-route class="brand" aria-label="Página inicial Codex Brasil"><span class="brand-mark">${brandIcon}</span><span class="brand-words"><strong>VINTAGE STORY</strong><span>C O D E X</span></span></a>
  <nav class="topnav" aria-label="Navegação principal">
    ${navLink('Início','/',active==='home')}${navLink('Sobrevivência',urlCategory('iniciantes'),activeCategory==='iniciantes')}${navLink('Fabricação',urlCategory('fabricacao'),activeCategory==='fabricacao')}${navLink('Exploração',urlCategory('recursos'),activeCategory==='recursos')}${navLink('Mundo',urlCategory('mundo'),activeCategory==='mundo')}${navLink('Modding',urlCategory('modding'),activeCategory==='modding')}${navLink('Biblioteca','/biblioteca',active==='library')}
  </nav>
  <div class="header-actions"><label class="locale-picker">${icon('globe')}<span class="sr-only">Idioma do site</span><select id="locale-select" aria-label="Idioma do site">${locales.map(l=>`<option value="${l.code}" lang="${l.lang}"${getLocale()===l.code?' selected':''}>${l.name}</option>`).join('')}</select></label><button class="search-trigger" data-action="search" aria-label="Buscar artigos">${icon('search')}<span>Buscar no Codex...</span><kbd class="kbd">⌘ K</kbd></button><a href="/favoritos" data-route class="header-circle" title="Artigos salvos" aria-label="Favoritos">${icon('bookmark')}</a><button class="vs-glass-switch" data-action="theme" role="switch" aria-checked="${themePref()==='light'}" title="Alternar dia e noite" aria-label="Alternar tema claro e escuro"><span class="vs-glass-track" aria-hidden="true"><i class="vs-glass-ticks"></i><i class="vs-moon">☾</i><i class="vs-sun">☀</i><i class="vs-glass-lens"></i></span></button></div>
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
 </div><div class="sidebar-bottom"><div class="side-callout"><strong>Conhecimento é<br>sobrevivência.</strong><p>Um novo jeito de explorar a enciclopédia criada por jogadores.</p><a href="${safe(originalUrl(wikiTitle("Help:How to help")))}" target="_blank" rel="noopener">Contribua com a wiki ${icon('arrow-up-right')}</a></div></div><div class="side-footer">FONTE: WIKI OFICIAL · ${localeInfo().code.toUpperCase()}<br>PROJETO INDEPENDENTE DA COMUNIDADE</div></aside>
 <main class="main"><div class="page" id="page-slot"></div></main>
 <nav class="mobile-bottom-nav" aria-label="Navegação mobile">
 ${[['Início','/','home','home'],['Explorar','/explorar','compass','explore'],['Salvos','/favoritos','bookmark','favorites'],['Biblioteca','/biblioteca','book','library']].map(([label,href,glyph,type])=>{
 const selected=active===type||(type==='explore'&&active==='category');
 return `<a data-route href="${href}"${selected?' class="active" aria-current="page"':''}>${icon(glyph)}<span>${label}</span></a>`;
 }).join('')}
 </nav>
 <button class="back-top" data-action="backtop" aria-label="Voltar ao topo">${icon('arrow-up')}</button>`;
}
const wrap = html => localizeHtml(`${html}${footer()}`);

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
// Experiências originais inspiradas por princípios de motion design: sem templates de terceiros.
const survivalJourney = [
 {title:'Comece observando',body:'Explore o terreno, reconheça materiais próximos e estabeleça prioridades antes de escurecer.',symbol:'◇',label:'INÍCIO'},
 {title:'Prepare o essencial',body:'Trabalhe com recursos acessíveis e organize ferramentas, alimento e um lugar protegido.',symbol:'⚒',label:'DESENVOLVIMENTO'},
 {title:'Planeje a sobrevivência',body:'Proteja-se durante a noite e prepare sua próxima exploração. O guia da wiki aprofunda cada etapa.',symbol:'✧',label:'CONTINUAÇÃO'}
];
function renderMotionExperiences(){
 return `<section class="section vs-motion-section" aria-labelledby="vs-flip-heading"><div class="section-heading"><div class="section-title-wrap"><div class="eyebrow">DUAS FACES DO MESMO MUNDO</div><h2 class="section-title" id="vs-flip-heading">Do amanhecer à escuridão.</h2><p class="section-description">Abra a paisagem para descobrir como o mundo muda quando a noite chega.</p></div></div>
 <div class="vs-fold-wrap"><button class="vs-fold ${state.dayNightOpen?'is-open':''}" id="vs-fold" type="button" data-action="daynight" aria-pressed="${state.dayNightOpen}" aria-label="${state.dayNightOpen?'Fechar o painel da noite':'Abrir o painel da noite'}"><span class="vs-fold-interior"><span class="vs-fold-night-sky"></span><span class="vs-night-topline">ARQUIVO / SOBREVIVÊNCIA</span><span class="vs-night-title">Quando a noite cai.</span><span class="vs-night-stats"><span class="vs-night-stat"><b>01</b><small>OBSERVAR</small></span><span class="vs-night-stat"><b>02</b><small>PREPARAR</small></span><span class="vs-night-stat"><b>03</b><small>PROTEGER</small></span></span></span><span class="vs-fold-cover"><span class="vs-fold-face"><span class="vs-cover-tag">REGISTRO / DIA 01</span><span class="vs-cover-title">A luz revela.<br><em>A noite ensina.</em></span><span class="vs-cover-hint">TOQUE PARA ${state.dayNightOpen?'FECHAR':'ABRIR'} ↗</span></span></span></button><div class="vs-fold-foot"><span>✧ UMA PAISAGEM, DOIS MOMENTOS</span><span>INTERATIVO / 3D</span></div></div></section>
 <section class="section vs-motion-section" aria-labelledby="vs-journey-heading"><div class="section-heading"><div class="section-title-wrap"><div class="eyebrow">TRILHA INTERATIVA / GUIA INICIAL</div><h2 class="section-title" id="vs-journey-heading">Cada conquista tem etapas.</h2><p class="section-description">Navegue pelo início, desenvolvimento e continuação do seu primeiro dia.</p></div><a class="section-action" data-route href="${urlArticle('Survival Guide - Your first day')}">Ler guia completo ${icon('arrow-right')}</a></div>
 <div class="vs-journey"><div class="vs-journey-header"><span>SEU PRIMEIRO DIA</span><span id="vs-stage-count" aria-live="polite">0${state.motionStep+1} / 03</span></div><div class="vs-journey-track" role="group" aria-label="Etapas do primeiro dia">${survivalJourney.map((v,i)=>`<button class="vs-journey-dot ${i===state.motionStep?'is-active':''}" type="button" data-action="journey-stage" data-step="${i}" aria-pressed="${i===state.motionStep}"><span class="vs-dot-symbol">${v.symbol}</span><small>${v.label}</small></button>`).join('')}</div><div class="vs-journey-content"><div class="vs-journey-art" id="vs-journey-art" data-step="${state.motionStep}" aria-hidden="true"><span class="vs-scene-orbit"></span><span id="vs-scene-glyph">${survivalJourney[state.motionStep].symbol}</span></div><div class="vs-journey-copy" aria-live="polite"><span class="vs-journey-kicker" id="vs-journey-kicker">${survivalJourney[state.motionStep].label}</span><h3 id="vs-journey-title">${survivalJourney[state.motionStep].title}</h3><p id="vs-journey-body">${survivalJourney[state.motionStep].body}</p><div class="vs-journey-buttons"><button type="button" data-action="journey-prev" aria-label="Etapa anterior">← ANTERIOR</button><button type="button" data-action="journey-next">PRÓXIMA ETAPA →</button></div></div></div></div></section>`;
}
function setSurvivalStep(index){
 state.motionStep=(index+survivalJourney.length)%survivalJourney.length;
 const stage=survivalJourney[state.motionStep];
 document.querySelector('#vs-journey-title')?.replaceChildren(document.createTextNode(t(stage.title)));
 document.querySelector('#vs-journey-body')?.replaceChildren(document.createTextNode(t(stage.body)));
 document.querySelector('#vs-journey-kicker')?.replaceChildren(document.createTextNode(t(stage.label)));
 document.querySelector('#vs-stage-count')?.replaceChildren(document.createTextNode(`0${state.motionStep+1} / 03`));
 document.querySelector('#vs-scene-glyph')?.replaceChildren(document.createTextNode(stage.symbol));
 const art=document.querySelector('#vs-journey-art');if(art)art.dataset.step=String(state.motionStep);
 document.querySelectorAll('.vs-journey-dot').forEach((btn,i)=>{btn.classList.toggle('is-active',i===state.motionStep);btn.setAttribute('aria-pressed',String(i===state.motionStep))});
}
// A jornada de leitura usa APENAS títulos reais extraídos do artigo da wiki.
function buildArticleWalkthrough(headings){
 const node=document.querySelector('#vs-article-walkthrough');if(!node)return;
 const h2=headings.filter(el=>el.tagName==='H2');if(h2.length<3){node.remove();return;}
 const chunks=[[],[],[]];h2.forEach((el,i)=>{chunks[Math.min(2,Math.floor(i*3/h2.length))].push(el)});
 const names=['INÍCIO','DESENVOLVIMENTO','PARTE FINAL'];
 node.hidden=false;state.walkStage=0;node.innerHTML=localizeHtml(`<div class="vs-walktop"><div><span class="eyebrow">SEQUÊNCIA DE LEITURA</span><h2>Explore o artigo por etapas.</h2><p>Esta trilha organiza as seções reais da wiki. Não substitui as instruções do artigo.</p></div><span>01 — 03</span></div><div class="vs-walk-buttons">${names.map((name,i)=>`<button type="button" data-action="walk-stage" data-step="${i}" aria-pressed="${i===0}" class="${i===0?'is-current':''}"><span>0${i+1}</span>${name}</button>`).join('')}</div>${chunks.map((group,i)=>`<div class="vs-walk-group ${i===0?'is-current':''}" data-walk-group="${i}">${group.map(h=>`<button type="button" data-source-text data-action="jump-wiki" data-target="${safe(h.id)}">${icon('arrow-right')} ${safe(h.textContent.trim())}</button>`).join('')}</div>`).join('')}`);
}
let revealObserver;
function attachReveal(){
 revealObserver?.disconnect();
 if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 revealObserver=new IntersectionObserver((entries,observer)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('vs-in-view');observer.unobserve(e.target)}})},{threshold:.13});
 document.querySelectorAll('.vs-motion-section, .progress-panel, .categories-grid').forEach(el=>{el.classList.add('vs-reveal-ready');revealObserver.observe(el)});
}
function renderHome(){
 const total = uniqueCurated.length;
 return wrap(`<div class="intro-strip"><span class="home-crumb">ARQUIVO / <b>PÁGINA INICIAL</b></span><span class="live"><i class="pulse"></i> CONHECIMENTO EM CONSTANTE EVOLUÇÃO</span></div>
 <section class="hero" aria-label="Bem-vindo ao Codex"><div class="hero-photo"></div><div class="vs-temporal-wisp" aria-hidden="true"><span class="vs-wisp-ring"></span><span class="vs-wisp-core">✧</span><span class="vs-wisp-spark">✧</span></div><div class="hero-corner">✦ EDIÇÃO COMUNITÁRIA</div><div class="hero-content">
  <div class="hero-kicker"><span class="diamond">◇</span> A ENCICLOPÉDIA DO SOBREVIVENTE</div>
  <h1>O mundo é antigo.<br><em>O conhecimento</em><br>é seu.</h1>
  <p>Dos primeiros passos à última era dos metais. Tudo o que você precisa para dominar Vintage Story, organizado para a sua jornada.</p>
  <div class="buttons"><a data-route class="btn btn-primary" href="${urlCategory('iniciantes')}">Começar a explorar ${icon('arrow-right')}</a><a data-route class="btn btn-outline" href="/biblioteca">Abrir biblioteca ${icon('book')}</a></div>
 </div><div class="hero-coordinates">✧ DOCUMENTAÇÃO • ${localeInfo().code.toUpperCase()}</div></section>
 <div class="underhero"><div class="meta-cluster"><div class="meta-item">${icon('layers')}<span><b>08</b> categorias</span></div><div class="meta-item">${icon('book')}<span><b>${total}</b> guias em destaque</span></div><div class="meta-item">${icon('globe')}<span><span>Leitura no idioma escolhido quando disponível</span></span></div></div><a href="${safe(originalUrl(wikiTitle("Main Page")))}" target="_blank" rel="noopener">Fonte: Vintage Story Wiki ${icon('external')}</a></div>
 <section class="section" id="categorias"><div class="section-heading"><div class="section-title-wrap"><div class="eyebrow">EXPLORE SEU CAMINHO</div><h2 class="section-title">Um universo de possibilidades.</h2><p class="section-description">Encontre exatamente o que procura, sem se perder no caminho.</p></div><a class="section-action" data-route href="/biblioteca">Ver todos os artigos ${icon('arrow-right')}</a></div><div class="categories-grid">${categories.map(categoryCard).join('')}</div></section>
 <section class="section"><div class="section-heading"><div class="section-title-wrap"><div class="eyebrow">SELEÇÃO DO CODEX</div><h2 class="section-title">Comece por estas histórias.</h2><p class="section-description">Guias essenciais para transformar curiosidade em domínio.</p></div></div><div class="guide-grid">${featured.map(guideCard).join('')}</div></section>
 ${renderMotionExperiences()}
 <section class="section"><div class="section-heading"><div class="section-title-wrap"><div class="eyebrow">PROGRESSÃO</div><h2 class="section-title">Construa sua própria era.</h2><p class="section-description">Cada conquista abre caminho para novas descobertas.</p></div></div>
 <div class="progress-panel"><div class="progress-head"><strong>Da pedra ao aço.</strong><span>UMA JORNADA EM QUATRO ETAPAS</span></div><div class="progress-steps">${progress.map((p,i)=>`<a data-route href="${urlArticle(p.slug)}" class="progress-step"><div class="step-ico">${i===0?icon('check'):icon('chevron-right')}</div><h4>${safe(p.title)}</h4><p>${safe(p.subtitle)}</p></a>`).join('')}</div></div></section>
 <section class="bottom-banner"><div><h2>O conhecimento cresce<br>quando é compartilhado.</h2><p>Ajude a melhorar os artigos e traduções diretamente na wiki original.</p></div><a class="btn btn-primary" href="${safe(originalUrl(wikiTitle("Help:How to help")))}" target="_blank" rel="noopener">Como contribuir ${icon('arrow-up-right')}</a></section>`);
}
function breadcrumbs(crumbs){return `<nav class="breadcrumbs" aria-label="Caminho de navegação"><a data-route href="/">Início</a>${crumbs.map(c=>`${icon('chevron-right')}${c.href?`<a data-route href="${safe(c.href)}">${safe(c.label)}</a>`:`<strong>${safe(c.label)}</strong>`}`).join('')}</nav>`}
function topicRow(it){return `<a data-route href="${urlArticle(it.slug)}" class="topic-row"><span class="topic-marker">${icon('book')}</span><span class="topic-info"><strong>${safe(it.label)}</strong>${it.note?`<small>${safe(it.note)}</small>`:''}</span><span class="topic-end">${icon('chevron-right')}</span></a>`}
function renderCategory(id){
 const cat=findCategory(id);
 if(!cat) return renderNotFound();
 const groups=topicGroups(cat);
 const all=groups.flatMap(g=>g.items);
 const q=fold(state.categoryFilter);
 const sections=groups.map(group=>({...group,items:group.items.filter(it=>fold(t(it.label)+' '+t(it.note)+' '+it.slug).includes(q))})).filter(group=>group.items.length);
 return wrap(`${breadcrumbs([{label:cat.name}])}<section class="category-hero" style="--cat-color:${cat.color}"><div class="eyebrow">${safe(cat.kicker)} · BIBLIOTECA</div><h1>${safe(cat.name)}.</h1><p>${safe(t(cat.description))} ${safe(t('Acesse os artigos originais e aprofunde-se em cada tema.'))}</p><div class="category-count">${String(all.length).padStart(2,'0')} GUIAS SELECIONADOS</div></section>
 <div class="directory-header"><div><h2>Índice de conteúdos</h2><p>Explore os tópicos desta categoria</p></div><input id="category-filter" class="mini-filter" type="search" placeholder="Filtrar assuntos..." value="${safe(state.categoryFilter)}" aria-label="Filtrar artigos da categoria"></div>
 <div id="category-results">${sections.length?sections.map(group=>`<div class="topic-group"><div class="topic-group-title"><h3>${safe(group.name)}</h3><span>${group.items.length} ${group.items.length===1?'ARTIGO':'ARTIGOS'}</span></div>${group.items.map(topicRow).join('')}</div>`).join(''):`<div class="no-results">Nenhum artigo corresponde à sua pesquisa nesta categoria.</div>`}</div>
 <div class="cat-more"><span>Quer descobrir mais? A biblioteca também pesquisa artigos que não aparecem nessa curadoria.</span><button class="section-action" data-action="search">Pesquisar na wiki ${icon('arrow-right')}</button></div>`);
}
function combinedIndex(){
 const collected = getIndex().map(p => ({label:p.label||p.title?.replace(/\/pt-br$/i,'')||p.slug,slug:p.slug||(p.title||'').replace(/\/pt-br$/i,''),categoryName:p.categoryName||'Artigo da wiki',cacheUrl:p.cacheUrl})).filter(p=>p.slug);
 return [...new Map([...collected,...uniqueCurated].map(p=>[keyForSlug(p.slug),p])).values()].sort((a,b)=>t(a.label).localeCompare(t(b.label),localeInfo().lang));
}
function renderLibrary(favorites=false){
 let entries = favorites ? getSaved().map(slug=>findArticle(slug)||getIndex().find(p=>keyForSlug(p.slug||p.title)===keyForSlug(slug))||{slug,label:formatTitle(slug),categoryName:'Salvo'}) : combinedIndex();
 entries=entries.map(p=>({...p,slug:p.slug||(p.title||'').replace(/\/pt-br$/i,''),label:p.label||(p.title||p.slug),categoryName:p.categoryName||'Wiki PT-BR'}));
 const total=entries.length;
 const q=fold(state.libraryFilter);
 entries=entries.filter(p=>fold(t(p.label)+' '+p.slug+' '+t(p.categoryName)).includes(q));
 const shown=entries.slice(0,state.libraryVisible);
 return wrap(`${breadcrumbs([{label:favorites?'Artigos salvos':'Biblioteca'}])}<section class="category-hero" style="--cat-color:#c3b186"><div class="eyebrow">ARQUIVO / ${favorites?'SUA COLEÇÃO':'ACERVO COMPLETO'}</div><h1>${favorites?'Suas descobertas.':'Toda a biblioteca.'}</h1><p>${favorites?'Artigos que você marcou para consultar depois, guardados neste navegador.':'Explore a curadoria e o índice da wiki. Os artigos abrem no idioma escolhido quando houver tradução.'}</p><div class="category-count">${total} ARTIGOS NO ÍNDICE</div></section>
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
 <div class="article-meta"><span>${icon('book')} Conteúdo da Vintage Story Wiki</span><span>${icon('globe')} Leitura no idioma escolhido quando disponível</span></div>
 <div class="article-toolbar"><button class="tool-chip ${isSaved(slug)?'saved':''}" data-action="bookmark" data-slug="${safe(slug)}">${icon(isSaved(slug)?'bookmark-check':'bookmark')}${isSaved(slug)?'Salvo':'Salvar artigo'}</button><button class="tool-chip" data-action="copy" data-copy="${safe(location.href)}">${icon('link')}Copiar link</button><a id="article-source-link" class="tool-chip" href="${safe(originalUrl(wikiTitle(slug)))}" target="_blank" rel="noopener noreferrer">${icon('external')}Ver na wiki</a></div></div>
 <div id="article-language" class="article-language" role="status" hidden></div>
 <div id="vs-article-walkthrough" class="vs-walkthrough" hidden></div><div id="article-live" class="article-content" aria-live="polite"><div class="loading-block xl"></div><div class="loading-block"></div><div class="loading-block"></div><div class="loading-block med"></div><div class="loading-block" style="margin-top:40px"></div><div class="loading-block short"></div><div class="loading-block"></div></div>
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
    if(title.startsWith('Special:MyLanguage/'))title=title.slice('Special:MyLanguage/'.length);
    if(title && !/^(File|Special|User|Template|Media|Talk|Help:|Vintage Story Wiki:)/i.test(title)){
     a.setAttribute('href',localizedPath(urlArticle(cleanWikiTitle(title)))+u.hash);a.dataset.route='';
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
  container.lang=localeInfo(result.language).lang;
  const notice=document.querySelector('#article-language');
  notice.hidden=false;
  notice.classList.toggle('is-fallback',result.fallback);
  notice.textContent=t(result.fallback?'Tradução indisponível neste idioma. Exibindo o artigo original em inglês.':result.language==='en'?'Artigo original em inglês.':'Tradução da wiki disponível no idioma escolhido.');
  document.querySelector('#article-source-link').href=originalUrl(result.sourceTitle);
  const title=result.displayTitle?new DOMParser().parseFromString(result.displayTitle,'text/html').body.textContent:result.title;
  document.querySelector('.article-head h1').textContent=title;
  const headings=[...container.querySelectorAll('h2,h3')].filter(h=>h.textContent?.trim());
  const usedIds=new Set();
  headings.forEach((h,i)=>{let id=h.id||h.querySelector('[id]')?.id||`secao-${i+1}`;if(usedIds.has(id))id+=`-${i}`;usedIds.add(id);h.id=id;});
  buildArticleWalkthrough(headings);
  toc.innerHTML=localizeHtml(`<h3>NESTE ARTIGO</h3>${headings.length?headings.slice(0,45).map(h=>`<a data-source-text lang="${safe(result.language)}" class="${h.tagName==='H3'?'sub':''}" data-action="section" href="#${encodeURIComponent(h.id)}" data-section="${safe(h.id)}">${safe(h.textContent.trim())}</a>`).join(''):'<div class="article-status">Artigo sem seções</div>'}<div class="toc-source"><a href="${safe(originalUrl(result.sourceTitle))}" target="_blank" rel="noopener">Ver fonte original ${icon('external')}</a></div>`);
  footnote.innerHTML=localizeHtml(`<div class="article-source-note">${icon('info')} Este artigo é exibido a partir da <a href="${safe(originalUrl(result.sourceTitle))}" target="_blank" rel="noopener">Vintage Story Wiki</a>. <span>Créditos, histórico de autores, imagens e licenças estão disponíveis na página de origem. Codex é uma interface comunitária independente.</span></div>`);
  document.title=`${title} — Vintage Story Codex`;
  if(location.hash)document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
 }catch(e){
  if(state.routeKey!==routeKey)return;
  container.removeAttribute('lang');
  container.innerHTML=localizeHtml(`<div class="article-empty">${icon('alert')}<h2>Não foi possível carregar o artigo.</h2><p>O servidor da wiki está indisponível, a API não permitiu o acesso ou o título desta página mudou. Você ainda pode ler o conteúdo no site original.</p><div class="buttons" style="justify-content:center"><button data-action="retry" data-slug="${safe(slug)}" class="btn btn-outline">Tentar novamente</button><a class="btn btn-primary" href="${safe(originalUrl(wikiTitle(slug)))}" target="_blank" rel="noopener">Abrir wiki ${icon('external')}</a></div></div>`);
  toc.innerHTML=localizeHtml('<h3>NESTE ARTIGO</h3><div class="article-status">Não foi possível consultar as seções.</div>');
  console.warn('Falha ao carregar artigo',e);
 }
}

function render(){
 setLocale(routeLocale(location.pathname));
 const r=currentRoute();state.routeKey++;
 app.innerHTML=localizeHtml(shell(r));
 const slot=document.querySelector('#page-slot');
 slot.innerHTML=r.type==='explore'?wrap(`${breadcrumbs([{label:'Explorar'}])}<section class="section"><div class="section-heading"><div class="section-title-wrap"><div class="eyebrow">EXPLORE SEU CAMINHO</div><h1 class="section-title">Explorar categorias</h1><p class="section-description">Encontre guias e artigos para cada etapa da sua jornada.</p></div></div><div class="categories-grid">${categories.map(categoryCard).join('')}</div></section>`):r.type==='home'?renderHome():r.type==='category'?renderCategory(r.key):r.type==='article'?renderArticleShell(r.key):r.type==='library'?renderLibrary(false):r.type==='favorites'?renderLibrary(true):renderNotFound();
 if(r.type==='article')hydrateArticle(r.key,state.routeKey);
 const title = r.type==='explore'?'Explorar':r.type==='category'?findCategory(r.key)?.name:r.type==='article'?lookupArticle(r.key)?.label||formatTitle(r.key):r.type==='library'?'Biblioteca':r.type==='favorites'?'Salvos':r.type==='notfound'?'Página não encontrada':'Início';
 document.title=`${t(title||'Codex')} — Vintage Story Codex`;
 document.querySelector('meta[name="description"]').content=t('Vintage Story Codex: guias, mecânicas, fabricação, mundo, servidores e modding para a comunidade internacional.');
 updateBackToTop();
 attachReveal();
 if(state.searchOpen) renderSearch();
}
function navigate(to){
 if(!to)return;
 if(!isLocale(routeLocale(to)))to=localizedPath(to);
 if(location.pathname!==to)history.pushState(null,'',to);
 state.mobileOpen=false;state.categoryFilter='';state.libraryFilter='';state.libraryVisible=40;
 closeSearch();state.searchRemote=[];clearTimeout(searchTimer);render();window.scrollTo({top:0,behavior:'instant'});
}

function searchHits(){
 const q=fold(state.searchText.trim());
 if(!q)return uniqueCurated.slice(0,6);
 const local=[...uniqueCurated,...getIndex().map(p=>({label:p.label||p.title,slug:p.slug||cleanWikiTitle(p.title),categoryName:p.categoryName||'Artigo da wiki'}))].filter(p=>p.slug&&fold(t(p.label)+' '+p.slug+' '+t(p.categoryName)).includes(q));
 return [...new Map([...local,...state.searchRemote].map(p=>[keyForSlug(p.slug),p])).values()].slice(0,20);
}
function renderSearch(){
 const old=document.querySelector('#search-overlay');if(old)old.remove();
 if(!state.searchOpen)return;
 const hits=searchHits();
 const modal=document.createElement('div');modal.id='search-overlay';modal.className='search-overlay';modal.dataset.action='close-search-area';
 modal.innerHTML=localizeHtml(`<div class="search-dialog" role="dialog" aria-modal="true" aria-label="Pesquisar na biblioteca"><div class="search-form">${icon('search')}<input type="search" id="search-input" class="search-input" autocomplete="off" placeholder="O que você deseja descobrir?" value="${safe(state.searchText)}" aria-label="Termo de busca"><button class="search-close" data-action="close-search" aria-label="Fechar busca">ESC</button></div><div class="search-content" id="search-content"><div class="search-label">${state.searchText?'RESULTADOS PARA SUA BUSCA':'SUGESTÕES PARA EXPLORAR'} ${state.searchBusy?' · CONSULTANDO A WIKI…':''}</div>${hits.map(p=>`<a data-route href="${urlArticle(p.slug)}" class="search-result">${icon('book')}<div><strong>${safe(formatTitle(p.label))}</strong><small>${safe(p.categoryName||'Artigo da wiki')}</small></div>${icon('arrow-up-right')}</a>`).join('')}${hits.length===0?'<div class="no-results">Nenhum artigo encontrado. Tente outro termo ou consulte a wiki original.</div>':''}</div><div class="search-help"><span><kbd>ENTER</kbd> abrir artigo · <kbd>ESC</kbd> fechar</span><span>BUSCA WIKI + CODEX</span></div></div>`);
 document.body.append(modal);
 modal.querySelector('input').focus();
 try{modal.querySelector('input').setSelectionRange(state.searchText.length,state.searchText.length)}catch{}
}
let searchTimer=0;
function openSearch(){state.searchOpen=true;state.searchText='';state.searchRemote=[];state.searchBusy=false;state.searchError=false;renderSearch();}
function closeSearch(){clearTimeout(searchTimer);state.searchOpen=false;document.querySelector('#search-overlay')?.remove();}
async function querySearch(q){
 const locale=getLocale();
 if(q.length<2){state.searchRemote=[];state.searchBusy=false;updateSearchResults();return;}
 state.searchBusy=true;state.searchError=false;updateSearchResults();
 try{const remote=await remoteSearch(q,locale);if(state.searchOpen&&locale===getLocale()&&q===state.searchText.trim()){state.searchRemote=remote;state.searchBusy=false;updateSearchResults()}}
 catch {if(state.searchOpen&&locale===getLocale()&&q===state.searchText.trim()){state.searchBusy=false;state.searchError=true;updateSearchResults()}}
}
function updateSearchResults(){
 const c=document.querySelector('#search-content');if(!c)return;
 const hits=searchHits();
 c.innerHTML=localizeHtml(`<div class="search-label">${state.searchText?'RESULTADOS':'SUGESTÕES'}${state.searchBusy?' · PESQUISANDO NA WIKI…':''}</div>${state.searchError?'<p class="no-results" role="status">Busca indisponível. Tente novamente.</p>':''}${hits.map(p=>`<a data-route href="${urlArticle(p.slug)}" class="search-result">${icon('book')}<div><strong>${safe(formatTitle(p.label))}</strong><small>${safe(p.categoryName||'Artigo da wiki')}</small></div>${icon('arrow-up-right')}</a>`).join('')}${hits.length===0&&!state.searchBusy&&!state.searchError?'<div class="no-results">Nenhum artigo encontrado. Tente outra palavra.</div>':''}`);
}
function updateBackToTop(){document.querySelector('.back-top')?.classList.toggle('visible',scrollY>450)}

// Todas as ações são delegadas. Assim os novos artigos e resultados continuam navegáveis.
document.addEventListener('click',async e=>{
 const link=e.target.closest('a[data-route]');
 if(link){if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();navigate(link.pathname+link.search+link.hash);return;}
 const btn=e.target.closest('[data-action]');if(!btn)return;
 const action=btn.dataset.action;
 if(action==='mobile'){state.mobileOpen=!state.mobileOpen;render();return;}
 if(action==='closemobile'){state.mobileOpen=false;render();return;}
 if(action==='search'){openSearch();return;}
 if(action==='close-search'){closeSearch();return;}
 if(action==='close-search-area'&&e.target===btn){closeSearch();return;}
 if(action==='theme'){setTheme(themePref()==='light'?'dark':'light');render();return;}
 if(action==='daynight'){state.dayNightOpen=!state.dayNightOpen;const fold=document.querySelector('#vs-fold');fold?.classList.toggle('is-open',state.dayNightOpen);fold?.setAttribute('aria-pressed',String(state.dayNightOpen));fold?.setAttribute('aria-label',t(state.dayNightOpen?'Fechar o painel da noite':'Abrir o painel da noite'));const hint=fold?.querySelector('.vs-cover-hint');if(hint)hint.textContent=t(state.dayNightOpen?'TOQUE PARA FECHAR ↗':'TOQUE PARA ABRIR ↗');return;}
 if(action==='journey-stage'){setSurvivalStep(Number(btn.dataset.step)||0);return;}
 if(action==='journey-next'){setSurvivalStep(state.motionStep+1);return;}
 if(action==='journey-prev'){setSurvivalStep(state.motionStep-1);return;}
 if(action==='walk-stage'){state.walkStage=Number(btn.dataset.step)||0;document.querySelectorAll('.vs-walk-buttons button').forEach((el,i)=>{el.classList.toggle('is-current',i===state.walkStage);el.setAttribute('aria-pressed',String(i===state.walkStage))});document.querySelectorAll('.vs-walk-group').forEach((el,i)=>el.classList.toggle('is-current',i===state.walkStage));return;}
 if(action==='jump-wiki'){document.getElementById(btn.dataset.target)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}
 if(action==='backtop'){window.scrollTo({top:0,behavior:'smooth'});return;}
 if(action==='more'){state.libraryVisible+=Number(btn.dataset.amount)||40;render();return;}
 if(action==='bookmark'){
  const slug=btn.dataset.slug;let saved=getSaved();const prev=saved.some(k=>keyForSlug(k)===keyForSlug(slug));saved=prev?saved.filter(k=>keyForSlug(k)!==keyForSlug(slug)):[...saved,slug];try{localStorage.setItem('vsc-favorites',JSON.stringify(saved))}catch{}render();return;
 }
 if(action==='copy'){
  try{await navigator.clipboard.writeText(btn.dataset.copy||location.href);btn.innerHTML=localizeHtml(`${icon('check')}Copiado!`);setTimeout(()=>{if(btn.isConnected)btn.innerHTML=localizeHtml(`${icon('link')}Copiar link`)},1600)}catch{btn.textContent=t('Não foi possível copiar')}return;
 }
 if(action==='section'){e.preventDefault();const target=document.getElementById(btn.dataset.section);target?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(action==='retry'){hydrateArticle(btn.dataset.slug,state.routeKey);return;}
});
document.addEventListener('change',e=>{
 if(e.target.id!=='locale-select'||!isLocale(e.target.value))return;
 const code=e.target.value;
 setLocale(code);
 navigate(localizedPath(location.pathname,code)+location.search+location.hash);
 document.querySelector('#locale-select')?.focus();
});
document.addEventListener('input',e=>{
 if(e.target.id==='search-input'){
  state.searchText=e.target.value;state.searchRemote=[];updateSearchResults();clearTimeout(searchTimer);searchTimer=setTimeout(()=>querySearch(state.searchText.trim()),350);
 }
 if(e.target.id==='category-filter'){state.categoryFilter=e.target.value;const route=currentRoute();if(route.type==='category'){
  const cat=findCategory(route.key),q=fold(state.categoryFilter),groups=topicGroups(cat).map(g=>({...g,items:g.items.filter(it=>fold(t(it.label)+' '+it.slug+' '+t(it.note)).includes(q))})).filter(g=>g.items.length);
  document.querySelector('#category-results').innerHTML=localizeHtml(groups.length?groups.map(g=>`<div class="topic-group"><div class="topic-group-title"><h3>${safe(g.name)}</h3><span>${g.items.length} ARTIGOS</span></div>${g.items.map(topicRow).join('')}</div>`).join(''):'<div class="no-results">Nenhum artigo corresponde à sua pesquisa nesta categoria.</div>');
 }}
 if(e.target.id==='library-filter'){state.libraryFilter=e.target.value;const route=currentRoute();const slot=document.querySelector('#page-slot');const point=window.scrollY;slot.innerHTML=renderLibrary(route.type==='favorites');window.scrollTo({top:point,behavior:'instant'});document.querySelector('#library-filter')?.focus();document.querySelector('#library-filter')?.setSelectionRange(state.libraryFilter.length,state.libraryFilter.length);}
});
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();return;}
 if(e.key==='Escape'){if(state.searchOpen){closeSearch();return}if(state.mobileOpen){state.mobileOpen=false;render();return}}
 if(e.key==='Enter'&&document.activeElement?.id==='search-input'){const first=document.querySelector('.search-result');if(first){e.preventDefault();navigate(first.pathname)}}
 if(e.key==='/'&&!state.searchOpen&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();openSearch()}
});
// Ressonância temporal: segue discretamente o ponteiro sem bloquear links.
let wispFrame=0;
document.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const hero=e.target.closest('.hero'),wisp=hero?.querySelector('.vs-temporal-wisp');
 if(!wisp)return;
 const bounds=hero.getBoundingClientRect();
 const dx=Math.max(-35,Math.min(35,((e.clientX-bounds.left)/bounds.width-.5)*45));
 const dy=Math.max(-24,Math.min(24,((e.clientY-bounds.top)/bounds.height-.5)*34));
 cancelAnimationFrame(wispFrame);
 wispFrame=requestAnimationFrame(()=>{if(wisp.isConnected){wisp.style.setProperty('--wisp-x',dx+'px');wisp.style.setProperty('--wisp-y',dy+'px')}});
},{passive:true});
window.addEventListener('popstate',()=>{state.mobileOpen=false;closeSearch();render()});
window.addEventListener('scroll',updateBackToTop,{passive:true});
setLocale(getLocale());
if(!isLocale(routeLocale(location.pathname)))history.replaceState(null,'',localizedPath(location.pathname)+location.search+location.hash);
setTheme(themePref());render();loadIndex().then(()=>{const r=currentRoute();if(r.type!=='article')render();});
