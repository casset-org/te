/**
 * @file AttendanceService.test.gs
 * @description Testes para a função getStudentFullHistory em AttendanceService.
 */

const AttendanceServiceTest = {

  _originalConfigId: null,
  _ss: null,

  setup: function() {
    if (!TestConfig.TEST_SPREADSHEET_ID) {
      throw new Error("ID da planilha de teste não configurado em TestConfig.gs");
    }
    this._originalConfigId = CONFIG.SPREADSHEET_ID;
    CONFIG.SPREADSHEET_ID = TestConfig.TEST_SPREADSHEET_ID;
    this._ss = SpreadsheetApp.openById(TestConfig.TEST_SPREADSHEET_ID);

    const sheetsToSetup = [
      { name: CONFIG.SHEETS.FREQUENCIA_IDA, headers: CONFIG.HEADERS.FREQUENCIA_IDA },
      { name: CONFIG.SHEETS.FREQUENCIA_VOLTA, headers: CONFIG.HEADERS.FREQUENCIA_VOLTA },
      { name: CONFIG.SHEETS.ALUNOS, headers: CONFIG.HEADERS.ALUNOS },
      { name: CONFIG.SHEETS.ROTAS, headers: CONFIG.HEADERS.ROTAS },
      { name: CONFIG.SHEETS.INCIDENTES, headers: CONFIG.HEADERS.INCIDENTES },
    ];

    for (const sheetConfig of sheetsToSetup) {
      const sheet = this._ss.getSheetByName(sheetConfig.name);
      if (!sheet) {
        const newSheet = this._ss.insertSheet(sheetConfig.name);
        newSheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
      } else {
        sheet.clearContents();
        sheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
      }
    }

    // Dados de mock
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-TEST-01', 'Nome_Escola': 'Escola Teste', 'Turno': 'Matutino' });
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'A01', 'Nome_Completo': 'Aluno Teste 1', 'ID_Rota': 'R-TEST-01' });

    // Frequência IDA
    SheetService.appendRow(CONFIG.SHEETS.FREQUENCIA_IDA, { 'Data_Frequencia': '2025-08-01', 'ID_Rota': 'R-TEST-01', 'Alunos_Presentes_Ida': 'A01', 'Alunos_Ausentes_Ida': '' });
    SheetService.appendRow(CONFIG.SHEETS.FREQUENCIA_IDA, { 'Data_Frequencia': '2025-08-02', 'ID_Rota': 'R-TEST-01', 'Alunos_Presentes_Ida': '', 'Alunos_Ausentes_Ida': 'A01' });

    // Frequência VOLTA
    SheetService.appendRow(CONFIG.SHEETS.FREQUENCIA_VOLTA, { 'Data_Frequencia': '2025-08-01', 'ID_Rota': 'R-TEST-01', 'Alunos_Presentes_Volta': 'A01', 'Alunos_Ausentes_Volta': '' });
    SheetService.appendRow(CONFIG.SHEETS.FREQUENCIA_VOLTA, { 'Data_Frequencia': '2025-08-03', 'ID_Rota': 'R-TEST-01', 'Alunos_Presentes_Volta': 'A01', 'Alunos_Ausentes_Volta': '' }); // Lacuna

    // Incidente
    SheetService.appendRow(CONFIG.SHEETS.INCIDENTES, { 'Data_Incidente': '2025-08-01', 'ID_Rota': 'R-TEST-01', 'Envolvidos': 'A01', 'Tipo_Incidente': 'Comportamento', 'Descricao': 'Aluno se comportou bem.' });

    // Anomalias
    SheetService.appendRow(CONFIG.SHEETS.FREQUENCIA_IDA, { 'Data_Frequencia': '2025-08-04', 'ID_Rota': 'R-TEST-01', 'Alunos_Presentes_Ida': 'A01', 'Alunos_Ausentes_Ida': 'A01' }); // Presente e ausente
    SheetService.appendRow(CONFIG.SHEETS.FREQUENCIA_IDA, { 'Data_Frequencia': '2025-08-05', 'ID_Rota': 'R-TEST-02', 'Alunos_Presentes_Ida': 'A01', 'Alunos_Ausentes_Ida': '' }); // Rota errada

    SpreadsheetApp.flush();
  },

  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: getStudentFullHistory should return complete and correct history': function() {
    this.setup();
    const result = AttendanceService.getStudentFullHistory('A01');

    if (!result.success) {
      throw new Error('A função getStudentFullHistory falhou.');
    }

    const history = result.history;

    // 1. Testa Frequência
    if (history.frequencia.length !== 6) {
      throw new Error(`Esperado 6 registros de frequência, mas obteve ${history.frequencia.length}`);
    }
    if (history.frequencia.filter(f => f.presente).length !== 4) {
        throw new Error(`Esperado 4 registros de presença, mas obteve ${history.frequencia.filter(f => f.presente).length}`);
    }
    if (history.frequencia.filter(f => f.ausente).length !== 2) {
        throw new Error(`Esperado 2 registros de ausência, mas obteve ${history.frequencia.filter(f => f.ausente).length}`);
    }

    // 2. Testa Incidentes
    if (history.incidentes.length !== 1) {
      throw new Error(`Esperado 1 incidente, mas obteve ${history.incidentes.length}`);
    }
    if (history.incidentes[0].tipo !== 'Comportamento') {
      throw new Error(`Tipo de incidente incorreto: ${history.incidentes[0].tipo}`);
    }

    // 3. Testa Lacunas
    if (history.lacunas.length !== 1) {
      throw new Error(`Esperado 1 lacuna, mas obteve ${history.lacunas.length}`);
    }
    if (history.lacunas[0].diasSemRegistro !== 1) {
      throw new Error(`Número de dias sem registro incorreto: ${history.lacunas[0].diasSemRegistro}`);
    }

    // 4. Testa Anomalias
    if (history.anomalias.length !== 2) {
      throw new Error(`Esperado 2 anomalias, mas obteve ${history.anomalias.length}`);
    }
    const anomaliaTipos = history.anomalias.map(a => a.tipo).sort();
    if (anomaliaTipos[0] !== 'Aluno marcado como presente e ausente' || anomaliaTipos[1] !== 'Aluno registrado em rota diferente') {
        throw new Error(`Tipos de anomalias incorretos: ${anomaliaTipos}`);
    }

    this.teardown();
  }
};

function runAttendanceServiceTests() {
  TestRunner.run('Serviço de Frequência (AttendanceService.gs) - Testes de Histórico', AttendanceServiceTest);
}
