/**
 * DeadEnd Scents Admin V5.2.3 data-integrity endpoint.
 * Copy this file into the Apps Script project attached to the master Google Sheet.
 * Deploy as Web App: Execute as Me, Access Anyone with the link.
 */
function doPost(e) {
  try {
    var payloadText = '';
    if (e && e.postData && e.postData.contents) payloadText = e.postData.contents;
    if (e && e.parameter && e.parameter.payload) payloadText = e.parameter.payload;
    var payload = JSON.parse(payloadText || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (payload.action === 'updateBottle') return json_({ ok:true, result:updateBottle_(ss, payload) });
    if (payload.action === 'setFeatured') return json_({ ok:true, result:setFeatured_(ss, payload) });
    if (payload.action === 'setStaffPicks') return json_({ ok:true, result:setStaffPicks_(ss, payload) });
    if (payload.action === 'updateSettings') return json_({ ok:true, result:updateSettings_(ss, payload) });
    if (payload.action === 'addPurchase') return json_(addPurchase_(ss, payload));
    if (payload.action === 'addBottle') return json_(addBottle_(ss, payload));
    if (payload.action === 'duplicateBottle') return json_(duplicateBottle_(ss, payload));
    if (payload.action === 'deleteBottle') return json_(deleteBottle_(ss, payload));

    return json_({ ok:false, error:'Unknown action: ' + payload.action });
  } catch (err) {
    return json_({ ok:false, error:String(err && err.message ? err.message : err) });
  }
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (action === 'settings') return json_({ ok:true, settings:getSettings_(ss) });
  if (action === 'catalogue') return json_(getCatalogue_(ss));
  return json_({ ok:true, app:'DeadEnd Scents Admin V5.2.3', status:'ready' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


function normaliseSettingKey_(label) {
  var k = String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  var map = {
    businessname:'businessName',
    tagline:'tagline',
    facebookmessengerurl:'facebookMessengerUrl',
    messengerurl:'facebookMessengerUrl',
    messenger:'facebookMessengerUrl',
    whatsappurl:'whatsAppUrl',
    whatsapp:'whatsAppUrl',
    instagramurl:'instagramUrl',
    instagram:'instagramUrl',
    expresspostage:'expressPostage',
    postage:'expressPostage',
    shippingcost:'expressPostage',
    defaultpostage:'expressPostage',
    shippingline:'shippingLine',
    shippingtext:'shippingLine',
    newbadgedays:'newArrivalDays',
    newarrivaldays:'newArrivalDays',
    weeklydiscount:'weeklyDiscountPercent',
    weeklydiscountpercent:'weeklyDiscountPercent',
    weeklydiscountpct:'weeklyDiscountPercent',
    weeklydiscountdays:'weeklyDiscountDays',
    packdiscount:'packDiscountPercent',
    packdiscountpercent:'packDiscountPercent',
    packdiscountpct:'packDiscountPercent',
    siteurl:'siteUrl',
    websiteurl:'websiteUrl',
    googleanalyticsid:'googleAnalyticsId',
    ga4measurementid:'googleAnalyticsId',
    microsoftclarityid:'microsoftClarityId',
    clarityid:'microsoftClarityId',
    adminwriteendpoint:'adminWriteEndpoint',
    cataloguecsvurl:'catalogueCsvUrl',
    discoverypackscsvurl:'discoveryPacksCsvUrl',
    packscsvurl:'discoveryPacksCsvUrl',
    settingscsvurl:'settingsCsvUrl',
    fallbackcataloguefile:'catalogueFallbackFile',
    cataloguefallbackfile:'catalogueFallbackFile',
    mastersheetid:'masterSheetId',
    footertext:'footerText',
    lowstockthreshold:'lowStockThreshold',
    roitarget:'roiTarget',
    defaultpricingprofile:'defaultPricingProfile',
    designermarkup:'designerMarkup',
    nichemarkup:'nicheMarkup',
    premiummarkup:'nicheMarkup',
    middleeasternmarkup:'middleEasternMarkup',
    inspiredmarkup:'inspiredMarkup',
    competitorundercut:'competitorUndercutPercent',
    competitorundercutpercent:'competitorUndercutPercent',
    roundtonearest:'roundToNearest'
  };
  return map[k] || '';
}

function castSetting_(key, value) {
  var numeric = {expressPostage:true,newArrivalDays:true,weeklyDiscountPercent:true,weeklyDiscountDays:true,packDiscountPercent:true,lowStockThreshold:true,roiTarget:true,designerMarkup:true,nicheMarkup:true,middleEasternMarkup:true,inspiredMarkup:true,competitorUndercutPercent:true,roundToNearest:true};
  if (numeric[key]) {
    var n = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? value : n;
  }
  return value;
}

function getSettings_(ss) {
  var sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};
  var headers = values[0].map(function(h){ return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''); });
  var settingCol = headers.indexOf('setting');
  var valueCol = headers.indexOf('value');
  if (settingCol < 0 || valueCol < 0) return {};
  var out = {};
  for (var i = 1; i < values.length; i++) {
    var label = values[i][settingCol];
    var value = values[i][valueCol];
    if (!label || value === '') continue;
    var key = normaliseSettingKey_(label);
    if (key) out[key] = castSetting_(key, value);
  }
  return out;
}


function settingLabelForKey_(key) {
  var labels = {
    businessName:'Business Name',
    tagline:'Tagline',
    siteUrl:'Site URL',
    shippingLine:'Shipping Line',
    facebookMessengerUrl:'Facebook Messenger URL',
    whatsAppUrl:'WhatsApp URL',
    instagramUrl:'Instagram URL',
    expressPostage:'Express Postage',
    newArrivalDays:'New Arrival Days',
    weeklyDiscountPercent:'Weekly Discount Percent',
    weeklyDiscountDays:'Weekly Discount Days',
    lowStockThreshold:'Low Stock Threshold',
    roiTarget:'ROI Target',
    defaultPricingProfile:'Default Pricing Profile',
    designerMarkup:'Designer Markup',
    nicheMarkup:'Niche Markup',
    middleEasternMarkup:'Middle Eastern Markup',
    inspiredMarkup:'Inspired Markup',
    competitorUndercutPercent:'Competitor Undercut Percent',
    roundToNearest:'Round To Nearest',
    catalogueCsvUrl:'Catalogue CSV URL',
    discoveryPacksCsvUrl:'Discovery Packs CSV URL',
    settingsCsvUrl:'Settings CSV URL',
    adminWriteEndpoint:'Admin Write Endpoint',
    masterSheetId:'Master Sheet ID',
    catalogueFallbackFile:'Catalogue Fallback File',
    googleAnalyticsId:'Google Analytics ID',
    microsoftClarityId:'Microsoft Clarity ID',
    footerText:'Footer Text'
  };
  return labels[key] || key;
}

function updateSettings_(ss, payload) {
  var sheet = ss.getSheetByName('Settings');
  if (!sheet) throw new Error('No Settings sheet found.');
  var settings = payload.settings || {};
  var values = sheet.getDataRange().getValues();
  if (!values.length) throw new Error('Settings sheet is empty. Add headers: Setting, Value.');

  var headers = values[0].map(function(h){ return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''); });
  var settingCol = headers.indexOf('setting') + 1;
  var valueCol = headers.indexOf('value') + 1;
  var updatedCol = headers.indexOf('lastupdated') + 1;
  if (!settingCol || !valueCol) throw new Error('Settings sheet needs Setting and Value columns.');

  var rowByKey = {};
  for (var r = 2; r <= values.length; r++) {
    var rawLabel = values[r - 1][settingCol - 1];
    var key = normaliseSettingKey_(rawLabel);
    if (key) rowByKey[key] = r;
  }

  var count = 0;
  Object.keys(settings).forEach(function(inputKey){
    var canonicalKey = normaliseSettingKey_(inputKey) || inputKey;
    var value = settings[inputKey];
    if (value === null || typeof value === 'undefined') return;
    var row = rowByKey[canonicalKey];
    if (!row) {
      row = sheet.getLastRow() + 1;
      sheet.getRange(row, settingCol).setValue(settingLabelForKey_(canonicalKey));
      rowByKey[canonicalKey] = row;
    }
    sheet.getRange(row, valueCol).setValue(value);
    if (updatedCol) sheet.getRange(row, updatedCol).setValue(new Date());
    count++;
  });
  return { action:'updateSettings', count:count };
}

function catalogueSheet_(ss) {
  return ss.getSheetByName('Catalogue') || ss.getSheets()[0];
}

function norm_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');
}

