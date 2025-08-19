/**
 * @file AttendanceService.gs
 * @description Serviço de Negócio para o registro de Frequência.
 */

const AttendanceService = {

  /**
   * Busca todos os registros de frequência de IDA para uma rota e data específicas.
   * @param {string} routeId O ID da rota.
   * @param {string} dateString A data no formato 'YYYY-MM-DD'.
   * @returns {Array<object>} Um array de registros de frequência encontrados.
   */
  getAttendanceForRouteAndDateIda: function(routeId, dateString) {
    try {
      const allAttendance = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_IDA);
      const targetDateStr = (typeof dateString === 'string')
        ? dateString.slice(0, 10)
        : new Date(dateString).toISOString().slice(0, 10);

      const foundRecords = allAttendance.filter(record => {
        let recordDateStr;
        if (record.Data_Frequencia instanceof Date) {
          recordDateStr = record.Data_Frequencia.toISOString().slice(0, 10);
        } else if (typeof record.Data_Frequencia === 'string') {
          recordDateStr = record.Data_Frequencia.slice(0, 10);
        } else {
          recordDateStr = '';
        }
        return record.ID_Rota === routeId && recordDateStr === targetDateStr;
      });

      return { success: true, data: foundRecords };
    } catch (e) {
      LoggerService.logEvent('AttendanceService', LoggerService.LEVELS.ERROR, 'Erro ao buscar frequência de ida.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Erro ao buscar dados de frequência de ida.', data: [] };
    }
  },

  /**
   * Busca todos os registros de frequência de VOLTA para uma rota e data específicas.
   * @param {string} routeId O ID da rota.
   * @param {string} dateString A data no formato 'YYYY-MM-DD'.
   * @returns {Array<object>} Um array de registros de frequência encontrados.
   */
  getAttendanceForRouteAndDateVolta: function(routeId, dateString) {
    try {
      const allAttendance = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_VOLTA);
      const targetDateStr = (typeof dateString === 'string')
        ? dateString.slice(0, 10)
        : new Date(dateString).toISOString().slice(0, 10);

      const foundRecords = allAttendance.filter(record => {
        let recordDateStr;
        if (record.Data_Frequencia instanceof Date) {
          recordDateStr = record.Data_Frequencia.toISOString().slice(0, 10);
        } else if (typeof record.Data_Frequencia === 'string') {
          recordDateStr = record.Data_Frequencia.slice(0, 10);
        } else {
          recordDateStr = '';
        }
        return record.ID_Rota === routeId && recordDateStr === targetDateStr;
      });

      return { success: true, data: foundRecords };
    } catch (e) {
      LoggerService.logEvent('AttendanceService', LoggerService.LEVELS.ERROR, 'Erro ao buscar frequência de volta.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Erro ao buscar dados de frequência de volta.', data: [] };
    }
  },

  /**
   * Valida, enriquece e registra um evento de frequência de IDA.
   * @param {Array<object>} attendanceRecords Array de objetos de frequência, cada um representando um aluno.
   * @param {object} monitorUser O objeto do monitor autenticado.
   * @returns {{success: boolean, message: string}} Objeto de resultado.
   */
  recordAttendanceIda: function(attendanceRecords, monitorUser) {
    try {
      if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
        return { success: false, message: 'Nenhum registro de frequência fornecido.' };
      }

      const routeId = attendanceRecords[0].ID_Rota;
      const attendanceDate = new Date(attendanceRecords[0].Data_Frequencia);
      attendanceDate.setHours(0, 0, 0, 0);

      // Valida a existência da Rota (apenas uma vez para todos os registros)
      const routeResult = RouteService.getRouteDetails(routeId);
      if (!routeResult.success) {
        return routeResult;
      }

      // Processa e adiciona cada registro individualmente
      for (const record of attendanceRecords) {
        // Basic validation for each record
        if (!record.Nome_Aluno || !record.RA_Aluno || !record.Status_Frequencia) {
          LoggerService.logEvent('AttendanceService', LoggerService.LEVELS.WARN, 'Registro de frequência incompleto.', { record });
          continue; // Skip incomplete records
        }

        const finalRecord = {
          'Timestamp': new Date(),
          'Data_Frequencia': attendanceDate,
          'ID_Rota': routeId,
          'ID_Monitor': monitorUser.id,
          'Celular_Monitor': monitorUser.celular,
          'Nome_Aluno': record.Nome_Aluno,
          'RA_Aluno': record.RA_Aluno,
          'Status_Frequencia': record.Status_Frequencia,
          'Observacoes': record.Observacoes || '',
          'Latitude': record.Latitude || '',
          'Longitude': record.Longitude || '',
          'Foto_URL': record.Foto_URL || ''
        };

        SheetService.appendRow(CONFIG.SHEETS.FREQUENCIA_IDA, finalRecord);
      }

      return { success: true, message: 'Frequência de IDA registrada com sucesso!' };

    } catch (e) {
      LoggerService.logEvent('AttendanceService', LoggerService.LEVELS.ERROR, 'Erro ao registrar frequência de ida.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao registrar a frequência de ida.' };
    }
  },

  /**
   * Valida, enriquece e registra um evento de frequência de VOLTA.
   * @param {Array<object>} attendanceRecords Array de objetos de frequência, cada um representando um aluno.
   * @param {object} monitorUser O objeto do monitor autenticado.
   * @returns {{success: boolean, message: string}} Objeto de resultado.
   */
  recordAttendanceVolta: function(attendanceRecords, monitorUser) {
    try {
      if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
        return { success: false, message: 'Nenhum registro de frequência fornecido.' };
      }

      const routeId = attendanceRecords[0].ID_Rota;
      const attendanceDate = new Date(attendanceRecords[0].Data_Frequencia);
      attendanceDate.setHours(0, 0, 0, 0);

      // Valida a existência da Rota (apenas uma vez para todos os registros)
      const routeResult = RouteService.getRouteDetails(routeId);
      if (!routeResult.success) {
        return routeResult;
      }

      // Processa e adiciona cada registro individualmente
      for (const record of attendanceRecords) {
        // Basic validation for each record
        if (!record.Nome_Aluno || !record.RA_Aluno || !record.Status_Frequencia) {
          LoggerService.logEvent('AttendanceService', LoggerService.LEVELS.WARN, 'Registro de frequência incompleto.', { record });
          continue; // Skip incomplete records
        }

        const finalRecord = {
          'Timestamp': new Date(),
          'Data_Frequencia': attendanceDate,
          'ID_Rota': routeId,
          'ID_Monitor': monitorUser.id,
          'Celular_Monitor': monitorUser.celular,
          'Nome_Aluno': record.Nome_Aluno,
          'RA_Aluno': record.RA_Aluno,
          'Status_Frequencia': record.Status_Frequencia,
          'Observacoes': record.Observacoes || '',
          'Latitude': record.Latitude || '',
          'Longitude': record.Longitude || '',
          'Foto_URL': record.Foto_URL || ''
        };

        SheetService.appendRow(CONFIG.SHEETS.FREQUENCIA_VOLTA, finalRecord);
      }

      SpreadsheetApp.flush();
      return { success: true, message: 'Frequência de VOLTA registrada com sucesso!' };

    } catch (e) {
      LoggerService.logEvent('AttendanceService', LoggerService.LEVELS.ERROR, 'Erro ao registrar frequência de volta.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao registrar a frequência de volta.' };
    }
  },

  /**
   * Obtém dados iniciais para o formulário de frequência (rotas e monitores).
   * @returns {{success: boolean, data?: object, message?: string}}
   */
  getInitialDataForAttendanceForm: function() {
    try {
      const routes = SheetService.getAllData(CONFIG.SHEETS.ROTAS).map(row => ({
        ID_Rota: row.ID_Rota,
        Nome_Rota: row.ID_Rota + ' - ' + row.Nome_Escola + ' (' + row.Turno + ')',
        Nome_Escola: row.Nome_Escola,
        Vagas_Totais_no_Veiculo: row.Vagas_Totais_no_Veiculo,
        Celular_Monitor: row.Celular_Monitor
      }));
      const monitors = SheetService.getAllData(CONFIG.SHEETS.MONITORES).map(row => ({
        ID_Monitor: row.ID_Monitor,
        Nome_Completo: row.Nome_Completo,
        Celular_Monitor: row.Celular_Monitor,
        Status: row.Status
      }));
      return { success: true, data: { routes, monitors } };
    } catch (e) {
      LoggerService.logEvent('AttendanceService', LoggerService.LEVELS.ERROR, 'Erro ao obter dados iniciais para formulário de frequência.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Erro ao carregar dados iniciais para frequência.' };
    }
  },

  /**
   * Verifica inconsistências nos registros de frequência (IDA e VOLTA).
   * Retorna uma lista de inconsistências encontradas.
   */
  checkAttendanceConsistency: function() {
    const inconsistencies = [];

    // Helper para ambos os tipos de frequência
    function check(sheetName) {
      const records = SheetService.getAllData(sheetName);
      const processedRecords = new Set(); // Para detectar duplicatas

      records.forEach(record => {
        const routeId = record.ID_Rota;
        const raAluno = record.RA_Aluno;
        const statusFrequencia = record.Status_Frequencia;
        let dateStr;
        if (record.Data_Frequencia instanceof Date) {
          dateStr = record.Data_Frequencia.toISOString().slice(0, 10);
        } else if (typeof record.Data_Frequencia === 'string') {
          dateStr = record.Data_Frequencia.slice(0, 10);
        } else {
          dateStr = '';
        }

        // 1. Verificar duplicatas para o mesmo aluno na mesma rota e data
        const uniqueKey = `${sheetName}-${routeId}-${dateStr}-${raAluno}`;
        if (processedRecords.has(uniqueKey)) {
          inconsistencies.push({
            type: 'Duplicidade de Registro',
            sheet: sheetName,
            routeId,
            date: dateStr,
            raAluno,
            message: `Registro duplicado para o aluno '${raAluno}' na rota '${routeId}' em '${dateStr}'.`,
            record
          });
        } else {
          processedRecords.add(uniqueKey);
        }

        // 2. Verificar se Nome_Aluno e RA_Aluno estão presentes
        if (!record.Nome_Aluno || !record.RA_Aluno) {
          inconsistencies.push({
            type: 'Dados Incompletos',
            sheet: sheetName,
            routeId,
            date: dateStr,
            raAluno,
            message: `Registro com Nome_Aluno ou RA_Aluno ausente.`, 
            record
          });
        }

        // 3. Verificar Status_Frequencia válido
        const allowedStatus = CONFIG.VALIDATION.ALLOWED_VALUES.STATUS_FREQUENCIA || ['PRESENTE', 'AUSENTE']; // Assuming a new config for this
        if (statusFrequencia && !allowedStatus.includes(statusFrequencia.toUpperCase())) {
          inconsistencies.push({
            type: 'Status de Frequência Inválido',
            sheet: sheetName,
            routeId,
            date: dateStr,
            raAluno,
            statusFrequencia,
            message: `Status de frequência inválido '${statusFrequencia}' para o aluno '${raAluno}'.`,
            record
          });
        }
      });
    }

    check(CONFIG.SHEETS.FREQUENCIA_IDA);
    check(CONFIG.SHEETS.FREQUENCIA_VOLTA);

    return { success: true, inconsistencies };
  },

  /**
   * Verifica inconsistências entre alunos registrados nas planilhas de frequência
   * e a lista de alunos atribuídos à rota na planilha Alunos.
   * Retorna alunos marcados mas não pertencentes à rota.
   */
  checkAttendanceStudentAssignmentConsistency: function() {
    const inconsistencies = [];

    function checkSheet(sheetName) {
      const records = SheetService.getAllData(sheetName);
      records.forEach(record => {
        const routeId = record.ID_Rota;
        const raAluno = record.RA_Aluno;
        let dateStr;
        if (record.Data_Frequencia instanceof Date) {
          dateStr = record.Data_Frequencia.toISOString().slice(0, 10);
        } else if (typeof record.Data_Frequencia === 'string') {
          dateStr = record.Data_Frequencia.slice(0, 10);
        } else {
          dateStr = '';
        }

        const studentsOnRoute = StudentService.getStudentsByRoute(routeId).map(s => s.RA_Aluno); // Assuming RA_Aluno is the unique identifier

        // Aluno marcado mas não pertencente à rota
        if (raAluno && !studentsOnRoute.includes(raAluno)) {
          inconsistencies.push({
            sheet: sheetName,
            routeId,
            date: dateStr,
            raAluno,
            message: `Aluno com RA '${raAluno}' registrado na frequência mas não pertence à rota '${routeId}'.`,
            record
          });
        }
      });
    }

    checkSheet(CONFIG.SHEETS.FREQUENCIA_IDA);
    checkSheet(CONFIG.SHEETS.FREQUENCIA_VOLTA);

    return { success: true, inconsistencies };
  },

  /**
   * Verifica se Celular_Monitor e Celular_Secretario registrados nas planilhas de ROTAS e FREQUENCIA
   * correspondem a monitores e secretários ATIVOS nas respectivas planilhas.
   * Retorna inconsistências encontradas.
   */
  checkAttendanceUserAssignmentConsistency: function() {
    const inconsistencies = [];

    // Helper para buscar monitor ativo pelo celular
    function findActiveMonitor(celular) {
      const clean = String(celular).replace(/\D/g, '');
      const monitors = SheetService.getAllData(CONFIG.SHEETS.MONITORES);
      return monitors.find(m => String(m.Celular_Monitor).replace(/\D/g, '') === clean && String(m.Status).toUpperCase() === 'ATIVO');
    }

    // Helper para buscar secretário ativo pelo celular
    function findActiveSecretary(celular) {
      const clean = String(celular).replace(/\D/g, '');
      const secretaries = SheetService.getAllData(CONFIG.SHEETS.SECRETARIOS);
      return secretaries.find(s => String(s.Celular_Secretario).replace(/\D/g, '') === clean && String(s.Status).toUpperCase() === 'ATIVO');
    }

    // Verifica ROTAS
    const rotas = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
    rotas.forEach(route => {
      if (route.Celular_Monitor && !findActiveMonitor(route.Celular_Monitor)) {
        inconsistencies.push({
          sheet: CONFIG.SHEETS.ROTAS,
          type: 'Celular_Monitor',
          celular: route.Celular_Monitor,
          routeId: route.ID_Rota,
          message: 'Celular_Monitor não corresponde a monitor ativo.'
        });
      }
      if (route.Celular_Secretario && !findActiveSecretary(route.Celular_Secretario)) {
        inconsistencies.push({
          sheet: CONFIG.SHEETS.ROTAS,
          type: 'Celular_Secretario',
          celular: route.Celular_Secretario,
          routeId: route.ID_Rota,
          message: 'Celular_Secretario não corresponde a secretário ativo.'
        });
      }
    });

    // Verifica FREQUENCIA_IDA
    const freqIda = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_IDA);
    freqIda.forEach(record => {
      if (record.Celular_Monitor && !findActiveMonitor(record.Celular_Monitor)) {
        inconsistencies.push({
          sheet: CONFIG.SHEETS.FREQUENCIA_IDA,
          type: 'Celular_Monitor',
          celular: record.Celular_Monitor,
          routeId: record.ID_Rota,
          date: record.Data_Frequencia,
          message: 'Celular_Monitor não corresponde a monitor ativo.'
        });
      }
      if (record.Celular_Secretario && !findActiveSecretary(record.Celular_Secretario)) {
        inconsistencies.push({
          sheet: CONFIG.SHEETS.FREQUENCIA_IDA,
          type: 'Celular_Secretario',
          celular: record.Celular_Secretario,
          routeId: record.ID_Rota,
          date: record.Data_Frequencia,
          message: 'Celular_Secretario não corresponde a secretário ativo.'
        });
      }
    });

    // Verifica FREQUENCIA_VOLTA
    const freqVolta = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_VOLTA);
    freqVolta.forEach(record => {
      if (record.Celular_Monitor && !findActiveMonitor(record.Celular_Monitor)) {
        inconsistencies.push({
          sheet: CONFIG.SHEETS.FREQUENCIA_VOLTA,
          type: 'Celular_Monitor',
          celular: record.Celular_Monitor,
          routeId: record.ID_Rota,
          date: record.Data_Frequencia,
          message: 'Celular_Monitor não corresponde a monitor ativo.'
        });
      }
      if (record.Celular_Secretario && !findActiveSecretary(record.Celular_Secretario)) {
        inconsistencies.push({
          sheet: CONFIG.SHEETS.FREQUENCIA_VOLTA,
          type: 'Celular_Secretario',
          celular: record.Celular_Secretario,
          routeId: record.ID_Rota,
          date: record.Data_Frequencia,
          message: 'Celular_Secretario não corresponde a secretário ativo.'
        });
      }
    });

    return { success: true, inconsistencies };
  },

  /**
   * Verifica se monitores/secretários marcados como INATIVO não possuem registros de frequência ou incidentes
   * após a data de inativação.
   * Retorna inconsistências encontradas.
   */
  checkInactiveUserNoNewRecords: function() {
    const inconsistencies = [];

    // Helper para obter histórico de status (assume que há campo Data_Status ou Data_Inativacao)
    function getInactiveUsers(sheetName, phoneField, idField, statusField, dateField) {
      const users = SheetService.getAllData(sheetName);
      return users
        .filter(u => String(u[statusField]).toUpperCase() === 'INATIVO' && u[dateField])
        .map(u => ({
          id: u[idField],
          celular: String(u[phoneField]).replace(/\D/g, ''),
          inactivationDate: new Date(u[dateField])
        }));
    }

    // Monitores INATIVOS
    const inactiveMonitors = getInactiveUsers(
      CONFIG.SHEETS.MONITORES,
      'Celular_Monitor',
      'ID_Monitor',
      'Status',
      'Data_Inativacao'
    );

    // Secretários INATIVOS
    const inactiveSecretaries = getInactiveUsers(
      CONFIG.SHEETS.SECRETARIOS,
      'Celular_Secretario',
      'ID_Secretario',
      'Status',
      'Data_Inativacao'
    );

    // Frequência IDA/Volta
    function checkFrequency(sheetName, monitorField, dateField) {
      const records = SheetService.getAllData(sheetName);
      records.forEach(record => {
        const recordDate = new Date(record[dateField]);
        const monitorCelular = String(record[monitorField]).replace(/\D/g, '');
        inactiveMonitors.forEach(user => {
          if (monitorCelular === user.celular && recordDate > user.inactivationDate) {
            inconsistencies.push({
              type: 'Frequencia',
              sheet: sheetName,
              userId: user.id,
              celular: user.celular,
              recordDate,
              inactivationDate: user.inactivationDate,
              message: 'Registro de frequência após inativação do monitor.'
            });
          }
        });
        inactiveSecretaries.forEach(user => {
          if (record.Celular_Secretario && String(record.Celular_Secretario).replace(/\D/g, '') === user.celular && recordDate > user.inactivationDate) {
            inconsistencies.push({
              type: 'Frequencia',
              sheet: sheetName,
              userId: user.id,
              celular: user.celular,
              recordDate,
              inactivationDate: user.inactivationDate,
              message: 'Registro de frequência após inativação do secretário.'
            });
          }
        });
      });
    }

    checkFrequency(CONFIG.SHEETS.FREQUENCIA_IDA, 'Celular_Monitor', 'Data_Frequencia');
    checkFrequency(CONFIG.SHEETS.FREQUENCIA_VOLTA, 'Celular_Monitor', 'Data_Frequencia');

    // Incidentes
    if (CONFIG.SHEETS.INCIDENTES) {
      const incidentRecords = SheetService.getAllData(CONFIG.SHEETS.INCIDENTES);
      incidentRecords.forEach(record => {
        const recordDate = new Date(record.Data_Incidente || record.Timestamp);
        // Verifica monitor
        inactiveMonitors.forEach(user => {
          if (record.Celular_Monitor && String(record.Celular_Monitor).replace(/\D/g, '') === user.celular && recordDate > user.inactivationDate) {
            inconsistencies.push({
              type: 'Incidente',
              sheet: CONFIG.SHEETS.INCIDENTES,
              userId: user.id,
              celular: user.celular,
              recordDate,
              inactivationDate: user.inactivationDate,
              message: 'Registro de incidente após inativação do monitor.'
            });
          }
        });
        // Verifica secretário
        inactiveSecretaries.forEach(user => {
          if (record.Celular_Secretario && String(record.Celular_Secretario).replace(/\D/g, '') === user.celular && recordDate > user.inactivationDate) {
            inconsistencies.push({
              type: 'Incidente',
              sheet: CONFIG.SHEETS.INCIDENTES,
              userId: user.id,
              celular: user.celular,
              recordDate,
              inactivationDate: user.inactivationDate,
              message: 'Registro de incidente após inativação do secretário.'
            });
          }
        });
      });
    }

    return { success: true, inconsistencies };
  },

  /**
   * Verifica inconsistências entre Capacidade_Total dos veículos (VEICULOS)
   * e Vagas_Totais_no_Veiculo das rotas (ROTAS).
   * Alerta se houver divergência, indicando possível erro de cadastro ou atualização.
   */
  checkVehicleCapacityConsistency: function() {
    const inconsistencies = [];
    const vehicles = SheetService.getAllData(CONFIG.SHEETS.VEICULOS);
    const rotas = SheetService.getAllData(CONFIG.SHEETS.ROTAS);

    // Cria um mapa de capacidade por ID_Onibus
    const vehicleCapacityMap = {};
    vehicles.forEach(v => {
      if (v.ID_Onibus) {
        vehicleCapacityMap[v.ID_Onibus] = Number(v.Capacidade_Total || 0);
      }
    });

    rotas.forEach(route => {
      const idOnibus = route.ID_Onibus;
      const routeCapacity = Number(route.Vagas_Totais_no_Veiculo || 0);
      if (idOnibus && vehicleCapacityMap.hasOwnProperty(idOnibus)) {
        const vehicleCapacity = vehicleCapacityMap[idOnibus];
        if (vehicleCapacity !== routeCapacity) {
          inconsistencies.push({
            routeId: route.ID_Rota,
            idOnibus,
            routeCapacity,
            vehicleCapacity,
            message: `Inconsistência: Vagas_Totais_no_Veiculo (${routeCapacity}) diferente de Capacidade_Total do veículo (${vehicleCapacity}) para o ônibus ${idOnibus}.`
          });
        }
      }
    });

    return { success: true, inconsistencies };
  },

  /**
   * Gera um relatório de auditoria para cada planilha, listando a data da última modificação
   * de cada registro e o usuário responsável (se disponível nos logs).
   * Retorna um objeto: { sheetName: [ { id, lastModified, user } ] }
   */
  generateAuditReportForSheets: function() {
    const result = {};
    const sheetsToAudit = Object.keys(CONFIG.SHEETS);

    // Carrega todos os logs uma vez
    const logs = SheetService.getAllData(CONFIG.SHEETS.LOGS || 'Logs');

    sheetsToAudit.forEach(sheetKey => {
      const sheetName = CONFIG.SHEETS[sheetKey];
      const headers = CONFIG.HEADERS[sheetKey];
      if (!headers) return;

      const idHeader = headers.find(h => h.startsWith('ID_')) || headers[0];
      const data = SheetService.getAllData(sheetName);

      const auditRows = data.map(row => {
        const recordId = row[idHeader] || '';
        // Filtra logs relacionados a este registro
        const relatedLogs = logs.filter(log =>
          log.Planilha === sheetName &&
          (log.ID_Registro === recordId || log.ID_Registro === String(recordId))
        );
        // Encontra o log mais recente
        let lastLog = null;
        if (relatedLogs.length > 0) {
          lastLog = relatedLogs.reduce((a, b) => {
            const dateA = new Date(a.Timestamp);
            const dateB = new Date(b.Timestamp);
            return dateA > dateB ? a : b;
          });
        }
        return {
          id: recordId,
          lastModified: lastLog ? lastLog.Timestamp : null,
          user: lastLog ? (lastLog.Usuario || lastLog.User || '') : ''
        };
      });

      result[sheetName] = auditRows;
    });

    return { success: true, audit: result };
  },

  getStudentFullHistory: function(raAluno) {
    const history = {
      frequencia: [],
      incidentes: [],
      lacunas: [],
      anomalias: []
    };

    // 1. Frequência IDA
    const freqIda = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_IDA);
    freqIda.forEach(record => {
      if (record.RA_Aluno === raAluno) {
        history.frequencia.push({
          tipo: 'IDA',
          data: record.Data_Frequencia,
          status: record.Status_Frequencia,
          rota: record.ID_Rota,
          observacoes: record.Observacoes,
          latitude: record.Latitude,
          longitude: record.Longitude,
          foto_url: record.Foto_URL
        });
      }
    });

    // 2. Frequência VOLTA
    const freqVolta = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_VOLTA);
    freqVolta.forEach(record => {
      if (record.RA_Aluno === raAluno) {
        history.frequencia.push({
          tipo: 'VOLTA',
          data: record.Data_Frequencia,
          status: record.Status_Frequencia,
          rota: record.ID_Rota,
          observacoes: record.Observacoes,
          latitude: record.Latitude,
          longitude: record.Longitude,
          foto_url: record.Foto_URL
        });
      }
    });

    // 3. Incidentes
    if (CONFIG.SHEETS.INCIDENTES) {
      const incidentes = SheetService.getAllData(CONFIG.SHEETS.INCIDENTES);
      incidentes.forEach(record => {
        const envolvidos = String(record.Envolvidos || '').split(',').map(s => s.trim());
        if (envolvidos.includes(raAluno)) { // Assuming RA_Aluno can be in Envolvidos
          history.incidentes.push({
            data: record.Data_Incidente || record.Timestamp,
            tipo: record.Tipo_Incidente,
            descricao: record.Descricao,
            rota: record.ID_Rota // Assuming Incidentes can be linked to a route
          });
        }
      });
    }

    // 4. Detecta lacunas e anomalias
    const aluno = StudentService.getStudentByRA(raAluno); // Assuming a new function to get student by RA
    if (aluno.success && aluno.data) {
      // Sort frequency records by date
      history.frequencia.sort((a, b) => new Date(a.data) - new Date(b.data));

      // Detect gaps (lacunas)
      if (history.frequencia.length > 1) {
        for (let i = 1; i < history.frequencia.length; i++) {
          const prevDate = new Date(history.frequencia[i - 1].data);
          const currDate = new Date(history.frequencia[i].data);
          const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 1) {
            history.lacunas.push({
              entre: [prevDate.toISOString().slice(0, 10), currDate.toISOString().slice(0, 10)],
              diasSemRegistro: diffDays - 1
            });
          }
        }
      }

      // Detect anomalies (anomalias)
      const freqByDayAndType = {}; // { 'YYYY-MM-DD': { 'IDA': [records], 'VOLTA': [records] } }
      history.frequencia.forEach(f => {
        const day = typeof f.data === 'string' ? f.data.slice(0, 10) : new Date(f.data).toISOString().slice(0, 10);
        freqByDayAndType[day] = freqByDayAndType[day] || {};
        freqByDayAndType[day][f.tipo] = freqByDayAndType[day][f.tipo] || [];
        freqByDayAndType[day][f.tipo].push(f);
      });

      Object.entries(freqByDayAndType).forEach(([day, types]) => {
        // Check for multiple records of the same type on the same day
        if (types.IDA && types.IDA.length > 1) {
          history.anomalias.push({ dia: day, tipo: 'Multiplos registros de IDA', registros: types.IDA });
        }
        if (types.VOLTA && types.VOLTA.length > 1) {
          history.anomalias.push({ dia: day, tipo: 'Multiplos registros de VOLTA', registros: types.VOLTA });
        }

        // Check if student is marked present and absent on the same day (for the same type)
        if (types.IDA && types.IDA.some(r => r.status === 'PRESENTE') && types.IDA.some(r => r.status === 'AUSENTE')) {
          history.anomalias.push({ dia: day, tipo: 'Aluno presente e ausente no mesmo dia (IDA)', registros: types.IDA });
        }
        if (types.VOLTA && types.VOLTA.some(r => r.status === 'PRESENTE') && types.VOLTA.some(r => r.status === 'AUSENTE')) {
          history.anomalias.push({ dia: day, tipo: 'Aluno presente e ausente no mesmo dia (VOLTA)', registros: types.VOLTA });
        }

        // Check if student is registered in a different route than their assigned route
        const assignedRoute = aluno.data.ID_Rota;
        if (assignedRoute) {
          [...(types.IDA || []), ...(types.VOLTA || [])].forEach(record => {
            if (record.rota !== assignedRoute) {
              history.anomalias.push({ dia: day, tipo: 'Aluno registrado em rota diferente da atribuída', registro: record, rotaAtribuida: assignedRoute });
            }
          });
        }
      });
    }

    return { success: true, history };
  },

  /**
   * Verifica se cada ID_Onibus presente na planilha Rotas existe na planilha Veículos.
   * Retorna uma lista de rotas sem veículo válido.
   */
  checkRouteVehicleAssignment: function() {
    const inconsistencies = [];
    const rotas = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
    const veiculos = SheetService.getAllData(CONFIG.SHEETS.VEICULOS);
    const veiculoIds = new Set(veiculos.map(v => v.ID_Onibus));

    rotas.forEach(route => {
      if (route.ID_Onibus && !veiculoIds.has(route.ID_Onibus)) {
        inconsistencies.push({
          routeId: route.ID_Rota,
          idOnibus: route.ID_Onibus,
          message: `Rota '${route.ID_Rota}' possui ID_Onibus '${route.ID_Onibus}' sem veículo correspondente na planilha Veículos.`
        });
      }
    });

    return { success: true, inconsistencies };
  },

  /**
   * Verifica a consistência dos nomes de escola entre ESCOLAS, ROTAS, SECRETARIOS, PONTO_FACULTATIVO, REPOSICAO e ATIVIDADE_EXTRACURRICULAR.
   * Sinaliza nomes não padronizados ou que não existam na planilha ESCOLAS.
   */
  checkSchoolNameConsistency: function() {
    const inconsistencies = [];
    const escolas = SheetService.getAllData(CONFIG.SHEETS.ESCOLAS);
    const escolasValidas = new Set(escolas.map(e => (e.Nome_Escola || '').trim()).filter(Boolean));

    // Helper para verificar nomes em uma planilha
    function checkSheet(sheetName, schoolField) {
      const rows = SheetService.getAllData(sheetName);
      rows.forEach((row, idx) => {
        const nomeEscola = (row[schoolField] || '').trim();
        if (nomeEscola && !escolasValidas.has(nomeEscola)) {
          inconsistencies.push({
            sheet: sheetName,
            row: idx + 2,
            nomeEscola,
            message: `Nome de escola '${nomeEscola}' não encontrado na planilha ESCOLAS.`
          });
        }
      });
    }

    checkSheet(CONFIG.SHEETS.ROTAS, 'Nome_Escola');
    checkSheet(CONFIG.SHEETS.SECRETARIOS, 'Nome_Escola');
    checkSheet(CONFIG.SHEETS.PONTO_FACULTATIVO, 'Nome_Escola');
    checkSheet(CONFIG.SHEETS.REPOSICAO, 'Nome_Escola');
    checkSheet(CONFIG.SHEETS.ATIVIDADE_EXTRACURRICULAR, 'Nome_Escola');

    return { success: true, inconsistencies };
  },

  /**
   * Verifica se Vagas_Ocupadas na planilha CONTROLE_DE_VAGAS está consistente com o número de alunos registrados para a ID_Rota e Turno.
   * Retorna inconsistências encontradas.
   */
  checkVagasOcupadasConsistency: function() {
    const inconsistencies = [];
    const controleRows = SheetService.getAllData(CONFIG.SHEETS.CONTROLE_DE_VAGAS);
    const alunosRows = SheetService.getAllData(CONFIG.SHEETS.ALUNOS);
    const rotasRows = SheetService.getAllData(CONFIG.SHEETS.ROTAS);

    controleRows.forEach((row, idx) => {
      const idRota = row.ID_Rota;
      // Busca turno da rota
      const rota = rotasRows.find(r => r.ID_Rota === idRota);
      const turno = rota ? rota.Turno : row.Turno;
      // Conta alunos na rota e turno
      const alunosNaRota = alunosRows.filter(a => a.ID_Rota === idRota);
      // Se houver campo Turno no aluno, pode filtrar também, mas normalmente não há
      const expectedVagas = alunosNaRota.length;
      const vagasOcupadas = Number(row.Vagas_Ocupadas || 0);

      if (vagasOcupadas !== expectedVagas) {
        inconsistencies.push({
          sheet: CONFIG.SHEETS.CONTROLE_DE_VAGAS,
          row: idx + 2,
          idRota,
          turno,
          vagasOcupadas,
          expectedVagas,
          message: `Vagas_Ocupadas (${vagasOcupadas}) diferente do número de alunos registrados (${expectedVagas}) para a rota '${idRota}' e turno '${turno}'.`
        });
      }
    });

    return { success: true, inconsistencies };
  },

  /**
   * Varre FREQUENCIA_IDA, FREQUENCIA_VOLTA e CONTROLE_DE_VAGAS em busca de ID_Aluno órfãos (não existentes na planilha Alunos).
   * Retorna lista de registros órfãos para investigação/correção.
   */
  scanOrphanStudentRecords: function() {
    const inconsistencies = [];
    const alunosRows = SheetService.getAllData(CONFIG.SHEETS.ALUNOS);
    const alunosValidos = new Set(alunosRows.map(a => a.ID_Aluno).filter(Boolean));

    // Helper para extrair IDs de campos de lista
    function extractIds(str) {
      if (!str) return [];
      if (Array.isArray(str)) return str;
      return String(str).split(',').map(s => s.trim()).filter(Boolean);
    }

    // FREQUENCIA_IDA
    const freqIdaRows = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_IDA);
    freqIdaRows.forEach((row, idx) => {
      const presentes = extractIds(row.Alunos_Presentes_Ida);
      const ausentes = extractIds(row.Alunos_Ausentes_Ida);
      [...presentes, ...ausentes].forEach(idAluno => {
        if (idAluno && !alunosValidos.has(idAluno)) {
          inconsistencies.push({
            sheet: CONFIG.SHEETS.FREQUENCIA_IDA,
            row: idx + 2,
            idAluno,
            message: `ID_Aluno '${idAluno}' referenciado em FREQUENCIA_IDA mas não existe na planilha Alunos.`
          });
        }
      });
    });

    // FREQUENCIA_VOLTA
    const freqVoltaRows = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_VOLTA);
    freqVoltaRows.forEach((row, idx) => {
      const presentes = extractIds(row.Alunos_Presentes_Volta);
      const ausentes = extractIds(row.Alunos_Ausentes_Volta);
      [...presentes, ...ausentes].forEach(idAluno => {
        if (idAluno && !alunosValidos.has(idAluno)) {
          inconsistencies.push({
            sheet: CONFIG.SHEETS.FREQUENCIA_VOLTA,
            row: idx + 2,
            idAluno,
            message: `ID_Aluno '${idAluno}' referenciado em FREQUENCIA_VOLTA mas não existe na planilha Alunos.`
          });
        }
      });
    });

    // CONTROLE_DE_VAGAS
    const controleRows = SheetService.getAllData(CONFIG.SHEETS.CONTROLE_DE_VAGAS);
    controleRows.forEach((row, idx) => {
      const idAluno = row.ID_Aluno;
      if (idAluno && !alunosValidos.has(idAluno)) {
        inconsistencies.push({
          sheet: CONFIG.SHEETS.CONTROLE_DE_VAGAS,
          row: idx + 2,
          idAluno,
          message: `ID_Aluno '${idAluno}' referenciado em CONTROLE_DE_VAGAS mas não existe na planilha Alunos.`
        });
      }
    });

    return { success: true, inconsistencies };
  },

  /**
   * Retorna todos os alunos da rota, registros de frequência e controle de vagas relacionados ao ID_Rota informado.
   * Útil para revisão manual e integração com Gemini.
   * @param {string} routeId - O ID da rota a ser analisada.
   * @returns {object} Dados agregados para revisão.
   */
  getRouteFullReviewData: function(routeId) {
    const alunos = SheetService.getAllData(CONFIG.SHEETS.ALUNOS).filter(a => a.ID_Rota === routeId);
    const freqIda = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_IDA).filter(r => r.ID_Rota === routeId);
    const freqVolta = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_VOLTA).filter(r => r.ID_Rota === routeId);
    const controleVagas = SheetService.getAllData(CONFIG.SHEETS.CONTROLE_DE_VAGAS).filter(r => r.ID_Rota === routeId);

    return {
      success: true,
      data: {
        alunos,
        frequenciaIda: freqIda,
        frequenciaVolta: freqVolta,
        controleVagas
      }
    };
  },

  /**
   * Lista registros onde monitores ou secretários INATIVOS possuem atividades após a data de inativação.
   * Retorna inconsistências para revisão e correção.
   */
  getInactiveUserActivityRecords: function() {
    const inconsistencies = [];

    // Helper para obter usuários inativos com data de inativação
    function getInactiveUsers(sheetName, phoneField, idField, statusField, dateField) {
      const users = SheetService.getAllData(sheetName);
      return users
        .filter(u => String(u[statusField]).toUpperCase() === 'INATIVO' && u[dateField])
        .map(u => ({
          id: u[idField],
          celular: String(u[phoneField]).replace(/\D/g, ''),
          inactivationDate: new Date(u[dateField])
        }));
    }

    // Monitores INATIVOS
    const inactiveMonitors = getInactiveUsers(
      CONFIG.SHEETS.MONITORES,
      'Celular_Monitor',
      'ID_Monitor',
      'Status',
      'Data_Inativacao'
    );

    // Secretários INATIVOS
    const inactiveSecretaries = getInactiveUsers(
      CONFIG.SHEETS.SECRETARIOS,
      'Celular_Secretario',
      'ID_Secretario',
      'Status',
      'Data_Inativacao'
    );

    // Frequência IDA/Volta
    function checkFrequency(sheetName, monitorField, secretaryField, dateField) {
      const records = SheetService.getAllData(sheetName);
      records.forEach(record => {
        const recordDate = new Date(record[dateField]);
        const monitorCelular = String(record[monitorField]).replace(/\D/g, '');
        const secretaryCelular = record[secretaryField] ? String(record[secretaryField]).replace(/\D/g, '') : null;

        inactiveMonitors.forEach(user => {
          if (monitorCelular === user.celular && recordDate > user.inactivationDate) {
            inconsistencies.push({
              type: 'Frequencia',
              sheet: sheetName,
              userId: user.id,
              celular: user.celular,
              recordDate,
              inactivationDate: user.inactivationDate,
              message: 'Registro de frequência após inativação do monitor.'
            });
          }
        });
        inactiveSecretaries.forEach(user => {
          if (secretaryCelular && secretaryCelular === user.celular && recordDate > user.inactivationDate) {
            inconsistencies.push({
              type: 'Frequencia',
              sheet: sheetName,
              userId: user.id,
              celular: user.celular,
              recordDate,
              inactivationDate: user.inactivationDate,
              message: 'Registro de frequência após inativação do secretário.'
            });
          }
        });
      });
    }

    checkFrequency(CONFIG.SHEETS.FREQUENCIA_IDA, 'Celular_Monitor', 'Celular_Secretario', 'Data_Frequencia');
    checkFrequency(CONFIG.SHEETS.FREQUENCIA_VOLTA, 'Celular_Monitor', 'Celular_Secretario', 'Data_Frequencia');

    // Incidentes
    if (CONFIG.SHEETS.INCIDENTES) {
      const incidentRecords = SheetService.getAllData(CONFIG.SHEETS.INCIDENTES);
      incidentRecords.forEach(record => {
        const recordDate = new Date(record.Data_Incidente || record.Timestamp);
        const monitorCelular = record.Celular_Monitor ? String(record.Celular_Monitor).replace(/\D/g, '') : null;
        const secretaryCelular = record.Celular_Secretario ? String(record.Celular_Secretario).replace(/\D/g, '') : null;

        inactiveMonitors.forEach(user => {
          if (monitorCelular === user.celular && recordDate > user.inactivationDate) {
            inconsistencies.push({
              type: 'Incidente',
              sheet: CONFIG.SHEETS.INCIDENTES,
              userId: user.id,
              celular: user.celular,
              recordDate,
              inactivationDate: user.inactivationDate,
              message: 'Registro de incidente após inativação do monitor.'
            });
          }
        });
        inactiveSecretaries.forEach(user => {
          if (secretaryCelular && secretaryCelular === user.celular && recordDate > user.inactivationDate) {
            inconsistencies.push({
              type: 'Incidente',
              sheet: CONFIG.SHEETS.INCIDENTES,
              userId: user.id,
              celular: user.celular,
              recordDate,
              inactivationDate: user.inactivationDate,
              message: 'Registro de incidente após inativação do secretário.'
            });
          }
        });
      });
    }

    // Eventos (Ponto Facultativo, Reposição, Atividade Extracurricular)
    function checkEventSheet(sheetName, secretaryField, dateField) {
      const records = SheetService.getAllData(sheetName);
      records.forEach(record => {
        const recordDate = new Date(record[dateField]);
        const secretaryCelular = record[secretaryField] ? String(record[secretaryField]).replace(/\D/g, '') : null;
        inactiveSecretaries.forEach(user => {
          if (secretaryCelular && secretaryCelular === user.celular && recordDate > user.inactivationDate) {
            inconsistencies.push({
              type: 'Evento',
              sheet: sheetName,
              userId: user.id,
              celular: user.celular,
              recordDate,
              inactivationDate: user.inactivationDate,
              message: 'Registro de evento após inativação do secretário.'
            });
          }
        });
      });
    }

    checkEventSheet(CONFIG.SHEETS.PONTO_FACULTATIVO, 'Celular_Secretario', 'Data_Ponto_Facultativo');
    checkEventSheet(CONFIG.SHEETS.REPOSICAO, 'Celular_Secretario', 'Data_Reposicao');
    checkEventSheet(CONFIG.SHEETS.ATIVIDADE_EXTRACURRICULAR, 'Celular_Secretario', 'Data_Atividade');

    return { success: true, inconsistencies };
  },

};