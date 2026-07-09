const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_JOIN = 'JoinClub';
const SHEET_APPLY = 'Applications';
const SHEET_CONTACT = 'Contact';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.formType || data.type || 'unknown';

    switch (type) {
      case 'join-club':
      case 'join':
        return handleJoinClub(data);
      case 'apply':
      case 'application':
        return handleApplication(data);
      case 'contact':
      case 'contact-us':
        return handleContact(data);
      default:
        return sendJson(400, { success: false, error: 'Unknown form type' });
    }
  } catch (err) {
    return sendJson(500, { success: false, error: err.message });
  }
}

function doGet(e) {
  return sendJson(200, { status: 'ok', message: 'QuantumAggForage Form Handler' });
}

function handleJoinClub(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEET_JOIN, [
    'Timestamp', 'Name', 'Email', 'Phone', 'Location',
    'MaxTravel', 'Experience', 'Skills', 'Goals'
  ]);

  const skills = Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || '');
  const row = [
    new Date().toISOString(),
    data.name || '',
    data.email || '',
    data.phone || '',
    data.location || '',
    data.maxTravel || '',
    data.experience || '',
    skills,
    data.goals || '',
  ];
  sheet.appendRow(row);

  return sendJson(200, { success: true, message: 'Welcome to the club!' });
}

function handleApplication(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEET_APPLY, [
    'Timestamp', 'Name', 'Email', 'Phone', 'Role',
    'LocationPref', 'Seasonal', 'CoverLetter', 'ResumeFileName', 'ResumeData'
  ]);

  const row = [
    new Date().toISOString(),
    data.name || '',
    data.email || '',
    data.phone || '',
    data.role || '',
    data.locationPref || '',
    data.seasonal || '',
    data.coverLetter || '',
    data.resumeFileName || '',
    data.resumeBase64 || '',
  ];
  sheet.appendRow(row);

  if (data.resumeBase64 && data.resumeFileName) {
    saveResumeToDrive(data.resumeFileName, data.resumeBase64);
  }

  return sendJson(200, { success: true, message: 'Application received!' });
}

function handleContact(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEET_CONTACT, [
    'Timestamp', 'Name', 'Email', 'Phone', 'InquiryType', 'Message'
  ]);

  const row = [
    new Date().toISOString(),
    data.name || '',
    data.email || '',
    data.phone || '',
    data.inquiryType || '',
    data.message || '',
  ];
  sheet.appendRow(row);

  return sendJson(200, { success: true, message: 'Message sent!' });
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function saveResumeToDrive(fileName, base64Data) {
  try {
    const folderName = 'QuantumAggForage_Resumes';
    let folders = DriveApp.getFoldersByName(folderName);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      getMimeType(fileName),
      fileName
    );
    folder.createFile(blob);
  } catch (err) {
    console.error('Failed to save resume: ' + err.message);
  }
}

function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeMap = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function sendJson(code, payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