function headerMap_(sheet) {
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function(h,i){ if (h) map[norm_(h)] = i + 1; });
  return map;
}

function getColumn_(map, names) {
  for (var i = 0; i < names.length; i++) {
    var key = norm_(names[i]);
    if (map[key]) return map[key];
  }
  return 0;
}

function setByAnyHeader_(sheet, rowNumber, map, names, value) {
  var col = getColumn_(map, names);
  if (col) sheet.getRange(rowNumber, col).setValue(value);
}

function findRowById_(sheet, id) {
  var map = headerMap_(sheet);
  var idCol = getColumn_(map, ['ID','Fragrance ID']);
  if (!idCol) throw new Error('No ID column found in Catalogue sheet.');
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var values = sheet.getRange(2, idCol, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

function updateBottle_(ss, payload) {
  var sheet = catalogueSheet_(ss);
  var row = findRowById_(sheet, payload.id);
  if (!row) throw new Error('Bottle ID not found: ' + payload.id);
  var map = headerMap_(sheet);
  var fields = payload.fields || {};

  // V5.2.3 writes by actual spreadsheet column name first, with aliases for older fields.
  Object.keys(fields).forEach(function(name){
    if (['Cost per mL','Revenue as 3mL','Revenue as 5mL','Revenue as 10mL','Best Potential Revenue','Projected Profit','Low Stock Flag'].indexOf(name) >= 0) return;
    setByAnyHeader_(sheet, row, map, [name], fields[name]);
  });

  setByAnyHeader_(sheet, row, map, ['Inspired By','Inspiration'], fields['Inspiration']);
  setByAnyHeader_(sheet, row, map, ['Stock','Status'], fields['Stock'] || fields['Status']);
  setByAnyHeader_(sheet, row, map, ['RRP','Normal RRP','Retail Price'], fields['RRP'] || fields['Normal RRP']);
  setByAnyHeader_(sheet, row, map, ['Image','Image URL','Bottle Image'], fields['Image']);
  setByAnyHeader_(sheet, row, map, ['Last Updated','Updated'], new Date());

  applyCatalogueFormulaColumns_(sheet, row, sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]);
  return { action:'updateBottle', id:payload.id, row:row };
}

function setFeatured_(ss, payload) {
  var sheet = catalogueSheet_(ss);
  var map = headerMap_(sheet);
  var featuredCol = getColumn_(map, ['Featured','Fragrance of the Week','FOTW']);
  if (!featuredCol) throw new Error('No Featured column found in Catalogue sheet.');
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, featuredCol, last - 1, 1).setValue('FALSE');
  var row = findRowById_(sheet, payload.id);
  if (!row) throw new Error('Bottle ID not found: ' + payload.id);
  sheet.getRange(row, featuredCol).setValue('TRUE');
  setByAnyHeader_(sheet, row, map, ['Featured Start','Feature Start','FOTW Start'], payload.startDate || '');
  setByAnyHeader_(sheet, row, map, ['Featured End','Feature End','FOTW End'], payload.endDate || '');
  setByAnyHeader_(sheet, row, map, ['Featured Discount','Discount %','Weekly Discount'], payload.discount || '');
  setByAnyHeader_(sheet, row, map, ['Last Updated','Updated'], new Date());
  return { action:'setFeatured', id:payload.id, row:row };
}

