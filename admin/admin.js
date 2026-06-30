const $ = (id) => document.getElementById(id);
const DEFAULT_SETTINGS = '../settings.json';

async function getJson(path){ const res = await fetch(path,{cache:'no-store'}); if(!res.ok) throw new Error(path); return res.json(); }
async function getCsv(url){ const res = await fetch(url + (url.includes('?')?'&':'?') + 'adminCacheBust=' + Date.now(), {cache:'no-store'}); if(!res.ok) throw new Error('CSV failed'); return res.text(); }
function parseCsv(text){ const rows=[]; let row=[],cell='',q=false; for(let i=0;i<text.length;i++){ const ch=text[i], next=text[i+1]; if(ch==='"'&&q&&next==='"'){cell+='"';i++;continue} if(ch==='"'){q=!q;continue} if(ch===','&&!q){row.push(cell);cell='';continue} if((ch==='\n'||ch==='\r')&&!q){ if(ch==='\r'&&next==='\n')i++; row.push(cell); rows.push(row); row=[]; cell=''; continue } cell+=ch } if(cell||row.length){row.push(cell);rows.push(row)} return rows.filter(r=>r.some(c=>String(c||'').trim())); }
const norm = h => String(h||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
function csvToObjects(text){ const rows=parseCsv(text); const heads=rows.shift().map(norm); return rows.map(cols=>{ const o={}; heads.forEach((h,i)=>o[h]=String(cols[i]||'').trim()); return o; }); }
function pick(row, names){ for(const n of names){ const v=row[norm(n)]; if(v) return v; } return ''; }
function truthy(v){ return ['true','yes','y','1','x'].includes(String(v||'').toLowerCase()); }
function dateValue(v){ if(!v) return 0; const parts=String(v).match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/); if(parts){ const y=parts[3].length===2?'20'+parts[3]:parts[3]; return new Date(`${y}-${parts[2].padStart(2,'0')}-${parts[1].padStart(2,'0')}`).getTime(); } const d=new Date(v); return Number.isNaN(d.getTime())?0:d.getTime(); }
function countBy(items, getter){ const map=new Map(); items.forEach(x=>{ const key=String(getter(x)||'Unspecified').trim() || 'Unspecified'; map.set(key,(map.get(key)||0)+1); }); return [...map.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])); }
function events(){ try{return JSON.parse(localStorage.getItem('deadend_admin_events')||'[]')}catch(e){return[]} }
function eventCounts(name, getter){ return countBy(events().filter(e=>e.name===name), e=>getter(e.params||{})); }
function escapeHtml(v){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function parseMoney(value){ const text=String(value||''); const matches=[...text.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)]; if(matches.length) return Number(matches[matches.length-1][1]); const plain=text.match(/^(\d+(?:\.\d{1,2})?)$/); return plain?Number(plain[1]):0; }
function daysLeft(start, days=7){ const t=dateValue(start); if(!t) return null; const end=t + days*24*60*60*1000; return Math.ceil((end-Date.now())/(24*60*60*1000)); }
function renderList(id, data, limit=12){ const el=$(id); if(!data.length){ el.className='list empty'; return; } el.className='list'; const max=Math.max(...data.map(x=>x[1]),1); el.innerHTML=data.slice(0,limit).map(([name,count])=>`<div class="row"><strong>${escapeHtml(name)}</strong><span>${count}</span><div class="bar"><div class="fill" style="width:${Math.round(count/max*100)}%"></div></div></div>`).join(''); }
function renderChecks(id, checks){ $(id).innerHTML=checks.map(c=>`<div class="check ${c.status}"><strong>${escapeHtml(c.title)}</strong><span>${escapeHtml(c.text)}</span></div>`).join(''); }
function funnelCounts(){ const ev=events(); return [
  ['Searches', ev.filter(e=>e.name==='site_search').length],
  ['Cart adds', ev.filter(e=>e.name==='add_to_cart'||e.name==='discovery_pack_add').length],
  ['Cart removes', ev.filter(e=>e.name==='remove_from_cart').length],
  ['WhatsApp clicks', ev.filter(e=>e.name==='whatsapp_click').length],
  ['Messenger clicks', ev.filter(e=>e.name==='messenger_click').length]
]; }
function renderFunnel(){ const data=funnelCounts(); const max=Math.max(...data.map(x=>x[1]),1); $('funnel').innerHTML=data.map(([name,count])=>`<div class="funnel-step"><strong>${escapeHtml(name)}</strong><div class="funnel-track"><div class="funnel-fill" style="width:${Math.round(count/max*100)}%"></div></div><span>${count}</span></div>`).join(''); }

