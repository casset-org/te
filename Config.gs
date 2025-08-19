/**
 * @file Config.gs
 * @description Arquivo de configuração mestre para o projeto SIG-TE.
 * ATENÇÃO: Os nomes das abas e cabeçalhos devem corresponder exatamente (case-sensitive) aos nomes na planilha Google Sheets.
 */

function getGeminiApiKey() {
  try {
    const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!key) {
      Logger.log('ATENÇÃO: Chave da API Gemini (GEMINI_API_KEY) não configurada nas propriedades do projeto.');
      return 'DUMMY_API_KEY';
    }
    return key;
  } catch (e) {
    console.error("Erro ao acessar as propriedades do script: " + e.message);
    return 'DUMMY_API_KEY';
  }
}

// Always assign to globalThis.CONFIG to avoid redeclaration errors
globalThis.CONFIG = {
  APP_NAME: 'SIG-TE',
  APP_VERSION: '5.2.0',
  SPREADSHEET_ID: '1lFmxSogKSgZdMcizV3s26pQ2i5QEUmsDliC8TzbyjPg', // <-- SUBSTITUIR PELO ID DA SUA PLANILHA

  SHEETS: {
    ESCOLAS: 'Escolas',
    MONITORES: 'Monitores',
    SECRETARIOS: 'Secretarios',
    ROTAS: 'Rotas',
    ALUNOS: 'Alunos',
    FREQUENCIA_IDA: 'Frequência_Ida',
    FREQUENCIA_VOLTA: 'Frequência_Volta',
    CONTROLE_DE_VAGAS: 'Controle_de_Vagas',
    PONTO_FACULTATIVO: 'Ponto_Facultativo',
    REPOSICAO: 'Reposição',
    ATIVIDADE_EXTRACURRICULAR: 'Atividade_Extracurricular',
    VEICULOS: 'Veículos', // Changed from 'Veiculos' to 'Veículos'
    INCIDENTES: 'Incidentes', // Added
    LOGS: 'Logs'
  },

  STUDENT_SHEET: 'Alunos',
  VEHICLE_SHEET: 'Veículos',
  INCIDENT_SHEET: 'Incidentes',
  ROUTE_SHEET: 'Rotas',

  HEADERS: {
    ALUNOS: ['ID_Aluno', 'Nome_Completo', 'CPF', 'RA_Aluno', 'ID_Rota', 'Nome_Acompanhante', 'Celular_Responsavel', 'Endereco'],
    MONITORES: ['ID_Monitor', 'Nome_Completo', 'Celular_Monitor', 'Email', 'Rota_Atribuida', 'Status', 'Data_Cadastro', 'Observacoes'],
    VEICULOS: ['ID_Onibus', 'Placa', 'Modelo', 'Capacidade_Total'], // Added
    INCIDENTES: ['Timestamp', 'Data_Incidente', 'Tipo_Incidente', 'Descricao', 'Envolvidos'], // Added
    SECRETARIOS: ['ID_Secretario', 'Nome_Secretario', 'Celular_Secretario', 'Email', 'Nome_Escola', 'Status'],
    ESCOLAS: ['Nome_Escola', 'Nome_Secretario', 'Celular_Secretario', 'Email', 'Endereco', 'Status'],
    ROTAS: ['ID_Rota', 'ID_Onibus', 'Nome_Escola', 'Turno', 'Itinerario_Padrao', 'Celular_Monitor', 'Dias_da_Semana_1', 'Dias_da_Semana_2', 'Dias_da_Semana_3', 'Dias_da_Semana_4', 'Dias_da_Semana_5', 'Dias_da_Semana_6', 'Vagas_Totais_no_Veiculo', 'Celular_Secretario'],
    FREQUENCIA_IDA: ['Timestamp', 'Data_Frequencia', 'ID_Rota', 'ID_Monitor', 'Celular_Monitor', 'Nome_Aluno', 'RA_Aluno', 'Status_Frequencia', 'Observacoes', 'Latitude', 'Longitude', 'Foto_URL'],
    FREQUENCIA_VOLTA: ['Timestamp', 'Data_Frequencia', 'ID_Rota', 'ID_Monitor', 'Celular_Monitor', 'Nome_Aluno', 'RA_Aluno', 'Status_Frequencia', 'Observacoes', 'Latitude', 'Longitude', 'Foto_URL'],
    CONTROLE_DE_VAGAS: ['Timestamp', 'Data_Evento', 'ID_Rota', 'Nome_Escola', 'ID_Aluno', 'Nome_Aluno', 'Nome_Acompanhante', 'Vagas_Ocupadas', 'Celular_Secretario', 'Status', 'Observacoes'],
    PONTO_FACULTATIVO: ['Nome_Escola', 'Data_Ponto_Facultativo', 'Motivo', 'Celular_Secretario', 'Status'],
    REPOSICAO: ['Nome_Escola', 'Data_Reposicao', 'Motivo', 'Celular_Secretario', 'Status'],
    ATIVIDADE_EXTRACURRICULAR: ['Nome_Escola', 'Data_Atividade', 'Descricao', 'Celular_Secretario', 'Status'],
    LOGS: ['Timestamp', 'Level', 'Service', 'Message', 'Details', 'User']
  },

  SHEETS_TO_IGNORE_IN_SEARCH: ['Dashboard', 'Logs'],

  GEMINI: {
    API_KEY: getGeminiApiKey(),
    MODEL: 'gemini-2.5-pro-latest',
  },

  VALIDATION: {
    PATTERNS: {
      EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      CELULAR: /^\d{10,11}$/,
      CPF: /^\d{11}$/,
      DATA: /^\d{2}\/\d{2}\/\d{4}$/,
      PLACA_MERCOSUL: /^[A-Z]{3}\d[A-Z]\d{2}$/,
      MONITOR_PASSWORD: /^sedftop26$/,
      SECRETARY_PASSWORD: /^admin123$/,
      GOOGLE_MAPS_URL: /^https:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9]+$/
    },
    ALLOWED_VALUES: {
      STATUS: ['ATIVO', 'INATIVO'],
      TURNO: ['MANHÃ', 'TARDE', 'NOITE'],
      TIPO_INCIDENTE: ['ATRASO', 'ACIDENTE', 'PROBLEMA MECÂNICO', 'COMPORTAMENTAL']
    }
  },

  ERROR_MESSAGES: {
    AUTH: {
      INVALID_CREDENTIALS: 'Credenciais inválidas.',
      USER_INACTIVE: 'Usuário inativo. Entre em contato com o administrador.',
      INSUFFICIENT_PERMISSIONS: 'Usuário não tem permissão para esta operação.',
    }
  },
  BACKUP_FOLDER_ID: '1V4ybXwDDpctQFsJiEL9NggVObY4wmfAm', // ID da pasta de backup no Google Drive

  MONITORING: {
    NOTIFICATION_EMAIL: 'seu-email@exemplo.com', // <-- SUBSTITUIR PELO SEU E-MAIL
    ERROR_THRESHOLD: 5,
    WARN_THRESHOLD: 20
  }
};

/**
 * Obtém uma configuração específica usando um caminho de string (ex: 'VALIDATION.PATTERNS.EMAIL').
 * @param {string} path O caminho para a configuração desejada.
 * @returns {*} O valor da configuração ou a string do path se não for encontrado.
 */
function getConfig(path) {
  if (!path || typeof path !== 'string') return path;
  return path.split('.').reduce((acc, part) => acc && acc[part], globalThis.CONFIG) || path;
}
