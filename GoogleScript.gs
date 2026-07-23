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

const SHEET_JOIN = 'JoinClub';
const SHEET_CONTACT = 'Contact';
const SHEET_LEADS = 'VisitorLeads';
const SHEET_NEWSLETTER = 'Newsletter';
const SHEET_CONTRACTS = 'DomainContracts';

const JOIN_HEADERS = [
  'Timestamp', 'Name', 'Email', 'Phone', 'Location',
  'MaxTravel', 'Experience', 'Skills', 'Goals'
];

const CONTACT_HEADERS = [
  'Timestamp', 'Name', 'Email', 'Phone', 'InquiryType', 'Message'
];

const LEADS_HEADERS = [
  'Timestamp', 'Name', 'Email', 'Phone', 'Page'
];

const NEWSLETTER_HEADERS = [
  'Timestamp', 'Email'
];

const CONTRACTS_HEADERS = [
  'Timestamp', 'Email', 'Domain', 'Accepted'
];

function setup() {
  const sheetId = getSheetId();
  const ss = SpreadsheetApp.openById(sheetId);

  getOrCreateSheet(ss, SHEET_JOIN, JOIN_HEADERS);
  getOrCreateSheet(ss, SHEET_CONTACT, CONTACT_HEADERS);
  getOrCreateSheet(ss, SHEET_LEADS, LEADS_HEADERS);
  getOrCreateSheet(ss, SHEET_NEWSLETTER, NEWSLETTER_HEADERS);
  getOrCreateSheet(ss, SHEET_CONTRACTS, CONTRACTS_HEADERS);

  const sheetProps = PropertiesService.getScriptProperties();
  sheetProps.setProperty('SHEET_ID', sheetId);
  sheetProps.setProperty('DISCORD_WEBHOOK_URL', getDiscordWebhookUrl());

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Active sheets created and config saved.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.formType || data.type || 'unknown';

    switch (type) {
      case 'join-club':
      case 'join':
        return handleJoinClub(data);
      case 'contact':
      case 'contact-us':
        return handleContact(data);
      case 'visitor-lead':
        return handleVisitorLead(data);
      case 'newsletter':
        return handleNewsletter(data);
      case 'domain-contract':
      case 'domain-contracts':
      case 'DomainContracts':
      case 'domain_contract':
        return handleDomainContract(data);
      default:
        if (data.domain || data.accepted !== undefined) {
          return handleDomainContract(data);
        }
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
  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = getOrCreateSheet(ss, SHEET_JOIN, JOIN_HEADERS);

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

  sendDiscordNotification({
    color: 0x3E5F44,
    title: 'New Club Member',
    fields: [
      { name: 'Name', value: data.name || 'N/A', inline: true },
      { name: 'Email', value: data.email || 'N/A', inline: true },
      { name: 'Phone', value: data.phone || 'N/A', inline: true },
      { name: 'Location', value: data.location || 'N/A', inline: true },
      { name: 'Experience', value: data.experience || 'N/A', inline: true },
      { name: 'Skills', value: skills || 'N/A', inline: true },
    ]
  });

  return sendJson(200, { success: true, message: 'Welcome to the club!' });
}

function handleContact(data) {
  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = getOrCreateSheet(ss, SHEET_CONTACT, CONTACT_HEADERS);

  const row = [
    new Date().toISOString(),
    data.name || '',
    data.email || '',
    data.phone || '',
    data.inquiryType || '',
    data.message || '',
  ];
  sheet.appendRow(row);

  sendDiscordNotification({
    color: 0x93A58D,
    title: 'New Contact Message',
    fields: [
      { name: 'Name', value: data.name || 'N/A', inline: true },
      { name: 'Email', value: data.email || 'N/A', inline: true },
      { name: 'Phone', value: data.phone || 'N/A', inline: true },
      { name: 'Type', value: data.inquiryType || 'N/A', inline: true },
      { name: 'Message', value: truncate(data.message || 'N/A', 500), inline: false },
    ]
  });

  return sendJson(200, { success: true, message: 'Message sent!' });
}

function handleVisitorLead(data) {
  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = getOrCreateSheet(ss, SHEET_LEADS, LEADS_HEADERS);

  const row = [
    new Date().toISOString(),
    data.name || '',
    data.email || '',
    data.phone || '',
    data.page || 'unknown',
  ];
  sheet.appendRow(row);

  sendDiscordNotification({
    color: 0x5C775F,
    title: '🌿 New Visitor Lead',
    fields: [
      { name: 'Name',  value: data.name  || 'N/A', inline: true },
      { name: 'Email', value: data.email || 'N/A', inline: true },
      { name: 'Phone', value: data.phone || 'N/A', inline: true },
    ]
  });

  return sendJson(200, { success: true, message: 'Lead captured!' });
}

function handleNewsletter(data) {
  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = getOrCreateSheet(ss, SHEET_NEWSLETTER, NEWSLETTER_HEADERS);

  const row = [
    new Date().toISOString(),
    data.email || '',
  ];
  sheet.appendRow(row);

  sendDiscordNotification({
    color: 0x93A58D,
    title: '📧 New Newsletter Subscriber',
    fields: [
      { name: 'Email', value: data.email || 'N/A', inline: true },
    ]
  });

  return sendJson(200, { success: true, message: 'Subscribed!' });
}

function handleDomainContract(data) {
  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = getOrCreateSheet(ss, SHEET_CONTRACTS, CONTRACTS_HEADERS);

  const row = [
    data.timestamp || new Date().toISOString(),
    data.email || '',
    data.domain || 'quantumaggforage.com',
    String(data.accepted !== undefined ? data.accepted : true)
  ];
  sheet.appendRow(row);

  sendDiscordNotification({
    color: 0x3E5F44,
    title: '📜 Provisional Contract Accepted',
    fields: [
      { name: 'Email', value: data.email || 'N/A', inline: true },
      { name: 'Domain', value: data.domain || 'quantumaggforage.com', inline: true },
      { name: 'Accepted', value: String(data.accepted !== undefined ? data.accepted : true), inline: true }
    ]
  });

  return sendJson(200, { success: true, message: 'Contract accepted & signed!' });
}

function sendDiscordNotification(embed) {
  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl || webhookUrl === 'YOUR_DISCORD_WEBHOOK_URL_HERE') return;

  const payload = {
    username: 'QuantumAggForage',
    avatar_url: '',
    embeds: [{
      title: embed.title,
      color: embed.color,
      fields: embed.fields,
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
