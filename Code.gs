/**
 * @file Code.gs
 * @description Ponto de entrada principal para a aplicação web SIG-TE e funções de menu.
 */

/**
 * Roteador para requisições GET. Serve a interface principal do usuário.
 * @param {GoogleAppsScript.Events.DoGet} e O objeto de evento da requisição.
 * @returns {HtmlService.HtmlOutput} A página principal da aplicação.
 */
function doGet() {
  // Serve the main HTML file
  const htmlOutput = HtmlService.createHtmlOutputFromFile('Index')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  return htmlOutput;
}

/**
 * Roteador para requisições POST. Ponto de entrada para todas as submissões de formulário.
 * @param {GoogleAppsScript.Events.DoPost} e O objeto de evento da requisição.
 * @returns {ContentService.TextOutput} Uma resposta em formato JSON.
 */
function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const { formType, formData, authData } = request;

    if (!formType || !formData) {
      throw new Error("Tipo de formulário ou dados do formulário ausentes.");
    }

    const result = FormService.submitForm(formType, formData, authData || {});
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    LoggerService.logEvent('Code.gs', LoggerService.LEVELS.ERROR, 'Erro crítico em doPost.', { error: error.message, stack: error.stack });
    const errorResponse = { success: false, message: 'Erro interno no servidor: ' + error.message };
    return ContentService.createTextOutput(JSON.stringify(errorResponse)).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Adiciona um menu personalizado à planilha quando ela é aberta.
 */
function onOpen() {
  if (typeof SpreadsheetApp.getUi === 'function') {
    SpreadsheetApp.getUi()
      .createMenu('SIG-TE')
      .addItem('Abrir Localizador', 'openSearchDialog')
      .addSeparator()
      .addItem('Verificar Integridade dos Dados', 'runIntegrityCheck')
      .addSeparator()
      .addItem('Analisar Logs Agora', 'runLogScan')
      .addSeparator()
      .addItem('Gerar Relatório de Inconsistências', 'runInconsistencyReport')
      .addSeparator()
      .addItem('Executar Todas as Verificações de Consistência de Dados', 'runAllDataConsistencyChecks')
      .addToUi();
  }
}

/**
 * Abre o diálogo de busca a partir do menu.
 */
function openSearchDialog() {
  if (typeof SpreadsheetApp.getUi === 'function') {
    const html = HtmlService.createHtmlOutputFromFile('SearchDialog')
      .setWidth(800)
      .setHeight(600);
    SpreadsheetApp.getUi().showModalDialog(html, 'Localizar Conteúdo - SIG-TE');
  }
}

/**
 * Inclui o conteúdo de um arquivo (CSS, JS, etc.) em uma página HTML.
 * Essencial para modularizar o frontend.
 * @param {string} filename O nome do arquivo a ser incluído.
 * @returns {string} O conteúdo do arquivo.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Obtém o conteúdo HTML de uma página/rota específica.
 * Centraliza a navegação da aplicação.
 * @param {string} routeName O nome da rota a ser carregada (ex: 'dashboard', 'student').
 * @returns {string} O conteúdo HTML da página solicitada.
 */
function getRoute(routeName) {
  // Mapeia o nome da rota para o nome do arquivo HTML correspondente.
  const routeToFileMap = {
    'dashboard': 'DashboardForm.html',
    'alunos': 'StudentRegistrationForm.html',
    'rotas': 'RouteRegistrationForm.html',
    'frequencia': 'AttendanceRegistrationForm.html',
    'incident': 'IncidentRegistrationForm.html',
    'student': 'StudentRegistrationForm.html',
    'vehicle': 'VehicleRegistrationForm.html',
    'configuracoes': 'ConfiguracoesForm.html',
    'chatbot': 'ChatbotForm.html'
  };

  const fileName = routeToFileMap[routeName];

  if (fileName) {
    return include(fileName);
  } else {
    // Retorna uma mensagem de erro se a rota não for encontrada.
    return '<div>Página não encontrada: ' + routeName + '</div>';
  }
}

/**
 * Expõe a função de autenticação do FormService para o cliente.
 * @param {string} celular O número de celular do usuário.
 * @param {string} senha A senha do usuário.
 * @returns {object} O resultado da autenticação.
 */
function authenticate(celular, senha) {
  return FormService.authenticate(celular, senha);
}

/**
 * Expõe a função getStudentsByRoute do StudentService para o cliente.
 * @param {string} routeId O ID da rota.
 * @returns {object} A lista de alunos na rota.
 */
function getStudentsByRoute(routeId) {
  return StudentService.getStudentsByRoute(routeId);
}

/**
 * Expõe a função checkFrequenciaStatus do AttendanceService para o cliente.
 * @param {string} date A data da frequência (YYYY-MM-DD).
 * @param {string} routeId O ID da rota.
 * @param {string} monitorCelular O celular do monitor.
 * @returns {object} O status da frequência.
 */
function checkFrequenciaStatus(date, routeId, monitorCelular) {
  return AttendanceService.checkFrequenciaStatus(date, routeId, monitorCelular);
}

/**
 * Expõe a função getAttendanceHistory do AttendanceService para o cliente.
 * @param {string} routeId O ID da rota.
 * @returns {object} O histórico de frequência da rota.
 */
