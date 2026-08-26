(() => {
  'use strict';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const groups=[
    ['Home', [['index.html','Dashboard','⌂']]],
    ['Orders', [['orders.html','Orders','▣'],['shipping.html','Shipping','✦']]],
    ['Fragrances', [['inventory.html','Inventory','◫'],['add-bottle.html','Add Bottle','＋'],['stocktake.html','Stocktake','⌁']]],
    ['Intelligence', [['daily-pick.html','Daily Pick','🎲'],['intelligence.html','Acquisition','◈'],['inventory-intelligence.html','Stock Intelligence','◎'],['analytics.html','Owner Intelligence','↗']]],
    ['Customers', [['customers.html','Customers','♙']]],
    ['Tools', [['calculator.html','Calculator','∑'],['features.html','Features','★'],['seo.html','SEO','⌕'],['settings.html','Settings','⚙']]]
  ];
  const nav=document.createElement('nav');nav.className='admin-nav admin-v3-nav';nav.setAttribute('aria-label','Admin navigation');
  const links=groups.map(([group,items])=>`<div class="admin-nav-group"><span class="admin-nav-group-title">${group}</span>${items.map(([href,label,icon])=>`<a href="${href}"${page===href?' aria-current="page"':''}><b>${icon}</b><span>${label}</span></a>`).join('')}</div>`).join('');
  nav.innerHTML=`<div class="admin-nav-inner"><div class="admin-nav-brand"><img src="../assets/deadend-logo.png" alt=""><strong>DeadEnd Intelligence</strong></div><button class="admin-nav-toggle" type="button" aria-expanded="false" aria-controls="adminNavLinks"><span>Menu</span><span aria-hidden="true">☰</span></button><div class="admin-nav-links" id="adminNavLinks">${links}<div class="admin-nav-group admin-nav-external"><span class="admin-nav-group-title">Site</span><a href="../index.html"><b>↗</b><span>Public site</span></a></div></div></div>`;
  const header=document.querySelector('.admin-header');if(header)header.insertAdjacentElement('afterend',nav);else document.body.insertAdjacentElement('afterbegin',nav);
  const toggle=nav.querySelector('.admin-nav-toggle');toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));});
  nav.querySelector('.admin-nav-links')?.addEventListener('click',()=>{nav.classList.remove('is-open');toggle?.setAttribute('aria-expanded','false');});

  const badge=document.createElement('div');badge.className='admin-data-badge';badge.innerHTML='<span class="data-dot"></span><span class="data-copy">Data ready</span><button type="button" title="Refresh live data">↻</button>';
  document.body.appendChild(badge);
  const copy=badge.querySelector('.data-copy');
  const show=(source,time)=>{const ago=time?Math.max(0,Math.round((Date.now()-time)/60000)):0; if(source==='cache')copy.textContent=`Cached · ${ago<1?'just now':ago+'m ago'}`;else if(source==='live')copy.textContent='Live data · just now';else if(source==='refreshing')copy.textContent='Refreshing…';};
  window.addEventListener('deadend:data-status',e=>show(e.detail?.source,e.detail?.time));
  badge.querySelector('button').addEventListener('click',()=>{window.DeadEndAdminData?.freshFor();location.reload();});
})();
