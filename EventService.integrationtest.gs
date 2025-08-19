/**
 * @file EventService.integrationtest.gs
 * @description Testes de integração para o EventService.
 * ESTES TESTES MODIFICAM DADOS DIRETAMENTE NA PLANILHA DE TESTE.
 */

const EventServiceIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,

  /**
   * Prepara a planilha de teste com um cenário completo antes de cada teste.
   * Limpa as abas de eventos e a de Escolas, e cria uma escola válida para os testes.
   */
  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }

    // Redireciona o CONFIG para usar a planilha de teste
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;

    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

    // Limpa e prepara as abas de eventos e a de Rotas
    const sheetsToSetup = [
      { name: CONFIG.SHEETS.ROTAS, headers: CONFIG.HEADERS.ROTAS },
      { name: CONFIG.SHEETS.PONTO_FACULTATIVO, headers: [...CONFIG.HEADERS.PONTO_FACULTATIVO, 'Status'] },
      { name: CONFIG.SHEETS.REPOSICAO, headers: [...CONFIG.HEADERS.REPOSICAO, 'Status'] },
      { name: CONFIG.SHEETS.ATIVIDADE_EXTRACURRICULAR, headers: [...CONFIG.HEADERS.ATIVIDADE_EXTRACURRICULAR, 'Status'] },
    ];

    for (const sheetConfig of sheetsToSetup) {
      const sheet = this._ss.getSheetByName(sheetConfig.name);
      if (!sheet) {
        // Se a aba não existe, cria ela com os cabeçalhos.
        const newSheet = this._ss.insertSheet(sheetConfig.name);
        newSheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
      } else {
        sheet.clearContents();
        sheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
      }
    }

    // Cria cenário de teste: uma rota com uma escola válida para ser encontrada
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-EVENT-01', 'Nome_Escola': 'Escola Modelo de Teste', 'Turno': 'Matutino', 'Vagas_Totais_no_Veiculo': 1 });

    SpreadsheetApp.flush();
  },

  /**
   * Restaura a configuração original após a suíte de testes.
   */
  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: recordEvent deve registrar um Ponto Facultativo com sucesso para uma escola existente': function() {
    const secretaryUser = { id: 'SEC-TEST', celular: '61999998888' };
    const eventData = {
      'Nome_Escola': 'Escola Modelo de Teste',
      'Data_Ponto_Facultativo': new Date('2025-10-31'),
      'Motivo': 'Dia do Servidor Público',
      'Celular_Secretario': secretaryUser.celular // Add this line
    };

    const result = EventService.recordEvent('holiday', eventData, secretaryUser);

    if (!result.success) {
      throw new Error(`Registro de Ponto Facultativo falhou inesperadamente: ${result.message}`);
    }

    const found = SheetService.findRow(CONFIG.SHEETS.PONTO_FACULTATIVO, 'Motivo', 'Dia do Servidor Público');
    if (!found) {
      throw new Error('Ponto Facultativo não foi encontrado na planilha após o registro.');
    }
    if (found.rowData.Status !== 'Agendado') {
        throw new Error(`O status do evento deveria ser 'Agendado', mas foi '${found.rowData.Status}'.`);
    }
  },

  'test: recordEvent deve registrar uma Reposição com sucesso para uma escola existente': function() {
    const secretaryUser = { id: 'SEC-TEST', celular: '61999998888' };
    const eventData = {
      'Nome_Escola': 'Escola Modelo de Teste',
      'Data_Reposicao': new Date('2025-11-22'),
      'Motivo': 'Reposição de feriado municipal',
      'Celular_Secretario': secretaryUser.celular,
      'Quantidade_Onibus': 1 // Add this line
    };

    const result = EventService.recordEvent('makeup', eventData, secretaryUser);

    if (!result.success) {
      throw new Error(`Registro de Reposição falhou inesperadamente: ${result.message}`);
    }

    const found = SheetService.findRow(CONFIG.SHEETS.REPOSICAO, 'Motivo', 'Reposição de feriado municipal');
    if (!found) {
      throw new Error('Reposição não foi encontrada na planilha após o registro.');
    }
  },

  'test: recordEvent deve impedir o registro de um evento para uma escola INEXISTENTE': function() {
    const secretaryUser = { id: 'SEC-TEST', celular: '61999998888' };
    const eventData = {
      'Nome_Escola': 'Escola Fantasma que Não Existe', // Esta escola não foi criada no setup
      'Data_Ponto_Facultativo': new Date('2025-10-31'),
      'Motivo': 'Evento Inválido'
    };

    const result = EventService.recordEvent('holiday', eventData, secretaryUser);

    if (result.success) {
      throw new Error('O sistema permitiu o registro de um evento para uma escola inexistente, o que não deveria acontecer.');
    }
    if (!result.message.includes('não foi encontrada')) {
      throw new Error(`A mensagem de erro para escola inexistente está incorreta. Recebido: "${result.message}"`);
    }
  },

  'test: recordEvent deve falhar graciosamente para um tipo de evento inválido': function() {
    const secretaryUser = { id: 'SEC-TEST', celular: '61999998888' };
    const eventData = { 'Nome_Escola': 'Escola Modelo de Teste' };

    const result = EventService.recordEvent('TIPO_DE_EVENTO_QUE_NAO_EXISTE', eventData, secretaryUser);

    if (result.success) {
      throw new Error('O sistema aceitou um tipo de evento inválido.');
    }
    if (!result.message.includes('Tipo de evento inválido')) {
      throw new Error(`A mensagem de erro para tipo de evento inválido está incorreta. Recebido: "${result.message}"`);
    }
  },

  'test: recordEvent deve falhar se o nome da escola não for fornecido': function() {
    const secretaryUser = { id: 'SEC-TEST', celular: '61999998888' };
    const eventData = {
      // 'Nome_Escola': 'Escola Modelo de Teste', // Campo obrigatório removido
      'Data_Ponto_Facultativo': new Date('2025-12-26'),
      'Motivo': 'Teste sem escola'
    };

    const result = EventService.recordEvent('holiday', eventData, secretaryUser);

    if (result.success) {
      throw new Error('O sistema permitiu o registro de um evento sem o nome da escola.');
    }
    if (!result.message.includes('obrigatório')) {
      throw new Error(`A mensagem de erro para campo obrigatório ausente está incorreta. Recebido: "${result.message}"`);
    }
  },

  /**
   * Testa se todos os eventos registrados aderem ao cabeçalho das abas de eventos.
   */
  'test: eventos aderem ao cabeçalho': function() {
    const eventSheets = [
      CONFIG.SHEETS.PONTO_FACULTATIVO,
      CONFIG.SHEETS.REPOSICAO,
      CONFIG.SHEETS.ATIVIDADE_EXTRACURRICULAR
    ].filter(Boolean);

    for (const sheetName of eventSheets) {
      const sheet = this._ss.getSheetByName(sheetName);
      const headers = CONFIG.HEADERS[sheetName];
      const rowCount = sheet.getLastRow();
      if (rowCount < 2) continue;
      const dataRows = sheet.getRange(2, 1, rowCount - 1, headers.length).getValues();
      for (const row of dataRows) {
        if (row.length !== headers.length) {
          throw new Error(`Linha na aba ${sheetName} não adere ao cabeçalho. Esperado ${headers.length} colunas, obtido ${row.length}`);
        }
      }
    }
  },
};

/**
 * Ponto de entrada para executar os testes de integração deste módulo.
 */
function runEventServiceIntegrationTests() {
  TestRunner.run('Serviço de Eventos (EventService.gs)', EventServiceIntegrationTestSuite);
}
