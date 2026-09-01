/**
 * SURE. REAL ESTATE — Google Apps Script Webhook v1.7 (Suporte Completo Lote & Individual)
 * 
 * Estrutura Oficial SURE:
 * "01. Clientes Compradores [REB]" -> "[Nome do Cliente]"
 *   ├── "Lista de Imóveis - [Nome do Cliente]" (Google Sheet)
 *   └── "Ficha de Cliente - [Nome do Cliente]" (Google Doc)
 */

const DEFAULT_ROOT_ID = '12ZPicg-lxXy2nyNowmvEUCQNkQi_smaJ';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'record_sent';
    const rootId = data.root_folder_id || DEFAULT_ROOT_ID;

    if (action === 'test') return responseJSON({ success: true, message: 'Webhook conectado!' });
    if (action === 'check_status') return responseJSON({ success: true, result: checkClientStatus(data, rootId) });
    if (action === 'create_folder') return responseJSON({ success: true, result: createClientFullKit(data, rootId) });
    if (action === 'record_sent') return responseJSON({ success: true, result: recordSentProperty(data, rootId) });
    if (action === 'create_word_doc') return responseJSON({ success: true, result: createWordDoc(data, rootId) });
    if (action === 'schedule_visit' || action === 'create_calendar_event') return responseJSON({ success: true, result: createCalendarVisitEvent(data) });

    return responseJSON({ success: false, error: 'Ação desconhecida: ' + action });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  return responseJSON({ status: 'active', message: 'SURE Webhook Ativo!' });
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function normalizeName(str) {
  if (!str) return '';
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function getCompradoresContainer(rootFolder) {
  const folders = rootFolder.getFolders();
  while (folders.hasNext()) {
    const f = folders.next();
    const name = normalizeName(f.getName());
    if (name.includes('comprador') || name.includes('01.') || name.includes('reb')) {
      return f;
    }
  }
  return rootFolder;
}

function findOrCreateClientFolderInCompradores(containerFolder, clientName) {
  const normClient = normalizeName(clientName);
  const folders = containerFolder.getFolders();
  while (folders.hasNext()) {
    const f = folders.next();
    const fNorm = normalizeName(f.getName());
    if (fNorm === normClient || fNorm.includes(normClient) || normClient.includes(fNorm)) {
      return f;
    }
  }
  return containerFolder.createFolder(clientName.trim());
}

function checkClientStatus(data, rootFolderId) {
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const containerFolder = getCompradoresContainer(rootFolder);
  const clientName = (data.client_name || 'Cliente').trim();
  const normClient = normalizeName(clientName);

  let clientFolder = null;
  const folders = containerFolder.getFolders();
  while (folders.hasNext()) {
    const f = folders.next();
    const fNorm = normalizeName(f.getName());
    if (fNorm === normClient || fNorm.includes(normClient) || normClient.includes(fNorm)) {
      clientFolder = f;
      break;
    }
  }

  if (!clientFolder) {
    return { folder_exists: false, folder_url: containerFolder.getUrl(), word_exists: false, word_url: null, sheet_exists: false, sheet_url: null };
  }

  let wordFile = null, sheetFile = null;
  const files = clientFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType();
    const fname = normalizeName(file.getName());
    if (mime === MimeType.GOOGLE_DOCS || fname.includes('ficha') || fname.includes('proposta') || fname.includes('.docx')) {
      wordFile = file;
    }
    if (mime === MimeType.GOOGLE_SHEETS || fname.includes('imoveis') || fname.includes('lista') || fname.includes('.xlsx')) {
      sheetFile = file;
    }
  }

  return {
    folder_exists: true,
    folder_name: clientFolder.getName(),
    folder_url: clientFolder.getUrl(),
    word_exists: !!wordFile,
    word_name: wordFile ? wordFile.getName() : null,
    word_url: wordFile ? wordFile.getUrl() : null,
    sheet_exists: !!sheetFile,
    sheet_name: sheetFile ? sheetFile.getName() : null,
    sheet_url: sheetFile ? sheetFile.getUrl() : null
  };
}

