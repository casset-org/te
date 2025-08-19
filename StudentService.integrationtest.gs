/**
 * @file StudentService.integrationtest.gs
 * @description Testes de integração para o StudentService.
 */

const StudentServiceIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,
  _alunosSheet: null,
  _rotasSheet: null,

  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;
    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

    this._alunosSheet = this._ss.getSheetByName(CONFIG.SHEETS.ALUNOS);
    this._alunosSheet.clearContents();
    this._alunosSheet.getRange(1, 1, 1, CONFIG.HEADERS.ALUNOS.length).setValues([CONFIG.HEADERS.ALUNOS]);

    this._rotasSheet = this._ss.getSheetByName(CONFIG.SHEETS.ROTAS);
    this._rotasSheet.clearContents();
    this._rotasSheet.getRange(1, 1, 1, CONFIG.HEADERS.ROTAS.length).setValues([CONFIG.HEADERS.ROTAS]);

    SpreadsheetApp.flush();
  },

  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: _generateStudentId should generate correct ID for empty sheet': function() {
    this._alunosSheet.clearContents();
    this._alunosSheet.getRange(1, 1, 1, CONFIG.HEADERS.ALUNOS.length).setValues([CONFIG.HEADERS.ALUNOS]);
    SpreadsheetApp.flush();
    const newId = StudentService._generateStudentId();
    if (newId !== 'ALU-0001') {
      throw new Error(`ID gerado incorretamente para planilha vazia: ${newId}`);
    }
  },

  'test: _generateStudentId should generate next sequential ID': function() {
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'ALU-0001' });
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'ALU-0005' });
    const newId = StudentService._generateStudentId();
    if (newId !== 'ALU-0006') {
      throw new Error(`ID sequencial gerado incorretamente: ${newId}`);
    }
  },

  'test: _validateStudentData should fail for invalid CPF format': function() {
    const studentData = { 'Nome_Completo': 'Teste', 'CPF': '123', 'ID_Rota': 'R01', 'Celular_Responsavel': '61999999999' };
    const result = StudentService._validateStudentData(studentData);
    if (result.success || !result.message.includes('CPF inválido')) {
      throw new Error(`Validação de CPF inválido falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateStudentData should fail for invalid phone format': function() {
    const studentData = { 'Nome_Completo': 'Teste', 'CPF': '11122233344', 'ID_Rota': 'R01', 'Celular_Responsavel': '123' };
    const result = StudentService._validateStudentData(studentData);
    if (result.success || !result.message.includes('Celular_Responsavel' && 'inválido')) {
      throw new Error(`Validação de telefone inválido falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: _validateStudentData should fail for new registration with existing CPF': function() {
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'ALU-EXIST', 'Nome_Completo': 'Aluno Existente', 'CPF': '11122233344', 'ID_Rota': 'R01', 'Celular_Responsavel': '61999999999' });
    const studentData = { 'Nome_Completo': 'Novo Aluno', 'CPF': '11122233344', 'ID_Rota': 'R01', 'Celular_Responsavel': '61988888888' };
    const result = StudentService._validateStudentData(studentData);
    if (result.success || !result.message.includes('CPF já cadastrado')) {
      throw new Error(`Validação de CPF duplicado falhou: ${JSON.stringify(result)}`);
    }
  },

  'test: getInitialDataForStudentForm should return schools and routes': function() {
    // Ensure some schools and routes are set up in the test environment
    SheetService.appendRow(CONFIG.SHEETS.ESCOLAS, { 'Nome_Escola': 'Escola Teste A' });
    SheetService.appendRow(CONFIG.SHEETS.ESCOLAS, { 'Nome_Escola': 'Escola Teste B' });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-INIT-01', 'Nome_Escola': 'Escola Teste A', 'Turno': 'Manhã' });
    SpreadsheetApp.flush();

    const result = StudentService.getInitialDataForStudentForm();
    if (!result.success || !result.data || !result.data.schools || !result.data.routes) {
      throw new Error(`getInitialDataForStudentForm falhou: ${JSON.stringify(result)}`);
    }
    if (result.data.schools.length === 0 || result.data.routes.length === 0) {
      throw new Error('getInitialDataForStudentForm retornou dados vazios.');
    }
    if (!result.data.schools.includes('Escola Teste A')) {
      throw new Error('Escola Teste A não encontrada nos dados iniciais.');
    }
    if (!result.data.routes.some(r => r.ID_Rota === 'R-INIT-01')) {
      throw new Error('Rota R-INIT-01 não encontrada nos dados iniciais.');
    }
  },

  'test: getRouteCapacityInfo should return correct capacity info': function() {
    // Setup: Add a route and some students to it
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-CAP-01', 'Vagas_Totais_no_Veiculo': 5 });
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'A-CAP-01', 'ID_Rota': 'R-CAP-01', 'Nome_Acompanhante': '' }); // 1 seat
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'A-CAP-02', 'ID_Rota': 'R-CAP-01', 'Nome_Acompanhante': 'Acompanhante' }); // 2 seats
    SpreadsheetApp.flush();

    const result = StudentService.getRouteCapacityInfo('R-CAP-01');
    if (!result.success) {
      throw new Error(`getRouteCapacityInfo falhou: ${result.message}`);
    }
    if (result.data.totalCapacity !== 5) {
      throw new Error(`Capacidade total incorreta. Esperado 5, obtido ${result.data.totalCapacity}`);
    }
    if (result.data.occupiedSeats !== 3) {
      throw new Error(`Vagas ocupadas incorretas. Esperado 3, obtido ${result.data.occupiedSeats}`);
    }
    if (result.data.availableSeats !== 2) {
      throw new Error(`Vagas disponíveis incorretas. Esperado 2, obtido ${result.data.availableSeats}`);
    }
  },

  'test: getRouteCapacityInfo should return error for non-existent route': function() {
    const result = StudentService.getRouteCapacityInfo('ROTA-INEXISTENTE');
    if (result.success || !result.message.includes('Rota não encontrada')) {
      throw new Error(`getRouteCapacityInfo falhou ao lidar com rota inexistente: ${JSON.stringify(result)}`);
    }
  },

  'test: registerOrUpdate should update student with duplicate CPF': function() {
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R01', 'Vagas_Totais_no_Veiculo': 10 });
    const existingStudent = { 'Nome_Completo': 'Aluno Existente', 'CPF': '11122233344', 'ID_Rota': 'R01', 'Celular_Responsavel': '61999999999' };
    StudentService.registerOrUpdate(existingStudent);
    const duplicateStudent = { 'Nome_Completo': 'Aluno Atualizado', 'CPF': '11122233344', 'ID_Rota': 'R01', 'Celular_Responsavel': '61988888888' };
    const result = StudentService.registerOrUpdate(duplicateStudent);
    if (!result.success || !result.message.includes('atualizado com sucesso')) {
      throw new Error(`O sistema deveria ter atualizado o aluno com CPF duplicado. Mensagem: "${result.message}"`);
    }
    const found = SheetService.findRow(CONFIG.SHEETS.ALUNOS, 'CPF', '11122233344');
    if (found.rowData.Nome_Completo !== 'Aluno Atualizado') {
        throw new Error('O nome do aluno não foi atualizado corretamente.');
    }
  },

  'test: registerOrUpdate should prevent registration on a full route': function() {
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R02', 'Vagas_Totais_no_Veiculo': 1 });
    const student1 = { 'Nome_Completo': 'Aluno 1', 'CPF': '11111111111', 'ID_Rota': 'R02', 'Celular_Responsavel': '61999999999' };
    StudentService.registerOrUpdate(student1);
    const student2 = { 'Nome_Completo': 'Aluno 2', 'CPF': '22222222222', 'ID_Rota': 'R02', 'Celular_Responsavel': '61988888888' };
    const result = StudentService.registerOrUpdate(student2);
    if (result.success) {
      throw new Error('O sistema permitiu o cadastro de um aluno em uma rota lotada.');
    }
    if (!result.message.toLowerCase().includes('capacidade')) {
      throw new Error(`Mensagem de erro incorreta para rota lotada. Recebido: "${result.message}"`);
    }
  },

  'test: getStudentsByRoute should return only students from the specified route': function() {
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R01', 'Vagas_Totais_no_Veiculo': 10 });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R02', 'Vagas_Totais_no_Veiculo': 10 });
    const student1 = { 'Nome_Completo': 'Aluno Rota 1', 'CPF': '33333333333', 'ID_Rota': 'R01', 'Celular_Responsavel': '61999999999' };
    const student2 = { 'Nome_Completo': 'Aluno Rota 2', 'CPF': '44444444444', 'ID_Rota': 'R02', 'Celular_Responsavel': '61988888888' };
    StudentService.registerOrUpdate(student1);
    StudentService.registerOrUpdate(student2);
    SpreadsheetApp.flush();
    const alunosNaRota01 = StudentService.getStudentsByRoute('R01');
    if (alunosNaRota01.length !== 1) {
      throw new Error(`Esperado 1 aluno na R01, mas foram encontrados ${alunosNaRota01.length}.`);
    }
    if (String(alunosNaRota01[0].CPF) !== '33333333333') {
      throw new Error('O CPF do aluno retornado para a R01 está incorreto.');
    }
  },

  'test: registerOrUpdate should prevent registration for student with companion on a nearly full route': function() {
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R03', 'Vagas_Totais_no_Veiculo': 2 });
    const student1 = { 'Nome_Completo': 'Aluno Sem Acompanhante', 'CPF': '55555555555', 'ID_Rota': 'R03', 'Celular_Responsavel': '61911111111' };
    StudentService.registerOrUpdate(student1); // Ocupa 1 vaga

    const student2 = {
      'Nome_Completo': 'Aluno Com Acompanhante',
      'CPF': '66666666666',
      'ID_Rota': 'R03',
      'Celular_Responsavel': '61922222222',
      'Nome_Acompanhante': 'Pai do Aluno'
    };
    const result = StudentService.registerOrUpdate(student2); // Tenta ocupar 2 vagas

    if (result.success) {
      throw new Error('O sistema permitiu o cadastro de um aluno com acompanhante em uma rota quase cheia.');
    }
    if (!result.message.toLowerCase().includes('capacidade')) {
      throw new Error(`Mensagem de erro incorreta para rota quase cheia. Recebido: "${result.message}"`);
    }
  },
};

function runStudentServiceIntegrationTests() {
  TestRunner.run('Serviço de Alunos (StudentService.gs)', StudentServiceIntegrationTestSuite);
}
