/**
 * @file IntegrityService.integrationtest.gs
 * @description Testes de integração para o IntegrityService.
 */

const IntegrityServiceIntegrationTestSuite = {
  _originalConfigId: null,
  _ss: null,

  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;
    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

    // Prepara abas relevantes
    const sheetsToSetup = [
      { name: CONFIG.SHEETS.ALUNOS, headers: CONFIG.HEADERS.ALUNOS },
      { name: CONFIG.SHEETS.MONITORES, headers: CONFIG.HEADERS.MONITORES },
      { name: CONFIG.SHEETS.VEICULOS, headers: CONFIG.HEADERS.VEICULOS },
      { name: CONFIG.SHEETS.FREQUENCIA_IDA, headers: CONFIG.HEADERS.FREQUENCIA_IDA },
      { name: CONFIG.SHEETS.FREQUENCIA_VOLTA, headers: CONFIG.HEADERS.FREQUENCIA_VOLTA },
      { name: CONFIG.SHEETS.LOGS, headers: CONFIG.HEADERS.LOGS }
    ];
    sheetsToSetup.forEach(cfg => {
      let sheet = this._ss.getSheetByName(cfg.name);
      if (!sheet) sheet = this._ss.insertSheet(cfg.name);
      sheet.clearContents();
      sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
    });
    SpreadsheetApp.flush();
  },

  teardown: function() {
    if (this._originalConfigId) CONFIG.SPREADSHEET_ID = this._originalConfigId;
  },

  'test: bulkFormatCorrection deve corrigir números de celular': function() {
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON-BULK', 'Celular_Monitor': '(61) 9-9999-9999' });
    const result = IntegrityService.bulkFormatCorrection(CONFIG.SHEETS.MONITORES, 'Celular_Monitor', v => v.replace(/\D/g, ''));
    if (!result.success || result.total !== 1) throw new Error('bulkFormatCorrection falhou.');
    const found = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'MON-BULK');
    if (found.rowData.Celular_Monitor !== '61999999999') throw new Error('bulkFormatCorrection não normalizou corretamente.');
  },

  'test: archiveOldAttendanceRecords deve arquivar registros antigos': function() {
    // Adiciona registro antigo
    SheetService.appendRow(CONFIG.SHEETS.FREQUENCIA_IDA, { 'Data_Frequencia': '2020-01-01', 'ID_Rota': 'R-ARCH', 'ID_Monitor': 'MON-ARCH' });
    const result = IntegrityService.archiveOldAttendanceRecords(2);
    if (!result.success || result.total < 1) throw new Error('archiveOldAttendanceRecords falhou.');
    const archivedSheet = this._ss.getSheetByName(CONFIG.SHEETS.FREQUENCIA_HISTORICO || 'Frequencia_Historico');
    if (!archivedSheet || archivedSheet.getLastRow() < 2) throw new Error('Registro não foi arquivado.');
  },

  'test: optimizeSheet deve remover linhas/colunas vazias e ordenar': function() {
    const sheetName = CONFIG.SHEETS.ALUNOS;
    const sheet = this._ss.getSheetByName(sheetName);
    sheet.appendRow(['', '', '', '', '', '', '']);
    sheet.appendRow(['B002', 'Zé', '222', 'R002', '', '', '']);
    sheet.appendRow(['A001', 'Ana', '111', 'R001', '', '', '']);
    SpreadsheetApp.flush();
    const result = IntegrityService.optimizeSheet(sheetName, ['ID_Aluno']);
    if (!result.success || result.removedRows.total < 1) throw new Error('optimizeSheet não removeu linhas vazias.');
    const data = sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).getValues();
    if (data[0][0] !== 'A001') throw new Error('optimizeSheet não ordenou corretamente.');
  },

  'test: generateGeminiDuplicateReport retorna relatório de duplicatas': function() {
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'DUPL-01', 'CPF': '99999999999' });
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'DUPL-02', 'CPF': '99999999999' });
    const report = IntegrityService.generateGeminiDuplicateReport(CONFIG.SHEETS.ALUNOS, 'CPF');
    if (report.totalDuplicates < 2) throw new Error('generateGeminiDuplicateReport não identificou duplicatas.');
  },

  'test: checkBackupFolderUsage retorna uso de espaço e arquivos antigos': function() {
    // Este teste depende de ambiente real do Drive, pode ser apenas smoke test
    const result = IntegrityService.checkBackupFolderUsage();
    if (!result.success || typeof result.totalSizeMB !== 'number') throw new Error('checkBackupFolderUsage falhou.');
  },

  'test: auditAllSheetsData deve identificar erros de auditoria': function() {
    // Adiciona dado inválido
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'AUDIT-01', 'Celular_Monitor': '123' });
    const errors = IntegrityService.auditAllSheetsData();
    if (!Array.isArray(errors)) throw new Error('auditAllSheetsData não retornou array.');
  },

  'test: removeEmptyRows e removeEmptyColumns removem corretamente': function() {
    const sheetName = CONFIG.SHEETS.ALUNOS;
    const sheet = this._ss.getSheetByName(sheetName);
    sheet.appendRow(['', '', '', '', '', '', '']);
    sheet.getRange(2, 2, sheet.getLastRow()-1, 1).clearContent(); // Coluna 2 vazia
    SpreadsheetApp.flush();
    const rowsResult = IntegrityService.removeEmptyRows(sheetName);
    const colsResult = IntegrityService.removeEmptyColumns(sheetName);
    if (rowsResult.total < 1 || colsResult.total < 1) throw new Error('removeEmptyRows/Columns falhou.');
  }
};

function runIntegrityServiceIntegrationTests() {
  TestRunner.run('Serviço de Integridade (IntegrityService.gs)', IntegrityServiceIntegrationTestSuite);
}
