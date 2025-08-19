/**
 * @file FormService.gs
 * @description Orquestra a validação, permissão e submissão de dados de todos os formulários.
 */

const FormService = {

  // --- Métodos de Autenticação (integrados do AuthService) ---

  _handleAuthError: function(message, logLevel = LoggerService.LEVELS.ERROR, details = {}) {
    LoggerService.logEvent('FormService(Auth)', logLevel, message, details);
    return { success: false, message: message };
  },

  _findUserInSheet: function(sheetName, phoneColumn, cleanPhone) {
    const allData = SheetService.getAllData(sheetName);
    return allData.find(row => {
      const phoneValue = row[phoneColumn];
      if (!phoneValue) return false;
      return String(phoneValue).replace(/\D/g, '') === cleanPhone;
    }) || null;
  },

  authenticate: function(celular, senha) {
    try {
      if (!celular || !senha) {
        return this._handleAuthError('Celular e senha são obrigatórios.', LoggerService.LEVELS.WARN);
      }
      const cleanCelular = String(celular).replace(/\D/g, '');

      const monitor = this._findUserInSheet(CONFIG.SHEETS.MONITORES, 'Celular_Monitor', cleanCelular);
      if (monitor) {
        if (String(monitor.Status).toUpperCase() !== 'ATIVO') {
          return this._handleAuthError(CONFIG.ERROR_MESSAGES.AUTH.USER_INACTIVE, LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'inactive_monitor' });
        }
        if (CONFIG.VALIDATION.PATTERNS.MONITOR_PASSWORD.test(senha)) {
          return { success: true, user: { id: monitor.ID_Monitor, nome: monitor.Nome_Completo, celular: cleanCelular, role: 'MONITOR' } };
        }
        return this._handleAuthError(CONFIG.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS, LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'invalid_monitor_password' });
      }

      const secretario = this._findUserInSheet(CONFIG.SHEETS.SECRETARIOS, 'Celular_Secretario', cleanCelular);
      if (secretario) {
        if (String(secretario.Status).toUpperCase() !== 'ATIVO') {
          return this._handleAuthError(CONFIG.ERROR_MESSAGES.AUTH.USER_INACTIVE, LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'inactive_secretary' });
        }
        if (CONFIG.VALIDATION.PATTERNS.SECRETARY_PASSWORD.test(senha)) {
          return { success: true, user: { id: secretario.ID_Secretario, nome: secretario.Nome_Secretario, celular: cleanCelular, role: 'SECRETARY' } };
        }
        return this._handleAuthError(CONFIG.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS, LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'invalid_secretary_password' });
      }

      return this._handleAuthError('Usuário não encontrado.', LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'user_not_found' });

    } catch (e) {
      return this._handleAuthError('Ocorreu um erro inesperado durante a autenticação.', LoggerService.LEVELS.ERROR, { error: e.message, stack: e.stack });
    }
  },

  // --- Método Principal de Submissão ---

  submitForm: function(formType, formData, authData) {
    try {
      // Create a shallow copy of formData to prevent unexpected modifications
      let dataToValidate = { ...formData };

      // --- Mapeamento dos campos do frontend para os nomes esperados na planilha ---
      if (formType === 'alunos') {
        // Mapeia campos do frontend para os nomes esperados na planilha
        dataToValidate = {
          ID_Aluno: formData.studentId || '', // será gerado se for novo
          Nome_Completo: formData.fullName || formData.Nome_Completo || '',
          CPF: formData.cpf ? String(formData.cpf).replace(/\D/g, '') : (formData.CPF ? String(formData.CPF).replace(/\D/g, '') : ''),
          ID_Rota: formData.routeId || formData.ID_Rota || '',
          Nome_Acompanhante: formData.companionName || formData.Nome_Acompanhante || '',
          Celular_Responsavel: formData.secretaryPhone ? String(formData.secretaryPhone).replace(/\D/g, '') : (formData.Celular_Responsavel ? String(formData.Celular_Responsavel).replace(/\D/g, '') : ''),
          Endereco: formData.address || formData.Endereco || '',
          Contato_Emergencia_Nome: formData.emergencyContactName || formData.Contato_Emergencia_Nome || '',
          Contato_Emergencia_Telefone: formData.emergencyContactPhone ? String(formData.emergencyContactPhone).replace(/\D/g, '') : (formData.Contato_Emergencia_Telefone ? String(formData.Contato_Emergencia_Telefone).replace(/\D/g, '') : ''),
          Informacoes_Medicas: formData.medicalInfo || formData.Informacoes_Medicas || '',
          Foto_Aluno_URL: formData.Foto_Aluno_URL || '',
          studentPhotoBase64: formData.studentPhotoBase64 // usado pelo StudentService
        };
      }

      // 1. Autenticação (agora local)
      const authResult = this.authenticate(authData.celular, authData.senha);
      if (!authResult.success) {
        return authResult;
      }
      const user = authResult.user;

      // 2. Autorização
      if (!PermissionService.canSubmit(user.role, formType)) {
        const message = 'Usuário não tem permissão para esta operação';
        LoggerService.logEvent('FormService', LoggerService.LEVELS.WARN, message, { userId: user.id, role: user.role, formType });
        return { success: false, message: CONFIG.ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS };
      }

      // 3. Validação dos dados do formulário
      const validationResult = this._validateFormData(formType, dataToValidate);
      if (!validationResult.success) {
        LoggerService.logEvent('FormService', LoggerService.LEVELS.WARN, 'Falha na validação do formulário.', { formType, errors: validationResult.errors });
        return { success: false, message: 'Dados inválidos: ' + validationResult.errors.join(', ') };
      }

      // 4. Delegação para o Serviço de Negócio apropriado
      const eventTypes = ['ponto-facultativo', 'reposicao', 'atividade-extracurricular'];
      const eventTypeKey = formType.replace(/-/g, '_').toUpperCase();

      if (eventTypes.includes(formType)) {
        return EventService.recordEvent(eventTypeKey, dataToValidate, user);
      }

      let serviceResult;
      switch (formType) {
        case 'alunos':
          serviceResult = StudentService.registerOrUpdate(dataToValidate);
          break;
        case 'monitores':
          serviceResult = MonitorService.registerOrUpdate(dataToValidate);
          break;
        case 'rotas':
          serviceResult = RouteService.registerOrUpdate(dataToValidate);
          break;
        case 'frequencia-ida':
          serviceResult = AttendanceService.recordAttendanceIda(dataToValidate, user);
          break;
        case 'frequencia-volta':
          serviceResult = AttendanceService.recordAttendanceVolta(dataToValidate, user);
          break;
        default:
          return { success: false, message: `Tipo de formulário '${formType}' não reconhecido.` };
      }

      if(serviceResult.success) {
        LoggerService.logEvent('FormService', LoggerService.LEVELS.INFO, `Formulário '${formType}' submetido com sucesso.`, { userId: user.id });
      }

      return serviceResult;

    } catch (e) {
      LoggerService.logEvent('FormService', LoggerService.LEVELS.ERROR, 'Erro crítico na submissão de formulário.', { error: e.message, stack: e.stack, formType: formType });
      return { success: false, message: 'Ocorreu um erro inesperado no servidor.' };
    }
  },

  _validateFormData: function(formType, formData) {
    const errors = [];
    const sheetName = formType.toUpperCase();
    const expectedHeaders = CONFIG.HEADERS[sheetName];

    if (!expectedHeaders) {
      errors.push(`Tipo de formulário desconhecido para validação: ${formType}`);
      return { success: false, errors: errors };
    }

    // 1. Validação de Campos Obrigatórios
    expectedHeaders.forEach(header => {
      const isAutoGenerated = header.startsWith('ID_') || header === 'Timestamp';
      if (!isAutoGenerated && (formData[header] === undefined || formData[header] === null || String(formData[header]).trim() === '')) {
        errors.push(`Campo obrigatório '${header}' está faltando ou vazio.`);
      }
    });

    // 2. Validação de Formato e Valores
    for (const key in formData) {
      if (formData.hasOwnProperty(key)) {
        const value = formData[key];
        if (!value) continue; // Skip validation for empty values, required check is above

        const upperCaseKey = key.toUpperCase();

        // Validação de Padrões (Regex)
        if (upperCaseKey.includes('EMAIL') && !CONFIG.VALIDATION.PATTERNS.EMAIL.test(value)) {
          errors.push(`Formato de e-mail inválido para o campo '${key}'.`);
        }
        if (upperCaseKey.includes('CELULAR') && !CONFIG.VALIDATION.PATTERNS.CELULAR.test(String(value).replace(/\D/g, ''))) {
          errors.push(`Número de celular inválido para o campo '${key}'. Deve conter 10 ou 11 dígitos.`);
        }
        if (upperCaseKey.includes('CPF') && !CONFIG.VALIDATION.PATTERNS.CPF.test(String(value).replace(/\D/g, ''))) {
          errors.push(`CPF inválido para o campo '${key}'. Deve conter 11 dígitos.`);
        }
        if (upperCaseKey.includes('DATA') && !CONFIG.VALIDATION.PATTERNS.DATA.test(value)) {
          errors.push(`Formato de data inválido para o campo '${key}'. Use DD/MM/YYYY.`);
        }

        // Validação de Valores Permitidos (Dropdowns)
        if (upperCaseKey.includes('STATUS') && !CONFIG.VALIDATION.ALLOWED_VALUES.STATUS.includes(String(value).toUpperCase())) {
          errors.push(`Status inválido para o campo '${key}'. Valores permitidos: ${CONFIG.VALIDATION.ALLOWED_VALUES.STATUS.join(', ')}.`);
        }
        if (upperCaseKey.includes('TURNO') && !CONFIG.VALIDATION.ALLOWED_VALUES.TURNO.includes(String(value).toUpperCase())) {
          errors.push(`Turno inválido para o campo '${key}'. Valores permitidos: ${CONFIG.VALIDATION.ALLOWED_VALUES.TURNO.join(', ')}.`);
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors: [...new Set(errors)] }; // Remove duplicate errors
    }
    return { success: true };
  },

  /**
   * Audita os dados das planilhas, verificando se cada coluna corresponde ao tipo e propósito do cabeçalho.
   * Retorna um relatório de inconsistências encontradas.
   */
  auditSheetData: function(sheetName) {
    const errors = [];
    const headers = CONFIG.HEADERS[sheetName];
    if (!headers) return { success: false, errors: [`Cabeçalho não encontrado para ${sheetName}`] };

    const dataRows = SheetService.getAllData(sheetName);
    if (!dataRows || dataRows.length === 0) {
      // Sheet missing or empty, treat as success but warn
      return { success: true, errors: [`Aba '${sheetName}' não encontrada ou sem dados.`] };
    }
    dataRows.forEach((row, idx) => {
      headers.forEach(header => {
        const value = row[header];
        // Validação de CPF
        if (header === 'CPF' && value) {
          const cleanCpf = String(value).replace(/\D/g, '');
          if (!CONFIG.VALIDATION.PATTERNS.CPF.test(cleanCpf)) {
            errors.push(`Linha ${idx + 2}: CPF inválido '${value}' no campo '${header}'.`);
          }
        }
        // Validação de Celular
        if (header.includes('Celular') && value) {
          const cleanPhone = String(value).replace(/\D/g, '');
          if (!CONFIG.VALIDATION.PATTERNS.CELULAR.test(cleanPhone)) {
            errors.push(`Linha ${idx + 2}: Celular inválido '${value}' no campo '${header}'.`);
          }
        }
        // Validação de Email
        if (header.includes('Email') && value) {
          if (!CONFIG.VALIDATION.PATTERNS.EMAIL.test(value)) {
            errors.push(`Linha ${idx + 2}: Email inválido '${value}' no campo '${header}'.`);
          }
        }
        // Validação de Data
        if (header.includes('Data') && value) {
          if (!CONFIG.VALIDATION.PATTERNS.DATA.test(value)) {
            errors.push(`Linha ${idx + 2}: Data inválida '${value}' no campo '${header}'.`);
          }
        }
        // Outros tipos podem ser adicionados conforme necessidade
      });
    });
    return { success: errors.length === 0, errors };
  },
};
