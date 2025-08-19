
/**
 * @file LoggerService.gs
 * @description Serviço para registrar logs de eventos, avisos e erros.
 */

const LoggerService = {
  LEVELS: {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
  },

  /**
   * Registra um evento na aba de Logs.
   * @param {string} service O nome do serviço/arquivo de origem.
   * @param {string} level O nível do log (INFO, WARN, ERROR).
   * @param {string} message A mensagem de log.
   * @param {object} details Detalhes adicionais em formato de objeto.
   */
  logEvent: function(service, level, message, details = {}, user = null) {
    try {
      const logSheet = SheetService._getSheet(CONFIG.SHEETS.LOGS);
      const timestamp = new Date();
      const userEmail = user && user.email ? user.email : (Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'system');
      const detailsString = JSON.stringify(details);

      logSheet.appendRow([timestamp, level, service, message, detailsString, userEmail]);
    } catch (e) {
      console.error(`Falha CRÍTICA ao registrar log: ${e.message}`);
    }
  }
};