function createClientFullKit(data, rootFolderId) {
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const containerFolder = getCompradoresContainer(rootFolder);
  const clientName = (data.client_name || 'Cliente').trim();
  const clientFolder = findOrCreateClientFolderInCompradores(containerFolder, clientName);

  // 1. Folha de Cálculo Oficial
  let sheetFile = null, wordFile = null;
  const files = clientFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType();
    const fname = normalizeName(file.getName());
    if (mime === MimeType.GOOGLE_SHEETS || fname.includes('imoveis') || fname.includes('lista') || fname.includes('.xlsx')) sheetFile = file;
    if (mime === MimeType.GOOGLE_DOCS || fname.includes('ficha') || fname.includes('proposta') || fname.includes('.docx')) wordFile = file;
  }

  let sheetUrl = sheetFile ? sheetFile.getUrl() : '';
  if (!sheetFile) {
    const sheetTitle = 'Lista de Imóveis - ' + clientName;
    const spreadsheet = SpreadsheetApp.create(sheetTitle);
    DriveApp.getFileById(spreadsheet.getId()).moveTo(clientFolder);
    const sheet = spreadsheet.getSheets()[0];
    sheet.setName('Imóveis Enviados');
    const headers = ['Data de Envio', 'Título do Imóvel', 'Tipologia', 'Preço (€)', 'Preço/m²', 'Localização / Freguesia', 'Link Idealista', 'Score Match', 'Consultor', 'Notas / Estado'];
    sheet.appendRow(headers);
    sheet.getRange('A1:J1').setBackground('#C75233').setFontColor('#FFFFFF').setFontWeight('bold');
    sheetUrl = spreadsheet.getUrl();
  }

  // 2. Documento Word Oficial
  let wordUrl = wordFile ? wordFile.getUrl() : '';
  if (!wordFile) {
    const docTitle = 'Ficha de Cliente - ' + clientName;
    const doc = DocumentApp.create(docTitle);
    DriveApp.getFileById(doc.getId()).moveTo(clientFolder);
    const body = doc.getBody();
    body.appendParagraph('SURE. REAL ESTATE — FICHA DE CLIENTE').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph('Cliente: ' + clientName);
    body.appendParagraph('Data de Abertura: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'));
    body.appendHorizontalRule();
    body.appendParagraph('SELEÇÃO DE IMÓVEIS SUGERIDOS').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('Aguardando envio dos primeiros imóveis selecionados...');
    body.appendParagraph('');
    body.appendParagraph('Equipa SURE. — Always by your side.');
    doc.saveAndClose();
    wordUrl = doc.getUrl();
  }

  return {
    folder_name: clientFolder.getName(),
    folder_url: clientFolder.getUrl(),
    sheet_url: sheetUrl,
    word_url: wordUrl
  };
}

function recordSentProperty(data, rootFolderId) {
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const containerFolder = getCompradoresContainer(rootFolder);
  const clientName = (data.client_name || 'Cliente').trim();
  const consultantName = data.consultant_name || 'SURE Equipa';

  const clientFolder = findOrCreateClientFolderInCompradores(containerFolder, clientName);

  let sheetFile = null;
  const files = clientFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType();
    const fname = normalizeName(file.getName());
    if (mime === MimeType.GOOGLE_SHEETS || fname.includes('.xlsx') || fname.includes('.xls') || fname.includes('imoveis') || fname.includes('lista')) {
      sheetFile = file;
      break;
    }
  }

  let spreadsheet, sheet;
  if (sheetFile && sheetFile.getMimeType() === MimeType.GOOGLE_SHEETS) {
    spreadsheet = SpreadsheetApp.openById(sheetFile.getId());
    sheet = spreadsheet.getSheets()[0];
  } else {
    const sheetTitle = 'Lista de Imóveis - ' + clientName;
    spreadsheet = SpreadsheetApp.create(sheetTitle);
    DriveApp.getFileById(spreadsheet.getId()).moveTo(clientFolder);
    sheet = spreadsheet.getSheets()[0];
    sheet.setName('Imóveis Enviados');

    const headers = ['Data de Envio', 'Título do Imóvel', 'Tipologia', 'Preço (€)', 'Preço/m²', 'Localização / Freguesia', 'Link Idealista', 'Score Match', 'Consultor', 'Notas / Estado'];
    sheet.appendRow(headers);
    sheet.getRange('A1:J1').setBackground('#C75233').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const now = new Date();
  const dateFormatted = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

  // Suporta tanto 1 imóvel individual como uma lista de múltiplos imóveis enviados em lote
  const items = Array.isArray(data.listings) ? data.listings : (data.listing ? [data.listing] : []);

  items.forEach(listing => {
    const rowData = headerValues.map(h => {
      const col = normalizeName(h);
      if (col.includes('data') || col.includes('dia') || col.includes('date')) return dateFormatted;
      if (col.includes('imovel') || col.includes('titulo') || col.includes('nome') || col.includes('descricao')) return listing.title || 'Imóvel Idealista';
      if (col.includes('tipologia') || col.includes('t1') || col.includes('t2') || col.includes('t3') || col.includes('quartos')) return listing.typology || data.client_typology || '-';
      if (col.includes('m2') || col.includes('m²')) return listing.price_m2 || '-';
      if (col.includes('preco') || col.includes('valor') || col.includes('orcamento')) return listing.price_num || listing.price || 0;
      if (col.includes('localizacao') || col.includes('freguesia') || col.includes('zona') || col.includes('concelho')) return listing.location || data.client_location || '-';
      if (col.includes('link') || col.includes('url') || col.includes('idealista')) return listing.link || '';
      if (col.includes('score') || col.includes('match') || col.includes('relevancia')) return listing.match_score ? listing.match_score + '%' : '-';
      if (col.includes('consultor') || col.includes('comercial') || col.includes('agente') || col.includes('responsavel')) return consultantName;
      if (col.includes('estado') || col.includes('status') || col.includes('feedback') || col.includes('notas')) return 'Enviado ao Cliente';
      return '';
    });
    sheet.appendRow(rowData);
  });

  return {
    container_name: containerFolder.getName(),
    folder_name: clientFolder.getName(),
    folder_url: clientFolder.getUrl(),
    sheet_name: spreadsheet.getName(),
    sheet_url: spreadsheet.getUrl(),
    added_count: items.length,
    date_sent: dateFormatted
  };
}

