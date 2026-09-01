(() => {
  const setup = () => {
    const section = document.querySelector('#packs');
    const grid = section?.querySelector('.packs-grid');
    if (!section || !grid || section.dataset.slider261 === '1') return;
    const cards = () => Array.from(grid.querySelectorAll('.pack-card'));
    if (!cards().length) return;
    section.dataset.slider261 = '1';
    const controls = document.createElement('div');
    controls.className = 'pack-slider-controls';
    controls.innerHTML = '<button class="pack-slider-btn pack-prev" type="button" aria-label="Previous discovery pack">‹</button><button class="pack-slider-btn pack-next" type="button" aria-label="Next discovery pack">›</button>';
    section.appendChild(controls);
    const dots = document.createElement('div'); dots.className='pack-slider-dots'; section.appendChild(dots);
    const benefits = document.createElement('div'); benefits.className='pack-benefits'; benefits.innerHTML='<span>▣ &nbsp;5 samples per pack</span><span>♙ &nbsp;3mL each</span><span>▱ &nbsp;$10 express shipping</span>'; section.appendChild(benefits);
    const rebuildDots=()=>{ dots.innerHTML=''; cards().forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className='pack-slider-dot'+(i===0?' is-active':'');b.setAttribute('aria-label',`Go to discovery pack ${i+1}`);b.addEventListener('click',()=>cards()[i]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'}));dots.appendChild(b);}); };
    rebuildDots();
    const step=()=>{const c=cards()[0];return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(grid).columnGap||getComputedStyle(grid).gap||0) : grid.clientWidth};
    controls.querySelector('.pack-prev').addEventListener('click',()=>grid.scrollBy({left:-step(),behavior:'smooth'}));
    controls.querySelector('.pack-next').addEventListener('click',()=>grid.scrollBy({left:step(),behavior:'smooth'}));
    let raf=0; grid.addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const cs=cards();if(!cs.length)return;const gx=grid.getBoundingClientRect().left;let best=0,dist=Infinity;cs.forEach((c,i)=>{const d=Math.abs(c.getBoundingClientRect().left-gx);if(d<dist){dist=d;best=i;}});dots.querySelectorAll('.pack-slider-dot').forEach((d,i)=>d.classList.toggle('is-active',i===best));});},{passive:true});
  };
  const trySetup=()=>{setup(); if(!document.querySelector('#packs .pack-card')) setTimeout(trySetup,180);};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',trySetup); else trySetup();
})();
