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

let appSettings = {};
let currentFrags = [];

async function init(){
  const settings=await getJson(DEFAULT_SETTINGS);
  appSettings = settings;
  const rows=csvToObjects(await getCsv(settings.catalogueCsvUrl));
  const frags=rows.map(r=>({
    id: pick(r,['ID','Fragrance ID']),
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
  currentFrags = frags;
  setupForms(frags, settings);

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



function todayIso(){ return new Date().toISOString().slice(0,10); }
function makePurchaseId(){ return 'P-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + String(Date.now()).slice(-4); }
function formDataObject(form){ return Object.fromEntries(new FormData(form).entries()); }
function money(n){ const v=Number(n||0); return Math.round(v*100)/100; }
function writeStatusCards(settings){
  const hasEndpoint=!!settings.adminWriteEndpoint;
  $('writeMode').textContent=hasEndpoint ? 'Google Sheet write-back ready' : 'Local test mode';
  renderChecks('writeStatus', [
    {status:hasEndpoint?'good':'warn', title:'Write endpoint', text:hasEndpoint ? 'Connected to Apps Script' : 'Not connected yet. Saves locally only.'},
    {status:'good', title:'Catalogue source', text:settings.catalogueCsvUrl ? 'Google Sheet CSV connected' : 'Missing CSV'},
    {status:'good', title:'Safe testing', text:'Local mode will not change your live sheet'}
  ]);
}
function setupForms(frags, settings){
  writeStatusCards(settings);
  window.__adminFrags = frags;
  const purchaseDate=document.querySelector('#purchaseForm [name="purchaseDate"]');
  if(purchaseDate && !purchaseDate.value) purchaseDate.value=todayIso();
  const itemWrap=$('purchaseItems');

  let list=document.getElementById('existingFragranceList');
  if(!list){
    list=document.createElement('datalist');
    list.id='existingFragranceList';
    document.body.appendChild(list);
  }
  list.innerHTML = frags.map(f=>`<option value="${escapeHtml(f.name)} · ${escapeHtml(f.house)}"></option>`).join('');

  function findExisting(value){
    const clean=String(value||'').trim().toLowerCase();
    if(!clean) return null;
    return frags.find(f => `${f.name} · ${f.house}`.toLowerCase() === clean)
      || frags.find(f => f.name.toLowerCase() === clean)
      || null;
  }

  function addLine(){
    const div=document.createElement('div'); div.className='purchase-line';
    div.innerHTML=`
      <div class="purchase-mode improved-mode">
        <label>Bottle action
          <select name="bottleAction">
            <option value="auto">Auto detect</option>
            <option value="existing">Existing bottle / restock</option>
            <option value="new">New bottle</option>
          </select>
        </label>
        <p class="help-text">Fast mode: type the fragrance name. If it matches your Catalogue it becomes a restock. If it does not match, it becomes a new bottle entry.</p>
      </div>
      <div class="existing-fields">
        <div class="purchase-line-grid existing-grid">
          <label class="wide">Fragrance
            <input name="existingFragranceName" list="existingFragranceList" placeholder="Start typing, e.g. Cedrat Boise, SANAYA, Paranoid..." autocomplete="off">
            <input name="existingFragranceId" type="hidden">
          </label>
          <label>Bottle mL<input name="bottleSize" type="number" min="0" step="1" value="100"></label>
          <label>Full %<input name="fullness" type="number" min="0" max="100" step="1" value="100"></label>
          <label>Cost<input name="allocatedCost" type="number" min="0" step="0.01"></label>
          <label>Current mL<input name="currentMl" type="number" min="0" step="0.1"></label>
          <button class="remove-line" type="button">×</button>
        </div>
        <p class="match-hint" data-match-status>Select an existing fragrance to update current mL / cost details.</p>
      </div>
      <div class="new-fields" hidden>
        <div class="form-grid new-bottle-grid">
          <label>Collection<select name="collection"><option>Designer Original</option><option>Niche Original</option><option>Middle Eastern</option><option>Inspired By</option></select></label>
          <label>House<input name="house" placeholder="Lattafa, Jalu, Mancera..."></label>
          <label>Fragrance<input name="fragrance" placeholder="Fragrance name"></label>
          <label>Scent Style<select name="scentStyle"><option>Fresh Citrus</option><option>Fresh Aquatic</option><option>Fruity</option><option>Woody</option><option>Leather</option><option>Spicy</option><option>Gourmand</option><option>Tobacco</option><option>Floral</option><option>Dark / Night</option></select></label>
          <label>Gender<select name="gender"><option>Men / Unisex</option><option>Women</option><option>Unisex</option></select></label>
          <label>Emojis<input name="emojis" placeholder="🍋🌿"></label>
          <label>Inspiration House<input name="inspirationHouse" placeholder="Creed, LV, Xerjoff..."></label>
          <label>Inspiration<input name="inspiration" placeholder="Aventus, Imagination..."></label>
          <label>3mL<input name="p3" type="number" min="0" step="0.01"></label>
          <label>5mL<input name="p5" type="number" min="0" step="0.01"></label>
          <label>10mL<input name="p10" type="number" min="0" step="0.01"></label>
          <label>Added Date<input name="addedDate" type="date" value="${todayIso()}"></label>
          <label class="wide">Description<input name="description" placeholder="3-5 word scent profile"></label>
          <label class="wide">Fragrantica<input name="fragrantica" type="url" placeholder="https://www.fragrantica.com/..."></label>
        </div>
        <div class="purchase-line-grid inventory-grid">
          <label>Bottle mL<input name="newBottleSize" type="number" min="0" step="1" value="100"></label>
          <label>Full %<input name="newFullness" type="number" min="0" max="100" step="1" value="100"></label>
          <label>Cost<input name="newAllocatedCost" type="number" min="0" step="0.01"></label>
          <label>Current mL<input name="newCurrentMl" type="number" min="0" step="0.1"></label>
          <button class="remove-line" type="button">×</button>
        </div>
      </div>`;
    itemWrap.appendChild(div);
    const action=div.querySelector('[name="bottleAction"]');
    const existing=div.querySelector('.existing-fields');
    const newFields=div.querySelector('.new-fields');
    const existingName=div.querySelector('[name="existingFragranceName"]');
    const existingId=div.querySelector('[name="existingFragranceId"]');
    const status=div.querySelector('[data-match-status]');
    function getMatch(){ return findExisting(existingName.value); }
    function setMode(){
      const match=getMatch();
      const typed=String(existingName.value||'').trim();
      const forcedNew=action.value==='new';
      const forcedExisting=action.value==='existing';
      const autoNew=action.value==='auto' && typed && !match;
      const isNew=forcedNew || autoNew;
      existing.hidden=false;
      newFields.hidden=!isNew;
      if(match){
        existingId.value=match.id;
        status.textContent=`Matched existing bottle: ${match.name} · ${match.house}. This will save as a restock/update.`;
        status.classList.add('good');
        status.classList.remove('warn');
      } else if(isNew){
        existingId.value='';
        status.textContent='No existing match found. This will save as a NEW bottle and add it to Catalogue.';
        status.classList.remove('good');
        status.classList.add('warn');
      } else {
        existingId.value='';
        status.textContent=forcedExisting ? 'Choose a matching existing fragrance from the list.' : 'Start typing. Exact match = restock, no match = new bottle.';
        status.classList.remove('good','warn');
      }
      if(isNew){
        const newName=div.querySelector('[name="fragrance"]');
        if(newName && typed && !newName.value) newName.value=typed.replace(/\s+·\s+.*$/,'');
      }
    }
    action.addEventListener('change',setMode); setMode();
    function checkExisting(){ setMode(); }
    existingName.addEventListener('input',checkExisting);
    existingName.addEventListener('change',checkExisting);
    function bindCalc(sizeSel, fullSel, currSel){
      const size=div.querySelector(sizeSel), full=div.querySelector(fullSel), curr=div.querySelector(currSel);
      function calc(){ if(size.value && full.value) curr.value=money(Number(size.value)*Number(full.value)/100); }
      size.addEventListener('input',calc); full.addEventListener('input',calc); calc();
    }
    bindCalc('[name="bottleSize"]','[name="fullness"]','[name="currentMl"]');
    bindCalc('[name="newBottleSize"]','[name="newFullness"]','[name="newCurrentMl"]');
    div.querySelectorAll('.remove-line').forEach(btn=>btn.addEventListener('click',()=>div.remove()));
  }
  $('addPurchaseItem').addEventListener('click',addLine); if(!itemWrap.children.length) addLine();
  $('purchaseForm').addEventListener('submit', async (e)=>{ e.preventDefault(); await savePurchase(); });
  $('copyPurchaseRows').addEventListener('click',()=>copyText($('stagedOutput').value || buildPurchasePayload().summary));
}
function selectedFragName(input){ return String(input && input.value || '').replace(/\s+·\s+.*$/,'').trim(); }
function lineMode(line){
  const action=line.querySelector('[name="bottleAction"]')?.value || 'auto';
  const id=line.querySelector('[name="existingFragranceId"]')?.value || '';
  const typed=selectedFragName(line.querySelector('[name="existingFragranceName"]'));
  if(action==='new') return 'new';
  if(action==='existing') return 'existing';
  if(id) return 'existing';
  return typed ? 'new' : 'existing';
}
function val(line, selector){ const el=line.querySelector(selector); return el ? el.value : ''; }
function buildPurchasePayload(){
  const f=formDataObject($('purchaseForm'));
  const purchaseId=makePurchaseId();
  const lines=[...document.querySelectorAll('.purchase-line')].map(line=>{
    const mode=lineMode(line);
    if(mode==='new'){
      const bottleSize=Number(val(line,'[name="newBottleSize"]')||0);
      const fullness=Number(val(line,'[name="newFullness"]')||0);
      const currentMl=Number(val(line,'[name="newCurrentMl"]')||0);
      const allocatedCost=Number(val(line,'[name="newAllocatedCost"]')||0);
      return {
        mode:'new', purchaseId,
        fragranceId:'', fragrance:val(line,'[name="fragrance"]'), house:val(line,'[name="house"]'), collection:val(line,'[name="collection"]'),
        inspirationHouse:val(line,'[name="inspirationHouse"]'), inspiration:val(line,'[name="inspiration"]'), scentStyle:val(line,'[name="scentStyle"]'), gender:val(line,'[name="gender"]'),
        emojis:val(line,'[name="emojis"]'), description:val(line,'[name="description"]'), fragrantica:val(line,'[name="fragrantica"]'),
        p3:money(val(line,'[name="p3"]')), p5:money(val(line,'[name="p5"]')), p10:money(val(line,'[name="p10"]')), addedDate:val(line,'[name="addedDate"]')||todayIso(),
        bottleSize, fullness, currentMl, allocatedCost
      };
    }
    const nameInput=line.querySelector('[name="existingFragranceName"]');
    const idInput=line.querySelector('[name="existingFragranceId"]');
    return {
      mode:'existing', purchaseId,
      fragranceId: idInput ? idInput.value : '',
      fragrance: selectedFragName(nameInput),
      bottleSize: Number(val(line,'[name="bottleSize"]')||0),
      fullness: Number(val(line,'[name="fullness"]')||0),
      currentMl: Number(val(line,'[name="currentMl"]')||0),
      allocatedCost: Number(val(line,'[name="allocatedCost"]')||0)
    };
  }).filter(l=>l.mode==='new' ? (l.fragrance && l.house) : (l.fragranceId && l.fragrance));
  const totalPaid=Number(f.totalPaid||0);
  const specifiedTotal=lines.reduce((sum,l)=>sum+(Number(l.allocatedCost)||0),0);
  const missingCost=lines.filter(l=>!Number(l.allocatedCost));
  if(totalPaid && missingCost.length){
    const each=Math.max((totalPaid-specifiedTotal)/missingCost.length,0);
    missingCost.forEach(l=>l.allocatedCost=money(each));
  }
  const purchase={purchaseId,purchaseDate:f.purchaseDate,seller:f.seller,source:f.source,totalPaid,bottlesCount:lines.length,notes:f.notes||''};
  const summary=`Purchase ${purchaseId}\n${purchase.purchaseDate} · ${purchase.seller} · $${purchase.totalPaid}\n` + lines.map(l=>`${l.mode==='new'?'NEW':'RESTOCK'} | ${l.fragrance} | ${l.bottleSize}mL | ${l.fullness}% | ${l.currentMl}mL | $${l.allocatedCost}`).join('\n');
  return {action:'addPurchase', purchase, items:lines, summary};
}
function saveLocal(kind, payload){
  const key='deadend_'+kind; const arr=JSON.parse(localStorage.getItem(key)||'[]'); arr.push({...payload, savedAt:new Date().toISOString()}); localStorage.setItem(key, JSON.stringify(arr));
}
async function postToEndpoint(payload){
  if(!appSettings.adminWriteEndpoint) return {mode:'local'};
  await fetch(appSettings.adminWriteEndpoint, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body:JSON.stringify(payload)});
  return {mode:'remote'};
}
async function savePurchase(){
  const payload=buildPurchasePayload();
  saveLocal('purchases', payload);
  const res=await postToEndpoint(payload);
  $('stagedOutput').value=(res.mode==='remote'?'Sent to Google Sheets.\n\n':'Saved locally only.\n\n')+payload.summary+'\n\nJSON:\n'+JSON.stringify(payload,null,2);
}
async function copyText(text){ try{ await navigator.clipboard.writeText(text); alert('Copied'); }catch(e){ $('stagedOutput').select(); document.execCommand('copy'); } }

$('clearLocalData').addEventListener('click',()=>{ if(confirm('Clear local dashboard event data from this browser?')){ localStorage.removeItem('deadend_admin_events'); location.reload(); }});
$('refreshDashboard').addEventListener('click',()=>location.reload());
init().catch(err=>{ document.body.insertAdjacentHTML('beforeend', `<pre style="padding:20px;color:#ffdede">Command Centre failed to load: ${escapeHtml(err.message)}</pre>`); });
