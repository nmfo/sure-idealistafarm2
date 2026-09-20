/**
 * SURE. REAL ESTATE — Google Apps Script Webhook v2.0 (Sincronização Master Cloud)
 * 
 * Estrutura Oficial SURE:
 * "01. Clientes Compradores [REB]" -> "[Nome do Cliente]"
 *   ├── "Lista de Imóveis - [Nome do Cliente]" (Google Sheet)
 *   └── "Ficha de Cliente - [Nome do Cliente]" (Google Doc)
 * "00. BASE_DADOS_CLIENTES_SURE" (Google Sheet Master na raiz da Drive para sincronizar todos os PCs)
 */

const DEFAULT_ROOT_ID = '12ZPicg-lxXy2nyNowmvEUCQNkQi_smaJ';

/**
 * Função de Teste Manual para executar diretamente no editor do Google Apps Script
 * (Selecione "testManual" no menu superior e clique em "Executar")
 */
function testManual() {
  Logger.log('🚀 A testar permissões e conexão com a pasta da Google Drive...');
  try {
    const rootFolder = DriveApp.getFolderById(DEFAULT_ROOT_ID);
    Logger.log('✅ Pasta Raiz encontrada: ' + rootFolder.getName());
    const clients = getAllClientsFromMasterSheet(DEFAULT_ROOT_ID);
    Logger.log('✅ Clientes encontrados na folha Master: ' + clients.length);
    Logger.log('🎉 Tudo operacional! Pode clicar em Implementar -> Nova Implementação -> Aplicação Web.');
  } catch (err) {
    Logger.log('❌ Erro no teste manual: ' + err.toString());
  }
}

