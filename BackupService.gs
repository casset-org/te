/**
 * @file BackupService.gs
 * @description Serviço para gerenciar a criação de backups da planilha.
 */

const BackupService = {
  /**
   * Cria um backup de uma aba específica dentro da mesma planilha.
   * @param {string} sheetName O nome da aba para fazer backup.
   * @returns {{success: boolean, message: string, backupSheetName?: string}}
   */
  backupSheet: function(sheetName) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sourceSheet = ss.getSheetByName(sheetName);

      if (!sourceSheet) {
        const errorMsg = `Aba '${sheetName}' não encontrada.`;
        LoggerService.logEvent('BackupService', LoggerService.LEVELS.WARN, errorMsg);
        return { success: false, message: errorMsg };
      }

      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
      const backupSheetName = `[BACKUP] ${sheetName} - ${timestamp}`;
      
      const backupSheet = sourceSheet.copyTo(ss).setName(backupSheetName);
      
      // Opcional: Mover a aba de backup para o final
      ss.setActiveSheet(backupSheet);
      ss.moveActiveSheet(ss.getNumSheets());

      const message = `Backup da aba '${sheetName}' criado com sucesso como '${backupSheetName}'.`;
      LoggerService.logEvent('BackupService', LoggerService.LEVELS.INFO, message);
      return { success: true, message: message, backupSheetName: backupSheetName };

    } catch (e) {
      LoggerService.logEvent('BackupService', LoggerService.LEVELS.ERROR, `Falha ao fazer backup da aba '${sheetName}'.`, { error: e.message, stack: e.stack });
      return { success: false, message: `Ocorreu um erro ao fazer backup da aba: ${e.message}` };
    }
  },

  /**
   * Restaura os dados de uma aba de backup para a aba original.
   * @param {string} targetSheetName O nome da aba para restaurar.
   * @param {string} backupSheetName O nome da aba de backup de onde os dados serão lidos.
   * @returns {{success: boolean, message: string}}
   */
  restoreSheet: function(targetSheetName, backupSheetName) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const targetSheet = ss.getSheetByName(targetSheetName);
      const backupSheet = ss.getSheetByName(backupSheetName);

      if (!backupSheet) {
        const errorMsg = `Aba de backup '${backupSheetName}' não encontrada.`;
        LoggerService.logEvent('BackupService', LoggerService.LEVELS.WARN, errorMsg);
        return { success: false, message: errorMsg };
      }
      
      if (!targetSheet) {
        const errorMsg = `Aba de destino '${targetSheetName}' não encontrada.`;
        LoggerService.logEvent('BackupService', LoggerService.LEVELS.WARN, errorMsg);
        return { success: false, message: errorMsg };
      }

      // Limpa a aba de destino e copia os dados do backup
      targetSheet.clearContents();
      const sourceRange = backupSheet.getDataRange();
      const sourceValues = sourceRange.getValues();
      
      targetSheet.getRange(1, 1, sourceValues.length, sourceValues[0].length).setValues(sourceValues);

      const message = `Aba '${targetSheetName}' restaurada com sucesso a partir de '${backupSheetName}'.`;
      LoggerService.logEvent('BackupService', LoggerService.LEVELS.INFO, message);
      return { success: true, message: message };

    } catch (e) {
      LoggerService.logEvent('BackupService', LoggerService.LEVELS.ERROR, `Falha ao restaurar a aba '${targetSheetName}'.`, { error: e.message, stack: e.stack });
      return { success: false, message: `Ocorreu um erro ao restaurar a aba: ${e.message}` };
    }
  },
  
  /**
   * Cria um backup completo da planilha em uma nova planilha na pasta raiz do Drive.
   * @returns {{success: boolean, message: string, backupKey?: string}}
   */
  createBackup: function() {
    try {
      const sourceSpreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH-mm-ss");
      const backupName = `[BACKUP] ${sourceSpreadsheet.getName()} - ${timestamp}`;

      // Copia a planilha para a pasta de backup especificada
      const destinationFolder = DriveApp.getFolderById(CONFIG.BACKUP_FOLDER_ID);
      const backupFile = sourceSpreadsheet.copy(backupName);
      
      // Remove o arquivo da pasta raiz (onde foi criado por padrão)
      const rootFolder = DriveApp.getRootFolder();
      rootFolder.removeFile(backupFile);
      
      // Adiciona o arquivo à pasta de destino
      destinationFolder.addFile(backupFile);

      const backupKey = backupFile.getId();

      const message = `Backup criado com sucesso! Nome: ${backupName}`;
      LoggerService.logEvent('BackupService', LoggerService.LEVELS.INFO, message, { backupId: backupKey });

      return { success: true, message: message, backupKey: backupKey };
    } catch (e) {
      LoggerService.logEvent('BackupService', LoggerService.LEVELS.ERROR, 'Falha ao criar backup.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Ocorreu um erro ao criar o backup.' };
    }
  }
};