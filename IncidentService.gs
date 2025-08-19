/**
 * @file IncidentService.gs
 * @description Serviço de Negócio para a entidade Incidente.
 */

const IncidentService = {

  _validateIncidentData: function(incidentData) {
    const errors = [];

    // 1. Validação de Campos Obrigatórios
    const requiredFields = ['Data_Incidente', 'Tipo_Incidente', 'Descricao'];
    requiredFields.forEach(field => {
      if (!incidentData[field]) {
        errors.push(`O campo obrigatório '${field}' não foi preenchido.`);
      }
    });

    if (errors.length > 0) return { success: false, message: errors.join(' ') };

    // 2. Validação de Formato e Valores
    // Data do Incidente
    const incidentDate = new Date(incidentData.Data_Incidente);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    if (isNaN(incidentDate.getTime())) {
      errors.push('Data do Incidente inválida.');
    } else if (incidentDate > today) {
      errors.push('A Data do Incidente não pode ser uma data futura.');
    }

    // Tipo de Incidente
    const tipoIncidente = incidentData.Tipo_Incidente.toUpperCase();
    if (!CONFIG.VALIDATION.ALLOWED_VALUES.TIPO_INCIDENTE.includes(tipoIncidente)) {
      errors.push(`Tipo de Incidente inválido. Valores permitidos: ${CONFIG.VALIDATION.ALLOWED_VALUES.TIPO_INCIDENTE.join(', ')}.`);
    }

    if (errors.length > 0) {
      return { success: false, message: errors.join(' ') };
    }

    return { success: true };
  },

  register: function(formData) {
    try {
      const incidentData = {
        Timestamp: new Date(),
        Data_Incidente: formData.Data_Incidente || '',
        Tipo_Incidente: formData.Tipo_Incidente || '',
        Descricao: formData.Descricao || '',
        Envolvidos: formData.Envolvidos || ''
      };

      const validation = this._validateIncidentData(incidentData);
      if (!validation.success) return validation;

      const headers = CONFIG.HEADERS.INCIDENTES;
      const rowValues = headers.map(header => incidentData[header]);

      SheetService.appendRow(CONFIG.SHEETS.INCIDENTES, rowValues);
      return { success: true, message: 'Incidente registrado com sucesso!' };

    } catch (e) {
      LoggerService.logEvent('IncidentService', LoggerService.LEVELS.ERROR, 'Erro ao registrar incidente.', { error: e.message, stack: e.stack, formData });
      return { success: false, message: 'Ocorreu um erro interno ao registrar o incidente.' };
    }
  }
};