async function init(){
  const settings=await getJson(DEFAULT_SETTINGS);
  const rows=csvToObjects(await getCsv(settings.catalogueCsvUrl));
  const frags=rows.map(r=>({
    name: pick(r,['Fragrance','Name']),
    house: pick(r,['House','Brand']),
    type: pick(r,['Category','Type','Collection']),
    style: pick(r,['Scent Style','Style','Profile']),
    occasion: pick(r,['Occasion']),
    added: pick(r,['Added Date','Date Added']),
    featured: truthy(pick(r,['Featured'])),
    featuredStart: pick(r,['Featured Start','Feature Start']),
    p3: pick(r,['3mL','3 ml']), p5: pick(r,['5mL','5 ml']), p10: pick(r,['10mL','10 ml']),
    fragrantica: pick(r,['Fragrantica','Fragrantica URL','Fragrantica Link'])
  })).filter(f=>f.name);

  const now=Date.now(), thirty=30*24*60*60*1000;
  const featured=frags.find(f=>f.featured);
  $('totalFragrances').textContent=frags.length;
  $('newThisMonth').textContent=frags.filter(f=>f.added && now-dateValue(f.added)<=thirty).length;
  $('featuredName').textContent=featured?featured.name:'None';
  $('featuredStatus').textContent=featured ? `${featured.house || 'House missing'}${featured.featuredStart ? ' · '+featured.featuredStart : ''}` : 'Set Featured = TRUE';
  $('localCartAdds').textContent=events().filter(e=>e.name==='add_to_cart'||e.name==='discovery_pack_add').length;

  if(featured){
    const left=daysLeft(featured.featuredStart, 7);
    const active=left !== null && left > 0;
    $('featureTitle').textContent=featured.name;
    $('featureMeta').textContent=`${featured.house || 'Unknown house'} · ${featured.type || 'No type'} · ${featured.style || 'No style'}`;
    $('promoStatus').textContent=active ? 'Active' : (left !== null ? 'Expired' : 'No start date');
    $('promoDates').textContent=featured.featuredStart ? `${featured.featuredStart} · ${left} day${Math.abs(left)===1?'':'s'} remaining` : 'Add Featured Start to activate discount';
  } else {
    $('featureTitle').textContent='No Fragrance of the Week set';
    $('featureMeta').textContent='Set Featured = TRUE on one row in your Catalogue sheet.';
    $('promoStatus').textContent='Inactive';
    $('promoDates').textContent='No featured row found';
  }

  const typeData=countBy(frags,f=>f.type); $('typeCount').textContent=typeData.length + ' types'; renderList('typeBreakdown', typeData);
  const styleData=countBy(frags,f=>f.style); $('styleCount').textContent=styleData.length + ' styles'; renderList('styleBreakdown', styleData);
  const houseData=countBy(frags,f=>f.house); $('houseCount').textContent=houseData.length + ' houses'; renderList('houseBreakdown', houseData, 10);

  const missing3=frags.filter(f=>!parseMoney(f.p3)).length;
  const missing5=frags.filter(f=>!parseMoney(f.p5)).length;
  const missing10=frags.filter(f=>!parseMoney(f.p10)).length;
  renderChecks('priceChecks', [
    {status:missing3?'warn':'good', title:'3mL prices', text: missing3 ? `${missing3} missing` : 'Complete'},
    {status:missing5?'warn':'good', title:'5mL prices', text: missing5 ? `${missing5} missing` : 'Complete'},
    {status:missing10?'warn':'good', title:'10mL prices', text: missing10 ? `${missing10} missing` : 'Complete'}
  ]);

  renderList('searchBreakdown', eventCounts('site_search', p=>p.search_term));
  renderList('cartBreakdown', eventCounts('add_to_cart', p=>p.fragrance_name));
  renderFunnel();

  const checks=[];
  checks.push({status:settings.googleAnalyticsId?'good':'warn',title:'Google Analytics',text:settings.googleAnalyticsId||'Missing ID'});
  checks.push({status:settings.microsoftClarityId?'good':'warn',title:'Microsoft Clarity',text:settings.microsoftClarityId||'Missing ID'});
  checks.push({status:featured?'good':'warn',title:'Fragrance of the Week',text:featured?`${featured.name}${featured.featuredStart?' · '+featured.featuredStart:''}`:'No Featured = TRUE'});
  checks.push({status:settings.siteUrl==='https://deadendscents.com'?'good':'warn',title:'Site URL',text:settings.siteUrl||'Missing'});
  checks.push({status:frags.filter(f=>!f.type).length?'warn':'good',title:'Missing type',text:frags.filter(f=>!f.type).length ? `${frags.filter(f=>!f.type).length} rows` : 'All rows set'});
  checks.push({status:frags.filter(f=>!f.style).length?'warn':'good',title:'Missing style',text:frags.filter(f=>!f.style).length ? `${frags.filter(f=>!f.style).length} rows` : 'All rows set'});
  checks.push({status:frags.filter(f=>!f.fragrantica).length?'warn':'good',title:'Fragrantica links',text:frags.filter(f=>!f.fragrantica).length ? `${frags.filter(f=>!f.fragrantica).length} missing` : 'All rows linked'});
  checks.push({status:'good',title:'Catalogue source',text:`${frags.length} rows loaded`});
  checks.push({status:'good',title:'Local events',text:`${events().length} events on this device`});
  renderChecks('quickChecks', checks);
}

$('clearLocalData').addEventListener('click',()=>{ if(confirm('Clear local dashboard event data from this browser?')){ localStorage.removeItem('deadend_admin_events'); location.reload(); }});
$('refreshDashboard').addEventListener('click',()=>location.reload());
init().catch(err=>{ document.body.insertAdjacentHTML('beforeend', `<pre style="padding:20px;color:#ffdede">Command Centre failed to load: ${escapeHtml(err.message)}</pre>`); });
