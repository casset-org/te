/**
 * @file MonitoringService.gs
 * @description Serviço para monitoramento de logs e envio de notificações.
 */

const MonitoringService = {

  /**
   * Analisa os logs das últimas 24 horas e notifica se os limites de erro/aviso forem excedidos.
   */
  scanLogsAndNotify: function() {
    try {
      const logs = SheetService.getAllData(CONFIG.SHEETS.LOGS);
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

      let errorCount = 0;
      let warnCount = 0;

      logs.forEach(log => {
        const logDate = new Date(log.Timestamp);
        if (logDate >= twentyFourHoursAgo) {
          if (log.Level === LoggerService.LEVELS.ERROR) {
            errorCount++;
          }
          if (log.Level === LoggerService.LEVELS.WARN) {
            warnCount++;
          }
        }
      });

      if (errorCount >= CONFIG.MONITORING.ERROR_THRESHOLD || warnCount >= CONFIG.MONITORING.WARN_THRESHOLD) {
        this._sendNotification(errorCount, warnCount);
      }

    } catch (e) {
      LoggerService.logEvent('MonitoringService', LoggerService.LEVELS.ERROR, 'Erro ao escanear logs.', { error: e.message, stack: e.stack });
    }
  },

  /**
   * @private
   * Envia uma notificação por e-mail sobre os logs.
   * @param {number} errorCount - A contagem de erros.
   * @param {number} warnCount - A contagem de avisos.
   */
  _sendNotification: function(errorCount, warnCount) {
    const recipient = CONFIG.MONITORING.NOTIFICATION_EMAIL;
    if (!recipient || recipient === 'seu-email@exemplo.com') {
      LoggerService.logEvent('MonitoringService', LoggerService.LEVELS.WARN, 'E-mail de notificação de monitoramento não configurado.');
      return;
    }

    const subject = `Alerta de Monitoramento de Logs - ${CONFIG.APP_NAME}`;
    let body = `<h2>Alerta de Monitoramento de Logs</h2>
              <p>O sistema detectou um número significativo de avisos ou erros nas últimas 24 horas.</p>
              <ul>
                <li><strong>Erros (ERROR):</strong> ${errorCount} (Limite: ${CONFIG.MONITORING.ERROR_THRESHOLD})</li>
                <li><strong>Avisos (WARN):</strong> ${warnCount} (Limite: ${CONFIG.MONITORING.WARN_THRESHOLD})</li>
              </ul>
              <p>Por favor, verifique a planilha de <strong>Logs</strong> para mais detalhes.</p>
              <p><em>Esta é uma mensagem automática do sistema ${CONFIG.APP_NAME}.</em></p>`;

    try {
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: body
      });
      LoggerService.logEvent('MonitoringService', LoggerService.LEVELS.INFO, 'E-mail de notificação de monitoramento enviado.', { recipient, errorCount, warnCount });
    } catch (e) {
      LoggerService.logEvent('MonitoringService', LoggerService.LEVELS.ERROR, 'Falha ao enviar e-mail de notificação de monitoramento.', { error: e.message, stack: e.stack });
    }
  }
};