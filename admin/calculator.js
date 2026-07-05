(function(){
  const $ = (id) => document.getElementById(id);
  const money = (n, cents=false) => Number.isFinite(n) ? '$' + n.toFixed(cents ? 2 : 0) : '$0';
  const val = (id) => Number($(id).value || 0);
  const roundUp = (value, step=1) => Math.ceil(value / step) * step;

  const pricingProfiles = {
    auto: { multipliers:{3:1.45,5:1.35,10:1.25}, minimums:{3:4,5:6,10:8} },
    budget: { multipliers:{3:1.35,5:1.25,10:1.15}, minimums:{3:4,5:6,10:8} },
    premium: { multipliers:{3:1.55,5:1.45,10:1.32}, minimums:{3:7,5:11,10:18} }
  };

  function recommendedPrice(ml, normalRrp, bottleSize, type){
    if(!normalRrp || !bottleSize) return 0;
    const profile = pricingProfiles[type] || pricingProfiles.auto;
    const rrpPerMl = normalRrp / bottleSize;
    const raw = rrpPerMl * ml * profile.multipliers[ml];
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
      3: recommendedPrice(3, normalRrp, bottleSize, type),
      5: recommendedPrice(5, normalRrp, bottleSize, type),
      10: recommendedPrice(10, normalRrp, bottleSize, type)
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

    $('copyText').value = [
      'DeadEnd Scents sample pricing',
      'Cost per mL: ' + money(costPerMl, true),
      'Recommended 3mL: ' + money(prices[3]),
      'Recommended 5mL: ' + money(prices[5]),
      'Recommended 10mL: ' + money(prices[10]),
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
  ['purchaseCost','normalRrp','bottleSize','amountLeft','pricingType','scenarioMl'].forEach(id => $(id).addEventListener('input', calculate));
  $('resetBtn').addEventListener('click', function(){ $('pricingForm').reset(); calculate(); });
  $('copyBtn').addEventListener('click', async function(){
    try{ await navigator.clipboard.writeText($('copyText').value); this.textContent='Copied'; setTimeout(()=>this.textContent='Copy',1000); }catch(e){}
  });
  calculate();
})();