function doPost(e) {
  try {
    // Proteção caso o utilizador clique em Executar diretamente no editor
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({
        success: true,
        message: 'Google Apps Script Webhook v2.0 ativo e pronto a receber dados!'
      });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'record_sent';
    const rootId = data.root_folder_id || DEFAULT_ROOT_ID;

    if (action === 'test') return responseJSON({ success: true, message: 'Google Apps Script Webhook conectado com sucesso!' });
    if (action === 'get_all_clients' || action === 'get_clients') return responseJSON({ success: true, clients: getAllClientsFromMasterSheet(rootId) });
    if (action === 'save_client') return responseJSON({ success: true, client: saveClientToMasterSheet(data.client, rootId) });
    if (action === 'save_clients_bulk') return responseJSON({ success: true, count: saveClientsBulkToMasterSheet(data.clients, rootId) });
    if (action === 'delete_client') return responseJSON({ success: true, deleted: deleteClientFromMasterSheet(data.client_id, rootId) });
    if (action === 'get_assistants') return responseJSON({ success: true, assistants: getAllAssistantsFromMasterSheet(rootId) });
    if (action === 'save_assistant') return responseJSON({ success: true, assistant: saveAssistantToMasterSheet(data.assistant, rootId) });
    if (action === 'delete_assistant') return responseJSON({ success: true, deleted: deleteAssistantFromMasterSheet(data.assistant_id, rootId) });
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
  const rootId = (e && e.parameter && e.parameter.root_id) ? e.parameter.root_id : DEFAULT_ROOT_ID;
  if (e && e.parameter && e.parameter.action === 'get_clients') {
    return responseJSON({ success: true, clients: getAllClientsFromMasterSheet(rootId) });
  }
  return responseJSON({ status: 'active', message: 'SURE Webhook v2.0 Ativo!' });
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

// ── MASTER CLIENTS & ASSISTANTS SHEET (SINCRONIZAÇÃO NUVEM MULTI-DISPOSITIVO) ──
function getOrCreateMasterClientsSheet(rootFolder) {
  const files = rootFolder.getFilesByName('00. BASE_DADOS_CLIENTES_SURE');
  let sheetFile = null;
  if (files.hasNext()) {
    sheetFile = files.next();
  }

  let spreadsheet;
  if (sheetFile) {
    spreadsheet = SpreadsheetApp.openById(sheetFile.getId());
  } else {
    spreadsheet = SpreadsheetApp.create('00. BASE_DADOS_CLIENTES_SURE');
    DriveApp.getFileById(spreadsheet.getId()).moveTo(rootFolder);
  }

  // 1. Garantir folha de Clientes
  let clientSheet = spreadsheet.getSheetByName('Clientes');
  if (!clientSheet) {
    clientSheet = spreadsheet.getSheets()[0];
    clientSheet.setName('Clientes');
    const headers = [
      'ID', 'Nome do Cliente', 'Consultor', 'Administrativo Responsável', 'Prioridade', 'Operação', 'Tipo de Imóvel',
      'Localização / Freguesia', 'Preço Mín (€)', 'Preço Máx (€)', 'Área Mín (m²)',
      'Tipologias', 'Comodidades', 'Piso Elevador', 'Notas / Critérios',
      'Link Pesquisa Personalizado', 'Data Criação', 'Último Envio'
    ];
    clientSheet.appendRow(headers);
    clientSheet.getRange('A1:R1').setBackground('#C75233').setFontColor('#FFFFFF').setFontWeight('bold');
    clientSheet.setFrozenRows(1);
  }

  // 2. Garantir folha de Administrativos
  let assistSheet = spreadsheet.getSheetByName('Administrativos');
  if (!assistSheet) {
    assistSheet = spreadsheet.insertSheet('Administrativos');
    const headers = ['ID', 'Nome', 'Username / Login', 'Password', 'Perfil / Role', 'Cor'];
    assistSheet.appendRow(headers);
    assistSheet.getRange('A1:F1').setBackground('#5B7FA6').setFontColor('#FFFFFF').setFontWeight('bold');
    assistSheet.setFrozenRows(1);

    // Default master admin
    assistSheet.appendRow(['assistant-geral', 'Geral / Administração', 'geral', '123', 'admin', '#C75233']);
  }

  return spreadsheet;
}

function getAllAssistantsFromMasterSheet(rootFolderId) {
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const ss = getOrCreateMasterClientsSheet(rootFolder);
  const sheet = ss.getSheetByName('Administrativos');
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const assistants = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue;
    assistants.push({
      id: String(row[0] || ('assistant-' + i)),
      name: String(row[1] || ''),
      username: String(row[2] || 'user' + i),
      password: String(row[3] || '123'),
      role: String(row[4] || 'staff'),
      color: String(row[5] || '#5B7FA6')
    });
  }
  return assistants;
}

function saveAssistantToMasterSheet(assistantData, rootFolderId) {
  if (!assistantData || !assistantData.name) return null;
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const ss = getOrCreateMasterClientsSheet(rootFolder);
  const sheet = ss.getSheetByName('Administrativos') || ss.insertSheet('Administrativos');
  const data = sheet.getDataRange().getValues();

  const assistantId = assistantData.id || ('assistant-' + Math.random().toString(36).substring(2, 9));
  assistantData.id = assistantId;

  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(assistantId) || (data[i][2] && String(data[i][2]).toLowerCase().trim() === String(assistantData.username || '').toLowerCase().trim())) {
      rowIdx = i + 1;
      break;
    }
  }

  const rowData = [
    assistantData.id,
    assistantData.name || '',
    assistantData.username || '',
    assistantData.password || '123',
    assistantData.role || (assistantData.id === 'assistant-geral' ? 'admin' : 'staff'),
    assistantData.color || '#5B7FA6'
  ];

  if (rowIdx !== -1) {
    sheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return assistantData;
}

