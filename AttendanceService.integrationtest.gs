/**
 * @file AttendanceService.integrationtest.gs
 * @description Testes de integração para o AttendanceService.
 */

const AttendanceServiceIntegrationTestSuite = {

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

    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-FREQ-01', 'Vagas_Totais_no_Veiculo': 10 });
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'A01', 'Nome_Completo': 'Aluno 1', 'CPF': '111', 'ID_Rota': 'R-FREQ-01', 'Celular_Responsavel': '61999999999' });
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'A02', 'Nome_Completo': 'Aluno 2', 'CPF': '222', 'ID_Rota': 'R-FREQ-01', 'Celular_Responsavel': '61988888888' });
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'A03', 'Nome_Completo': 'Aluno 3', 'CPF': '333', 'ID_Rota': 'R-FREQ-01', 'Celular_Responsavel': '61977777777' });
    SheetService.appendRow(CONFIG.SHEETS.ALUNOS, { 'ID_Aluno': 'A04', 'Nome_Completo': 'Aluno 4', 'CPF': '444', 'ID_Rota': 'OUTRA-ROTA', 'Celular_Responsavel': '61966666666' });

    SpreadsheetApp.flush();
  },

  teardown: function() {
    if (this._originalConfigId) {
      CONFIG.SPREADSHEET_ID = this._originalConfigId;
    }
  },

  'test: getAttendanceForRouteAndDateIda should retrieve existing record': function() {
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-11-01',
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Ida': ['A01']
    };
    AttendanceService.recordAttendanceIda(attendanceData, monitorUser);

    const result = AttendanceService.getAttendanceForRouteAndDateIda('R-FREQ-01', '2025-11-01');
    if (!result.success || !result.data || result.data.ID_Rota !== 'R-FREQ-01') {
      throw new Error(`getAttendanceForRouteAndDateIda falhou ao recuperar registro existente: ${JSON.stringify(result)}`);
    }
  },

  'test: getAttendanceForRouteAndDateIda should return null for non-existent record': function() {
    const result = AttendanceService.getAttendanceForRouteAndDateIda('R-FREQ-01', '2025-11-02');
    if (!result.success || result.data !== null) {
      throw new Error(`getAttendanceForRouteAndDateIda falhou ao retornar null para registro inexistente: ${JSON.stringify(result)}`);
    }
  },

  'test: getAttendanceForRouteAndDateVolta should retrieve existing record': function() {
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-11-01',
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Volta': ['A01']
    };
    AttendanceService.recordAttendanceVolta(attendanceData, monitorUser);

    const result = AttendanceService.getAttendanceForRouteAndDateVolta('R-FREQ-01', '2025-11-01');
    if (!result.success || !result.data || result.data.ID_Rota !== 'R-FREQ-01') {
      throw new Error(`getAttendanceForRouteAndDateVolta falhou ao recuperar registro existente: ${JSON.stringify(result)}`);
    }
  },

  'test: getAttendanceForRouteAndDateVolta should return null for non-existent record': function() {
    const result = AttendanceService.getAttendanceForRouteAndDateVolta('R-FREQ-01', '2025-11-02');
    if (!result.success || result.data !== null) {
      throw new Error(`getAttendanceForRouteAndDateVolta falhou ao retornar null para registro inexistente: ${JSON.stringify(result)}`);
    }
  },

  'test: getInitialDataForAttendanceForm should return routes and monitors': function() {
    // Ensure there are some routes and monitors in the test setup
    // (already handled in setup function)
    const result = AttendanceService.getInitialDataForAttendanceForm();
    if (!result.success || !result.data || !result.data.routes || !result.data.monitors) {
      throw new Error(`getInitialDataForAttendanceForm falhou: ${JSON.stringify(result)}`);
    }
    if (result.data.routes.length === 0) {
      throw new Error('getInitialDataForAttendanceForm retornou rotas vazias.');
    }
    if (result.data.monitors.length === 0) {
      throw new Error('getInitialDataForAttendanceForm retornou monitores vazios.');
    }
  },

  'test: checkAttendanceConsistency should identify inconsistencies': function() {
    // Setup: Add a record where present + absent != total students
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-12-01',
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Ida': ['A01'] // Only 1 present, 3 students on route
    };
    AttendanceService.recordAttendanceIda(attendanceData, monitorUser);

    const result = AttendanceService.checkAttendanceConsistency();
    if (result.success && result.inconsistencies.length === 0) {
      throw new Error('checkAttendanceConsistency falhou em identificar inconsistências.');
    }
    if (!result.inconsistencies.some(inc => inc.routeId === 'R-FREQ-01' && inc.date === '2025-12-01')) {
      throw new Error('Inconsistência esperada não encontrada no relatório.');
    }
  },

  'test: checkAttendanceStudentAssignmentConsistency should identify inconsistencies': function() {
    // Setup: Add a record with a student not belonging to the route
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-12-02',
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Ida': ['A01', 'A04'] // A04 does not belong to R-FREQ-01
    };
    AttendanceService.recordAttendanceIda(attendanceData, monitorUser);

    const result = AttendanceService.checkAttendanceStudentAssignmentConsistency();
    if (result.success && result.inconsistencies.length === 0) {
      throw new Error('checkAttendanceStudentAssignmentConsistency falhou em identificar inconsistências.');
    }
    if (!result.inconsistencies.some(inc => inc.routeId === 'R-FREQ-01' && inc.date === '2025-12-02' && inc.presentNotInRoute.includes('A04'))) {
      throw new Error('Inconsistência de aluno não pertencente à rota não encontrada.');
    }
  },

  'test: checkAttendanceUserAssignmentConsistency should identify inconsistencies': function() {
    // Setup: Add an attendance record with a non-existent monitor
    const freqIdaSheet = this._ss.getSheetByName(CONFIG.SHEETS.FREQUENCIA_IDA);
    freqIdaSheet.appendRow([
      new Date(), '2025-12-03', 'R-FREQ-01', 'MON-INEXISTENTE', '61999999999', 1, 2, 'A01', 'A02,A03', ''
    ]);
    SpreadsheetApp.flush();

    const result = AttendanceService.checkAttendanceUserAssignmentConsistency();
    if (result.success && result.inconsistencies.length === 0) {
      throw new Error('checkAttendanceUserAssignmentConsistency falhou em identificar inconsistências.');
    }
    if (!result.inconsistencies.some(inc => inc.type === 'Celular_Monitor' && inc.celular === '61999999999')) {
      throw new Error('Inconsistência de monitor inexistente não encontrada.');
    }
  },

  'test: checkInactiveUserNoNewRecords should identify records after inactivation': function() {
    // Setup: Make a monitor inactive and add a record after inactivation date
    const monitoresSheet = this._ss.getSheetByName(CONFIG.SHEETS.MONITORES);
    // Assuming MON-TESTE is at row 2, column 6 is Status, column 7 is Data_Inativacao
    monitoresSheet.getRange(2, 6).setValue('INATIVO');
    monitoresSheet.getRange(2, 7).setValue(new Date(2025, 11, 1)); // Inactivated on Dec 1st, 2025
    SpreadsheetApp.flush();

    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-12-05',
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Ida': ['A01']
    };
    AttendanceService.recordAttendanceIda(attendanceData, monitorUser);

    const result = AttendanceService.checkInactiveUserNoNewRecords();
    if (result.success && result.inconsistencies.length === 0) {
      throw new Error('checkInactiveUserNoNewRecords falhou em identificar registros após inativação.');
    }
    if (!result.inconsistencies.some(inc => inc.userId === 'MON-TESTE' && inc.recordDate.toISOString().slice(0, 10) === '2025-12-05')) {
      throw new Error('Inconsistência de registro após inativação não encontrada.');
    }

    // Restore monitor status
    monitoresSheet.getRange(2, 6).setValue('ATIVO');
    monitoresSheet.getRange(2, 7).clearContent();
    SpreadsheetApp.flush();
  },

  'test: checkRouteVehicleAssignment should identify inconsistencies': function() {
    // Setup: Add a route with a non-existent vehicle
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-VEIC-INEXIST', 'ID_Onibus': 'VEIC-999' });

    const result = AttendanceService.checkRouteVehicleAssignment();
    if (result.success && result.inconsistencies.length === 0) {
      throw new Error('checkRouteVehicleAssignment falhou em identificar inconsistências.');
    }
    if (!result.inconsistencies.some(inc => inc.routeId === 'R-VEIC-INEXIST' && inc.idOnibus === 'VEIC-999')) {
      throw new Error('Inconsistência de veículo inexistente não encontrada.');
    }
  },

  'test: checkSchoolNameConsistency should identify inconsistencies': function() {
    // Setup: Add a route with a non-existent school name
    SheetService.appendRow(CONFIG.SHEETS.ROTAS, { 'ID_Rota': 'R-ESC-INEXIST', 'Nome_Escola': 'Escola Inexistente' });

    const result = AttendanceService.checkSchoolNameConsistency();
    if (result.success && result.inconsistencies.length === 0) {
      throw new Error('checkSchoolNameConsistency falhou em identificar inconsistências.');
    }
    if (!result.inconsistencies.some(inc => inc.sheet === CONFIG.SHEETS.ROTAS && inc.nomeEscola === 'Escola Inexistente')) {
      throw new Error('Inconsistência de nome de escola inexistente não encontrada.');
    }
  },

  'test: checkVagasOcupadasConsistency should identify inconsistencies': function() {
    // Setup: Add a record in CONTROLE_DE_VAGAS with incorrect Vagas_Ocupadas
    // First, ensure CONTROLE_DE_VAGAS sheet exists and has headers
    let controleVagasSheet = this._ss.getSheetByName(CONFIG.SHEETS.CONTROLE_DE_VAGAS);
    if (!controleVagasSheet) {
      controleVagasSheet = this._ss.insertSheet(CONFIG.SHEETS.CONTROLE_DE_VAGAS);
      controleVagasSheet.getRange(1, 1, 1, CONFIG.HEADERS.CONTROLE_DE_VAGAS.length).setValues([CONFIG.HEADERS.CONTROLE_DE_VAGAS]);
    }
    controleVagasSheet.clearContents();
    controleVagasSheet.getRange(1, 1, 1, CONFIG.HEADERS.CONTROLE_DE_VAGAS.length).setValues([CONFIG.HEADERS.CONTROLE_DE_VAGAS]);

    // Add a control record for R-FREQ-01, but with incorrect occupied vagas
    SheetService.appendRow(CONFIG.SHEETS.CONTROLE_DE_VAGAS, { 'ID_Rota': 'R-FREQ-01', 'Vagas_Ocupadas': 1 }); // Should be 3 students

    const result = AttendanceService.checkVagasOcupadasConsistency();
    if (result.success && result.inconsistencies.length === 0) {
      throw new Error('checkVagasOcupadasConsistency falhou em identificar inconsistências.');
    }
    if (!result.inconsistencies.some(inc => inc.idRota === 'R-FREQ-01' && inc.vagasOcupadas === 1 && inc.expectedVagas === 3)) {
      throw new Error('Inconsistência de vagas ocupadas não encontrada.');
    }
  },

  'test: scanOrphanStudentRecords should identify orphan records': function() {
    // Setup: Add an attendance record with an orphan student ID
    const freqIdaSheet = this._ss.getSheetByName(CONFIG.SHEETS.FREQUENCIA_IDA);
    freqIdaSheet.appendRow([
      new Date(), '2025-12-04', 'R-FREQ-01', 'MON-TESTE', '61912345678', 1, 2, 'A999', 'A02,A03', ''
    ]); // A999 is an orphan student
    SpreadsheetApp.flush();

    const result = AttendanceService.scanOrphanStudentRecords();
    if (result.success && result.inconsistencies.length === 0) {
      throw new Error('scanOrphanStudentRecords falhou em identificar registros órfãos.');
    }
    if (!result.inconsistencies.some(inc => inc.idAluno === 'A999' && inc.sheet === CONFIG.SHEETS.FREQUENCIA_IDA)) {
      throw new Error('Registro órfão esperado não encontrado no relatório.');
    }
  },

  'test: recordAttendanceIda should register attendance and derive absent students correctly': function() {
    this.setup();
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceDateString = '2025-10-20';
    const attendanceData = {
      'Data_Frequencia': attendanceDateString,
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Ida': ['A01', 'A03']
    };
    const result = AttendanceService.recordAttendanceIda(attendanceData, monitorUser);
    if (!result.success) {
      throw new Error(`Registro de frequência de ida falhou inesperadamente: ${result.message}`);
    }
    const data = SheetService.findRow(CONFIG.SHEETS.FREQUENCIA_IDA, 'ID_Rota', 'R-FREQ-01').rowData;

    // Assertions for all fields to ensure consistent data generation
    if (!data.Timestamp) throw new Error(`Timestamp ausente: ${data.Timestamp}`);
    if (new Date(data.Data_Frequencia).toISOString().slice(0, 10) !== attendanceDateString) throw new Error(`Data_Frequencia incorreta: ${data.Data_Frequencia}`);
    if (data.ID_Rota !== 'R-FREQ-01') throw new Error(`ID_Rota incorreto: ${data.ID_Rota}`);
    if (data.ID_Monitor !== monitorUser.id) throw new Error(`ID_Monitor incorreto: ${data.ID_Monitor}`);
    if (data.Celular_Monitor !== monitorUser.celular) throw new Error(`Celular_Monitor incorreto: ${data.Celular_Monitor}`);

    if (data.Qtd_Presentes__Ida != 2) throw new Error(`Contagem de presentes incorreta: ${data.Qtd_Presentes__Ida}`);
    if (data.Qtd_Ausentes_Ida != 1) throw new Error(`Contagem de ausentes incorreta: ${data.Qtd_Ausentes_Ida}`);
    if (data.Alunos_Presentes_Ida !== 'A01, A03') throw new Error(`Lista de presentes incorreta: ${data.Alunos_Presentes_Ida}`);
    if (data.Alunos_Ausentes_Ida !== 'A02') throw new Error(`Lista de ausentes incorreta: ${data.Alunos_Ausentes_Ida}`);
    if (data.Observacoes !== '') throw new Error(`Observacoes incorreta: ${data.Observacoes}`);
  },

  'test: recordAttendanceVolta should register return attendance and derive absent students correctly': function() {
    this.setup();
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-10-20',
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Volta': ['A01', 'A03']
    };
    const result = AttendanceService.recordAttendanceVolta(attendanceData, monitorUser);
    if (!result.success) {
      throw new Error(`Registro de frequência de volta falhou inesperadamente: ${result.message}`);
    }
    const data = SheetService.findRow(CONFIG.SHEETS.FREQUENCIA_VOLTA, 'ID_Rota', 'R-FREQ-01').rowData;
    if (data.Qtd_Presentes__Volta != 2) throw new Error(`Contagem de presentes incorreta: ${data.Qtd_Presentes__Volta}`);
    if (data.Qtd_Ausentes_Volta != 1) throw new Error(`Contagem de ausentes incorreta: ${data.Qtd_Ausentes_Volta}`);
    if (data.Alunos_Ausentes_Volta !== 'A02') throw new Error(`Lista de ausentes incorreta: ${data.Alunos_Ausentes_Volta}`);
  },

  'test: recordAttendanceIda should prevent duplicate registration for the same day': function() {
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const date = '2025-10-25';
    const attendanceData = {
      'Data_Frequencia': date,
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Ida': ['A01']
    };
    
    AttendanceService.recordAttendanceIda(attendanceData, monitorUser);
    const secondResult = AttendanceService.recordAttendanceIda(attendanceData, monitorUser);

    if (secondResult.success) {
      throw new Error('O sistema permitiu o registro de frequência duplicado para o mesmo dia.');
    }
    if (!secondResult.message.includes('já foi registrada')) {
      throw new Error(`Mensagem de erro para registro duplicado está incorreta. Recebido: "${secondResult.message}"`);
    }
  },

  'test: recordAttendanceVolta should prevent duplicate registration for the same day': function() {
    this.setup();
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const date = '2025-10-25';
    const attendanceData = {
      'Data_Frequencia': date,
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Volta': ['A01']
    };
    
    AttendanceService.recordAttendanceVolta(attendanceData, monitorUser);
    const secondResult = AttendanceService.recordAttendanceVolta(attendanceData, monitorUser);

    if (secondResult.success) {
      throw new Error('O sistema permitiu o registro de frequência duplicado para o mesmo dia.');
    }
    if (!secondResult.message.includes('já foi registrada')) {
      throw new Error(`Mensagem de erro para registro duplicado está incorreta. Recebido: "${secondResult.message}"`);
    }
  },

  'test: recordAttendanceIda should fail if route does not exist': function() {
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-10-20',
      'ID_Rota': 'ROTA-INEXISTENTE',
      'Alunos_Presentes_Ida': ['A01']
    };
    const result = AttendanceService.recordAttendanceIda(attendanceData, monitorUser);
    if (result.success) {
      throw new Error('Deveria ter falhado para rota inexistente.');
    }
    if (!result.message.includes('não encontrada')) {
      throw new Error(`Mensagem de erro incorreta: ${result.message}`);
    }
  },

  'test: recordAttendanceVolta should fail if route does not exist': function() {
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-10-20',
      'ID_Rota': 'ROTA-INEXISTENTE',
      'Alunos_Presentes_Volta': ['A01']
    };
    const result = AttendanceService.recordAttendanceVolta(attendanceData, monitorUser);
    if (result.success) {
      throw new Error('Deveria ter falhado para rota inexistente.');
    }
    if (!result.message.includes('não encontrada')) {
      throw new Error(`Mensagem de erro incorreta: ${result.message}`);
    }
  },

  'test: recordAttendanceIda should fail if student does not belong to route': function() {
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-10-20',
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Ida': ['A04']
    };
    const result = AttendanceService.recordAttendanceIda(attendanceData, monitorUser);
    if (result.success) {
      throw new Error('Deveria ter falhado para aluno que não pertence a rota.');
    }
    if (!result.message.includes('não pertence à rota')) {
      throw new Error(`Mensagem de erro incorreta: ${result.message}`);
    }
  },

  'test: recordAttendanceVolta should fail if student does not belong to route': function() {
    this.setup();
    const monitorUser = { id: 'MON-TESTE', celular: '61912345678' };
    const attendanceData = {
      'Data_Frequencia': '2025-10-20',
      'ID_Rota': 'R-FREQ-01',
      'Alunos_Presentes_Volta': ['A04']
    };
    const result = AttendanceService.recordAttendanceVolta(attendanceData, monitorUser);
    if (result.success) {
      throw new Error('Deveria ter falhado para aluno que não pertence a rota.');
    }
    if (!result.message.includes('não pertence à rota')) {
      throw new Error(`Mensagem de erro incorreta: ${result.message}`);
    }
  }
};

function runAttendanceServiceIntegrationTests() {
  TestRunner.run('Serviço de Frequência (AttendanceService.gs)', AttendanceServiceIntegrationTestSuite);
}