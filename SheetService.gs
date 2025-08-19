/**
 * @file SheetService.gs
 * @description Encapsula todas as operações de leitura e escrita no Google Sheets.
 */

const SheetService = {
  _getSheet: function(sheetName, options = {}) {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      if (options.allowMissing) return null;
      throw new Error(`A aba "${sheetName}" não foi encontrada.`);
    }
    return sheet;
  },

  appendRow: function(sheetName, rowData) {
    const sheet = this._getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => rowData[header] !== undefined ? rowData[header] : '');
    sheet.appendRow(newRow);
    return { success: true };
  },

  findRow: function(sheetName, columnName, value) {
    const sheet = this._getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const columnIndex = headers.indexOf(columnName);
    if (columnIndex === -1) throw new Error(`A coluna "${columnName}" não foi encontrada na aba "${sheetName}".`);

    for (let i = 1; i < data.length; i++) {
      if (data[i][columnIndex] == value) {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = data[i][index];
        });
        return { rowData: rowData, rowIndex: i + 1 };
      }
    }
    return null;
  },

  updateRow: function(sheetName, rowIndex, newRowData) {
    const sheet = this._getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const range = sheet.getRange(rowIndex, 1, 1, headers.length);
    const currentValues = range.getValues()[0];
    const updatedValues = headers.map((header, index) => newRowData[header] !== undefined ? newRowData[header] : currentValues[index]);
    range.setValues([updatedValues]);
    return { success: true };
  },

  deleteRow: function(sheetName, rowIndex) {
    this._getSheet(sheetName).deleteRow(rowIndex);
    return { success: true };
  },

  getAllData: function(sheetName) {
    const sheet = this._getSheet(sheetName, { allowMissing: true });
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return [];
    const headers = values.shift();
    return values.map((row, index) => {
      const rowData = {};
      headers.forEach((header, i) => {
        rowData[header] = row[i];
      });
      rowData.rowIndex = index + 2; // Adiciona o número da linha (cabeçalho é 1, dados começam em 2)
      return rowData;
    });
  },

  /**
   * Verifica se todas as abas e cabeçalhos definidos em CONFIG existem e estão corretos na planilha.
   * Retorna um relatório de inconsistências encontradas.
   */
  verifySystemDataConsistency: function() {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetNames = ss.getSheets().map(s => s.getName());
    const report = {
      missingSheets: [],
      missingHeaders: [],
      headerMismatches: [],
      success: true
    };

    Object.entries(CONFIG.HEADERS).forEach(([sheetKey, expectedHeaders]) => {
      const sheetName = CONFIG.SHEETS[sheetKey] || sheetKey;
      if (!sheetNames.includes(sheetName)) {
        report.missingSheets.push(sheetName);
        report.success = false;
        return;
      }
      const sheet = ss.getSheetByName(sheetName);
      const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      // Check for missing headers
      expectedHeaders.forEach(h => {
        if (!actualHeaders.includes(h)) {
          report.missingHeaders.push({ sheet: sheetName, header: h });
          report.success = false;
        }
      });
      // Check for header mismatch (order or extra headers)
      if (actualHeaders.length !== expectedHeaders.length ||
          actualHeaders.some((h, i) => h !== expectedHeaders[i])) {
        report.headerMismatches.push({
          sheet: sheetName,
          expected: expectedHeaders,
          actual: actualHeaders
        });
        report.success = false;
      }
    });

    if (!report.success) {
      Logger.log('Inconsistências encontradas na estrutura dos dados do SIG-TE: ' + JSON.stringify(report, null, 2));
    }
    return report;
  },
};
