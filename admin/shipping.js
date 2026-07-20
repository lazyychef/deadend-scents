(function(){
  const $=id=>document.getElementById(id);
  const state={settings:null,orders:[],items:[],customers:[],selected:null};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;
  const money=v=>'$'+num(v).toFixed(2);
  const text=v=>String(v??'').trim();

  async function get(action){
    const ep=state.settings.adminWriteEndpoint;
    const url=ep+(ep.includes('?')?'&':'?')+'action='+encodeURIComponent(action)+'&t='+Date.now();
    const res=await fetch(url,{cache:'no-store'});
    const data=await res.json();
    if(data.ok===false) throw new Error(data.error||'Apps Script request failed.');
    return data;
  }

  function orderStatus(order){ return text(order['Order Status']||'New'); }
  function paymentStatus(order){ return text(order['Payment Status']||''); }
  function isHistorical(order){ return /historical/i.test(text(order['Sales Source'])+' '+text(order.Notes)); }
  function groupFor(order){
    const s=orderStatus(order).toLowerCase();
    if(isHistorical(order)||/(completed|posted|delivered|collected|closed)/.test(s)) return 'completed';
    if(/(packed|ready)/.test(s)) return 'ready';
    return 'pending';
  }
  function orderItems(id){ return state.items.filter(i=>text(i['Order ID'])===text(id)); }
  function customerFor(order){
    const id=text(order['Customer ID']);
    return state.customers.find(c=>text(c['Customer ID'])===id)||state.customers.find(c=>text(c.Customer).toLowerCase()===text(order.Customer).toLowerCase())||{};
  }
  function formatDate(v){
    if(!v) return '';
    const d=new Date(v);
    if(Number.isNaN(d.getTime())) return text(v).split(' ')[0];
    return new Intl.DateTimeFormat('en-AU',{day:'2-digit',month:'short',year:'numeric'}).format(d);
  }

  async function load(){
    $('shippingStatus').textContent='Loading orders and order items…';
    state.settings=await fetch('../settings.json',{cache:'no-store'}).then(r=>r.json());
    const [orders,items,customers]=await Promise.all([get('orders'),get('orderItems'),get('customers')]);
    state.orders=orders.items||[]; state.items=items.items||[]; state.customers=customers.items||[];
    render();
    $('shippingStatus').textContent='Live data loaded from Google Sheets.';
  }

  function matches(order,q){
    if(!q) return true;
    const itemText=orderItems(order['Order ID']).map(i=>[i.House,i.Fragrance,i['Size mL']].join(' ')).join(' ');
    return [order['Order ID'],order.Customer,order['Tracking Number'],order['Order Status'],order['Payment Status'],itemText].join(' ').toLowerCase().includes(q);
  }

  function render(){
    const q=text($('shippingSearch').value).toLowerCase();
    const grouped={pending:[],ready:[],completed:[]};
    state.orders.filter(o=>matches(o,q)).forEach(o=>grouped[groupFor(o)].push(o));
    $('pendingCount').textContent=state.orders.filter(o=>groupFor(o)==='pending').length;
    $('readyCount').textContent=state.orders.filter(o=>groupFor(o)==='ready').length;
    $('completedCount').textContent=state.orders.filter(o=>groupFor(o)==='completed').length;
    $('unpaidCount').textContent=state.orders.filter(o=>!/(paid|complete)/i.test(paymentStatus(o))).length;
    ['pending','ready','completed'].forEach(k=>{
      $(k+'Badge').textContent=grouped[k].length;
      $(k+'Orders').innerHTML=grouped[k].slice(0,k==='completed'?60:100).map(card).join('')||'<div class="empty">No matching orders.</div>';
    });
    document.querySelectorAll('[data-open-order]').forEach(btn=>btn.onclick=()=>openOrder(btn.dataset.openOrder));
  }

  function card(order){
    const id=text(order['Order ID']);
    const items=orderItems(id);
    const itemSummary=items.length?items.slice(0,2).map(i=>`${text(i.Fragrance)||'Fragrance'} ${text(i['Size mL'])}mL`).join(' · ')+(items.length>2?` +${items.length-2} more`:''):`${text(order['Items Sold'])||0} item(s)`;
    const tracking=text(order['Tracking Number']);
    return `<article class="shipping-card ${groupFor(order)}">
      <button type="button" class="shipping-card-main" data-open-order="${esc(id)}">
        <span class="shipping-card-top"><strong>${esc(id||'Order')}</strong><em>${esc(orderStatus(order))}</em></span>
        <span class="shipping-customer">${esc(order.Customer||'Unknown customer')}</span>
        <small>${esc(formatDate(order['Order Date']))} · ${esc(itemSummary)}</small>
        ${tracking?`<span class="shipping-tracking">Tracking: ${esc(tracking)}</span>`:''}
        <span class="shipping-card-bottom"><b>${money(order['Total Paid'])}</b><i>${esc(paymentStatus(order)||'No payment status')}</i></span>
      </button>
    </article>`;
  }

  function openOrder(id){
    const order=state.orders.find(o=>text(o['Order ID'])===text(id)); if(!order) return;
    state.selected=order;
    const items=orderItems(id), customer=customerFor(order), group=groupFor(order);
    const rows=items.map(i=>`<tr><td>${esc([i.House,i.Fragrance].filter(Boolean).join(' · ')||'Fragrance')}</td><td>${esc(i['Size mL'])}mL</td><td>${esc(i.Quantity||1)}</td><td>${money(i['Line Total']||num(i['Price Each'])*num(i.Quantity||1))}</td></tr>`).join('');
    $('shippingDialogContent').innerHTML=`
      <div class="shipping-detail-head"><div><p class="eyebrow">${esc(group==='completed'?'Order history':'Fulfilment')}</p><h2>${esc(id)}</h2><p class="muted">${esc(order.Customer||'Unknown customer')} · ${esc(formatDate(order['Order Date']))}</p></div><strong>${money(order['Total Paid'])}</strong></div>
      <div class="shipping-detail-grid">
        <section><h3>Order items</h3><div class="data-table-wrap"><table class="analytics-table"><thead><tr><th>Fragrance</th><th>Size</th><th>Qty</th><th>Total</th></tr></thead><tbody>${rows||'<tr><td colspan="4">No item rows found.</td></tr>'}</tbody></table></div></section>
        <section class="shipping-customer-panel"><h3>Customer</h3><p><strong>${esc(order.Customer||'Unknown')}</strong></p>${customer.Email?`<p>${esc(customer.Email)}</p>`:''}${customer.Phone?`<p>${esc(customer.Phone)}</p>`:''}<p class="muted">${esc(customer.Notes||'No customer notes recorded.')}</p><p><b>Source:</b> ${esc(order['Sales Source']||'—')}<br><b>Payment:</b> ${esc(paymentStatus(order)||'—')}</p></section>
      </div>
      <section class="shipping-update-panel">
        <div class="form-grid three">
          <label>Order status<select id="shipOrderStatus">${['New','Processing','Packed','Ready to Post','Posted','Delivered','Collected','Completed'].map(s=>`<option${s.toLowerCase()===orderStatus(order).toLowerCase()?' selected':''}>${s}</option>`).join('')}</select></label>
          <label>Payment status<select id="shipPaymentStatus">${['Pending','Paid','Part Paid','Refunded'].map(s=>`<option${s.toLowerCase()===paymentStatus(order).toLowerCase()?' selected':''}>${s}</option>`).join('')}</select></label>
          <label>Tracking number<input id="shipTracking" value="${esc(order['Tracking Number']||'')}" placeholder="Australia Post tracking"></label>
        </div>
        <div class="shipping-quick-actions">
          ${group==='pending'?'<button type="button" class="button subtle" data-quick-status="Packed">Mark packed</button>':''}
          ${group==='ready'?'<button type="button" class="button subtle" data-quick-status="Posted">Mark posted</button>':''}
          ${group==='completed'&&!isHistorical(order)?'<button type="button" class="button subtle" data-quick-status="Processing">Reopen order</button>':''}
          <button id="saveShippingUpdate" type="button" class="button primary">Save shipping update</button>
          <button id="copyShippingMessage" type="button" class="button subtle">Copy customer message</button>
          <button id="printPackingSlip" type="button" class="button subtle">Print packing slip</button>
        </div>
        <p id="shippingSaveStatus" class="analytics-status"></p>
      </section>`;
    document.querySelectorAll('[data-quick-status]').forEach(b=>b.onclick=()=>{ $('shipOrderStatus').value=b.dataset.quickStatus; saveUpdate(); });
    $('saveShippingUpdate').onclick=saveUpdate;
    $('copyShippingMessage').onclick=copyMessage;
    $('printPackingSlip').onclick=printSlip;
    $('shippingDialog').showModal();
  }

  async function saveUpdate(){
    if(!state.selected) return;
    const id=text(state.selected['Order ID']);
    const payload={action:'updateOrderStatus',orderId:id,orderStatus:$('shipOrderStatus').value,paymentStatus:$('shipPaymentStatus').value,trackingNumber:text($('shipTracking').value)};
    $('shippingSaveStatus').textContent='Saving update…';
    await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,payload);
    $('shippingSaveStatus').textContent='Update submitted. Refreshing…';
    setTimeout(async()=>{ await load(); $('shippingDialog').close(); },2400);
  }

  async function copyMessage(){
    const order=state.selected, tracking=text($('shipTracking').value), status=$('shipOrderStatus').value;
    const first=text(order.Customer).split(/\s+/)[0]||'there';
    let message=`Hi ${first}, your DeadEnd Scents order ${text(order['Order ID'])} is ${status.toLowerCase()}.`;
    if(tracking) message+=` Your tracking number is ${tracking}.`;
    message+=' Thanks again for your order!';
    try{ await navigator.clipboard.writeText(message); $('shippingSaveStatus').textContent='Customer message copied.'; }
    catch(e){ window.prompt('Copy this message:',message); }
  }

  function printSlip(){
    const order=state.selected, items=orderItems(order['Order ID']);
    const rows=items.map(i=>`<tr><td>${esc([i.House,i.Fragrance].filter(Boolean).join(' · '))}</td><td>${esc(i['Size mL'])}mL</td><td>${esc(i.Quantity||1)}</td></tr>`).join('');
    const w=window.open('','_blank','width=760,height=900');
    w.document.write(`<!doctype html><html><head><title>Packing Slip ${esc(order['Order ID'])}</title><style>body{font-family:Arial,sans-serif;padding:35px;color:#182d09}h1{margin:0}header{border-bottom:3px solid #a65b32;padding-bottom:18px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;padding:10px;border-bottom:1px solid #ccc}footer{margin-top:40px;border-top:1px solid #ccc;padding-top:15px;font-size:12px}</style></head><body><header><h1>DeadEnd Scents</h1><p>Packing Slip · ${esc(order['Order ID'])}</p></header><h2>${esc(order.Customer||'Customer')}</h2><p>Order date: ${esc(formatDate(order['Order Date']))}<br>Sales source: ${esc(order['Sales Source']||'—')}</p><table><thead><tr><th>Fragrance</th><th>Size</th><th>Qty</th></tr></thead><tbody>${rows}</tbody></table>${order.Notes?`<p><strong>Notes:</strong> ${esc(order.Notes)}</p>`:''}<footer>Check each item before sealing the parcel.</footer><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    $('shippingSearch').oninput=render;
    $('refreshShipping').onclick=()=>load().catch(e=>$('shippingStatus').textContent=e.message);
    load().catch(e=>$('shippingStatus').textContent='Could not load shipping data: '+e.message);
  });
})();
