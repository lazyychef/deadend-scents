(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={settings:null,catalogue:[],items:[],orders:[],last:null,wishlist:loadWishlist()};
  const num=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;
  const money=v=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(num(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const stop=new Set('the and for with from into pour homme woman women men eau de parfum perfume extrait original creation inspired by intense edition el'.split(' '));
  function tokens(v){return [...new Set(String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(x=>x.length>2&&!stop.has(x)))];}
  function catalogueText(i){return [i.House,i.house,i.Fragrance,i.name,i.Category,i.category,i.Notes,i.notes,i.Inspiration,i.inspiration,i.Occasion,i.occasion].filter(Boolean).join(' ');}
  function itemName(i){return [i.House||i.house,i.Fragrance||i.name].filter(Boolean).join(' · ')||i.Fragrance||i.name||i.ID||'Unknown';}
  function endpoint(action){const base=state.settings.adminWriteEndpoint;return base+(base.includes('?')?'&':'?')+'action='+encodeURIComponent(action)+'&t='+Date.now();}
  async function get(action){const r=await fetch(endpoint(action),{cache:'no-store'});if(!r.ok)throw new Error(action+' request failed');const j=await r.json();if(j.ok===false)throw new Error(j.error||action+' failed');return j.items||[];}
  async function load(){
    try{
      state.settings=await fetch('../settings.json',{cache:'no-store'}).then(r=>r.json());
      const [catalogue,items,orders]=await Promise.all([get('catalogue'),get('orderItems'),get('orders')]);
      Object.assign(state,{catalogue,items,orders});
      $('intelligenceStatus').textContent=`Ready · ${catalogue.length} catalogue bottles and ${items.length} order-item records loaded`;
      renderWishlist();
    }catch(err){console.error(err);$('intelligenceStatus').textContent='Could not load live business data: '+err.message;}
  }
  function formData(){return {id:state.last?.input?.id||cryptoId(),name:$('candidateName').value.trim(),house:$('candidateHouse').value.trim(),cost:num($('candidateCost').value),size:num($('candidateSize').value),shipping:num($('candidateShipping').value),category:$('candidateCategory').value.trim(),notes:$('candidateNotes').value.trim(),p3:num($('candidateP3').value),p5:num($('candidateP5').value),p10:num($('candidateP10').value),interest:num($('candidateInterest').value),url:$('candidateUrl').value.trim(),updated:new Date().toISOString()};}
  function cryptoId(){return 'W-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
  function suggestPrices(x){
    if(x.p3||x.p5||x.p10)return x;
    const costMl=(x.cost+x.shipping)/Math.max(1,x.size),base=Math.max(1.8,costMl*3.2);
    x.p3=Math.max(5,Math.ceil(base*3));x.p5=Math.max(x.p3+2,Math.ceil(base*5));x.p10=Math.max(x.p5+4,Math.ceil(base*10*0.9));return x;
  }
  function similarity(candidate,item){const a=tokens([candidate.name,candidate.category,candidate.notes].join(' ')),b=tokens(catalogueText(item));if(!a.length||!b.length)return 0;const bs=new Set(b),hits=a.filter(x=>bs.has(x)).length,union=new Set([...a,...b]).size;return clamp((hits/Math.max(1,a.length)*0.72+hits/Math.max(1,union)*0.28)*100,0,100);}
  function salesProfile(){
    const by=new Map();state.items.forEach(i=>{const key=String(i['Fragrance ID']||itemName(i)).toLowerCase(),x=by.get(key)||{ml:0,revenue:0,qty:0};x.ml+=num(i['Size mL'])*(num(i.Quantity)||1);x.revenue+=num(i['Line Total']);x.qty+=num(i.Quantity)||1;by.set(key,x);});return by;
  }
  function analyse(raw){
    const x=suggestPrices({...raw});
    const matches=state.catalogue.map(i=>({item:i,score:similarity(x,i)})).sort((a,b)=>b.score-a.score).slice(0,5);
    const top=matches[0]?.score||0,highOverlap=matches.filter(m=>m.score>=45).length;
    const sales=salesProfile(),candidateTokens=tokens([x.category,x.notes].join(' '));let relevantMl=0,relevantRevenue=0,relevantCount=0;
    state.catalogue.forEach(i=>{const sim=similarity(x,i);if(sim<18)return;const key=String(i.ID||itemName(i)).toLowerCase(),s=sales.get(key)||sales.get(itemName(i).toLowerCase());if(s){relevantMl+=s.ml*(sim/100);relevantRevenue+=s.revenue*(sim/100);relevantCount++;}});
    const totalCost=x.cost+x.shipping,reserve=Math.max(8,Math.round(x.size*0.08)),saleable=Math.max(0,x.size-reserve);
    const blendedMl=x.p10?x.p10/10:x.p5?x.p5/5:x.p3?x.p3/3:0;
    const projected=blendedMl*saleable,profit=projected-totalCost,roi=totalCost>0?profit/totalCost*100:0,breakEvenMl=blendedMl>0?totalCost/blendedMl:0;
    const financial=clamp(35+Math.min(45,roi/8)+(breakEvenMl<=saleable*.35?15:breakEvenMl<=saleable*.55?7:-8),0,100);
    const diversity=clamp(100-top-(highOverlap>2?10:0),0,100);
    const demand=clamp(35+Math.min(45,relevantMl/2)+(relevantCount?10:0),0,100);
    const fun=clamp(x.interest*20,0,100);
    const evidence=state.items.length?1:0.75;
    const score=Math.round((financial*.38+diversity*.25+demand*.24+fun*.13)*evidence);
    let verdict='SKIP',klass='skip';if(score>=78){verdict='BUY';klass='buy';}else if(score>=62){verdict='GOOD BUY';klass='buy';}else if(score>=46){verdict='WAIT / SAMPLE FIRST';klass='wait';}
    const reasons=[],warnings=[];
    if(financial>=75)reasons.push(`Strong projected sample economics: ${Math.round(roi)}% potential ROI.`);else if(financial<45)warnings.push('Weak financial margin at the entered purchase and sample prices.');
    if(diversity>=70)reasons.push('Adds a reasonably distinct profile to the current catalogue.');else warnings.push(`DNA overlaps with ${itemName(matches[0]?.item||{})}${top?` (${Math.round(top)}% profile match)`:''}.`);
    if(demand>=65)reasons.push('Similar catalogue profiles have useful item-level sales activity.');else if(!relevantCount)warnings.push('There is limited item-level sales evidence for this DNA in your recorded orders.');
    if(x.interest>=4)reasons.push('High personal interest gives it genuine collecting value beyond pure ROI.');
    if(breakEvenMl>saleable*.6)warnings.push(`You may need to sell about ${Math.ceil(breakEvenMl)}mL before recovering the bottle cost.`);
    return {input:x,matches,financial,diversity,demand,fun,score,verdict,klass,totalCost,reserve,saleable,blendedMl,projected,profit,roi,breakEvenMl,relevantMl,relevantRevenue,reasons,warnings,candidateTokens};
  }
  function render(a){
    state.last=a;$('analysisResults').hidden=false;$('saveWishlist').disabled=false;
    $('verdictLabel').textContent=a.verdict;$('verdictLabel').className='verdict-'+a.klass;$('buyScore').textContent=a.score;
    $('verdictSummary').textContent=a.score>=62?'Worth serious consideration at the entered price.':a.score>=46?'Promising, but sampling or waiting for a better price lowers the risk.':'The numbers or catalogue fit do not currently justify the blind buy.';
    const cards=[['Financial',a.financial,'ROI and break-even'],['Catalogue diversity',a.diversity,'Lower DNA overlap scores higher'],['Sales demand',a.demand,'Based on similar recorded item sales'],['Fun factor',a.fun,'Your personal interest']];
    $('scoreCards').innerHTML=cards.map(([l,v,n])=>`<article><span>${esc(l)}</span><strong>${Math.round(v)}</strong><div class="score-meter"><i style="width:${v}%"></i></div><em>${esc(n)}</em></article>`).join('');
    $('similarityList').innerHTML=a.matches.length?a.matches.map(m=>`<div class="similarity-row"><div><strong>${esc(itemName(m.item))}</strong><span>${esc(m.item.Category||m.item.category||m.item.Notes||m.item.notes||'Catalogue profile')}</span></div><b>${Math.round(m.score)}%</b><div class="rank-meter"><i style="width:${m.score}%"></i></div></div>`).join(''):'<div class="empty">Add notes or accords to compare DNA.</div>';
    const metrics=[['Landed bottle cost',money(a.totalCost)],['Cost per mL',money(a.totalCost/a.input.size)],['Suggested sample prices',`${money(a.input.p3)} / ${money(a.input.p5)} / ${money(a.input.p10)}`],['Saleable volume estimate',`${a.saleable}mL (${a.reserve}mL reserved)`],['Projected sample revenue',money(a.projected)],['Projected profit',money(a.profit)],['Potential ROI',`${Math.round(a.roi)}%`],['Approx. break-even',`${Math.ceil(a.breakEvenMl)}mL sold`]];
    $('financialModel').innerHTML=metrics.map(([l,v])=>`<div><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('');
    $('decisionReasons').innerHTML=`<h3>Reasons</h3>${(a.reasons.length?a.reasons:['No major positive signals yet.']).map(v=>`<p class="reason-positive">${esc(v)}</p>`).join('')}<h3>Warnings</h3>${(a.warnings.length?a.warnings:['No major warnings at the entered price.']).map(v=>`<p class="reason-warning">${esc(v)}</p>`).join('')}`;
    window.scrollTo({top:$('analysisResults').offsetTop-20,behavior:'smooth'});
  }
  function saveWishlist(){if(!state.last)return;const row={...state.last.input,score:state.last.score,verdict:state.last.verdict,roi:state.last.roi,overlap:state.last.matches[0]?.score||0,closest:itemName(state.last.matches[0]?.item||{}),saved:new Date().toISOString()};const idx=state.wishlist.findIndex(x=>x.id===row.id);if(idx>=0)state.wishlist[idx]=row;else state.wishlist.push(row);persist();renderWishlist();$('saveWishlist').textContent='Saved';setTimeout(()=>$('saveWishlist').textContent='Save to wishlist',1200);}
  function loadWishlist(){try{return JSON.parse(localStorage.getItem('deadend-intelligence-wishlist')||'[]');}catch{return [];}}
  function persist(){localStorage.setItem('deadend-intelligence-wishlist',JSON.stringify(state.wishlist));}
  function renderWishlist(){const rows=[...state.wishlist].sort((a,b)=>b.score-a.score);$('wishlistTable').innerHTML=rows.length?`<div class="wishlist-wrap"><table class="analytics-table"><thead><tr><th>Rank</th><th>Fragrance</th><th>Price</th><th>Score</th><th>Verdict</th><th>ROI</th><th>Closest DNA</th><th></th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td class="primary-cell">${esc([x.house,x.name].filter(Boolean).join(' · '))}</td><td>${money(num(x.cost)+num(x.shipping))}</td><td><strong>${Math.round(x.score)}</strong></td><td>${esc(x.verdict)}</td><td>${Math.round(x.roi)}%</td><td>${esc(x.closest||'—')}</td><td><button class="table-action" data-load="${esc(x.id)}">Open</button> <button class="table-action danger" data-delete="${esc(x.id)}">Remove</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No bottles saved yet.</div>';}
  function fill(x){$('candidateName').value=x.name||'';$('candidateHouse').value=x.house||'';$('candidateCost').value=x.cost||'';$('candidateSize').value=x.size||100;$('candidateShipping').value=x.shipping||0;$('candidateCategory').value=x.category||'';$('candidateNotes').value=x.notes||'';$('candidateP3').value=x.p3||'';$('candidateP5').value=x.p5||'';$('candidateP10').value=x.p10||'';$('candidateInterest').value=x.interest||3;$('candidateUrl').value=x.url||'';state.last={input:{...x}};render(analyse({...x}));}
  function clear(){ $('candidateForm').reset();$('candidateSize').value=100;$('candidateShipping').value=0;$('candidateInterest').value=3;$('analysisResults').hidden=true;$('saveWishlist').disabled=true;state.last=null; }
  function exportCsv(){if(!state.wishlist.length)return;const cols=['Rank','House','Fragrance','Landed Cost','Bottle mL','Score','Verdict','ROI %','Closest DNA','URL'];const rows=[...state.wishlist].sort((a,b)=>b.score-a.score).map((x,i)=>[i+1,x.house,x.name,num(x.cost)+num(x.shipping),x.size,x.score,x.verdict,Math.round(x.roi),x.closest,x.url]);const csv=[cols,...rows].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='DeadEnd-Intelligence-Wishlist.csv';a.click();URL.revokeObjectURL(url);}
  $('candidateForm').addEventListener('submit',e=>{e.preventDefault();render(analyse(formData()));});
  $('saveWishlist').addEventListener('click',saveWishlist);$('clearCandidate').addEventListener('click',clear);$('exportWishlist').addEventListener('click',exportCsv);
  $('wishlistTable').addEventListener('click',e=>{const load=e.target.dataset.load,del=e.target.dataset.delete;if(load){const x=state.wishlist.find(v=>v.id===load);if(x)fill(x);}if(del){state.wishlist=state.wishlist.filter(v=>v.id!==del);persist();renderWishlist();}});
  load();renderWishlist();
})();
