(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={settings:null,catalogue:[],items:[],orders:[],wishlist:[],last:null};
  const num=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;
  const money=v=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(num(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const norm=v=>String(v||'').trim().toLowerCase();
  const stop=new Set('the and for with from into pour homme woman women men eau de parfum perfume extrait original creation inspired by intense edition el'.split(' '));
  function tokens(v){return [...new Set(String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(x=>x.length>2&&!stop.has(x)))];}
  function splitValues(v){return String(v||'').split(/[,/|;]+/).map(x=>norm(x)).filter(Boolean);}
  function itemName(i){return [i.House||i.house,i.Fragrance||i.name].filter(Boolean).join(' · ')||i.Fragrance||i.name||i.ID||'Unknown';}
  function endpoint(action){const base=state.settings.adminWriteEndpoint;return base+(base.includes('?')?'&':'?')+'action='+encodeURIComponent(action)+'&t='+Date.now();}
  async function get(action){const r=await fetch(endpoint(action),{cache:'no-store'});if(!r.ok)throw new Error(action+' request failed');const j=await r.json();if(j.ok===false)throw new Error(j.error||action+' failed');return j.items||[];}
  function setOptions(id,values,placeholder){const el=$(id),current=el.value;const unique=[...new Set(values.map(v=>String(v||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));el.innerHTML=`<option value="">${esc(placeholder)}</option>`+unique.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(unique.includes(current))el.value=current;}
  async function load(){
    try{
      state.settings=await fetch('../settings.json',{cache:'no-store'}).then(r=>r.json());
      const [catalogue,items,orders,wishlist]=await Promise.all([get('catalogue'),get('orderItems'),get('orders'),get('wishlist')]);
      Object.assign(state,{catalogue,items,orders,wishlist});
      setOptions('candidateScentStyle',catalogue.map(i=>i['Scent Style']), 'Select scent style');
      setOptions('candidateSeason',catalogue.flatMap(i=>splitValues(i.Season)), 'Not specified');
      setOptions('candidateOccasion',catalogue.flatMap(i=>splitValues(i.Occasion)), 'Not specified');
      $('intelligenceStatus').textContent=`Ready · ${catalogue.length} catalogue bottles, ${items.length} order items and ${wishlist.length} wishlist entries loaded`;
      renderWishlist();
    }catch(err){console.error(err);$('intelligenceStatus').textContent='Could not load live business data: '+err.message;}
  }
  function cryptoId(){return 'W-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
  function formData(){return {id:state.last?.input?.id||cryptoId(),name:$('candidateName').value.trim(),house:$('candidateHouse').value.trim(),collection:$('candidateCollection').value,scentStyle:$('candidateScentStyle').value,season:$('candidateSeason').value,occasion:$('candidateOccasion').value,cost:num($('candidateCost').value),shipping:num($('candidateShipping').value),rrp:num($('candidateRrp').value),size:num($('candidateSize').value),notes:$('candidateNotes').value.trim(),interest:num($('candidateInterest').value),status:$('candidateStatus').value,url:$('candidateUrl').value.trim(),updated:new Date().toISOString()};}
  const profiles={auto:{target:{3:2.6,5:2.4,10:2.1},minimums:{3:4,5:6,10:8}},budget:{target:{3:2.2,5:2.0,10:1.8},minimums:{3:4,5:6,10:8}},premium:{target:{3:3.1,5:2.8,10:2.45},minimums:{3:8,5:12,10:20}}};
  function pricingType(collection){const c=norm(collection);return c.includes('niche')?'premium':(c.includes('middle')||c.includes('inspired'))?'budget':'auto';}
  function recommendedPrice(ml,x){const p=profiles[pricingType(x.collection)],landed=x.cost+x.shipping,costPerMl=landed/Math.max(1,x.size),rrpPerMl=x.rrp/Math.max(1,x.size),costBased=costPerMl*ml*p.target[ml],rrpCeiling=rrpPerMl?rrpPerMl*ml*1.18:Infinity,raw=Math.max(p.minimums[ml],Math.min(costBased,rrpCeiling));return Math.max(p.minimums[ml],Math.ceil(raw));}
  function suggestPrices(x){x.p3=recommendedPrice(3,x);x.p5=recommendedPrice(5,x);x.p10=recommendedPrice(10,x);return x;}
  function sharedList(a,b){const bs=new Set(splitValues(b));return splitValues(a).filter(v=>bs.has(v));}
  function similarity(candidate,item){
    let score=0,reasons=[];
    const style=norm(candidate.scentStyle), itemStyle=norm(item['Scent Style']);
    if(style&&itemStyle&&style===itemStyle){score+=45;reasons.push('same '+candidate.scentStyle+' Scent Style');}
    const seasonHits=sharedList(candidate.season,item.Season);if(seasonHits.length){score+=15;reasons.push('shared season: '+seasonHits.join(', '));}
    const occasionHits=sharedList(candidate.occasion,item.Occasion);if(occasionHits.length){score+=15;reasons.push('shared occasion: '+occasionHits.join(', '));}
    if(candidate.collection&&norm(candidate.collection)===norm(item.Collection)){score+=10;reasons.push('same '+candidate.collection+' collection');}
    const a=tokens(candidate.notes),b=tokens([item.Notes,item.Description,item.Performance,item.Projection,item.Inspiration].filter(Boolean).join(' '));
    if(a.length&&b.length){const bs=new Set(b),hits=a.filter(x=>bs.has(x));const noteScore=Math.min(15,(hits.length/Math.max(3,a.length))*15);score+=noteScore;if(hits.length)reasons.push('shared notes/accords: '+hits.slice(0,5).join(', '));}
    return {score:clamp(score,0,100),reasons};
  }
  function salesProfile(){const by=new Map();state.items.forEach(i=>{const keys=[i['Fragrance ID'],itemName(i)].filter(Boolean).map(v=>norm(v));keys.forEach(key=>{const x=by.get(key)||{ml:0,revenue:0,qty:0};x.ml+=num(i['Size mL'])*(num(i.Quantity)||1);x.revenue+=num(i['Line Total']);x.qty+=num(i.Quantity)||1;by.set(key,x);});});return by;}
  function analyse(raw){
    const x=suggestPrices({...raw});
    const matches=state.catalogue.map(i=>({item:i,...similarity(x,i)})).sort((a,b)=>b.score-a.score).slice(0,5);
    const top=matches[0]?.score||0,highOverlap=matches.filter(m=>m.score>=55).length,sales=salesProfile();let relevantMl=0,relevantCount=0;
    matches.forEach(m=>{if(m.score<25)return;const s=sales.get(norm(m.item.ID))||sales.get(norm(itemName(m.item)));if(s){relevantMl+=s.ml*(m.score/100);relevantCount++;}});
    const totalCost=x.cost+x.shipping,reserve=Math.max(8,Math.round(x.size*.08)),saleable=Math.max(0,x.size-reserve),blendedMl=(x.p3/3+x.p5/5+x.p10/10)/3;
    const projected=blendedMl*saleable,profit=projected-totalCost,roi=totalCost>0?profit/totalCost*100:0,breakEvenMl=blendedMl>0?totalCost/blendedMl:0;
    const financial=clamp(35+Math.min(45,roi/8)+(breakEvenMl<=saleable*.35?15:breakEvenMl<=saleable*.55?7:-8),0,100);
    const diversity=clamp(100-top-(highOverlap>2?8:0),0,100),demand=clamp(35+Math.min(45,relevantMl/2)+(relevantCount?10:0),0,100),fun=clamp(x.interest*20,0,100);
    const score=Math.round(financial*.38+diversity*.27+demand*.22+fun*.13);
    let verdict='SKIP',klass='skip';if(score>=78){verdict='BUY';klass='buy';}else if(score>=62){verdict='GOOD BUY';klass='buy';}else if(score>=46){verdict='WAIT / SAMPLE FIRST';klass='wait';}
    const reasons=[],warnings=[];
    if(financial>=75)reasons.push(`Strong projected sample economics: ${Math.round(roi)}% potential ROI.`);else if(financial<45)warnings.push('Weak financial margin at the entered purchase price.');
    if(diversity>=70)reasons.push('Adds a distinct Scent Style/profile to the current catalogue.');else warnings.push(`Strongest overlap is ${itemName(matches[0]?.item||{})} at ${Math.round(top)}%.`);
    if(demand>=65)reasons.push('Closest catalogue matches have useful recorded sample sales.');else if(!relevantCount)warnings.push('Limited item-level sales evidence exists for the closest matching profiles.');
    if(x.interest>=4)reasons.push('High personal interest adds real collecting value beyond pure ROI.');
    if(breakEvenMl>saleable*.6)warnings.push(`Around ${Math.ceil(breakEvenMl)}mL may need to sell before the landed cost is recovered.`);
    return {input:x,matches,financial,diversity,demand,fun,score,verdict,klass,totalCost,reserve,saleable,blendedMl,projected,profit,roi,breakEvenMl,reasons,warnings};
  }
  function render(a){
    state.last=a;$('analysisResults').hidden=false;$('saveWishlist').disabled=false;$('verdictLabel').textContent=a.verdict;$('verdictLabel').className='verdict-'+a.klass;$('buyScore').textContent=a.score;
    $('verdictSummary').textContent=a.score>=62?'Worth serious consideration at this price.':a.score>=46?'Promising, but sampling or waiting for a stronger deal lowers the risk.':'The economics or catalogue fit do not currently justify the blind buy.';
    const cards=[['Financial',a.financial,'ROI and break-even'],['Catalogue diversity',a.diversity,'Lower overlap scores higher'],['Sales demand',a.demand,'Closest-match recorded sales'],['Fun factor',a.fun,'Your personal interest']];
    $('scoreCards').innerHTML=cards.map(([l,v,n])=>`<article><span>${esc(l)}</span><strong>${Math.round(v)}</strong><div class="score-meter"><i style="width:${v}%"></i></div><em>${esc(n)}</em></article>`).join('');
    $('similarityList').innerHTML=a.matches.length?a.matches.map(m=>`<div class="similarity-row"><div><strong>${esc(itemName(m.item))}</strong><span>${esc(m.reasons.length?m.reasons.join(' · '):'No strong structured similarities found')}</span></div><b>${Math.round(m.score)}%</b><div class="rank-meter"><i style="width:${m.score}%"></i></div></div>`).join(''):'<div class="empty">No catalogue bottles available to compare.</div>';
    const metrics=[['Landed bottle cost',money(a.totalCost)],['Cost per mL',money(a.totalCost/a.input.size)],['Suggested 3mL',money(a.input.p3)],['Suggested 5mL',money(a.input.p5)],['Suggested 10mL',money(a.input.p10)],['Saleable volume estimate',`${a.saleable}mL (${a.reserve}mL reserved)`],['Projected sample revenue',money(a.projected)],['Projected profit',money(a.profit)],['Potential ROI',`${Math.round(a.roi)}%`],['Approx. break-even',`${Math.ceil(a.breakEvenMl)}mL sold`]];
    $('financialModel').innerHTML=metrics.map(([l,v])=>`<div><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('');
    $('decisionReasons').innerHTML=`<h3>Reasons</h3>${(a.reasons.length?a.reasons:['No major positive signals yet.']).map(v=>`<p class="reason-positive">${esc(v)}</p>`).join('')}<h3>Warnings</h3>${(a.warnings.length?a.warnings:['No major warnings at the entered price.']).map(v=>`<p class="reason-warning">${esc(v)}</p>`).join('')}`;
    window.scrollTo({top:$('analysisResults').offsetTop-20,behavior:'smooth'});
  }
  function sheetRow(a){const top=a.matches[0]||{};return {'Wishlist ID':a.input.id,'House':a.input.house,'Fragrance':a.input.name,'Collection':a.input.collection,'Scent Style':a.input.scentStyle,'Season':a.input.season,'Occasion':a.input.occasion,'Purchase Price':a.input.cost,'Shipping / Extra':a.input.shipping,'Landed Cost':a.totalCost,'Normal RRP':a.input.rrp,'Bottle Size mL':a.input.size,'Suggested 3mL':a.input.p3,'Suggested 5mL':a.input.p5,'Suggested 10mL':a.input.p10,'Buy Score':a.score,'Verdict':a.verdict,'Projected ROI %':a.roi,'Closest Match':itemName(top.item||{}),'Closest Match %':top.score||0,'Similarity Reasons':(top.reasons||[]).join(' · '),'Status':a.input.status,'Personal Interest':a.input.interest,'Notes / Accords':a.input.notes,'URL':a.input.url};}
  async function saveWishlist(){if(!state.last)return;const btn=$('saveWishlist'),old=btn.textContent;btn.disabled=true;btn.textContent='Saving…';try{await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,{action:'saveWishlist',item:sheetRow(state.last)});state.wishlist=await get('wishlist');renderWishlist();btn.textContent='Saved to Wishlist';setTimeout(()=>btn.textContent=old,1400);}catch(err){alert('Wishlist save failed: '+err.message);btn.textContent=old;}finally{btn.disabled=false;}}
  function rowToInput(x){return {id:x['Wishlist ID'],house:x.House,name:x.Fragrance,collection:x.Collection,scentStyle:x['Scent Style'],season:x.Season,occasion:x.Occasion,cost:num(x['Purchase Price']),shipping:num(x['Shipping / Extra']),rrp:num(x['Normal RRP']),size:num(x['Bottle Size mL'])||100,interest:num(x['Personal Interest'])||3,status:x.Status||'Wishlist',notes:x['Notes / Accords']||'',url:x.URL||''};}
  function renderWishlist(){const rows=[...state.wishlist].sort((a,b)=>num(b['Buy Score'])-num(a['Buy Score']));$('wishlistTable').innerHTML=rows.length?`<div class="wishlist-wrap"><table class="analytics-table"><thead><tr><th>Rank</th><th>Fragrance</th><th>Style</th><th>Price</th><th>Score</th><th>Verdict</th><th>ROI</th><th>Closest DNA</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td class="primary-cell">${esc([x.House,x.Fragrance].filter(Boolean).join(' · '))}</td><td>${esc(x['Scent Style']||'—')}</td><td>${money(x['Landed Cost'])}</td><td><strong>${Math.round(num(x['Buy Score']))}</strong></td><td>${esc(x.Verdict||'—')}</td><td>${Math.round(num(x['Projected ROI %']))}%</td><td>${esc(x['Closest Match']||'—')}</td><td>${esc(x.Status||'Wishlist')}</td><td><button class="table-action" data-load="${esc(x['Wishlist ID'])}">Open</button> <button class="table-action danger" data-delete="${esc(x['Wishlist ID'])}">Remove</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No bottles saved yet.</div>';}
  function fill(x){$('candidateName').value=x.name||'';$('candidateHouse').value=x.house||'';$('candidateCollection').value=x.collection||'';$('candidateCost').value=x.cost||'';$('candidateShipping').value=x.shipping||0;$('candidateRrp').value=x.rrp||'';$('candidateSize').value=x.size||100;$('candidateScentStyle').value=x.scentStyle||'';$('candidateSeason').value=x.season||'';$('candidateOccasion').value=x.occasion||'';$('candidateInterest').value=x.interest||3;$('candidateStatus').value=x.status||'Wishlist';$('candidateNotes').value=x.notes||'';$('candidateUrl').value=x.url||'';render(analyse({...x}));}
  function clear(){$('candidateForm').reset();$('candidateSize').value=100;$('candidateShipping').value=0;$('candidateInterest').value=3;$('candidateStatus').value='Wishlist';$('analysisResults').hidden=true;$('saveWishlist').disabled=true;state.last=null;}
  function exportCsv(){if(!state.wishlist.length)return;const cols=['Rank','House','Fragrance','Collection','Scent Style','Landed Cost','Bottle mL','3mL','5mL','10mL','Score','Verdict','ROI %','Closest DNA','Status','URL'];const rows=[...state.wishlist].sort((a,b)=>num(b['Buy Score'])-num(a['Buy Score'])).map((x,i)=>[i+1,x.House,x.Fragrance,x.Collection,x['Scent Style'],x['Landed Cost'],x['Bottle Size mL'],x['Suggested 3mL'],x['Suggested 5mL'],x['Suggested 10mL'],x['Buy Score'],x.Verdict,x['Projected ROI %'],x['Closest Match'],x.Status,x.URL]);const csv=[cols,...rows].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='DeadEnd-Intelligence-Wishlist.csv';a.click();URL.revokeObjectURL(url);}
  $('candidateForm').addEventListener('submit',e=>{e.preventDefault();render(analyse(formData()));});
  $('saveWishlist').addEventListener('click',saveWishlist);$('clearCandidate').addEventListener('click',clear);$('exportWishlist').addEventListener('click',exportCsv);
  $('wishlistTable').addEventListener('click',async e=>{const load=e.target.dataset.load,del=e.target.dataset.delete;if(load){const row=state.wishlist.find(v=>v['Wishlist ID']===load);if(row)fill(rowToInput(row));}if(del&&confirm('Remove this bottle from the spreadsheet wishlist?')){try{await DeadEndAdminWrite.submit(state.settings.adminWriteEndpoint,{action:'deleteWishlist',id:del});state.wishlist=await get('wishlist');renderWishlist();}catch(err){alert('Could not remove wishlist item: '+err.message);}}});
  load();
})();
