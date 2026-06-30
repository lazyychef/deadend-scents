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
    itemSheet.appendRow([p.purchaseId, item.fragranceId, item.fragrance, item.bottleSize, item.fullness + '% full', item.allocatedCost, item.currentMl, 'Added from Command Centre']);
    var row = findRowById_(catalogue, item.fragranceId);
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
