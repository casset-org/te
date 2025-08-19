/**
 * @file AddTests.gs
 * @description Funções de teste adicionais para verificar a integridade dos dados.
 */

function runAllConsistencyChecks() {
  const results = {};

  // Funções do IntegrityService
  results.integrityInconsistencies = IntegrityService.collectAllInconsistencies(true);
  results.auditErrors = IntegrityService.auditAllSheetsData();
  results.systemHealth = IntegrityService.checkSystemHealth();
  results.bulkFormatCorrection = IntegrityService.bulkFormatCorrection(getGlobalConfig().SHEETS.MONITORES, 'Celular_Monitor', v => v.replace(/\D/g, ''));
  results.archiveOldAttendanceRecords = IntegrityService.archiveOldAttendanceRecords(2);
  results.optimizeSheet = IntegrityService.optimizeSheet(getGlobalConfig().SHEETS.ALUNOS, ['ID_Aluno']);
  results.geminiDuplicateReport = IntegrityService.generateGeminiDuplicateReport(getGlobalConfig().SHEETS.ALUNOS, 'CPF');
  results.backupUsage = IntegrityService.checkBackupFolderUsage();
  results.removeEmptyRows = IntegrityService.removeEmptyRows(CONFIG.SHEETS.ALUNOS);
  results.removeEmptyColumns = IntegrityService.removeEmptyColumns(CONFIG.SHEETS.ALUNOS);

  // Funções do AttendanceService
  results.attendanceConsistency = AttendanceService.checkAttendanceConsistency();
  results.studentAssignmentConsistency = AttendanceService.checkAttendanceStudentAssignmentConsistency();
  results.userAssignmentConsistency = AttendanceService.checkAttendanceUserAssignmentConsistency();
  results.inactiveUserRecords = AttendanceService.checkInactiveUserNoNewRecords();
  results.vehicleCapacityConsistency = AttendanceService.checkVehicleCapacityConsistency();
  results.routeVehicleAssignment = AttendanceService.checkRouteVehicleAssignment();
  results.schoolNameConsistency = AttendanceService.checkSchoolNameConsistency();
  results.vagasOcupadasConsistency = AttendanceService.checkVagasOcupadasConsistency();
  results.orphanStudentRecords = AttendanceService.scanOrphanStudentRecords();
  results.inactiveUserActivity = AttendanceService.getInactiveUserActivityRecords();

  // Log dos resultados para o console
  console.log(JSON.stringify(results, null, 2));

  return results;
}