function setStaffPicks_(ss, payload) {
  var ids = payload.ids || [];
  var lookup = {};
  ids.forEach(function(id){ lookup[String(id)] = true; });
  var sheet = catalogueSheet_(ss);
  var map = headerMap_(sheet);
  var idCol = getColumn_(map, ['ID','Fragrance ID']);
  var staffCol = getColumn_(map, ['Staff Pick','Staff Picks','StaffPick']);
  if (!idCol) throw new Error('No ID column found in Catalogue sheet.');
  if (!staffCol) throw new Error('No Staff Pick column found in Catalogue sheet.');
  var last = sheet.getLastRow();
  if (last < 2) return { action:'setStaffPicks', count:0 };
  var idValues = sheet.getRange(2, idCol, last - 1, 1).getValues();
  var out = idValues.map(function(row){ return [lookup[String(row[0])] ? 'TRUE' : 'FALSE']; });
  sheet.getRange(2, staffCol, out.length, 1).setValues(out);
  return { action:'setStaffPicks', count:ids.length };
}

// Existing Command Centre helpers kept for compatibility.
function addPurchase_(ss, payload) {
  var p = payload.purchase || {};
  var items = payload.items || [];
  var purchases = ss.getSheetByName('Purchases');
  var itemSheet = ss.getSheetByName('Purchase Items');
  var catalogue = catalogueSheet_(ss);
  if (!purchases || !itemSheet) return { ok:false, error:'Purchases or Purchase Items sheet missing.' };
  purchases.appendRow([p.purchaseId, p.purchaseDate, p.seller, p.source, p.totalPaid, p.bottlesCount, '', p.notes]);
  items.forEach(function(item){
    var fragranceId = item.fragranceId || '';
    if (item.mode === 'new') {
      fragranceId = addCatalogueRowFromPurchase_(catalogue, item, p);
      item.fragranceId = fragranceId;
    }
    itemSheet.appendRow([p.purchaseId, fragranceId, item.fragrance, item.bottleSize, item.fullness + '% full', item.allocatedCost, item.currentMl, item.mode === 'new' ? 'New bottle from Admin' : 'Restock from Admin']);
    var row = findRowById_(catalogue, fragranceId);
    if (row) {
      var map = headerMap_(catalogue);
      setByAnyHeader_(catalogue, row, map, ['Purchase Date'], p.purchaseDate);
      setByAnyHeader_(catalogue, row, map, ['Purchase Price','Purchase Cost'], item.allocatedCost);
      setByAnyHeader_(catalogue, row, map, ['Bottle Size (mL)','Bottle Size'], item.bottleSize);
      setByAnyHeader_(catalogue, row, map, ['Current mL','Current Amount Left (mL)'], item.currentMl);
      setByAnyHeader_(catalogue, row, map, ['Condition'], item.fullness + '% full');
      setByAnyHeader_(catalogue, row, map, ['Purchase Source'], p.source);
      setByAnyHeader_(catalogue, row, map, ['Seller'], p.seller);
      setByAnyHeader_(catalogue, row, map, ['Last Updated','Updated'], new Date());
    }
  });
  return { ok:true, action:'addPurchase', purchaseId:p.purchaseId, itemCount:items.length };
}

