/**
 * DeadEnd Scents Admin V2.1 write engine.
 * Copy this complete file into the Apps Script project attached to the master Google Sheet.
 * Deploy as Web App: Execute as Me, Access Anyone.
 */
function doPost(e) {
  var payload = {};
  var requestId = '';
  try {
    var payloadText = '';
    if (e && e.parameter && e.parameter.payload) payloadText = e.parameter.payload;
    else if (e && e.postData && e.postData.contents) payloadText = e.postData.contents;
    payload = JSON.parse(payloadText || '{}');
    requestId = String(payload.requestId || '');
    if (requestId) setWriteReceipt_(requestId, { ok:true, status:'processing', requestId:requestId });

    var ss = SpreadsheetApp.openById('1GSW1Bytauoi53o4orbojoZl9K-ixL4Y4Mj6NyehzCrc');
    var result = dispatchWrite_(ss, payload);
    var response = result && typeof result === 'object' ? result : { ok:true, result:result };
    if (response.ok === undefined) response.ok = true;
    response.status = response.ok === false ? 'error' : 'complete';
    response.requestId = requestId;
    if (requestId) setWriteReceipt_(requestId, response);
    return json_(response);
  } catch (err) {
    var failure = {
      ok:false,
      status:'error',
      requestId:requestId,
      error:String(err && err.message ? err.message : err)
    };
    if (requestId) setWriteReceipt_(requestId, failure);
    return json_(failure);
  }
}

function dispatchWrite_(ss, payload) {
  if (payload.action === 'updateBottle') return { ok:true, result:updateBottle_(ss, payload) };
  if (payload.action === 'setupOperationsColumns') return { ok:true, result:setupOperationsColumns_(ss) };
  if (payload.action === 'bulkStocktake') return { ok:true, result:bulkStocktake_(ss, payload) };
  if (payload.action === 'setFeatured') return { ok:true, result:setFeatured_(ss, payload) };
  if (payload.action === 'setStaffPicks') return { ok:true, result:setStaffPicks_(ss, payload) };
  if (payload.action === 'updateSettings') return { ok:true, result:updateSettings_(ss, payload) };
  if (payload.action === 'addPurchase') return addPurchase_(ss, payload);
  if (payload.action === 'addBottle') return addBottle_(ss, payload);
  if (payload.action === 'duplicateBottle') return duplicateBottle_(ss, payload);
  if (payload.action === 'deleteBottle') return deleteBottle_(ss, payload);
  if (payload.action === 'setupSEOColumns') return setupSEOColumns_(ss);
  if (payload.action === 'generateFragranceSEO') return generateFragranceSEO_(ss, payload);
  if (payload.action === 'saveFragranceSEO') return saveFragranceSEO_(ss, payload);
  if (payload.action === 'generateBulkFragranceSEO') return generateBulkFragranceSEO_(ss, payload);
  if (payload.action === 'setupOrderSheets') return setupOrderSheets_(ss);
  if (payload.action === 'createOrder') return createOrder_(ss, payload);
  if (payload.action === 'updateOrderStatus') return updateOrderStatus_(ss, payload);
  if (payload.action === 'updateOrder') return updateOrder_(ss, payload);
  if (payload.action === 'duplicateOrder') return duplicateOrder_(ss, payload);
  if (payload.action === 'updateCustomer') return updateCustomer_(ss, payload);
  if (payload.action === 'saveWishlist') return saveWishlist_(ss, payload);
  if (payload.action === 'deleteWishlist') return deleteWishlist_(ss, payload);
  throw new Error('Unknown action: ' + payload.action);
}

