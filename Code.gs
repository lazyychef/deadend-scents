/**
 * DeadEnd Scents Admin V5.1 write-back endpoint.
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
    if (payload.action === 'addPurchase') return json_(addPurchase_(ss, payload));
    if (payload.action === 'addBottle') return json_(addBottle_(ss, payload));

    return json_({ ok:false, error:'Unknown action: ' + payload.action });
  } catch (err) {
    return json_({ ok:false, error:String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return json_({ ok:true, app:'DeadEnd Scents Admin V5.1', status:'ready' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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

  setByAnyHeader_(sheet, row, map, ['Current mL','Current Amount Left (mL)','Current Amount Left','Amount Left','Amount Left mL','Remaining mL'], fields['Current mL']);
  setByAnyHeader_(sheet, row, map, ['Status'], fields['Status']);
  setByAnyHeader_(sheet, row, map, ['3mL','3 mL','Price 3mL'], fields['3mL']);
  setByAnyHeader_(sheet, row, map, ['5mL','5 mL','Price 5mL'], fields['5mL']);
  setByAnyHeader_(sheet, row, map, ['10mL','10 mL','Price 10mL'], fields['10mL']);
  setByAnyHeader_(sheet, row, map, ['Bottle Size (mL)','Bottle Size','Size mL'], fields['Bottle Size (mL)']);
  setByAnyHeader_(sheet, row, map, ['Purchase Price','Purchase Cost','Cost'], fields['Purchase Price']);
  setByAnyHeader_(sheet, row, map, ['Normal RRP','RRP','Retail Price'], fields['Normal RRP']);
  setByAnyHeader_(sheet, row, map, ['Description','Short Description'], fields['Description']);
  setByAnyHeader_(sheet, row, map, ['Last Updated','Updated'], new Date());

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
      case 'Last Updated': return new Date();
      default: return '';
    }
  });
  catalogue.appendRow(values);
  return nextId;
}

function addBottle_(ss, payload) {
  var r = payload.row || {};
  var catalogue = catalogueSheet_(ss);
  var nextId = nextCatalogueId_(catalogue, r.collection);
  var headers = catalogue.getRange(1,1,1,catalogue.getLastColumn()).getValues()[0];
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
