(async function () {
  const DEFAULT_SETTINGS = {
    businessName: 'DeadEnd Scents',
    catalogueCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1yQxI1LA53T40lgn1ZZ_9RmljQsDgjYLmlC0xDlNU1dQ8RZQJQ2J-8h5he3nBdA/pub?gid=863343549&single=true&output=csv',
    facebookMessengerUrl: 'https://m.me/nickstreet09/',
    whatsAppUrl: 'https://wa.me/61434432948?text=Hi%20DeadEnd%20Scents%2C%20I%27d%20like%20to%20order%20some%20samples.',
    instagramUrl: 'https://instagram.com/deadendscents',
    expressPostage: 10,
    shippingLine: '$10 express postage · Australia-wide shipping · Glass vials'
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    grid: $('catalogueGrid'), packsGrid: $('packsGrid'), search: $('search'), categoryFilter: $('categoryFilter'),
    collectionFilter: $('collectionFilter'), statusFilter: $('statusFilter'), sortBy: $('sortBy'), resultCount: $('resultCount'),
    statCount: $('stat-count'), cartItems: $('cartItems'), cartTotal: $('cartTotal'), orderText: $('orderText'),
    sendWhatsappCart: $('sendWhatsappCart'), messengerLink: $('messengerLink'), instagramLink: $('instagramLink'),
    copyOrder: $('copyOrder'), clearCart: $('clearCart'), shippingLine: $('shippingLine'), postageAmount: $('postageAmount')
  };

  let settings = DEFAULT_SETTINGS;
  let catalogue = [];
  let packs = [];
  let cart = [];

  const money = (n) => Number.isFinite(Number(n)) ? `$${Math.round(Number(n))}` : 'N/A';
  const clean = (v) => String(v ?? '').trim();
  const numberValue = (v) => {
    const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const escapeHtml = (str) => clean(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const slug = (str) => clean(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  async function getJson(path, fallback) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error(path);
      return await res.json();
    } catch (err) {
      return fallback;
    }
  }

  async function getText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load catalogue CSV');
    return await res.text();
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i], next = text[i + 1];
      if (char === '"' && quoted && next === '"') { cell += '"'; i++; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
      if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = ''; continue;
      }
      cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const headers = rows.shift().map(h => clean(h));
    return rows.map(r => Object.fromEntries(headers.map((h, i) => [h, clean(r[i])])));
  }

  function getField(row, names) {
    for (const name of names) if (row[name] !== undefined && clean(row[name]) !== '') return clean(row[name]);
    return '';
  }

  function normaliseCollection(value, house) {
    const raw = `${value} ${house}`.toLowerCase();
    if (raw.includes('designer')) return 'Designer';
    if (raw.includes('niche')) return 'Niche';
    if (raw.includes('middle')) return 'Middle Eastern';
    if (raw.includes('inspired') || raw.includes('dupe') || raw.includes('bujairami') || raw.includes('jalu') || raw.includes('palermo')) return 'Inspired';
    return clean(value).replace(/[🟦🟪🟨🟩]/g, '').replace(/Original|By/gi, '').trim() || 'Other';
  }

  function normaliseItem(row, index) {
    const house = getField(row, ['House']);
    const fragrance = getField(row, ['Fragrance', 'Name']);
    if (!house || !fragrance) return null;
    const collectionRaw = getField(row, ['Collection', 'Category']);
    const style = getField(row, ['Scent Style', 'Category', 'Description', 'Notes']);
    return {
      id: getField(row, ['ID', 'Fragrance ID']) || `${slug(house)}-${slug(fragrance)}-${index}`,
      house,
      fragrance,
      collection: normaliseCollection(collectionRaw, house),
      style: style || 'Fragrance',
      p3: numberValue(getField(row, ['3mL', '3ml', 'p3'])),
      p5: numberValue(getField(row, ['5mL', '5ml', 'p5'])),
      p10: numberValue(getField(row, ['10mL', '10ml', 'p10'])),
      fragrantica: getField(row, ['Fragrantica', 'Fragrantica URL', 'fragranticaUrl']),
      status: getField(row, ['Status']) || 'In stock',
      searchText: Object.values(row).join(' ').toLowerCase()
    };
  }

  function isAvailable(item) {
    return item && !/sold out|unavailable|not available/i.test(item.status) && item.p3 > 0;
  }

  function byId(id) {
    return catalogue.find(f => f.id === id);
  }

  function byName(name) {
    const target = slug(name);
    return catalogue.find(f => slug(f.fragrance) === target || slug(`${f.house} ${f.fragrance}`) === target);
  }

  function resolvePackItems(pack) {
    const resolved = [];
    const ids = [...(pack.items || []), ...(pack.fallbackItems || [])];
    const names = [...(pack.itemNames || []), ...(pack.fallbackNames || [])];
    const candidates = [...ids.map(id => byId(id)), ...names.map(name => byName(name))];
    for (const item of candidates) {
      if (!isAvailable(item)) continue;
      if (resolved.some(x => x.id === item.id)) continue;
      resolved.push(item);
      if (resolved.length >= (pack.items || []).length) break;
    }
    return resolved;
  }

  function packPrice(items, discount) {
    const value = items.reduce((sum, item) => sum + item.p3, 0);
    const discounted = value * (1 - (Number(discount) || 0) / 100);
    return { value, price: Math.max(1, Math.round(discounted)), saving: Math.max(0, value - Math.round(discounted)) };
  }

  function collectionClass(collection) {
    return `badge-${slug(collection)}`;
  }

  function renderCard(item) {
    const prices = [
      ['3mL', item.p3], ['5mL', item.p5], ['10mL', item.p10]
    ].map(([label, price]) => price > 0 ?
      `<button class="price-add" type="button" data-id="${escapeHtml(item.id)}" data-size="${label}" data-price="${price}"><strong>${money(price)}</strong><span>${label}</span></button>` :
      `<button class="price-unavailable" type="button" disabled><strong>N/A</strong><span>${label}</span></button>`
    ).join('');

    const fragrantica = item.fragrantica
      ? `<a class="mini-link" href="${escapeHtml(item.fragrantica)}" target="_blank" rel="noopener">Fragrantica</a>`
      : `<span class="mini-link muted-link">No Fragrantica</span>`;

    return `<article class="card">
      <div class="card-top">
        <span class="badge ${collectionClass(item.collection)}">${escapeHtml(item.collection)}</span>
        <span class="status ${slug(item.status)}">${escapeHtml(item.status)}</span>
      </div>
      <p class="house">${escapeHtml(item.house)}</p>
      <h3>${escapeHtml(item.fragrance)}</h3>
      <p class="accords">${escapeHtml(item.style)}</p>
      <div class="prices">${prices}</div>
      <div class="card-links">${fragrantica}</div>
    </article>`;
  }

  function renderCatalogue() {
    const q = clean(els.search.value).toLowerCase();
    const style = els.categoryFilter.value;
    const collection = els.collectionFilter.value;
    const status = els.statusFilter.value;
    let rows = catalogue.filter(item => {
      if (q && !item.searchText.includes(q)) return false;
      if (style !== 'all' && item.style !== style) return false;
      if (collection !== 'all' && item.collection !== collection) return false;
      if (status !== 'all' && item.status !== status) return false;
      return true;
    });

    rows.sort((a, b) => {
      const sort = els.sortBy.value;
      if (sort === 'house') return `${a.house} ${a.fragrance}`.localeCompare(`${b.house} ${b.fragrance}`);
      if (sort === 'priceLow') return a.p3 - b.p3;
      if (sort === 'priceHigh') return b.p3 - a.p3;
      return a.fragrance.localeCompare(b.fragrance);
    });

    els.resultCount.textContent = rows.length;
    els.grid.innerHTML = rows.length ? rows.map(renderCard).join('') : '<div class="empty">No matching fragrances found.</div>';
  }

  function renderPacks() {
    const cards = packs.map(pack => {
      const items = resolvePackItems(pack);
      if (!items.length) return '';
      const price = packPrice(items, pack.discount);
      const list = items.map(item => `<li><strong>${escapeHtml(item.fragrance)}</strong><span>${escapeHtml(item.house)} · ${escapeHtml(item.style)}</span></li>`).join('');
      const packData = encodeURIComponent(JSON.stringify({ id: pack.id, title: pack.title, price: price.price, value: price.value, items: items.map(i => i.fragrance) }));
      return `<article class="pack-card">
        <div class="pack-icon">${escapeHtml(pack.emoji || '🧪')}</div>
        <p class="pack-tag">${escapeHtml(pack.tagline || '')}</p>
        <h3>${escapeHtml(pack.title)}</h3>
        <p>${escapeHtml(pack.description || '')}</p>
        <ul>${list}</ul>
        <div class="pack-price"><strong>${money(price.price)}</strong><span>Normally ${money(price.value)} · Save ${money(price.saving)}</span></div>
        <button class="button primary pack-add" type="button" data-pack="${packData}">Add pack</button>
      </article>`;
    }).join('');
    els.packsGrid.innerHTML = cards || '<div class="empty">No packs available right now.</div>';
  }

  function fillFilters() {
    const addOptions = (el, values) => {
      values.sort().forEach(v => {
        const opt = document.createElement('option'); opt.value = v; opt.textContent = v; el.appendChild(opt);
      });
    };
    addOptions(els.categoryFilter, [...new Set(catalogue.map(x => x.style).filter(Boolean))]);
    addOptions(els.collectionFilter, [...new Set(catalogue.map(x => x.collection).filter(Boolean))]);
  }

  function addToCart(item) {
    cart.push(item);
    renderCart();
    location.hash = 'order';
  }

  function renderCart() {
    const postage = cart.length ? Number(settings.expressPostage || 10) : 0;
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const total = subtotal + postage;
    els.cartItems.classList.toggle('empty-cart', !cart.length);
    els.cartItems.innerHTML = cart.length ? cart.map((item, i) => `<div class="cart-line">
      <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.detail)}</span></div>
      <div class="cart-price"><strong>${money(item.price)}</strong><button class="remove-item" type="button" data-index="${i}" aria-label="Remove item">×</button></div>
    </div>`).join('') : 'No samples added yet.';
    els.postageAmount.textContent = money(postage);
    els.cartTotal.textContent = money(total);
    const lines = cart.map(item => `- ${item.name} (${item.detail}) — ${money(item.price)}`).join('\n');
    const message = `Hi DeadEnd Scents, I’d like to order some samples:\n\n${lines || '- '}\n\nPostage: ${money(postage)}\nEstimated total: ${money(total)}`;
    els.orderText.value = message;
    els.sendWhatsappCart.href = `https://wa.me/61434432948?text=${encodeURIComponent(message)}`;
  }

  function bindEvents() {
    [els.search, els.categoryFilter, els.collectionFilter, els.statusFilter, els.sortBy].forEach(el => el.addEventListener('input', renderCatalogue));
    document.body.addEventListener('click', (e) => {
      const priceBtn = e.target.closest('.price-add');
      if (priceBtn) {
        const item = byId(priceBtn.dataset.id);
        addToCart({ name: `${item.house} ${item.fragrance}`, detail: priceBtn.dataset.size, price: Number(priceBtn.dataset.price) });
      }
      const packBtn = e.target.closest('.pack-add');
      if (packBtn) {
        const pack = JSON.parse(decodeURIComponent(packBtn.dataset.pack));
        addToCart({ name: pack.title, detail: `${pack.items.length} x 3mL pack: ${pack.items.join(', ')}`, price: pack.price });
      }
      const remove = e.target.closest('.remove-item');
      if (remove) { cart.splice(Number(remove.dataset.index), 1); renderCart(); }
    });
    els.clearCart.addEventListener('click', () => { cart = []; renderCart(); });
    els.copyOrder.addEventListener('click', async () => {
      await navigator.clipboard.writeText(els.orderText.value);
      els.copyOrder.textContent = 'Copied';
      setTimeout(() => els.copyOrder.textContent = 'Copy order message', 1200);
    });
  }

  function applySettings() {
    els.shippingLine.textContent = settings.shippingLine || DEFAULT_SETTINGS.shippingLine;
    els.messengerLink.href = settings.facebookMessengerUrl || DEFAULT_SETTINGS.facebookMessengerUrl;
    els.instagramLink.href = settings.instagramUrl || DEFAULT_SETTINGS.instagramUrl;
  }

  async function init() {
    settings = { ...DEFAULT_SETTINGS, ...(await getJson('settings.json', {})) };
    packs = await getJson('packs.json', []);
    applySettings();
    const csvText = await getText(settings.catalogueCsvUrl);
    catalogue = parseCsv(csvText).map(normaliseItem).filter(Boolean);
    els.statCount.textContent = catalogue.length;
    fillFilters();
    renderPacks();
    renderCatalogue();
    renderCart();
    bindEvents();
  }

  init().catch(err => {
    console.error(err);
    els.grid.innerHTML = '<div class="empty">Catalogue could not load. Check the published Google Sheet CSV link in settings.json.</div>';
  });
})();