function createWordDoc(data, rootFolderId) {
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const containerFolder = getCompradoresContainer(rootFolder);
  const clientName = (data.client_name || 'Cliente').trim();
  const listings = data.listings || [];

  const clientFolder = findOrCreateClientFolderInCompradores(containerFolder, clientName);

  let wordFile = null;
  const files = clientFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType();
    const fname = normalizeName(file.getName());
    if (mime === MimeType.GOOGLE_DOCS && (fname.includes('ficha') || fname.includes('proposta'))) {
      wordFile = file;
      break;
    }
  }

  let doc;
  if (wordFile) {
    doc = DocumentApp.openById(wordFile.getId());
  } else {
    const docTitle = 'Ficha de Cliente - ' + clientName;
    doc = DocumentApp.create(docTitle);
    DriveApp.getFileById(doc.getId()).moveTo(clientFolder);
  }

  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm');
  const body = doc.getBody();

  body.appendParagraph('');
  body.appendHorizontalRule();
  body.appendParagraph('SELEÇÃO DE IMÓVEIS — ' + dateStr).setHeading(DocumentApp.ParagraphHeading.HEADING2);

  listings.forEach((item, i) => {
    body.appendParagraph((i + 1) + '. ' + (item.title || 'Imóvel')).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph('• Preço: ' + (item.price || '-') + (item.price_m2 ? ' (' + item.price_m2 + ')' : ''));
    if (item.typology) body.appendParagraph('• Tipologia: ' + item.typology);
    if (item.location) body.appendParagraph('• Localização: ' + item.location);
    if (item.match_score) body.appendParagraph('• Índice Match: ' + item.match_score + '%');
    if (item.link) body.appendParagraph('• Link Idealista: ' + item.link);
    body.appendParagraph('');
  });

  doc.saveAndClose();

  return {
    doc_title: doc.getName(),
    doc_url: doc.getUrl(),
    folder_url: clientFolder.getUrl()
  };
}

function createCalendarVisitEvent(data) {
  const visit = data.visit || data;
  const title = visit.title || `🏡 Visita Imóvel - ${visit.client_name || 'Cliente'}`;
  const startTime = new Date(visit.start_time || visit.date);
  const endTime = new Date(visit.end_time || (startTime.getTime() + (parseInt(visit.duration_minutes || 60, 10) * 60 * 1000)));

  const location = visit.location || visit.address || '';
  let description = `SURE. REAL ESTATE — AGENDAMENTO DE VISITA\n`;
  description += `──────────────────────────────────────────────\n`;
  if (visit.client_name) description += `👤 Cliente: ${visit.client_name}\n`;
  if (visit.client_phone) description += `📞 Contacto Cliente: ${visit.client_phone}\n`;
  if (visit.consultant_name) description += `💼 Consultor: ${visit.consultant_name}\n`;
  if (visit.listing_title) description += `🏠 Imóvel: ${visit.listing_title}\n`;
  if (visit.listing_price) description += `💶 Preço: ${visit.listing_price}\n`;
  if (visit.listing_url) description += `🔗 Link do Imóvel: ${visit.listing_url}\n`;
  if (visit.notes) description += `📝 Notas / Acessos: ${visit.notes}\n`;
  description += `──────────────────────────────────────────────\n`;
  description += `Criado via SURE. IdealistaFarm`;

  const calendar = CalendarApp.getDefaultCalendar();
  const event = calendar.createEvent(title, startTime, endTime, {
    description: description,
    location: location
  });

  return {
    event_id: event.getId(),
    title: title,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    calendar_name: calendar.getName()
  };
}