function getAttendanceHistory(routeId) {
  return AttendanceService.getAttendanceHistory(routeId);
}

/**
 * Expõe a função getInitialDataForStudentForm do StudentService para o cliente.
 * @returns {object} Dados iniciais para o formulário de aluno.
 */
function getInitialDataForStudentForm() {
  return StudentService.getInitialDataForStudentForm();
}

/**
 * Expõe a função getRouteCapacityInfo do StudentService para o cliente.
 * @param {string} routeId O ID da rota.
 * @returns {object} Informações de capacidade da rota.
 */
function getRouteCapacityInfo(routeId) {
  return StudentService.getRouteCapacityInfo(routeId);
}

/**
 * Expõe a função getInitialDataForRouteForm do RouteService para o cliente.
 * @returns {object} Dados iniciais para o formulário de rota.
 */
function getInitialDataForRouteForm() {
  return RouteService.getInitialDataForRouteForm();
}

/**
 * Expõe a função createBackup do BackupService para o cliente.
 * @returns {object} O resultado da criação do backup.
 */
function createFullBackup() {
  return BackupService.createBackup();
}

/**
 * Expõe a função processQuery do ChatbotService para o cliente.
 * @param {string} query A consulta do usuário.
 * @returns {object} A resposta do chatbot.
 */
function processChatbotQuery(query) {
  return ChatbotService.processQuery(query);
}

/**
 * Expõe a função getInitialDataForAttendanceForm para o cliente.
 * @returns {object} Dados iniciais para o formulário de frequência.
 */
function getInitialDataForAttendanceForm() {
  return AttendanceService.getInitialDataForAttendanceForm();
}

/**
 * Expõe a função getInitialDataForEventForm do EventService para o cliente.
 * @returns {object} Dados iniciais para o formulário de eventos.
 */
function getInitialDataForEventForm() {
  return EventService.getInitialDataForEventForm();
}

/**
 * Expõe o nome da aplicação do SIGTE_CONFIG para o cliente.
 * @returns {string} O nome da aplicação.
 */
function getAppName() {
  return CONFIG.APP_NAME;
}

/**
 * Expõe a função que gera o HTML avançado do dashboard para o cliente.
 * @returns {object} HTML e dados de gráficos do dashboard.
 */
function generateAdvancedDashboardHTML() {
  return DashboardService.generateAdvancedDashboardHTML();
}

/**
 * Cria um gatilho (trigger) diário para a verificação de integridade.
 */
function createDailyIntegrityCheckTrigger() {
  // Deleta gatilhos existentes para evitar duplicatas
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runIntegrityCheck') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Cria um novo gatilho para rodar todo dia
  ScriptApp.newTrigger('runIntegrityCheck')
    .timeBased()
    .everyDays(1)
    .atHour(1) // Executa à 1 da manhã
    .create();
  LoggerService.logEvent('Code.gs', LoggerService.LEVELS.INFO, 'Gatilho de verificação de integridade diária criado/atualizado.');
}

/**
 * Função para ser chamada pelo gatilho ou manualmente.
 */
function runIntegrityCheck() {
  IntegrityService.checkAllIntegrity();
}

/**
 * Cria um gatilho (trigger) para a verificação de logs a cada hora.
 */
function createHourlyLogScanTrigger() {
  // Deleta gatilhos existentes para evitar duplicatas
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runLogScan') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Cria um novo gatilho para rodar a cada hora
  ScriptApp.newTrigger('runLogScan')
    .timeBased()
    .everyHours(1)
    .create();
  LoggerService.logEvent('Code.gs', LoggerService.LEVELS.INFO, 'Gatilho de verificação de logs a cada hora criado/atualizado.');
}

/**
 * Função para ser chamada pelo gatilho ou manualmente.
 */
function runLogScan() {
  MonitoringService.scanLogsAndNotify();
}

/**
 * Cria um gatilho (trigger) para a geração do relatório mensal de inconsistências.
 */
function createMonthlyReportTrigger() {
  // Deleta gatilhos existentes para evitar duplicatas
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runInconsistencyReport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Cria um novo gatilho para rodar no primeiro dia de cada mês
  ScriptApp.newTrigger('runInconsistencyReport')
    .timeBased()
    .onMonthDay(1)
    .atHour(2) // Executa às 2 da manhã
    .create();
  LoggerService.logEvent('Code.gs', LoggerService.LEVELS.INFO, 'Gatilho de relatório mensal de inconsistências criado/atualizado.');
}

/**
 * Função para ser chamada pelo gatilho ou manualmente.
 */
function runInconsistencyReport() {
  ReportService.generateMonthlyInconsistencyReport();
}

/**
 * Expõe a função checkAttendanceConsistency do AttendanceService para o cliente.
 * @returns {object} Lista de inconsistências de frequência.
 */
function checkAttendanceConsistency() {
  return AttendanceService.checkAttendanceConsistency();
}

/**
 * Executa todas as verificações de consistência de dados.
 */
function runAllDataConsistencyChecks() {
  return runAllConsistencyChecks();
}
function checkAttendanceConsistency() {
  return AttendanceService.checkAttendanceConsistency();
}

/**
 * Executa todas as verificações de consistência de dados.
 */
function runAllDataConsistencyChecks() {
  return runAllConsistencyChecks();
}