function writeReceiptKey_(requestId) {
  return 'adminWrite:' + String(requestId || '').replace(/[^a-zA-Z0-9_-]/g, '');
}
function setWriteReceipt_(requestId, receipt) {
  if (!requestId) return;
  var value = JSON.stringify(receipt);
  CacheService.getScriptCache().put(writeReceiptKey_(requestId), value, 600);
  PropertiesService.getScriptProperties().setProperty(writeReceiptKey_(requestId), value);
}
function getWriteReceipt_(requestId) {
  if (!requestId) return null;
  var key = writeReceiptKey_(requestId);
  var value = CacheService.getScriptCache().get(key) || PropertiesService.getScriptProperties().getProperty(key);
  return value ? JSON.parse(value) : null;
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'writeStatus') {
    var requestId = String((e && e.parameter && e.parameter.requestId) || '');
    return json_(getWriteReceipt_(requestId) || { ok:true, status:'waiting', requestId:requestId });
  }
  var ss = SpreadsheetApp.openById('1GSW1Bytauoi53o4orbojoZl9K-ixL4Y4Mj6NyehzCrc');
  if (action === 'settings') return json_({ok:true, settings:getSettings_(ss)});
  if (action === 'catalogue') return json_(getCatalogue_(ss));
  if (action === 'orders') return json_(getOrders_(ss));
  if (action === 'orderItems') return json_(getOrderItems_(ss));
  if (action === 'customers') return json_(getCustomers_(ss));
  if (action === 'orderSummary') return json_(getOrderSummary_(ss));
  if (action === 'wishlist') return json_(getWishlist_(ss));
  if (action === 'stockAdjustments') return json_(getStockAdjustments_(ss));
  return json_({ok:true, app:'DeadEnd Scents Admin V2.1', status:'ready'});
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
  if (fields['Current mL'] !== undefined || fields['Current Amount Left (mL)'] !== undefined) {
    setByAnyHeader_(sheet, row, map, ['Last Stocktake'], new Date());
    setByAnyHeader_(sheet, row, map, ['Stock Confidence'], fields['Stock Confidence'] || 'Manual');
  }
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
  var range = sheet.getDataRange();
  var display = range.getDisplayValues();
  var raw = range.getValues();
  if (!display.length) return { ok:true, items:[] };
  var headers = display[0];
  var items = [];
  for (var r = 1; r < display.length; r++) {
    var rowDisplay = display[r];
    var rowRaw = raw[r];
    if (!rowDisplay.some(function(v){ return String(v || '').trim() !== ''; })) continue;
    var obj = {};
    headers.forEach(function(h, i){
      if (!h) return;
      var key = String(h);
      var val = rowRaw[i];
      if (val instanceof Date) {
        obj[key] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else if (typeof val === 'number') {
        obj[key] = val;
      } else {
        obj[key] = rowDisplay[i] || '';
      }
    });
    items.push(obj);
  }
  return { ok:true, items:items, source:'live-spreadsheet', generated:new Date().toISOString() };
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


/**
 * V6.0.2 SEO Engine foundation.
 * Backwards compatible: these functions only add/read/update SEO columns.
 * Existing Add Bottle, Inventory Manager and Bottle Editor actions are unchanged.
 */
var SEO_COLUMNS_V601 = [
  'SEO Slug',
  'SEO Title',
  'SEO Description',
  'SEO Intro',
  'SEO Keywords',
  'SEO FAQ',
  'SEO Similar Fragrances',
  'SEO Internal Links',
  'SEO Score',
  'SEO Last Updated',
  'SEO Schema Status',
  'SEO Open Graph Status'
];

function setupSEOColumns_(ss) {
  var sheet = catalogueSheet_(ss);
  var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  var existing = {};
  headers.forEach(function(h){ existing[norm_(h)] = true; });
  var added = [];
  SEO_COLUMNS_V601.forEach(function(name){
    if (!existing[norm_(name)]) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(name);
      added.push(name);
      existing[norm_(name)] = true;
    }
  });
  return { ok:true, action:'setupSEOColumns', added:added, message: added.length ? 'SEO columns added.' : 'SEO columns already exist.' };
}

function getCellByNames_(rowObj, names) {
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (rowObj[n] !== null && typeof rowObj[n] !== 'undefined' && String(rowObj[n]).trim() !== '') return String(rowObj[n]).trim();
  }
  return '';
}