function nextCatalogueId_(catalogue, collection) {
  var prefix = 'FRG';
  var c = String(collection || '').toLowerCase();
  if (c.indexOf('designer') >= 0) prefix = 'DES';
  else if (c.indexOf('niche') >= 0) prefix = 'NIC';
  else if (c.indexOf('middle') >= 0) prefix = 'ME';
  else if (c.indexOf('inspired') >= 0) prefix = 'INS';
  var map = headerMap_(catalogue);
  var idCol = getColumn_(map, ['ID','Fragrance ID']);
  var max = 0;
  if (idCol && catalogue.getLastRow() > 1) {
    var values = catalogue.getRange(2, idCol, catalogue.getLastRow() - 1, 1).getValues();
    values.forEach(function(row){
      var id = String(row[0] || '');
      if (id.indexOf(prefix) === 0) {
        var n = Number(id.replace(/\D/g,''));
        if (n > max) max = n;
      }
    });
  }
  return prefix + Utilities.formatString('%03d', max + 1);
}

function addCatalogueRowFromPurchase_(catalogue, item, purchase) {
  var headers = catalogue.getRange(1,1,1,catalogue.getLastColumn()).getValues()[0];
  var nextId = nextCatalogueId_(catalogue, item.collection);
  var values = headers.map(function(h){
    switch(String(h)) {
      case 'ID': return nextId;
      case 'Collection': return item.collection;
      case 'House': return item.house;
      case 'Fragrance': return item.fragrance;
      case 'Inspiration House': return item.inspirationHouse;
      case 'Inspired By': return item.inspiration;
      case 'Inspiration': return item.inspiration;
      case 'Scent Style': return item.scentStyle;
      case 'Gender': return item.gender || 'Men / Unisex';
      case 'Description': return item.description;
      case 'Emojis': return item.emojis;
      case '3mL': return item.p3;
      case '5mL': return item.p5;
      case '10mL': return item.p10;
      case 'Added Date': return item.addedDate || purchase.purchaseDate;
      case 'Featured': return 'FALSE';
      case 'Staff Pick': return 'FALSE';
      case 'Fragrantica': return item.fragrantica;
      case 'Purchase Date': return purchase.purchaseDate;
      case 'Purchase Price': return item.allocatedCost;
      case 'Bottle Size (mL)': return item.bottleSize;
      case 'Current mL': return item.currentMl;
      case 'Condition': return item.fullness + '% full';
      case 'Purchase Source': return purchase.source;
      case 'Seller': return purchase.seller;
      case 'Status': return 'In Stock';
      case 'Stock': return 'In Stock';
      case 'Last Updated': return new Date();
      default: return '';
    }
  });
  catalogue.appendRow(values);
  return nextId;
}


