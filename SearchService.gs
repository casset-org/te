/**
 * @file SearchService.gs
 * @description Lógica de backend para a funcionalidade de busca.
 */

const SearchService = {
  /**
   * Executa a busca em todas as abas da planilha.
   * @param {object} options Opções de busca (termo, caseSensitive, etc.).
   * @returns {{success: boolean, data?: object[], message?: string}}
   */
  performSearch: function(options) {
    try {
      const { termo, caseSensitive, wholeWords, isRegex } = options;
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const allSheets = ss.getSheets();
      const results = [];
      const sheetsToIgnore = CONFIG.SHEETS_TO_IGNORE_IN_SEARCH || [];

      const searchTerm = caseSensitive ? termo : termo.toLowerCase();
      let regex;
      if (isRegex) {
        try {
          regex = new RegExp(searchTerm, caseSensitive ? '' : 'i');
        } catch (e) {
          return { success: false, message: 'Expressão regular inválida.' };
        }
      }

      allSheets.forEach(sheet => {
        const sheetName = sheet.getName();
        if (sheetsToIgnore.includes(sheetName)) return;

        const data = sheet.getDataRange().getValues();
        data.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            if (cell === null || cell === '') return;
            let cellValue = String(cell);
            let cellSearchValue = caseSensitive ? cellValue : cellValue.toLowerCase();

            let match = false;
            if (isRegex) {
              match = regex.test(cellValue);
            } else if (wholeWords) {
              const boundary = '\\b';
              match = new RegExp(boundary + searchTerm + boundary, caseSensitive ? '' : 'i').test(cellValue);
            } else {
              match = cellSearchValue.includes(searchTerm);
            }

            if (match) {
              results.push({
                aba: sheetName,
                celula: sheet.getRange(rowIndex + 1, colIndex + 1).getA1Notation(),
                valorHighlighted: this._highlightTerm(cellValue, termo, isRegex)
              });
            }
          });
        });
      });

      return { success: true, data: results };
    } catch (e) {
      LoggerService.logEvent('SearchService', LoggerService.LEVELS.ERROR, 'Erro ao realizar busca.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno durante a busca.' };
    }
  },

  /**
   * @private
   * Destaca o termo encontrado no valor da célula.
   */
  _highlightTerm: function(text, term, isRegex) {
    const safeText = text.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const flags = isRegex ? 'gi' : 'gi'; // Always global, case-insensitivity for replacement
    const regex = new RegExp(isRegex ? term : term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    return safeText.replace(regex, (match) => `<span class="highlight">${match}</span>`);
  },

  /**
   * Ativa a célula correspondente na planilha.
   * @param {string} sheetName O nome da aba.
   * @param {string} cellA1 A notação A1 da célula.
   */
  navegarParaCelula: function(sheetName, cellA1) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      ss.setActiveSheet(sheet);
      sheet.setActiveRange(sheet.getRange(cellA1));
    }
  }
};
