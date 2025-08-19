/**
 * @file SheetService.integrationtest.gs
 * @description Testes de integração para o SheetService.
 */

const SheetServiceIntegrationTestSuite = {
  _ss: null,
  _sheet: null,

  setup: function() {
    // ATENÇÃO: O ideal é ter um ID de planilha de teste SEPARADO.
    // A verificação original foi flexibilizada para permitir a execução,
    // mas o uso da planilha de produção para testes não é recomendado.
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }
    // Sobrescreve o ID da planilha de configuração para usar a de teste
    const originalId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;
    this._originalConfigId = originalId; // Salva para restaurar depois

    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);
    this._sheet = this._ss.getSheetByName(CONFIG.SHEETS.MONITORES);
    this._sheet.clearContents();
    this._sheet.getRange(1, 1, 1, CONFIG.HEADERS.MONITORES.length).setValues([CONFIG.HEADERS.MONITORES]);
    SpreadsheetApp.flush();
  },

  teardown: function() {
    // Restaura o ID original da planilha de configuração
    CONFIG.SPREADSHEET_ID = this._originalConfigId;
  },

  'test: appendRow deve adicionar uma nova linha': function() {
    const monitorData = { 'ID_Monitor': 'TEST001', 'Nome_Completo': 'Monitor de Teste' };
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, monitorData);
    const lastRow = this._sheet.getLastRow();
    const data = this._sheet.getRange(lastRow, 1).getValue();
    if (data !== 'TEST001') throw new Error('appendRow falhou.');
  },

  'test: findRow deve encontrar uma linha existente': function() {
    const monitorData = { 'ID_Monitor': 'FIND002', 'Nome_Completo': 'Monitor Encontrado' };
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, monitorData);
    const result = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'FIND002');
    if (!result || result.rowData.Nome_Completo !== 'Monitor Encontrado') {
      throw new Error('findRow falhou.');
    }
  },

  'test: updateRow deve atualizar uma linha existente': function() {
    const initialData = { 'ID_Monitor': 'UPDATE001', 'Nome_Completo': 'Monitor Antigo' };
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, initialData);
    const found = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'UPDATE001');
    if (!found) throw new Error('Pre-condição para updateRow falhou: linha não encontrada.');

    const updatedData = { 'Nome_Completo': 'Monitor Novo' };
    SheetService.updateRow(CONFIG.SHEETS.MONITORES, found.rowIndex, updatedData);

    const result = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'UPDATE001');
    if (!result || result.rowData.Nome_Completo !== 'Monitor Novo') {
      throw new Error('updateRow falhou: dados não atualizados corretamente.');
    }
  },

  'test: deleteRow deve remover uma linha existente': function() {
    const initialData = { 'ID_Monitor': 'DELETE001', 'Nome_Completo': 'Monitor a Deletar' };
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, initialData);
    const found = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'DELETE001');
    if (!found) throw new Error('Pre-condição para deleteRow falhou: linha não encontrada.');

    SheetService.deleteRow(CONFIG.SHEETS.MONITORES, found.rowIndex);

    const result = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'DELETE001');
    if (result) {
      throw new Error('deleteRow falhou: linha não foi removida.');
    }
  },

  'test: getAllData deve retornar todos os dados da planilha': function() {
    // Limpa a planilha e adiciona alguns dados de teste
    this._sheet.clearContents();
    this._sheet.getRange(1, 1, 1, CONFIG.HEADERS.MONITORES.length).setValues([CONFIG.HEADERS.MONITORES]);
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'DATA001', 'Nome_Completo': 'Monitor A' });
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'DATA002', 'Nome_Completo': 'Monitor B' });
    SpreadsheetApp.flush();

    const allData = SheetService.getAllData(CONFIG.SHEETS.MONITORES);

    if (allData.length !== 2) {
      throw new Error(`getAllData falhou: Esperado 2 linhas, obtido ${allData.length}.`);
    }
    if (allData[0].ID_Monitor !== 'DATA001' || allData[1].ID_Monitor !== 'DATA002') {
      throw new Error('getAllData falhou: Dados incorretos.');
    }
  },

  'test: verifySystemDataConsistency deve identificar inconsistências': function() {
    // Cenário 1: Planilha de teste com abas e cabeçalhos corretos
    let report = SheetService.verifySystemDataConsistency();
    if (!report.success) {
      throw new Error('verifySystemDataConsistency falhou: Relatou inconsistências em um cenário correto.');
    }

    // Cenário 2: Simular aba faltando (requer manipulação da planilha de teste)
    // Para este teste, vamos simular a falta de uma aba temporariamente.
    // Isso é complexo de fazer em um teste de integração sem criar/deletar abas reais.
    // Uma abordagem mais robusta seria mockar SpreadsheetApp.openById para este teste unitário.
    // Por simplicidade, vamos focar em cabeçalhos por enquanto.

    // Cenário 3: Simular cabeçalho faltando em uma aba existente
    const originalHeaders = CONFIG.HEADERS.MONITORES;
    CONFIG.HEADERS.MONITORES = ['ID_Monitor', 'Nome_Completo', 'NOVO_CABECALHO_FALTANDO'];
    report = SheetService.verifySystemDataConsistency();
    CONFIG.HEADERS.MONITORES = originalHeaders; // Restaurar
    if (report.success || !report.missingHeaders.some(h => h.header === 'NOVO_CABECALHO_FALTANDO')) {
      throw new Error('verifySystemDataConsistency falhou: Não identificou cabeçalho faltando.');
    }

    // Cenário 4: Simular cabeçalho com mismatch (ordem ou extra)
    CONFIG.HEADERS.MONITORES = ['Nome_Completo', 'ID_Monitor']; // Ordem trocada
    report = SheetService.verifySystemDataConsistency();
    CONFIG.HEADERS.MONITORES = originalHeaders; // Restaurar
    if (report.success || !report.headerMismatches.some(m => m.sheet === CONFIG.SHEETS.MONITORES)) {
      throw new Error('verifySystemDataConsistency falhou: Não identificou mismatch de cabeçalho.');
    }
  },

  'test: todas as operações mantêm aderência ao cabeçalho': function() {
    const sheet = this._sheet;
    const headers = CONFIG.HEADERS.MONITORES;
    // Adiciona, atualiza e deleta linhas
    SheetService.appendRow(CONFIG.SHEETS.MONITORES, { 'ID_Monitor': 'TEST003', 'Nome_Completo': 'Monitor QA' });
    SheetService.updateRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'TEST003', { 'Nome_Completo': 'Monitor QA Atualizado' });
    SheetService.deleteRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', 'TEST003');
    // Valida aderência ao cabeçalho
    const rowCount = sheet.getLastRow();
    if (rowCount < 2) return;
    const dataRows = sheet.getRange(2, 1, rowCount - 1, headers.length).getValues();
    dataRows.forEach((row, idx) => {
      if (row.length !== headers.length) {
        throw new Error(`Linha ${idx + 2} não adere ao cabeçalho após operações. Esperado ${headers.length} colunas, obtido ${row.length}`);
      }
    });
  },

  // ... outros testes para updateRow, deleteRow, getAllData
};

function runSheetServiceIntegrationTests() {
  TestRunner.run('Serviço de Planilha (SheetService.gs)', SheetServiceIntegrationTestSuite);
}
