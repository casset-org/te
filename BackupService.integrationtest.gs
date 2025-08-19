/**
 * @file BackupService.integrationtest.gs
 * @description Testes de integração para o BackupService.
 * ESTES TESTES MODIFICAM DADOS DIRETAMENTE NA PLANILHA DE TESTE.
 */

const BackupServiceIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,

  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;
    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

    // Cria e limpa a aba de teste
    let sheet = this._ss.getSheetByName('BACKUP_TEST');
    if (!sheet) {
      sheet = this._ss.insertSheet('BACKUP_TEST');
    }
    sheet.clearContents();
    sheet.getRange(1, 1, 1, 2).setValues([['Col1', 'Col2']]);
    sheet.appendRow(['A', 'B']);
    SpreadsheetApp.flush();
  },

  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: backupSheet deve criar um backup com sucesso': function() {
    const result = BackupService.backupSheet('BACKUP_TEST');
    if (!result.success) {
      throw new Error(`Backup falhou inesperadamente: ${result.message}`);
    }
    // Verifica se a aba de backup foi criada
    const backupSheetName = result.backupSheetName;
    const backupSheet = this._ss.getSheetByName(backupSheetName);
    if (!backupSheet) {
      throw new Error('A aba de backup não foi criada.');
    }
    const values = backupSheet.getRange(1, 1, 2, 2).getValues();
    if (values[1][0] !== 'A' || values[1][1] !== 'B') {
      throw new Error('Os dados do backup não correspondem aos dados originais.');
    }
  },

  'test: restoreSheet deve restaurar dados do backup com sucesso': function() {
    // Faz backup
    const backupResult = BackupService.backupSheet('BACKUP_TEST');
    if (!backupResult.success) throw new Error('Backup falhou.');
    // Altera dados originais
    const sheet = this._ss.getSheetByName('BACKUP_TEST');
    sheet.getRange(2, 1, 1, 2).setValues([['X', 'Y']]);
    // Restaura
    const restoreResult = BackupService.restoreSheet('BACKUP_TEST', backupResult.backupSheetName);
    if (!restoreResult.success) {
      throw new Error(`Restauração falhou: ${restoreResult.message}`);
    }
    const restoredValues = sheet.getRange(2, 1, 1, 2).getValues()[0];
    if (restoredValues[0] !== 'A' || restoredValues[1] !== 'B') {
      throw new Error('Os dados não foram restaurados corretamente.');
    }
  },

  'test: backupSheet deve falhar para aba inexistente': function() {
    const result = BackupService.backupSheet('INEXISTENTE');
    if (result.success) {
      throw new Error('Backup deveria falhar para aba inexistente.');
    }
    if (!result.message.toLowerCase().includes('não encontrada')) {
      throw new Error(`Mensagem de erro incorreta: ${result.message}`);
    }
  },

  if (!result.message.toLowerCase().includes('não encontrada')) {
      throw new Error(`Mensagem de erro incorreta: ${result.message}`);
    }
  },

  'test: restoreSheet deve falhar para aba de destino inexistente': function() {
    const result = BackupService.restoreSheet('ABA_DESTINO_INEXISTENTE', 'BACKUP_TEST');
    if (result.success) {
      throw new Error('Restauração deveria falhar para aba de destino inexistente.');
    }
    if (!result.message.toLowerCase().includes('não encontrada')) {
      throw new Error(`Mensagem de erro incorreta: ${result.message}`);
    }
  },

  'test: createBackup deve criar um backup completo com sucesso': function() {
    const result = BackupService.createBackup();
    if (!result.success) {
      throw new Error(`createBackup falhou inesperadamente: ${result.message}`);
    }
    // Clean up the created backup file to avoid cluttering Drive
    if (result.backupKey) {
      try {
        DriveApp.getFileById(result.backupKey).setTrashed(true);
      } catch (e) {
        LoggerService.logEvent('BackupService', LoggerService.LEVELS.WARN, `Falha ao limpar arquivo de backup de teste: ${result.backupKey}. Erro: ${e.message}`);
      }
    }
  },

  'test: dados restaurados de backup aderem ao cabeçalho': function() {
    const sheet = this._ss.getSheetByName('BACKUP_TEST');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowCount = sheet.getLastRow();
    if (rowCount < 2) return;
    const dataRows = sheet.getRange(2, 1, rowCount - 1, headers.length).getValues();
    dataRows.forEach((row, idx) => {
      if (row.length !== headers.length) {
        throw new Error(`Linha ${idx + 2} não adere ao cabeçalho após restauração de backup. Esperado ${headers.length} colunas, obtido ${row.length}`);
      }
    });
  },
};

/**
 * Ponto de entrada para executar os testes de integração deste módulo.
 */
function runBackupServiceIntegrationTests() {
  TestRunner.run('Serviço de Backup (BackupService.gs)', BackupServiceIntegrationTestSuite);
}
