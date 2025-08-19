/**
 * @file ChatbotService.gs
 * @description Serviço de backend para o chatbot, processando consultas sobre os dados da planilha.
 */

// Certifique-se que estes valores correspondam aos nomes das abas na planilha


const ChatbotService = {
  /**
   * Coleta dados de todas as abas relevantes da planilha.
   * @returns {object} Um objeto contendo os dados de todas as abas.
   */
  getAllSheetData: function() {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    const data = {};

    allSheets.forEach(sheet => {
      const sheetName = sheet.getName();
      // Excluir abas de backup ou outras abas irrelevantes para o chatbot
      if (!sheetName.startsWith('[BACKUP]') && !CONFIG.SHEETS_TO_IGNORE_IN_SEARCH.includes(sheetName)) {
        const sheetData = sheet.getDataRange().getValues();
        if (sheetData.length > 0) {
          const headers = sheetData[0];
          const rows = sheetData.slice(1);
          data[sheetName] = rows.map(row => {
            const rowObject = {};
            headers.forEach((header, index) => {
              rowObject[header] = row[index];
            });
            return rowObject;
          });
        }
      }
    });
    return data;
  },

  /**
   * Processa uma consulta do usuário e retorna uma resposta baseada nos dados da planilha.
   * Esta é uma implementação simplificada de um chatbot, focada em busca de informações diretas.
   * @param {string} query A consulta do usuário.
   * @returns {{success: boolean, response: string}}
   */
  processQuery: function(query) {
    try {
      const lowerQuery = query.toLowerCase();
      const sheetData = this.getAllSheetData();
      let response = "Desculpe, não consegui encontrar uma resposta para sua pergunta nos dados disponíveis.";

      if (lowerQuery.includes("total de alunos")) {
        const students = sheetData[CONFIG.SHEETS.ALUNOS] || [];
        response = `O número total de alunos cadastrados é: ${students.length}.`;
      } else if (lowerQuery.includes("total de veiculos") || lowerQuery.includes("total de onibus")) {
        const vehicles = sheetData[CONFIG.SHEETS.VEICULOS] || [];
        response = `O número total de veículos cadastrados é: ${vehicles.length}.`;
      } else if (lowerQuery.includes("incidentes este mes")) {
        const incidents = sheetData[CONFIG.SHEETS.INCIDENTES] || [];
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const monthlyIncidents = incidents.filter(inc => {
          let dateValue = inc.Data_Incidente || inc.Data;
          if (!dateValue) return false;
          let incidentDate = (dateValue instanceof Date) ? dateValue : new Date(dateValue);
          return incidentDate.getMonth() === currentMonth && incidentDate.getFullYear() === currentYear;
        });
        response = `Houve ${monthlyIncidents.length} incidentes registrados este mês.`;
      } else if (lowerQuery.includes("rotas disponiveis")) {
        const routes = sheetData[CONFIG.SHEETS.ROTAS] || [];
        const routeIds = routes.map(route => route.ID_Rota).join(', ');
        response = `As rotas disponíveis são: ${routeIds}.`;
      } else if (lowerQuery.includes("capacidade do veiculo")) {
        const vehicles = sheetData[CONFIG.SHEETS.VEICULOS] || [];
        const vehicleCapacities = vehicles.map(v => `${v.Placa}: ${v.Capacidade_Total}`).join(', ');
        response = `Capacidade dos veículos: ${vehicleCapacities}.`;
      }
      // Adicione mais condições para outras perguntas comuns

      return { success: true, response: response };
    } catch (e) {
      LoggerService.logEvent('ChatbotService', LoggerService.LEVELS.ERROR, 'Erro ao processar consulta do chatbot.', { error: e.message, stack: e.stack });
      return { success: false, response: "Ocorreu um erro ao processar sua consulta. Por favor, tente novamente." };
    }
  }
};
