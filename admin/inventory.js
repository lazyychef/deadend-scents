(function(){
  const $ = (id) => document.getElementById(id);
  const state = { settings:null, items:[], selected:null, suggested:null };

  const COLLECTIONS = ['Original Designer','Original Niche','Middle Eastern','Inspired By','Other'];
  const STOCKS = ['In Stock','Ordered','Out of Stock','Archived','Hidden'];
  const FALLBACK_SCENT_STYLES = ['Fresh Aquatic','Fresh Citrus','Fresh Spicy','Woody','Amber','Vanilla','Gourmand','Sweet','Spicy','Tobacco','Boozy','Dark / Night','Office / Clean','Floral','Fruity','Leather','Musky','Green','Other'];

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
    privateNotes:['Private Notes','Admin Notes'],
    replacementCost:['Replacement Cost','Replacement Price'],
  };

  const money = (n, cents=false) => Number.isFinite(n) ? '$' + n.toFixed(cents ? 2 : 0) : '—';
  const num = (v) => Number(String(v ?? '').replace(/[^0-9.\-]/g,'')) || 0;
  const truthy = (v) => /^(true|yes|y|1)$/i.test(String(v || '').trim());
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const roundUp = (value, step=1) => Math.ceil(value / step) * step;

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
  function setInput(id, value){ const el=$(id); if(el) el.value = value ?? ''; }
  function displayName(item){ return [item.House,item.Fragrance].filter(Boolean).join(' · ') || item.ID || 'Untitled'; }
  function addedDate(item){ const d = new Date(item['Added Date'] || item['Purchase Date'] || ''); return Number.isFinite(d.getTime()) ? d : null; }
  function isNew(item){ const days = num(state.settings?.newArrivalDays || 45); const d = addedDate(item); if(!d) return false; return ((Date.now() - d.getTime()) / 86400000) <= days; }
  function mlLeft(item){ const v = num(first(item, aliases.currentMl)); return v > 0 ? v : (String(first(item, aliases.currentMl)).trim() === '0' ? 0 : null); }
  function stock(item){ return first(item, aliases.stock) || 'Unknown'; }
  function price(item, key){ return num(item[key]); }
  function imageUrl(item){ return first(item, aliases.image); }
  function slug(v){ return String(v||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
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
    try{ const res=await fetch(state.settings.catalogueCsvUrl + (state.settings.catalogueCsvUrl.includes('?') ? '&' : '?') + 't=' + Date.now(),{cache:'no-store'}); if(res.ok) items=parseCSV(await res.text()); }catch(e){}
    if(!items.length){ try{ const fb=await fetch('../catalogue-fallback.json',{cache:'no-store'}).then(r=>r.json()); items=fb.items||[]; }catch(e){} }
    state.items=items;
    renderStats(); renderFilters(); renderScentStyles(); renderList();
  }

  function filtered(){
    const q=$('search').value.trim().toLowerCase();
    const col=$('collectionFilter').value;
    const st=$('stockFilter').value;
    return state.items.filter(item=>{
      const hay=[item.ID,item.House,item.Fragrance,item.Collection,item['Scent Style']].join(' ').toLowerCase();
      return (!q||hay.includes(q)) && (!col||item.Collection===col) && (!st||stock(item)===st);
    }).slice(0,180);
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
    $('statTotal').textContent = items.length;
    $('statValue').textContent = money(invValue);
    $('statRevenue').textContent = money(revenue);
    $('statLow').textContent = low;
  }

  function renderFilters(){
    const values=[...new Set(state.items.map(i=>i.Collection).filter(Boolean))].sort();
    $('collectionFilter').innerHTML='<option value="">All</option>'+values.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
    const colSelect=$('collection');
    colSelect.innerHTML = COLLECTIONS.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
    const stockSelect=$('stock');
    stockSelect.innerHTML = STOCKS.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
  }

  function renderScentStyles(selected=''){
    const unique=[...new Set(state.items.map(i=>String(i['Scent Style']||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const values = unique.length ? unique : FALLBACK_SCENT_STYLES;
    const select=$('scentStyle');
    const current = selected || select.value;
    select.innerHTML='<option value="">Select scent style</option>'+values.map(v=>`<option>${escapeHtml(v)}</option>`).join('')+'<option>Other</option>';
    if(current){
      if(![...select.options].some(o=>o.value===current)) select.insertAdjacentHTML('beforeend',`<option>${escapeHtml(current)}</option>`);
      select.value=current;
    }
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

  function selectItem(id){
    const item=state.items.find(i=>String(i.ID)===String(id)); if(!item) return;
    state.selected=item; state.suggested=null;
    setInput('editId', item.ID||''); setInput('displayId', item.ID||'');
    $('editTitle').textContent=displayName(item); $('editMeta').textContent=(item.ID||'')+' · '+(item.Collection||'');

    setInput('collection', item.Collection||'Original Designer'); setInput('house',item.House); setInput('fragrance',item.Fragrance);
    setInput('inspirationHouse', item['Inspiration House']); setInput('inspiration', first(item, aliases.inspiration));
    renderScentStyles(item['Scent Style']); setInput('gender', item.Gender || 'Men / Unisex'); setInput('emojis', item.Emojis);
    setInput('concentration', item.Concentration); setInput('description', first(item,aliases.description));
    setInput('performance', item.Performance); setInput('projection', item.Projection); setInput('season', item.Season); setInput('occasion', item.Occasion);

    setInput('addedDate', item['Added Date']); setInput('purchaseDate',item['Purchase Date'] || item['Added Date']);
    setInput('purchasePrice', first(item,aliases.purchasePrice)); setInput('bottleSize',first(item,aliases.bottleSize)); setInput('currentMl',first(item,aliases.currentMl));
    setInput('rrp', first(item,aliases.rrp)); setInput('replacementCost', first(item,aliases.replacementCost)); setInput('purchaseSource',item['Purchase Source']);
    setInput('seller',item.Seller); setInput('condition',item.Condition); setInput('stock',stock(item));

    setInput('price3',item['3mL']); setInput('price5',item['5mL']); setInput('price10',item['10mL']);
    setInput('fragrantica', item.Fragrantica); setInput('imageUrl',imageUrl(item));
    setInput('costPerMl', item['Cost per mL']); setInput('revenue3', item['Revenue as 3mL']); setInput('revenue5', item['Revenue as 5mL']); setInput('revenue10', item['Revenue as 10mL']);
    setInput('bestRevenue', item['Best Potential Revenue']); setInput('projectedProfit', item['Projected Profit']); setInput('lowStockFlag', item['Low Stock Flag']); setInput('lastUpdated', item['Last Updated']);
    setInput('internalNotes', first(item,aliases.internalNotes)); setInput('privateNotes', first(item,aliases.privateNotes));
    $('featured').checked = truthy(item.Featured); $('staffPick').checked = truthy(item['Staff Pick']);
    renderImage(imageUrl(item)); calculatePrices(false); $('saveStatus').textContent='';
    document.querySelector('.bottle-editor-panel').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function recommendedPrice(ml){
    const purchaseCost=num($('purchasePrice').value), size=num($('bottleSize').value), rrp=num($('rrp').value); if(!size) return 0;
    const markup=profileMarkup($('collection').value); const scale = ml===3 ? 1.16 : ml===5 ? 1.03 : .92;
    const costPerMl = purchaseCost / size; const rrpPerMl = rrp / size;
    const costBased = costPerMl * ml * markup * scale;
    const rrpCeiling = rrpPerMl ? rrpPerMl * ml * 1.05 : Infinity;
    const comp = num($('competitor'+ml).value); const undercut=(100-(num(state.settings?.competitorUndercutPercent)||8))/100;
    const marketCap = comp ? comp * undercut : Infinity;
    const minimum = ml===3 ? 5 : ml===5 ? 7 : 10;
    const raw=Math.max(minimum, Math.min(costBased, rrpCeiling, marketCap));
    return roundUp(raw, num(state.settings?.roundToNearest)||1);
  }

  function calculatePrices(showMessage=true){
    const pp=num($('purchasePrice').value), size=num($('bottleSize').value), ml=num($('currentMl').value); const costPerMl=size?pp/size:0;
    const prices={3:recommendedPrice(3),5:recommendedPrice(5),10:recommendedPrice(10)};
    const revenue=Math.floor(ml/10)*prices[10]; const remainingCost=costPerMl*ml; const profit=revenue-remainingCost;
    state.suggested=prices;
    $('calcCostPerMl').textContent=money(costPerMl,true); $('calcPrice3').textContent=money(prices[3]); $('calcPrice5').textContent=money(prices[5]); $('calcPrice10').textContent=money(prices[10]); $('calcRevenue').textContent=money(revenue); $('calcProfit').textContent=money(profit);
    if(showMessage) $('saveStatus').textContent='Prices calculated. Review, then accept suggested prices or save manually.';
  }

  function acceptPrices(){
    if(!state.suggested) calculatePrices(false);
    setInput('price3',money(state.suggested[3])); setInput('price5',money(state.suggested[5])); setInput('price10',money(state.suggested[10]));
    $('saveStatus').textContent='Suggested prices applied. Press Save bottle to write to Google Sheets.';
  }

  function fieldsFromForm(){
    return {
      'Collection':$('collection').value,'House':$('house').value,'Fragrance':$('fragrance').value,
      'Inspiration House':$('inspirationHouse').value,'Inspiration':$('inspiration').value,'Scent Style':$('scentStyle').value,'Gender':$('gender').value,
      'Description':$('description').value,'Emojis':$('emojis').value,'Performance':$('performance').value,'Projection':$('projection').value,'Season':$('season').value,'Occasion':$('occasion').value,
      'Stock':$('stock').value,'Concentration':$('concentration').value,'Internal Notes':$('internalNotes').value,'Fragrantica':$('fragrantica').value,
      'Added Date':$('addedDate').value,'Purchase Date':$('purchaseDate').value,'Purchase Price':$('purchasePrice').value,'Bottle Size (mL)':$('bottleSize').value,
      'Current mL':$('currentMl').value,'Condition':$('condition').value,'Purchase Source':$('purchaseSource').value,'Seller':$('seller').value,
      'RRP':$('rrp').value,'Replacement Cost':$('replacementCost').value,'3mL':$('price3').value,'5mL':$('price5').value,'10mL':$('price10').value,
      'Featured':$('featured').checked?'TRUE':'FALSE','Staff Pick':$('staffPick').checked?'TRUE':'FALSE','Image':$('imageUrl').value,'Private Notes':$('privateNotes').value,'Last Updated':new Date().toISOString()
    };
  }

  async function save(e){
    e.preventDefault(); if(!$('editId').value){$('saveStatus').textContent='Choose a bottle first.'; return;}
    $('saveStatus').textContent='Saving bottle...';
    const fields=fieldsFromForm();
    try{
      await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,{action:'updateBottle',id:$('editId').value,fields});
      Object.assign(state.selected, fields);
      renderStats(); renderList(); $('saveStatus').textContent='Saved to Google Sheets. The public site will update from the live CSV.';
    }catch(err){ $('saveStatus').textContent='Save failed: '+(err.message||err); }
  }

  async function duplicateBottle(){
    if(!$('editId').value){$('saveStatus').textContent='Choose a bottle first.'; return;}
    if(!confirm('Duplicate this bottle into a new row? Purchase and current mL fields will be blank.')) return;
    $('saveStatus').textContent='Duplicating bottle...';
    try{
      await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,{action:'duplicateBottle',id:$('editId').value});
      await loadCatalogue(); $('saveStatus').textContent='Bottle duplicated. Search for the new row, then add purchase details.';
    }catch(err){ $('saveStatus').textContent='Duplicate failed: '+(err.message||err); }
  }

  async function archiveBottle(){
    if(!$('editId').value){$('saveStatus').textContent='Choose a bottle first.'; return;}
    if(!confirm('Archive this bottle? It will be hidden from the public site but kept in the database.')) return;
    $('stock').value='Archived';
    await save(new Event('submit'));
  }

  async function deleteBottle(){
    if(!$('editId').value){$('saveStatus').textContent='Choose a bottle first.'; return;}
    const confirmText = prompt('This permanently deletes the spreadsheet row. Type DELETE to continue.');
    if(confirmText !== 'DELETE') { $('saveStatus').textContent='Delete cancelled.'; return; }
    $('saveStatus').textContent='Deleting bottle...';
    try{
      await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,{action:'deleteBottle',id:$('editId').value});
      state.selected=null; $('editForm').reset(); $('editTitle').textContent='Choose a bottle'; $('editMeta').textContent='Deleted. Reloaded catalogue.'; renderImage('');
      await loadCatalogue(); $('saveStatus').textContent='Bottle deleted from Google Sheets.';
    }catch(err){ $('saveStatus').textContent='Delete failed: '+(err.message||err); }
  }

  function previewPublicPage(){
    if(!state.selected) { $('saveStatus').textContent='Choose a bottle first.'; return; }
    const path = '../fragrances/' + slug(($('house').value||state.selected.House) + '-' + ($('fragrance').value||state.selected.Fragrance)) + '/';
    window.open(path, '_blank', 'noopener');
  }

  async function init(){
    await loadSettings(); await loadCatalogue();
    ['search','collectionFilter','stockFilter'].forEach(id=>$(id).addEventListener('input',renderList));
    ['purchasePrice','bottleSize','currentMl','rrp','collection','competitor3','competitor5','competitor10'].forEach(id=>$(id).addEventListener('input',()=>calculatePrices(false)));
    $('imageUrl').addEventListener('input',e=>renderImage(e.target.value));
    $('calculatePrices').addEventListener('click',()=>calculatePrices(true)); $('acceptPrices').addEventListener('click',acceptPrices);
    $('editForm').addEventListener('submit',save); $('reloadBtn').addEventListener('click',async()=>{ await loadCatalogue(); $('saveStatus').textContent='Catalogue reloaded.'; });
    $('duplicateBtn').addEventListener('click',duplicateBottle); $('archiveBtn').addEventListener('click',archiveBottle); $('deleteBtn').addEventListener('click',deleteBottle); $('previewPublicPage').addEventListener('click',previewPublicPage);
  }
  init();
})();
