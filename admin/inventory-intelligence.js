(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={settings:null,catalogue:[],items:[],models:[]};
  const num=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;
  const money=v=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(num(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const days=(a,b=new Date())=>a?Math.max(0,(b-a)/86400000):null;
  function first(o,names){for(const k of names){if(o&&o[k]!==undefined&&String(o[k]).trim()!=='')return o[k];}return '';}
  function dateOf(v){const s=String(v||'').trim();if(!s)return null;let d;if(/^\d{4}-\d{2}-\d{2}/.test(s))d=new Date(s.slice(0,10)+'T12:00:00');else{const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);d=m?new Date(+m[3],+m[2]-1,+m[1],12):new Date(s);}return Number.isNaN(d.getTime())?null:d;}
  function endpoint(action){const base=state.settings.adminWriteEndpoint;return base+(base.includes('?')?'&':'?')+'action='+encodeURIComponent(action)+'&t='+Date.now();}
  async function get(action){const r=await fetch(endpoint(action),{cache:'no-store'});if(!r.ok)throw new Error(action+' request failed');const j=await r.json();if(j.ok===false)throw new Error(j.error||action+' failed');return j.items||[];}
  function name(i){return [i.House,i.Fragrance].filter(Boolean).join(' · ')||i.ID||'Unknown';}
  function keyFor(i){return String(i.ID||name(i)).trim().toLowerCase();}
  function mlLeft(i){const raw=first(i,['Current mL','Current Amount Left (mL)','Current Amount Left','Amount Left','Amount Left mL','Remaining mL']);return raw===''?null:num(raw);}
  function bottleSize(i){return num(first(i,['Bottle Size (mL)','Bottle Size','Size mL','Original mL']));}
  function purchaseCost(i){return num(first(i,['Purchase Price','Purchase Cost','Cost','Paid']));}
  function purchaseDate(i){return dateOf(first(i,['Purchase Date','Added Date','Date Added']));}
  function projectedRevenue(i,left){if(left===null||left<=0)return 0;const p10=num(i['10mL']),p5=num(i['5mL']),p3=num(i['3mL']);let remaining=left,total=0;if(p10){total+=Math.floor(remaining/10)*p10;remaining%=10;}if(remaining>=5&&p5){total+=p5;remaining-=5;}if(remaining>=3&&p3)total+=p3;return total;}
  function southSeason(){const m=new Date().getMonth()+1;return [12,1,2].includes(m)?'Summer':[3,4,5].includes(m)?'Autumn':[6,7,8].includes(m)?'Winter':'Spring';}
  function includesSeason(i,season){return String(first(i,['Season','Best Season','Seasons'])||'').toLowerCase().includes(season.toLowerCase());}
  function buildSales(){
    const m=new Map();
    state.items.forEach(x=>{
      const k=String(x['Fragrance ID']||[x.House,x.Fragrance].filter(Boolean).join(' · ')).trim().toLowerCase();if(!k)return;
      const rec=m.get(k)||{revenue:0,ml:0,qty:0,last:null,first:null};
      rec.revenue+=num(x['Line Total']);rec.ml+=num(x['Size mL'])*(num(x.Quantity)||1);rec.qty+=num(x.Quantity)||1;
      const d=dateOf(x['Order Date']||x.Date);if(d){if(!rec.last||d>rec.last)rec.last=d;if(!rec.first||d<rec.first)rec.first=d;}
      m.set(k,rec);
    });return m;
  }
  function classify(x){
    if(x.left===null||!x.size||!x.cost)return 'Needs data';
    if(x.left<=0)return 'Do not rebuy';
    if(x.left<=20&&x.soldMl>=15&&x.revenue>=x.cost)return 'Low stock';
    if(x.revenue>=x.cost&&x.recentDays!==null&&x.recentDays<=90)return 'Strong performer';
    if(x.revenue>=x.cost)return 'Paid for itself';
    if(x.promoteScore>=72)return 'Promote this week';
    if(x.ageDays!==null&&x.ageDays>=120&&x.leftRatio>=.65&&x.soldMl<10)return 'Slow mover';
    if(x.leftRatio>=.8&&x.ageDays!==null&&x.ageDays>=60)return 'Overstocked';
    return 'Do not rebuy';
  }
  function buildModels(){
    const sales=buildSales(),season=southSeason();
    state.models=state.catalogue.filter(i=>!/hidden|archived/i.test(String(i.Status||i.Stock||''))).map(i=>{
      const sale=sales.get(keyFor(i))||sales.get(name(i).toLowerCase())||{revenue:0,ml:0,qty:0,last:null,first:null};
      const left=mlLeft(i),size=bottleSize(i),cost=purchaseCost(i),ageDays=days(purchaseDate(i)),recentDays=days(sale.last),leftRatio=size&&left!==null?Math.min(1.2,left/size):0;
      const remainingCost=size&&left!==null?cost*Math.max(0,left/size):0,projected=projectedRevenue(i,left),roi=cost?((sale.revenue-cost)/cost)*100:null;
      const seasonal=includesSeason(i,season)?12:0;
      const marginScore=projected>remainingCost?Math.min(25,(projected-remainingCost)/Math.max(1,remainingCost)*8):0;
      const stockScore=Math.min(25,leftRatio*25);
      const movementScore=sale.ml>0?Math.min(25,8+sale.ml/2):5;
      const dormancyBoost=recentDays===null?10:recentDays>45?12:recentDays>21?7:2;
      const promoteScore=Math.round(Math.min(100,stockScore+marginScore+movementScore+dormancyBoost+seasonal));
      const velocityDays=Math.max(30,days(sale.first)||ageDays||30),velocity=sale.ml/(velocityDays/30);
      const reorderScore=Math.round(Math.min(100,(left!==null&&left<=20?40:0)+(sale.revenue>=cost&&cost>0?25:0)+Math.min(25,velocity*4)+(recentDays!==null&&recentDays<=60?10:0)));
      const slowScore=Math.round(Math.min(100,(ageDays>=120?25:0)+(leftRatio>=.65?30:0)+(sale.ml<10?25:0)+(recentDays===null||recentDays>120?20:0)));
      const model={item:i,name:name(i),style:i['Scent Style']||'Unspecified',left,size,cost,ageDays,recentDays,leftRatio,remainingCost,projected,unrealised:projected-remainingCost,revenue:sale.revenue,soldMl:sale.ml,qty:sale.qty,roi,velocity,promoteScore,reorderScore,slowScore,seasonal};
      model.health=classify(model);return model;
    });
  }
  function reason(x,type){
    if(type==='promote')return `${Math.round(x.left||0)}mL left · ${money(x.projected)} projected · ${x.seasonal?'seasonal fit':'content opportunity'}`;
    if(type==='reorder')return `${Math.round(x.left||0)}mL left · ${Math.round(x.soldMl)}mL sold · ${x.roi===null?'ROI unavailable':Math.round(x.roi)+'% ROI'}`;
    if(type==='slow')return `${Math.round(x.left||0)}mL left · ${Math.round(x.soldMl)}mL sold · ${x.ageDays===null?'purchase date missing':Math.round(x.ageDays)+' days owned'}`;
    return `${money(x.revenue)} revenue · ${Math.round(x.left||0)}mL still held`;
  }
  function itemList(id,rows,type){
    $(id).innerHTML=rows.length?rows.slice(0,5).map((x,i)=>`<div class="intel-list-row"><div><b>${i+1}. ${esc(x.name)}</b><span>${esc(reason(x,type))}</span></div><div class="intel-row-actions"><strong>${type==='promote'?x.promoteScore:type==='reorder'?x.reorderScore:x.slowScore}</strong><a class="table-action" href="inventory.html?search=${encodeURIComponent(x.item.Fragrance||x.item.ID||'')}">Open</a></div></div>`).join(''):'<div class="empty">No bottles currently meet this recommendation.</div>';
  }
  function table(headers,rows){return rows.length?`<table class="analytics-table inventory-intel-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i===0?' class="primary-cell"':''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty">No matching bottles.</div>';}
  function renderStyles(models){const map=new Map();models.forEach(x=>map.set(x.style,(map.get(x.style)||0)+(x.left||0)));const rows=[...map].sort((a,b)=>b[1]-a[1]),max=Math.max(1,...rows.map(x=>x[1]));$('styleStock').innerHTML=rows.map(([k,v])=>`<div class="rank-row"><strong>${esc(k)}</strong><span>${Math.round(v)}mL</span><div class="rank-meter"><i style="width:${v/max*100}%"></i></div></div>`).join('')||'<div class="empty">No Scent Style data.</div>';}
  function filtered(){let rows=[...state.models];const style=$('styleFilter').value,health=$('healthFilter').value;if(style)rows=rows.filter(x=>x.style===style);if(health)rows=rows.filter(x=>x.health===health);const sort=$('sortInventoryIntel').value;rows.sort((a,b)=>sort==='revenue'?b.revenue-a.revenue:sort==='roi'?(b.roi??-999)-(a.roi??-999):sort==='stock'?(b.left??-1)-(a.left??-1):sort==='slow'?b.slowScore-a.slowScore:Math.max(b.promoteScore,b.reorderScore,b.slowScore)-Math.max(a.promoteScore,a.reorderScore,a.slowScore));return rows;}
  function renderScorecard(){const rows=filtered().map(x=>[
    `<strong>${esc(x.name)}</strong><small>${esc(x.style)}</small>`,
    `<span class="health-pill health-${x.health.toLowerCase().replace(/[^a-z]+/g,'-')}">${esc(x.health)}</span>`,
    esc(x.left===null?'—':Math.round(x.left)+'mL'),money(x.revenue),x.roi===null?'—':esc(Math.round(x.roi)+'%'),esc(x.velocity.toFixed(1)+'mL/mo'),money(x.projected),`<a class="table-action" href="inventory.html?search=${encodeURIComponent(x.item.Fragrance||x.item.ID||'')}">Open</a>`
  ]);$('inventoryScorecard').innerHTML=table(['Bottle','Health','Left','Revenue','ROI','Velocity','Projected','Action'],rows);}
  function render(){
    buildModels();const models=state.models;
    const ml=models.reduce((s,x)=>s+(x.left||0),0),capital=models.reduce((s,x)=>s+x.remainingCost,0),projected=models.reduce((s,x)=>s+x.projected,0),slow=models.filter(x=>['Slow mover','Overstocked'].includes(x.health)).reduce((s,x)=>s+x.remainingCost,0),paid=models.filter(x=>x.cost>0&&x.revenue>=x.cost).length;
    $('intelMl').textContent=Math.round(ml)+'mL';$('intelCapital').textContent=money(capital);$('intelProjected').textContent=money(projected);$('intelProfit').textContent=money(projected-capital);$('intelSlowCapital').textContent=money(slow);$('intelPaid').textContent=paid;
    const promotes=models.filter(x=>x.left>20&&x.health!=='Strong performer').sort((a,b)=>b.promoteScore-a.promoteScore);
    const reorders=models.filter(x=>x.left>0&&x.left<=25&&x.soldMl>0).sort((a,b)=>b.reorderScore-a.reorderScore);
    const slows=models.filter(x=>x.slowScore>=45&&x.left>0).sort((a,b)=>b.slowScore-a.slowScore);
    const avoids=models.filter(x=>x.health==='Do not rebuy'||x.health==='Slow mover'||x.health==='Overstocked').sort((a,b)=>b.slowScore-a.slowScore);
    itemList('promoteCandidates',promotes,'promote');itemList('reorderCandidates',reorders,'reorder');itemList('slowCandidates',slows,'slow');itemList('avoidCandidates',avoids,'avoid');
    renderStyles(models);
    $('topBottleRevenue').innerHTML=table(['Bottle','Revenue','mL sold','ROI'],models.filter(x=>x.revenue>0).sort((a,b)=>b.revenue-a.revenue).slice(0,10).map(x=>[`<strong>${esc(x.name)}</strong>`,money(x.revenue),esc(Math.round(x.soldMl)+'mL'),x.roi===null?'—':esc(Math.round(x.roi)+'%')]));
    renderScorecard();
  }
  async function load(){
    $('inventoryIntelStatus').textContent='Loading live inventory and sales…';
    try{state.settings=await fetch('../settings.json',{cache:'no-store'}).then(r=>r.json());const [catalogue,items]=await Promise.all([get('catalogue'),get('orderItems')]);state.catalogue=catalogue;state.items=items;const styles=[...new Set(catalogue.map(i=>String(i['Scent Style']||'').trim()).filter(Boolean))].sort();$('styleFilter').innerHTML='<option value="">All Scent Styles</option>'+styles.map(s=>`<option>${esc(s)}</option>`).join('');render();$('inventoryIntelStatus').textContent='Live data updated '+new Date().toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})+' · Current season: '+southSeason();}catch(err){console.error(err);$('inventoryIntelStatus').textContent='Could not load Inventory Intelligence: '+err.message;}
  }
  $('refreshInventoryIntel').addEventListener('click',load);$('styleFilter').addEventListener('change',renderScorecard);$('healthFilter').addEventListener('change',renderScorecard);$('sortInventoryIntel').addEventListener('change',renderScorecard);load();
})();