function copyFormulaColumnsFromPreviousRow_(sheet, targetRow, headers, columnNames) {
  if (targetRow <= 2) return;
  var sourceRow = targetRow - 1;
  columnNames.forEach(function(name) {
    var col = 0;
    for (var i = 0; i < headers.length; i++) {
      if (norm_(headers[i]) === norm_(name)) {
        col = i + 1;
        break;
      }
    }
    if (!col) return;
    var formula = sheet.getRange(sourceRow, col).getFormulaR1C1();
    if (formula) {
      sheet.getRange(targetRow, col).setFormulaR1C1(formula);
    }
  });
}

function applyCatalogueFormulaColumns_(sheet, targetRow, headers) {
  copyFormulaColumnsFromPreviousRow_(sheet, targetRow, headers, [
    'Cost per mL',
    'Revenue as 3mL',
    'Revenue as 5mL',
    'Revenue as 10mL',
    'Best Potential Revenue',
    'Projected Profit',
    'Low Stock Flag',
    'Last Updated'
  ]);
}

function addBottle_(ss, payload) {
  var r = payload.row || {};
  var catalogue = catalogueSheet_(ss);
  var nextId = nextCatalogueId_(catalogue, r.collection);
  var headers = catalogue.getRange(1,1,1,catalogue.getLastColumn()).getValues()[0];
  var values = headers.map(function(h){
    switch(String(h)) {
      case 'ID': return nextId;
      case 'Collection': return r.collection;
      case 'House': return r.house;
      case 'Fragrance': return r.fragrance;
      case 'Inspiration House': return r.inspirationHouse;
      case 'Inspired By': return r.inspiration;
      case 'Inspiration': return r.inspiration;
      case 'Scent Style': return r.scentStyle;
      case 'Gender': return r.gender || 'Men / Unisex';
      case 'Description': return r.description;
      case 'Emojis': return r.emojis;
      case '3mL': return r.p3;
      case '5mL': return r.p5;
      case '10mL': return r.p10;
      case 'Added Date': return r.addedDate || r.purchaseDate;
      case 'Featured Start': return '';
      case 'Featured': return r.featured || 'FALSE';
      case 'Staff Pick': return r.staffPick || 'FALSE';
      case 'Performance': return r.performance || '';
      case 'Projection': return r.projection || '';
      case 'Season': return r.season || '';
      case 'Occasion': return r.occasion || '';
      case 'Stock': return r.stock || 'In Stock';
      case 'Status': return r.stock || 'In Stock';
      case 'Concentration': return r.concentration || '';
      case 'Internal Notes': return r.privateNotes;
      case 'Fragrantica': return r.fragrantica;
      case 'Purchase Date': return r.purchaseDate;
      case 'Purchase Price': return r.purchasePrice;
      case 'Bottle Size (mL)': return r.bottleSize;
      case 'Current mL': return r.currentMl;
      case 'Condition': return r.condition || 'New';
      case 'Purchase Source': return r.purchaseSource;
      case 'Seller': return r.seller;
      case 'RRP': return r.rrp;
      case 'Replacement Cost': return r.replacementCost || '';
      case 'Cost per mL': return '';
      case 'Revenue as 3mL': return '';
      case 'Revenue as 5mL': return '';
      case 'Revenue as 10mL': return '';
      case 'Best Potential Revenue': return '';
      case 'Projected Profit': return '';
      case 'Low Stock Flag': return '';
      case 'Last Updated': return new Date();
      case 'Private Notes': return r.privateNotes;
      case 'Image': return r.image;
      default: return '';
    }
  });
  catalogue.appendRow(values);
  var newRow = catalogue.getLastRow();
  applyCatalogueFormulaColumns_(catalogue, newRow, headers);
  return { ok:true, action:'addBottle', id:nextId, fragrance:r.fragrance };
}


