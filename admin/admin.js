const $ = (id) => document.getElementById(id);
const DEFAULT_SETTINGS = '../settings.json';

async function getJson(path){ const res = await fetch(path,{cache:'no-store'}); if(!res.ok) throw new Error(path); return res.json(); }
async function getCsv(url){ const res = await fetch(url + (url.includes('?')?'&':'?') + 'adminCacheBust=' + Date.now(), {cache:'no-store'}); if(!res.ok) throw new Error('CSV failed'); return res.text(); }
function parseCsv(text){ const rows=[]; let row=[],cell='',q=false; for(let i=0;i<text.length;i++){ const ch=text[i], next=text[i+1]; if(ch==='"'&&q&&next==='"'){cell+='"';i++;continue} if(ch==='"'){q=!q;continue} if(ch===','&&!q){row.push(cell);cell='';continue} if((ch==='\n'||ch==='\r')&&!q){ if(ch==='\r'&&next==='\n')i++; row.push(cell); rows.push(row); row=[]; cell=''; continue } cell+=ch } if(cell||row.length){row.push(cell);rows.push(row)} return rows.filter(r=>r.some(c=>String(c||'').trim())); }
const norm = h => String(h||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
function csvToObjects(text){ const rows=parseCsv(text); const heads=rows.shift().map(norm); return rows.map(cols=>{ const o={}; heads.forEach((h,i)=>o[h]=String(cols[i]||'').trim()); return o; }); }
function pick(row, names){ for(const n of names){ const v=row[norm(n)]; if(v) return v; } return ''; }
function truthy(v){ return ['true','yes','y','1','x'].includes(String(v||'').toLowerCase()); }
function dateValue(v){ const d=new Date(v); return Number.isNaN(d.getTime())?0:d.getTime(); }
function countBy(items, getter){ const map=new Map(); items.forEach(x=>{ const key=getter(x)||'Unspecified'; map.set(key,(map.get(key)||0)+1); }); return [...map.entries()].sort((a,b)=>b[1]-a[1]); }
function events(){ try{return JSON.parse(localStorage.getItem('deadend_admin_events')||'[]')}catch(e){return[]} }
function eventCounts(name, getter){ return countBy(events().filter(e=>e.name===name), e=>getter(e.params||{})); }
function renderList(id, data){ const el=$(id); if(!data.length){ el.className='list empty'; return; } el.className='list'; const max=Math.max(...data.map(x=>x[1]),1); el.innerHTML=data.slice(0,12).map(([name,count])=>`<div class="row"><strong>${escapeHtml(name)}</strong><span>${count}</span><div class="bar"><div class="fill" style="width:${Math.round(count/max*100)}%"></div></div></div>`).join(''); }
function escapeHtml(v){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function money(v){ return '$'+Math.round(v*100)/100; }

async function init(){
  const settings=await getJson(DEFAULT_SETTINGS);
  const rows=csvToObjects(await getCsv(settings.catalogueCsvUrl));
  const frags=rows.map(r=>({
    name: pick(r,['Fragrance','Name']),
    house: pick(r,['House','Brand']),
    type: pick(r,['Category','Type','Collection']),
    style: pick(r,['Scent Style','Style','Profile','Category']),
    added: pick(r,['Added Date','Date Added']),
    featured: truthy(pick(r,['Featured'])),
    featuredStart: pick(r,['Featured Start','Feature Start']),
    p3: pick(r,['3mL','3 ml']), p5: pick(r,['5mL','5 ml']), p10: pick(r,['10mL','10 ml'])
  })).filter(f=>f.name);

  const now=Date.now(), thirty=30*24*60*60*1000;
  const featured=frags.find(f=>f.featured);
  $('totalFragrances').textContent=frags.length;
  $('newThisMonth').textContent=frags.filter(f=>f.added && now-dateValue(f.added)<=thirty).length;
  $('featuredName').textContent=featured?featured.name:'None set';
  $('localCartAdds').textContent=events().filter(e=>e.name==='add_to_cart'||e.name==='discovery_pack_add').length;
  const typeData=countBy(frags,f=>f.type); $('typeCount').textContent=typeData.length + ' types'; renderList('typeBreakdown', typeData);
  const styleData=countBy(frags,f=>f.style); $('styleCount').textContent=styleData.length + ' styles'; renderList('styleBreakdown', styleData);
  renderList('searchBreakdown', eventCounts('site_search', p=>p.search_term));
  renderList('cartBreakdown', eventCounts('add_to_cart', p=>p.fragrance_name));

  const checks=[];
  checks.push({status:settings.googleAnalyticsId?'good':'warn',title:'Google Analytics',text:settings.googleAnalyticsId||'Missing ID'});
  checks.push({status:settings.microsoftClarityId?'good':'warn',title:'Microsoft Clarity',text:settings.microsoftClarityId||'Missing ID'});
  checks.push({status:featured?'good':'warn',title:'Fragrance of the Week',text:featured?`${featured.name}${featured.featuredStart?' · '+featured.featuredStart:''}`:'No Featured = TRUE'});
  checks.push({status:settings.siteUrl==='https://deadendscents.com'?'good':'warn',title:'Site URL',text:settings.siteUrl||'Missing'});
  checks.push({status:'good',title:'Catalogue source',text:`${frags.length} rows loaded`});
  checks.push({status:'good',title:'Local events',text:`${events().length} events on this device`});
  $('quickChecks').innerHTML=checks.map(c=>`<div class="check ${c.status}"><strong>${escapeHtml(c.title)}</strong><span>${escapeHtml(c.text)}</span></div>`).join('');
}
$('clearLocalData').addEventListener('click',()=>{ if(confirm('Clear local dashboard event data from this browser?')){ localStorage.removeItem('deadend_admin_events'); location.reload(); }});
init().catch(err=>{ document.body.insertAdjacentHTML('beforeend', `<pre style="padding:20px;color:#ffdede">Admin failed to load: ${escapeHtml(err.message)}</pre>`); });
