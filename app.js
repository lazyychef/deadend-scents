(function(){
  const $ = (id) => document.getElementById(id);
  const grid = $('catalogueGrid');
  const search = $('search');
  const categoryFilter = $('categoryFilter');
  const occasionFilter = $('occasionFilter');
  const statusFilter = $('statusFilter');
  const resultCount = $('resultCount');
  const statCount = $('stat-count');
  const data = Array.isArray(window.fragrances) ? window.fragrances : (typeof fragrances !== 'undefined' ? fragrances : []);

  if (!data.length) {
    console.error('Catalogue data not found. Check data.js');
    return;
  }

  statCount.textContent = data.length;

  function uniqueValues(key){
    return [...new Set(data.map(x => x[key]).filter(Boolean))].sort();
  }

  function addOptions(select, values){
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  }

  addOptions(categoryFilter, uniqueValues('category'));
  addOptions(occasionFilter, uniqueValues('occasion'));

  function match(fragrance){
    const q = search.value.trim().toLowerCase();
    const combined = [fragrance.name, fragrance.house, fragrance.inspiration, fragrance.category, fragrance.occasion, fragrance.notes, fragrance.emojis].join(' ').toLowerCase();
    return (categoryFilter.value === 'all' || fragrance.category === categoryFilter.value)
      && (occasionFilter.value === 'all' || fragrance.occasion === occasionFilter.value)
      && (statusFilter.value === 'all' || fragrance.status === statusFilter.value)
      && (!q || combined.includes(q));
  }

  function render(){
    const filtered = data.filter(match);
    resultCount.textContent = filtered.length;
    grid.innerHTML = '';
    if (!filtered.length){
      grid.innerHTML = '<div class="empty">No fragrances match that search. Try “fresh”, “vanilla”, “date” or “summer”.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    filtered.forEach(f => {
      const card = document.createElement('article');
      card.className = 'card';
      const linkLabel = f.fragranticaUrl && !f.fragranticaUrl.includes('/search/') ? 'Fragrantica page' : 'Fragrantica search';
      card.innerHTML = `
        <div class="card-main no-image">
          <div class="card-copy">
            <div class="card-top"><span class="emoji">${f.emojis || '✨'}</span><span class="status ${String(f.status).toLowerCase().replace(/\s+/g,'-')}">${f.status || 'In stock'}</span></div>
            <h3>${escapeHtml(f.name)}</h3>
            <p class="house">${escapeHtml(f.house || '')}</p>
            <p class="inspo">${escapeHtml(f.inspiration || 'Original')}</p>
          </div>
        </div>
        <p class="desc">${escapeHtml(f.notes || '')}</p>
        <div class="prices compact-prices">
          <div><strong>${escapeHtml(f.p3 || 'N/A')}</strong><span>3mL</span></div>
          <div><strong>${escapeHtml(f.p5 || 'N/A')}</strong><span>5mL</span></div>
          <div><strong>${escapeHtml(f.p10 || 'N/A')}</strong><span>10mL</span></div>
        </div>
        <div class="card-links">
          ${f.fragranticaUrl ? `<a class="mini-link" href="${escapeAttr(f.fragranticaUrl)}" target="_blank" rel="noopener">${linkLabel}</a>` : ''}
          <button class="mini-button" data-copy="${escapeAttr(f.name)}">Copy name</button>
        </div>
      `;
      frag.appendChild(card);
    });
    grid.appendChild(frag);
    document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = 'Copied'; setTimeout(()=>btn.textContent='Copy name', 1200); } catch(e) {}
    }));
  }

  function renderPacks(){
    const packsGrid = $('packsGrid');
    const packData = Array.isArray(window.packs) ? window.packs : (typeof packs !== 'undefined' ? packs : []);
    if (!Array.isArray(packData) || !packData.length) return;
    packsGrid.innerHTML = '';
    packData.forEach(pack => {
      const div = document.createElement('article');
      div.className = 'pack-card';
      const itemLines = pack.items.map(i => {
        const match = data.find(f => f.name === i);
        return `<li>${escapeHtml(i)}${match ? ` <span class="pack-price">${escapeHtml(match.p3 || '')}</span>` : ''}</li>`;
      }).join('');
      div.innerHTML = `<span class="pack-emoji">${pack.emojis}</span><h3>${escapeHtml(pack.name)}</h3><p>${escapeHtml(pack.desc)}</p><strong>${escapeHtml(pack.price)}</strong><ul>${itemLines}</ul>`;
      packsGrid.appendChild(div);
    });
  }

  function escapeHtml(value){ return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(value){ return escapeHtml(value).replace(/`/g, '&#96;'); }

  function setupContactLinks(){
    const cfg = window.siteConfig || {};
    ['messengerLink','heroMessengerLink'].forEach(id => { const el = $(id); if (el && cfg.facebookMessengerUrl) el.href = cfg.facebookMessengerUrl; });
    ['whatsappLink','heroWhatsappLink'].forEach(id => { const el = $(id); if (el && cfg.whatsAppUrl) el.href = cfg.whatsAppUrl; });
    ['instagramLink','heroInstagramLink'].forEach(id => { const el = $(id); if (el && cfg.instagramUrl) el.href = cfg.instagramUrl; });
  }

  [search, categoryFilter, occasionFilter, statusFilter].forEach(el => el.addEventListener('input', render));
  $('copyOrder').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('orderText').value); $('copyOrder').textContent = 'Copied'; setTimeout(() => $('copyOrder').textContent = 'Copy order message', 1400); }
    catch (e) { $('orderText').select(); document.execCommand('copy'); }
  });
  setupContactLinks(); renderPacks(); render();
})();
