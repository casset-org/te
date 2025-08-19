/**
 * @file RouteService.gs
 * @description Serviço de Negócio para a entidade Rota.
 */

const RouteService = {

  /**
   * @private
   * Valida os dados essenciais de uma rota.
   * @param {object} routeData Os dados da rota.
   * @returns {{success: boolean, message?: string}} Objeto de resultado da validação.
   */
  _validateRouteData: function(routeData, isUpdate = false) {
    const errors = [];

    // 1. Validação de Campos Obrigatórios
    const requiredFields = ['ID_Rota', 'Nome_Rota', 'Nome_Escola', 'Turno', 'Vagas_Totais_no_Veiculo', 'Celular_Monitor', 'ID_Onibus'];
    requiredFields.forEach(field => {
      if (!routeData[field] || String(routeData[field]).trim() === '') {
        errors.push(`O campo obrigatório '${field}' não foi preenchido.`);
      }
    });

    // Validação dos Dias da Semana
    const weekDays = ['Dias_da_Semana_1', 'Dias_da_Semana_2', 'Dias_da_Semana_3', 'Dias_da_Semana_4', 'Dias_da_Semana_5', 'Dias_da_Semana_6'];
    const hasAtLeastOneDay = weekDays.some(day => routeData[day]);
    if (!hasAtLeastOneDay) {
        errors.push('Pelo menos um dia da semana deve ser selecionado.');
    }

    if (errors.length > 0) return { success: false, message: errors.join(' ') };

    // 2. Validação de Formato e Existência
    // ID_Rota (só verifica unicidade se não for atualização)
    if (!isUpdate) {
        const existingRoute = SheetService.findRow(CONFIG.SHEETS.ROTAS, 'ID_Rota', routeData.ID_Rota);
        if (existingRoute) {
            errors.push(`O ID de Rota '${routeData.ID_Rota}' já existe.`);
        }
    }

    // ID_Onibus
    const vehicleExists = SheetService.findRow(CONFIG.SHEETS.VEICULOS, 'ID_Onibus', routeData.ID_Onibus);
    if (!vehicleExists) {
        errors.push(`O veículo com ID '${routeData.ID_Onibus}' não foi encontrado.`);
    }

    // Celular_Monitor
    const monitorExists = SheetService.findRow(CONFIG.SHEETS.MONITORES, 'Celular_Monitor', routeData.Celular_Monitor);
    if (!monitorExists) {
        errors.push(`O monitor com celular '${routeData.Celular_Monitor}' não foi encontrado.`);
    }

    // Capacidade
    if (isNaN(routeData.Vagas_Totais_no_Veiculo) || parseInt(routeData.Vagas_Totais_no_Veiculo) <= 0) {
      errors.push('A capacidade máxima deve ser um número positivo.');
    }

    // Link do Google Maps
    if (routeData.Link_Google_Maps && !CONFIG.VALIDATION.PATTERNS.GOOGLE_MAPS_URL.test(routeData.Link_Google_Maps)) {
      errors.push('Formato de link do Google Maps inválido.');
    }

    if (errors.length > 0) {
      return { success: false, message: errors.join(' ') };
    }

    return { success: true };
  },

  /**
   * Registra uma nova rota ou atualiza uma existente (upsert).
   * @param {object} formData Os dados do formulário da rota.
   * @returns {{success: boolean, message: string}} Objeto de resultado.
   */
  registerOrUpdate: function(formData) {
    try {
      const routeData = {
        ID_Rota: formData.ID_Rota || '',
        Nome_Rota: formData.Nome_Rota || '',
        ID_Onibus: formData.ID_Onibus || '',
        Nome_Escola: formData.Nome_Escola || '',
        Turno: formData.Turno || '',
        Itinerario_Padrao: formData.Itinerario_Padrao || '',
        Celular_Monitor: formData.Celular_Monitor || '',
        Vagas_Totais_no_Veiculo: parseInt(formData.Vagas_Totais_no_Veiculo) || 0,
        Link_Google_Maps: formData.Link_Google_Maps || '',
        Observacoes_Rota: formData.Observacoes_Rota || '',
        Celular_Secretario: formData.Celular_Secretario || '',
      };

      // Lidar com os dias da semana
      const weekDays = Array.isArray(formData.weekDays) ? formData.weekDays : (formData.weekDays ? [formData.weekDays] : []);
      for (let i = 0; i < 6; i++) {
        routeData[`Dias_da_Semana_${i + 1}`] = weekDays[i] || '';
      }

      const validation = this._validateRouteData(routeData);
      if (!validation.success) {
        return validation;
      }

      const routeId = routeData.ID_Rota;
      const existingRoute = SheetService.findRow(CONFIG.SHEETS.ROTAS, 'ID_Rota', routeId);

      if (existingRoute) {
        SheetService.updateRow(CONFIG.SHEETS.ROTAS, existingRoute.rowIndex, routeData);
        return { success: true, message: 'Rota atualizada com sucesso!' };
      } else {
        SheetService.appendRow(CONFIG.SHEETS.ROTAS, routeData);
        return { success: true, message: 'Rota cadastrada com sucesso!' };
      }

    } catch (e) {
      LoggerService.logEvent('RouteService', LoggerService.LEVELS.ERROR, 'Erro ao gerenciar rota.', { error: e.message, stack: e.stack, formData });
      return { success: false, message: 'Ocorreu um erro interno ao gerenciar a rota.' };
    }
  },

  /**
   * Obtém os detalhes de uma rota específica.
   * @param {string} routeId O ID da rota.
   * @returns {{success: boolean, data?: object, message?: string}}
   */
  getRouteDetails: function(routeId) {
    try {
      const route = SheetService.findRow(CONFIG.SHEETS.ROTAS, 'ID_Rota', routeId);
      if (route) {
        return { success: true, data: route.rowData };
      }
      return { success: false, message: `Rota com ID '${routeId}' não encontrada.` };
    } catch (e) {
      LoggerService.logEvent('RouteService', LoggerService.LEVELS.ERROR, 'Erro ao buscar detalhes da rota.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao buscar detalhes da rota.' };
    }
  },

  /**
   * Obtém uma lista de todas as rotas.
   * @returns {{success: boolean, data?: object[], message?: string}}
   */
  getAllRoutes: function() {
    try {
      const allRoutes = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
      return { success: true, data: allRoutes };
    } catch (e) {
      LoggerService.logEvent('RouteService', LoggerService.LEVELS.ERROR, 'Erro ao buscar todas as rotas.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao buscar todas as rotas.' };
    }
  },

  /**
   * Obtém uma lista de nomes de escolas únicos a partir da lista de rotas.
   * @returns {{success: boolean, data?: string[], message?: string}}
   */
  getAllSchoolNames: function() {
    try {
      const allRoutesResult = this.getAllRoutes();
      if (!allRoutesResult.success) {
        return allRoutesResult; // Propaga o erro
      }
      const schoolNames = allRoutesResult.data.map(route => route.Nome_Escola);
      const uniqueSchoolNames = [...new Set(schoolNames.filter(name => name))]; // Filtra nomes vazios
      return { success: true, data: uniqueSchoolNames };
    } catch (e) {
      LoggerService.logEvent('RouteService', LoggerService.LEVELS.ERROR, 'Erro ao buscar nomes de escolas.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao buscar nomes de escolas.' };
    }
  },

  /**
   * Obtém uma lista de monitores formatada para dropdowns.
   * @returns {{success: boolean, data?: object[], message?: string}}
   */
  getAllMonitorsForDropdown: function() {
    try {
      const allMonitors = SheetService.getAllData(CONFIG.SHEETS.MONITORES);
      const monitorsForDropdown = allMonitors.map(monitor => ({
        ID_Monitor: monitor.ID_Monitor,
        Nome_Completo: monitor.Nome_Completo + ' (' + monitor.Celular_Monitor + ')'
      }));
      return { success: true, data: monitorsForDropdown };
    } catch (e) {
      LoggerService.logEvent('RouteService', LoggerService.LEVELS.ERROR, 'Erro ao buscar monitores para dropdown.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao buscar monitores.' };
    }
  },

  /**
   * Obtém uma lista de rotas formatada para a seção de gerenciamento.
   * @returns {{success: boolean, data?: object[], message?: string}}
   */
  getAllRoutesForManagement: function() {
    try {
      const allRoutes = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
      // Pode adicionar lógica para buscar nomes de monitores e escolas para exibição aqui
      return { success: true, data: allRoutes };
    } catch (e) {
      LoggerService.logEvent('RouteService', LoggerService.LEVELS.ERROR, 'Erro ao buscar rotas para gerenciamento.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao buscar rotas para gerenciamento.' };
    }
  },

  /**
   * Obtém dados iniciais para o formulário de rota (escolas e monitores).
   * @returns {{success: boolean, data?: {schools: string[], monitors: object[]}, message?: string}}
   */
  getInitialDataForRouteForm: function() {
    try {
      const schoolsResult = this.getAllSchoolNames();
      if (!schoolsResult.success) return schoolsResult;

      const monitorsResult = this.getAllMonitorsForDropdown();
      if (!monitorsResult.success) return monitorsResult;

      return { success: true, data: { schools: schoolsResult.data, monitors: monitorsResult.data } };
    } catch (e) {
      LoggerService.logEvent('RouteService', LoggerService.LEVELS.ERROR, 'Erro ao obter dados iniciais para formulário de rota.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao carregar dados iniciais para rota.' };
    }
  }
};