function slugifySEO_(value) {
  return String(value || '').toLowerCase()
    .replace(/[àáâãäå]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
    .replace(/[òóôõö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ç]/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,80);
}

function sentenceTrim_(text, max) {
  text = String(text || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.substring(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function rowObjectFromSheet_(sheet, row) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var obj = {};
  headers.forEach(function(h, i){ if (h) obj[String(h)] = values[i] || ''; });
  return { headers:headers, obj:obj };
}

function generateSEODataForRow_(item, allItems) {
  var house = getCellByNames_(item, ['House']);
  var fragrance = getCellByNames_(item, ['Fragrance']);
  var collection = getCellByNames_(item, ['Collection']);
  var style = getCellByNames_(item, ['Scent Style']);
  var gender = getCellByNames_(item, ['Gender']);
  var season = getCellByNames_(item, ['Season']);
  var occasion = getCellByNames_(item, ['Occasion']);
  var performance = getCellByNames_(item, ['Performance']);
  var projection = getCellByNames_(item, ['Projection']);
  var desc = getCellByNames_(item, ['Description']);
  var inspiration = getCellByNames_(item, ['Inspiration', 'Inspired By']);
  var slug = getCellByNames_(item, ['SEO Slug']) || slugifySEO_([house, fragrance, 'sample', 'australia'].filter(Boolean).join(' '));
  var name = [house, fragrance].filter(Boolean).join(' ');
  var title = sentenceTrim_((name || fragrance || 'Fragrance') + ' Sample Australia | DeadEnd Scents', 60);
  var description = sentenceTrim_('Buy a ' + (name || fragrance || 'fragrance') + ' sample or decant in Australia. ' + [style, season, occasion].filter(Boolean).join(' · ') + (desc ? '. ' + desc : ''), 155);
  var intro = desc || ('Try ' + (name || fragrance || 'this fragrance') + ' as a sample before buying a full bottle. Available from DeadEnd Scents in Australia.');
  var similar = allItems.filter(function(x){
    if (String(x.ID) === String(item.ID)) return false;
    var sameStyle = style && String(x['Scent Style'] || '').toLowerCase() === style.toLowerCase();
    var sameCollection = collection && String(x.Collection || '').toLowerCase() === collection.toLowerCase();
    return sameStyle || sameCollection;
  }).slice(0, 6).map(function(x){ return [x.House, x.Fragrance].filter(Boolean).join(' '); }).join(' | ');
  var faq = [
    'Is ' + (name || fragrance || 'this fragrance') + ' available as a sample in Australia?||Yes. DeadEnd Scents offers fragrance samples and decants in Australia, subject to current stock.',
    'What does ' + (name || fragrance || 'this fragrance') + ' smell like?||' + sentenceTrim_([style, desc].filter(Boolean).join('. ') || 'Check the description, scent style, season and occasion notes on this page.', 240),
    'When should I wear ' + (name || fragrance || 'this fragrance') + '?||' + sentenceTrim_([season ? 'Best suited to ' + season : '', occasion ? 'Works well for ' + occasion : '', performance ? 'Performance: ' + performance : '', projection ? 'Projection: ' + projection : ''].filter(Boolean).join('. ') || 'Use the season, occasion, performance and projection notes as a guide.', 240)
  ].join('\n');
  var keywords = [name, fragrance + ' sample', fragrance + ' decant', house + ' samples Australia', collection, style, inspiration].filter(Boolean).join(', ');
  var internalLinks = ['/fragrances/' + slug + '/', '/houses/' + slugifySEO_(house) + '/', '/#collection-' + slugifySEO_(collection)].filter(function(v){return v.indexOf('undefined')<0 && v.indexOf('//')<0;}).join(' | ');
  var score = calculateSEOScoreFromItem_(item, {title:title, description:description, intro:intro, faq:faq, similar:similar, slug:slug, internalLinks:internalLinks});
  return {
    'SEO Slug': slug,
    'SEO Title': title,
    'SEO Description': description,
    'SEO Intro': intro,
    'SEO Keywords': keywords,
    'SEO FAQ': faq,
    'SEO Similar Fragrances': similar,
    'SEO Internal Links': internalLinks,
    'SEO Score': score,
    'SEO Last Updated': new Date(),
    'SEO Schema Status': 'Ready',
    'SEO Open Graph Status': 'Ready'
  };
}

function calculateSEOScoreFromItem_(item, seo) {
  var score = 0;
  if (getCellByNames_(item, ['Image','Image URL','Bottle Image'])) score += 15;
  if (getCellByNames_(item, ['Description']).length >= 50) score += 10;
  if (getCellByNames_(item, ['Performance'])) score += 10;
  if (getCellByNames_(item, ['Projection'])) score += 10;
  if (getCellByNames_(item, ['Season'])) score += 10;
  if (getCellByNames_(item, ['Occasion'])) score += 10;
  if (seo.slug || getCellByNames_(item, ['SEO Slug'])) score += 10;
  if (seo.title || getCellByNames_(item, ['SEO Title'])) score += 10;
  if (seo.description || getCellByNames_(item, ['SEO Description'])) score += 15;
  if (seo.faq || getCellByNames_(item, ['SEO FAQ'])) score += 10;
  if (seo.internalLinks || getCellByNames_(item, ['SEO Internal Links'])) score += 5;
  if ((seo.slug || getCellByNames_(item, ['SEO Slug'])) && (getCellByNames_(item, ['3mL']) || getCellByNames_(item, ['5mL']) || getCellByNames_(item, ['10mL']))) score += 5;
  return Math.min(100, score);
}

function generateFragranceSEO_(ss, payload) {
  setupSEOColumns_(ss);
  var sheet = catalogueSheet_(ss);
  var row = findRowById_(sheet, payload.id);
  if (!row) throw new Error('Bottle ID not found: ' + payload.id);
  var bundle = rowObjectFromSheet_(sheet, row);
  var all = getCatalogue_(ss).items || [];
  var seo = generateSEODataForRow_(bundle.obj, all);
  var map = headerMap_(sheet);
  Object.keys(seo).forEach(function(name){ setByAnyHeader_(sheet, row, map, [name], seo[name]); });
  return { ok:true, action:'generateFragranceSEO', id:payload.id, seo:seo };
}

function saveFragranceSEO_(ss, payload) {
  setupSEOColumns_(ss);
  var sheet = catalogueSheet_(ss);
  var row = findRowById_(sheet, payload.id);
  if (!row) throw new Error('Bottle ID not found: ' + payload.id);
  var fields = payload.fields || {};
  fields['SEO Last Updated'] = new Date();
  var map = headerMap_(sheet);
  Object.keys(fields).forEach(function(name){ setByAnyHeader_(sheet, row, map, [name], fields[name]); });
  return { ok:true, action:'saveFragranceSEO', id:payload.id };
}

function generateBulkFragranceSEO_(ss, payload) {
  setupSEOColumns_(ss);
  var ids = payload.ids || [];
  if (!ids.length) return { ok:true, action:'generateBulkFragranceSEO', count:0 };
  var sheet = catalogueSheet_(ss);
  var all = getCatalogue_(ss).items || [];
  var map = headerMap_(sheet);
  var count = 0;
  ids.forEach(function(id){
    var row = findRowById_(sheet, id);
    if (!row) return;
    var bundle = rowObjectFromSheet_(sheet, row);
    var seo = generateSEODataForRow_(bundle.obj, all);
    Object.keys(seo).forEach(function(name){ setByAnyHeader_(sheet, row, map, [name], seo[name]); });
    count++;
  });
  return { ok:true, action:'generateBulkFragranceSEO', count:count };
}


/* =========================
 * ADMIN V2 PHASE 2: ORDERS
 * ========================= */
function headerMap_(headers) {
  var out = {};
  headers.forEach(function(h, i){ out[String(h || '').toLowerCase().replace(/[^a-z0-9]/g,'')] = i; });
  return out;
}
function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,headers.length).setValues([headers]);
  var existing = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),1)).getValues()[0];
  var norm = headerMap_(existing);
  var missing = headers.filter(function(h){ return norm[String(h).toLowerCase().replace(/[^a-z0-9]/g,'')] === undefined; });
  if (missing.length) sheet.getRange(1,existing.length+1,1,missing.length).setValues([missing]);
  sheet.setFrozenRows(1);
  return sheet;
}
function setupOrderSheets_(ss) {
  ensureSheet_(ss,'Orders',['Order ID','Order Date','Customer ID','Customer','Sales Source','Items Sold','Total mL','Subtotal','Postage','Discount','Total Paid','Payment Status','Order Status','Tracking Number','Notes','Stock Deducted','Created At']);
  ensureSheet_(ss,'Order Items',['Order Item ID','Order ID','Order Date','Customer ID','Customer','Fragrance ID','House','Fragrance','Size mL','Quantity','Price Each','Line Total','Product Cost','Profit']);
  ensureSheet_(ss,'Customers',['Customer ID','Customer','First Order','Last Order','Orders','Total Spend','Email','Phone','Notes']);
  return {ok:true, action:'setupOrderSheets'};
}
function nextSequentialId_(sheet, prefix, width) {
  var vals = sheet.getLastRow() > 1 ? sheet.getRange(2,1,sheet.getLastRow()-1,1).getDisplayValues().flat() : [];
  var max = 0;
  vals.forEach(function(v){ var m=String(v||'').match(/(\d+)$/); if(m) max=Math.max(max,Number(m[1])); });
  return prefix + String(max+1).padStart(width,'0');
}
function rowObject_(headers, row) { var o={}; headers.forEach(function(h,i){ o[h]=row[i]; }); return o; }
function getOrders_(ss) {
  var sheet=ss.getSheetByName('Orders'); if(!sheet) return {ok:true,items:[]};
  var values=sheet.getDataRange().getDisplayValues(); if(values.length<2) return {ok:true,items:[]};
  var headers=values.shift();
  var items=values.filter(function(r){return r.some(String);}).map(function(r){return rowObject_(headers,r);});
  items.reverse();
  return {ok:true,items:items};
}
function getOrderItems_(ss) {
  var sheet=ss.getSheetByName('Order Items'); if(!sheet) return {ok:true,items:[]};
  var values=sheet.getDataRange().getDisplayValues(); if(values.length<2) return {ok:true,items:[]};
  var headers=values.shift();
  return {ok:true,items:values.filter(function(r){return r.some(String);}).map(function(r){return rowObject_(headers,r);})};
}
function getCustomers_(ss) {
  var sheet=ss.getSheetByName('Customers'); if(!sheet) return {ok:true,items:[]};
  var values=sheet.getDataRange().getDisplayValues(); if(values.length<2) return {ok:true,items:[]};
  var headers=values.shift();
  return {ok:true,items:values.filter(function(r){return r.some(String);}).map(function(r){return rowObject_(headers,r);})};
}
function getOrderSummary_(ss) {
  var orders=getOrders_(ss).items;
  var revenue=0, pending=0, totalMl=0;
  orders.forEach(function(o){ revenue += Number(String(o['Total Paid']||'').replace(/[^0-9.-]/g,''))||0; totalMl += Number(o['Total mL'])||0; if(!/completed|posted|delivered/i.test(String(o['Order Status']||''))) pending++; });
  return {ok:true,summary:{orders:orders.length,revenue:revenue,average:orders.length?revenue/orders.length:0,pending:pending,totalMl:totalMl}};
}
function findHeader_(headers, aliases) {
  var map=headerMap_(headers); for(var i=0;i<aliases.length;i++){ var k=String(aliases[i]).toLowerCase().replace(/[^a-z0-9]/g,''); if(map[k]!==undefined) return map[k]; } return -1;
}
function appendByHeaders_(sheet, obj) {
  var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var row=headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}
