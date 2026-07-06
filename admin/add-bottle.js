(function(){
  const $ = (id) => document.getElementById(id);
  const state = { settings:null, suggested:null };

  const money = (n, cents=false) => Number.isFinite(n) ? '$' + n.toFixed(cents ? 2 : 0) : '—';
  const num = (v) => Number(String(v ?? '').replace(/[^0-9.\-]/g,'')) || 0;
  const roundUp = (value, step=1) => Math.ceil(value / step) * step;

  function today(){ return new Date().toISOString().slice(0,10); }
  function setInput(id, value){ const el=$(id); if(el) el.value = value ?? ''; }
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

  function renderImage(url){
    const box=$('imagePreview');
    if(!url){ box.className='image-preview empty-image'; box.innerHTML='No image'; return; }
    box.className='image-preview';
    box.innerHTML=`<img src="${String(url).replace(/"/g,'&quot;')}" alt="Bottle preview" onerror="this.parentElement.className='image-preview empty-image';this.parentElement.textContent='Image failed';">`;
  }

  function recommendedPrice(ml){
    const purchaseCost=num($('purchasePrice').value), size=num($('bottleSize').value), rrp=num($('rrp').value);
    if(!size) return 0;
    const markup=profileMarkup($('collection').value);
    const scale = ml===3 ? 1.16 : ml===5 ? 1.03 : .92;
    const costPerMl = purchaseCost / size;
    const rrpPerMl = rrp / size;
    const costBased = costPerMl * ml * markup * scale;
    const rrpCeiling = rrpPerMl ? rrpPerMl * ml * 1.05 : Infinity;
    const comp = num($('competitor'+ml).value);
    const undercut=(100-(num(state.settings?.competitorUndercutPercent)||8))/100;
    const marketCap = comp ? comp * undercut : Infinity;
    const minimum = ml===3 ? 5 : ml===5 ? 7 : 10;
    const raw=Math.max(minimum, Math.min(costBased, rrpCeiling, marketCap));
    return roundUp(raw, num(state.settings?.roundToNearest)||1);
  }

  function calculatePrices(showMessage=true){
    const pp=num($('purchasePrice').value), size=num($('bottleSize').value), ml=num($('currentMl').value);
    const costPerMl=size?pp/size:0;
    const prices={3:recommendedPrice(3),5:recommendedPrice(5),10:recommendedPrice(10)};
    const revenue=Math.floor(ml/10)*prices[10];
    const remainingCost=costPerMl*ml;
    const profit=revenue-remainingCost;
    state.suggested=prices;
    $('calcCostPerMl').textContent=money(costPerMl,true);
    $('calcPrice3').textContent=money(prices[3]);
    $('calcPrice5').textContent=money(prices[5]);
    $('calcPrice10').textContent=money(prices[10]);
    $('calcRevenue').textContent=money(revenue);
    $('calcProfit').textContent=money(profit);
    if(showMessage) $('saveStatus').textContent='Prices calculated. Review, then accept suggested prices or edit manually.';
  }

  function acceptPrices(){
    if(!state.suggested) calculatePrices(false);
    setInput('price3',money(state.suggested[3]));
    setInput('price5',money(state.suggested[5]));
    setInput('price10',money(state.suggested[10]));
    $('saveStatus').textContent='Suggested prices applied. Press Add bottle to database to save.';
  }

  function rowFromForm(){
    return {
      collection:$('collection').value,
      house:$('house').value.trim(),
      fragrance:$('fragrance').value.trim(),
      inspirationHouse:$('inspirationHouse').value.trim(),
      inspiration:$('inspiration').value.trim(),
      scentStyle:$('scentStyle').value.trim(),
      gender:$('gender').value,
      description:$('description').value.trim(),
      emojis:$('emojis').value.trim(),
      p3:$('price3').value.trim(),
      p5:$('price5').value.trim(),
      p10:$('price10').value.trim(),
      addedDate:$('addedDate').value,
      featured:'FALSE',
      staffPick:'FALSE',
      stock:$('stock').value,
      fragrantica:$('fragrantica').value.trim(),
      purchaseDate:$('purchaseDate').value,
      purchasePrice:$('purchasePrice').value,
      bottleSize:$('bottleSize').value,
      currentMl:$('currentMl').value,
      condition:$('condition').value.trim() || 'New',
      purchaseSource:$('purchaseSource').value.trim(),
      seller:$('seller').value.trim(),
      rrp:$('rrp').value,
      image:$('imageUrl').value.trim(),
      privateNotes:$('privateNotes').value.trim(),
      lastUpdated:new Date().toISOString()
    };
  }

  async function save(e){
    e.preventDefault();
    const row = rowFromForm();
    if(!row.house || !row.fragrance){ $('saveStatus').textContent='House and fragrance are required.'; return; }
    $('saveStatus').textContent='Adding bottle to Google Sheets...';
    try{
      const res = await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,{action:'addBottle',row});
      $('saveStatus').textContent='Bottle added to Google Sheets. Open Inventory Manager and refresh the catalogue to edit or check it.';
      setTimeout(()=>{ window.location.href='inventory.html'; }, 1400);
    }catch(err){
      $('saveStatus').textContent='Add bottle failed: '+(err.message||err);
    }
  }

  async function init(){
    await loadSettings();
    const d=today();
    setInput('addedDate', d); setInput('purchaseDate', d); setInput('stock','In Stock'); setInput('condition','New');
    ['purchasePrice','bottleSize','currentMl','rrp','collection','competitor3','competitor5','competitor10'].forEach(id=>$(id).addEventListener('input',()=>calculatePrices(false)));
    $('imageUrl').addEventListener('input',e=>renderImage(e.target.value));
    $('calculatePrices').addEventListener('click',()=>calculatePrices(true));
    $('acceptPrices').addEventListener('click',acceptPrices);
    $('addBottleForm').addEventListener('submit',save);
    calculatePrices(false);
  }
  init();
})();
