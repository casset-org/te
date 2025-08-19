var TestRunner = {
  run: function(suiteName, testSuite) {
    var results = [];
    try {
      if (typeof testSuite.setup === 'function') {
        testSuite.setup();
      }

      for (var testName in testSuite) {
        // Only run functions that start with 'test:' or are not 'setup' or 'teardown'
        if (typeof testSuite[testName] === 'function' && testName !== 'setup' && testName !== 'teardown') {
          try {
            testSuite[testName]();
            results.push({ test: testName, status: 'PASS' });
          } catch (e) {
            results.push({ test: testName, status: 'FAIL', error: e });
          }
        }
      }
    } finally {
      if (typeof testSuite.teardown === 'function') {
        testSuite.teardown();
      }
    }
    return results;
  }
};

function runAllTests() {
  runAttendanceServiceTests();
  runSheetServiceIntegrationTests();
  runChatbotServiceIntegrationTests();
  runFormServiceIntegrationTests();
  runIncidentRegistrationIntegrationTests();
  runMonitorServiceIntegrationTests();
  runEventServiceIntegrationTests();
  runAuthServiceIntegrationTests();
  runBackupServiceIntegrationTests();
  runVehicleRegistrationIntegrationTests();
  runDashboardIntegrationTests();
  runAttendanceServiceIntegrationTests();
  runStudentServiceIntegrationTests();
  runRouteServiceIntegrationTests();
  runPermissionServiceIntegrationTests();
  runLoggerServiceIntegrationTests();
}
