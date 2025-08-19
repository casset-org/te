/**
 * @file VehicleRegistration.integrationtest.gs
 * @description Testes de integração para o VehicleRegistration.
 * ESTES TESTES MODIFICAM DADOS DIRETAMENTE NA PLANILHA DE TESTE.
 */

const VehicleRegistrationIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,

  /**
   * Prepara a planilha de teste com um cenário limpo e dados controlados antes de cada teste.
   */
  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }

    // Redireciona o CONFIG para usar a planilha de teste durante a execução do teste
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;

    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

    // Limpa e prepara a aba de veículos
    const sheetName = CONFIG.SHEETS.VEICULOS;
    let sheet = this._ss.getSheetByName(sheetName);
    if (!sheet) {
      // Cria a aba se não existir
      sheet = this._ss.insertSheet(sheetName);
    }
    sheet.clearContents();
    // Headers ajustados para refletir o que registerVehicle realmente insere
    const headers = ['ID_Onibus', 'Placa', 'Modelo', 'Capacidade_Total'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    SpreadsheetApp.flush(); // Garante que todas as alterações sejam aplicadas antes de prosseguir
  },

  /**
   * Restaura a configuração original após cada teste.
   */
  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: registerVehicle deve registrar um novo veículo corretamente': function() {
    const sheet = this._ss.getSheetByName(CONFIG.SHEETS.VEICULOS);
    const initialRowCount = sheet.getLastRow();

    const testPlate = 'ABC1D23';
    const testModel = 'Fiat Uno';
    const testCapacity = 20;

    // Chama a função a ser testada
    registerVehicle(testPlate, testModel, testCapacity);

    const finalRowCount = sheet.getLastRow();
    const lastRowData = sheet.getRange(finalRowCount, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Verifica se uma nova linha foi adicionada
    if (finalRowCount !== initialRowCount + 1) {
      throw new Error(`Esperava-se que o número de linhas aumentasse em 1. Linhas iniciais: ${initialRowCount}, Linhas finais: ${finalRowCount}`);
    }

    // Verifica os dados da nova linha
    // lastRowData[0] é o ID_Onibus, então verificamos os outros campos
    if (lastRowData[1] !== testPlate) {
      throw new Error(`Placa incorreta. Esperado: ${testPlate}, Obtido: ${lastRowData[1]}`);
    }
    if (lastRowData[2] !== testModel) {
      throw new Error(`Modelo incorreto. Esperado: ${testModel}, Obtido: ${lastRowData[2]}`);
    }
    if (lastRowData[3] !== testCapacity) {
      throw new Error(`Capacidade incorreta. Esperado: ${testCapacity}, Obtido: ${lastRowData[3]}`);
    }
  },

  'test: veículos aderem ao cabeçalho': function() {
    const sheet = this._ss.getSheetByName(CONFIG.SHEETS.VEICULOS);
    const headers = ['ID_Onibus', 'Placa', 'Modelo', 'Capacidade_Total'];
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

/**
 * Ponto de entrada para executar os testes de integração deste módulo.
 */
function runVehicleRegistrationIntegrationTests() {
  TestRunner.run('Serviço de Registro de Veículos (VehicleRegistration.gs)', VehicleRegistrationIntegrationTestSuite);
}
