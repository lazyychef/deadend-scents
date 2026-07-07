(function(){
  const $ = (id) => document.getElementById(id);
  const state = { settings:null, items:[] };
  const money = (n) => Number.isFinite(n) ? '$' + n.toFixed(0) : '$0';

  function parseCSV(text){
    const rows = [];
    let row = [], cell = '', quote = false;
    for(let i=0;i<text.length;i++){
      const c = text[i], n = text[i+1];
      if(c === '"' && quote && n === '"'){ cell += '"'; i++; continue; }
      if(c === '"'){ quote = !quote; continue; }
      if(c === ',' && !quote){ row.push(cell); cell=''; continue; }
      if((c === '\n' || c === '\r') && !quote){
        if(c === '\r' && n === '\n') i++;
        row.push(cell); cell='';
        if(row.some(v => String(v).trim() !== '')) rows.push(row);
        row=[];
        continue;
      }
      cell += c;
    }
    row.push(cell);
    if(row.some(v => String(v).trim() !== '')) rows.push(row);
    if(!rows.length) return [];
    const headers = rows.shift().map(h => h.trim());
    return rows.map(r => Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
  }

  async function loadSettings(){
    const res = await fetch('../settings.json', { cache:'no-store' });
    state.settings = await res.json();
    try{
      const endpoint = state.settings.adminWriteEndpoint;
      if(endpoint){
        const liveUrl = endpoint + (endpoint.includes('?') ? '&' : '?') + 'action=settings&t=' + Date.now();
        const live = await fetch(liveUrl, { cache:'no-store' }).then(r=>r.json());
        state.settings = Object.assign({}, state.settings, live.settings || {});
      }
    }catch(e){ console.warn('Live settings unavailable, using settings.json fallback', e); }
    renderSettings();
  }

  async function loadCatalogue(){
    let items = [];
    try{
      const url = state.settings && state.settings.catalogueCsvUrl;
      if(url){
        const res = await fetch(url, { cache:'no-store' });
        if(res.ok) items = parseCSV(await res.text());
      }
    }catch(e){}
    if(!items.length){
      try{
        const fallback = await fetch('../catalogue-fallback.json', { cache:'no-store' }).then(r=>r.json());
        items = fallback.items || [];
      }catch(e){}
    }
    state.items = items.filter(item => ((item.Stock || item.Status) || '').toLowerCase() !== 'hidden');
    renderDashboard();
  }

  function isNew(item){
    const raw = item['New'] || item['New Arrival'] || item['Recently Added'] || '';
    if(String(raw).toLowerCase() === 'true' || String(raw).toLowerCase() === 'yes' || String(raw) === '1') return true;
    const days = Number(state.settings?.newArrivalDays || 45);
    const d = new Date(item['Added Date'] || item['Purchase Date'] || '');
    if(!Number.isFinite(d.getTime())) return false;
    return ((Date.now() - d.getTime()) / 86400000) <= days;
  }

  function amountLeft(item){
    const keys = ['Current Amount Left (mL)','Current mL','Amount Left','Amount Left mL','Remaining mL','Current Amount Left'];
    for(const key of keys){
      const v = Number(String(item[key] || '').replace(/[^0-9.]/g,''));
      if(Number.isFinite(v) && v > 0) return v;
    }
    return null;
  }

  function price(item, key){
    return Number(String(item[key] || '').replace(/[^0-9.]/g,'')) || 0;
  }

  function displayName(item){
    return [item.House, item.Fragrance].filter(Boolean).join(' · ') || item.Fragrance || item.House || item.ID || 'Untitled';
  }

  function renderDashboard(){
    const items = state.items;
    const threshold = Number(state.settings?.lowStockThreshold || 20);
    const low = items.filter(i => { const ml = amountLeft(i); return ml !== null && ml > 0 && ml <= threshold; });
    const out = items.filter(i => /out/i.test(i.Status || '') || amountLeft(i) === 0);
    const newest = items.filter(isNew).slice(0,8);

    $('statTotal').textContent = items.length;
    $('statNew').textContent = newest.length;
    $('statLow').textContent = low.length;
    $('statOut').textContent = out.length;

    $('inventoryList').innerHTML = items.slice(0,12).map(item => {
      const ml = amountLeft(item);
      const p10 = price(item,'10mL');
      const possible = ml !== null ? Math.floor(ml / 10) : null;
      const value = possible !== null ? possible * p10 : 0;
      return `<div class="mini-row"><div><strong>${escapeHtml(displayName(item))}</strong><span>${escapeHtml(item.Collection || 'Catalogue')} · ${escapeHtml(item.Stock || item.Status || 'Status unknown')}</span></div><em class="pill">${ml === null ? 'mL not set' : ml + 'mL · ' + money(value)}</em></div>`;
    }).join('') || '<div class="empty">No catalogue rows found.</div>';

    $('lowStockList').innerHTML = low.slice(0,12).map(item => `<div class="mini-row"><div><strong>${escapeHtml(displayName(item))}</strong><span>${escapeHtml(item.Collection || '')}</span></div><em class="pill">${amountLeft(item)}mL left</em></div>`).join('') || '<div class="empty">No low stock rows found. This needs Current mL / Amount Left values in the sheet.</div>';

    $('newArrivalList').innerHTML = newest.map(item => `<div class="mini-row"><div><strong>${escapeHtml(displayName(item))}</strong><span>${escapeHtml(item.Collection || '')}</span></div><em class="pill">New</em></div>`).join('') || '<div class="empty">No rows marked as New yet.</div>';
  }

  function renderSettings(){
    if(!state.settings) return;
    const keys = ['catalogueCsvUrl','discoveryPacksCsvUrl','settingsCsvUrl','adminWriteEndpoint','facebookMessengerUrl','whatsAppUrl','instagramUrl'];
    $('settingsList').innerHTML = keys.map(k => `<div class="setting-row"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(String(state.settings[k] || ''))}</span></div>`).join('');
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  async function init(){
    await loadSettings();
    await loadCatalogue();
  }
  $('refreshData').addEventListener('click', loadCatalogue);
  init();
})();
