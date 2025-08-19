/**
 * @file IncidentRegistration.integrationtest.gs
 * @description Testes de integração para o registro de incidentes.
 */

const IncidentRegistrationIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,
  _incidentesSheet: null,

  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;
    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

    this._incidentesSheet = this._ss.getSheetByName(CONFIG.SHEETS.INCIDENTES);
    if (!this._incidentesSheet) {
      this._incidentesSheet = this._ss.insertSheet(CONFIG.SHEETS.INCIDENTES);
    }
    this._incidentesSheet.clearContents();
    if (CONFIG.HEADERS.INCIDENTES && CONFIG.HEADERS.INCIDENTES.length > 0) {
      this._incidentesSheet.getRange(1, 1, 1, CONFIG.HEADERS.INCIDENTES.length).setValues([CONFIG.HEADERS.INCIDENTES]);
    }
    SpreadsheetApp.flush();
  },

  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: registerIncident deve registrar um incidente corretamente': function() {
    const date = new Date('2025-08-01'); // Pass a Date object
    const type = 'Delay';
    const description = 'Ônibus atrasou 10 minutos';
    const involved = 'Aluno Teste';

    registerIncident(date, type, description, involved);

    const lastRow = this._incidentesSheet.getLastRow();
    if (lastRow < 2) throw new Error('Incidente não foi registrado.');

    const row = this._incidentesSheet.getRange(lastRow, 1, 1, CONFIG.HEADERS.INCIDENTES.length).getValues()[0]; // Read all columns

    // Get headers from CONFIG for correct indexing
    const headers = CONFIG.HEADERS.INCIDENTES;
    const dataIncidenteIndex = headers.indexOf('Data_Incidente');
    const tipoIncidenteIndex = headers.indexOf('Tipo_Incidente');
    const descricaoIndex = headers.indexOf('Descricao');
    const envolvidosIndex = headers.indexOf('Envolvidos');

    // Compare Data_Incidente
    const sheetDate = new Date(row[dataIncidenteIndex]);
    const expectedDate = new Date(date);
    if (sheetDate.toDateString() !== expectedDate.toDateString()) throw new Error(`Data incorreta: ${row[dataIncidenteIndex]}`);

    // Compare Tipo_Incidente
    if (row[tipoIncidenteIndex] !== type) throw new Error(`Tipo incorreto: ${row[tipoIncidenteIndex]}`);

    // Compare Descricao
    if (row[descricaoIndex] !== description) throw new Error(`Descrição incorreta: ${row[descricaoIndex]}`);

    // Compare Envolvidos
    if (row[envolvidosIndex] !== involved) throw new Error(`Envolvidos incorreto: ${row[envolvidosIndex]}`);
  },

  'test: registerIncident deve permitir múltiplos registros': function() {
    registerIncident(new Date('2025-08-02'), 'Absence', 'Aluno faltou', 'Aluno Teste 2');
    registerIncident(new Date('2025-08-03'), 'Incident', 'Pequeno acidente', 'Aluno Teste 3');
    const totalRows = this._incidentesSheet.getLastRow();
    if (totalRows !== 3) throw new Error(`Esperado 3 incidentes, obtido ${totalRows - 1}`);
  },

  /**
   * Testa se todos os incidentes registrados aderem ao cabeçalho da aba de incidentes.
   */
  'test: incidentes aderem ao cabeçalho': function() {
    const sheet = this._incidentesSheet;
    const headers = CONFIG.HEADERS.INCIDENTES;
    const rowCount = sheet.getLastRow();
    if (rowCount < 2) return;
    const dataRows = sheet.getRange(2, 1, rowCount - 1, headers.length).getValues();
    dataRows.forEach((row, idx) => {
      if (row.length !== headers.length) {
        throw new Error(`Linha ${idx + 2} não adere ao cabeçalho. Esperado ${headers.length} colunas, obtido ${row.length}`);
      }
    });
  },
};

function runIncidentRegistrationIntegrationTests() {
  TestRunner.run('Registro de Incidentes (IncidentRegistration.gs)', IncidentRegistrationIntegrationTestSuite);
}
