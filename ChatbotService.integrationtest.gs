/**
 * @file ChatbotService.integrationtest.gs
 * @description Testes de integração para o ChatbotService.
 * ESTES TESTES MODIFICAM DADOS DIRETAMENTE NA PLANILHA DE TESTE.
 */

const ChatbotServiceIntegrationTestSuite = {

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

    // Limpa e prepara as abas relevantes para o ChatbotService
    const sheetsToSetup = {
      [CONFIG.SHEETS.ALUNOS]: CONFIG.HEADERS.ALUNOS,
      [CONFIG.SHEETS.ROTAS]: CONFIG.HEADERS.ROTAS,
      // Assuming VEHICLE_SHEET and INCIDENT_SHEET are defined in CONFIG.SHEETS
      // and their headers in CONFIG.HEADERS
      // For now, I'll use placeholder names if they are not explicitly in CONFIG.SHEETS
      // You might need to adjust these if your CONFIG.SHEETS has different names
      'Veiculos': ['Placa', 'Capacidade'], // Placeholder, adjust if CONFIG has VEHICLE_SHEET
      'Incidentes': ['Data', 'Tipo'], // Placeholder, adjust if CONFIG has INCIDENT_SHEET
    };

    // Check if VEHICLE_SHEET and INCIDENT_SHEET exist in CONFIG.SHEETS
    if (CONFIG.SHEETS.VEICULOS && CONFIG.HEADERS.VEICULOS) {
        sheetsToSetup[CONFIG.SHEETS.VEICULOS] = CONFIG.HEADERS.VEICULOS;
    }
    if (CONFIG.SHEETS.INCIDENTES && CONFIG.HEADERS.INCIDENTES) {
        sheetsToSetup[CONFIG.SHEETS.INCIDENTES] = CONFIG.HEADERS.INCIDENTES;
    }

    for (const sheetName in sheetsToSetup) {
      let sheet = this._ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = this._ss.insertSheet(sheetName);
      }
      sheet.clearContents();
      const headers = sheetsToSetup[sheetName];
      if (headers) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }

    // Adiciona dados de teste
    const alunosSheet = this._ss.getSheetByName(CONFIG.SHEETS.ALUNOS);
    alunosSheet.appendRow(['A001', 'Aluno Teste 1', '111', 'R001', '', '61999991111', 'Endereço 1']);
    alunosSheet.appendRow(['A002', 'Aluno Teste 2', '222', 'R001', '', '61999992222', 'Endereço 2']);
    alunosSheet.appendRow(['A003', 'Aluno Teste 3', '333', 'R002', '', '61999993333', 'Endereço 3']);

    const rotasSheet = this._ss.getSheetByName(CONFIG.SHEETS.ROTAS);
    rotasSheet.appendRow(['R001', 'V001', 'Escola A', 'Manhã', 'Itinerário 1', '11111111111', 'Seg', '', '', '', '', '', 40, '33333333333']);
    rotasSheet.appendRow(['R002', 'V002', 'Escola B', 'Tarde', 'Itinerário 2', '22222222222', 'Ter', '', '', '', '', '', 30, '44444444444']);

    // Add data for 'Veiculos' and 'Incidentes' if they exist in CONFIG.SHEETS
    if (CONFIG.SHEETS.VEICULOS) {
        const veiculosSheet = this._ss.getSheetByName(CONFIG.SHEETS.VEICULOS);
        veiculosSheet.appendRow(['VEI-0001', 'ABC1D23', 'Ônibus', 50]);
        veiculosSheet.appendRow(['VEI-0002', 'DEF2G45', 'Micro-ônibus', 45]);
    }
    if (CONFIG.SHEETS.INCIDENTES) {
        const incidentesSheet = this._ss.getSheetByName(CONFIG.SHEETS.INCIDENTES);
        incidentesSheet.appendRow([new Date(), new Date(2025, 7, 15), 'Atraso', 'Descricao Teste 1', 'Envolvidos Teste 1']); // Timestamp, Data_Incidente, Tipo_Incidente, Descricao, Envolvidos
        incidentesSheet.appendRow([new Date(), new Date(2025, 7, 20), 'Acidente', 'Descricao Teste 2', 'Envolvidos Teste 2']);
        incidentesSheet.appendRow([new Date(), new Date(2025, 6, 10), 'Problema Mecânico', 'Descricao Teste 3', 'Envolvidos Teste 3']); // July
    }

    SpreadsheetApp.flush();
  },

  /**
   * Restaura a configuração original após cada teste.
   */
  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: getAllSheetData deve retornar dados de todas as abas relevantes': function() {
    const data = ChatbotService.getAllSheetData();
    if (!data[CONFIG.SHEETS.ALUNOS] || data[CONFIG.SHEETS.ALUNOS].length !== 3) {
      throw new Error(`Falha ao obter dados de alunos. Esperado 3, obtido ${data[CONFIG.SHEETS.ALUNOS] ? data[CONFIG.SHEETS.ALUNOS].length : 'nenhum'}`);
    }
    if (!data[CONFIG.SHEETS.ROTAS] || data[CONFIG.SHEETS.ROTAS].length !== 2) {
      throw new Error(`Falha ao obter dados de rotas. Esperado 2, obtido ${data[CONFIG.SHEETS.ROTAS] ? data[CONFIG.SHEETS.ROTAS].length : 'nenhum'}`);
    }
    // Check for 'Veiculos' and 'Incidentes' if they are expected
    if (CONFIG.SHEETS.VEICULOS && (!data[CONFIG.SHEETS.VEICULOS] || data[CONFIG.SHEETS.VEICULOS].length !== 2)) {
        throw new Error(`Falha ao obter dados de veículos. Esperado 2, obtido ${data[CONFIG.SHEETS.VEICULOS] ? data[CONFIG.SHEETS.VEICULOS].length : 'nenhum'}`);
    }
    if (CONFIG.SHEETS.INCIDENTES && (!data[CONFIG.SHEETS.INCIDENTES] || data[CONFIG.SHEETS.INCIDENTES].length !== 3)) {
        throw new Error(`Falha ao obter dados de incidentes. Esperado 3, obtido ${data[CONFIG.SHEETS.INCIDENTES] ? data[CONFIG.SHEETS.INCIDENTES].length : 'nenhum'}`);
    }
  },

  'test: getAllSheetData deve retornar array vazio para aba vazia': function() {
    const emptySheetName = 'ABA_VAZIA_TESTE';
    let emptySheet = this._ss.getSheetByName(emptySheetName);
    if (!emptySheet) {
      emptySheet = this._ss.insertSheet(emptySheetName);
    }
    emptySheet.clearContents();
    emptySheet.appendRow(['Header1', 'Header2']); // Add headers only
    SpreadsheetApp.flush();

    const data = ChatbotService.getAllSheetData();
    if (!data[emptySheetName] || data[emptySheetName].length !== 0) {
      throw new Error(`getAllSheetData falhou para aba vazia. Esperado 0, obtido ${data[emptySheetName] ? data[emptySheetName].length : 'nenhum'}`);
    }
    this._ss.deleteSheet(emptySheet);
  },

  'test: getAllSheetData deve ignorar abas especificadas em CONFIG.SHEETS_TO_IGNORE_IN_SEARCH': function() {
    const ignoredSheetName = '[BACKUP]IgnoredSheet';
    let ignoredSheet = this._ss.getSheetByName(ignoredSheetName);
    if (!ignoredSheet) {
      ignoredSheet = this._ss.insertSheet(ignoredSheetName);
    }
    ignoredSheet.clearContents();
    ignoredSheet.appendRow(['Data1', 'Data2']);
    SpreadsheetApp.flush();

    // Temporarily add to ignore list if not already there
    const originalIgnoreList = CONFIG.SHEETS_TO_IGNORE_IN_SEARCH;
    if (!originalIgnoreList.includes(ignoredSheetName)) {
      CONFIG.SHEETS_TO_IGNORE_IN_SEARCH.push(ignoredSheetName);
    }

    const data = ChatbotService.getAllSheetData();
    if (data[ignoredSheetName]) {
      throw new Error(`getAllSheetData falhou: Aba ignorada '${ignoredSheetName}' foi incluída.`);
    }

    // Restore original ignore list
    CONFIG.SHEETS_TO_IGNORE_IN_SEARCH = originalIgnoreList;
    this._ss.deleteSheet(ignoredSheet);
  },

  'test: processQuery para total de alunos deve retornar a contagem correta': function() {
    const result = ChatbotService.processQuery("total de alunos");
    if (!result.success || !result.response.includes("3")) {
      throw new Error(`Falha no teste de total de alunos. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: processQuery para total de veiculos deve retornar a contagem correta': function() {
    // This test assumes CONFIG.SHEETS.VEICULOS is defined and populated
    if (CONFIG.SHEETS.VEICULOS) {
        const result = ChatbotService.processQuery("total de veiculos");
        if (!result.success || !result.response.includes("2")) {
            throw new Error(`Falha no teste de total de veículos. Resultado: ${JSON.stringify(result)}`);
        }
    } else {
        Logger.log("Skipping 'total de veiculos' test as CONFIG.SHEETS.VEICULOS is not defined.");
    }
  },

  'test: processQuery para incidentes este mes deve retornar a contagem correta': function() {
    // This test assumes CONFIG.SHEETS.INCIDENTES is defined and populated
    if (CONFIG.SHEETS.INCIDENTES) {
        const result = ChatbotService.processQuery("incidentes este mes");
        // Assuming current month is August (month 7 in 0-indexed) and two incidents are in August
        if (!result.success || !result.response.includes("2")) {
            throw new Error(`Falha no teste de incidentes este mês. Resultado: ${JSON.stringify(result)}`);
        }
    } else {
        Logger.log("Skipping 'incidentes este mes' test as CONFIG.SHEETS.INCIDENTES is not defined.");
    }
  },

  'test: processQuery para rotas disponiveis deve retornar os nomes corretos': function() {
    const result = ChatbotService.processQuery("rotas disponiveis");
    if (!result.success || !result.response.includes("R001, R002")) {
      throw new Error(`Falha no teste de rotas disponíveis. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: processQuery para capacidade do veiculo deve retornar as capacidades corretas': function() {
    // This test assumes CONFIG.SHEETS.VEICULOS is defined and populated
    if (CONFIG.SHEETS.VEICULOS) {
        const result = ChatbotService.processQuery("capacidade do veiculo");
        if (!result.success || !result.response.includes("ABC-1234: 50") || !result.response.includes("DEF-5678: 45")) {
            throw new Error(`Falha no teste de capacidade do veículo. Resultado: ${JSON.stringify(result)}`);
        }
    } else {
        Logger.log("Skipping 'capacidade do veiculo' test as CONFIG.SHEETS.VEICULOS is not defined.");
    }
  },

  'test: processQuery para consulta desconhecida deve retornar mensagem padrao': function() {
    const result = ChatbotService.processQuery("qual a cor do ceu?");
    if (!result.success || !result.response.includes("não consegui encontrar uma resposta")) {
      throw new Error(`Falha no teste de consulta desconhecida. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: processQuery deve retornar mensagem padrao quando nao ha dados para a consulta': function() {
    // Limpa a aba de alunos para simular nenhum aluno
    const alunosSheet = this._ss.getSheetByName(CONFIG.SHEETS.ALUNOS);
    alunosSheet.clearContents();
    alunosSheet.appendRow(CONFIG.HEADERS.ALUNOS);
    SpreadsheetApp.flush();

    const result = ChatbotService.processQuery("total de alunos");
    if (!result.success || !result.response.includes("0")) {
      throw new Error(`Falha no teste de consulta sem dados. Resultado: ${JSON.stringify(result)}`);
    }

    // Restaura os dados para não afetar outros testes
    alunosSheet.clearContents();
    alunosSheet.appendRow(CONFIG.HEADERS.ALUNOS);
    alunosSheet.appendRow(['A001', 'Aluno Teste 1', '111', 'R001', '', '61999991111', 'Endereço 1']);
    alunosSheet.appendRow(['A002', 'Aluno Teste 2', '222', 'R001', '', '61999992222', 'Endereço 2']);
    alunosSheet.appendRow(['A003', 'Aluno Teste 3', '333', 'R002', '', '61999993333', 'Endereço 3']);
    SpreadsheetApp.flush();
  },

  'test: processQuery deve lidar com erros internos': function() {
    // Simular um erro em getAllSheetData temporariamente
    const originalGetAllSheetData = ChatbotService.getAllSheetData;
    ChatbotService.getAllSheetData = function() {
      throw new Error('Erro simulado em getAllSheetData');
    };

    const result = ChatbotService.processQuery("total de alunos");
    if (result.success || !result.response.includes("Ocorreu um erro ao processar sua consulta")) {
      throw new Error(`Falha no teste de tratamento de erro. Resultado: ${JSON.stringify(result)}`);
    }

    // Restaurar a função original
    ChatbotService.getAllSheetData = originalGetAllSheetData;
  },

  /**
   * Testa se os dados retornados pelo Chatbot aderem ao cabeçalho das abas relevantes.
   */
  'test: dados do Chatbot aderem ao cabeçalho das abas': function() {
    const data = ChatbotService.getAllSheetData();
    for (const sheetKey in CONFIG.SHEETS) {
      const sheetName = CONFIG.SHEETS[sheetKey];
      const headers = CONFIG.HEADERS[sheetKey];
      if (!data[sheetName]) continue;
      data[sheetName].forEach((row, idx) => {
        if (Object.keys(row).length !== headers.length) {
          throw new Error(`Linha ${idx + 2} da aba ${sheetName} não adere ao cabeçalho. Esperado ${headers.length} campos, obtido ${Object.keys(row).length}`);
        }
      });
    }
  },
};

/**
 * Ponto de entrada para executar os testes de integração deste módulo.
 */
function runChatbotServiceIntegrationTests() {
  TestRunner.run('Serviço de Chatbot (ChatbotService.gs)', ChatbotServiceIntegrationTestSuite);
}
