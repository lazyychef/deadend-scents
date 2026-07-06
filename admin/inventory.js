(function(){
  const $ = (id) => document.getElementById(id);
  const state = { settings:null, items:[], selected:null, suggested:null, scentStyles:[] };

  const aliases = {
    currentMl:['Current mL','Current Amount Left (mL)','Current Amount Left','Amount Left','Amount Left mL','Remaining mL'],
    bottleSize:['Bottle Size (mL)','Bottle Size','Size mL'],
    purchasePrice:['Purchase Price','Purchase Cost','Cost'],
    rrp:['RRP','Normal RRP','Retail Price'],
    image:['Image','Image URL','Bottle Image'],
    description:['Description','Short Description'],
    stock:['Stock','Status'],
    inspiration:['Inspiration','Inspired By'],
    internalNotes:['Internal Notes'],
    privateNotes:['Private Notes'],
  };

  const money = (n, cents=false) => Number.isFinite(n) ? '$' + n.toFixed(cents ? 2 : 0) : '—';
  const num = (v) => Number(String(v ?? '').replace(/[^0-9.\-]/g,'')) || 0;
  const truthy = (v) => /^(true|yes|y|1)$/i.test(String(v || '').trim());
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const roundUp = (value, step=1) => Math.ceil(value / step) * step;
  const slugify = (v) => String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  function parseCSV(text){
    const rows=[]; let row=[], cell='', q=false;
    for(let i=0;i<text.length;i++){
      const c=text[i], n=text[i+1];
      if(c==='"'&&q&&n==='"'){cell+='"'; i++; continue;}
      if(c==='"'){q=!q; continue;}
      if(c===','&&!q){row.push(cell); cell=''; continue;}
      if((c==='\n'||c==='\r')&&!q){ if(c==='\r'&&n==='\n') i++; row.push(cell); cell=''; if(row.some(v=>String(v).trim()!=='')) rows.push(row); row=[]; continue; }
      cell+=c;
    }
    row.push(cell); if(row.some(v=>String(v).trim()!=='')) rows.push(row);
    if(!rows.length) return [];
    const h=rows.shift().map(x=>x.trim());
    return rows.map(r=>Object.fromEntries(h.map((x,i)=>[x,(r[i]||'').trim()])));
  }

  function first(item, names){ for(const n of names){ if(item[n] !== undefined && item[n] !== null && String(item[n]).trim() !== '') return item[n]; } return ''; }
  function value(item, name){ return item && item[name] != null ? item[name] : ''; }
  function setInput(id, v){ const el=$(id); if(el) el.value = v ?? ''; }
  function setSelect(id, v){ const el=$(id); if(!el) return; const value=String(v??''); if(value && ![...el.options].some(o=>o.value===value || o.textContent===value)){ const opt=document.createElement('option'); opt.value=value; opt.textContent=value; el.appendChild(opt); } el.value=value; }
  function setText(id, v){ const el=$(id); if(el) el.textContent = v || '—'; }
  function displayName(item){ return [item.House,item.Fragrance].filter(Boolean).join(' · ') || item.ID || 'Untitled'; }
  function addedDate(item){ const d = new Date(item['Added Date'] || item['Purchase Date'] || ''); return Number.isFinite(d.getTime()) ? d : null; }
  function isNew(item){ const days = num(state.settings?.newArrivalDays || 45); const d = addedDate(item); if(!d) return false; return ((Date.now() - d.getTime()) / 86400000) <= days; }
  function mlLeft(item){ const v = num(first(item, aliases.currentMl)); return v > 0 ? v : (String(first(item, aliases.currentMl)).trim() === '0' ? 0 : null); }
  function stock(item){ return first(item, aliases.stock) || 'Unknown'; }
  function price(item, key){ return num(item[key]); }
  function imageUrl(item){ return first(item, aliases.image); }
  function collectionProfile(collection){ const c=String(collection||'').toLowerCase(); if(c.includes('niche')||c.includes('premium')) return 'niche'; if(c.includes('middle')) return 'middleEastern'; if(c.includes('inspired')||c.includes('dupe')) return 'inspired'; return 'designer'; }
  function profileMarkup(collection){ const p=collectionProfile(collection); const defaults={designer:2.25,niche:2.55,middleEastern:2.05,inspired:1.9}; return num(state.settings?.[p+'Markup']) || defaults[p]; }

  async function loadSettings(){
    state.settings = await fetch('../settings.json',{cache:'no-store'}).then(r=>r.json());
    try{
      const endpoint = state.settings.adminWriteEndpoint;
      const liveUrl = endpoint + (endpoint.includes('?') ? '&' : '?') + 'action=settings&t=' + Date.now();
      const live = await fetch(liveUrl,{cache:'no-store'}).then(r=>r.json());
      state.settings = Object.assign({}, state.settings, live.settings || {});
    }catch(e){ console.warn('Live settings unavailable', e); }
  }

  async function loadCatalogue(){
    let items=[];
    try{
      const endpoint=state.settings.adminWriteEndpoint;
      const liveUrl=endpoint + (endpoint.includes('?')?'&':'?') + 'action=catalogue&t=' + Date.now();
      const live=await fetch(liveUrl,{cache:'no-store'}).then(r=>r.json());
      if(live.ok && Array.isArray(live.items)) items=live.items;
    }catch(e){ console.warn('Live catalogue endpoint unavailable, falling back to CSV', e); }
    if(!items.length){ try{ const res=await fetch(state.settings.catalogueCsvUrl,{cache:'no-store'}); if(res.ok) items=parseCSV(await res.text()); }catch(e){} }
    if(!items.length){ try{ const fb=await fetch('../catalogue-fallback.json',{cache:'no-store'}).then(r=>r.json()); items=fb.items||[]; }catch(e){} }
    state.items=items;
    state.scentStyles=[...new Set(items.map(i=>String(i['Scent Style']||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    renderStats(); renderFilters(); renderEditorDropdowns(); renderList();
  }

  function filtered(){
    const q=$('search').value.trim().toLowerCase();
    const col=$('collectionFilter').value;
    const st=$('stockFilter').value;
    return state.items.filter(item=>{
      const hay=[item.ID,item.House,item.Fragrance,item.Collection,item['Scent Style']].join(' ').toLowerCase();
      return (!q||hay.includes(q)) && (!col||item.Collection===col) && (!st||stock(item)===st);
    }).slice(0,200);
  }

  function renderStats(){
    const items=state.items.filter(i=>!['hidden','archived'].includes(stock(i).toLowerCase()));
    const threshold = num(state.settings?.lowStockThreshold || 20);
    let invValue=0, revenue=0, low=0;
    items.forEach(i=>{
      const ml=mlLeft(i); const pp=num(first(i,aliases.purchasePrice)); const size=num(first(i,aliases.bottleSize));
      const p10=price(i,'10mL');
      if(ml !== null && size) invValue += (pp/size)*ml;
      if(ml !== null && p10) revenue += Math.floor(ml/10)*p10;
      if(ml !== null && ml > 0 && ml <= threshold) low++;
    });
    setText('statTotal', items.length); setText('statValue', money(invValue)); setText('statRevenue', money(revenue)); setText('statLow', low);
  }

  function renderFilters(){
    const values=[...new Set(state.items.map(i=>i.Collection).filter(Boolean))].sort();
    $('collectionFilter').innerHTML='<option value="">All</option>'+values.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
  }

  function renderEditorDropdowns(){
    const scent=$('scentStyle');
    const current=scent.value;
    const fallback=['Fresh Aquatic','Fresh Citrus','Fresh Spicy','Woody','Amber','Vanilla','Gourmand','Sweet','Spicy','Tobacco','Boozy','Dark / Night','Office / Clean','Floral','Fruity','Leather','Musky','Green','Other'];
    const options=state.scentStyles.length ? state.scentStyles : fallback;
    scent.innerHTML='<option value="">Select scent style</option>'+options.map(v=>`<option>${escapeHtml(v)}</option>`).join('')+'<option>Other</option>';
    if(current) setSelect('scentStyle', current);
  }

  function renderList(){
    const rows=filtered();
    $('inventoryList').innerHTML=rows.map(item=>{
      const ml=mlLeft(item); const threshold=num(state.settings?.lowStockThreshold || 20); const img=imageUrl(item); const flagLow=ml!==null&&ml>0&&ml<=threshold;
      const badges=[isNew(item)?'New':'', truthy(item.Featured)?'Featured':'', truthy(item['Staff Pick'])?'Staff Pick':'', flagLow?'Low stock':''].filter(Boolean);
      return `<button class="inventory-card-v52" type="button" data-id="${escapeHtml(item.ID)}">
        <span class="thumb">${img?`<img src="${escapeHtml(img)}" alt="">`:'🧴'}</span>
        <span class="inv-main"><strong>${escapeHtml(displayName(item))}</strong><em>${escapeHtml(item.Collection||'Catalogue')} · ${escapeHtml(stock(item))}</em><small>${badges.map(b=>`<b>${escapeHtml(b)}</b>`).join('')}</small></span>
        <span class="inv-metric"><strong>${ml===null?'—':escapeHtml(ml)+'mL'}</strong><em>${money(Math.floor((ml||0)/10)*price(item,'10mL'))}</em></span>
      </button>`;
    }).join('') || '<div class="empty">No bottles found.</div>';
    document.querySelectorAll('.inventory-card-v52').forEach(btn=>btn.addEventListener('click',()=>selectItem(btn.dataset.id)));
  }

  function renderImage(url){
    const box=$('imagePreview');
    if(!url){ box.className='image-preview empty-image'; box.innerHTML='No image'; return; }
    box.className='image-preview'; box.innerHTML=`<img src="${escapeHtml(url)}" alt="Bottle preview" onerror="this.parentElement.className='image-preview empty-image';this.parentElement.textContent='Image failed';">`;
  }

  function renderReadOnly(item){
    setText('readCostPerMl', value(item,'Cost per mL') || money(num(first(item,aliases.purchasePrice))/Math.max(1,num(first(item,aliases.bottleSize))),true));
    setText('readRevenue3', value(item,'Revenue as 3mL'));
    setText('readRevenue5', value(item,'Revenue as 5mL'));
    setText('readRevenue10', value(item,'Revenue as 10mL'));
    setText('readBestRevenue', value(item,'Best Potential Revenue'));
    setText('readProfit', value(item,'Projected Profit'));
  }

  function selectItem(id){
    const item=state.items.find(i=>String(i.ID)===String(id)); if(!item) return;
    state.selected=item; state.suggested=null;
    setInput('editId', item.ID||''); setInput('idDisplay', item.ID||'');
    $('editTitle').textContent=displayName(item); $('editMeta').textContent=(item.ID||'')+' · '+(item.Collection||'');
    setInput('house',value(item,'House')); setInput('fragrance',value(item,'Fragrance')); setSelect('collection',value(item,'Collection'));
    setInput('inspirationHouse', value(item,'Inspiration House')); setInput('inspiration', first(item,aliases.inspiration)); setSelect('scentStyle', value(item,'Scent Style'));
    setSelect('gender', value(item,'Gender')); setInput('emojis', value(item,'Emojis')); setInput('concentration', value(item,'Concentration'));
    setInput('performance', value(item,'Performance')); setInput('projection', value(item,'Projection')); setInput('season', value(item,'Season')); setInput('occasion', value(item,'Occasion'));
    setInput('fragrantica', value(item,'Fragrantica')); setSelect('stock', stock(item)); setInput('description', first(item,aliases.description));
    setInput('addedDate', value(item,'Added Date')); setInput('purchaseDate', value(item,'Purchase Date')); setInput('purchasePrice', first(item,aliases.purchasePrice));
    setInput('bottleSize', first(item,aliases.bottleSize)); setInput('currentMl', first(item,aliases.currentMl)); setInput('condition', value(item,'Condition'));
    setInput('purchaseSource', value(item,'Purchase Source')); setInput('seller', value(item,'Seller')); setInput('rrp', first(item,aliases.rrp)); setInput('replacementCost', value(item,'Replacement Cost'));
    setInput('price3', value(item,'3mL')); setInput('price5', value(item,'5mL')); setInput('price10', value(item,'10mL'));
    setInput('imageUrl', imageUrl(item)); setInput('internalNotes', first(item,aliases.internalNotes)); setInput('privateNotes', first(item,aliases.privateNotes));
    $('featured').checked = truthy(item.Featured); $('staffPick').checked = truthy(item['Staff Pick']);
    const fragranceSlug=slugify([item.House,item.Fragrance].filter(Boolean).join(' ')); $('previewPublic').href = fragranceSlug ? '../fragrances/'+fragranceSlug+'/' : '#';
    renderImage(imageUrl(item)); renderReadOnly(item); calculatePrices(false); $('saveStatus').textContent='';
    document.querySelector('.bottle-editor-panel').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function recommendedPrice(ml){
    const purchaseCost=num($('purchasePrice').value), size=num($('bottleSize').value), rrp=num($('rrp').value); if(!size) return 0;
    const markup=profileMarkup($('collection').value); const scale = ml===3 ? 1.16 : ml===5 ? 1.03 : .92;
    const costPerMl = purchaseCost / size; const rrpPerMl = rrp / size;
    const costBased = costPerMl * ml * markup * scale; const rrpCeiling = rrpPerMl ? rrpPerMl * ml * 1.05 : Infinity;
    const comp = num($('competitor'+ml).value); const undercut=(100-(num(state.settings?.competitorUndercutPercent)||8))/100;
    const marketCap = comp ? comp * undercut : Infinity; const minimum = ml===3 ? 5 : ml===5 ? 7 : 10;
    const raw=Math.max(minimum, Math.min(costBased, rrpCeiling, marketCap)); return roundUp(raw, num(state.settings?.roundToNearest)||1);
  }

  function calculatePrices(showMessage=true){
    const pp=num($('purchasePrice').value), size=num($('bottleSize').value), ml=num($('currentMl').value); const costPerMl=size?pp/size:0;
    const prices={3:recommendedPrice(3),5:recommendedPrice(5),10:recommendedPrice(10)}; const revenue=Math.floor(ml/10)*prices[10]; const remainingCost=costPerMl*ml; const profit=revenue-remainingCost;
    state.suggested=prices; setText('calcCostPerMl',money(costPerMl,true)); setText('calcPrice3',money(prices[3])); setText('calcPrice5',money(prices[5])); setText('calcPrice10',money(prices[10])); setText('calcRevenue',money(revenue)); setText('calcProfit',money(profit));
    if(showMessage) $('saveStatus').textContent='Prices calculated. Review, then accept suggested prices or save manually.';
  }

  function acceptPrices(){
    if(!state.suggested) calculatePrices(false);
    setInput('price3',money(state.suggested[3])); setInput('price5',money(state.suggested[5])); setInput('price10',money(state.suggested[10]));
    $('saveStatus').textContent='Suggested prices applied. Press Save bottle to write to Google Sheets.';
  }

  function fieldsFromForm(){
    return {
      'ID':$('editId').value,'Collection':$('collection').value,'House':$('house').value,'Fragrance':$('fragrance').value,'Inspiration House':$('inspirationHouse').value,
      'Inspiration':$('inspiration').value,'Scent Style':$('scentStyle').value,'Gender':$('gender').value,'Description':$('description').value,'Emojis':$('emojis').value,
      '3mL':$('price3').value,'5mL':$('price5').value,'10mL':$('price10').value,'Added Date':$('addedDate').value,'Featured':$('featured').checked?'TRUE':'FALSE','Staff Pick':$('staffPick').checked?'TRUE':'FALSE',
      'Performance':$('performance').value,'Projection':$('projection').value,'Season':$('season').value,'Occasion':$('occasion').value,'Stock':$('stock').value,'Concentration':$('concentration').value,
      'Internal Notes':$('internalNotes').value,'Fragrantica':$('fragrantica').value,'Purchase Date':$('purchaseDate').value,'Purchase Price':$('purchasePrice').value,'Bottle Size (mL)':$('bottleSize').value,
      'Current mL':$('currentMl').value,'Condition':$('condition').value,'Purchase Source':$('purchaseSource').value,'Seller':$('seller').value,'RRP':$('rrp').value,'Replacement Cost':$('replacementCost').value,
      'Private Notes':$('privateNotes').value,'Image':$('imageUrl').value,'Last Updated':new Date().toISOString()
    };
  }

  async function save(e){
    e.preventDefault(); if(!$('editId').value){$('saveStatus').textContent='Choose a bottle first.'; return;}
    $('saveStatus').textContent='Saving bottle...'; const fields=fieldsFromForm();
    try{
      await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,{action:'updateBottle',id:$('editId').value,fields});
      Object.assign(state.selected, fields); renderStats(); renderFilters(); renderList(); $('saveStatus').textContent='Saved to Google Sheets. Reload catalogue after the published CSV refreshes.';
    }catch(err){ $('saveStatus').textContent='Save failed: '+(err.message||err); }
  }

  async function archiveBottle(){
    if(!$('editId').value) return; if(!confirm('Archive this bottle? It will be hidden from normal inventory but kept in the database.')) return;
    setSelect('stock','Archived'); await save(new Event('submit'));
  }

  async function duplicateBottle(){
    if(!$('editId').value) return; if(!confirm('Duplicate this bottle as a new row? Purchase details will be copied so you can edit them afterwards.')) return;
    $('saveStatus').textContent='Duplicating bottle...';
    try{ await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,{action:'duplicateBottle',id:$('editId').value}); await loadCatalogue(); $('saveStatus').textContent='Bottle duplicated. Search for the new copy and edit purchase details.'; }
    catch(err){ $('saveStatus').textContent='Duplicate failed: '+(err.message||err); }
  }

  async function deleteBottle(){
    if(!$('editId').value) return; const text=prompt('Type DELETE to permanently remove this row from the Catalogue sheet.'); if(text!=='DELETE') return;
    $('saveStatus').textContent='Deleting bottle...';
    try{ await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,{action:'deleteBottle',id:$('editId').value}); state.selected=null; await loadCatalogue(); $('editTitle').textContent='Choose a bottle'; $('editMeta').textContent='Bottle deleted. Pick another bottle to edit.'; $('saveStatus').textContent='Bottle deleted from Google Sheets.'; }
    catch(err){ $('saveStatus').textContent='Delete failed: '+(err.message||err); }
  }

  async function init(){
    await loadSettings(); await loadCatalogue();
    ['search','collectionFilter','stockFilter'].forEach(id=>$(id).addEventListener('input',renderList));
    ['purchasePrice','bottleSize','currentMl','rrp','collection','competitor3','competitor5','competitor10'].forEach(id=>$(id).addEventListener('input',()=>calculatePrices(false)));
    $('imageUrl').addEventListener('input',e=>renderImage(e.target.value)); $('calculatePrices').addEventListener('click',()=>calculatePrices(true)); $('acceptPrices').addEventListener('click',acceptPrices);
    $('editForm').addEventListener('submit',save); $('reloadBtn').addEventListener('click',async()=>{ await loadCatalogue(); $('saveStatus').textContent='Catalogue reloaded from live database.'; });
    $('archiveBtn').addEventListener('click',archiveBottle); $('duplicateBtn').addEventListener('click',duplicateBottle); $('deleteBtn').addEventListener('click',deleteBottle);
  }
  init();
})();
