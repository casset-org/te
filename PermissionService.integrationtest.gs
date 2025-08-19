/**
 * @file PermissionService.integrationtest.gs
 * @description Testes de integração para o PermissionService.
 * Estes testes não modificam dados da planilha, mas seguem a estrutura de testes de integração.
 */

const PermissionServiceIntegrationTestSuite = {

  _originalConfigId: null,

  /**
   * Prepara o ambiente de teste.
   */
  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }

    // Redireciona o CONFIG para usar a planilha de teste durante a execução do teste
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;

    // Não há necessidade de manipular sheets para este serviço, pois as permissões são hardcoded.
  },

  /**
   * Restaura a configuração original após cada teste.
   */
  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: Monitor deve ter permissão para frequencia-ida': function() {
    const hasPermission = PermissionService.canSubmit('MONITOR', 'frequencia-ida');
    if (!hasPermission) {
      throw new Error('Monitor deveria ter permissão para frequencia-ida.');
    }
  },

  'test: Monitor deve ter permissão para frequencia-volta': function() {
    const hasPermission = PermissionService.canSubmit('MONITOR', 'frequencia-volta');
    if (!hasPermission) {
      throw new Error('Monitor deveria ter permissão para frequencia-volta.');
    }
  },

  'test: Monitor não deve ter permissão para alunos': function() {
    const hasPermission = PermissionService.canSubmit('MONITOR', 'alunos');
    if (hasPermission) {
      throw new Error('Monitor não deveria ter permissão para alunos.');
    }
  },

  'test: Secretary deve ter permissão para alunos': function() {
    const hasPermission = PermissionService.canSubmit('SECRETARY', 'alunos');
    if (!hasPermission) {
      throw new Error('Secretary deveria ter permissão para alunos.');
    }
  },

  'test: Secretary deve ter permissão para ponto-facultativo': function() {
    const hasPermission = PermissionService.canSubmit('SECRETARY', 'ponto-facultativo');
    if (!hasPermission) {
      throw new Error('Secretary deveria ter permissão para ponto-facultativo.');
    }
  },

  'test: Secretary não deve ter permissão para frequencia-ida': function() {
    const hasPermission = PermissionService.canSubmit('SECRETARY', 'frequencia-ida');
    if (hasPermission) {
      throw new Error('Secretary não deveria ter permissão para frequencia-ida.');
    }
  },

  'test: canSubmit deve retornar false para papel desconhecido': function() {
    const hasPermission = PermissionService.canSubmit('UNKNOWN_ROLE', 'alunos');
    if (hasPermission) {
      throw new Error('canSubmit deveria retornar false para papel desconhecido.');
    }
  },

  'test: canSubmit deve retornar false para tipo de formulário desconhecido': function() {
    const hasPermission = PermissionService.canSubmit('MONITOR', 'formulario-desconhecido');
    if (hasPermission) {
      throw new Error('canSubmit deveria retornar false para tipo de formulário desconhecido.');
    }
  },
};

/**
 * Ponto de entrada para executar os testes de integração deste módulo.
 */
function runPermissionServiceIntegrationTests() {
  TestRunner.run('Serviço de Permissão (PermissionService.gs)', PermissionServiceIntegrationTestSuite);
}