function createOrder_(ss,payload) {
  setupOrderSheets_(ss);
  var orders=ss.getSheetByName('Orders'), itemsSheet=ss.getSheetByName('Order Items'), customers=ss.getSheetByName('Customers');
  var p=payload.order||{}; var items=Array.isArray(p.items)?p.items:[]; if(!items.length) throw new Error('Add at least one fragrance.');
  var orderId=nextSequentialId_(orders,'DES-',5); var date=p.orderDate||Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Australia/Sydney','yyyy-MM-dd');
  var customerName=String(p.customer||'').trim()||'Walk-in / Unknown';
  var customerId=upsertCustomer_(customers,customerName,p,date);
  var subtotal=0,totalMl=0,totalQty=0,totalCost=0;
  items.forEach(function(it){ var q=Math.max(1,Number(it.quantity)||1), size=Number(it.sizeMl)||0, price=Number(it.priceEach)||0; subtotal+=q*price; totalMl+=q*size; totalQty+=q; totalCost+=Number(it.productCost)||0; });
  var postage=Number(p.postage)||0, discount=Number(p.discount)||0, total=Math.max(0,subtotal+postage-discount);
  appendByHeaders_(orders,{'Order ID':orderId,'Order Date':date,'Customer ID':customerId,'Customer':customerName,'Sales Source':p.salesSource||'Website / Direct','Items Sold':totalQty,'Total mL':totalMl,'Subtotal':subtotal,'Postage':postage,'Discount':discount,'Total Paid':total,'Payment Status':p.paymentStatus||'Paid','Order Status':p.orderStatus||'New','Tracking Number':p.trackingNumber||'','Notes':p.notes||'','Stock Deducted':p.deductStock?'TRUE':'FALSE','Created At':new Date()});
  items.forEach(function(it,index){ var q=Math.max(1,Number(it.quantity)||1), size=Number(it.sizeMl)||0, price=Number(it.priceEach)||0, line=q*price, cost=Number(it.productCost)||0; appendByHeaders_(itemsSheet,{'Order Item ID':orderId+'-'+String(index+1).padStart(2,'0'),'Order ID':orderId,'Order Date':date,'Customer ID':customerId,'Customer':customerName,'Fragrance ID':it.fragranceId||'','House':it.house||'','Fragrance':it.fragrance||'','Size mL':size,'Quantity':q,'Price Each':price,'Line Total':line,'Product Cost':cost,'Profit':line-cost}); });
  if(p.deductStock) deductOrderStock_(ss,items);
  refreshCustomerStats_(ss,customerId);
  return {ok:true,action:'createOrder',orderId:orderId,total:total};
}
function upsertCustomer_(sheet,name,p,date) {
  var values=sheet.getDataRange().getValues(), headers=values[0], hi=headerMap_(headers), nameCol=hi.customer, idCol=hi.customerid;
  for(var r=1;r<values.length;r++) if(String(values[r][nameCol]||'').trim().toLowerCase()===name.toLowerCase()) return String(values[r][idCol]||'');
  var id=nextSequentialId_(sheet,'CUST-',4); appendByHeaders_(sheet,{'Customer ID':id,'Customer':name,'First Order':date,'Last Order':date,'Orders':0,'Total Spend':0,'Email':p.email||'','Phone':p.phone||'','Notes':p.customerNotes||''}); return id;
}
function refreshCustomerStats_(ss,customerId) {
  var cs=ss.getSheetByName('Customers'), os=ss.getSheetByName('Orders'); if(!cs||!os) return;
  var cv=cs.getDataRange().getValues(), ch=cv[0], chi=headerMap_(ch), ov=os.getDataRange().getValues(), oh=ov[0], ohi=headerMap_(oh);
  var count=0,total=0,first='',last='';
  for(var i=1;i<ov.length;i++) if(String(ov[i][ohi.customerid])===customerId){ count++; total+=Number(ov[i][ohi.totalpaid])||0; var d=ov[i][ohi.orderdate]; if(!first||d<first) first=d; if(!last||d>last) last=d; }
  for(var r=1;r<cv.length;r++) if(String(cv[r][chi.customerid])===customerId){ if(chi.orders!==undefined) cs.getRange(r+1,chi.orders+1).setValue(count); if(chi.totalspend!==undefined) cs.getRange(r+1,chi.totalspend+1).setValue(total); if(chi.firstorder!==undefined) cs.getRange(r+1,chi.firstorder+1).setValue(first); if(chi.lastorder!==undefined) cs.getRange(r+1,chi.lastorder+1).setValue(last); break; }
}
function deductOrderStock_(ss,items) {
  var sheet=ss.getSheetByName('Catalogue')||ss.getSheets()[0], values=sheet.getDataRange().getValues(), headers=values[0];
  var idCol=findHeader_(headers,['ID']), mlCol=findHeader_(headers,['Current mL','Current Amount Left (mL)','Amount Left','Remaining mL']);
  if(idCol<0||mlCol<0) throw new Error('Catalogue needs ID and Current mL columns before stock can be deducted.');
  items.forEach(function(it){ var qty=Math.max(1,Number(it.quantity)||1), size=Number(it.sizeMl)||0; for(var r=1;r<values.length;r++) if(String(values[r][idCol])===String(it.fragranceId)){ var current=Number(values[r][mlCol])||0; var next=Math.max(0,current-(qty*size)); sheet.getRange(r+1,mlCol+1).setValue(next); values[r][mlCol]=next; break; } });
}
function updateOrderStatus_(ss,payload) {
  var sheet=ss.getSheetByName('Orders'); if(!sheet) throw new Error('Orders sheet not found.');
  var values=sheet.getDataRange().getValues(), headers=values[0], hi=headerMap_(headers), id=String(payload.orderId||'');
  for(var r=1;r<values.length;r++) if(String(values[r][hi.orderid])===id){ if(hi.orderstatus!==undefined&&payload.orderStatus!==undefined) sheet.getRange(r+1,hi.orderstatus+1).setValue(payload.orderStatus); if(hi.paymentstatus!==undefined&&payload.paymentStatus!==undefined) sheet.getRange(r+1,hi.paymentstatus+1).setValue(payload.paymentStatus); if(hi.trackingnumber!==undefined&&payload.trackingNumber!==undefined) sheet.getRange(r+1,hi.trackingnumber+1).setValue(payload.trackingNumber); return {ok:true,action:'updateOrderStatus',orderId:id}; }
  throw new Error('Order not found: '+id);
}


