/**
 * @fileoverview Testes de Integração para o FormService.
 */

const FormServiceIntegrationTestSuite = {

  _originalConfigId: null,
  _ss: null,

  /**
   * Prepara o ambiente para os testes do FormService.
   */
  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;
    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

    // Define todas as abas que serão usadas nos testes
    const sheetsToSetup = [
      { name: CONFIG.SHEETS.ALUNOS, headers: CONFIG.HEADERS.ALUNOS },
      { name: CONFIG.SHEETS.ROTAS, headers: CONFIG.HEADERS.ROTAS },
      { name: CONFIG.SHEETS.MONITORES, headers: CONFIG.HEADERS.MONITORES },
      { name: CONFIG.SHEETS.SECRETARIOS, headers: CONFIG.HEADERS.SECRETARIOS },
    ];

    // Limpa e prepara as abas
    for (const sheetConfig of sheetsToSetup) {
        const sheet = this._ss.getSheetByName(sheetConfig.name);
        if (sheet) {
            sheet.clearContents();
            sheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
        } else {
            const newSheet = this._ss.insertSheet(sheetConfig.name);
            newSheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
        }
    }

    // Adiciona dados de autenticação (monitores e secretários)
    const monitoresSheet = this._ss.getSheetByName(CONFIG.SHEETS.MONITORES);
    monitoresSheet.appendRow(['MON-TEST', 'Monitor de Teste', '11111111111', 'monitor@test.com', 'ROTA-TESTE-01', 'ATIVO']);

    const secretariosSheet = this._ss.getSheetByName(CONFIG.SHEETS.SECRETARIOS);
    secretariosSheet.appendRow(['SEC-TEST', 'Secretário de Teste', '33333333333', 'secretary@test.com', 'Escola Teste', 'ATIVO']);

    // Cria rotas de teste necessárias
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'ROTA-TESTE-01', 'Vagas_Totais_no_Veiculo': 20 });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'ROTA-UPDATED', 'Vagas_Totais_no_Veiculo': 20 });
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'ROTA-INITIAL', 'Vagas_Totais_no_Veiculo': 20 });

    SpreadsheetApp.flush();
  },

  /**
   * Limpa o ambiente após os testes.
   */
  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: authenticate monitor success': function() {
    const result = FormService.authenticate('11111111111', 'sedftop26');
    if (!result.success || result.user.role !== 'MONITOR') {
      throw new Error('Autenticação de monitor falhou.');
    }
  },

  'test: authenticate secretary success': function() {
    const result = FormService.authenticate('33333333333', 'admin123');
    if (!result.success || result.user.role !== 'SECRETARY') {
      throw new Error('Autenticação de secretário falhou.');
    }
  },

  'test: authenticate invalid credentials': function() {
    const result = FormService.authenticate('11111111111', 'wrongpassword');
    if (result.success || result.message !== CONFIG.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS) {
      throw new Error('Autenticação com credenciais inválidas falhou.');
    }
  },

  'test: authenticate inactive user': function() {
    // Make a monitor inactive for this test
    const monitoresSheet = this._ss.getSheetByName(CONFIG.SHEETS.MONITORES);
    monitoresSheet.getRange(2, 6).setValue('INATIVO'); // Assuming Status is 6th column
    SpreadsheetApp.flush();

    const result = FormService.authenticate('11111111111', 'sedftop26');
    if (result.success || result.message !== CONFIG.ERROR_MESSAGES.AUTH.USER_INACTIVE) {
      throw new Error('Autenticação de usuário inativo falhou.');
    }
    // Restore status
    monitoresSheet.getRange(2, 6).setValue('ATIVO');
    SpreadsheetApp.flush();
  },

  'test: authenticate user not found': function() {
    const result = FormService.authenticate('99999999999', 'anypassword');
    if (result.success || result.message !== 'Usuário não encontrado.') {
      throw new Error('Autenticação de usuário não encontrado falhou.');
    }
  },

  /**
   * Testa a submissão de um formulário de aluno com dados válidos.
   */
  'test: submit valid student form': function() {
    const formData = {
      'Nome_Completo': 'João da Silva Teste',
      'CPF': '123.456.789-00',
      'ID_Rota': 'ROTA-TESTE-01',
      'Celular_Responsavel': '(61) 99999-8888',
      'Nome_Acompanhante': 'Maria da Silva (Mãe)',
      'Endereco': 'Rua dos Testes, 123'
    };
    const authData = { celular: '33333333333', senha: 'admin123' }; // Secretário válido

    const result = FormService.submitForm('alunos', formData, authData);

    if (!result.success) {
      throw new Error(`A submissão falhou quando deveria ter passado: ${result.message}`);
    }

    const sheet = this._ss.getSheetByName(CONFIG.SHEETS.ALUNOS);
    const lastRowData = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
    const submittedData = CONFIG.HEADERS.ALUNOS.reduce((obj, header, index) => {
      obj[header] = lastRowData[index];
      return obj;
    }, {});

    if (submittedData.Nome_Completo !== 'João da Silva Teste') {
      throw new Error(`Nome do aluno incorreto. Esperado: 'João da Silva Teste', Salvo: '${submittedData.Nome_Completo}'`);
    }
    if (String(submittedData.CPF).replace(/\D/g,'') !== '12345678900') {
      throw new Error(`CPF incorreto. Esperado: '12345678900', Salvo: '${submittedData.CPF}'`);
    }
  },

  /**
   * Testa a submissão de um formulário de aluno com um campo obrigatório faltando.
   */
  'test: submit student form with missing required field': function() {
    const formData = {
      'Nome_Completo': 'Ana Pereira Teste',
      // CPF é obrigatório mas está faltando
      'ID_Rota': 'ROTA-TESTE-01',
      'Celular_Responsavel': '(61) 98888-7777'
    };
    const authData = { celular: '33333333333', senha: 'admin123' };

    const result = FormService.submitForm('alunos', formData, authData);

    if (result.success) {
      throw new Error('A submissão passou quando deveria ter falhado por falta de campo obrigatório.');
    }
    if (!result.message.toLowerCase().includes('obrigatório')) {
      throw new Error(`A mensagem de erro não indica campo obrigatório. Mensagem: ${result.message}`);
    }
  },

  /**
   * Testa a submissão de um formulário com um usuário sem permissão.
   */
  'test: submit student form with permission denied': function() {
    const formData = {
      'Nome_Completo': 'Pedro Teste',
      'CPF': '987.654.321-00',
      'ID_Rota': 'ROTA-TESTE-01',
      'Celular_Responsavel': '(61) 97777-6666'
    };
    const authData = { celular: '11111111111', senha: 'sedftop26' }; // Monitor (não tem permissão para cadastrar aluno)

    const result = FormService.submitForm('alunos', formData, authData);

    if (result.success) {
      throw new Error('A submissão passou quando deveria ter sido negada por falta de permissão.');
    }
    if (!result.message.includes(CONFIG.ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS)) {
      throw new Error(`A mensagem de erro não indica falta de permissão. Mensagem: ${result.message}`);
    }
  },

  /**
   * Testa a atualização de um aluno existente.
   */
  'test: submit student form to update existing student': function() {
    const authData = { celular: '33333333333', senha: 'admin123' };
    // Primeiro, cadastra um aluno
    const initialData = {
      'Nome_Completo': 'Carlos de Andrade',
      'CPF': '111.222.333-44',
      'ID_Rota': 'ROTA-INITIAL',
      'Celular_Responsavel': '(61) 91111-2222',
      'Nome_Acompanhante': '', // Add this
      'Endereco': 'Endereço Inicial' // Add this
    };
    FormService.submitForm('alunos', initialData, authData);

    // Agora, submete o mesmo CPF com dados diferentes para atualizar
    const updatedData = {
      'Nome_Completo': 'Carlos de Andrade (Atualizado)',
      'CPF': '111.222.333-44',
      'ID_Rota': 'ROTA-UPDATED',
      'Celular_Responsavel': '(61) 93333-4444',
      'Nome_Acompanhante': 'Acompanhante Atualizado', // Add this
      'Endereco': 'Endereço Atualizado' // Add this
    };

    const result = FormService.submitForm('alunos', updatedData, authData);

    if (!result.success) {
      throw new Error(`A atualização falhou quando deveria ter passado: ${result.message}`);
    }

    const found = SheetService.findRow(CONFIG.SHEETS.ALUNOS, 'CPF', '11122233344');
    if (!found) {
        throw new Error('Não foi possível encontrar o aluno atualizado pelo CPF.');
    }

    if (found.rowData.Nome_Completo !== 'Carlos de Andrade (Atualizado)') {
      throw new Error(`O nome não foi atualizado. Esperado: 'Carlos de Andrade (Atualizado)', Salvo: '${found.rowData.Nome_Completo}'`);
    }
     if (found.rowData.ID_Rota !== 'ROTA-UPDATED') {
      throw new Error(`A rota não foi atualizada. Esperado: 'ROTA-UPDATED', Salvo: '${found.rowData.ID_Rota}'`);
    }
  },

  'test: submit valid monitor form': function() {
    const formData = {
      'ID_Monitor': 'MON-NEW',
      'Nome_Completo': 'Novo Monitor Teste',
      'Celular_Monitor': '22222222222',
      'Email_Monitor': 'novo.monitor@test.com',
      'ID_Rota': 'ROTA-TESTE-01',
      'Status': 'ATIVO'
    };
    const authData = { celular: '33333333333', senha: 'admin123' }; // Secretário válido

    const result = FormService.submitForm('monitores', formData, authData);

    if (!result.success) {
      throw new Error(`A submissão de monitor falhou quando deveria ter passado: ${result.message}`);
    }

    const sheet = this._ss.getSheetByName(CONFIG.SHEETS.MONITORES);
    const found = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'MON-NEW');
    if (!found || found.rowData.Nome_Completo !== 'Novo Monitor Teste') {
      throw new Error('Submissão de monitor falhou: dados não encontrados ou incorretos.');
    }
  },

  'test: auditSheetData deve identificar dados inválidos': function() {
    const monitoresSheet = this._ss.getSheetByName(CONFIG.SHEETS.MONITORES);
    const originalData = monitoresSheet.getDataRange().getValues();

    // Cenário 1: Dados válidos
    let report = FormService.auditSheetData(CONFIG.SHEETS.MONITORES);
    if (!report.success) {
      throw new Error(`auditSheetData falhou em dados válidos: ${JSON.stringify(report.errors)}`);
    }

    // Cenário 2: CPF inválido (adicionar um aluno com CPF inválido)
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, {
      'Nome_Completo': 'Aluno CPF Invalido',
      'CPF': '123',
      'ID_Rota': 'ROTA-TESTE-01',
      'Celular_Responsavel': '11999998888'
    });
    report = FormService.auditSheetData(CONFIG.SHEETS.ALUNOS);
    if (report.success || !report.errors.some(e => e.includes('CPF inválido'))) {
      throw new Error('auditSheetData falhou em identificar CPF inválido.');
    }
    // Limpar o aluno adicionado para não afetar outros testes
    const alunoSheet = this._ss.getSheetByName(CONFIG.SHEETS.ALUNOS);
    alunoSheet.deleteRow(alunoSheet.getLastRow());

    // Cenário 3: Celular inválido (modificar um monitor existente)
    monitoresSheet.getRange(2, 3).setValue('123'); // Assuming Celular_Monitor is 3rd column
    SpreadsheetApp.flush();
    report = FormService.auditSheetData(CONFIG.SHEETS.MONITORES);
    if (report.success || !report.errors.some(e => e.includes('Celular inválido'))) {
      throw new Error('auditSheetData falhou em identificar Celular inválido.');
    }
    // Restaurar dados originais
    monitoresSheet.getRange(2, 3).setValue(originalData[1][2]);
    SpreadsheetApp.flush();

    // Cenário 4: Email inválido (modificar um monitor existente)
    monitoresSheet.getRange(2, 4).setValue('invalid-email'); // Assuming Email_Monitor is 4th column
    SpreadsheetApp.flush();
    report = FormService.auditSheetData(CONFIG.SHEETS.MONITORES);
    if (report.success || !report.errors.some(e => e.includes('Email inválido'))) {
      throw new Error('auditSheetData falhou em identificar Email inválido.');
    }
    // Restaurar dados originais
    monitoresSheet.getRange(2, 4).setValue(originalData[1][3]);
    SpreadsheetApp.flush();

    // Cenário 5: Data inválida (se houver um campo de data em monitores, ou adicionar um temporário)
    // Para este exemplo, vamos assumir que não há um campo de data em monitores para simplificar.
    // Se houvesse, o teste seria similar aos anteriores.

    // Restaurar a planilha de monitores para o estado original
    monitoresSheet.clearContents();
    monitoresSheet.getRange(1, 1, originalData.length, originalData[0].length).setValues(originalData);
    SpreadsheetApp.flush();
  },

  'test: dados registrados via FormService aderem ao cabeçalho': function() {
    const sheetsToCheck = [
      CONFIG.SHEETS.ALUNOS,
      CONFIG.SHEETS.ROTAS,
      CONFIG.SHEETS.MONITORES,
      CONFIG.SHEETS.SECRETARIOS
    ].filter(Boolean);

    for (const sheetName of sheetsToCheck) {
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
 * Executa todos os testes de integração do FormService.
 */
function runFormServiceIntegrationTests() {
  TestRunner.run('Serviço de Formulários (FormService.gs)', FormServiceIntegrationTestSuite);
}
