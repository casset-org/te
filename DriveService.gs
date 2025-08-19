/**
 * @file DriveService.gs
 * @description Serviço para interagir com o Google Drive, especialmente para upload de arquivos.
 */

const DriveService = {
  // ID da pasta no Google Drive onde as fotos dos alunos serão salvas.
  // Crie esta pasta manualmente e substitua o ID aqui.
  STUDENT_PHOTOS_FOLDER_ID: 'YOUR_STUDENT_PHOTOS_FOLDER_ID_HERE', // <-- SUBSTITUA ESTE ID

  /**
   * Salva um arquivo (foto) no Google Drive a partir de dados base64.
   * @param {string} base64Data O conteúdo do arquivo em formato base64 (ex: 'data:image/png;base64,...').
   * @param {string} fileName O nome do arquivo a ser salvo (ex: 'foto_aluno_ALU-0001.png').
   * @returns {string} A URL do arquivo salvo no Google Drive.
   * @throws {Error} Se o formato base64 for inválido ou o upload falhar.
   */
  saveFileFromBase64: function(base64Data, fileName) {
    try {
      if (!base64Data || !fileName) {
        throw new Error('Dados base64 ou nome do arquivo ausentes.');
      }

      // Extrai o tipo MIME e os dados base64 reais
      const parts = base64Data.match(/^data:(.*?);base64,(.*)$/);
      if (!parts || parts.length !== 3) {
        throw new Error('Formato de dados base64 inválido.');
      }
      const mimeType = parts[1];
      const decodedData = Utilities.base64Decode(parts[2]);

      const blob = Utilities.newBlob(decodedData, mimeType, fileName);

      const folder = DriveApp.getFolderById(this.STUDENT_PHOTOS_FOLDER_ID);
      const file = folder.createFile(blob);

      LoggerService.logEvent('DriveService', LoggerService.LEVELS.INFO, 'Arquivo salvo no Drive.', { fileName: fileName, fileId: file.getId(), fileUrl: file.getUrl() });

      return file.getUrl();
    } catch (e) {
      LoggerService.logEvent('DriveService', LoggerService.LEVELS.ERROR, 'Erro ao salvar arquivo no Drive.', { error: e.message, stack: e.stack, fileName });
      throw new Error('Falha ao salvar arquivo no Google Drive: ' + e.message);
    }
  }
};
