(function(){
  const $ = (id) => document.getElementById(id);
  const state = { jsonSettings:null, liveSettings:null };

  const FIELD_GROUPS = [
    {
      title:'Business',
      fields:[
        ['businessName','Business name','text'],
        ['tagline','Tagline','text'],
        ['siteUrl','Site URL','url'],
        ['shippingLine','Shipping message','text']
      ]
    },
    {
      title:'Contact links',
      fields:[
        ['facebookMessengerUrl','Messenger URL','url'],
        ['whatsAppUrl','WhatsApp URL','url'],
        ['instagramUrl','Instagram URL','url']
      ]
    },
    {
      title:'Website behaviour',
      fields:[
        ['expressPostage','Express postage','number'],
        ['newArrivalDays','New arrival days','number'],
        ['weeklyDiscountPercent','Fragrance of the Week discount %','number'],
        ['weeklyDiscountDays','Fragrance of the Week days','number'],
        ['lowStockThreshold','Low stock threshold mL','number']
      ]
    },
    {
      title:'Pricing defaults',
      fields:[
        ['designerMarkup','Designer markup','number'],
        ['nicheMarkup','Niche markup','number'],
        ['middleEasternMarkup','Middle Eastern markup','number'],
        ['inspiredMarkup','Inspired markup','number'],
        ['competitorUndercutPercent','Competitor undercut %','number'],
        ['roundToNearest','Round to nearest $','number']
      ]
    },
    {
      title:'Data sources',
      fields:[
        ['catalogueCsvUrl','Catalogue CSV URL','url'],
        ['discoveryPacksCsvUrl','Discovery Packs CSV URL','url'],
        ['settingsCsvUrl','Settings CSV URL','url'],
        ['adminWriteEndpoint','Admin write endpoint','url'],
        ['masterSheetId','Master Sheet ID','text']
      ]
    },
    {
      title:'Tracking',
      fields:[
        ['googleAnalyticsId','Google Analytics ID','text'],
        ['microsoftClarityId','Microsoft Clarity ID','text']
      ]
    }
  ];

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  async function loadJsonSettings(){
    const res = await fetch('../settings.json', { cache:'no-store' });
    state.jsonSettings = await res.json();
  }

  async function loadLiveSettings(){
    const endpoint = state.jsonSettings && state.jsonSettings.adminWriteEndpoint;
    if(!endpoint) throw new Error('Missing adminWriteEndpoint in settings.json');
    const url = endpoint + (endpoint.includes('?') ? '&' : '?') + 'action=settings&t=' + Date.now();
    const res = await fetch(url, { cache:'no-store' });
    if(!res.ok) throw new Error('Settings endpoint failed: ' + res.status);
    const data = await res.json();
    state.liveSettings = data.settings || {};
  }

  function valueFor(key){
    if(state.liveSettings && Object.prototype.hasOwnProperty.call(state.liveSettings,key)) return state.liveSettings[key];
    if(state.jsonSettings && Object.prototype.hasOwnProperty.call(state.jsonSettings,key)) return state.jsonSettings[key];
    return '';
  }

  function render(){
    const fields = FIELD_GROUPS.map(group => `
      <section class="settings-group">
        <h3>${escapeHtml(group.title)}</h3>
        <div class="settings-form-grid">
          ${group.fields.map(([key,label,type]) => `
            <label>
              <span>${escapeHtml(label)}</span>
              <input name="${escapeHtml(key)}" type="${type}" value="${escapeHtml(valueFor(key))}" ${type === 'number' ? 'step="any"' : ''}>
            </label>
          `).join('')}
        </div>
      </section>
    `).join('');
    $('settingsFields').innerHTML = fields;
    $('settingsStatus').innerHTML = 'Loaded. Changes save to the Settings tab in Google Sheets.';
    $('settingsForm').hidden = false;
  }

  function getPayloadFields(){
    const form = $('settingsForm');
    const values = {};
    Array.from(form.elements).forEach(el => {
      if(!el.name) return;
      values[el.name] = el.value.trim();
    });
    return values;
  }

  async function save(e){
    e.preventDefault();
    $('settingsStatus').innerHTML = 'Saving settings...';
    const endpoint = state.jsonSettings && state.jsonSettings.adminWriteEndpoint;
    try{
      const result = await window.DeadEndAdminWrite.submit(endpoint, {
        action:'updateSettings',
        settings:getPayloadFields()
      });
      $('settingsStatus').innerHTML = result && result.ok ? 'Saved. Hard refresh the public site to confirm changes.' : 'Saved request sent. Refresh to confirm.';
    }catch(err){
      $('settingsStatus').innerHTML = 'Save failed: ' + escapeHtml(err.message || err);
    }
  }

  async function init(){
    try{
      await loadJsonSettings();
      await loadLiveSettings();
      render();
    }catch(err){
      $('settingsStatus').innerHTML = 'Could not load live settings. Check Apps Script deployment. ' + escapeHtml(err.message || err);
    }
  }

  $('settingsForm').addEventListener('submit', save);
  $('reloadSettings').addEventListener('click', init);
  init();
})();
