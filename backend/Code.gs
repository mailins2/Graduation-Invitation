const RESPONSE_SPREADSHEET_ID = '1tjS20Z6K0wdAyg9NXeOe0U36LokRhilWbASB37b-aIs';
const RESPONSE_SHEET_GID = 1611899745;

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const payload = readResponses_();
  const json = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const callback = params.callback || '';

  if (callback) {
    if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
      return jsonOutput_({ ok: false, error: 'Invalid callback.' });
    }

    return ContentService.createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function readResponses_() {
  const spreadsheet = SpreadsheetApp.openById(RESPONSE_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheets()
    .find((candidate) => candidate.getSheetId() === RESPONSE_SHEET_GID);

  if (!sheet) throw new Error('The linked Google Form response tab was not found.');
  if (sheet.getLastRow() < 2) return { ok: true, totalResponses: 0, wishes: [] };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((value) => String(value).trim());
  const nameColumn = headers.indexOf('Tên của bạn');
  const messageColumn = headers.indexOf('Lời chúc');

  if (nameColumn < 0 || messageColumn < 0) {
    throw new Error('The response sheet must contain "Tên của bạn" and "Lời chúc" columns.');
  }

  const responses = values.slice(1).filter((row) => row.some((value) => String(value).trim()));
  const wishes = responses
    .filter((row) => String(row[messageColumn] || '').trim())
    .map((row) => ({
      name: String(row[nameColumn] || '').trim(),
      message: String(row[messageColumn] || '').trim(),
      timestamp: row[0] instanceof Date ? row[0].getTime() : new Date(row[0]).getTime()
    }))
    .reverse();

  return { ok: true, totalResponses: responses.length, wishes };
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
