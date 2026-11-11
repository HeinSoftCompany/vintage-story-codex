// Vercel Function /api/wiki. Proxifica apenas operações públicas de leitura da MediaWiki.
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const incoming=new URL(req.url,'https://codex.local');
 const params=incoming.searchParams;
 const action=params.get('action');
 if(!['query','parse'].includes(action))return res.status(400).json({error:'Only read operations supported'});
 const allowed=new Set(['action','format','formatversion','page','redirects','prop','disableeditsection','list','srsearch','srlimit','srnamespace','srprop','utf8','aplimit','apcontinue','apnamespace','meta','siprop','titles']);
 const outgoing=new URLSearchParams();
 for(const [k,v] of params){if(allowed.has(k))outgoing.set(k,v);}
 outgoing.set('format','json');
 outgoing.set('formatversion','2');
 const dest='https://wiki.vintagestory.at/api.php?'+outgoing.toString();
 try {
  const response=await fetch(dest,{headers:{'User-Agent':'VintageStoryCodexBrasil/0.1 (community study; refer to https://wiki.vintagestory.at)','Accept':'application/json'},signal:AbortSignal.timeout(13500)});
  const body=await response.text();
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
  return res.status(response.status).send(body);
 } catch(err) {return res.status(502).json({error:'Wiki connection error',detail:err.message});}
}
