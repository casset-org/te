/**
 * @file RouteService.integrationtest.gs
 * @description Testes de integração para o RouteService.
 * ESTES TESTES MODIFICAM DADOS DIRETAMENTE NA PLANILHA DE TESTE.
 */

const RouteServiceIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,
  _rotasSheet: null,

  /**
   * Prepara a planilha de teste antes de cada teste.
   * Limpa a aba Rotas e reinsere os cabeçalhos.
   */
  setup: function() {
    // ATENÇÃO: O ideal é ter um ID de planilha de teste SEPARADO.
    // A verificação original foi flexibilizada para permitir a execução,
    // mas o uso da planilha de produção para testes não é recomendado.
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }

    // Redireciona o CONFIG para usar a planilha de teste
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;

    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

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

  'test: registerOrUpdate deve cadastrar uma nova rota com sucesso': function() {
    const rotaData = {
      'ID_Rota': 'R-SUL-01',
      'Nome_Rota': 'Rota Teste Sul 01',
      'Nome_Escola': 'Escola Teste Sul',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 40,
      'Celular_Monitor': '11999999999'
    };
    const result = RouteService.registerOrUpdate(rotaData);

    if (!result.success) {
      throw new Error(`Cadastro de rota falhou inesperadamente: ${result.message}`);
    }

    const found = SheetService.findRow(CONFIG.SHEETS.ROTAS, 'ID_Rota', 'R-SUL-01');
    if (!found || found.rowData.Nome_Escola !== 'Escola Teste Sul') {
      throw new Error('Rota não foi encontrada na planilha ou os dados estão incorretos após o cadastro.');
    }
  },

  'test: registerOrUpdate deve ATUALIZAR uma rota se o ID já existir': function() {
    // Cenário: Uma rota já existe na planilha.
    const initialData = { 'ID_Rota': 'R-NORTE-02', 'Nome_Rota': 'Rota Teste Norte 02', 'Nome_Escola': 'Escola Antiga', 'Turno': 'Manhã', 'Vagas_Totais_no_Veiculo': 30, 'Celular_Monitor': '11988888888' };
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, initialData);

    const updatedData = { 'ID_Rota': 'R-NORTE-02', 'Nome_Rota': 'Rota Teste Norte 02 Atualizada', 'Nome_Escola': 'Escola Nova e Atualizada', 'Turno': 'Tarde', 'Vagas_Totais_no_Veiculo': 35, 'Celular_Monitor': '11977777777' };
    const result = RouteService.registerOrUpdate(updatedData);

    if (!result.success) {
      throw new Error(`Atualização de rota falhou inesperadamente: ${result.message}`);
    }

    const found = SheetService.findRow(CONFIG.SHEETS.ROTAS, 'ID_Rota', 'R-NORTE-02');
    if (this._rotasSheet.getLastRow() !== 2) {
      throw new Error('Uma nova linha foi adicionada em vez de atualizar a existente.');
    }
    if (found.rowData.Nome_Escola !== 'Escola Nova e Atualizada' || found.rowData.Turno !== 'Tarde' || found.rowData.Vagas_Totais_no_Veiculo !== 35) {
      throw new Error(`Os dados da rota não foram atualizados corretamente: ${JSON.stringify(found.rowData)}`);
    }
  },

  'test: registerOrUpdate deve falhar se o ID_Rota for nulo ou vazio': function() {
    const rotaDataComIdVazio = { 'ID_Rota': '  ', 'Nome_Escola': 'Escola Sem ID', 'Turno': 'Manhã', 'Vagas_Totais_no_Veiculo': 20 };
    const resultVazio = RouteService.registerOrUpdate(rotaDataComIdVazio);

    if (resultVazio.success) {
      throw new Error('O sistema permitiu o cadastro de uma rota com ID vazio.');
    }
    if (!resultVazio.message.includes('obrigatório')) {
      throw new Error(`Mensagem de erro incorreta para ID de rota ausente. Recebido: "${resultVazio.message}"`);
    }

    const rotaDataComIdNulo = { 'ID_Rota': null, 'Nome_Escola': 'Escola Sem ID', 'Turno': 'Manhã', 'Vagas_Totais_no_Veiculo': 20 };
    const resultNulo = RouteService.registerOrUpdate(rotaDataComIdNulo);
    if (resultNulo.success) {
      throw new Error('O sistema permitiu o cadastro de uma rota com ID nulo.');
    }
  },

  'test: _validateRouteData deve falhar se nenhum dia da semana for selecionado': function() {
    const rotaData = {
      'ID_Rota': 'R-DIA-01',
      'Nome_Rota': 'Rota Sem Dia',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': '',
      'Dias_da_Semana_2': '',
      'Dias_da_Semana_3': '',
      'Dias_da_Semana_4': '',
      'Dias_da_Semana_5': '',
      'Dias_da_Semana_6': '',
    };
    // Ensure vehicle and monitor exist for validation
    SheetService.appendRow(CONFIG.SHEETS.VEICULOS, { 'ID_Onibus': 'VEIC-001', 'Capacidade_Total': 50 });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON-001', 'Celular_Monitor': '11999999999' });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('Pelo menos um dia da semana deve ser selecionado.')) {
      throw new Error(`Validação de dia da semana falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se ID_Rota já existir para nova rota': function() {
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-EXISTE', 'Nome_Rota': 'Rota Existente' });
    const rotaData = {
      'ID_Rota': 'R-EXISTE',
      'Nome_Rota': 'Nova Rota',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': 'Segunda',
    };
    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('ID de Rota 'R-EXISTE' já existe.')) {
      throw new Error(`Validação de ID de rota existente falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se ID_Onibus não existir': function() {
    const rotaData = {
      'ID_Rota': 'R-VEIC-INEXIST',
      'Nome_Rota': 'Rota Teste',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-INEXISTENTE',
      'Dias_da_Semana_1': 'Segunda',
    };
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON-001', 'Celular_Monitor': '11999999999' });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('veículo com ID 'VEIC-INEXISTENTE' não foi encontrado.')) {
      throw new Error(`Validação de veículo inexistente falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se Celular_Monitor não existir': function() {
    const rotaData = {
      'ID_Rota': 'R-MON-INEXIST',
      'Nome_Rota': 'Rota Teste',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': 'Segunda',
    };
    SheetService.appendRow(CONFIG.SHEETS.VEICULOS, { 'ID_Onibus': 'VEIC-001', 'Capacidade_Total': 50 });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('monitor com celular '11999999999' não foi encontrado.')) {
      throw new Error(`Validação de monitor inexistente falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se Vagas_Totais_no_Veiculo for inválido': function() {
    const rotaData = {
      'ID_Rota': 'R-VAGAS-INVALID',
      'Nome_Rota': 'Rota Teste',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': -5,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': 'Segunda',
    };
    SheetService.appendRow(CONFIG.SHEETS.VEICULOS, { 'ID_Onibus': 'VEIC-001', 'Capacidade_Total': 50 });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON-001', 'Celular_Monitor': '11999999999' });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('capacidade máxima deve ser um número positivo.')) {
      throw new Error(`Validação de vagas inválidas falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se Link_Google_Maps for inválido': function() {
    const rotaData = {
      'ID_Rota': 'R-MAPS-INVALID',
      'Nome_Rota': 'Rota Teste',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': 'Segunda',
      'Link_Google_Maps': 'invalid-url'
    };
    SheetService.appendRow(CONFIG.SHEETS.VEICULOS, { 'ID_Onibus': 'VEIC-001', 'Capacidade_Total': 50 });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON-001', 'Celular_Monitor': '11999999999' });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('Formato de link do Google Maps inválido.')) {
      throw new Error(`Validação de link do Google Maps inválido falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: getAllSchoolNames deve retornar nomes de escolas únicos': function() {
    // Setup: Add routes with duplicate and unique school names
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-ESC-01', 'Nome_Escola': 'Escola A' });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-ESC-02', 'Nome_Escola': 'Escola B' });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-ESC-03', 'Nome_Escola': 'Escola A' });
    SpreadsheetApp.flush();

    const result = RouteService.getAllSchoolNames();
    if (!result.success) {
      throw new Error(`getAllSchoolNames falhou: ${result.message}`);
    }
    if (!Array.isArray(result.data) || result.data.length !== 2 || !result.data.includes('Escola A') || !result.data.includes('Escola B')) {
      throw new Error(`getAllSchoolNames retornou nomes de escolas incorretos: ${JSON.stringify(result.data)}`);
    }
  },

  'test: getRouteDetails deve retornar falha para uma rota inexistente': function() {
    const result = RouteService.getRouteDetails('ROTA_QUE_NAO_EXISTE');
    if (result.success) {
      throw new Error('getRouteDetails deveria ter falhado para uma rota inexistente, mas retornou sucesso.');
    }
  },

  'test: getAllRoutes deve retornar todas as rotas cadastradas': function() {
    // Cenário: Cadastrar 3 rotas.
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R01', 'Nome_Escola': 'Escola 1', 'Turno': 'Manhã', 'Vagas_Totais_no_Veiculo': 10 });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R02', 'Nome_Escola': 'Escola 2', 'Turno': 'Tarde', 'Vagas_Totais_no_Veiculo': 20 });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R03', 'Nome_Escola': 'Escola 3', 'Turno': 'Noite', 'Vagas_Totais_no_Veiculo': 30 });

    const result = RouteService.getAllRoutes();

    if (!result.success) {
      throw new Error(`getAllRoutes falhou: ${result.message}`);
    }
    if (!Array.isArray(result.data) || result.data.length !== 3) {
      throw new Error(`getAllRoutes deveria retornar um array com 3 rotas, mas retornou: ${JSON.stringify(result.data)}`);
    }
  },
};

