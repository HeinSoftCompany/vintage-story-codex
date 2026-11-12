// Locale configuration is shared by routing, the interface and the wiki client.
// Add a locale here and a complete column to messages.js to extend the UI.
export const locales = [
  { code:'pt-br', lang:'pt-BR', name:'Português (Brasil)', short:'PT', wiki:'pt-br' },
  { code:'en', lang:'en', name:'English', short:'EN', wiki:'' },
  { code:'es', lang:'es', name:'Español', short:'ES', wiki:'es' },
  { code:'de', lang:'de', name:'Deutsch', short:'DE', wiki:'de' },
  { code:'fr', lang:'fr', name:'Français', short:'FR', wiki:'fr' },
  { code:'ja', lang:'ja', name:'日本語', short:'JA', wiki:'ja' },
];
export const isLocale = code => locales.some(l=>l.code===code);
export function routeLocale(pathname){return pathname.split('/')[1]?.toLowerCase();}
export function preferredLocale(){
  try { const saved=localStorage.getItem('vsc-locale'); if(isLocale(saved))return saved; } catch {}
  return 'pt-br';
}
let activeLocale = typeof location==='undefined'?'pt-br':(isLocale(routeLocale(location.pathname))?routeLocale(location.pathname):preferredLocale());
export const getLocale = () => activeLocale;
export const localeInfo = (code=activeLocale) => locales.find(l=>l.code===code)||locales[0];
export function setLocale(code){
  if(!isLocale(code))return;
  activeLocale=code;
  try{localStorage.setItem('vsc-locale',code)}catch{}
  if(typeof document!=='undefined')document.documentElement.lang=localeInfo().lang;
}
export function unlocalizedPath(pathname){
  const parts=pathname.split('/');
  if(isLocale(parts[1]?.toLowerCase()))return '/'+parts.slice(2).join('/');
  return pathname;
}
export function localizedPath(pathname='/',code=activeLocale){
  if(!pathname.startsWith('/')||pathname.startsWith('//'))return pathname;
  const path=unlocalizedPath(pathname);
  return `/${code}${path==='/'?'/':path}`;
}
// Language suffixes occur on canonical MediaWiki titles, never translated slugs.
const wikiSuffix=new RegExp(`/(${[...new Set([...locales.map(l=>l.code),'ru','zh','zh-cn','zh-tw','ko','pt','it','nl','pl','tr','uk','sv','cs','hu','fi','ar','da','no','he','id','th','vi','ro','sk','el','bg','sr','hr'])].join('|')})$`,'i');
export const cleanWikiTitle = title => String(title||'').replace(wikiSuffix,'').replace(/_/g,' ').trim();
export const wikiTitle = (title,code=activeLocale) => {
  const base=cleanWikiTitle(title), suffix=localeInfo(code).wiki;
  return suffix?`${base}/${suffix}`:base;
};
export function wikiLanguage(title){
  return String(title||'').match(wikiSuffix)?.[1]?.toLowerCase()||'en';
}
