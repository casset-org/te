/**
 * @file LoggerService.integrationtest.gs
 * @description Testes de integração para o LoggerService.
 */

const LoggerServiceIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,
  _logsSheet: null,
  _mockUser: { email: 'test.user@example.com' },

  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;
    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);
    this._logsSheet = this._ss.getSheetByName(CONFIG.SHEETS.LOGS);
    if (!this._logsSheet) {
        throw new Error(`Aba de logs "${CONFIG.SHEETS.LOGS}" não encontrada.`);
    }
    this._logsSheet.clearContents();
    if (CONFIG.HEADERS.LOGS && CONFIG.HEADERS.LOGS.length > 0) {
        this._logsSheet.getRange(1, 1, 1, CONFIG.HEADERS.LOGS.length).setValues([CONFIG.HEADERS.LOGS]);
    }
    SpreadsheetApp.flush();
  },

  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: logEvent INFO with details': function() {
    const service = 'TestService';
    const message = 'Operação de teste de INFO concluída.';
    const details = { transactionId: 12345, status: 'OK' };

    LoggerService.logEvent(service, LoggerService.LEVELS.INFO, message, details, this._mockUser);

    const lastRow = this._logsSheet.getLastRow();
    if (lastRow < 2) throw new Error('Log não foi adicionado.');

    const data = this._logsSheet.getRange(lastRow, 1, 1, 6).getValues()[0];
    if (data[1] !== 'INFO') throw new Error(`Nível incorreto: ${data[1]}`);
    if (data[2] !== service) throw new Error(`Serviço incorreto: ${data[2]}`);
    if (data[3] !== message) throw new Error(`Mensagem incorreta: ${data[3]}`);
    if (data[4] !== JSON.stringify(details)) throw new Error(`Detalhes incorretos: ${data[4]}`);
    if (data[5] !== this._mockUser.email) throw new Error(`Email do usuário incorreto: ${data[5]}`);
  },

  'test: logEvent ERROR': function() {
    const service = 'CriticalService';
    const message = 'Falha na operação crítica.';
    LoggerService.logEvent(service, LoggerService.LEVELS.ERROR, message, {}, this._mockUser);
    const level = this._logsSheet.getRange(this._logsSheet.getLastRow(), 2).getValue();
    if (level !== 'ERROR') throw new Error(`Nível incorreto: ${level}`);
  },

  'test: logEvent WARN': function() {
    LoggerService.logEvent('WarningService', LoggerService.LEVELS.WARN, 'Aviso de teste.', {}, this._mockUser);
    const level = this._logsSheet.getRange(this._logsSheet.getLastRow(), 2).getValue();
    if (level !== 'WARN') throw new Error(`Nível incorreto: ${level}`);
  },

  'test: logEvent without details': function() {
    LoggerService.logEvent('SimpleService', LoggerService.LEVELS.INFO, 'Mensagem simples.', undefined, this._mockUser);
    const detailsCell = this._logsSheet.getRange(this._logsSheet.getLastRow(), 5).getValue();
    if (detailsCell !== '{}') throw new Error(`Detalhes deveriam ser '{}', mas foi: ${detailsCell}`);
  },
};

function runLoggerServiceIntegrationTests() {
  TestRunner.run('Serviço de Logging (LoggerService.gs)', LoggerServiceIntegrationTestSuite);
}
