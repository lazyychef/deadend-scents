(function(){
  const $ = (id) => document.getElementById(id);
  const money = (n, cents=false) => Number.isFinite(n) ? '$' + n.toFixed(cents ? 2 : 0) : '$0';
  const val = (id) => Number($(id).value || 0);
  const roundUp = (value, step=1) => Math.ceil(value / step) * step;
  const roundDown = (value, step=1) => Math.floor(value / step) * step;

  const pricingProfiles = {
    auto: {
      label: 'standard',
      costMultiplier:{3:2.6,5:2.45,10:2.2},
      rrpCap:{3:.95,5:.88,10:.78},
      minimums:{3:6,5:9,10:15}
    },
    budget: {
      label: 'budget / inspired',
      costMultiplier:{3:2.2,5:2.0,10:1.75},
      rrpCap:{3:.85,5:.78,10:.68},
      minimums:{3:4,5:6,10:8}
    },
    premium: {
      label: 'premium / niche',
      costMultiplier:{3:2.8,5:2.75,10:2.5},
      rrpCap:{3:1.0,5:.9,10:.82},
      minimums:{3:8,5:12,10:22}
    }
  };

  function competitorEstimate(size, direct){
    if(direct[size] > 0) return { value: direct[size], source: 'direct' };
    if(size === 3){
      if(direct[5] > 0) return { value: direct[5] * 0.65, source: 'derived' };
      if(direct[10] > 0) return { value: direct[10] * 0.38, source: 'derived' };
    }
    if(size === 5){
      if(direct[3] > 0) return { value: direct[3] * 1.55, source: 'derived' };
      if(direct[10] > 0) return { value: direct[10] * 0.58, source: 'derived' };
    }
    if(size === 10){
      if(direct[5] > 0) return { value: direct[5] * 1.8, source: 'derived' };
      if(direct[3] > 0) return { value: direct[3] * 2.65, source: 'derived' };
    }
    return { value: 0, source: '' };
  }

  function recommendedPrice(ml, inputs){
    const profile = pricingProfiles[inputs.type] || pricingProfiles.auto;
    const costPerMl = inputs.bottleSize ? inputs.purchaseCost / inputs.bottleSize : 0;
    const rrpPerMl = inputs.bottleSize ? inputs.normalRrp / inputs.bottleSize : 0;
    const minPrice = profile.minimums[ml];

    const costBased = costPerMl > 0 ? roundUp(costPerMl * ml * profile.costMultiplier[ml], 1) : 0;
    const rrpBasedCap = rrpPerMl > 0 ? roundDown(rrpPerMl * ml * profile.rrpCap[ml], 1) : Infinity;
    const comp = competitorEstimate(ml, inputs.competitors);
    const marketCap = comp.value > 0 ? roundDown(comp.value * 0.92, 1) : Infinity;

    let recommended = Math.max(minPrice, costBased || minPrice);
    recommended = Math.min(recommended, rrpBasedCap, marketCap);
    recommended = Math.max(minPrice, roundDown(recommended, 1));

    return {
      recommended,
      costBased: costBased || minPrice,
      rrpBasedCap: Number.isFinite(rrpBasedCap) ? rrpBasedCap : 0,
      marketCap: Number.isFinite(marketCap) ? marketCap : 0,
      competitor: comp.value,
      competitorSource: comp.source
    };
  }

  function calculate(){
    const inputs = {
      purchaseCost: val('purchaseCost'),
      normalRrp: val('normalRrp'),
      bottleSize: val('bottleSize'),
      amountLeft: val('amountLeft'),
      type: $('pricingType').value,
      competitors: { 3: val('competitor3'), 5: val('competitor5'), 10: val('competitor10') }
    };
    const scenarioMl = Number($('scenarioMl').value || 3);
    const costPerMl = inputs.bottleSize ? inputs.purchaseCost / inputs.bottleSize : 0;
    const results = { 3: recommendedPrice(3, inputs), 5: recommendedPrice(5, inputs), 10: recommendedPrice(10, inputs) };
    const prices = { 3: results[3].recommended, 5: results[5].recommended, 10: results[10].recommended };
    const remaining = { 3: Math.floor(inputs.amountLeft / 3), 5: Math.floor(inputs.amountLeft / 5), 10: Math.floor(inputs.amountLeft / 10) };
    const expectedRevenue = remaining[scenarioMl] * prices[scenarioMl];
    const remainingCost = costPerMl * inputs.amountLeft;
    const expectedProfit = expectedRevenue - remainingCost;
    const roi = remainingCost > 0 ? expectedProfit / remainingCost * 100 : 0;
    const breakEvenSamples = prices[scenarioMl] > 0 ? Math.ceil(inputs.purchaseCost / prices[scenarioMl]) : 0;

    const marketUsed = [3,5,10].some(size => results[size].marketCap > 0 && prices[size] <= results[size].marketCap);
    const rrpUsed = [3,5,10].some(size => results[size].rrpBasedCap > 0 && prices[size] <= results[size].rrpBasedCap);
    let note = 'Cost-based pricing';
    if(marketUsed) note = 'Market adjusted';
    else if(rrpUsed) note = 'RRP capped';

    $('costPerMl').textContent = money(costPerMl, true);
    $('price3').textContent = money(prices[3]);
    $('price5').textContent = money(prices[5]);
    $('price10').textContent = money(prices[10]);
    $('market3').textContent = marketText(results[3]);
    $('market5').textContent = marketText(results[5]);
    $('market10').textContent = marketText(results[10]);
    $('pricingNote').textContent = note;
    $('remaining3').textContent = remaining[3];
    $('remaining5').textContent = remaining[5];
    $('remaining10').textContent = remaining[10];
    $('expectedRevenue').textContent = money(expectedRevenue);
    $('remainingValue').textContent = money(remainingCost);
    $('expectedProfit').textContent = money(expectedProfit);
    $('roi').textContent = Number.isFinite(roi) ? roi.toFixed(0) + '%' : '0%';
    $('breakEven').textContent = breakEvenSamples ? breakEvenSamples + ' × ' + scenarioMl + 'mL samples' : '—';

    $('copyText').value = [
      'DeadEnd Scents sample pricing',
      'Cost per mL: ' + money(costPerMl, true),
      'Recommended 3mL: ' + money(prices[3]) + detailText(results[3]),
      'Recommended 5mL: ' + money(prices[5]) + detailText(results[5]),
      'Recommended 10mL: ' + money(prices[10]) + detailText(results[10]),
      'Remaining 3mL samples: ' + remaining[3],
      'Remaining 5mL samples: ' + remaining[5],
      'Remaining 10mL samples: ' + remaining[10],
      'Expected revenue: ' + money(expectedRevenue),
      'Remaining juice value: ' + money(remainingCost),
      'Expected profit: ' + money(expectedProfit),
      'ROI: ' + (Number.isFinite(roi) ? roi.toFixed(0) + '%' : '0%'),
      'Break-even: ' + (breakEvenSamples ? breakEvenSamples + ' × ' + scenarioMl + 'mL samples' : '—'),
      'Pricing note: ' + note
    ].join('\n');
  }

  function marketText(result){
    if(!result.marketCap) return '—';
    const suffix = result.competitorSource === 'derived' ? ' est.' : '';
    return money(result.marketCap) + suffix;
  }

  function detailText(result){
    const parts = [];
    if(result.marketCap) parts.push('market cap ' + money(result.marketCap));
    if(result.rrpBasedCap) parts.push('RRP cap ' + money(result.rrpBasedCap));
    return parts.length ? ' (' + parts.join(', ') + ')' : '';
  }

  $('pricingForm').addEventListener('submit', function(e){ e.preventDefault(); calculate(); });
  ['purchaseCost','normalRrp','bottleSize','amountLeft','pricingType','scenarioMl','competitor3','competitor5','competitor10'].forEach(id => $(id).addEventListener('input', calculate));
  $('resetBtn').addEventListener('click', function(){ $('pricingForm').reset(); calculate(); });
  $('copyBtn').addEventListener('click', async function(){
    try{ await navigator.clipboard.writeText($('copyText').value); this.textContent='Copied'; setTimeout(()=>this.textContent='Copy',1000); }catch(e){}
  });
  calculate();
})();
