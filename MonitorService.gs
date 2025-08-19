/**
 * @file MonitorService.gs
 * @description Serviço de Negócio para a entidade Monitor.
 */

const MonitorService = {
  /**
   * Registra um novo monitor ou atualiza um existente.
   * @param {object} monitorData Os dados do monitor.
   * @returns {{success: boolean, message: string}} Objeto de resultado.
   */
  registerOrUpdate: function(monitorData) {
    try {
      const monitorId = monitorData.ID_Monitor;
      const cleanCelular = String(monitorData.Celular_Monitor).replace(/\D/g, '');
      const routeId = monitorData.Rota_Atribuida;

      const route = SheetService.findRow(CONFIG.SHEETS.ROTAS, 'ID_Rota', routeId);
      if (!route) {
        return { success: false, message: `A rota com ID '${routeId}' não foi encontrada.` };
      }

      const existingMonitor = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'ID_Monitor', monitorId);
      const monitorWithSamePhone = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'Celular_Monitor', cleanCelular);

      if (existingMonitor) {
        if (monitorWithSamePhone && monitorWithSamePhone.rowData.ID_Monitor !== monitorId) {
          return { success: false, message: `O celular '${cleanCelular}' já está em uso por outro monitor.` };
        }
        SheetService.updateRow(CONFIG.SHEETS.MONITORES, existingMonitor.rowIndex, monitorData);
        return { success: true, message: 'Monitor atualizado com sucesso!' };
      } else {
        if (monitorWithSamePhone) {
          return { success: false, message: `O celular '${cleanCelular}' já está cadastrado.` };
        }
        SheetService.appendRow(CONFIG.SHEETS.MONITORES, monitorData);
        return { success: true, message: 'Monitor cadastrado com sucesso!' };
      }

    } catch (e) {
      LoggerService.logEvent('MonitorService', LoggerService.LEVELS.ERROR, 'Erro ao gerenciar monitor.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao gerenciar o monitor.' };
    }
  }
};
