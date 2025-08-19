/**
 * @file DataConsistency.integrationtest.gs
 * @description Testes de integração para validar a aderência dos dados da planilha
 * às regras de negócio e heurísticas do SIG-TE.
 * ESTES TESTES MODIFICAM / VALIDAM DADOS DIRETAMENTE NA PLANILHA DE TESTE.
 */

const DataConsistencyIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,

  setup: function () {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;
    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);
    SpreadsheetApp.flush();
  },

  teardown: function () {
    CONFIG.SPREADSHEET_ID = this._originalConfigId;
  },

  /**
   * Testes de Rotas
   */
  'test: todas as rotas referenciam veículos existentes': function () {
    const rotas = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
    const veiculos = SheetService.getAllData(CONFIG.SHEETS.VEICULOS).map(v => v.ID_Onibus);

    rotas.forEach(rota => {
      if (!veiculos.includes(rota.ID_Onibus)) {
        throw new Error(`Rota ${rota.ID_Rota} referencia veículo inexistente: ${rota.ID_Onibus}`);
      }
    });
  },

  'test: capacidade da rota não excede capacidade do veículo': function () {
    const rotas = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
    rotas.forEach(rota => {
      const veiculo = SheetService.findRow(CONFIG.SHEETS.VEICULOS, 'ID_Onibus', rota.ID_Onibus);
      if (veiculo && rota.Vagas_Totais_no_Veiculo > veiculo.rowData.Capacidade_Total) {
        throw new Error(`Rota ${rota.ID_Rota} excede capacidade do veículo ${rota.ID_Onibus}`);
      }
    });
  },

  /**
   * Testes de Incidentes
   */
  'test: incidentes possuem data válida e não futura': function () {
    const incidentes = SheetService.getAllData(CONFIG.SHEETS.INCIDENTES);
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    incidentes.forEach(inc => {
      const data = new Date(inc.Data_Incidente);
      if (isNaN(data.getTime())) {
        throw new Error(`Incidente inválido: Data não reconhecida (${inc.Data_Incidente})`);
      }
      if (data > hoje) {
        throw new Error(`Incidente com data futura: ${inc.Data_Incidente}`);
      }
    });
  },

  'test: incidentes possuem tipo permitido': function () {
    const incidentes = SheetService.getAllData(CONFIG.SHEETS.INCIDENTES);
    incidentes.forEach(inc => {
      if (!CONFIG.VALIDATION.ALLOWED_VALUES.TIPO_INCIDENTE.includes(inc.Tipo_Incidente.toUpperCase())) {
        throw new Error(`Tipo de incidente inválido: ${inc.Tipo_Incidente}`);
      }
    });
  },

  /**
   * Testes de Escolas
   */
  'test: todas as rotas referenciam escolas cadastradas': function () {
    const rotas = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
    const escolas = SheetService.getAllData(CONFIG.SHEETS.ESCOLAS).map(e => e.Nome_Escola);

    rotas.forEach(rota => {
      if (!escolas.includes(rota.Nome_Escola)) {
        throw new Error(`Rota ${rota.ID_Rota} referencia escola inexistente: ${rota.Nome_Escola}`);
      }
    });
  },

  /**
   * Testes de Veículos
   */
  'test: veículos possuem placa válida': function () {
    const veiculos = SheetService.getAllData(CONFIG.SHEETS.VEICULOS);
    const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

    veiculos.forEach(v => {
      if (!placaRegex.test(v.Placa)) {
        throw new Error(`Placa inválida no veículo ${v.ID_Onibus}: ${v.Placa}`);
      }
    });
  },

  'test: capacidade de veículos é positiva': function () {
    const veiculos = SheetService.getAllData(CONFIG.SHEETS.VEICULOS);
    veiculos.forEach(v => {
      if (!v.Capacidade_Total || v.Capacidade_Total <= 0) {
        throw new Error(`Capacidade inválida para veículo ${v.ID_Onibus}: ${v.Capacidade_Total}`);
      }
    });
  },

  'test: veiculos possuem ID_Onibus único': function () {
    const veiculos = SheetService.getAllData(CONFIG.SHEETS.VEICULOS);
    const ids = new Set();
    veiculos.forEach(v => {
      if (ids.has(v.ID_Onibus)) {
        throw new Error(`Veículo com ID_Onibus duplicado encontrado: ${v.ID_Onibus}`);
      }
      ids.add(v.ID_Onibus);
    });
  }
};

/**
 * Ponto de entrada para executar os testes de consistência de dados.
 */
function runDataConsistencyIntegrationTests() {
  TestRunner.run('Testes de Consistência de Dados (DataConsistency.integrationtest.gs)', DataConsistencyIntegrationTestSuite);
}