function getCatalogue_(ss) {
  var sheet = catalogueSheet_(ss);
  var values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return { ok:true, items:[] };
  var headers = values.shift();
  var items = values.filter(function(row){ return row.some(function(v){ return String(v || '').trim() !== ''; }); }).map(function(row){
    var obj = {};
    headers.forEach(function(h,i){ if (h) obj[String(h)] = row[i] || ''; });
    return obj;
  });
  return { ok:true, items:items };
}

function duplicateBottle_(ss, payload) {
  var sheet = catalogueSheet_(ss);
  var sourceRow = findRowById_(sheet, payload.id);
  if (!sourceRow) throw new Error('Bottle ID not found: ' + payload.id);
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var sourceValues = sheet.getRange(sourceRow,1,1,sheet.getLastColumn()).getValues()[0];
  var rowObj = {};
  headers.forEach(function(h,i){ rowObj[String(h)] = sourceValues[i]; });
  var nextId = nextCatalogueId_(sheet, rowObj['Collection']);
  var newValues = headers.map(function(h, i){
    h = String(h);
    if (h === 'ID') return nextId;
    if (h === 'Featured') return 'FALSE';
    if (h === 'Staff Pick') return 'FALSE';
    if (h === 'Featured Start') return '';
    if (h === 'Stock' || h === 'Status') return 'Ordered';
    if (h === 'Purchase Date' || h === 'Purchase Price' || h === 'Current mL' || h === 'Condition' || h === 'Purchase Source' || h === 'Seller') return '';
    if (h === 'Last Updated') return new Date();
    return sourceValues[i];
  });
  sheet.appendRow(newValues);
  var newRow = sheet.getLastRow();
  applyCatalogueFormulaColumns_(sheet, newRow, headers);
  return { ok:true, action:'duplicateBottle', id:nextId, sourceId:payload.id };
}

function deleteBottle_(ss, payload) {
  var sheet = catalogueSheet_(ss);
  var row = findRowById_(sheet, payload.id);
  if (!row) throw new Error('Bottle ID not found: ' + payload.id);
  sheet.deleteRow(row);
  return { ok:true, action:'deleteBottle', id:payload.id };
}
