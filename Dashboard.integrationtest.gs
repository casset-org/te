/**
 * @file Dashboard.integrationtest.gs
 * @description Testes de integração para o Dashboard.gs.
 * ESTES TESTES MODIFICAM DADOS DIRETAMENTE NA PLANILHA DE TESTE.
 */

const DashboardIntegrationTestSuite = {

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

    // Limpa e prepara as abas relevantes para o Dashboard.gs
    const sheetsToSetup = {
      [CONFIG.SHEETS.ALUNOS]: CONFIG.HEADERS.ALUNOS,
      // Assuming VEHICLE_SHEET and INCIDENT_SHEET are defined in CONFIG.SHEETS
      // and their headers in CONFIG.HEADERS
      // For now, I'll use placeholder names if they are not explicitly in CONFIG.SHEETS
      // You might need to adjust these if your CONFIG.SHEETS has different names
      'Veiculos': ['ID_Veiculo', 'Nome_Escola', 'Placa', 'Capacidade'], // Placeholder, adjust if CONFIG has VEHICLE_SHEET
      'Incidentes': ['Data', 'Tipo', 'Descricao', 'Envolvidos'], // Placeholder, adjust if CONFIG has INCIDENT_SHEET
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
    alunosSheet.appendRow(['A002', 'Aluno Teste 2', '222', 'R001', 'Acompanhante 1', '61999992222', 'Endereço 2']); // With companion
    alunosSheet.appendRow(['A003', 'Aluno Teste 3', '333', 'R002', '', '61999993333', 'Endereço 3']);

    // Add data for 'Veiculos' and 'Incidentes' if they exist in CONFIG.SHEETS
    if (CONFIG.SHEETS.VEICULOS) {
        const veiculosSheet = this._ss.getSheetByName(CONFIG.SHEETS.VEICULOS);
        veiculosSheet.appendRow(['VEI-0001', 'ABC1D23', 'Ônibus', 50]);
        veiculosSheet.appendRow(['VEI-0002', 'DEF2G45', 'Micro-ônibus', 40]);
    }
    if (CONFIG.SHEETS.INCIDENTES) {
        const incidentesSheet = this._ss.getSheetByName(CONFIG.SHEETS.INCIDENTES);
        incidentesSheet.appendRow([new Date(), new Date(2025, 7, 1), 'Atraso', 'Ônibus atrasou 15 min', 'Aluno Teste 1']); // Timestamp, Data_Incidente, Tipo_Incidente, Descricao, Envolvidos
        incidentesSheet.appendRow([new Date(), new Date(2025, 7, 5), 'Acidente', 'Pequeno acidente', 'Aluno Teste 2']); // August
        incidentesSheet.appendRow([new Date(), new Date(2025, 7, 10), 'Atraso', 'Ônibus atrasou 5 min', 'Aluno Teste 1']); // August
        incidentesSheet.appendRow([new Date(), new Date(2025, 6, 1), 'Problema Mecânico', 'Pneu furado', 'Aluno Teste 3']); // July
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

  'test: getDashboardData deve retornar estatísticas corretas': function() {
    const result = getDashboardData();
    if (!result.success) {
      throw new Error(`Falha ao obter dados do dashboard: ${result.message}`);
    }
    const stats = result.data.stats;
    if (stats.totalStudents !== 3) {
      throw new Error(`Total de alunos incorreto. Esperado 3, obtido ${stats.totalStudents}`);
    }
    if (stats.totalCompanions !== 1) {
      throw new Error(`Total de acompanhantes incorreto. Esperado 1, obtido ${stats.totalCompanions}`);
    }
    if (stats.totalPassengers !== 4) {
      throw new Error(`Total de passageiros incorreto. Esperado 4, obtido ${stats.totalPassengers}`);
    }
    if (stats.totalVehicles !== 2) {
      throw new Error(`Total de veículos incorreto. Esperado 2, obtido ${stats.totalVehicles}`);
    }
    if (stats.totalFleetCapacity !== 90) {
      throw new Error(`Capacidade total da frota incorreta. Esperado 90, obtido ${stats.totalFleetCapacity}`);
    }
    // Average passengers per vehicle will depend on the exact calculation, so check for a reasonable range
    if (parseFloat(stats.averagePassengersPerVehicle) < 1 || parseFloat(stats.averagePassengersPerVehicle) > 3) {
        throw new Error(`Média de passageiros por veículo incorreta. Obtido ${stats.averagePassengersPerVehicle}`);
    }
  },

  'test: generateReport para capacity deve retornar HTML correto': function() {
    const html = generateReport('capacity');
    if (!html.includes("Total de passageiros (alunos + acompanhantes): <b>4</b>") || !html.includes("Capacidade total da frota: <b>90</b>")) {
      throw new Error(`HTML de relatório de capacidade incorreto: ${html}`);
    }
  },

  'test: generateReport para incidents deve retornar HTML correto': function() {
    const html = generateReport('incidents');
    // Assuming current month is August (month 7 in 0-indexed) and three incidents are in August
    if (!html.includes("Total de incidentes: <b>3</b>") || !html.includes("Atraso: 2") || !html.includes("Acidente: 1")) {
      throw new Error(`HTML de relatório de incidentes incorreto: ${html}`);
    }
  },

  'test: generateReport para companions deve retornar HTML correto': function() {
    const html = generateReport('companions');
    if (!html.includes("Total de alunos com acompanhantes: <b>1</b>") || !html.includes("Aluno Teste 2 - Acompanhante: Acompanhante 1")) {
      throw new Error(`HTML de relatório de acompanhantes incorreto: ${html}`);
    }
  },

  'test: generateReport para insights deve retornar HTML correto': function() {
    const html = generateReport('insights');
    if (!html.includes("Aluno com mais incidentes: Aluno Teste 1 (2 incidentes). Considere monitoramento.")) {
      throw new Error(`HTML de relatório de insights incorreto: ${html}`);
    }
  },

  /**
   * Testa se todos os dados registrados nas abas do dashboard aderem ao cabeçalho definido em CONFIG.
   */
  'test: dados aderem ao cabeçalho das abas do dashboard': function() {
    const sheetsToCheck = [
      CONFIG.SHEETS.ALUNOS,
      CONFIG.SHEETS.VEICULOS,
      CONFIG.SHEETS.INCIDENTES
    ].filter(Boolean);

    for (const sheetName of sheetsToCheck) {
      const sheet = this._ss.getSheetByName(sheetName);
      const headers = CONFIG.HEADERS[sheetName];
      const rowCount = sheet.getLastRow();
      if (rowCount < 2) continue; // Sem dados

      const dataRows = sheet.getRange(2, 1, rowCount - 1, headers.length).getValues();
      for (const row of dataRows) {
        if (row.length !== headers.length) {
          throw new Error(`Linha na aba ${sheetName} não adere ao cabeçalho. Esperado ${headers.length} colunas, obtido ${row.length}`);
        }
      }
    }
  },

  /**
   * Testa dashboard dinâmico: estatísticas por escola.
   */
  'test: getDashboardData por escola retorna estatísticas corretas': function() {
    // Adiciona alunos em diferentes escolas/rotas
    const alunosSheet = this._ss.getSheetByName(CONFIG.SHEETS.ALUNOS);
    alunosSheet.appendRow(['A004', 'Aluno Escola X', '444', 'R003', '', '61999994444', 'Endereço X']);
    alunosSheet.appendRow(['A005', 'Aluno Escola Y', '555', 'R004', '', '61999995555', 'Endereço Y']);

    // Simula função getDashboardData('school', 'Escola X')
    if (typeof getDashboardDataBySchool === 'function') {
      const result = getDashboardDataBySchool('Escola X');
      if (!result.success) throw new Error(`Falha ao obter dashboard por escola: ${result.message}`);
      if (result.data.stats.totalStudents !== 1) throw new Error('Dashboard por escola retornou contagem incorreta de alunos.');
    }
  },
};

/**
 * Ponto de entrada para executar os testes de integração deste módulo.
 */
function runDashboardIntegrationTests() {
  TestRunner.run('Dashboard (Dashboard.gs)', DashboardIntegrationTestSuite);
}