/* =========================
 * ADMIN V2 PHASE 5: ORDER EDITING + CUSTOMER PROFILES
 * ========================= */
function boolValue_(v) { return v === true || String(v || '').toLowerCase() === 'true' || String(v || '') === '1'; }
function findOrderRow_(sheet, orderId) {
  var values=sheet.getDataRange().getValues(), headers=values[0], hi=headerMap_(headers);
  for(var r=1;r<values.length;r++) if(String(values[r][hi.orderid])===String(orderId)) return {row:r+1,values:values[r],headers:headers,hi:hi};
  return null;
}
function orderItemsFor_(sheet, orderId) {
  var values=sheet.getDataRange().getValues(), headers=values[0], hi=headerMap_(headers), out=[];
  for(var r=1;r<values.length;r++) if(String(values[r][hi.orderid])===String(orderId)) out.push({row:r+1,obj:rowObject_(headers,values[r])});
  return out;
}
function normaliseMatchText_(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function resolveCatalogueStockRows_(ss, items) {
  var sheet = ss.getSheetByName('Catalogue') || ss.getSheets()[0];
  var values = sheet.getDataRange().getValues(), headers = values[0];
  var idCol = findHeader_(headers, ['ID']);
  var houseCol = findHeader_(headers, ['House']);
  var fragranceCol = findHeader_(headers, ['Fragrance', 'Name']);
  var mlCol = findHeader_(headers, ['Current mL','Current Amount Left (mL)','Amount Left','Remaining mL']);
  if (mlCol < 0) throw new Error('Catalogue needs a Current mL column before stock can be adjusted.');

  var resolved = items.map(function(it) {
    var id = String(it.fragranceId || it['Fragrance ID'] || '').trim();
    var house = normaliseMatchText_(it.house || it.House || '');
    var fragrance = normaliseMatchText_(it.fragrance || it.Fragrance || '');
    var row = -1;
    if (id && idCol >= 0) {
      for (var r=1; r<values.length; r++) if (String(values[r][idCol]).trim() === id) { row=r; break; }
    }
    if (row < 0 && fragrance && fragranceCol >= 0) {
      for (var x=1; x<values.length; x++) {
        var sameFragrance = normaliseMatchText_(values[x][fragranceCol]) === fragrance;
        var sameHouse = houseCol < 0 || !house || normaliseMatchText_(values[x][houseCol]) === house;
        if (sameFragrance && sameHouse) { row=x; break; }
      }
    }
    if (row < 0) throw new Error('Could not match Catalogue bottle for ' + [it.house || it.House, it.fragrance || it.Fragrance].filter(String).join(' - '));
    return { row:row, item:it };
  });
  return { sheet:sheet, values:values, mlCol:mlCol, resolved:resolved };
}
function adjustOrderStock_(ss,items,direction) {
  var match = resolveCatalogueStockRows_(ss, items);
  match.resolved.forEach(function(entry) {
    var it=entry.item, qty=Math.max(1,Number(it.quantity || it.Quantity)||1), size=Number(it.sizeMl || it['Size mL'])||0;
    if (!size) throw new Error('Missing sample size for ' + (it.fragrance || it.Fragrance || 'order item'));
    var current=Number(match.values[entry.row][match.mlCol])||0;
    var next=current+(direction*qty*size);
    if (next < 0) throw new Error('Not enough stock for ' + (it.fragrance || it.Fragrance || 'order item') + '. Current stock: ' + current + 'mL.');
    match.sheet.getRange(entry.row+1,match.mlCol+1).setValue(next);
    match.values[entry.row][match.mlCol]=next;
  });
}
function writeOrderItems_(sheet,orderId,date,customerId,customerName,items){
  items.forEach(function(it,index){
    var q=Math.max(1,Number(it.quantity)||1), size=Number(it.sizeMl)||0, price=Number(it.priceEach)||0, line=q*price, cost=Number(it.productCost)||0;
    appendByHeaders_(sheet,{'Order Item ID':orderId+'-'+String(index+1).padStart(2,'0'),'Order ID':orderId,'Order Date':date,'Customer ID':customerId,'Customer':customerName,'Fragrance ID':it.fragranceId||'','House':it.house||'','Fragrance':it.fragrance||'','Size mL':size,'Quantity':q,'Price Each':price,'Line Total':line,'Product Cost':cost,'Profit':line-cost});
  });
}
function updateOrder_(ss,payload) {
  setupOrderSheets_(ss);
  var orders=ss.getSheetByName('Orders'), itemsSheet=ss.getSheetByName('Order Items'), customers=ss.getSheetByName('Customers');
  var id=String(payload.orderId||''), found=findOrderRow_(orders,id); if(!found) throw new Error('Order not found: '+id);
  var oldCustomerId=String(found.values[found.hi.customerid]||''), oldStock=boolValue_(found.values[found.hi.stockdeducted]);
  var oldItems=orderItemsFor_(itemsSheet,id), p=payload.order||{}, items=Array.isArray(p.items)?p.items:[]; if(!items.length) throw new Error('Add at least one fragrance.');
  var date=p.orderDate||found.values[found.hi.orderdate], customerName=String(p.customer||'').trim()||'Walk-in / Unknown';
  var customerId=upsertCustomer_(customers,customerName,p,date), subtotal=0,totalMl=0,totalQty=0;
  items.forEach(function(it){var q=Math.max(1,Number(it.quantity)||1),size=Number(it.sizeMl)||0,price=Number(it.priceEach)||0;subtotal+=q*price;totalMl+=q*size;totalQty+=q;});
  var postage=Number(p.postage)||0,discount=Number(p.discount)||0,total=Math.max(0,subtotal+postage-discount),newStock=boolValue_(p.deductStock);
  // Validate every new stock match before changing the old order or catalogue.
  if(newStock) resolveCatalogueStockRows_(ss, items);
  if(oldStock) resolveCatalogueStockRows_(ss, oldItems.map(function(x){return x.obj;}));
  if(oldStock) adjustOrderStock_(ss,oldItems.map(function(x){return x.obj;}),1);
  oldItems.sort(function(a,b){return b.row-a.row;}).forEach(function(x){itemsSheet.deleteRow(x.row);});
  writeOrderItems_(itemsSheet,id,date,customerId,customerName,items);
  if(newStock) adjustOrderStock_(ss,items,-1);
  var updates={'Order Date':date,'Customer ID':customerId,'Customer':customerName,'Sales Source':p.salesSource||'Direct','Items Sold':totalQty,'Total mL':totalMl,'Subtotal':subtotal,'Postage':postage,'Discount':discount,'Total Paid':total,'Payment Status':p.paymentStatus||'Paid','Order Status':p.orderStatus||'New','Tracking Number':p.trackingNumber||'','Notes':p.notes||'','Stock Deducted':newStock?'TRUE':'FALSE'};
  found.headers.forEach(function(h,i){if(updates[h]!==undefined) orders.getRange(found.row,i+1).setValue(updates[h]);});
  refreshCustomerStats_(ss,oldCustomerId); if(customerId!==oldCustomerId) refreshCustomerStats_(ss,customerId);
  return {ok:true,action:'updateOrder',orderId:id,total:total};
}
function duplicateOrder_(ss,payload) {
  var orders=ss.getSheetByName('Orders'), itemsSheet=ss.getSheetByName('Order Items'); if(!orders||!itemsSheet) throw new Error('Order sheets not found.');
  var id=String(payload.orderId||''), found=findOrderRow_(orders,id); if(!found) throw new Error('Order not found: '+id);
  var o=rowObject_(found.headers,found.values), its=orderItemsFor_(itemsSheet,id).map(function(x){var z=x.obj;return {fragranceId:z['Fragrance ID'],house:z.House,fragrance:z.Fragrance,sizeMl:Number(z['Size mL'])||0,quantity:Number(z.Quantity)||1,priceEach:Number(z['Price Each'])||0,productCost:Number(z['Product Cost'])||0};});
  return createOrder_(ss,{order:{orderDate:payload.orderDate||Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Australia/Sydney','yyyy-MM-dd'),customer:o.Customer,salesSource:payload.salesSource||'Repeat Customer',paymentStatus:'Pending',orderStatus:'New',postage:Number(o.Postage)||0,discount:0,notes:'Duplicated from '+id,deductStock:false,items:its}});
}
function updateCustomer_(ss,payload) {
  var sheet=ss.getSheetByName('Customers'); if(!sheet) throw new Error('Customers sheet not found.');
  var values=sheet.getDataRange().getValues(), headers=values[0], hi=headerMap_(headers), id=String(payload.customerId||''), fields=payload.fields||{};
  for(var r=1;r<values.length;r++) if(String(values[r][hi.customerid])===id){
    var map={'Customer':'customer','Email':'email','Phone':'phone','Notes':'notes'};
    Object.keys(map).forEach(function(label){var col=hi[map[label]];if(col!==undefined&&fields[label]!==undefined)sheet.getRange(r+1,col+1).setValue(fields[label]);});
    var os=ss.getSheetByName('Orders'), oi=ss.getSheetByName('Order Items');
    if(fields.Customer!==undefined){
      [os,oi].forEach(function(s){if(!s)return;var v=s.getDataRange().getValues(),h=v[0],m=headerMap_(h);for(var i=1;i<v.length;i++)if(String(v[i][m.customerid])===id&&m.customer!==undefined)s.getRange(i+1,m.customer+1).setValue(fields.Customer);});
    }
    return {ok:true,action:'updateCustomer',customerId:id};
  }
  throw new Error('Customer not found: '+id);
}


/* Phase 7.1 — DeadEnd Intelligence Wishlist */
var WISHLIST_HEADERS_ = [
  'Wishlist ID','Date Added','Last Updated','House','Fragrance','Collection','Scent Style',
  'Season','Occasion','Purchase Price','Shipping / Extra','Landed Cost','Normal RRP','Bottle Size mL',
  'Suggested 3mL','Suggested 5mL','Suggested 10mL','Buy Score','Verdict','Projected ROI %',
  'Closest Match','Closest Match %','Similarity Reasons','Status','Personal Interest','Notes / Accords','URL'
];

function wishlistSheet_(ss) {
  var sheet = ss.getSheetByName('Wishlist');
  if (!sheet) sheet = ss.insertSheet('Wishlist');
  var current = sheet.getLastColumn() ? sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0] : [];
  var existing = {};
  current.forEach(function(h){ existing[norm_(h)] = true; });
  if (!current.length || !current.some(function(v){ return String(v || '').trim(); })) {
    sheet.getRange(1,1,1,WISHLIST_HEADERS_.length).setValues([WISHLIST_HEADERS_]);
  } else {
    WISHLIST_HEADERS_.forEach(function(h){
      if (!existing[norm_(h)]) sheet.getRange(1,sheet.getLastColumn()+1).setValue(h);
    });
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function getWishlist_(ss) {
  var sheet = wishlistSheet_(ss);
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return {ok:true,items:[]};
  var headers = values.shift();
  var items = values.filter(function(r){ return r.some(function(v){ return String(v || '').trim(); }); })
    .map(function(r){ return rowObject_(headers,r); });
  return {ok:true,items:items};
}

function saveWishlist_(ss,payload) {
  var sheet = wishlistSheet_(ss);
  var item = payload.item || {};
  var id = String(item['Wishlist ID'] || item.id || '').trim();
  if (!id) id = 'W-' + Utilities.getUuid().substring(0,8).toUpperCase();
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var hi = headerMap_(headers);
  var row = 0;
  for (var r=1;r<values.length;r++) {
    if (String(values[r][hi.wishlistid] || '') === id) { row=r+1; break; }
  }
  var now = new Date();
  var out = {
    'Wishlist ID':id,
    'Date Added':item['Date Added'] || item.saved || now,
    'Last Updated':now,
    'House':item.House || item.house || '',
    'Fragrance':item.Fragrance || item.name || '',
    'Collection':item.Collection || item.collection || '',
    'Scent Style':item['Scent Style'] || item.scentStyle || '',
    'Season':item.Season || item.season || '',
    'Occasion':item.Occasion || item.occasion || '',
    'Purchase Price':Number(item['Purchase Price'] || item.cost || 0),
    'Shipping / Extra':Number(item['Shipping / Extra'] || item.shipping || 0),
    'Landed Cost':Number(item['Landed Cost'] || item.landedCost || 0),
    'Normal RRP':Number(item['Normal RRP'] || item.rrp || 0),
    'Bottle Size mL':Number(item['Bottle Size mL'] || item.size || 0),
    'Suggested 3mL':Number(item['Suggested 3mL'] || item.p3 || 0),
    'Suggested 5mL':Number(item['Suggested 5mL'] || item.p5 || 0),
    'Suggested 10mL':Number(item['Suggested 10mL'] || item.p10 || 0),
    'Buy Score':Number(item['Buy Score'] || item.score || 0),
    'Verdict':item.Verdict || item.verdict || '',
    'Projected ROI %':Number(item['Projected ROI %'] || item.roi || 0),
    'Closest Match':item['Closest Match'] || item.closest || '',
    'Closest Match %':Number(item['Closest Match %'] || item.overlap || 0),
    'Similarity Reasons':item['Similarity Reasons'] || item.similarityReasons || '',
    'Status':item.Status || item.status || 'Wishlist',
    'Personal Interest':Number(item['Personal Interest'] || item.interest || 3),
    'Notes / Accords':item['Notes / Accords'] || item.notes || '',
    'URL':item.URL || item.url || ''
  };
  var rowValues = headers.map(function(h){ return out[h] !== undefined ? out[h] : ''; });
  if (row) sheet.getRange(row,1,1,headers.length).setValues([rowValues]);
  else { sheet.appendRow(rowValues); row=sheet.getLastRow(); }
  return {ok:true,action:'saveWishlist',id:id,row:row};
}

function deleteWishlist_(ss,payload) {
  var sheet = wishlistSheet_(ss);
  var id = String(payload.id || '').trim();
  if (!id) throw new Error('Wishlist ID is required.');
  var values = sheet.getDataRange().getValues();
  var hi = headerMap_(values[0]);
  for (var r=1;r<values.length;r++) {
    if (String(values[r][hi.wishlistid] || '') === id) {
      sheet.deleteRow(r+1);
      return {ok:true,action:'deleteWishlist',id:id};
    }
  }
  throw new Error('Wishlist item not found: ' + id);
}


// =========================================================
// Phase 7.3.1 — Operations / Bulk Stocktake
// =========================================================
function setupOperationsColumns_(ss) {
  var sheet = catalogueSheet_(ss);
  var wanted = ['Last Stocktake','Stock Confidence','Last Promotion Date','Times Featured','Reorder Threshold','Favourite','Discontinued','Seasonal Score'];
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var existing = {}; headers.forEach(function(h){ existing[norm_(h)] = true; });
  var added=[];
  wanted.forEach(function(h){ if(!existing[norm_(h)]){ sheet.getRange(1,sheet.getLastColumn()+1).setValue(h); existing[norm_(h)]=true; added.push(h); } });
  ensureInventoryAdjustments_(ss);
  return {action:'setupOperationsColumns',added:added};
}
function ensureInventoryAdjustments_(ss){
  var sh=ss.getSheetByName('Inventory Adjustments');
  var headers=['Adjustment ID','Timestamp','Bottle ID','House','Fragrance','Previous mL','New mL','Change mL','Reason','Confidence','Source'];
  if(!sh){sh=ss.insertSheet('Inventory Adjustments');sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);}
  return sh;
}
function bulkStocktake_(ss,payload){
  setupOperationsColumns_(ss);
  var entries=payload.entries||[], sheet=catalogueSheet_(ss), map=headerMap_(sheet), history=ensureInventoryAdjustments_(ss), logs=[];
  entries.forEach(function(e){
    var row=findRowById_(sheet,e.id); if(!row) throw new Error('Bottle ID not found: '+e.id);
    var mlCol=getColumn_(map,['Current mL','Current Amount Left (mL)','Amount Left','Remaining mL']);
    if(!mlCol) throw new Error('Catalogue needs a Current mL column.');
    var prev=Number(sheet.getRange(row,mlCol).getValue())||0, next=Math.max(0,Number(e.ml)||0), now=new Date();
    var houseCol=getColumn_(map,['House']), fragranceCol=getColumn_(map,['Fragrance']);
    var house=houseCol?sheet.getRange(row,houseCol).getDisplayValue():'', fragrance=fragranceCol?sheet.getRange(row,fragranceCol).getDisplayValue():'';
    sheet.getRange(row,mlCol).setValue(next);
    setByAnyHeader_(sheet,row,map,['Last Stocktake'],now);
    setByAnyHeader_(sheet,row,map,['Stock Confidence'],e.confidence||'Manual');
    setByAnyHeader_(sheet,row,map,['Last Updated','Updated'],now);
    logs.push(['ADJ-'+Utilities.getUuid().slice(0,8).toUpperCase(),now,String(e.id),house,fragrance,prev,next,next-prev,e.reason||'Physical stocktake',e.confidence||'Manual','Admin Bulk Stocktake']);
    applyCatalogueFormulaColumns_(sheet,row,sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]);
  });
  if(logs.length)history.getRange(history.getLastRow()+1,1,logs.length,logs[0].length).setValues(logs);
  return {action:'bulkStocktake',count:logs.length};
}
function getStockAdjustments_(ss){
  var sh=ss.getSheetByName('Inventory Adjustments'); if(!sh||sh.getLastRow()<2)return {ok:true,items:[]};
  var vals=sh.getDataRange().getDisplayValues(), h=vals.shift();
  var items=vals.map(function(r){var o={};h.forEach(function(k,i){o[k]=r[i]||''});return o;}).reverse().slice(0,100);
  return {ok:true,items:items};
}
