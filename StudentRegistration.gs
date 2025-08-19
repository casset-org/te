const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Replace with your spreadsheet ID
const STUDENT_SHEET = 'Students';

function registerStudent(name, grade, address, boardingPoint, companions) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(STUDENT_SHEET);
  sheet.appendRow([new Date(), name, grade, address, boardingPoint, companions]);
}
