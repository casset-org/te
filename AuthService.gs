/**
 * @file AuthService.gs
 * @description Serviço de Autenticação e Autorização do SIG-TE.
 */

const AuthService = {

  /**
   * @private
   * Centraliza o tratamento de erros para o AuthService.
   * @param {string} message A mensagem de erro a ser retornada ao cliente.
   * @param {string} logLevel O nível de log (INFO, WARN, ERROR).
   * @param {object} details Detalhes adicionais para o log.
   * @returns {{success: boolean, message: string}} Objeto de resultado de erro.
   */
  _handleAuthError: function(message, logLevel = LoggerService.LEVELS.ERROR, details = {}) {
    LoggerService.logEvent('AuthService', logLevel, message, details);
    return { success: false, message: message };
  },

  /**
   * Autentica um usuário com base no celular e senha.
   * @param {string} celular O número do celular.
   * @param {string} senha A senha fornecida.
   * @returns {{success: boolean, user?: object, message?: string}} Objeto de resultado.
   */
  authenticate: function(celular, senha) {
    try {
      if (!celular || !senha) {
        return this._handleAuthError('Celular e senha são obrigatórios.', LoggerService.LEVELS.WARN);
      }
      const cleanCelular = String(celular).replace(/\D/g, '');

      // Tenta encontrar como Monitor
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

      // Tenta encontrar como Secretário
      let secretario = this._findUserInSheet(CONFIG.SHEETS.SECRETARIOS, 'Celular_Secretario', cleanCelular);
      if (secretario) {
        if (String(secretario.Status).toUpperCase() !== 'ATIVO') {
          return this._handleAuthError(CONFIG.ERROR_MESSAGES.AUTH.USER_INACTIVE, LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'inactive_secretary' });
        }
        if (CONFIG.VALIDATION.PATTERNS.SECRETARY_PASSWORD.test(senha)) {
          return { success: true, user: { id: secretario.ID_Secretario, nome: secretario.Nome_Secretario, celular: cleanCelular, role: 'SECRETARY' } };
        }
        return this._handleAuthError(CONFIG.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS, LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'invalid_secretary_password' });
      }

      // Tenta encontrar como Secretário na aba ESCOLAS
      let escola = this._findUserInSheet(CONFIG.SHEETS.ESCOLAS, 'Celular_Secretario', cleanCelular);
      if (escola) {
        if (String(escola.Status).toUpperCase() !== 'ATIVO') {
          return this._handleAuthError(CONFIG.ERROR_MESSAGES.AUTH.USER_INACTIVE, LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'inactive_school_secretary' });
        }
        if (CONFIG.VALIDATION.PATTERNS.SECRETARY_PASSWORD.test(senha)) {
          // id: nome da escola, nome: nome do secretário
          return { success: true, user: { id: escola.Nome_Escola, nome: escola.Nome_Secretario, celular: cleanCelular, role: 'SECRETARY' } };
        }
        return this._handleAuthError(CONFIG.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS, LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'invalid_school_secretary_password' });
      }

      return this._handleAuthError('Usuário não encontrado.', LoggerService.LEVELS.WARN, { celular: cleanCelular, reason: 'user_not_found' });

    } catch (e) {
      return this._handleAuthError('Ocorreu um erro inesperado durante a autenticação.', LoggerService.LEVELS.ERROR, { error: e.message, stack: e.stack });
    }
  },

  /**
   * @private
   * Função auxiliar para buscar um usuário em uma aba específica.
   */
  _findUserInSheet: function(sheetName, phoneColumn, cleanPhone) {
    const allData = SheetService.getAllData(sheetName);
    return allData.find(row => {
      const phoneValue = row[phoneColumn];
      if (!phoneValue) return false;
      return String(phoneValue).replace(/\D/g, '') === cleanPhone;
    }) || null;
  }
};
