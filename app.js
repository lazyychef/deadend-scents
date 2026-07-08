(async function(){
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('load', () => { if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); });

  const MASTER_SHEET_ID = '1GSW1Bytauoi53o4orbojoZl9K-ixL4Y4Mj6NyehzCrc';
  const DEFAULT_CSV = `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Catalogue`;
  const DEFAULT_PACKS_CSV = `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Discovery%20Packs`;
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
  let catalogueSource = 'live';
  let quickSpecialFilter = 'all';

  async function getJson(file, fallback){
    try { const res = await fetch(file, { cache: 'no-store' }); if(!res.ok) throw new Error(res.status); return await res.json(); }
    catch(error){ console.error('Could not load ' + file, error); return fallback; }
  }

  async function getText(file){
    const res = await fetch(file, { cache: 'no-store' });
    if(!res.ok) throw new Error(file + ' returned ' + res.status);
    const text = await res.text();
    if(!text || !text.trim()) throw new Error(file + ' is empty');
    return text;
  }

  async function getCsv(url){
    const errors = [];
    const noCacheUrl = url + (url.includes('?') ? '&' : '?') + 'cacheBust=' + Date.now();
    try {
      const res = await fetch(noCacheUrl, { cache: 'no-store', redirect: 'follow' });
      if(!res.ok) throw new Error('Google Sheet returned ' + res.status);
      const text = await res.text();
      if (text && text.trim()) { catalogueSource = 'live'; saveCatalogueCache(text); return text; }
      throw new Error('Google Sheet returned an empty CSV');
    } catch (fetchError) {
      errors.push(fetchError.message || String(fetchError));
      console.warn('CSV fetch failed, trying Google Sheets JSONP fallback', fetchError);
    }

    try {
      const text = await getCsvViaGviz(url);
      catalogueSource = 'jsonp';
      saveCatalogueCache(text);
      return text;
    } catch (jsonpError) {
      errors.push(jsonpError.message || String(jsonpError));
      console.warn('Google Sheets JSONP fallback failed, trying local backup', jsonpError);
    }

    try {
      const text = await getLocalCatalogueBackup();
      catalogueSource = text.source;
      return text.csv;
    } catch (backupError) {
      errors.push(backupError.message || String(backupError));
      throw new Error('Catalogue could not load from live Google Sheets, JSONP, local backup, or browser cache. ' + errors.join(' | '));
    }
  }


  async function getSheetCsvOnly(url){
    const noCacheUrl = url + (url.includes('?') ? '&' : '?') + 'cacheBust=' + Date.now();
    try {
      const res = await fetch(noCacheUrl, { cache: 'no-store', redirect: 'follow' });
      if(!res.ok) throw new Error('Google Sheet returned ' + res.status);
      const text = await res.text();
      if(text && text.trim()) return text;
      throw new Error('Google Sheet returned an empty CSV');
    } catch(fetchError) {
      console.warn('Sheet CSV fetch failed, trying JSONP', fetchError);
    }
    return await getCsvViaGviz(url);
  }

  async function getLocalCatalogueBackup(){
    const backupFile = settings.catalogueFallbackFile || 'catalogue-fallback.json';
    try {
      const raw = await getText(backupFile);
      const trimmed = raw.trim();
      if(trimmed.startsWith('[') || trimmed.startsWith('{')){
        const parsed = JSON.parse(trimmed);
        const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
        if(!items.length) throw new Error(backupFile + ' has no catalogue items');
        return { source: 'backup-file', csv: fragrancesToCsv(items) };
      }
      return { source: 'backup-file', csv: raw };
    } catch(fileError){
      console.warn('Local catalogue backup file failed', fileError);
    }
    try {
      const cached = localStorage.getItem('deadend_catalogue_csv_cache_v1');
      if(cached && cached.trim()) return { source: 'browser-cache', csv: cached };
    } catch(e) {}
    throw new Error('No usable local catalogue backup found');
  }

  function saveCatalogueCache(csv){
    try { localStorage.setItem('deadend_catalogue_csv_cache_v1', csv); } catch(e) {}
  }

  function fragrancesToCsv(items){
    const headers=['ID','House','Fragrance','Collection','Scent Style','Gender','Main Accords','Emojis','Inspiration House','Inspired By','3mL','5mL','10mL','Fragrantica','Added Date','Featured','Featured Start','Featured Note','Staff Pick','Season','Occasion','Stock','Status'];
    const rows=[headers];
    items.forEach(item=>{
      rows.push(headers.map(h=>{
        const key = cleanHeader(h);
        const val = item[key] ?? item[h] ?? item[camelKey(h)] ?? '';
        return csvEscape(val);
      }));
    });
    return rows.map(r=>r.join(',')).join('\n');
  }

  function camelKey(label){
    return String(label || '').replace(/[^a-zA-Z0-9]+(.)/g,(_,c)=>c.toUpperCase()).replace(/^[A-Z]/,c=>c.toLowerCase());
  }

  function getCsvViaGviz(url){
    return new Promise((resolve, reject) => {
      const publishedMatch = url.match(/\/d\/e\/([^/]+)\//);
      const editMatch = url.match(/\/d\/([^/]+)\//);
      const sheetId = publishedMatch ? publishedMatch[1] : (editMatch ? editMatch[1] : '');
      const gidMatch = url.match(/[?&]gid=([^&]+)/);
      const sheetMatch = url.match(/[?&]sheet=([^&]+)/);
      const sheetName = sheetMatch ? decodeURIComponent(sheetMatch[1].replace(/\+/g,' ')) : '';
      if (!sheetId || (!gidMatch && !sheetName)) return reject(new Error('Could not read Google Sheet ID, gid, or sheet name from settings.json'));
      const gid = gidMatch ? gidMatch[1] : '';
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
      const base = publishedMatch ? `https://docs.google.com/spreadsheets/d/e/${encodeURIComponent(sheetId)}/gviz/tq` : `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq`;
      const params = gid ? `gid=${encodeURIComponent(gid)}` : `sheet=${encodeURIComponent(sheetName)}`;
      script.src = `${base}?${params}&tqx=responseHandler:${callbackName}`;
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
    if (raw) {
      const l=raw.toLowerCase();
      if(l.includes('designer')) return 'Designer';
      if(l.includes('niche')) return 'Niche';
      if(l.includes('middle')) return 'Middle Eastern';
      if(l.includes('inspired') || l.includes('dupe') || l.includes('clone')) return 'Inspired';
      return raw;
    }
    const h = String(house || '').toLowerCase();
    const inspired = ['jalu','bujairami','maison alhambra','french avenue','fragrance world','flavia','palermo','riiffs','riffs','paris corner'];
    const middleEastern = ['lattafa','ahmed al maghrabi','ahmed al maghribi','rayhaan','swiss arabian','afnan','armaf','assaf','ibraheem alqurashi','junaid','rasasi'];
    const niche = ['xerjoff','mancera','mfk','maison francis kurkdjian','parfums de marly','amouage','roja','goldfield','penhaligon'];
    const designer = ['hugo boss','azzaro','issey miyake','giorgio armani','armani','paco rabanne','rabanne','ralph lauren','viktor&rolf','valentino','carolina herrera'];
    if (inspired.some(x => h.includes(x))) return 'Inspired';
    if (middleEastern.some(x => h.includes(x))) return 'Middle Eastern';
    if (niche.some(x => h.includes(x))) return 'Niche';
    if (designer.some(x => h.includes(x))) return 'Designer';
    return 'Inspired';
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
        id:get(row,['ID','Id','SKU','Code']),
        name, house, inspiration, inspirationHouse, collection, category, gender, notes,
        accords:get(row,['Main Accords','Accords','Main accords','Scent Notes','Notes']) || category,
        emojis:get(row,['Emojis','Emoji']) || '✨',
        imageUrl:get(row,['Image','Image URL','Bottle Image URL','Bottle Image','BottleImageURL','Photo','Photo URL']),
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
        status:get(row,['Status']) || 'In stock',
        seoSlug:get(row,['SEO Slug','Slug']),
        seoTitle:get(row,['SEO Title','Meta Title']),
        seoDescription:get(row,['SEO Description','Meta Description']),
        seoIntro:get(row,['SEO Intro','SEO Introduction']),
        seoKeywords:get(row,['SEO Keywords']),
        seoFaq:get(row,['SEO FAQ','FAQ']),
        seoSimilar:get(row,['SEO Similar Fragrances','Similar Fragrances']),
        seoInternalLinks:get(row,['SEO Internal Links','Internal Links']),
        seoScore:get(row,['SEO Score'])
      };
    }).filter(f => f.name);
  }


  function sheetCsvUrl(sheetName){
    const id = settings.masterSheetId || MASTER_SHEET_ID;
    if(!id) return '';
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  }

  function getPackCsvUrl(){
    return settings.discoveryPacksCsvUrl || settings.packsCsvUrl || sheetCsvUrl('Discovery Packs') || DEFAULT_PACKS_CSV;
  }

  async function loadDiscoveryPacks(){
    try {
      const csv = await getSheetCsvOnly(getPackCsvUrl());
      const parsed = csvToPacks(csv);
      if(parsed.length) return parsed;
      throw new Error('Discovery Packs sheet returned no active packs');
    } catch(error) {
      console.warn('Discovery Packs sheet failed, using packs.json backup', error);
      const fallback = await getJson('packs.json', []);
      return Array.isArray(fallback) ? fallback : [];
    }
  }

  function csvToPacks(csvText){
    const rows=parseCsv(csvText); if(!rows.length) return [];
    const headers=rows[0].map(cleanHeader);
    const objects=rows.slice(1).map(cols=>{ const row={}; headers.forEach((h,i)=>row[h]=cols[i]||''); return row; });
    const groups = new Map();
    objects.forEach((row, idx)=>{
      const active = get(row,['Active','Visible','Show','Enabled']);
      const status = get(row,['Status']);
      if(active && ['no','false','0','hide','hidden','off'].includes(active.toLowerCase())) return;
      if(status && ['inactive','hidden','hide','off','no'].includes(status.toLowerCase())) return;
      const id = get(row,['Pack ID','PackID','ID','Pack Code']) || slugify(get(row,['Pack Name','Name','Title']) || ('pack-' + idx));
      if(!id) return;
      const key = id.toLowerCase();
      if(!groups.has(key)){
        groups.set(key, {
          id,
          title:get(row,['Pack Name','Name','Title']) || id,
          name:get(row,['Pack Name','Name','Title']) || id,
          emoji:get(row,['Emoji','Emojis']) || '🧪',
          emojis:get(row,['Emoji','Emojis']) || '🧪',
          tagline:get(row,['Tagline','Short Description','Subtitle']) || 'Curated discovery pack',
          description:get(row,['Description','Desc','Notes']) || '',
          discount:Number(get(row,['Discount','Discount %','Discount Percent']) || settings.packDiscountPercent || 15),
          sizeMl:Number(String(get(row,['Size mL','Size','Sample Size','mL']) || '3').replace(/[^0-9.]/g,'')) || 3,
          count:Number(get(row,['Count','Samples','Number of Samples']) || 0),
          items:[],
          itemNames:[],
          fallbackItems:[],
          fallbackNames:[]
        });
      }
      const pack = groups.get(key);
      const order = Number(get(row,['Order','Sort','Position']) || idx + 1);
      addPackTokens(pack.items, get(row,['Fragrance ID','FragranceID','Item ID','ItemID','Catalogue ID','CatalogueID','IDs','Items','Fragrance IDs']));
      addPackTokens(pack.itemNames, get(row,['Fragrance','Fragrance Name','Item','Items by Name','Names','Fragrances']));
      addPackTokens(pack.fallbackItems, get(row,['Fallback ID','FallbackID','Fallback IDs','Fallback Items']));
      addPackTokens(pack.fallbackNames, get(row,['Fallback','Fallback Name','Fallback Names']));
      pack._order = Math.min(pack._order ?? order, order);
    });
    return [...groups.values()]
      .map(pack=>{
        pack.items = uniqueTokens(pack.items);
        pack.itemNames = uniqueTokens(pack.itemNames);
        pack.fallbackItems = uniqueTokens(pack.fallbackItems);
        pack.fallbackNames = uniqueTokens(pack.fallbackNames);
        if(!pack.count) pack.count = pack.items.length || pack.itemNames.length || 3;
        return pack;
      })
      .filter(pack => pack.items.length || pack.itemNames.length)
      .sort((a,b)=>(a._order||999)-(b._order||999));
  }

  function addPackTokens(target, value){
    String(value || '')
      .split(/[\n;,|]+/)
      .map(v=>v.trim())
      .filter(Boolean)
      .forEach(v=>target.push(v));
  }

  function uniqueTokens(values){
    const seen=new Set();
    return values.filter(v=>{ const key=String(v).trim().toLowerCase(); if(!key || seen.has(key)) return false; seen.add(key); return true; });
  }

  function slugify(value){ return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
  function fragranceUrl(f){
    const siteUrl = String(settings.siteUrl || 'https://deadendscents.com').replace(/\/$/, '');
    const slug = f.seoSlug || slugify(`${f.house || ''} ${f.name || ''}`);
    return siteUrl + '/fragrances/' + slug + '/';
  }



  function castSettingValue(key, value){
    const numericKeys = new Set(['expressPostage','newArrivalDays','weeklyDiscountPercent','weeklyDiscountDays','packDiscountPercent']);
    if(numericKeys.has(key)){
      const n = Number(String(value || '').replace(/[^0-9.]/g,''));
      return Number.isFinite(n) ? n : value;
    }
    return value;
  }

  function settingKey(label){
    const k = cleanHeader(label);
    const map = {
      businessname:'businessName',
      tagline:'tagline',
      facebookmessengerurl:'facebookMessengerUrl',
      messengerurl:'facebookMessengerUrl',
      messenger:'facebookMessengerUrl',
      whatsappurl:'whatsAppUrl',
      whatsapp:'whatsAppUrl',
      instagramurl:'instagramUrl',
      instagram:'instagramUrl',
      expresspostage:'expressPostage',
      postage:'expressPostage',
      shippingcost:'expressPostage',
      defaultpostage:'expressPostage',
      shippingline:'shippingLine',
      shippingtext:'shippingLine',
      newbadgedays:'newArrivalDays',
      newarrivaldays:'newArrivalDays',
      weeklydiscount:'weeklyDiscountPercent',
      weeklydiscountpercent:'weeklyDiscountPercent',
      weeklydiscountpct:'weeklyDiscountPercent',
      weeklydiscountdays:'weeklyDiscountDays',
      packdiscount:'packDiscountPercent',
      packdiscountpercent:'packDiscountPercent',
      packdiscountpct:'packDiscountPercent',
      siteurl:'siteUrl',
      websiteurl:'siteUrl',
      googleanalyticsid:'googleAnalyticsId',
      ga4measurementid:'googleAnalyticsId',
      microsoftclarityid:'microsoftClarityId',
      clarityid:'microsoftClarityId',
      adminwriteendpoint:'adminWriteEndpoint',
      cataloguecsvurl:'catalogueCsvUrl',
      discoverypackscsvurl:'discoveryPacksCsvUrl',
      packscsvurl:'discoveryPacksCsvUrl',
      settingscsvurl:'settingsCsvUrl',
      fallbackcataloguefile:'catalogueFallbackFile',
      cataloguefallbackfile:'catalogueFallbackFile',
      mastersheetid:'masterSheetId'
    };
    return map[k] || (/^[a-z][a-z0-9]*$/i.test(String(label || '').trim()) ? String(label).trim() : '');
  }

  function csvToSettings(csvText){
    const rows = parseCsv(csvText); if(!rows.length) return {};
    const headers = rows[0].map(cleanHeader);
    const out = {};
    rows.slice(1).forEach(cols => {
      const row = {}; headers.forEach((h,i)=>row[h]=cols[i]||'');
      const label = get(row, ['Setting','Key','Name','Field']);
      const value = get(row, ['Value','Setting Value','Data']);
      if(!label || value === '') return;
      const key = settingKey(label);
      if(key) out[key] = castSettingValue(key, value);
    });
    return out;
  }

  async function loadLiveSettings(baseSettings){
    const endpoint = baseSettings.adminWriteEndpoint || baseSettings.settingsJsonEndpoint || '';
    if(endpoint){
      try {
        const url = endpoint + (endpoint.includes('?') ? '&' : '?') + 'action=settings&cacheBust=' + Date.now();
        const res = await fetch(url, { cache:'no-store', redirect:'follow' });
        if(res.ok){
          const json = await res.json();
          const live = json && json.settings ? json.settings : json;
          if(live && typeof live === 'object' && Object.keys(live).length) return Object.assign({}, baseSettings, live);
        }
      } catch(error){
        console.warn('Settings Apps Script read failed, trying Settings CSV', error);
      }
    }
    const url = baseSettings.settingsCsvUrl || baseSettings.sheetSettingsCsvUrl || sheetCsvUrl('Settings');
    if(!url) return baseSettings;
    try {
      const csv = await getSheetCsvOnly(url);
      const live = csvToSettings(csv);
      if(Object.keys(live).length) return Object.assign({}, baseSettings, live);
    } catch(error) {
      console.warn('Settings sheet could not load, using settings.json fallback', error);
    }
    return baseSettings;
  }

  async function init(){
    settings = await getJson('settings.json', {});
    settings = settings || {};
    if(!settings.masterSheetId) settings.masterSheetId = MASTER_SHEET_ID;
    settings = await loadLiveSettings(settings);
    if(!settings.masterSheetId) settings.masterSheetId = MASTER_SHEET_ID;
    try { data=csvToFragrances(await getCsv(settings.catalogueCsvUrl || sheetCsvUrl('Catalogue') || DEFAULT_CSV)); }
    catch(error){ console.error(error); if(grid) grid.innerHTML='<div class="empty">Catalogue could not load from Google Sheets or the local backup.<br><small>' + escapeHtml(error.message || error) + '</small></div>'; return; }
    if(!data.length){ if(grid) grid.innerHTML='<div class="empty">Catalogue is empty. Check the Catalogue tab headers.</div>'; return; }
    packs = await loadDiscoveryPacks();
    showCatalogueSourceNotice();
    if(statCount) statCount.textContent=data.length;
    resetOptions(categoryFilter,'All scent styles',uniqueValues('category'));
    resetOptions(collectionFilter,'All types',uniqueValues('collection'));
    resetOptions(occasionFilter,'All occasions',uniqueMultiValues('occasion'));
    setupContactLinks(); setupAnalytics(); injectSeoSchema(); applySearchQueryFromUrl(); renderFeatured(); renderPacks(); render(); updateCart();
    trackEvent('catalogue_loaded', { fragrance_count: data.length });
    setClarityTag('fragrance_count', data.length);
  }

  function uniqueValues(key){ return [...new Set(data.map(x=>x[key]).filter(Boolean))].sort(); }
  function uniqueMultiValues(key){ const values=new Set(); data.forEach(x=>String(x[key]||'').split(',').map(v=>v.trim()).filter(Boolean).forEach(v=>values.add(v))); return [...values].sort(); }
  function resetOptions(select, allLabel, values){ if(!select) return; select.innerHTML=`<option value="all">${allLabel}</option>`; values.forEach(v=>{ const opt=document.createElement('option'); opt.value=v; opt.textContent=v; select.appendChild(opt); }); }
  function showCatalogueSourceNotice(){
    if(catalogueSource === 'live' || catalogueSource === 'jsonp') return;
    const target = document.querySelector('.controls-wrap') || document.querySelector('main');
    if(!target || document.querySelector('.backup-notice')) return;
    const notice = document.createElement('div');
    notice.className = 'backup-notice';
    notice.innerHTML = catalogueSource === 'browser-cache'
      ? '<strong>Catalogue loaded from browser backup.</strong> Live Google Sheets may be blocked on this network. Prices and stock may not be current.'
      : '<strong>Catalogue loaded from backup.</strong> Live Google Sheets may be blocked on this network. Prices and stock may not be current.';
    target.insertAdjacentElement('beforebegin', notice);
  }
  function fieldContains(value, selected){ if(selected==='all') return true; return String(value||'').split(',').map(v=>v.trim()).includes(selected) || String(value||'')===selected; }
  function match(f){
    const q=search.value.trim().toLowerCase();
    const combined=[f.name,f.house,f.inspiration,f.collection,f.category,f.occasion,f.season,f.notes,f.emojis,f.gender].join(' ').toLowerCase();
    const specialOk = quickSpecialFilter === 'all'
      || (quickSpecialFilter === 'women' && String(f.gender || '').toLowerCase().includes('women'))
      || (quickSpecialFilter === 'new' && isNewArrival(f))
      || (quickSpecialFilter === 'staff' && !!f.staffPick);
    return specialOk && fieldContains(f.category,categoryFilter.value) && fieldContains(f.collection,collectionFilter.value) && fieldContains(f.occasion,occasionFilter.value) && (!q || combined.includes(q));
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
  function weeklyDiscountPercent(){
    const n = Number(settings.weeklyDiscountPercent || settings.weeklyDiscount || 20);
    return Number.isFinite(n) && n > 0 ? n : 20;
  }
  function weeklyDiscountDays(){
    const n = Number(settings.weeklyDiscountDays || settings.featuredDiscountDays || 7);
    return Number.isFinite(n) && n > 0 ? n : 7;
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
    return diff >= 0 && diff < weeklyDiscountDays() * 24 * 60 * 60 * 1000;
  }
  function discountEndsText(f){
    const start = featuredStart(f);
    if (!start) return weeklyDiscountPercent() + '% off this featured fragrance';
    const end = new Date(start.getTime() + weeklyDiscountDays() * 24 * 60 * 60 * 1000);
    const left = end.getTime() - Date.now();
    if (left <= 0) return 'Weekly discount ended';
    const days = Math.floor(left / (24 * 60 * 60 * 1000));
    const hours = Math.floor((left % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return days > 0 ? `Ends in ${days}d ${hours}h` : `Ends in ${hours}h`;
  }
  function discountedPriceText(price, f){
    const original = parseMoney(price);
    if (!original || !isFeaturedDiscountActive(f)) return String(price || '').trim();
    return money(Math.floor(original * (1 - (weeklyDiscountPercent() / 100))));
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
    const discountPct = weeklyDiscountPercent();
    const inspirationLine = shouldShowInspiration(f) ? `<p class="featured-inspo">Inspired by <strong>${escapeHtml(f.inspiration)}</strong></p>` : `<p class="featured-inspo">${escapeHtml(f.collection || 'Featured fragrance')}</p>`;
    const note = f.featuredNote || f.notes || 'This week’s highlighted fragrance.';
    const imageUrl = String(f.imageUrl || '').trim();
    const hasImage = /^https?:\/\//i.test(imageUrl);
    const featureVisual = hasImage
      ? `<div class="featured-bottle-wrap"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr((f.house ? f.house + ' ' : '') + f.name)} bottle" loading="lazy" onerror="this.closest('.featured-bottle-wrap').outerHTML='<div class=&quot;featured-mark&quot;>${escapeAttr(f.emojis || '✨')}</div>';"></div>`
      : `<div class="featured-mark">${escapeHtml(f.emojis || '✨')}</div>`;
    featuredGrid.innerHTML = `
      <article class="featured-card weekly-card ${hasImage ? 'has-bottle-image' : ''} ${active ? 'discount-active' : ''}">
        ${active ? `<div class="weekly-ribbon">${escapeHtml(discountPct)}% OFF</div>` : ''}
        <div class="featured-main ${hasImage ? 'with-image' : ''}">
          ${featureVisual}
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
          <div class="offer-kicker">${active ? `${escapeHtml(discountPct)}% off this week` : 'Featured pick'}</div>
          <div class="offer-main">${active ? 'Auto-discount applied' : 'Normal pricing'}</div>
          <div class="offer-ends">${escapeHtml(discountEndsText(f))}</div>
          <div class="featured-actions">
            ${priceButton(f,'3mL',f.p3)}${priceButton(f,'5mL',f.p5)}${priceButton(f,'10mL',f.p10)}
          </div>
        </div>
      </article>`;
    attachCardListeners();
    if (f) trackEvent('featured_fragrance_view', { fragrance_name: f.name, house: f.house, type: f.collection || '' });
  }

  function emojiMarkup(value){
    const chars = Array.from(String(value || '✨').trim()).filter(ch => ch.trim());
    const chosen = chars.slice(0,3);
    while(chosen.length < 3) chosen.push('');
    return chosen.map(ch => ch ? `<span>${escapeHtml(ch)}</span>` : '').join('');
  }
  function collectionMatches(optionValue, target){
    const o=String(optionValue||'').toLowerCase(); const t=String(target||'').toLowerCase();
    if(t==='all') return o==='all';
    if(t==='designer') return o.includes('designer');
    if(t==='niche') return o.includes('niche');
    if(t==='middle eastern') return o.includes('middle');
    if(t==='inspired') return o.includes('inspired') || o.includes('dupe') || o.includes('clone');
    return o===t;
  }
  function setCollectionFilter(target){
    if(!collectionFilter) return;
    quickSpecialFilter = 'all';
    const options=[...collectionFilter.options];
    const found=options.find(opt=>collectionMatches(opt.value,target));
    collectionFilter.value = found ? found.value : 'all';
    document.querySelectorAll('.collection-buttons button').forEach(btn=>btn.classList.toggle('active', !!btn.dataset.collection && String(btn.dataset.collection||'all').toLowerCase()===String(target||'all').toLowerCase()));
    render();
    trackEvent('quick_collection_filter', { filter_value: target });
  }

  function setSpecialFilter(target){
    quickSpecialFilter = target || 'all';
    if(collectionFilter) collectionFilter.value = 'all';
    document.querySelectorAll('.collection-buttons button').forEach(btn=>btn.classList.toggle('active', !!btn.dataset.special && String(btn.dataset.special).toLowerCase()===String(quickSpecialFilter).toLowerCase()));
    render();
    trackEvent('quick_special_filter', { filter_value: quickSpecialFilter });
  }

  function render(){
    const filtered=sortFragrances(data.filter(match)); resultCount.textContent=filtered.length; grid.innerHTML='';
    if(!filtered.length){ grid.innerHTML='<div class="empty">No fragrances match that search. Try “fresh”, “vanilla”, “date” or “summer”.</div>'; return; }
    const frag=document.createDocumentFragment();
    filtered.forEach(f=>{
      const card=document.createElement('article');
      const imageUrl=String(f.imageUrl || '').trim();
      const hasImage=/^https?:\/\//i.test(imageUrl);
      card.className=(isNewArrival(f)?'card new-card':'card') + (hasImage ? ' has-image' : '');
      if(hasImage) card.style.setProperty('--image-url', `url("${imageUrl.replace(/"/g, '%22')}")`);
      card.innerHTML=`
        <div class="card-top">
          <span class="collection-pill ${collectionClass(f.collection)}">${escapeHtml(String(f.collection || 'type').toLowerCase())}</span>
          <span class="badge-row">${isNewArrival(f)?'<span class="new-badge">new</span>':''}${f.staffPick?'<span class="new-badge staff">staff pick</span>':''}</span>
        </div>
        <p class="house">${escapeHtml(f.house || '')}</p>
        <h3>${escapeHtml(f.name)}</h3>
        ${shouldShowInspiration(f) ? `<p class="inspo"><span>Inspired by</span>${escapeHtml(f.inspiration)}</p>` : ''}
        <p class="accords">${escapeHtml(f.notes || f.accords || f.category || '')}</p>
        <div class="prices">${priceButton(f,'3mL',f.p3)}${priceButton(f,'5mL',f.p5)}${priceButton(f,'10mL',f.p10)}</div>
        <div class="card-links">${f.fragranticaUrl?`<a class="mini-link" href="${escapeAttr(f.fragranticaUrl)}" target="_blank" rel="noopener">fragrantica</a>`:''}</div>`;
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
    return `<button class="price-add ${active?'weekly-discount':''}" type="button" data-name="${escapeAttr(f.name)}" data-house="${escapeAttr(f.house||'')}" data-size="${size}" data-price="${escapeAttr(discounted)}" data-original-price="${escapeAttr(clean)}">${priceMarkup}<span>${size}</span><small>add</small></button>`;
  }
  function attachCardListeners(){
    document.querySelectorAll('[data-copy]').forEach(btn=>{ if(btn.dataset.bound) return; btn.dataset.bound='1'; btn.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent='Copied'; setTimeout(()=>btn.textContent='Copy name',1200); }catch(e){} }); });
    document.querySelectorAll('.mini-link').forEach(link=>{ if(link.dataset.bound) return; link.dataset.bound='1'; link.addEventListener('click',()=>trackEvent('external_fragrantica_click', { link_text: link.textContent || 'Fragrantica' })); });
    document.querySelectorAll('.price-add').forEach(btn=>{ if(btn.dataset.bound) return; btn.dataset.bound='1'; btn.addEventListener('click',()=>{ addToCart({type:'sample',name:btn.dataset.name,house:btn.dataset.house,size:btn.dataset.size,price:btn.dataset.price}); trackEvent('add_to_cart', { fragrance_name: btn.dataset.name, house: btn.dataset.house, sample_size: btn.dataset.size, value: parseMoney(btn.dataset.price), currency: 'AUD' }); btn.classList.add('added'); const old=btn.querySelector('small').textContent; btn.querySelector('small').textContent='added'; setTimeout(()=>{btn.classList.remove('added'); btn.querySelector('small').textContent=old;},900); }); });
  }
  function findFragranceByToken(token){
    const raw = String(token || '').trim();
    if(!raw) return null;
    const key = raw.toLowerCase();
    return data.find(f => String(f.id||'').toLowerCase() === key) || data.find(f => String(f.name||'').toLowerCase() === key) || data.find(f => String(f.name||'').toLowerCase().includes(key));
  }
  function packPrice(pack, items){
    const size = String(pack.sizeMl || 3) + 'mL';
    const field = size === '5mL' ? 'p5' : size === '10mL' ? 'p10' : 'p3';
    const value = items.reduce((sum,f)=>sum + parseMoney(f[field]),0);
    const discount = Number(pack.discount || 0);
    const final = Math.round(value * (100 - discount) / 100);
    return { size, value, final, save: Math.max(0, value - final), field };
  }
  function resolvePackItems(pack){
    const primary = Array.isArray(pack.items) ? pack.items : [];
    const fallbacks = Array.isArray(pack.fallbackItems) ? pack.fallbackItems : [];
    const names = Array.isArray(pack.itemNames) ? pack.itemNames : [];
    const fallbackNames = Array.isArray(pack.fallbackNames) ? pack.fallbackNames : [];
    const tokens = [...primary, ...names, ...fallbacks, ...fallbackNames];
    const found = [];
    tokens.forEach(token => {
      const item = findFragranceByToken(token);
      if(item && !found.some(f => f.name === item.name)) found.push(item);
    });
    const desired = Number(pack.count || (primary.length || names.length || 3));
    return found.slice(0, desired || found.length);
  }
  function renderPacks(){
    const packsGrid=$('packsGrid'); if(!packsGrid || !packs.length) return; packsGrid.innerHTML='';
    packs.forEach(pack=>{
      const items = resolvePackItems(pack);
      if(!items.length) return;
      const pricing = packPrice(pack, items);
      const div=document.createElement('article'); div.className='pack-card';
      const title = pack.title || pack.name || 'Discovery Pack';
      const itemLines=items.map(i=>`<li><strong>${escapeHtml(i.name)}</strong><span>${escapeHtml(i.house || '')}${i.category ? ' · ' + escapeHtml(i.category) : ''}</span></li>`).join('');
      div.innerHTML=`<div class="pack-tag">${escapeHtml(pack.tagline || 'Curated discovery pack')}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(pack.description || pack.desc || '')}</p><ul>${itemLines}</ul><div class="pack-price"><strong>${money(pricing.final)}</strong><span>Normally ${money(pricing.value)} · Save ${money(pricing.save)}<br>${items.length} x ${escapeHtml(pricing.size)}</span></div><button class="button primary pack-add" type="button" data-pack="${escapeAttr(title)}" data-price="${escapeAttr(money(pricing.final))}">Add pack</button>`;
      packsGrid.appendChild(div);
    });
    document.querySelectorAll('.pack-add').forEach(btn=>{ if(btn.dataset.bound) return; btn.dataset.bound='1'; btn.addEventListener('click',()=>{ addToCart({type:'pack',name:btn.dataset.pack,size:'Pack',price:btn.dataset.price,house:'Curated discovery pack'}); trackEvent('discovery_pack_add', { pack_name: btn.dataset.pack, value: parseMoney(btn.dataset.price), currency: 'AUD' }); btn.textContent='Added to cart'; setTimeout(()=>btn.textContent='Add pack',1000); }); });
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
    else { cartItems.className='cart-items'; cartItems.innerHTML=cart.map((item,idx)=>`<div class="cart-line"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.size)} · ${escapeHtml(item.price)}${item.house?` · ${escapeHtml(item.house)}`:''}</span></div><button type="button" class="remove-item" data-index="${idx}" aria-label="Remove ${escapeAttr(item.name)}">×</button></div>`).join(''); document.querySelectorAll('.remove-item').forEach(btn=>btn.addEventListener('click',()=>{ const removed=cart[Number(btn.dataset.index)]; cart.splice(Number(btn.dataset.index),1); trackEvent('remove_from_cart', { item_name: removed ? removed.name : '', sample_size: removed ? removed.size : '' }); updateCart(); })); }
    const message=buildOrderMessage(); orderText.value=message; if(sendWhatsappCart){ const base=(settings.whatsAppUrl||'https://wa.me/61434432948').split('?')[0]; sendWhatsappCart.href=`${base}?text=${encodeURIComponent(message)}`; }
  }
  function formatMoney(value){ return `$${Math.round(value*100)/100}`.replace('.00',''); }
  function escapeHtml(value){ return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(value){ return escapeHtml(value).replace(/`/g,'&#96;'); }
  function injectSeoSchema(){
    try {
      if(!data || !data.length) return;
      const siteUrl = String(settings.siteUrl || 'https://deadendscents.com').replace(/\/$/, '');
      const itemList = data.slice(0, 100).map((f, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: fragranceUrl(f),
        name: `${f.house ? f.house + ' ' : ''}${f.name}`.trim()
      }));
      const products = data.slice(0, 80).map((f) => {
        const offers = [];
        [['3mL', f.p3 || f.price3], ['5mL', f.p5 || f.price5], ['10mL', f.p10 || f.price10]].forEach(([size, price]) => {
          const value = parseMoney(price);
          if(value){
            offers.push({
              '@type': 'Offer',
              priceCurrency: 'AUD',
              price: String(value),
              availability: String(f.status || '').toLowerCase().includes('sold') ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
              itemCondition: 'https://schema.org/NewCondition',
              url: fragranceUrl(f),
              eligibleQuantity: { '@type': 'QuantitativeValue', value: Number(size.replace(/[^0-9.]/g,'')), unitCode: 'MLT' }
            });
          }
        });
        const descriptionParts = [];
        if(f.seoDescription) descriptionParts.push(f.seoDescription);
        else if(f.notes) descriptionParts.push(f.notes);
        if(f.inspiration && f.showInspiration) descriptionParts.push(`Inspired by ${f.inspiration}.`);
        if(f.category) descriptionParts.push(`${f.category} fragrance sample.`);
        if(f.season) descriptionParts.push(`Best for ${f.season}.`);
        return {
          '@type': 'Product',
          name: `${f.house ? f.house + ' ' : ''}${f.name}`.trim(),
          alternateName: f.seoTitle || undefined,
          brand: f.house ? { '@type': 'Brand', name: f.house } : undefined,
          category: f.collection || f.category || 'Fragrance samples',
          description: f.seoDescription || descriptionParts.join(' '),
          image: f.imageUrl || undefined,
          url: fragranceUrl(f),
          offers: offers.length ? offers : undefined
        };
      }).map(obj => Object.fromEntries(Object.entries(obj).filter(([,v]) => v !== undefined && !(Array.isArray(v) && !v.length))));
      const schema = {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'ItemList', '@id': siteUrl + '/#catalogue-list', name: 'DeadEnd Scents fragrance samples catalogue', itemListElement: itemList },
          ...products
        ]
      };
      let script = document.getElementById('catalogueProductSchema');
      if(!script){ script = document.createElement('script'); script.type = 'application/ld+json'; script.id = 'catalogueProductSchema'; document.head.appendChild(script); }
      script.textContent = JSON.stringify(schema);
    } catch(error){ console.warn('SEO schema injection failed', error); }
  }

  function applySearchQueryFromUrl(){
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if(q && search) search.value = q;
    } catch(e) {}
  }

  function setupContactLinks(){
    ['messengerLink','heroMessengerLink','navMessengerLink'].forEach(id=>{ const el=$(id); if(el&&settings.facebookMessengerUrl) el.href=settings.facebookMessengerUrl; if(el&&!el.dataset.trackBound){ el.dataset.trackBound='1'; el.addEventListener('click',()=>trackEvent('messenger_click',{ placement:id })); } });
    ['whatsappLink','heroWhatsappLink','navWhatsappLink','sendWhatsappCart'].forEach(id=>{ const el=$(id); if(el&&settings.whatsAppUrl&&id!=='sendWhatsappCart') el.href=settings.whatsAppUrl; if(el&&!el.dataset.trackBound){ el.dataset.trackBound='1'; el.addEventListener('click',()=>trackEvent('whatsapp_click',{ placement:id, cart_items: cart.length, cart_value: cart.reduce((sum,item)=>sum+parseMoney(item.price),0), currency:'AUD' })); } });
    ['instagramLink','heroInstagramLink','navInstagramLink'].forEach(id=>{ const el=$(id); if(el&&settings.instagramUrl) el.href=settings.instagramUrl; if(el&&!el.dataset.trackBound){ el.dataset.trackBound='1'; el.addEventListener('click',()=>trackEvent('instagram_click',{ placement:id })); } });
  }
  function setupAnalytics(){
    if(settings.googleAnalyticsId){
      const ga=document.createElement('script');
      ga.async=true;
      ga.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.googleAnalyticsId)}`;
      document.head.appendChild(ga);
      window.dataLayer=window.dataLayer||[];
      function gtag(){dataLayer.push(arguments);}
      window.gtag=gtag;
      gtag('js',new Date());
      gtag('config',settings.googleAnalyticsId,{ page_title: document.title, page_location: location.href });
    }
    if(settings.microsoftClarityId){
      (function(c,l,a,r,i,t,y){ c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)}; t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i; y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y); })(window,document,'clarity','script',settings.microsoftClarityId);
    }
  }

  function saveLocalEvent(name, params={}){
    try {
      const key = 'deadend_admin_events';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ name, params, timestamp: new Date().toISOString(), page: location.pathname + location.hash });
      const trimmed = existing.slice(-1000);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch(e){}
  }

  function trackEvent(name, params={}){
    const cleanParams = Object.assign({ event_category: 'DeadEnd Scents' }, params);
    saveLocalEvent(name, cleanParams);
    try { if(window.gtag) window.gtag('event', name, cleanParams); } catch(e){}
    try { if(window.clarity) window.clarity('event', name); } catch(e){}
  }

  function setClarityTag(key, value){
    try { if(window.clarity && value) window.clarity('set', key, String(value)); } catch(e){}
  }

  function debounce(fn, wait=700){
    let timer;
    return function(...args){ clearTimeout(timer); timer=setTimeout(()=>fn.apply(this,args), wait); };
  }
  const trackedSearch = debounce(()=>{ const q=search ? search.value.trim() : ''; if(q) trackEvent('site_search', { search_term: q }); }, 900);
  if(search) search.addEventListener('input',()=>{ render(); trackedSearch(); });
  if(categoryFilter) categoryFilter.addEventListener('input',()=>{ render(); trackEvent('filter_scent_style', { filter_value: categoryFilter.value }); });
  if(collectionFilter) collectionFilter.addEventListener('input',()=>{ quickSpecialFilter='all'; document.querySelectorAll('.collection-buttons button').forEach(btn=>btn.classList.remove('active')); render(); trackEvent('filter_type', { filter_value: collectionFilter.value }); });
  if(occasionFilter) occasionFilter.addEventListener('input',()=>{ render(); trackEvent('filter_occasion', { filter_value: occasionFilter.value }); });
  if(sortBy) sortBy.addEventListener('input',()=>{ render(); trackEvent('sort_catalogue', { sort_value: sortBy.value }); });
  document.querySelectorAll('.collection-buttons button').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.dataset.special) setSpecialFilter(btn.dataset.special);
    else setCollectionFilter(btn.dataset.collection || 'all');
  }));
  const copyOrderBtn=$('copyOrder'); if(copyOrderBtn) copyOrderBtn.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText($('orderText').value); copyOrderBtn.textContent='Copied'; trackEvent('copy_order_message', { cart_items: cart.length }); setTimeout(()=>copyOrderBtn.textContent='Copy order',1400); }catch(e){ $('orderText').select(); document.execCommand('copy'); } });
  const clearCart=$('clearCart'); if(clearCart) clearCart.addEventListener('click',()=>{ trackEvent('clear_cart', { cart_items: cart.length }); cart.length=0; updateCart(); });
  if(floatingCart) floatingCart.addEventListener('click',()=>{ trackEvent('floating_cart_click', { cart_items: cart.length }); const order=$('order'); if(order) order.scrollIntoView({behavior:'smooth',block:'start'}); });

  const hamburger=document.querySelector('.hamburger');
  const mobileMenu=document.getElementById('mobileMenu');
  if(hamburger && mobileMenu){
    hamburger.addEventListener('click',()=>{
      const open=mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded','false');
    }));
  }

  init();
})();
