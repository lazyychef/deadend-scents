(function(){
  const $=id=>document.getElementById(id);
  const state={settings:null,orders:[],items:[],customers:[],catalogue:[]};
  const num=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;
  const money=v=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(num(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dateOf(v){const s=String(v||'').trim();if(!s)return null;let d;if(/^\d{4}-\d{2}-\d{2}/.test(s))d=new Date(s.slice(0,10)+'T12:00:00');else{const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);d=m?new Date(+m[3],+m[2]-1,+m[1],12):new Date(s);}return Number.isNaN(d.getTime())?null:d;}
  function endpoint(action){const base=state.settings.adminWriteEndpoint;return base+(base.includes('?')?'&':'?')+'action='+encodeURIComponent(action)+'&t='+Date.now();}
  async function get(action){const r=await fetch(endpoint(action),{cache:'no-store'});if(!r.ok)throw new Error(action+' request failed');const j=await r.json();if(j.ok===false)throw new Error(j.error||action+' failed');return j.items||[];}
  async function load(){
    $('analyticsStatus').textContent='Loading live business data…';
    try{
      state.settings=await fetch('../settings.json',{cache:'no-store'}).then(r=>r.json());
      const [orders,items,customers,catalogue]=await Promise.all([get('orders'),get('orderItems'),get('customers'),get('catalogue')]);
      Object.assign(state,{orders,items,customers,catalogue});
      render(); $('analyticsStatus').textContent='Live data updated '+new Date().toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'});
    }catch(err){console.error(err);$('analyticsStatus').textContent='Could not load analytics: '+err.message;}
  }
  function filteredOrders(){const f=$('periodFilter').value;if(f==='all')return state.orders;const now=new Date(),start=new Date(now);if(f==='month')start.setDate(1);else start.setDate(start.getDate()-Number(f));return state.orders.filter(o=>{const d=dateOf(o['Order Date']);return d&&d>=start&&d<=now;});}
  function orderIds(orders){return new Set(orders.map(o=>String(o['Order ID']||'')));}
  function filteredItems(orders){const ids=orderIds(orders);return state.items.filter(i=>ids.has(String(i['Order ID']||'')));}
  function group(rows,keyFn,valueFn=()=>1){const m=new Map();rows.forEach(r=>{const k=keyFn(r)||'Unknown';m.set(k,(m.get(k)||0)+valueFn(r));});return [...m].sort((a,b)=>b[1]-a[1]);}
  function render(){
    const orders=filteredOrders(),items=filteredItems(orders);const revenue=orders.reduce((s,o)=>s+num(o['Total Paid']),0),ml=orders.reduce((s,o)=>s+num(o['Total mL']),0),pending=orders.filter(o=>!/completed|posted|delivered/i.test(String(o['Order Status']||''))).length;
    const customerIds=new Set(orders.map(o=>o['Customer ID']).filter(Boolean));const repeat=state.customers.filter(c=>num(c.Orders)>1).length;
    $('kpiRevenue').textContent=money(revenue);$('kpiOrders').textContent=orders.length;$('kpiAverage').textContent=money(orders.length?revenue/orders.length:0);$('kpiMl').textContent=Math.round(ml)+'mL';$('kpiCustomers').textContent=customerIds.size;$('kpiPending').textContent=pending;$('kpiRepeat').textContent=repeat+' returning overall';
    renderMonthly(orders);renderRanks('sourceChart',group(orders,o=>o['Sales Source']||'Unknown',o=>num(o['Total Paid'])),'currency');renderBest(items);renderRanks('sizeBreakdown',group(items,i=>(num(i['Size mL'])||'?')+'mL',i=>num(i.Quantity)||1),'count');renderCustomers(orders);renderRanks('statusBreakdown',group(orders,o=>o['Order Status']||'Unknown'),'count');renderInventory();renderProfit(items);
  }
  function renderMonthly(orders){const monthly=group(orders,o=>{const d=dateOf(o['Order Date']);return d?d.toISOString().slice(0,7):'Unknown';},o=>num(o['Total Paid'])).sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);const max=Math.max(1,...monthly.map(x=>x[1]));$('monthlyChart').innerHTML=monthly.length?monthly.map(([k,v])=>`<div class="bar-item"><div class="bar-value">${money(v)}</div><div class="bar-track"><span style="height:${Math.max(4,v/max*100)}%"></span></div><div class="bar-label">${esc(k==='Unknown'?k:new Date(k+'-01T12:00:00').toLocaleDateString('en-AU',{month:'short',year:'2-digit'}))}</div></div>`).join(''):'<div class="empty">No orders in this period.</div>';}
  function renderRanks(id,rows,type){const max=Math.max(1,...rows.map(x=>x[1]));$(id).innerHTML=rows.length?rows.slice(0,8).map(([k,v],i)=>`<div class="rank-row"><strong>${i+1}. ${esc(k)}</strong><span>${type==='currency'?money(v):Math.round(v)}</span><div class="rank-meter"><i style="width:${v/max*100}%"></i></div></div>`).join(''):'<div class="empty">No data in this period.</div>';}
  function renderBest(items){const map=new Map();items.forEach(i=>{const n=[i.House,i.Fragrance].filter(Boolean).join(' · ')||'Unknown';const x=map.get(n)||{qty:0,ml:0,revenue:0};x.qty+=num(i.Quantity)||1;x.ml+=(num(i['Size mL'])*(num(i.Quantity)||1));x.revenue+=num(i['Line Total']);map.set(n,x);});const rows=[...map].sort((a,b)=>b[1].ml-a[1].ml).slice(0,10);$('bestSellers').innerHTML=table(['Fragrance','Qty','mL','Revenue'],rows.map(([n,x])=>[n,x.qty,x.ml,money(x.revenue)]));}
  function renderCustomers(orders){const m=new Map();orders.forEach(o=>{const n=o.Customer||'Unknown',x=m.get(n)||{orders:0,spend:0};x.orders++;x.spend+=num(o['Total Paid']);m.set(n,x);});const rows=[...m].sort((a,b)=>b[1].spend-a[1].spend).slice(0,10);$('topCustomers').innerHTML=table(['Customer','Orders','Spend'],rows.map(([n,x])=>[n,x.orders,money(x.spend)]));}
  function amountLeft(i){for(const k of ['Current Amount Left (mL)','Current mL','Amount Left','Remaining mL']){const v=num(i[k]);if(v||String(i[k]).trim()==='0')return v;}return null;}
  function renderInventory(){const visible=state.catalogue.filter(i=>!/hidden/i.test(String(i.Stock||i.Status||''))),mls=visible.map(amountLeft).filter(v=>v!==null),low=mls.filter(v=>v>0&&v<=20).length,out=visible.filter((i,ix)=>/out/i.test(String(i.Status||''))||amountLeft(i)===0).length,totalMl=mls.reduce((a,b)=>a+b,0);$('inventoryInsights').innerHTML=[['Active catalogue',visible.length],['Tracked stock',Math.round(totalMl)+'mL'],['Low stock ≤20mL',low],['Out of stock',out]].map(x=>`<div><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong></div>`).join('');}
  function renderProfit(items){const m=new Map();items.forEach(i=>{const n=[i.House,i.Fragrance].filter(Boolean).join(' · ')||'Unknown',x=m.get(n)||{revenue:0,cost:0,profit:0};x.revenue+=num(i['Line Total']);x.cost+=num(i['Product Cost']);x.profit+=num(i.Profit);m.set(n,x);});const rows=[...m].filter(([,x])=>x.revenue||x.cost||x.profit).sort((a,b)=>b[1].profit-a[1].profit).slice(0,10);$('profitLeaders').innerHTML=rows.length?table(['Fragrance','Revenue','Cost','Profit'],rows.map(([n,x])=>[n,money(x.revenue),money(x.cost),money(x.profit)])):'<div class="empty">No item-level pricing or cost data is recorded yet.</div>';}
  function table(headers,rows){return rows.length?`<table class="analytics-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i===0?' class="primary-cell"':''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty">No data in this period.</div>';}
  $('periodFilter').addEventListener('change',render);$('refreshAnalytics').addEventListener('click',load);load();
})();