/**
 * Ponto de entrada para executar os testes de integração deste módulo.
 */
function runRouteServiceIntegrationTests() {
  TestRunner.run('Serviço de Rotas (RouteService.gs)', RouteServiceIntegrationTestSuite);
}

  'test: _validateRouteData deve falhar se nenhum dia da semana for selecionado': function() {
    const rotaData = {
      'ID_Rota': 'R-DIA-01',
      'Nome_Rota': 'Rota Sem Dia',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': '',
      'Dias_da_Semana_2': '',
      'Dias_da_Semana_3': '',
      'Dias_da_Semana_4': '',
      'Dias_da_Semana_5': '',
      'Dias_da_Semana_6': '',
    };
    // Ensure vehicle and monitor exist for validation
    SheetService.appendRow(CONFIG.SHEETS.VEICULOS, { 'ID_Onibus': 'VEIC-001', 'Capacidade_Total': 50 });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON-001', 'Celular_Monitor': '11999999999' });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('Pelo menos um dia da semana deve ser selecionado.')) {
      throw new Error(`Validação de dia da semana falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se ID_Rota já existir para nova rota': function() {
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-EXISTE', 'Nome_Rota': 'Rota Existente' });
    const rotaData = {
      'ID_Rota': 'R-EXISTE',
      'Nome_Rota': 'Nova Rota',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': 'Segunda',
    };
    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('ID de Rota \'R-EXISTE\' já existe.')) {
      throw new Error(`Validação de ID de rota existente falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se ID_Onibus não existir': function() {
    const rotaData = {
      'ID_Rota': 'R-VEIC-INEXIST',
      'Nome_Rota': 'Rota Teste',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-INEXISTENTE',
      'Dias_da_Semana_1': 'Segunda',
    };
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON-001', 'Celular_Monitor': '11999999999' });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('veículo com ID \'VEIC-INEXISTENTE\' não foi encontrado.')) {
      throw new Error(`Validação de veículo inexistente falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se Celular_Monitor não existir': function() {
    const rotaData = {
      'ID_Rota': 'R-MON-INEXIST',
      'Nome_Rota': 'Rota Teste',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': 'Segunda',
    };
    SheetService.appendRow(CONFIG.SHEETS.VEICULOS, { 'ID_Onibus': 'VEIC-001', 'Capacidade_Total': 50 });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('monitor com celular \'11999999999\' não foi encontrado.')) {
      throw new Error(`Validação de monitor inexistente falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se Vagas_Totais_no_Veiculo for inválido': function() {
    const rotaData = {
      'ID_Rota': 'R-VAGAS-INVALID',
      'Nome_Rota': 'Rota Teste',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': -5,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': 'Segunda',
    };
    SheetService.appendRow(CONFIG.SHEETS.VEICULOS, { 'ID_Onibus': 'VEIC-001', 'Capacidade_Total': 50 });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON-001', 'Celular_Monitor': '11999999999' });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('capacidade máxima deve ser um número positivo.')) {
      throw new Error(`Validação de vagas inválidas falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateRouteData deve falhar se Link_Google_Maps for inválido': function() {
    const rotaData = {
      'ID_Rota': 'R-MAPS-INVALID',
      'Nome_Rota': 'Rota Teste',
      'Nome_Escola': 'Escola Teste',
      'Turno': 'Manhã',
      'Vagas_Totais_no_Veiculo': 20,
      'Celular_Monitor': '11999999999',
      'ID_Onibus': 'VEIC-001',
      'Dias_da_Semana_1': 'Segunda',
      'Link_Google_Maps': 'invalid-url'
    };
    SheetService.appendRow(CONFIG.SHEETS.VEICULOS, { 'ID_Onibus': 'VEIC-001', 'Capacidade_Total': 50 });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'MON-001', 'Celular_Monitor': '11999999999' });

    const result = RouteService._validateRouteData(rotaData);
    if (result.success || !result.message.includes('Formato de link do Google Maps inválido.')) {
      throw new Error(`Validação de link do Google Maps inválido falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: getAllSchoolNames deve retornar nomes de escolas únicos': function() {
    // Setup: Add routes with duplicate and unique school names
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-ESC-01', 'Nome_Escola': 'Escola A' });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-ESC-02', 'Nome_Escola': 'Escola B' });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-ESC-03', 'Nome_Escola': 'Escola A' });
    SpreadsheetApp.flush();

    const result = RouteService.getAllSchoolNames();
    if (!result.success) {
      throw new Error(`getAllSchoolNames falhou: ${result.message}`);
    }
    if (!Array.isArray(result.data) || result.data.length !== 2 || !result.data.includes('Escola A') || !result.data.includes('Escola B')) {
      throw new Error(`getAllSchoolNames retornou nomes de escolas incorretos: ${JSON.stringify(result.data)}`);
    }
  },

  'test: getRouteDetails deve retornar falha para uma rota inexistente': function() {
    const result = RouteService.getRouteDetails('ROTA_QUE_NAO_EXISTE');
    if (result.success) {
      throw new Error('getRouteDetails deveria ter falhado para uma rota inexistente, mas retornou sucesso.');
    }
  },

  'test: getAllRoutes deve retornar todas as rotas cadastradas': function() {
    // Cenário: Cadastrar 3 rotas.
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R01', 'Nome_Escola': 'Escola 1', 'Turno': 'Manhã', 'Vagas_Totais_no_Veiculo': 10 });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R02', 'Nome_Escola': 'Escola 2', 'Turno': 'Tarde', 'Vagas_Totais_no_Veiculo': 20 });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R03', 'Nome_Escola': 'Escola 3', 'Turno': 'Noite', 'Vagas_Totais_no_Veiculo': 30 });

    const result = RouteService.getAllRoutes();

    if (!result.success) {
      throw new Error(`getAllRoutes falhou: ${result.message}`);
    }
    if (!Array.isArray(result.data) || result.data.length !== 3) {
      throw new Error(`getAllRoutes deveria retornar um array com 3 rotas, mas retornou: ${JSON.stringify(result.data)}`);
    }
  },
};

/**
 * Ponto de entrada para executar os testes de integração deste módulo.
 */
function runRouteServiceIntegrationTests() {
  TestRunner.run('Serviço de Rotas (RouteService.gs)', RouteServiceIntegrationTestSuite);
}
