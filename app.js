(async function(){
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('load', () => { if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); });

  const DEFAULT_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1yQxI1LA53T40lgn1ZZ_9RmljQsDgjYLmlC0xDlNU1dQ8RZQJQ2J-8h5he3nBdA/pub?gid=863343549&single=true&output=csv';
  const $ = (id) => document.getElementById(id);
  const grid = $('catalogueGrid');
  const search = $('search');
  const categoryFilter = $('categoryFilter');
  const occasionFilter = $('occasionFilter');
  const collectionFilter = $('collectionFilter');
  const sortBy = $('sortBy');
  const resultCount = $('resultCount');
  const statCount = $('stat-count');
  const featuredGrid = $('featuredGrid');
  const floatingCart = $('floatingCart');
  const floatingCartCount = $('floatingCartCount');
  const floatingCartTotal = $('floatingCartTotal');
  const cart = [];
  let data = [];
  let packs = [];
  let settings = {};

  async function getJson(file, fallback){
    try { const res = await fetch(file, { cache: 'no-store' }); if(!res.ok) throw new Error(res.status); return await res.json(); }
    catch(error){ console.error('Could not load ' + file, error); return fallback; }
  }

  async function getCsv(url){
    const noCacheUrl = url + (url.includes('?') ? '&' : '?') + 'cacheBust=' + Date.now();
    try {
      const res = await fetch(noCacheUrl, { cache: 'no-store', redirect: 'follow' });
      if(!res.ok) throw new Error('Google Sheet returned ' + res.status);
      const text = await res.text();
      if (text && text.trim()) return text;
      throw new Error('Google Sheet returned an empty CSV');
    } catch (fetchError) {
      console.warn('CSV fetch failed, trying Google Sheets JSONP fallback', fetchError);
      return await getCsvViaGviz(url);
    }
  }

  function getCsvViaGviz(url){
    return new Promise((resolve, reject) => {
      const match = url.match(/\/d\/e\/([^/]+)\/pub/);
      const gidMatch = url.match(/[?&]gid=([^&]+)/);
      if (!match || !gidMatch) return reject(new Error('Could not read published Google Sheet ID or gid from settings.json'));
      const sheetId = match[1];
      const gid = gidMatch[1];
      const callbackName = '__deadendSheetCallback_' + Date.now();
      const script = document.createElement('script');
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Google Sheets JSONP fallback timed out'));
      }, 12000);
      function cleanup(){
        clearTimeout(timeout);
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch(e) { window[callbackName] = undefined; }
      }
      window[callbackName] = (response) => {
        try {
          const table = response && response.table;
          if (!table || !Array.isArray(table.cols) || !Array.isArray(table.rows)) throw new Error('Invalid Google Sheets table response');
          const rows = [];
          rows.push(table.cols.map(col => col.label || col.id || '').join(','));
          table.rows.forEach(row => {
            const cells = (row.c || []).map(cell => csvEscape(cell ? (cell.f || cell.v || '') : ''));
            rows.push(cells.join(','));
          });
          cleanup();
          resolve(rows.join('\n'));
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      script.onerror = () => { cleanup(); reject(new Error('Google Sheets JSONP script could not load')); };
      script.src = `https://docs.google.com/spreadsheets/d/e/${encodeURIComponent(sheetId)}/gviz/tq?gid=${encodeURIComponent(gid)}&tqx=responseHandler:${callbackName}`;
      document.head.appendChild(script);
    });
  }

  function csvEscape(value){
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function parseCsv(text){
    const rows=[]; let row=[]; let cell=''; let quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i], next=text[i+1];
      if(ch==='"' && quoted && next==='"'){ cell+='"'; i++; continue; }
      if(ch==='"'){ quoted=!quoted; continue; }
      if(ch===',' && !quoted){ row.push(cell); cell=''; continue; }
      if((ch==='\n'||ch==='\r') && !quoted){ if(ch==='\r'&&next==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=''; continue; }
      cell+=ch;
    }
    if(cell || row.length){ row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => String(c || '').trim() !== ''));
  }

  const cleanHeader = h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  function get(row, keys){
    for(const key of keys){ const val=row[cleanHeader(key)]; if(val !== undefined && String(val).trim() !== '') return String(val).trim(); }
    return '';
  }
  function moneyText(value){
    const v=String(value || '').trim(); if(!v) return ''; if(/^n\/?a$/i.test(v)) return 'N/A'; if(v.includes('$')) return v;
    const num=v.match(/\d+(?:\.\d{1,2})?/); return num ? '$' + num[0].replace(/\.00$/,'') : v;
  }
  function truthy(value){ return ['true','yes','y','1','x'].includes(String(value || '').trim().toLowerCase()); }
  function toIsoDate(value){
    const raw=String(value || '').trim(); if(!raw) return ''; if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parts=raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if(parts){ const d=parts[1].padStart(2,'0'), m=parts[2].padStart(2,'0'), y=parts[3].length===2?'20'+parts[3]:parts[3]; return `${y}-${m}-${d}`; }
    const date=new Date(raw); return Number.isNaN(date.getTime()) ? raw : date.toISOString().slice(0,10);
  }

  function normaliseCollection(value, house){
    const raw = String(value || '').trim();
    if (raw) return raw;
    const h = String(house || '').toLowerCase();
    const inspired = ['jalu','bujairami','maison alhambra','french avenue','fragrance world','flavia','palermo','riiffs','riffs','paris corner'];
    const middleEastern = ['lattafa','ahmed al maghrabi','ahmed al maghribi','rayhaan','swiss arabian','afnan','armaf','assaf','ibraheem alqurashi','junaid','rasasi'];
    const niche = ['xerjoff','mancera','mfk','maison francis kurkdjian','parfums de marly','amouage','roja','goldfield','penhaligon'];
    const designer = ['hugo boss','azzaro','issey miyake','giorgio armani','armani','paco rabanne','rabanne','ralph lauren','viktor&rolf','valentino','carolina herrera'];
    if (inspired.some(x => h.includes(x))) return 'Inspired By';
    if (middleEastern.some(x => h.includes(x))) return 'Middle Eastern';
    if (niche.some(x => h.includes(x))) return 'Original Niche';
    if (designer.some(x => h.includes(x))) return 'Original Designer';
    return 'Inspired By';
  }

  function shouldShowInspiration(f){
    const c = String(f.collection || '').toLowerCase();
    const insp = String(f.inspiration || '').trim();
    const clean = insp.toLowerCase();
    const hasRealInspiration = !!insp && clean !== 'original' && clean !== 'unique' && !clean.includes('original creation');
    if (!hasRealInspiration) return false;
    if (c.includes('designer') || c.includes('niche')) return false;
    if (c.includes('middle')) return true;
    return c.includes('inspired') || c.includes('dupe') || c.includes('clone');
  }

  function collectionClass(collection){
    const c = String(collection || '').toLowerCase();
    if (c.includes('designer')) return 'designer';
    if (c.includes('niche')) return 'niche';
    if (c.includes('middle')) return 'middle';
    if (c.includes('inspired') || c.includes('dupe') || c.includes('clone')) return 'inspired';
    return 'other';
  }

  function csvToFragrances(csvText){
    const rows=parseCsv(csvText); if(!rows.length) return [];
    const headers=rows[0].map(cleanHeader);
    return rows.slice(1).map(cols => {
      const row={}; headers.forEach((h,i)=>row[h]=cols[i]||'');
      const name=get(row,['Fragrance','Name','Fragrance Name']);
      const house=get(row,['House','Fragrance House']);
      const inspirationHouse=get(row,['Inspiration House','Inspired House']);
      const inspirationName=get(row,['Inspiration','Inspired By']);
      const inspiration=[inspirationHouse,inspirationName].filter(Boolean).join(' - ') || inspirationName || 'Original';
      const gender=get(row,['Gender']);
      const collection=normaliseCollection(get(row,['Collection','Category']), house);
      const category=get(row,['Scent Style','ScentStyle','Profile']) || 'Other';
      const occasion=get(row,['Occasion']) || get(row,['Season']) || 'Anytime';
      const concentration=get(row,['Concentration']);
      const desc=get(row,['Description','Notes']);
      const notes=[desc, concentration ? `${concentration} concentration.` : '', gender && gender.toLowerCase()==='women' ? `Women's scent.` : ''].filter(Boolean).join(' ');
      return {
        name, house, inspiration, inspirationHouse, collection, category, gender, notes,
        emojis:get(row,['Emojis','Emoji']) || '✨',
        p3:moneyText(get(row,['3mL','3 ml','3'])),
        p5:moneyText(get(row,['5mL','5 ml','5'])),
        p10:moneyText(get(row,['10mL','10 ml','10'])),
        fragranticaUrl:get(row,['Fragrantica','Fragrantica URL','Fragrantica Link']),
        addedDate:toIsoDate(get(row,['Added Date','Date Added','Added'])),
        featured:truthy(get(row,['Featured'])),
        featuredStart:toIsoDate(get(row,['Featured Start','Feature Start','Featured Date','Feature Date','Fragrance of the Week Start'])),
        featuredNote:get(row,['Featured Note','Feature Note','Promo Note']),
        staffPick:truthy(get(row,['Staff Pick','StaffPick','Nick Pick'])),
        season:get(row,['Season']),
        occasion,
        stock:get(row,['Stock']),
        status:get(row,['Status']) || 'In stock'
      };
    }).filter(f => f.name);
  }

  async function init(){
    const [loadedSettings, loadedPacks] = await Promise.all([getJson('settings.json', {}), getJson('packs.json', [])]);
    settings=loadedSettings || {}; packs=Array.isArray(loadedPacks) ? loadedPacks : [];
    try { data=csvToFragrances(await getCsv(settings.catalogueCsvUrl || DEFAULT_CSV)); }
    catch(error){ console.error(error); if(grid) grid.innerHTML='<div class="empty">Catalogue could not load from Google Sheets. Check the published CSV link or republish the Catalogue tab.<br><small>' + escapeHtml(error.message || error) + '</small></div>'; return; }
    if(!data.length){ if(grid) grid.innerHTML='<div class="empty">Catalogue is empty. Check the Catalogue tab headers.</div>'; return; }
    if(statCount) statCount.textContent=data.length;
    resetOptions(categoryFilter,'All scent styles',uniqueValues('category'));
    resetOptions(collectionFilter,'All types',uniqueValues('collection'));
    resetOptions(occasionFilter,'All occasions',uniqueMultiValues('occasion'));
    setupContactLinks(); setupAnalytics(); renderFeatured(); renderPacks(); render(); updateCart();
  }

  function uniqueValues(key){ return [...new Set(data.map(x=>x[key]).filter(Boolean))].sort(); }
  function uniqueMultiValues(key){ const values=new Set(); data.forEach(x=>String(x[key]||'').split(',').map(v=>v.trim()).filter(Boolean).forEach(v=>values.add(v))); return [...values].sort(); }
  function resetOptions(select, allLabel, values){ if(!select) return; select.innerHTML=`<option value="all">${allLabel}</option>`; values.forEach(v=>{ const opt=document.createElement('option'); opt.value=v; opt.textContent=v; select.appendChild(opt); }); }
  function fieldContains(value, selected){ if(selected==='all') return true; return String(value||'').split(',').map(v=>v.trim()).includes(selected) || String(value||'')===selected; }
  function match(f){
    const q=search.value.trim().toLowerCase();
    const combined=[f.name,f.house,f.inspiration,f.collection,f.category,f.occasion,f.season,f.notes,f.emojis,f.gender].join(' ').toLowerCase();
    return fieldContains(f.category,categoryFilter.value) && fieldContains(f.collection,collectionFilter.value) && fieldContains(f.occasion,occasionFilter.value) && (!q || combined.includes(q));
  }
  function isNewArrival(f){
    const raw=f.addedDate; if(!raw) return false; const added=new Date(raw); if(Number.isNaN(added.getTime())) return false;
    const days=Number(settings.newArrivalDays || 45); return (Date.now()-added.getTime()) <= days*24*60*60*1000;
  }
  function inspirationHouse(f){ if(f.inspirationHouse) return f.inspirationHouse; const insp=String(f.inspiration||'').trim(); if(!insp || insp.toLowerCase()==='original' || insp.toLowerCase().includes('original creation') || insp.toLowerCase()==='unique') return ''; return insp.split(' - ')[0].trim(); }
  function parseMoney(value){ const text=String(value||'').trim(); const matches=[...text.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)]; if(matches.length) return Number(matches[matches.length-1][1]); const plain=text.match(/^(\d+(?:\.\d{1,2})?)$/); return plain?Number(plain[1]):0; }

  function money(value){
    const rounded = Math.round(Number(value || 0) * 100) / 100;
    return '$' + (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2));
  }
  function featuredStart(f){
    const raw = f.featuredStart || f.featureStart || f.featuredDate || f.addedDate;
    const date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  }
  function isFeaturedDiscountActive(f){
    if (!f || !f.featured) return false;
    const start = featuredStart(f);
    if (!start) return true;
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }
  function discountEndsText(f){
    const start = featuredStart(f);
    if (!start) return '20% off this featured fragrance';
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const left = end.getTime() - Date.now();
    if (left <= 0) return 'Weekly discount ended';
    const days = Math.floor(left / (24 * 60 * 60 * 1000));
    const hours = Math.floor((left % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return days > 0 ? `Ends in ${days}d ${hours}h` : `Ends in ${hours}h`;
  }
  function discountedPriceText(price, f){
    const original = parseMoney(price);
    if (!original || !isFeaturedDiscountActive(f)) return String(price || '').trim();
    return money(original * 0.8);
  }
  function firstAvailablePrice(f){ return [f.p3,f.p5,f.p10].map(parseMoney).find(n=>n>0)||0; }
  function newDateValue(f){ const date=f.addedDate?new Date(f.addedDate):null; return date&&!Number.isNaN(date.getTime())?date.getTime():0; }
  function sortFragrances(items){
    const mode=sortBy?sortBy.value:'newest'; const sorted=[...items];
    const byText=getter=>sorted.sort((a,b)=>String(getter(a)||'').localeCompare(String(getter(b)||''),undefined,{sensitivity:'base'}) || String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}));
    if(mode==='house') return byText(x=>x.house); if(mode==='inspirationHouse') return byText(inspirationHouse); if(mode==='priceLow') return sorted.sort((a,b)=>firstAvailablePrice(a)-firstAvailablePrice(b) || a.name.localeCompare(b.name)); if(mode==='priceHigh') return sorted.sort((a,b)=>firstAvailablePrice(b)-firstAvailablePrice(a) || a.name.localeCompare(b.name)); if(mode==='newest') return sorted.sort((a,b)=>newDateValue(b)-newDateValue(a) || a.name.localeCompare(b.name)); return byText(x=>x.name);
  }

  function renderFeatured(){
    if(!featuredGrid) return;
    const f = data.find(x => x.featured) || data.find(x => x.staffPick) || data.find(isNewArrival) || data[0];
    if(!f){ featuredGrid.innerHTML = '<div class="empty">No featured fragrance available.</div>'; return; }
    const active = isFeaturedDiscountActive(f);
    const inspirationLine = shouldShowInspiration(f) ? `<p class="featured-inspo">Inspired by <strong>${escapeHtml(f.inspiration)}</strong></p>` : `<p class="featured-inspo">${escapeHtml(f.collection || 'Featured fragrance')}</p>`;
    const note = f.featuredNote || f.notes || 'This week’s highlighted fragrance.';
    featuredGrid.innerHTML = `
      <article class="featured-card weekly-card ${active ? 'discount-active' : ''}">
        <div class="featured-main">
          <div class="featured-mark">${escapeHtml(f.emojis || '✨')}</div>
          <div>
            <div class="featured-label">Fragrance of the Week</div>
            <h3>${escapeHtml(f.name)}</h3>
            <p class="featured-house">${escapeHtml(f.house || '')}</p>
            <div class="collection-pill ${collectionClass(f.collection)}">${escapeHtml(f.collection || 'Type')}</div>
            ${inspirationLine}
            <p class="featured-desc">${escapeHtml(note)}</p>
          </div>
        </div>
        <div class="weekly-offer">
          <div class="offer-kicker">${active ? '20% off this week' : 'Featured pick'}</div>
          <div class="offer-main">${active ? 'Auto-discount applied' : 'Normal pricing'}</div>
          <div class="offer-ends">${escapeHtml(discountEndsText(f))}</div>
          <div class="featured-actions">
            ${priceButton(f,'3mL',f.p3)}${priceButton(f,'5mL',f.p5)}${priceButton(f,'10mL',f.p10)}
          </div>
        </div>
      </article>`;
    attachCardListeners();
  }

  function render(){
    const filtered=sortFragrances(data.filter(match)); resultCount.textContent=filtered.length; grid.innerHTML='';
    if(!filtered.length){ grid.innerHTML='<div class="empty">No fragrances match that search. Try “fresh”, “vanilla”, “date” or “summer”.</div>'; return; }
    const frag=document.createDocumentFragment();
    filtered.forEach(f=>{
      const card=document.createElement('article'); card.className=isNewArrival(f)?'card new-card':'card';
      const linkLabel=f.fragranticaUrl && !f.fragranticaUrl.includes('/search/') ? 'Fragrantica page' : 'Fragrantica search';
      card.innerHTML=`
        <div class="card-top"><span class="emoji">${escapeHtml(f.emojis || '✨')}</span><span class="badge-row">${isNewArrival(f)?'<span class="new-badge">New</span>':''}${f.staffPick?'<span class="new-badge staff">Pick</span>':''}</span></div>
        <h3>${escapeHtml(f.name)}</h3>
        <div class="collection-pill ${collectionClass(f.collection)}">${escapeHtml(f.collection || 'Type')}</div>
        <div class="meta-lines">
          <p class="house"><span>House</span>${escapeHtml(f.house || '')}</p>
          ${shouldShowInspiration(f) ? `<p class="inspo"><span>Inspired by</span>${escapeHtml(f.inspiration)}</p>` : ''}
        </div>
        <p class="desc">${escapeHtml(f.notes || '')}</p>
        <div class="prices">${priceButton(f,'3mL',f.p3)}${priceButton(f,'5mL',f.p5)}${priceButton(f,'10mL',f.p10)}</div>
        <div class="card-links">${f.fragranticaUrl?`<a class="mini-link" href="${escapeAttr(f.fragranticaUrl)}" target="_blank" rel="noopener">${linkLabel}</a>`:''}<button class="mini-button" data-copy="${escapeAttr(f.name)}">Copy name</button></div>`;
      frag.appendChild(card);
    });
    grid.appendChild(frag); attachCardListeners();
  }
  function priceButton(f,size,price){
    const clean=String(price||'').trim();
    const disabled=!clean || clean.toUpperCase()==='N/A';
    if(disabled) return `<div class="price-unavailable"><strong>N/A</strong><span>${size}</span></div>`;
    const discounted = discountedPriceText(clean, f);
    const active = discounted !== clean;
    const priceMarkup = active ? `<strong><s>${escapeHtml(clean)}</s> ${escapeHtml(discounted)}</strong>` : `<strong>${escapeHtml(clean)}</strong>`;
    return `<button class="price-add ${active?'weekly-discount':''}" type="button" data-name="${escapeAttr(f.name)}" data-house="${escapeAttr(f.house||'')}" data-size="${size}" data-price="${escapeAttr(discounted)}" data-original-price="${escapeAttr(clean)}">${priceMarkup}<span>${size}</span><small>${active?'20% off':'Add'}</small></button>`;
  }
  function attachCardListeners(){
    document.querySelectorAll('[data-copy]').forEach(btn=>{ if(btn.dataset.bound) return; btn.dataset.bound='1'; btn.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent='Copied'; setTimeout(()=>btn.textContent='Copy name',1200); }catch(e){} }); });
    document.querySelectorAll('.price-add').forEach(btn=>{ if(btn.dataset.bound) return; btn.dataset.bound='1'; btn.addEventListener('click',()=>{ addToCart({type:'sample',name:btn.dataset.name,house:btn.dataset.house,size:btn.dataset.size,price:btn.dataset.price}); btn.classList.add('added'); const old=btn.querySelector('small').textContent; btn.querySelector('small').textContent='Added'; setTimeout(()=>{btn.classList.remove('added'); btn.querySelector('small').textContent=old;},900); }); });
  }
  function renderPacks(){
    const packsGrid=$('packsGrid'); if(!packsGrid || !packs.length) return; packsGrid.innerHTML='';
    packs.forEach(pack=>{ const div=document.createElement('article'); div.className='pack-card'; const itemLines=Array.isArray(pack.items)&&pack.items.length?pack.items.map(i=>`<li>${escapeHtml(i)}</li>`).join(''):'<li>Choose from any available catalogue fragrance</li><li>Add the pack, then list your picks in the order message</li>'; div.innerHTML=`<span class="pack-emoji">${escapeHtml(pack.emojis||'🧪')}</span><h3>${escapeHtml(pack.name)}</h3><p>${escapeHtml(pack.desc||'')}</p><strong>${escapeHtml(pack.price)}</strong><ul>${itemLines}</ul><button class="button pack-add" type="button" data-pack="${escapeAttr(pack.name)}" data-price="${escapeAttr(pack.price)}">Add pack</button>`; packsGrid.appendChild(div); });
    document.querySelectorAll('.pack-add').forEach(btn=>{ if(btn.dataset.bound) return; btn.dataset.bound='1'; btn.addEventListener('click',()=>{ addToCart({type:'pack',name:btn.dataset.pack,size:'Pack',price:btn.dataset.price,house:'Choose fragrances in message'}); btn.textContent='Added to cart'; setTimeout(()=>btn.textContent='Add pack',1000); }); });
  }
  function addToCart(item){ cart.push(item); updateCart(); }
  function buildOrderMessage(){
    const postage=Number(settings.expressPostage||10); if(!cart.length) return `Hi DeadEnd Scents, I’d like to order some samples:\n\nNo samples added yet.\n\nPostage: $${postage} express postage Australia wide\nPackaging: glass vials\n\nDelivery name/address:`;
    const lines=cart.map((item,idx)=>`${idx+1}. ${item.name}${item.house?' - '+item.house:''} — ${item.size} (${item.price})`); const samples=cart.reduce((sum,item)=>sum+parseMoney(item.price),0); const total=samples+postage;
    return `Hi DeadEnd Scents, I’d like to order these samples:\n\n${lines.join('\n')}\n\nSamples total: ${formatMoney(samples)}\nExpress postage: ${formatMoney(postage)}\nEstimated total: ${formatMoney(total)}\n\nPack selections (if using a flexible pack):\n\nDelivery name/address:`;
  }
  function updateCart(){
    const cartItems=$('cartItems'), orderText=$('orderText'), cartTotal=$('cartTotal'), sendWhatsappCart=$('sendWhatsappCart'); const postage=Number(settings.expressPostage||10); const samples=cart.reduce((sum,item)=>sum+parseMoney(item.price),0); const total=cart.length?samples+postage:0; cartTotal.textContent=formatMoney(total); if(floatingCartCount) floatingCartCount.textContent=String(cart.length); if(floatingCartTotal) floatingCartTotal.textContent=formatMoney(total); if(floatingCart) floatingCart.classList.toggle('has-items', cart.length>0);
    if(!cart.length){ cartItems.className='cart-items empty-cart'; cartItems.innerHTML='No samples added yet.'; }
    else { cartItems.className='cart-items'; cartItems.innerHTML=cart.map((item,idx)=>`<div class="cart-line"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.size)} · ${escapeHtml(item.price)}${item.house?` · ${escapeHtml(item.house)}`:''}</span></div><button type="button" class="remove-item" data-index="${idx}" aria-label="Remove ${escapeAttr(item.name)}">×</button></div>`).join(''); document.querySelectorAll('.remove-item').forEach(btn=>btn.addEventListener('click',()=>{ cart.splice(Number(btn.dataset.index),1); updateCart(); })); }
    const message=buildOrderMessage(); orderText.value=message; if(sendWhatsappCart){ const base=(settings.whatsAppUrl||'https://wa.me/61434432948').split('?')[0]; sendWhatsappCart.href=`${base}?text=${encodeURIComponent(message)}`; }
  }
  function formatMoney(value){ return `$${Math.round(value*100)/100}`.replace('.00',''); }
  function escapeHtml(value){ return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(value){ return escapeHtml(value).replace(/`/g,'&#96;'); }
  function setupContactLinks(){ ['messengerLink','heroMessengerLink'].forEach(id=>{ const el=$(id); if(el&&settings.facebookMessengerUrl) el.href=settings.facebookMessengerUrl; }); ['whatsappLink','heroWhatsappLink'].forEach(id=>{ const el=$(id); if(el&&settings.whatsAppUrl) el.href=settings.whatsAppUrl; }); ['instagramLink','heroInstagramLink'].forEach(id=>{ const el=$(id); if(el&&settings.instagramUrl) el.href=settings.instagramUrl; }); }
  function setupAnalytics(){
    if(settings.googleAnalyticsId){ const ga=document.createElement('script'); ga.async=true; ga.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.googleAnalyticsId)}`; document.head.appendChild(ga); window.dataLayer=window.dataLayer||[]; function gtag(){dataLayer.push(arguments);} window.gtag=gtag; gtag('js',new Date()); gtag('config',settings.googleAnalyticsId); }
    if(settings.microsoftClarityId){ (function(c,l,a,r,i,t,y){ c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)}; t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i; y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y); })(window,document,'clarity','script',settings.microsoftClarityId); }
  }
  [search,categoryFilter,collectionFilter,occasionFilter,sortBy].filter(Boolean).forEach(el=>el.addEventListener('input',render));
  $('copyOrder').addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText($('orderText').value); $('copyOrder').textContent='Copied'; setTimeout(()=>$('copyOrder').textContent='Copy order message',1400); }catch(e){ $('orderText').select(); document.execCommand('copy'); } });
  const clearCart=$('clearCart'); if(clearCart) clearCart.addEventListener('click',()=>{ cart.length=0; updateCart(); });
  if(floatingCart) floatingCart.addEventListener('click',()=>{ const order=$('order'); if(order) order.scrollIntoView({behavior:'smooth',block:'start'}); });
  init();
})();
