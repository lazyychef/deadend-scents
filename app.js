(function(){
  const $ = (id) => document.getElementById(id);
  const grid = $('catalogueGrid');
  const search = $('search');
  const categoryFilter = $('categoryFilter');
  const occasionFilter = $('occasionFilter');
  const statusFilter = $('statusFilter');
  const resultCount = $('resultCount');
  const statCount = $('stat-count');

  if (!Array.isArray(window.fragrances || fragrances)) {
    console.error('Catalogue data not found. Check data.js');
    return;
  }

  const data = fragrances;
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
    const categoryOk = categoryFilter.value === 'all' || fragrance.category === categoryFilter.value;
    const occasionOk = occasionFilter.value === 'all' || fragrance.occasion === occasionFilter.value;
    const statusOk = statusFilter.value === 'all' || fragrance.status === statusFilter.value;
    const searchOk = !q || combined.includes(q);
    return categoryOk && occasionOk && statusOk && searchOk;
  }

  function render(){
    const filtered = data.filter(match);
    resultCount.textContent = filtered.length;
    grid.innerHTML = '';

    if (!filtered.length){
      grid.innerHTML = '<div class="empty">No fragrances match that search. Try a broader word like “fresh”, “vanilla”, “date” or “summer”.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(f => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-top">
          <span class="emoji">${f.emojis || '✨'}</span>
          <span class="status ${String(f.status).toLowerCase().replace(/\s+/g,'-')}">${f.status || 'In stock'}</span>
        </div>
        <h3>${escapeHtml(f.name)}</h3>
        <p class="house">${escapeHtml(f.house || '')}</p>
        <p class="inspo">${escapeHtml(f.inspiration || 'Original')}</p>
        <p class="desc">${escapeHtml(f.notes || '')}</p>
        ${f.fragranticaUrl ? `<a class="mini-link" href="${escapeAttr(f.fragranticaUrl)}" target="_blank" rel="noopener">View on Fragrantica</a>` : ''}
        <div class="tags">
          <span>${escapeHtml(f.category || 'Fragrance')}</span>
          <span>${escapeHtml(f.occasion || 'Anytime')}</span>
        </div>
        <div class="prices">
          <div><strong>${escapeHtml(f.p3 || 'N/A')}</strong><span>3mL</span></div>
          <div><strong>${escapeHtml(f.p5 || 'N/A')}</strong><span>5mL</span></div>
          <div><strong>${escapeHtml(f.p10 || 'N/A')}</strong><span>10mL</span></div>
        </div>
      `;
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  function renderPacks(){
    const packsGrid = $('packsGrid');
    packsGrid.innerHTML = '';
    packs.forEach(pack => {
      const div = document.createElement('article');
      div.className = 'pack-card';
      div.innerHTML = `
        <span class="pack-emoji">${pack.emojis}</span>
        <h3>${escapeHtml(pack.name)}</h3>
        <p>${escapeHtml(pack.desc)}</p>
        <strong>${escapeHtml(pack.price)}</strong>
        <ul>${pack.items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      `;
      packsGrid.appendChild(div);
    });
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function escapeAttr(value){
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function setupContactLinks(){
    const cfg = window.siteConfig || {};
    const fb = document.getElementById('messengerLink');
    const wa = document.getElementById('whatsappLink');
    const ig = document.getElementById('instagramLink');
    if (fb && cfg.facebookMessengerUrl) fb.href = cfg.facebookMessengerUrl;
    if (wa && cfg.whatsAppUrl) wa.href = cfg.whatsAppUrl;
    if (ig && cfg.instagramUrl) ig.href = cfg.instagramUrl;
  }

  [search, categoryFilter, occasionFilter, statusFilter].forEach(el => el.addEventListener('input', render));

  $('copyOrder').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('orderText').value);
      $('copyOrder').textContent = 'Copied';
      setTimeout(() => $('copyOrder').textContent = 'Copy order message', 1400);
    } catch (e) {
      $('orderText').select();
      document.execCommand('copy');
    }
  });

  setupContactLinks();
  renderPacks();
  render();
})();
