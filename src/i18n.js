import { getLocale, locales, localizedPath } from './locale.js';
import { messageRows } from './messages.js';

export const messages = Object.fromEntries(locales.map(l=>[l.code,{}]));
for(const line of messageRows.trim().split('\n')){
  const cells=line.split('|');
  if(cells.length!==locales.length)throw new Error(`Invalid translation row: ${cells[0]}`);
  locales.forEach((l,i)=>{messages[l.code][cells[0]]=cells[i]});
}

export function t(value,code=getLocale()){
  const text=String(value??''), dictionary=messages[code]||messages['pt-br'];
  if(Object.hasOwn(dictionary,text))return dictionary[text];
  const trimmed=text.trim();
  if(!trimmed)return text;
  if(Object.hasOwn(dictionary,trimmed))return text.replace(trimmed,dictionary[trimmed]);
  // Templates keep counts and names separate; numeric labels share one message.
  const count=trimmed.match(/^Carregar mais (\d+) artigos$/);
  if(count)return text.replace(trimmed,dictionary['Carregar mais {n} artigos'].replace('{n}',count[1]));
  if(!['·','/','•'].includes(trimmed)&&(text.includes(' · ')||text.includes(' / ')||text.includes(' • '))){
    return text.split(/( · | \/ | • )/).map(part=>t(part,code)).join('');
  }
  const numbered=trimmed.match(/^(\d+\s+)(.+)$/);
  if(numbered)return text.replace(trimmed,numbered[1]+t(numbered[2],code));
  const punctuation=trimmed.match(/^([;·•]\s*|)(.*?)([.!:]|)$/s);
  if(punctuation&&(punctuation[1]||punctuation[3])){
    const middle=punctuation[2];
    if(Object.hasOwn(dictionary,middle))return text.replace(trimmed,punctuation[1]+dictionary[middle]+punctuation[3]);
  }
  return text;
}

// Localize only freshly rendered Codex fragments. Wiki HTML never passes here.
// Text nodes and accessible attributes are translated without changing markup,
// article slugs, user input, code, or the provenance of imported content.
export function localizeHtml(html){
  const template=document.createElement('template');
  template.innerHTML=html;
  const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    if(!node.parentElement?.closest('[data-source-text],script,style,option'))node.textContent=t(node.textContent);
  }
  template.content.querySelectorAll('*').forEach(el=>{
    if(!el.closest('[data-source-text]'))for(const attr of ['aria-label','title','placeholder']){
      if(el.hasAttribute(attr))el.setAttribute(attr,t(el.getAttribute(attr)));
    }
    if(el.matches('a[data-route]'))el.setAttribute('href',localizedPath(el.getAttribute('href')));
  });
  return template.innerHTML;
}
