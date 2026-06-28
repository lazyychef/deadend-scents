(function(){
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('load', () => {
    if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  });
  const $ = (id) => document.getElementById(id);
  const grid = $('catalogueGrid');
  const search = $('search');
  const categoryFilter = $('categoryFilter');
  const occasionFilter = $('occasionFilter');
  const statusFilter = $('statusFilter');
  const sortBy = $('sortBy');
  const resultCount = $('resultCount');
  const statCount = $('stat-count');
  const data = Array.isArray(window.fragrances) ? window.fragrances : (typeof fragrances !== 'undefined' ? fragrances : []);
  const cart = [];
  const EXPRESS_POSTAGE = 10;

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


  function inspirationHouse(fragrance){
    const insp = String(fragrance.inspiration || '').trim();
    if (!insp || insp.toLowerCase() === 'original' || insp.toLowerCase().includes('original creation') || insp.toLowerCase() === 'unique') return '';
    return insp.split(' - ')[0].trim();
  }

  function firstAvailablePrice(fragrance){
    return [fragrance.p3, fragrance.p5, fragrance.p10].map(parseMoney).find(n => n > 0) || 0;
  }

  function sortFragrances(items){
    const mode = sortBy ? sortBy.value : 'alphabetical';
    const sorted = [...items];
    const byText = (getter) => sorted.sort((a,b) => String(getter(a) || '').localeCompare(String(getter(b) || ''), undefined, { sensitivity: 'base' }) || String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
    if (mode === 'house') return byText(x => x.house);
    if (mode === 'inspirationHouse') return byText(inspirationHouse);
    if (mode === 'priceLow') return sorted.sort((a,b) => firstAvailablePrice(a) - firstAvailablePrice(b) || String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
    if (mode === 'priceHigh') return sorted.sort((a,b) => firstAvailablePrice(b) - firstAvailablePrice(a) || String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
    return byText(x => x.name);
  }

  function render(){
    const filtered = sortFragrances(data.filter(match));
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
          ${priceButton(f, '3mL', f.p3)}
          ${priceButton(f, '5mL', f.p5)}
          ${priceButton(f, '10mL', f.p10)}
        </div>
        <div class="card-links">
          ${f.fragranticaUrl ? `<a class="mini-link" href="${escapeAttr(f.fragranticaUrl)}" target="_blank" rel="noopener">${linkLabel}</a>` : ''}
          <button class="mini-button" data-copy="${escapeAttr(f.name)}">Copy name</button>
        </div>
      `;
      frag.appendChild(card);
    });
    grid.appendChild(frag);
    attachCardListeners();
  }

  function priceButton(f, size, price){
    const cleanPrice = String(price || '').trim();
    const disabled = !cleanPrice || cleanPrice.toUpperCase() === 'N/A';
    if (disabled) {
      return `<div class="price-unavailable"><strong>N/A</strong><span>${escapeHtml(size)}</span></div>`;
    }
    return `<button class="price-add" type="button" data-name="${escapeAttr(f.name)}" data-house="${escapeAttr(f.house || '')}" data-size="${escapeAttr(size)}" data-price="${escapeAttr(cleanPrice)}"><strong>${escapeHtml(cleanPrice)}</strong><span>${escapeHtml(size)}</span><small>Add</small></button>`;
  }

  function attachCardListeners(){
    document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = 'Copied'; setTimeout(()=>btn.textContent='Copy name', 1200); } catch(e) {}
    }));
    document.querySelectorAll('.price-add').forEach(btn => btn.addEventListener('click', () => {
      addToCart({
        type: 'sample',
        name: btn.dataset.name,
        house: btn.dataset.house,
        size: btn.dataset.size,
        price: btn.dataset.price
      });
      btn.classList.add('added');
      const oldText = btn.querySelector('small').textContent;
      btn.querySelector('small').textContent = 'Added';
      setTimeout(() => { btn.classList.remove('added'); btn.querySelector('small').textContent = oldText; }, 900);
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
      div.innerHTML = `<span class="pack-emoji">${pack.emojis}</span><h3>${escapeHtml(pack.name)}</h3><p>${escapeHtml(pack.desc)}</p><strong>${escapeHtml(pack.price)}</strong><ul>${itemLines}</ul><button class="button pack-add" type="button" data-pack="${escapeAttr(pack.name)}" data-price="${escapeAttr(pack.price)}">Add pack to cart</button>`;
      packsGrid.appendChild(div);
    });
    document.querySelectorAll('.pack-add').forEach(btn => btn.addEventListener('click', () => {
      addToCart({ type:'pack', name:btn.dataset.pack, size:'Pack', price:btn.dataset.price, house:'' });
      btn.textContent = 'Added to cart';
      setTimeout(()=>btn.textContent='Add pack to cart', 1000);
    }));
  }

  function addToCart(item){
    cart.push(item);
    updateCart();
    // Do not auto-scroll after adding items; keep the customer browsing.
  }

  function parseMoney(value){
    const text = String(value || '').trim();
    const matches = [...text.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)];
    if (matches.length) return Number(matches[matches.length - 1][1]);
    const plain = text.match(/^(\d+(?:\.\d{1,2})?)$/);
    return plain ? Number(plain[1]) : 0;
  }

  function buildOrderMessage(){
    if (!cart.length) {
      return 'Hi DeadEnd Scents, I’d like to order some samples:\n\nNo samples added yet.\n\nPostage: $10 express postage Australia wide\nPackaging: glass vials\n\nDelivery name/address:';
    }
    const lines = cart.map((item, idx) => `${idx + 1}. ${item.name}${item.house ? ' - ' + item.house : ''} — ${item.size} (${item.price})`);
    return `Hi DeadEnd Scents, I’d like to order these samples:\n\n${lines.join('\n')}\n\nEstimated total: ${formatMoney(cart.reduce((sum, item) => sum + parseMoney(item.price), 0))}\n\nDelivery area:`;
  }

  function updateCart(){
    const cartItems = $('cartItems');
    const orderText = $('orderText');
    const cartTotal = $('cartTotal');
    const sendWhatsappCart = $('sendWhatsappCart');
    const cfg = window.siteConfig || {};
    const samplesTotal = cart.reduce((sum, item) => sum + parseMoney(item.price), 0);
    const total = cart.length ? samplesTotal + EXPRESS_POSTAGE : 0;

    cartTotal.textContent = formatMoney(total);
    if (!cart.length) {
      cartItems.className = 'cart-items empty-cart';
      cartItems.innerHTML = 'No samples added yet.';
    } else {
      cartItems.className = 'cart-items';
      cartItems.innerHTML = cart.map((item, idx) => `
        <div class="cart-line">
          <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.size)} · ${escapeHtml(item.price)}${item.house ? ` · ${escapeHtml(item.house)}` : ''}</span></div>
          <button type="button" class="remove-item" data-index="${idx}" aria-label="Remove ${escapeAttr(item.name)}">×</button>
        </div>
      `).join('');
      document.querySelectorAll('.remove-item').forEach(btn => btn.addEventListener('click', () => {
        cart.splice(Number(btn.dataset.index), 1);
        updateCart();
      }));
    }
    const message = buildOrderMessage();
    orderText.value = message;
    if (sendWhatsappCart) {
      const base = (cfg.whatsAppUrl || 'https://wa.me/61434432948').split('?')[0];
      sendWhatsappCart.href = `${base}?text=${encodeURIComponent(message)}`;
    }
  }

  function formatMoney(value){
    return `$${Math.round(value * 100) / 100}`.replace('.00','');
  }

  function escapeHtml(value){ return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(value){ return escapeHtml(value).replace(/`/g, '&#96;'); }

  function setupContactLinks(){
    const cfg = window.siteConfig || {};
    ['messengerLink','heroMessengerLink'].forEach(id => { const el = $(id); if (el && cfg.facebookMessengerUrl) el.href = cfg.facebookMessengerUrl; });
    ['whatsappLink','heroWhatsappLink'].forEach(id => { const el = $(id); if (el && cfg.whatsAppUrl) el.href = cfg.whatsAppUrl; });
    ['instagramLink','heroInstagramLink'].forEach(id => { const el = $(id); if (el && cfg.instagramUrl) el.href = cfg.instagramUrl; });
  }

  [search, categoryFilter, occasionFilter, statusFilter, sortBy].filter(Boolean).forEach(el => el.addEventListener('input', render));
  $('copyOrder').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('orderText').value); $('copyOrder').textContent = 'Copied'; setTimeout(() => $('copyOrder').textContent = 'Copy order message', 1400); }
    catch (e) { $('orderText').select(); document.execCommand('copy'); }
  });
  const clearCart = $('clearCart');
  if (clearCart) clearCart.addEventListener('click', () => { cart.length = 0; updateCart(); });
  setupContactLinks(); renderPacks(); render(); updateCart();
})();
