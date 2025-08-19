/**
 * @file IntegrityService.gs
 * @description Serviço para verificar a integridade referencial dos dados.
 */

const IntegrityService = {

  /**
   * Verifica a integridade referencial de uma coluna entre duas planilhas.
   * @param {string} sourceSheetName - A planilha de origem.
   * @param {string} sourceColumnName - A coluna na planilha de origem a ser verificada.
   * @param {string} targetSheetName - A planilha de destino.
   * @param {string} targetColumnName - A coluna na planilha de destino que deve conter os valores.
   * @param {boolean} collectErrors - Se verdadeiro, retorna um array de erros em vez de logar.
   * @returns {Array} Um array de erros, se collectErrors for verdadeiro.
   */
  _checkReference: function(sourceSheetName, sourceColumnName, targetSheetName, targetColumnName, collectErrors = false) {
    const errors = [];
    try {
      const sourceData = SheetService.getAllData(sourceSheetName);
      const targetData = SheetService.getAllData(targetSheetName);
      const targetIds = new Set(targetData.map(row => row[targetColumnName]));

      sourceData.forEach((row, index) => {
        const sourceId = row[sourceColumnName];
        if (sourceId && !targetIds.has(sourceId)) {
          const error = {
            planilha: sourceSheetName,
            id_registro: row['ID_' + sourceSheetName.slice(0, -1)] || `Linha ${index + 2}`,
            campo: sourceColumnName,
            descricao: `ID '${sourceId}' não encontrado em ${targetSheetName}.${targetColumnName}`
          };
          if (collectErrors) {
            errors.push(error);
          } else {
            LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.WARN, error.descricao, error);
          }
        }
      });
    } catch (e) {
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.ERROR, `Erro ao verificar a referência de ${sourceSheetName} para ${targetSheetName}.`, { error: e.message, stack: e.stack });
    }
    return errors;
  },

  /**
   * Verifica se todos os valores em uma coluna são únicos.
   * @param {string} sheetName - O nome da planilha.
   * @param {string} columnName - O nome da coluna a ser verificada.
   * @param {boolean} collectErrors - Se verdadeiro, retorna um array de erros em vez de logar.
   * @returns {Array} Um array de erros, se collectErrors for verdadeiro.
   */
  _checkUniqueIds: function(sheetName, columnName, collectErrors = false) {
    const errors = [];
    try {
      const data = SheetService.getAllData(sheetName);
      const ids = new Map();
      data.forEach((row, index) => {
        const id = row[columnName];
        if (id) {
          if (ids.has(id)) {
            ids.get(id).push({ id: row['ID_' + sheetName.slice(0, -1)] || `Linha ${index + 2}` });
          } else {
            ids.set(id, [{ id: row['ID_' + sheetName.slice(0, -1)] || `Linha ${index + 2}` }]);
          }
        }
      });

      ids.forEach((items, id) => {
        if (items.length > 1) {
          const error = {
            planilha: sheetName,
            id_registro: items.map(item => item.id).join(', '),
            campo: columnName,
            descricao: `ID duplicado '${id}' encontrado.`
          };
          if (collectErrors) {
            errors.push(error);
          } else {
            LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.WARN, error.descricao, error);
          }
        }
      });
    } catch (e) {
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.ERROR, `Erro ao verificar IDs únicos em ${sheetName}.${columnName}.`, { error: e.message, stack: e.stack });
    }
    return errors;
  },

  /**
   * Verifica se os valores em uma coluna são numéricos e estão dentro de um intervalo.
   * @param {string} sheetName - O nome da planilha.
   * @param {string} columnName - O nome da coluna.
   * @param {number} min - O valor mínimo permitido.
   * @param {number} max - O valor máximo permitido.
   * @param {boolean} collectErrors - Se verdadeiro, retorna um array de erros em vez de logar.
   * @returns {Array} Um array de erros, se collectErrors for verdadeiro.
   */
  _checkNumericRanges: function(sheetName, columnName, min, max, collectErrors = false) {
    const errors = [];
    try {
      const data = SheetService.getAllData(sheetName);
      data.forEach((row, index) => {
        const value = row[columnName];
        if (value !== '' && (typeof value !== 'number' || value < min || value > max)) {
          const error = {
            planilha: sheetName,
            id_registro: row['ID_' + sheetName.slice(0, -1)] || `Linha ${index + 2}`,
            campo: columnName,
            descricao: `Valor inválido '${value}'. Deve ser um número entre ${min} e ${max}.`
          };
          if (collectErrors) {
            errors.push(error);
          } else {
            LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.WARN, error.descricao, error);
          }
        }
      });
    } catch (e) {
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.ERROR, `Erro ao verificar o intervalo numérico em ${sheetName}.${columnName}.`, { error: e.message, stack: e.stack });
    }
    return errors;
  },

  /**
   * Verifica se as datas em uma coluna são válidas e não futuras.
   * @param {string} sheetName - O nome da planilha.
   * @param {string} columnName - O nome da coluna.
   * @param {boolean} collectErrors - Se verdadeiro, retorna um array de erros em vez de logar.
   * @returns {Array} Um array de erros, se collectErrors for verdadeiro.
   */
  _checkDateConsistency: function(sheetName, columnName, collectErrors = false) {
    const errors = [];
    try {
      const data = SheetService.getAllData(sheetName);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Final do dia de hoje

      data.forEach((row, index) => {
        const value = row[columnName];
        if (value) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            const error = {
              planilha: sheetName,
              id_registro: row['ID_' + sheetName.slice(0, -1)] || `Linha ${index + 2}`,
              campo: columnName,
              descricao: `Data inválida '${value}'.`
            };
            if (collectErrors) {
              errors.push(error);
            } else {
              LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.WARN, error.descricao, error);
            }
          } else if (date > today) {
            const error = {
              planilha: sheetName,
              id_registro: row['ID_' + sheetName.slice(0, -1)] || `Linha ${index + 2}`,
              campo: columnName,
              descricao: `Data futura inválida '${date.toLocaleDateString()}'.`
            };
            if (collectErrors) {
              errors.push(error);
            } else {
              LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.WARN, error.descricao, error);
            }
          }
        }
      });
    } catch (e) {
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.ERROR, `Erro ao verificar a consistência da data em ${sheetName}.${columnName}.`, { error: e.message, stack: e.stack });
    }
    return errors;
  },

  /**
   * Executa todas as verificações de integridade e loga os erros.
   */
  checkAllIntegrity: function() {
    this.collectAllInconsistencies(false);
  },

  /**
   * Coleta todas as inconsistências de dados.
   * @param {boolean} collect - Se verdadeiro, retorna um array de erros.
   * @returns {Array} Um array de erros, se collect for verdadeiro.
   */
  collectAllInconsistencies: function(collect = true) {
    let allErrors = [];
    LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, 'Iniciando coleta de inconsistências.');
    
    const checks = [
      () => this._checkReference(CONFIG.SHEETS.ALUNOS, 'ID_Rota', CONFIG.SHEETS.ROTAS, 'ID_Rota', collect),
      () => this._checkReference(CONFIG.SHEETS.ROTAS, 'ID_Onibus', CONFIG.SHEETS.VEICULOS, 'ID_Onibus', collect),
      () => this._checkReference(CONFIG.SHEETS.ROTAS, 'Celular_Monitor', CONFIG.SHEETS.MONITORES, 'Celular_Monitor', collect),
      () => this._checkUniqueIds(CONFIG.SHEETS.ALUNOS, 'ID_Aluno', collect),
      () => this._checkUniqueIds(CONFIG.SHEETS.MONITORES, 'ID_Monitor', collect),
      () => this._checkUniqueIds(CONFIG.SHEETS.VEICULOS, 'Placa', collect),
      () => this._checkUniqueIds(CONFIG.SHEETS.ROTAS, 'ID_Rota', collect),
      () => this._checkNumericRanges(CONFIG.SHEETS.VEICULOS, 'Capacidade_Total', 1, 100, collect),
      () => this._checkNumericRanges(CONFIG.SHEETS.FREQUENCIA_IDA, 'Qtd_Presentes__Ida', 0, 100, collect),
      () => this._checkNumericRanges(CONFIG.SHEETS.FREQUENCIA_VOLTA, 'Qtd_Presentes__Volta', 0, 100, collect),
      () => this._checkDateConsistency(CONFIG.SHEETS.FREQUENCIA_IDA, 'Data_Frequencia', collect),
      () => this._checkDateConsistency(CONFIG.SHEETS.FREQUENCIA_VOLTA, 'Data_Frequencia', collect),
      () => this._checkDateConsistency(CONFIG.SHEETS.MONITORES, 'Data_Cadastro', collect),
      () => this._checkDateConsistency(CONFIG.SHEETS.INCIDENTES, 'Data_Incidente', collect)
    ];

    checks.forEach(check => {
      const errors = check();
      if (collect) {
        allErrors = allErrors.concat(errors);
      }
    });

    LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, 'Coleta de inconsistências concluída.');
    return allErrors;
  },

  /**
   * Audita todas as planilhas e gera um relatório de inconsistências de tipo/dados.
   * Retorna um array de erros encontrados.
   */
  auditAllSheetsData: function() {
    const allErrors = [];
    const sheetKeys = Object.keys(CONFIG.HEADERS);
    sheetKeys.forEach(sheetKey => {
      const sheetName = CONFIG.SHEETS[sheetKey]; // Get the actual sheet name from CONFIG.SHEETS
      if (!sheetName || !CONFIG.HEADERS[sheetKey]) return; // Ensure sheetName is defined and headers exist
      // Only audit if sheet exists or has data
      const dataRows = SheetService.getAllData(sheetName);
      if (!dataRows || dataRows.length === 0) return;
      if (typeof FormService.auditSheetData === 'function') {
        const result = FormService.auditSheetData(sheetName);
        if (!result.success && result.errors.length) {
          result.errors.forEach(err => allErrors.push(`[${sheetName}] ${err}`));
        }
      }
    });
    return allErrors;
  },

  /**
   * Coleta todas as inconsistências de dados e realiza auditoria completa.
   * @param {boolean} collect - Se verdadeiro, retorna um array de erros.
   * @returns {Array} Um array de erros, se collect for verdadeiro.
   */
  collectAllInconsistenciesAndAudit: function(collect = true) {
    let allErrors = this.collectAllInconsistencies(collect);
    if (collect) {
      const auditErrors = this.auditAllSheetsData();
      allErrors = allErrors.concat(auditErrors);
    }
    return allErrors;
  },

  /**
   * Detecta e lista duplicatas para campos que deveriam ser únicos.
   * @param {string} sheetName
   * @param {string} uniqueField
   * @returns {Array} Lista de duplicatas encontradas.
   */
  listDuplicates: function(sheetName, uniqueField) {
    const data = SheetService.getAllData(sheetName);
    const map = {};
    data.forEach((row, idx) => {
      const val = row[uniqueField];
      if (!val) return;
      if (!map[val]) map[val] = [];
      map[val].push({ rowIndex: idx + 2, rowData: row });
    });
    // Retorna apenas valores com mais de um registro
    return Object.entries(map)
      .filter(([key, arr]) => arr.length > 1)
      .map(([key, arr]) => ({ value: key, count: arr.length, rows: arr }));
  },

  /**
   * Mescla registros duplicados, mantendo o mais completo (maior número de campos preenchidos).
   * Remove os demais.
   * @param {string} sheetName
   * @param {string} uniqueField
   * @returns {object} Resultado da operação.
   */
  mergeDuplicates: function(sheetName, uniqueField) {
    const duplicates = this.listDuplicates(sheetName, uniqueField);
    const merged = [];
    duplicates.forEach(dup => {
      // Escolhe o registro mais completo
      let best = dup.rows[0];
      dup.rows.forEach(r => {
        const filled = Object.values(r.rowData).filter(v => v !== '' && v !== null && v !== undefined).length;
        const bestFilled = Object.values(best.rowData).filter(v => v !== '' && v !== null && v !== undefined).length;
        if (filled > bestFilled) best = r;
      });
      // Remove os outros
      dup.rows.forEach(r => {
        if (r.rowIndex !== best.rowIndex) {
          SheetService.deleteRow(sheetName, r.rowIndex);
        }
      });
      merged.push({ value: dup.value, keptRow: best.rowIndex, removedRows: dup.rows.filter(r => r.rowIndex !== best.rowIndex).map(r => r.rowIndex) });
    });
    return { success: true, merged };
  },

  /**
   * Remove duplicatas, mantendo o registro mais recente (baseado em campo Timestamp, se existir).
   * @param {string} sheetName
   * @param {string} uniqueField
   * @param {string} [timestampField='Timestamp']
   * @returns {object} Resultado da operação.
   */
  removeDuplicatesKeepLatest: function(sheetName, uniqueField, timestampField = 'Timestamp') {
    const duplicates = this.listDuplicates(sheetName, uniqueField);
    const removed = [];
    duplicates.forEach(dup => {
      // Escolhe o registro mais recente
      let latest = dup.rows[0];
      dup.rows.forEach(r => {
        const t = new Date(r.rowData[timestampField] || 0).getTime();
        const latestT = new Date(latest.rowData[timestampField] || 0).getTime();
        if (t > latestT) latest = r;
      });
      // Remove os outros
      dup.rows.forEach(r => {
        if (r.rowIndex !== latest.rowIndex) {
          SheetService.deleteRow(sheetName, r.rowIndex);
          removed.push({ value: dup.value, removedRow: r.rowIndex });
        }
      });
    });
    return { success: true, removed };
  },

  /**
   * Lista duplicatas para todos campos únicos relevantes do sistema.
   * @returns {object} Duplicatas agrupadas por planilha/campo.
   */
  listAllSystemDuplicates: function() {
    return {
      alunosCPF: this.listDuplicates(CONFIG.SHEETS.ALUNOS, 'CPF'),
      monitoresID: this.listDuplicates(CONFIG.SHEETS.MONITORES, 'ID_Monitor'),
      veiculosPlaca: this.listDuplicates(CONFIG.SHEETS.VEICULOS, 'Placa')
    };
  },

  /**
   * Gera um relatório analítico de duplicatas para integração com o Gemini.
   * @param {string} sheetName
   * @param {string} uniqueField
   * @returns {object} Relatório de duplicatas.
   */
  generateGeminiDuplicateReport: function(sheetName, uniqueField) {
    const duplicates = this.listDuplicates(sheetName, uniqueField);
    const report = {
      totalDuplicates: 0,
      details: []
    };
    duplicates.forEach(dup => {
      report.totalDuplicates += dup.count;
      dup.rows.forEach(row => {
        report.details.push({
          value: dup.value,
          rowIndex: row.rowIndex,
          rowData: row.rowData
        });
      });
    });
    return report;
  },

  /**
   * Corrige em massa erros de formatação em um campo específico de uma planilha.
   * Exemplo: limpa todos os números de celular removendo caracteres não numéricos.
   * @param {string} sheetName - Nome da planilha.
   * @param {string} fieldName - Nome do campo a ser corrigido.
   * @param {function} formatFn - Função de formatação (ex: valor => valor.replace(/\D/g, '')).
   * @returns {object} Relatório das correções realizadas.
   */
  bulkFormatCorrection: function(sheetName, fieldName, formatFn) {
    const data = SheetService.getAllData(sheetName);
    const correctedRows = [];
    data.forEach((row, idx) => {
      const original = row[fieldName];
      if (original && typeof original === 'string') {
        const cleaned = formatFn(original);
        if (cleaned !== original) {
          // Atualiza apenas se houve alteração
          row[fieldName] = cleaned;
          SheetService.updateRow(sheetName, row.rowIndex, row);
          correctedRows.push({
            rowIndex: row.rowIndex,
            original,
            cleaned
          });
          LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, `Campo '${fieldName}' corrigido na linha ${row.rowIndex} da planilha '${sheetName}'.`, { original, cleaned });
        }
      }
    });
    return { success: true, corrected: correctedRows, total: correctedRows.length };
  },

  /**
   * Arquiva registros antigos de frequência (IDA e VOLTA) para a planilha Frequencia_Historico.
   * Move registros com mais de 'years' anos para a planilha de arquivo e remove das planilhas ativas.
   * @param {number} years - Quantidade de anos para considerar como "antigo" (default: 2).
   * @returns {object} Relatório do arquivamento.
   */
  archiveOldAttendanceRecords: function(years = 2) {
    const now = new Date();
    const cutoff = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
    const sheetsToArchive = [CONFIG.SHEETS.FREQUENCIA_IDA, CONFIG.SHEETS.FREQUENCIA_VOLTA];
    const archiveSheetName = CONFIG.SHEETS.FREQUENCIA_HISTORICO || 'Frequencia_Historico';

    // Garante que a planilha de histórico existe e tem cabeçalho
    let archiveSheet;
    try {
      archiveSheet = SheetService._getSheet(archiveSheetName);
    } catch (e) {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      archiveSheet = ss.insertSheet(archiveSheetName);
      // Cabeçalho: concatena os cabeçalhos das duas planilhas
      const headersIda = CONFIG.HEADERS.FREQUENCIA_IDA || [];
      const headersVolta = CONFIG.HEADERS.FREQUENCIA_VOLTA || [];
      const allHeaders = Array.from(new Set([...headersIda, ...headersVolta]));
      archiveSheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
    }

    const archived = [];
    sheetsToArchive.forEach(sheetName => {
      const records = SheetService.getAllData(sheetName);
      records.forEach(record => {
        const date = new Date(record.Data_Frequencia);
        if (date < cutoff) {
          // Adiciona ao histórico
          SheetService.appendRow(archiveSheetName, record);
          // Remove da planilha ativa
          SheetService.deleteRow(sheetName, record.rowIndex);
          archived.push({ sheet: sheetName, rowIndex: record.rowIndex, date: record.Data_Frequencia });
          LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, `Registro de frequência arquivado da aba '${sheetName}' linha ${record.rowIndex}.`, { date: record.Data_Frequencia });
        }
      });
    });

    return { success: true, archived, total: archived.length };
  },

  /**
   * Gera relatório Gemini sobre o impacto do arquivamento de registros antigos.
   * @param {string} apiKey
   * @param {number} years
   * @returns {object} Relatório Gemini sobre arquivamento.
   */
  generateArchiveAnalysisReport: function(apiKey, years = 2) {
    try {
      const now = new Date();
      const cutoff = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
      const sheetsToArchive = [CONFIG.SHEETS.FREQUENCIA_IDA, CONFIG.SHEETS.FREQUENCIA_VOLTA];
      const oldRecords = [];
      sheetsToArchive.forEach(sheetName => {
        const records = SheetService.getAllData(sheetName);
        records.forEach(record => {
          const date = new Date(record.Data_Frequencia);
          if (date < cutoff) {
            oldRecords.push({ sheet: sheetName, date: record.Data_Frequencia, record });
          }
        });
      });
      const prompt = `Analise o impacto do arquivamento dos registros de frequência com mais de ${years} anos no SIG-TE. Considere volume, possíveis necessidades de consulta futura, e sugira políticas de retenção e arquivamento. Dados:\n${JSON.stringify(oldRecords, null, 2)}\n\nGere um relatório detalhado e recomendações para o gestor.`;
      const a2aApp = new A2AApp();
      const geminiResponse = a2aApp.client({
        apiKey: apiKey,
        prompt: prompt
      });
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, 'Relatório Gemini de análise de arquivamento gerado.', { response: JSON.stringify(geminiResponse) });
      return { success: true, data: geminiResponse };
    } catch (error) {
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.ERROR, 'Erro na geração de relatório de arquivamento com Gemini', { error: error.message, stack: error.stack });
      return { success: false, message: `Erro ao gerar relatório de arquivamento com Gemini: ${error.message}` };
    }
  },

  /**
   * Remove linhas totalmente vazias (exceto cabeçalho) de uma planilha.
   * @param {string} sheetName
   * @returns {object} Relatório das linhas removidas.
   */
  removeEmptyRows: function(sheetName) {
    const sheet = SheetService._getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let removed = [];
    for (let i = data.length - 1; i > 0; i--) { // de baixo para cima
      const row = data[i];
      if (row.every(cell => cell === '' || cell === null)) {
        sheet.deleteRow(i + 1);
        removed.push(i + 1);
        LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, `Linha vazia removida da aba '${sheetName}' linha ${i + 1}.`);
      }
    }
    return { success: true, removedRows: removed, total: removed.length };
  },

  /**
   * Remove colunas totalmente vazias (exceto cabeçalho) de uma planilha.
   * @param {string} sheetName
   * @returns {object} Relatório das colunas removidas.
   */
  removeEmptyColumns: function(sheetName) {
    const sheet = SheetService._getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, removedColumns: [], total: 0 };
    const headers = data[0];
    let removed = [];
    for (let col = headers.length - 1; col >= 0; col--) {
      let isEmpty = true;
      for (let row = 1; row < data.length; row++) {
        if (data[row][col] !== '' && data[row][col] !== null) {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) {
        sheet.deleteColumn(col + 1);
        removed.push(headers[col]);
        LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, `Coluna vazia removida da aba '${sheetName}': '${headers[col]}'.`);
      }
    }
    return { success: true, removedColumns: removed, total: removed.length };
  },

  /**
   * Ordena os dados de uma planilha por campos especificados.
   * @param {string} sheetName
   * @param {Array<string>} fields - Campos para ordenação (na ordem de prioridade).
   * @returns {object} Relatório da ordenação.
   */
  sortSheetByFields: function(sheetName, fields) {
    const sheet = SheetService._getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    if (data.length === 0) return { success: true, sorted: false };

    // Cria função de comparação
    function compareRows(a, b) {
      for (const field of fields) {
        const idx = headers.indexOf(field);
        if (idx === -1) continue;
        if (a[idx] < b[idx]) return -1;
        if (a[idx] > b[idx]) return 1;
      }
      return 0;
    }

    const sortedData = [...data].sort(compareRows);
    sheet.getRange(2, 1, sortedData.length, headers.length).setValues(sortedData);
    LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, `Aba '${sheetName}' ordenada por campos: ${fields.join(', ')}.`);
    return { success: true, sorted: true, fields };
  },

  /**
   * Executa otimização completa em uma planilha: remove linhas/colunas vazias e ordena por campos.
   * @param {string} sheetName
   * @param {Array<string>} sortFields
   * @returns {object} Relatório da otimização.
   */
  optimizeSheet: function(sheetName, sortFields = []) {
    const removedRows = this.removeEmptyRows(sheetName);
    const removedCols = this.removeEmptyColumns(sheetName);
    let sorted = { success: true, sorted: false };
    if (sortFields.length > 0) {
      sorted = this.sortSheetByFields(sheetName, sortFields);
    }
    return {
      success: true,
      removedRows: removedRows,
      removedColumns: removedCols,
      sorted: sorted
    };
  },

  /**
   * Gera relatório Gemini sobre oportunidades de otimização das planilhas.
   * @param {string} apiKey
   * @returns {object} Relatório Gemini sobre otimização.
   */
  generateOptimizationAnalysisReport: function(apiKey) {
    try {
      const sheets = Object.values(CONFIG.SHEETS).filter(s => !CONFIG.SHEETS_TO_IGNORE_IN_SEARCH.includes(s));
      const optimizationStats = [];
      sheets.forEach(sheetName => {
        const sheet = SheetService._getSheet(sheetName);
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        let emptyRows = 0;
        let emptyCols = 0;
        // Conta linhas vazias
        for (let i = 1; i < data.length; i++) {
          if (data[i].every(cell => cell === '' || cell === null)) emptyRows++;
        }
        // Conta colunas vazias
        for (let col = 0; col < headers.length; col++) {
          let isEmpty = true;
          for (let row = 1; row < data.length; row++) {
            if (data[row][col] !== '' && data[row][col] !== null) {
              isEmpty = false;
              break;
            }
          }
          if (isEmpty) emptyCols++;
        }
        optimizationStats.push({
          sheet: sheetName,
          totalRows: data.length - 1,
          totalColumns: headers.length,
          emptyRows,
          emptyCols
        });
      });
      const prompt = `Analise as oportunidades de otimização das planilhas do SIG-TE. Considere remoção de linhas/colunas vazias, ordenação por campos relevantes e impacto na performance. Dados:\n${JSON.stringify(optimizationStats, null, 2)}\n\nGere um relatório detalhado e recomendações para o gestor.`;
      const a2aApp = new A2AApp();
      const geminiResponse = a2aApp.client({
        apiKey: apiKey,
        prompt: prompt
      });
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, 'Relatório Gemini de otimização gerado.', { response: JSON.stringify(geminiResponse) });
      return { success: true, data: geminiResponse };
    } catch (error) {
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.ERROR, 'Erro na geração de relatório de otimização com Gemini', { error: error.message, stack: error.stack });
      return { success: false, message: `Erro ao gerar relatório de otimização com Gemini: ${error.message}` };
    }
  },

  /**
   * Verifica o uso do espaço na pasta de backup do Drive e alerta se estiver se esgotando.
   * Lista arquivos antigos que podem ser removidos.
   * @param {number} maxAgeDays - Idade máxima dos arquivos para considerar como "antigos" (default: 180 dias).
   * @param {number} spaceThresholdMB - Limite de espaço em MB para alerta (default: 5000 MB).
   * @returns {object} Relatório de uso e arquivos antigos.
   */
  checkBackupFolderUsage: function(maxAgeDays = 180, spaceThresholdMB = 5000) {
    const folderId = CONFIG.BACKUP_FOLDER_ID;
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    let totalSize = 0;
    const now = new Date();
    const oldFiles = [];
    let fileCount = 0;

    while (files.hasNext()) {
      const file = files.next();
      totalSize += file.getSize();
      fileCount++;
      const created = file.getDateCreated();
      const ageDays = (now - created) / (1000 * 60 * 60 * 24);
      if (ageDays > maxAgeDays) {
        oldFiles.push({
          name: file.getName(),
          id: file.getId(),
          sizeMB: Math.round(file.getSize() / (1024 * 1024)),
          created: created,
          ageDays: Math.round(ageDays)
        });
      }
    }

    const totalSizeMB = Math.round(totalSize / (1024 * 1024));
    const alert = totalSizeMB > spaceThresholdMB;
    if (alert) {
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.WARN, `Espaço de backup no Drive acima do limite: ${totalSizeMB}MB.`);
    }

    return {
      success: true,
      totalSizeMB,
      fileCount,
      alert,
      spaceThresholdMB,
      oldFiles,
      oldFilesCount: oldFiles.length
    };
  },

  /**
   * Gera relatório Gemini sobre uso do espaço de backup e política de retenção.
   * @param {string} apiKey
   * @param {number} maxAgeDays
   * @param {number} spaceThresholdMB
   * @returns {object} Relatório Gemini sobre uso de backup.
   */
  generateBackupUsageAnalysisReport: function(apiKey, maxAgeDays = 180, spaceThresholdMB = 5000) {
    try {
      const usage = this.checkBackupFolderUsage(maxAgeDays, spaceThresholdMB);
      const prompt = `Analise o uso do espaço na pasta de backup do SIG-TE no Google Drive. O espaço total é de ${usage.totalSizeMB}MB, com ${usage.fileCount} arquivos. Os seguintes arquivos têm mais de ${maxAgeDays} dias:\n${JSON.stringify(usage.oldFiles, null, 2)}\n\nSugira políticas de retenção, exclusão automática e alertas para evitar problemas de espaço. Gere um relatório detalhado e recomendações para o gestor.`;
      const a2aApp = new A2AApp();
      const geminiResponse = a2aApp.client({
        apiKey: apiKey,
        prompt: prompt
      });
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.INFO, 'Relatório Gemini de uso de backup gerado.', { response: JSON.stringify(geminiResponse) });
      return { success: true, data: geminiResponse };
    } catch (error) {
      LoggerService.logEvent('IntegrityService', LoggerService.LEVELS.ERROR, 'Erro na geração de relatório de uso de backup com Gemini', { error: error.message, stack: error.stack });
      return { success: false, message: `Erro ao gerar relatório de uso de backup com Gemini: ${error.message}` };
    }
  },

  /**
   * Verifica a saúde do sistema: conectividade com a planilha, status das APIs externas e erros recentes nos logs.
   * @returns {object} Relatório resumido de saúde do sistema.
   */
  checkSystemHealth: function() {
    const report = {
      spreadsheet: { connected: false, message: '' },
      externalApis: [],
      recentErrors: [],
      healthy: true
    };

    // 1. Verifica conectividade com a planilha principal
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheetNames = ss.getSheets().map(s => s.getName());
      report.spreadsheet.connected = true;
      report.spreadsheet.message = `Conectado à planilha: ${ss.getName()}. Abas: ${sheetNames.join(', ')}`;
    } catch (e) {
      report.spreadsheet.connected = false;
      report.spreadsheet.message = `Erro ao conectar à planilha: ${e.message}`;
      report.healthy = false;
    }

    // 2. Verifica status das APIs externas (exemplo: Gemini/A2AApp)
    if (typeof A2AApp === 'function') {
      try {
        // Testa chamada simples (mock ou real)
        const a2aApp = new A2AApp();
        const testResult = a2aApp.client({ prompt: 'Teste de conectividade SIG-TE.' });
        report.externalApis.push({ name: 'Gemini/A2AApp', status: 'OK', message: 'API Gemini/A2AApp acessível.' });
      } catch (e) {
        report.externalApis.push({ name: 'Gemini/A2AApp', status: 'ERROR', message: e.message });
        report.healthy = false;
      }
    } else {
      report.externalApis.push({ name: 'Gemini/A2AApp', status: 'NOT_FOUND', message: 'Classe A2AApp não disponível.' });
      report.healthy = false;
    }

    // 3. Verifica presença de erros recentes nos LOGS (últimas 24h)
    try {
      const logs = SheetService.getAllData(CONFIG.SHEETS.LOGS || 'Logs');
      const now = new Date();
      const cutoff = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      report.recentErrors = logs.filter(log =>
        log.Level === LoggerService.LEVELS.ERROR &&
        new Date(log.Timestamp) >= cutoff
      );
      if (report.recentErrors.length > 0) {
        report.healthy = false;
      }
    } catch (e) {
      report.recentErrors.push({ error: e.message });
      report.healthy = false;
    }

    // Resumo final
    report.status = report.healthy ? 'OK' : 'PROBLEMAS DETECTADOS';
    return report;
  },
};