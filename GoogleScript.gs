const SHEET_ID = '14kylR_XSPzBqYEhs1NLbC7u0hJdi4s1VOvM0eZeaOHE';
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1524823032613437502/BQGJDShe_9c4RChmGMJFiOUV3sSBsCEckMj275Iqsj_Tt-Vp0btPAfxFmAtW8DMuNquA';

function getSheetId() {
  try {
    const prop = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (prop && prop !== 'YOUR_SPREADSHEET_ID_HERE' && prop !== '') return prop;
  } catch (e) {}
  return SHEET_ID;
}

function getDiscordWebhookUrl() {
  try {
    const prop = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');
    if (prop && prop !== 'YOUR_DISCORD_WEBHOOK_URL_HERE' && prop !== '') return prop;
  } catch (e) {}
  return DISCORD_WEBHOOK_URL;
}

const SHEET_NAME = 'Submissions';
const HEADERS = [
  'Timestamp', 'Name', 'Email', 'Phone', 'Location', 'InquiryType', 'Message'
];

function setup() {
  const sheetId = getSheetId();
  const ss = SpreadsheetApp.openById(sheetId);
  getOrCreateSheet(ss, SHEET_NAME, HEADERS);
  const sheetProps = PropertiesService.getScriptProperties();
  sheetProps.setProperty('SHEET_ID', sheetId);
  sheetProps.setProperty('DISCORD_WEBHOOK_URL', getDiscordWebhookUrl());
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Sheet created and config saved.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(getSheetId());
    const sheet = getOrCreateSheet(ss, SHEET_NAME, HEADERS);
    const row = [
      new Date().toISOString(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.location || '',
      data.inquiryType || '',
      data.message || '',
    ];
    sheet.appendRow(row);
    sendDiscordNotification(data);
    return sendJson(200, { success: true, message: 'Submission received!' });
  } catch (err) {
    return sendJson(500, { success: false, error: err.message });
  }
}

function doGet(e) {
  return sendJson(200, { status: 'ok', message: 'QuantumAggForage Form Handler' });
}

function sendDiscordNotification(data) {
  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl || webhookUrl === 'YOUR_DISCORD_WEBHOOK_URL_HERE') return;
  const typeLabels = {
    'forager': 'Join the community (forager)',
    'property-owner': 'Partner with us (Property owner)',
    'master-forager': 'I\'m a master forager ready to teach',
  };
  const label = typeLabels[data.inquiryType] || data.inquiryType || 'Unknown';
  const payload = {
    username: 'QuantumAggForage',
    avatar_url: '',
    embeds: [{
      title: 'New Submission',
      color: 0x93A58D,
      fields: [
        { name: 'Type', value: label, inline: true },
        { name: 'Name', value: data.name || 'N/A', inline: true },
        { name: 'Email', value: data.email || 'N/A', inline: true },
        { name: 'Phone', value: data.phone || 'N/A', inline: true },
        { name: 'Location', value: data.location || 'N/A', inline: true },
        { name: 'Message', value: truncate(data.message || 'N/A', 500), inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'QuantumAggForage Form Handler' },
    }]
  };
  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error('Discord webhook failed: ' + err.message);
  }
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#3E5F44');
    headerRange.setFontColor('#FFFFFF');
  }
  return sheet;
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? text.substring(0, max) + '...' : text;
}

function sendJson(code, payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
