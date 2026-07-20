(() => {
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const items = [
    ['index.html','Dashboard'],
    ['inventory.html','Inventory'],
    ['add-bottle.html','Add Bottle'],
    ['orders.html','Orders'],
    ['customers.html','Customers'],
    ['analytics.html','Analytics'],
    ['shipping.html','Shipping'],
    ['features.html','Features'],
    ['seo.html','SEO'],
    ['calculator.html','Calculator'],
    ['settings.html','Settings']
  ];

  const nav = document.createElement('nav');
  nav.className = 'admin-nav';
  nav.setAttribute('aria-label', 'Admin navigation');
  nav.innerHTML = `
    <div class="admin-nav-inner">
      <button class="admin-nav-toggle" type="button" aria-expanded="false" aria-controls="adminNavLinks">
        <span>Admin menu</span><span aria-hidden="true">☰</span>
      </button>
      <div class="admin-nav-links" id="adminNavLinks">
        ${items.map(([href,label]) => `<a href="${href}"${page===href?' aria-current="page"':''}>${label}</a>`).join('')}
        <a class="admin-nav-site" href="../index.html">View public site</a>
      </div>
    </div>`;

  const header = document.querySelector('.admin-header');
  if (header) header.insertAdjacentElement('afterend', nav);
  else document.body.insertAdjacentElement('afterbegin', nav);

  const toggle = nav.querySelector('.admin-nav-toggle');
  const links = nav.querySelector('.admin-nav-links');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links?.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded','false');
  });
})();
