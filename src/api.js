import { formatTitle } from './data.js';

const API = 'https://wiki.vintagestory.at/api.php';
const callMemo = new Map();
let indexCache = [];

function mwUrl(params){
  const q = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  return q;
}

async function requestOne(url, ms = 13000){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept:'application/json' } });
    if (!response.ok) throw new Error(`Servidor respondeu ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.info || data.error.code || 'Erro MediaWiki');
    return data;
  } finally { clearTimeout(timer); }
}

export async function requestWiki(params){
  const q = mwUrl(params);
  const key = q.toString();
  if (callMemo.has(key)) return callMemo.get(key);
  const promise = (async () => {
    try { return await requestOne(`/api/wiki?${key}`); }
    catch (proxyError) {
      try { return await requestOne(`${API}?${key}&origin=*`); }
      catch (directError) {
        throw new Error(`A wiki não respondeu. Proxy: ${proxyError.message}. Acesso direto: ${directError.message}`);
      }
    }
  })();
  callMemo.set(key, promise);
  promise.catch(() => callMemo.delete(key));
  if (callMemo.size > 120) callMemo.delete(callMemo.keys().next().value);
  return promise;
}

export function getIndex(){ return indexCache; }
export async function loadIndex(){
  try {
    const res = await fetch('/data/wiki-index.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const parsed = await res.json();
    indexCache = Array.isArray(parsed) ? parsed : (parsed.pages || []);
    return indexCache;
  } catch { return []; }
}

const cleanSlug = title => (title || '').replace(/\/pt-br$/i,'').replace(/\/en$/i,'').trim();

export async function loadArticle(slug){
  const base = cleanSlug(slug);
  const indexed = indexCache.find(p => cleanSlug(p.title || p.slug).toLowerCase() === base.toLowerCase());
  if (indexed?.cacheUrl) {
    try {
      const res = await fetch(indexed.cacheUrl);
      if (res.ok) {
        const parsed = await res.json();
        if (parsed.html) return { ...parsed, requested: base, cached: true };
      }
    } catch { /* solicita página original */ }
  }
  const choices = [base.endsWith('/pt-br') ? base : `${base}/pt-br`, base];
  let lastErr;
  for (const title of [...new Set(choices)]) {
    try {
      const data = await requestWiki({ action:'parse', page:title, redirects:'1', prop:'text|sections|displaytitle|revid', disableeditsection:'1' });
      if (data.parse?.text) {
        return { title: formatTitle(data.parse.title || title), sourceTitle: data.parse.title || title, html: data.parse.text, sections: data.parse.sections || [], revid: data.parse.revid || null, requested: base };
      }
    } catch (err) { lastErr = err; }
  }
  // Alguns títulos de links da Página Principal não correspondem à capitalização
  // usada pelo MediaWiki. Resolva apenas uma correspondência exata de busca.
  try {
    const search = await requestWiki({ action:'query', list:'search', srsearch:base.replace(/:/g,' '), srlimit:'20', srnamespace:'0|4|12|14' });
    const normalize = t => t.replace(/\/pt-br$/i,'').replace(/_/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
    const exact = (search.query?.search||[]).filter(x => normalize(x.title)===normalize(base));
    const match = exact.find(x=>x.title.endsWith('/pt-br')) || exact[0];
    if (match) {
      const data = await requestWiki({ action:'parse', page:match.title, redirects:'1', prop:'text|sections|displaytitle|revid', disableeditsection:'1' });
      if (data.parse?.text) return { title:formatTitle(data.parse.title),sourceTitle:data.parse.title,html:data.parse.text,sections:data.parse.sections||[],revid:data.parse.revid||null,requested:base };
    }
  } catch { /* use o erro da tentativa original */ }
  throw lastErr || new Error('Artigo não encontrado');
}

export async function remoteSearch(term){
  if (!term || term.trim().length < 2) return [];
  const data = await requestWiki({ action:'query', list:'search', srsearch:term.trim(), srlimit:'35', srnamespace:'0|4|12|14', srprop:'snippet', utf8:'1' });
  const hits = data.query?.search || [];
  const portuguese = hits.filter(p => p.title.endsWith('/pt-br'));
  const selected = portuguese.length >= 3 ? portuguese : [...portuguese, ...hits.filter(p => !p.title.endsWith('/pt-br'))];
  return selected.slice(0, 18).map(p => ({label: formatTitle(p.title),slug:cleanSlug(p.title),categoryName:p.title.endsWith('/pt-br')?'Wiki PT-BR':'Wiki original',remote:true}));
}

export function originalUrl(slug){
  return `https://wiki.vintagestory.at/index.php?title=${encodeURIComponent(slug.replace(/ /g, '_'))}`;
}
