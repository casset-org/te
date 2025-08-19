/**
 * @file MonitorService.integrationtest.gs
 * @description Testes de integração para o MonitorService.
 * ESTES TESTES MODIFICAM DADOS DIRETAMENTE NA PLANILHA DE TESTE.
 */

const MonitorServiceIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,
  _monitoresSheet: null,
  _rotasSheet: null,

  /**
   * Prepara a planilha de teste antes de cada teste.
   * Limpa as abas Monitores e Rotas e insere dados base necessários.
   */
  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }

    // Redireciona o CONFIG para usar a planilha de teste
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;

    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

    // Limpa e prepara a aba Monitores
    this._monitoresSheet = this._ss.getSheetByName(CONFIG.SHEETS.MONITORES);
    this._monitoresSheet.clearContents();
    this._monitoresSheet.getRange(1, 1, 1, CONFIG.HEADERS.MONITORES.length).setValues([CONFIG.HEADERS.MONITORES]);

    // Limpa e prepara a aba Rotas
    this._rotasSheet = this._ss.getSheetByName(CONFIG.SHEETS.ROTAS);
    this._rotasSheet.clearContents();
    this._rotasSheet.getRange(1, 1, 1, CONFIG.HEADERS.ROTAS.length).setValues([CONFIG.HEADERS.ROTAS]);

    SpreadsheetApp.flush();
  },

  /**
   * Restaura a configuração original após a execução dos testes.
   */
  teardown: function() {
    CONFIG.SPREADSHEET_ID = this._originalConfigId;
  },

  'test: registerOrUpdate deve cadastrar um novo monitor com sucesso': function() {
    // Cenário: Uma rota válida deve existir para o cadastro ser bem-sucedido.
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-TESTE-01' });

    const monitorData = {
      'ID_Monitor': 'MON001',
      'Nome_Completo': 'Carlos Teste',
      'Celular_Monitor': '61987654321',
      'Rota_Atribuida': 'R-TESTE-01'
    };
    const result = MonitorService.registerOrUpdate(monitorData);

    if (!result.success) {
      throw new Error(`Cadastro falhou inesperadamente: ${result.message}`);
    }

    const found = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'MON001');
    if (!found || found.rowData.Nome_Completo !== 'Carlos Teste') {
      throw new Error('Monitor não foi encontrado na planilha ou os dados estão incorretos após o cadastro.');
    }
  },

  'test: registerOrUpdate deve impedir cadastro de monitor com celular duplicado': function() {
    // Cenário: Uma rota e um monitor já existem com um celular específico.
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-TESTE-01' });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON001', 'Celular_Monitor': '61987654321' });

    const monitorDuplicado = {
      'ID_Monitor': 'MON002', // ID diferente
      'Nome_Completo': 'Monitor Duplicado',
      'Celular_Monitor': '61987654321', // Celular igual
      'Rota_Atribuida': 'R-TESTE-01'
    };
    const result = MonitorService.registerOrUpdate(monitorDuplicado);

    if (result.success) {
      throw new Error('O sistema permitiu o cadastro de um monitor com celular duplicado.');
    }
    if (!result.message.includes('já está cadastrado')) {
      throw new Error(`Mensagem de erro incorreta para celular duplicado. Recebido: "${result.message}"`);
    }
  },

  'test: registerOrUpdate deve impedir cadastro em rota inexistente': function() {
    const monitorData = {
      'ID_Monitor': 'MON001',
      'Nome_Completo': 'Monitor Sem Rota',
      'Celular_Monitor': '61987654321',
      'Rota_Atribuida': 'ROTA_QUE_NAO_EXISTE'
    };
    const result = MonitorService.registerOrUpdate(monitorData);

    if (result.success) {
      throw new Error('O sistema permitiu o cadastro de um monitor em uma rota inexistente.');
    }
    if (!result.message.includes('não foi encontrada')) {
      throw new Error(`Mensagem de erro incorreta para rota inexistente. Recebido: "${result.message}"`);
    }
  },

  'test: registerOrUpdate deve atualizar um monitor existente com sucesso': function() {
    // Cenário: Uma rota e um monitor já existem.
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-TESTE-01' });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON001', 'Nome_Completo': 'Nome Antigo', 'Celular_Monitor': '61987654321', 'Rota_Atribuida': 'R-TESTE-01' });

    const dadosAtualizados = { 'ID_Monitor': 'MON001', 'Nome_Completo': 'Nome Atualizado', 'Celular_Monitor': '61987654321', 'Rota_Atribuida': 'R-TESTE-01' };
    const result = MonitorService.registerOrUpdate(dadosAtualizados);

    if (!result.success) {
      throw new Error(`Atualização falhou inesperadamente: ${result.message}`);
    }

    const found = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'MON001');
    if (this._monitoresSheet.getLastRow() !== 2) {
      throw new Error('Uma nova linha foi adicionada em vez de atualizar a existente.');
    }
    if (found.rowData.Nome_Completo !== 'Nome Atualizado') {
      throw new Error('O nome do monitor não foi atualizado corretamente.');
    }
  },

  'test: registerOrUpdate deve impedir atualização de celular para um número já em uso por OUTRO monitor': function() {
    // Cenário: Duas rotas e dois monitores.
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-TESTE-01' });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON001', 'Celular_Monitor': '11111111111', 'Rota_Atribuida': 'R-TESTE-01' });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON002', 'Celular_Monitor': '22222222222', 'Rota_Atribuida': 'R-TESTE-01' });

    const dadosAtualizados = {
      'ID_Monitor': 'MON001', // Atualizando o MON001
      'Celular_Monitor': '22222222222', // Tentando usar o celular do MON002
      'Rota_Atribuida': 'R-TESTE-01'
    };
    const result = MonitorService.registerOrUpdate(dadosAtualizados);

    if (result.success) {
      throw new Error('O sistema permitiu a atualização para um celular que já está em uso por outro monitor.');
    }
    if (!result.message.includes('já está em uso por outro monitor')) {
      throw new Error(`Mensagem de erro incorreta para atualização de celular duplicado. Recebido: "${result.message}"`);
    }
  },

  /**
   * Testa se todos os monitores registrados aderem ao cabeçalho da aba de monitores.
   */
  'test: monitores aderem ao cabeçalho': function() {
    const sheet = this._monitoresSheet;
    const headers = CONFIG.HEADERS.MONITORES;
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
function runMonitorServiceIntegrationTests() {
  TestRunner.run('Serviço de Monitores (MonitorService.gs)', MonitorServiceIntegrationTestSuite);
}
