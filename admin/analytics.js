(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={settings:null,orders:[],items:[],customers:[],catalogue:[]};
  const num=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;
  const money=v=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(num(v));
  const pct=v=>(Number.isFinite(v)?v:0).toFixed(0)+'%';
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
      render();
      $('analyticsStatus').textContent='Live data updated '+new Date().toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'});
    }catch(err){console.error(err);$('analyticsStatus').textContent='Could not load analytics: '+err.message;}
  }
  function periodStart(filter){const now=new Date();if(filter==='all')return null;const start=new Date(now);if(filter==='month')start.setDate(1);else start.setDate(start.getDate()-Number(filter));start.setHours(0,0,0,0);return start;}
  function filteredOrders(){const start=periodStart($('periodFilter').value);if(!start)return state.orders;const now=new Date();return state.orders.filter(o=>{const d=dateOf(o['Order Date']);return d&&d>=start&&d<=now;});}
  function orderIds(orders){return new Set(orders.map(o=>String(o['Order ID']||'')));}
  function filteredItems(orders){const ids=orderIds(orders);return state.items.filter(i=>ids.has(String(i['Order ID']||'')));}
  function group(rows,keyFn,valueFn=()=>1){const m=new Map();rows.forEach(r=>{const k=keyFn(r)||'Unknown';m.set(k,(m.get(k)||0)+valueFn(r));});return [...m].sort((a,b)=>b[1]-a[1]);}
  function sum(rows,key){return rows.reduce((s,r)=>s+num(r[key]),0);}
  function currentAndPreviousMonth(){
    const now=new Date(), currentStart=new Date(now.getFullYear(),now.getMonth(),1), previousStart=new Date(now.getFullYear(),now.getMonth()-1,1), previousEnd=new Date(now.getFullYear(),now.getMonth(),0,23,59,59);
    const current=state.orders.filter(o=>{const d=dateOf(o['Order Date']);return d&&d>=currentStart&&d<=now;});
    const previous=state.orders.filter(o=>{const d=dateOf(o['Order Date']);return d&&d>=previousStart&&d<=previousEnd;});
    return {current,previous};
  }
  function change(current,previous){if(!previous)return current?100:0;return ((current-previous)/previous)*100;}
  function amountLeft(i){for(const k of ['Current Amount Left (mL)','Current mL','Amount Left','Amount Left mL','Remaining mL','Current Amount Left']){if(i[k]!==undefined&&String(i[k]).trim()!=='')return num(i[k]);}return null;}
  function bottleSize(i){for(const k of ['Bottle Size (mL)','Bottle Size','Size mL','Original mL']){if(i[k]!==undefined&&String(i[k]).trim()!=='')return num(i[k]);}return 0;}
  function purchasePrice(i){for(const k of ['Purchase Price','Purchase Cost','Cost','Paid']){if(i[k]!==undefined&&String(i[k]).trim()!=='')return num(i[k]);}return 0;}
  function itemName(i){return [i.House,i.Fragrance].filter(Boolean).join(' · ')||i.Fragrance||i.House||i.ID||'Unknown';}
  function projectedRevenue(i){const ml=amountLeft(i);if(ml===null||ml<=0)return 0;const p10=num(i['10mL']),p5=num(i['5mL']),p3=num(i['3mL']);if(p10>0)return Math.floor(ml/10)*p10+(ml%10>=5&&p5>0?p5:0);if(p5>0)return Math.floor(ml/5)*p5;if(p3>0)return Math.floor(ml/3)*p3;return 0;}
  function revenueByProduct(items){const m=new Map();items.forEach(i=>{const key=(i['Fragrance ID']||itemName(i)).toString().toLowerCase();const x=m.get(key)||{name:itemName(i),revenue:0,cost:0,profit:0,ml:0,qty:0};x.revenue+=num(i['Line Total']);x.cost+=num(i['Product Cost']);x.profit+=num(i.Profit);x.ml+=num(i['Size mL'])*(num(i.Quantity)||1);x.qty+=num(i.Quantity)||1;m.set(key,x);});return m;}
  function render(){
    const orders=filteredOrders(),items=filteredItems(orders),revenue=sum(orders,'Total Paid'),ml=sum(orders,'Total mL'),pending=orders.filter(o=>!/completed|posted|delivered/i.test(String(o['Order Status']||''))).length;
    const customerIds=new Set(orders.map(o=>o['Customer ID']).filter(Boolean));
    const selectedCustomerOrders=new Map();orders.forEach(o=>{const id=o['Customer ID']||o.Customer;if(id)selectedCustomerOrders.set(id,(selectedCustomerOrders.get(id)||0)+1);});
    const returning=[...selectedCustomerOrders.values()].filter(v=>v>1).length;
    $('kpiRevenue').textContent=money(revenue);$('kpiOrders').textContent=orders.length;$('kpiAverage').textContent=money(orders.length?revenue/orders.length:0);$('kpiMl').textContent=Math.round(ml)+'mL';$('kpiCustomers').textContent=customerIds.size;$('kpiPending').textContent=pending;$('kpiRepeat').textContent=returning+' returning in period';
    renderExecutiveSummary();renderMonthly(orders);renderRanks('sourceChart',group(orders,o=>o['Sales Source']||'Unknown',o=>num(o['Total Paid'])),'currency');renderBest(items);renderRanks('sizeBreakdown',group(items,i=>(num(i['Size mL'])||'?')+'mL',i=>num(i.Quantity)||1),'count');renderCustomers(orders);renderRanks('statusBreakdown',group(orders,o=>o['Order Status']||'Unknown'),'count');renderInventory();renderBottlePerformance();renderRecommendations();
  }
  function renderExecutiveSummary(){
    const {current,previous}=currentAndPreviousMonth(),cr=sum(current,'Total Paid'),pr=sum(previous,'Total Paid'),co=current.length,po=previous.length;
    const allRevenue=sum(state.orders,'Total Paid'),allOrders=state.orders.length;
    const customerOrderCounts=new Map();state.orders.forEach(o=>{const id=o['Customer ID']||o.Customer;if(id)customerOrderCounts.set(id,(customerOrderCounts.get(id)||0)+1);});
    const repeatCustomers=[...customerOrderCounts.values()].filter(v=>v>1).length,totalCustomers=customerOrderCounts.size;
    const cards=[
      ['This month',money(cr),`${change(cr,pr)>=0?'+':''}${pct(change(cr,pr))} vs last month`,change(cr,pr)],
      ['Orders this month',co,`${change(co,po)>=0?'+':''}${pct(change(co,po))} vs last month`,change(co,po)],
      ['All-time revenue',money(allRevenue),`${allOrders} recorded orders`,0],
      ['Repeat customer rate',pct(totalCustomers?repeatCustomers/totalCustomers*100:0),`${repeatCustomers} of ${totalCustomers} customers`,0]
    ];
    $('executiveSummary').innerHTML=cards.map(([label,value,note,delta])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong><em class="${delta>0?'positive':delta<0?'negative':''}">${esc(note)}</em></article>`).join('');
  }
  function renderMonthly(orders){const monthly=group(orders,o=>{const d=dateOf(o['Order Date']);return d?d.toISOString().slice(0,7):'Unknown';},o=>num(o['Total Paid'])).sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);const max=Math.max(1,...monthly.map(x=>x[1]));$('monthlyChart').innerHTML=monthly.length?monthly.map(([k,v])=>`<div class="bar-item"><div class="bar-value">${money(v)}</div><div class="bar-track"><span style="height:${Math.max(4,v/max*100)}%"></span></div><div class="bar-label">${esc(k==='Unknown'?k:new Date(k+'-01T12:00:00').toLocaleDateString('en-AU',{month:'short',year:'2-digit'}))}</div></div>`).join(''):'<div class="empty">No orders in this period.</div>';}
  function renderRanks(id,rows,type){const max=Math.max(1,...rows.map(x=>x[1]));$(id).innerHTML=rows.length?rows.slice(0,8).map(([k,v],i)=>`<div class="rank-row"><strong>${i+1}. ${esc(k)}</strong><span>${type==='currency'?money(v):Math.round(v)}</span><div class="rank-meter"><i style="width:${v/max*100}%"></i></div></div>`).join(''):'<div class="empty">No data in this period.</div>';}
  function renderBest(items){const map=new Map();items.forEach(i=>{const n=itemName(i),x=map.get(n)||{qty:0,ml:0,revenue:0};x.qty+=num(i.Quantity)||1;x.ml+=num(i['Size mL'])*(num(i.Quantity)||1);x.revenue+=num(i['Line Total']);map.set(n,x);});const rows=[...map].sort((a,b)=>b[1].ml-a[1].ml).slice(0,10);$('bestSellers').innerHTML=table(['Fragrance','Qty','mL','Revenue'],rows.map(([n,x])=>[n,x.qty,x.ml,money(x.revenue)]));}
  function renderCustomers(orders){const m=new Map();orders.forEach(o=>{const n=o.Customer||'Unknown',x=m.get(n)||{orders:0,spend:0};x.orders++;x.spend+=num(o['Total Paid']);m.set(n,x);});const rows=[...m].sort((a,b)=>b[1].spend-a[1].spend).slice(0,10);$('topCustomers').innerHTML=table(['Customer','Orders','Spend','Average'],rows.map(([n,x])=>[n,x.orders,money(x.spend),money(x.spend/x.orders)]));}
  function renderInventory(){const visible=state.catalogue.filter(i=>!/hidden/i.test(String(i.Stock||i.Status||''))),mls=visible.map(amountLeft).filter(v=>v!==null),low=mls.filter(v=>v>0&&v<=20).length,out=visible.filter(i=>/out/i.test(String(i.Status||''))||amountLeft(i)===0).length,totalMl=mls.reduce((a,b)=>a+b,0),capital=visible.reduce((s,i)=>s+purchasePrice(i),0),future=visible.reduce((s,i)=>s+projectedRevenue(i),0);$('inventoryInsights').innerHTML=[['Active catalogue',visible.length],['Tracked stock',Math.round(totalMl)+'mL'],['Low stock ≤20mL',low],['Out of stock',out],['Purchase capital',money(capital)],['Projected sales left',money(future)]].map(x=>`<div><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong></div>`).join('');}
  function renderBottlePerformance(){
    const productSales=revenueByProduct(state.items),rows=[];
    state.catalogue.forEach(i=>{const key=(i.ID||itemName(i)).toString().toLowerCase(),sale=productSales.get(key)||productSales.get(itemName(i).toLowerCase())||{revenue:0,ml:0},cost=purchasePrice(i),left=amountLeft(i),size=bottleSize(i),roi=cost>0?(sale.revenue-cost)/cost*100:0;rows.push({name:itemName(i),revenue:sale.revenue,cost,roi,left,size,future:projectedRevenue(i)});});
    rows.sort((a,b)=>b.revenue-a.revenue);
    $('bottlePerformance').innerHTML=table(['Fragrance','Revenue','Cost','ROI','Left','Projected'],rows.slice(0,12).map(x=>[x.name,money(x.revenue),money(x.cost),x.cost?pct(x.roi):'—',x.left===null?'—':Math.round(x.left)+'mL',money(x.future)]));
    const paid=rows.filter(x=>x.cost>0&&x.revenue>=x.cost).length,tracked=rows.filter(x=>x.cost>0).length;
    $('bottlePerformanceNote').textContent=`${paid} of ${tracked} bottles with purchase costs recorded have paid for themselves. Historical order items without line prices cannot be attributed to bottle revenue.`;
  }
  function renderRecommendations(){
    const sales=revenueByProduct(state.items),candidates=state.catalogue.map(i=>{const key=(i.ID||itemName(i)).toString().toLowerCase(),s=sales.get(key)||sales.get(itemName(i).toLowerCase())||{revenue:0,ml:0,qty:0};return {item:i,name:itemName(i),left:amountLeft(i),revenue:s.revenue,ml:s.ml,qty:s.qty,cost:purchasePrice(i),future:projectedRevenue(i)};});
    const lowFast=candidates.filter(x=>x.left!==null&&x.left>0&&x.left<=20&&x.ml>0).sort((a,b)=>b.ml-a.ml).slice(0,5);
    const slow=candidates.filter(x=>x.left!==null&&x.left>=40&&x.ml===0).sort((a,b)=>b.left-a.left).slice(0,5);
    const paid=candidates.filter(x=>x.cost>0&&x.revenue>=x.cost).sort((a,b)=>(b.revenue-b.cost)-(a.revenue-a.cost)).slice(0,5);
    const blocks=[];
    if(lowFast.length)blocks.push(['Reorder candidates',lowFast.map(x=>`${x.name} — ${Math.round(x.left)}mL left, ${Math.round(x.ml)}mL sold`)]);
    if(slow.length)blocks.push(['Feature candidates',slow.map(x=>`${x.name} — ${Math.round(x.left)}mL left with no priced item sales recorded`)]);
    if(paid.length)blocks.push(['Paid-for bottles',paid.map(x=>`${x.name} — ${money(x.revenue-x.cost)} above purchase cost`)]);
    $('recommendations').innerHTML=blocks.length?blocks.map(([title,list])=>`<section><h3>${esc(title)}</h3>${list.map(v=>`<p>${esc(v)}</p>`).join('')}</section>`).join(''):'<div class="empty">More item-level sales data is needed before reliable recommendations can be generated.</div>';
  }
  function table(headers,rows){return rows.length?`<table class="analytics-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i===0?' class="primary-cell"':''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty">No data in this period.</div>';}
  $('periodFilter').addEventListener('change',render);$('refreshAnalytics').addEventListener('click',load);load();
})();