function deleteAssistantFromMasterSheet(assistantId, rootFolderId) {
  if (!assistantId || assistantId === 'assistant-geral') return false;
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const ss = getOrCreateMasterClientsSheet(rootFolder);
  const sheet = ss.getSheetByName('Administrativos');
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(assistantId)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function getAllClientsFromMasterSheet(rootFolderId) {
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const ss = getOrCreateMasterClientsSheet(rootFolder);
  const sheet = ss.getSheetByName('Clientes') || ss.getSheets()[0];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0].map(h => String(h).toLowerCase());
  const hasAssistantCol = headers.some(h => h.includes('administrativo'));

  const clients = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue;

    let colOffset = hasAssistantCol ? 1 : 0;

    let typology = [];
    try {
      typology = JSON.parse(row[10 + colOffset]);
    } catch (e) {
      typology = String(row[10 + colOffset] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    }

    let amenities = [];
    try {
      amenities = JSON.parse(row[11 + colOffset]);
    } catch (e) {
      amenities = String(row[11 + colOffset] || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    clients.push({
      id: String(row[0] || ('client-' + i)),
      name: String(row[1] || ''),
      consultant_id: String(row[2] || 'consultant-geral'),
      assistant_id: hasAssistantCol ? String(row[3] || 'assistant-geral') : 'assistant-geral',
      priority: String(row[3 + colOffset] || 'U'),
      operation: String(row[4 + colOffset] || 'comprar'),
      property_type: String(row[5 + colOffset] || 'apartamentos'),
      location: String(row[6 + colOffset] || ''),
      min_price: Number(row[7 + colOffset]) || null,
      max_price: Number(row[8 + colOffset]) || null,
      min_area: Number(row[9 + colOffset]) || null,
      typology: typology,
      amenities: amenities,
      elevator_floor: String(row[12 + colOffset] || '0'),
      notes: String(row[13 + colOffset] || ''),
      custom_search_url: String(row[14 + colOffset] || ''),
      created_at: row[15 + colOffset] ? new Date(row[15 + colOffset]).toISOString() : new Date().toISOString(),
      last_sent_at: row[16 + colOffset] ? new Date(row[16 + colOffset]).toISOString() : null
    });
  }
  return clients;
}

function saveClientToMasterSheet(clientData, rootFolderId) {
  if (!clientData || !clientData.name) return null;
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const ss = getOrCreateMasterClientsSheet(rootFolder);
  const sheet = ss.getSheetByName('Clientes') || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();

  const clientId = clientData.id || ('client-' + Math.random().toString(36).substring(2, 9));
  clientData.id = clientId;

  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(clientId) || (data[i][1] && String(data[i][1]).toLowerCase().trim() === String(clientData.name || '').toLowerCase().trim())) {
      rowIdx = i + 1;
      break;
    }
  }

  const rowData = [
    clientData.id,
    clientData.name || '',
    clientData.consultant_id || 'consultant-geral',
    clientData.assistant_id || 'assistant-geral',
    clientData.priority || 'U',
    clientData.operation || 'comprar',
    clientData.property_type || 'apartamentos',
    clientData.location || '',
    clientData.min_price || '',
    clientData.max_price || '',
    clientData.min_area || '',
    JSON.stringify(clientData.typology || []),
    JSON.stringify(clientData.amenities || []),
    clientData.elevator_floor || '0',
    clientData.notes || '',
    clientData.custom_search_url || '',
    clientData.created_at || new Date().toISOString(),
    clientData.last_sent_at || ''
  ];

  if (rowIdx !== -1) {
    sheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return clientData;
}

function saveClientsBulkToMasterSheet(clientsList, rootFolderId) {
  if (!Array.isArray(clientsList) || clientsList.length === 0) return 0;
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const ss = getOrCreateMasterClientsSheet(rootFolder);
  const sheet = ss.getSheetByName('Clientes') || ss.getSheets()[0];
  const existingData = sheet.getDataRange().getValues();

  const idMap = new Map();
  for (let i = 1; i < existingData.length; i++) {
    const id = String(existingData[i][0] || '').trim();
    const name = String(existingData[i][1] || '').toLowerCase().trim();
    if (id) idMap.set(id, i + 1);
    if (name) idMap.set('name_' + name, i + 1);
  }

  const rowsToAppend = [];
  let updatedCount = 0;

  clientsList.forEach(clientData => {
    if (!clientData || !clientData.name) return;
    const clientId = clientData.id || ('client-' + Math.random().toString(36).substring(2, 9));
    clientData.id = clientId;

    const rowData = [
      clientData.id,
      clientData.name || '',
      clientData.consultant_id || 'consultant-geral',
      clientData.priority || 'U',
      clientData.operation || 'comprar',
      clientData.property_type || 'apartamentos',
      clientData.location || '',
      clientData.min_price || '',
      clientData.max_price || '',
      clientData.min_area || '',
      JSON.stringify(clientData.typology || []),
      JSON.stringify(clientData.amenities || []),
      clientData.elevator_floor || '0',
      clientData.notes || '',
      clientData.custom_search_url || '',
      clientData.created_at || new Date().toISOString(),
      clientData.last_sent_at || ''
    ];

    const clientNameKey = 'name_' + String(clientData.name).toLowerCase().trim();
    if (idMap.has(clientId)) {
      const rowIdx = idMap.get(clientId);
      sheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
      updatedCount++;
    } else if (idMap.has(clientNameKey)) {
      const rowIdx = idMap.get(clientNameKey);
      sheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
      updatedCount++;
    } else {
      rowsToAppend.push(rowData);
    }
  });

  if (rowsToAppend.length > 0) {
    const startRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(startRow, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
  }

  return updatedCount + rowsToAppend.length;
}

function deleteClientFromMasterSheet(clientId, rootFolderId) {
  const rootFolder = DriveApp.getFolderById(rootFolderId);
  const ss = getOrCreateMasterClientsSheet(rootFolder);
  const sheet = ss.getSheetByName('Clientes') || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(clientId)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
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
    const headers = ['Administrativo', 'Data de Envio', 'Título do Imóvel', 'Tipologia', 'Preço (€)', 'Preço/m²', 'Localização / Freguesia', 'Link Idealista', 'Score Match', 'Consultor', 'Notas / Estado'];
    sheet.appendRow(headers);
    sheet.getRange('A1:K1').setBackground('#C75233').setFontColor('#FFFFFF').setFontWeight('bold');
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
  const assistantName = data.assistant_name || data.author_name || (data.client_assistant_name || 'Nuno Oliveira');

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

    const headers = ['Administrativo', 'Data de Envio', 'Título do Imóvel', 'Tipologia', 'Preço (€)', 'Preço/m²', 'Localização / Freguesia', 'Link Idealista', 'Score Match', 'Consultor', 'Notas / Estado'];
    sheet.appendRow(headers);
    sheet.getRange('A1:K1').setBackground('#C75233').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const now = new Date();
  const dateFormatted = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

  const items = Array.isArray(data.listings) ? data.listings : (data.listing ? [data.listing] : []);

  items.forEach(listing => {
    const rowData = headerValues.map((h, idx) => {
      const col = normalizeName(h);
      if (col.includes('administrativ') || col.includes('assistente') || col.includes('enviado por') || col.includes('colaborador') || col.includes('operador') || col.includes('admin') || (idx === 0 && (col.includes('responsavel') || col.includes('dropdown') || !col))) {
        return assistantName;
      }
      if (col.includes('data') || col.includes('dia') || col.includes('date')) return dateFormatted;
      if (col.includes('imovel') || col.includes('titulo') || col.includes('nome') || col.includes('descricao')) return listing.title || 'Imóvel Idealista';
      if (col.includes('tipologia') || col.includes('t1') || col.includes('t2') || col.includes('t3') || col.includes('quartos')) return listing.typology || data.client_typology || '-';
      if (col.includes('m2') || col.includes('m²')) return listing.price_m2 || '-';
      if (col.includes('preco') || col.includes('valor') || col.includes('orcamento')) return listing.price_num || listing.price || 0;
      if (col.includes('localizacao') || col.includes('freguesia') || col.includes('zona') || col.includes('concelho')) return listing.location || data.client_location || '-';
      if (col.includes('link') || col.includes('url') || col.includes('idealista')) return listing.link || '';
      if (col.includes('score') || col.includes('match') || col.includes('relevancia')) return listing.match_score ? listing.match_score + '%' : '-';
      if (col.includes('consultor') || col.includes('comercial') || col.includes('agente')) return consultantName;
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
