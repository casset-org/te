/**
 * @file EventService.gs
 * @description Serviço de Negócio para Eventos Agendáveis.
 */

const EventService = {
  /**
   * Registra um novo evento (Ponto Facultativo, Reposição, etc.).
   * @param {string} eventType O tipo do evento (holiday, makeup, activity).
   * @param {object} formData Os dados do formulário do evento.
   * @param {object} secretaryUser O objeto do secretário autenticado.
   * @returns {{success: boolean, message: string}} Objeto de resultado.
   */
  recordEvent: function(eventType, formData, secretaryUser) {
    try {
      if (!secretaryUser || !secretaryUser.celular) {
        return { success: false, message: 'Usuário secretário inválido ou não autenticado.' };
      }

      let sheetName;
      let eventRecord = {};
      let validationResult = { success: true };

      // Common fields for all event types
      const commonFields = {
        'Celular_Secretario': secretaryUser.celular,
        'Timestamp': new Date(),
      };

      switch (eventType) {
        case 'holiday':
          sheetName = CONFIG.SHEETS.PONTO_FACULTATIVO;
          eventRecord = {
            'Nome_Escola': formData.Nome_Escola,
            'Data_Ponto_Facultativo': formData.Data_Ponto_Facultativo,
            'Motivo': formData.Motivo,
            'Status': 'Agendado',
            ...commonFields
          };
          break;
        case 'makeup':
          sheetName = CONFIG.SHEETS.REPOSICAO;
          eventRecord = {
            'Nome_Escola': formData.Nome_Escola,
            'Data_Reposicao': formData.Data_Reposicao,
            'Motivo': formData.Motivo,
            'Quantidade_Onibus': parseInt(formData.Quantidade_Onibus) || 0,
            'Status': 'Agendado',
            ...commonFields
          };
          break;
        case 'activity':
          sheetName = CONFIG.SHEETS.ATIVIDADE_EXTRACURRICULAR;
          eventRecord = {
            'Nome_Escola': formData.Nome_Escola,
            'Data_Atividade': formData.Data_Atividade,
            'Destino': formData.Destino,
            'Quantidade_Alunos': parseInt(formData.Quantidade_Alunos) || 0,
            'Descricao': formData.Descricao,
            'Link_Itinerario': formData.Link_Itinerario,
            ...commonFields
          };
          break;
        default:
          return { success: false, message: `Tipo de evento inválido: '${eventType}'.` };
      }

      // 1. Validação de campos obrigatórios (event-specific)
      switch (eventType) {
        case 'holiday':
          validationResult = this._validateHolidayData(eventRecord);
          break;
        case 'makeup':
          validationResult = this._validateMakeupData(eventRecord);
          break;
        case 'activity':
          validationResult = this._validateActivityData(eventRecord);
          break;
      }
      if (!validationResult.success) {
        return validationResult;
      }

      // 2. Validação da escola
      const schoolNamesResult = RouteService.getAllSchoolNames();
      if (!schoolNamesResult.success) {
        return { success: false, message: schoolNamesResult.message };
      }
      if (!eventRecord.Nome_Escola || !schoolNamesResult.data.includes(eventRecord.Nome_Escola)) {
        return { success: false, message: `A escola '${eventRecord.Nome_Escola}' não foi encontrada na lista de rotas cadastradas.` };
      }

      SheetService.appendRow(sheetName, eventRecord);
      return { success: true, message: 'Evento registrado com sucesso!' };

    } catch (e) {
      LoggerService.logEvent('EventService', LoggerService.LEVELS.ERROR, 'Erro ao registrar evento.', { error: e.message, stack: e.stack, eventType, formData });
      return { success: false, message: 'Ocorreu um erro interno ao registrar o evento.' };
    }
  },

  /**
   * @private
   * Valida dados de Ponto Facultativo.
   */
  _validateHolidayData: function(data) {
    if (!data.Nome_Escola || !data.Data_Ponto_Facultativo || !data.Motivo) {
      return { success: false, message: 'Todos os campos de Ponto Facultativo são obrigatórios.' };
    }
    if (new Date(data.Data_Ponto_Facultativo) < new Date()) {
        return { success: false, message: 'A data do Ponto Facultativo não pode ser no passado.' };
    }
    return { success: true };
  },

  /**
   * @private
   * Valida dados de Reposição de Aula.
   */
  _validateMakeupData: function(data) {
    if (!data.Nome_Escola || !data.Data_Reposicao || !data.Motivo || !data.Quantidade_Onibus) {
      return { success: false, message: 'Todos os campos de Reposição de Aula são obrigatórios.' };
    }
    if (new Date(data.Data_Reposicao) < new Date()) {
        return { success: false, message: 'A data da Reposição não pode ser no passado.' };
    }
    if (isNaN(data.Quantidade_Onibus) || data.Quantidade_Onibus <= 0) {
      return { success: false, message: 'Quantidade de Ônibus deve ser um número positivo.' };
    }
    return { success: true };
  },

  /**
   * @private
   * Valida dados de Atividade Extracurricular.
   */
  _validateActivityData: function(data) {
    if (!data.Nome_Escola || !data.Data_Atividade || !data.Destino || !data.Quantidade_Alunos || !data.Descricao) {
      return { success: false, message: 'Todos os campos de Atividade Extracurricular são obrigatórios.' };
    }
    if (new Date(data.Data_Atividade) < new Date()) {
        return { success: false, message: 'A data da Atividade Extracurricular não pode ser no passado.' };
    }
    if (isNaN(data.Quantidade_Alunos) || data.Quantidade_Alunos <= 0) {
      return { success: false, message: 'Quantidade de Alunos deve ser um número positivo.' };
    }
    if (data.Link_Itinerario && !CONFIG.VALIDATION.PATTERNS.GOOGLE_MAPS_URL.test(data.Link_Itinerario)) {
      return { success: false, message: 'Formato de link do Itinerário inválido.' };
    }
    return { success: true };
  },

  /**
   * Obtém dados iniciais para o formulário de eventos (escolas).
   * @returns {{success: boolean, data?: {schools: string[]}, message?: string}}
   */
  getInitialDataForEventForm: function() {
    try {
      const schoolsResult = RouteService.getAllSchoolNames();
      if (!schoolsResult.success) return schoolsResult;
      return { success: true, data: { schools: schoolsResult.data } };
    } catch (e) {
      LoggerService.logEvent('EventService', LoggerService.LEVELS.ERROR, 'Erro ao obter dados iniciais para formulário de evento.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro interno ao carregar dados iniciais para evento.' };
    }
  },

  /**
   * Obtém uma lista de próximos eventos, opcionalmente filtrada por escola e tipo.
   * @param {string} [filterSchool] Nome da escola para filtrar.
   * @param {string} [filterType] Tipo de evento para filtrar (holiday, makeup, activity).
   * @returns {{success: boolean, data?: object[], message?: string}}
   */
  getUpcomingEvents: function(filterSchool, filterType) {
    try {
      const allEvents = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch Ponto Facultativo events
      if (!filterType || filterType === 'holiday') {
        const holidays = SheetService.getAllData(CONFIG.SHEETS.PONTO_FACULTATIVO);
        holidays.forEach(record => {
          const eventDate = new Date(record.Data_Ponto_Facultativo);
          eventDate.setHours(0, 0, 0, 0);
          if (eventDate >= today && (!filterSchool || record.Nome_Escola === filterSchool)) {
            allEvents.push({
              type: 'holiday',
              title: 'Ponto Facultativo',
              date: record.Data_Ponto_Facultativo,
              school: record.Nome_Escola,
              description: record.Motivo,
              raw: record
            });
          }
        });
      }

      // Fetch Reposição events
      if (!filterType || filterType === 'makeup') {
        const makeupClasses = SheetService.getAllData(CONFIG.SHEETS.REPOSICAO);
        makeupClasses.forEach(record => {
          const eventDate = new Date(record.Data_Reposicao);
          eventDate.setHours(0, 0, 0, 0);
          if (eventDate >= today && (!filterSchool || record.Nome_Escola === filterSchool)) {
            allEvents.push({
              type: 'makeup',
              title: 'Reposição de Aula',
              date: record.Data_Reposicao,
              school: record.Nome_Escola,
              description: record.Motivo,
              busCount: record.Quantidade_Onibus,
              raw: record
            });
          }
        });
      }

      // Fetch Atividade Extracurricular events
      if (!filterType || filterType === 'activity') {
        const activities = SheetService.getAllData(CONFIG.SHEETS.ATIVIDADE_EXTRACURRICULAR);
        activities.forEach(record => {
          const eventDate = new Date(record.Data_Atividade);
          eventDate.setHours(0, 0, 0, 0);
          if (eventDate >= today && (!filterSchool || record.Nome_Escola === filterSchool)) {
            allEvents.push({
              type: 'activity',
              title: 'Atividade Extracurricular',
              date: record.Data_Atividade,
              school: record.Nome_Escola,
              destination: record.Destino,
              studentCount: record.Quantidade_Alunos,
              description: record.Descricao,
              itineraryLink: record.Link_Itinerario,
              raw: record
            });
          }
        });
      }

      // Sort events by date
      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return { success: true, data: allEvents };
    } catch (e) {
      LoggerService.logEvent('EventService', LoggerService.LEVELS.ERROR, 'Erro ao buscar próximos eventos.', { error: e.message, stack: e.stack, filterSchool, filterType });
      return { success: false, message: 'Ocorreu um erro interno ao buscar eventos.' };
    }
  }
};