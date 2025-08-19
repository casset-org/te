/**
 * @file ReportService.gs
 * @description Serviço para geração de relatórios.
 */

const ReportService = {

  /**
   * Gera um relatório mensal de inconsistências de dados e o envia por e-mail.
   */
  generateMonthlyInconsistencyReport: function() {
    try {
      const inconsistencies = IntegrityService.collectAllInconsistencies(true);
      const recipient = CONFIG.MONITORING.NOTIFICATION_EMAIL;

      if (!recipient || recipient === 'seu-email@exemplo.com') {
        LoggerService.logEvent('ReportService', LoggerService.LEVELS.WARN, 'E-mail de notificação para relatórios não configurado.');
        return;
      }

      const subject = `Relatório Mensal de Inconsistências de dados - ${CONFIG.APP_NAME}`;
      let body = `<h2>Relatório Mensal de Inconsistências de Dados</h2>
                <p>O sistema identificou as seguintes inconsistências nos dados:</p>`;

      if (inconsistencies.length === 0) {
        body += "<p>Nenhuma inconsistência encontrada. Ótimo trabalho!</p>";
      } else {
        body += `<p>${inconsistencies.length} inconsistências encontradas. Veja o arquivo CSV anexo para mais detalhes.</p>`;
      }

      body += `<p><em>Esta é uma mensagem automática do sistema ${CONFIG.APP_NAME}.</em></p>`;

      const csv = this._convertToCsv(inconsistencies);
      const attachment = {
        fileName: `relatorio_inconsistencias_${new Date().toISOString().slice(0, 10)}.csv`,
        content: csv,
        mimeType: 'text/csv'
      };

      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: body,
        attachments: [attachment]
      });

      LoggerService.logEvent('ReportService', LoggerService.LEVELS.INFO, 'Relatório de inconsistências enviado com sucesso.');

    } catch (e) {
      LoggerService.logEvent('ReportService', LoggerService.LEVELS.ERROR, 'Erro ao gerar relatório de inconsistências.', { error: e.message, stack: e.stack });
    }
  },

  /**
   * @private
   * Converte um array de objetos em uma string CSV.
   * @param {Array<object>} data - O array de inconsistências.
   * @returns {string} A string CSV.
   */
  _convertToCsv: function(data) {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    data.forEach(row => {
      const values = headers.map(header => {
        let value = row[header] || '';
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
    return csvRows.join('\n');
  }
};