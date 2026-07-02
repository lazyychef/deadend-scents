/**
 * DeadEnd Scents Command Centre write-back endpoint.
 * Deploy as a Google Apps Script Web App attached to the master Google Sheet.
 * Access: Anyone with the link.
 */
function doPost(e) {
  var payload = JSON.parse(e.postData.contents || '{}');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (payload.action === 'addPurchase') return json(addPurchase_(ss, payload));
  if (payload.action === 'addBottle') return json(addBottle_(ss, payload));
  return json({ ok:false, error:'Unknown action' });
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function headerMap_(sheet) {
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function(h,i){ if (h) map[String(h).toLowerCase().replace(/[^a-z0-9]/g,'')] = i+1; });
  return map;
}
function setByHeader_(sheet, rowNumber, map, header, value) {
  var key = String(header).toLowerCase().replace(/[^a-z0-9]/g,'');
  if (map[key]) sheet.getRange(rowNumber, map[key]).setValue(value);
}
function findRowById_(sheet, id) {
  var map = headerMap_(sheet);
  var idCol = map['id'];
  if (!idCol) return 0;
  var values = sheet.getRange(2, idCol, Math.max(sheet.getLastRow()-1,1), 1).getValues();
  for (var i=0;i<values.length;i++) if (String(values[i][0]) === String(id)) return i+2;
  return 0;
}
function addPurchase_(ss, payload) {
  var p = payload.purchase || {};
  var items = payload.items || [];
  var purchases = ss.getSheetByName('Purchases');
  var itemSheet = ss.getSheetByName('Purchase Items');
  var catalogue = ss.getSheetByName('Catalogue');
  purchases.appendRow([p.purchaseId, p.purchaseDate, p.seller, p.source, p.totalPaid, p.bottlesCount, '', p.notes]);
  items.forEach(function(item){
    var fragranceId = item.fragranceId || '';
    if (item.mode === 'new') {
      fragranceId = addCatalogueRowFromPurchase_(catalogue, item, p);
      item.fragranceId = fragranceId;
    }
    itemSheet.appendRow([p.purchaseId, fragranceId, item.fragrance, item.bottleSize, item.fullness + '% full', item.allocatedCost, item.currentMl, item.mode === 'new' ? 'New bottle from Command Centre' : 'Restock from Command Centre']);
    var row = findRowById_(catalogue, fragranceId);
    if (row) {
      var map = headerMap_(catalogue);
      setByHeader_(catalogue, row, map, 'Purchase Date', p.purchaseDate);
      setByHeader_(catalogue, row, map, 'Purchase Price', item.allocatedCost);
      setByHeader_(catalogue, row, map, 'Bottle Size (mL)', item.bottleSize);
      setByHeader_(catalogue, row, map, 'Current mL', item.currentMl);
      setByHeader_(catalogue, row, map, 'Condition', item.fullness + '% full');
      setByHeader_(catalogue, row, map, 'Purchase Source', p.source);
      setByHeader_(catalogue, row, map, 'Seller', p.seller);
      setByHeader_(catalogue, row, map, 'Last Updated', new Date());
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
  var idCol = map['id'];
  var max = 0;
  if (idCol && catalogue.getLastRow() > 1) {
    var values = catalogue.getRange(2, idCol, catalogue.getLastRow()-1, 1).getValues();
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
      case 'Featured Start': return '';
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
      case 'Last Updated': return new Date();
      default: return '';
    }
  });
  catalogue.appendRow(values);
  return nextId;
}

function addBottle_(ss, payload) {
  var r = payload.row || {};
  var catalogue = ss.getSheetByName('Catalogue');
  var headers = catalogue.getRange(1,1,1,catalogue.getLastColumn()).getValues()[0];
  var nextId = 'FRG' + Utilities.formatString('%03d', catalogue.getLastRow());
  var values = headers.map(function(h){
    switch(String(h)) {
      case 'ID': return nextId;
      case 'House': return r.house;
      case 'Collection': return r.collection;
      case 'Fragrance': return r.fragrance;
      case 'Scent Style': return r.scentStyle;
      case 'Gender': return 'Men / Unisex';
      case 'Description': return r.description;
      case '3mL': return r.p3;
      case '5mL': return r.p5;
      case '10mL': return r.p10;
      case 'Added Date': return r.addedDate;
      case 'Featured': return 'FALSE';
      case 'Staff Pick': return 'FALSE';
      case 'Fragrantica': return r.fragrantica;
      case 'Purchase Date': return r.purchaseDate;
      case 'Purchase Price': return r.purchasePrice;
      case 'Bottle Size (mL)': return r.bottleSize;
      case 'Current mL': return r.currentMl;
      case 'Condition': return 'New';
      case 'Last Updated': return new Date();
      default: return '';
    }
  });
  catalogue.appendRow(values);
  return { ok:true, action:'addBottle', id:nextId, fragrance:r.fragrance };
}

/**
 * V4.0A.4 read endpoint. Lets the website read the Settings tab live without relying on a separately published Settings CSV.
 * URL example: <web-app-url>?action=settings
 */
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (action === 'settings') return json({ ok:true, settings: getSettings_(ss) });
  return json({ ok:false, error:'Unknown action' });
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
    websiteurl:'siteUrl',
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
    footertext:'footerText'
  };
  return map[k] || '';
}

function castSetting_(key, value) {
  var numeric = {expressPostage:true,newArrivalDays:true,weeklyDiscountPercent:true,weeklyDiscountDays:true,packDiscountPercent:true};
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
