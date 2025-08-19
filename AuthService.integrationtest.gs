/**
 * @file AuthService.integrationtest.gs
 * @description Testes de integração para o AuthService.
 * ESTES TESTES MODIFICAM DADOS DIRETAMENTE NA PLANILHA DE TESTE.
 */

const AuthServiceIntegrationTestSuite = {

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

    // Limpa e prepara as abas de autenticação
    const sheetsToSetup = {
      [CONFIG.SHEETS.MONITORES]: CONFIG.HEADERS.MONITORES,
      [CONFIG.SHEETS.SECRETARIOS]: CONFIG.HEADERS.SECRETARIOS,
      [CONFIG.SHEETS.ESCOLAS]: CONFIG.HEADERS.ESCOLAS,
    };

    for (const sheetName in sheetsToSetup) {
      let sheet = this._ss.getSheetByName(sheetName);
      if (!sheet) {
        // Cria a aba se não existir
        sheet = this._ss.insertSheet(sheetName);
      }
      sheet.clearContents();
      const headers = sheetsToSetup[sheetName];
      if (headers) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }

    // Adiciona dados de teste
    const monitoresSheet = this._ss.getSheetByName(CONFIG.SHEETS.MONITORES);
    monitoresSheet.appendRow(['MON001', 'Monitor Ativo Teste', '11111111111', 'ativo@teste.com', 'R01', 'ATIVO']);
    monitoresSheet.appendRow(['MON002', 'Monitor Inativo Teste', '22222222222', 'inativo@teste.com', 'R02', 'INATIVO']);

    const secretariosSheet = this._ss.getSheetByName(CONFIG.SHEETS.SECRETARIOS);
    secretariosSheet.appendRow(['SEC001', 'Secretario Ativo Teste', '33333333333', 'sec_ativo@teste.com', 'Escola A', 'ATIVO']);

    const escolasSheet = this._ss.getSheetByName(CONFIG.SHEETS.ESCOLAS);
    escolasSheet.appendRow(['Escola B', 'Secretario Escola Ativo', '44444444444', 'escola_ativo@teste.com', 'Endereço B', 'ATIVO']);
    escolasSheet.appendRow(['Escola C', 'Secretario Escola Inativo', '55555555555', 'escola_inativo@teste.com', 'Endereço C', 'INATIVO']);

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

  'test: Autenticação de Monitor Válido deve retornar sucesso e role correta': function() {
    const result = AuthService.authenticate('11111111111', 'sedftop26');
    if (!result.success || result.user.role !== 'MONITOR' || result.user.id !== 'MON001') {
      throw new Error(`Falha na autenticação de monitor válido. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: Autenticação de Secretário Válido (aba Secretarios) deve retornar sucesso': function() {
    const result = AuthService.authenticate('33333333333', 'admin123');
    if (!result.success || result.user.role !== 'SECRETARY' || result.user.id !== 'SEC001') {
      throw new Error(`Falha na autenticação de secretário válido. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: Autenticação de Secretário Válido (aba Escolas) deve retornar sucesso': function() {
    const result = AuthService.authenticate('44444444444', 'admin123');
    if (!result.success || result.user.role !== 'SECRETARY' || result.user.nome !== 'Secretario Escola Ativo') {
      throw new Error(`Falha na autenticação de secretário da aba Escolas. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: Autenticação deve falhar para Monitor Inativo': function() {
    const result = AuthService.authenticate('22222222222', 'sedftop26');
    if (result.success || result.message !== CONFIG.ERROR_MESSAGES.AUTH.USER_INACTIVE) {
      throw new Error(`Autenticação de monitor inativo deveria falhar com a mensagem correta. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: Autenticação deve falhar para Secretário Inativo': function() {
    const result = AuthService.authenticate('55555555555', 'admin123');
    if (result.success || result.message !== CONFIG.ERROR_MESSAGES.AUTH.USER_INACTIVE) {
      throw new Error(`Autenticação de secretário inativo deveria falhar com a mensagem correta. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: Autenticação deve falhar com Senha de Monitor Inválida': function() {
    const result = AuthService.authenticate('11111111111', 'senha_errada');
    if (result.success || result.message !== CONFIG.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS) {
      throw new Error(`Autenticação com senha de monitor inválida deveria falhar. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: Autenticação deve falhar com Senha de Secretário Inválida': function() {
    const result = AuthService.authenticate('33333333333', 'senha_errada');
    if (result.success || result.message !== CONFIG.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS) {
      throw new Error(`Autenticação com senha de secretário inválida deveria falhar. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: Autenticação deve falhar para Usuário Não Encontrado': function() {
    const result = AuthService.authenticate('99999999999', 'qualquer_senha');
    if (result.success || result.message !== 'Usuário não encontrado.') {
      throw new Error(`Autenticação de usuário inexistente deveria falhar. Resultado: ${JSON.stringify(result)}`);
    }
  },

  'test: Autenticação deve falhar com Celular ou Senha Nulos': function() {
    const result1 = AuthService.authenticate(null, 'admin123');
    const result2 = AuthService.authenticate('33333333333', null);
    const result3 = AuthService.authenticate('', '');

    if (result1.success || result2.success || result3.success) {
      throw new Error('Autenticação com credenciais ausentes deveria falhar.');
    }
    if (result1.message !== 'Celular e senha são obrigatórios.') {
        throw new Error('Mensagem de erro incorreta para credenciais ausentes.');
    }
  },

  /**
   * Testa se todos os dados de autenticação aderem ao cabeçalho das abas de autenticação.
   */
  'test: dados de autenticação aderem ao cabeçalho': function() {
    const sheetsToCheck = [
      CONFIG.SHEETS.MONITORES,
      CONFIG.SHEETS.SECRETARIOS,
      CONFIG.SHEETS.ESCOLAS
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
 * Ponto de entrada para executar os testes de integração deste módulo.
 */
function runAuthServiceIntegrationTests() {
  TestRunner.run('Serviço de Autenticação (AuthService.gs)', AuthServiceIntegrationTestSuite);
}
