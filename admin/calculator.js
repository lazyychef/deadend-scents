(function(){
  const $ = (id) => document.getElementById(id);
  const money = (n, cents=false) => Number.isFinite(n) ? '$' + n.toFixed(cents ? 2 : 0) : '$0';
  const val = (id) => Number($(id)?.value || 0);
  const roundUp = (value, step=1) => Math.ceil(value / step) * step;

  const pricingProfiles = {
    auto: { target:{3:2.6,5:2.4,10:2.1}, minimums:{3:4,5:6,10:8}, marketBuffer:.92 },
    budget: { target:{3:2.2,5:2.0,10:1.8}, minimums:{3:4,5:6,10:8}, marketBuffer:.90 },
    premium: { target:{3:3.1,5:2.8,10:2.45}, minimums:{3:8,5:12,10:20}, marketBuffer:.92 }
  };

  function competitorPrice(ml){
    const el = $('competitor' + ml);
    return el ? Number(String(el.value || '').replace(/[^0-9.]/g,'')) || 0 : 0;
  }

  function recommendedPrice(ml, purchaseCost, normalRrp, bottleSize, type){
    if(!bottleSize) return 0;
    const profile = pricingProfiles[type] || pricingProfiles.auto;
    const costPerMl = purchaseCost / bottleSize;
    const rrpPerMl = normalRrp / bottleSize;
    const costBased = costPerMl * ml * profile.target[ml];
    const rrpCeiling = rrpPerMl ? rrpPerMl * ml * 1.18 : Infinity;
    const comp = competitorPrice(ml);
    const marketCap = comp ? comp * profile.marketBuffer : Infinity;
    const capped = Math.min(costBased, rrpCeiling, marketCap);
    const raw = Math.max(profile.minimums[ml], capped);
    return Math.max(profile.minimums[ml], roundUp(raw, 1));
  }

  function calculate(){
    const purchaseCost = val('purchaseCost');
    const normalRrp = val('normalRrp');
    const bottleSize = val('bottleSize');
    const amountLeft = val('amountLeft');
    const type = $('pricingType').value;
    const scenarioMl = Number($('scenarioMl').value || 3);

    const costPerMl = bottleSize ? purchaseCost / bottleSize : 0;
    const prices = {
      3: recommendedPrice(3, purchaseCost, normalRrp, bottleSize, type),
      5: recommendedPrice(5, purchaseCost, normalRrp, bottleSize, type),
      10: recommendedPrice(10, purchaseCost, normalRrp, bottleSize, type)
    };
    const remaining = { 3: Math.floor(amountLeft / 3), 5: Math.floor(amountLeft / 5), 10: Math.floor(amountLeft / 10) };
    const expectedRevenue = remaining[scenarioMl] * prices[scenarioMl];
    const remainingCost = costPerMl * amountLeft;
    const expectedProfit = expectedRevenue - remainingCost;
    const roi = remainingCost > 0 ? expectedProfit / remainingCost * 100 : 0;
    const breakEvenSamples = prices[scenarioMl] > 0 ? Math.ceil(purchaseCost / prices[scenarioMl]) : 0;

    $('costPerMl').textContent = money(costPerMl, true);
    $('price3').textContent = money(prices[3]);
    $('price5').textContent = money(prices[5]);
    $('price10').textContent = money(prices[10]);
    $('remaining3').textContent = remaining[3];
    $('remaining5').textContent = remaining[5];
    $('remaining10').textContent = remaining[10];
    $('expectedRevenue').textContent = money(expectedRevenue);
    $('expectedProfit').textContent = money(expectedProfit);
    $('roi').textContent = Number.isFinite(roi) ? roi.toFixed(0) + '%' : '0%';
    $('breakEven').textContent = breakEvenSamples ? breakEvenSamples + ' × ' + scenarioMl + 'mL samples' : '—';

    const comp5 = competitorPrice(5);
    const marketNote = comp5 ? 'Market check: 5mL competitor $' + comp5 + ', recommended ' + money(prices[5]) : 'Market check: no competitor price entered';
    $('copyText').value = [
      'DeadEnd Scents sample pricing',
      'Cost per mL: ' + money(costPerMl, true),
      'Recommended 3mL: ' + money(prices[3]),
      'Recommended 5mL: ' + money(prices[5]),
      'Recommended 10mL: ' + money(prices[10]),
      marketNote,
      'Remaining 3mL samples: ' + remaining[3],
      'Remaining 5mL samples: ' + remaining[5],
      'Remaining 10mL samples: ' + remaining[10],
      'Expected revenue: ' + money(expectedRevenue),
      'Expected profit: ' + money(expectedProfit),
      'ROI: ' + (Number.isFinite(roi) ? roi.toFixed(0) + '%' : '0%'),
      'Break-even: ' + (breakEvenSamples ? breakEvenSamples + ' × ' + scenarioMl + 'mL samples' : '—')
    ].join('\n');
  }

  $('pricingForm').addEventListener('submit', function(e){ e.preventDefault(); calculate(); });
  ['purchaseCost','normalRrp','bottleSize','amountLeft','pricingType','scenarioMl','competitor3','competitor5','competitor10'].forEach(id => { if($(id)) $(id).addEventListener('input', calculate); });
  $('resetBtn').addEventListener('click', function(){ $('pricingForm').reset(); calculate(); });
  $('copyBtn').addEventListener('click', async function(){ try{ await navigator.clipboard.writeText($('copyText').value); this.textContent='Copied'; setTimeout(()=>this.textContent='Copy',1000); }catch(e){} });
  calculate();
})();
