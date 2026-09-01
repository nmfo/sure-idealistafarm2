let google = null;
function getGoogleApis() {
  if (!google) {
    const api = require('googleapis');
    google = api.google;
  }
  return google;
}
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const axios = require('axios');

// Root folder padrão fornecida pelo utilizador
const DEFAULT_ROOT_FOLDER_ID = '12ZPicg-lxXy2nyNowmvEUCQNkQi_smaJ';
const CREDENTIALS_PATH = path.join(__dirname, 'data', 'google_credentials.json');
const WEBHOOK_PATH = path.join(__dirname, 'data', 'google_webhook.json');

class GoogleDriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.sheets = null;
    this.docs = null;
    this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || DEFAULT_ROOT_FOLDER_ID;
    this.webhookUrl = process.env.GOOGLE_WEBHOOK_URL || null;
    this.initialized = false;
  }

  /**
   * Inicializa a autenticação com Service Account ou Webhook
   */
  async initAuth() {
    // 1. Verificar se existe Webhook URL configurado
    if (!this.webhookUrl && fs.existsSync(WEBHOOK_PATH)) {
      try {
        const raw = fs.readFileSync(WEBHOOK_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (data.url) this.webhookUrl = data.url;
      } catch (e) {}
    }

    if (this.webhookUrl) {
      this.initialized = true;
      console.log('✅ Google Apps Script Webhook configurado e ativo:', this.webhookUrl);
      return true;
    }

    try {
      let credentials = null;

      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        try {
          credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        } catch (e) {}
      }

      if (!credentials && fs.existsSync(CREDENTIALS_PATH)) {
        try {
          const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
          credentials = JSON.parse(raw);
        } catch (e) {}
      }

      if (!credentials) {
        this.initialized = false;
        return false;
      }

      const gApi = getGoogleApis();
      this.auth = new gApi.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/documents'
        ]
      });

      const authClient = await this.auth.getClient();
      this.drive = gApi.drive({ version: 'v3', auth: authClient });
      this.sheets = gApi.sheets({ version: 'v4', auth: authClient });
      this.docs = gApi.docs({ version: 'v1', auth: authClient });

      this.initialized = true;
      console.log('✅ Google Drive & Sheets API autenticado com sucesso para:', credentials.client_email);
      return true;
    } catch (err) {
      console.error('❌ Erro ao inicializar autenticação Google:', err.message);
      this.initialized = false;
      return false;
    }
  }

  async saveCredentials(credentialsJson) {
    try {
      const parsed = typeof credentialsJson === 'string' ? JSON.parse(credentialsJson) : credentialsJson;
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
      return await this.initAuth();
    } catch (e) {
      throw new Error(`Falha ao gravar credenciais: ${e.message}`);
    }
  }

  /**
   * Localiza ou cria a pasta do cliente na Google Drive respeitando a nomenclatura existente
   */
  async findOrCreateClientFolder(clientName, customParentId = null) {
    if (!this.initialized && !(await this.initAuth())) {
      throw new Error('Google Drive não está autenticado. Carregue o ficheiro de credenciais.');
    }

    const parentId = customParentId || this.rootFolderId;
    const cleanName = (clientName || 'Cliente').trim();

    try {
      // 1. Pesquisa flexível: busca exata ou pastas que contenham o nome do cliente
      const q = `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
      const res = await this.drive.files.list({
        q,
        fields: 'files(id, name, webViewLink)',
        spaces: 'drive',
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const files = res.data.files || [];

      // A) Match exato
      let match = files.find(f => f.name.trim().toLowerCase() === cleanName.toLowerCase());

      // B) Match por inclusão (ex: "[Nuno] Duda Teste", "Duda Teste - 912345678", "Duda Teste (Vila Verde)")
      if (!match) {
        match = files.find(f => {
          const fn = f.name.toLowerCase();
          const cn = cleanName.toLowerCase();
          return fn.includes(cn) || cn.includes(fn);
        });
      }

      if (match) {
        console.log(`📁 Pasta do cliente encontrada na Drive: "${match.name}" (ID: ${match.id})`);
        return { folderId: match.id, folderName: match.name, link: match.webViewLink, created: false };
      }

      // Se não existir, criar a pasta com o nome exato do cliente
      const fileMetadata = {
        name: cleanName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      };

      const folder = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name, webViewLink',
        supportsAllDrives: true
      });

      console.log(`✨ Nova pasta criada na Drive: "${folder.data.name}" (ID: ${folder.data.id})`);
      return { folderId: folder.data.id, folderName: folder.data.name, link: folder.data.webViewLink, created: true };
    } catch (err) {
      console.error(`Erro ao pesquisar/criar pasta na Drive (${cleanName}):`, err.message);
      throw err;
    }
  }

  /**
   * Mapeia dinamicamente os valores do imóvel de acordo com os nomes reais das colunas no Excel/Sheet do cliente
   */
  mapListingToHeaders(headers, listing, client, consultantName = 'SURE Equipa') {
    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const fullDateTime = `${dateFormatted} ${timeFormatted}`;

    return headers.map(h => {
      const col = String(h || '').trim().toLowerCase();

      // Data / Horário
      if (/data.*envio|data|dia|date/i.test(col)) return fullDateTime;
      if (/hora|time/i.test(col)) return timeFormatted;

      // Imóvel / Título
      if (/im[oó]vel|t[ií]tulo|nome|descri[cç][aã]o|designa[cç][aã]o/i.test(col)) return listing.title || 'Imóvel Idealista';

      // Tipologia
      if (/tipologia|t\d|quartos|tipo/i.test(col)) return listing.typology || (client.typology ? client.typology.join('/') : '-');

      // Preço / Valor
      if (/pre[cç]o\s*m2|pre[cç]o.*m²|valor.*m2|€\/m²/i.test(col)) return listing.price_m2 || '-';
      if (/pre[cç]o|valor|or[cç]amento|price/i.test(col)) return listing.price_num || listing.price || 0;

      // Localização / Freguesia / Zona
      if (/localiza[cç][aã]o|freguesia|zona|concelho|morada|cidade/i.test(col)) return listing.location || client.location || '-';

      // Link / URL Idealista
      if (/link|url|idealista|an[uú]ncio|hiperliga[cç][aã]o/i.test(col)) return listing.link || '';

      // Score / Match
      if (/score|match|relev[aâ]ncia|pontua[cç][aã]o/i.test(col)) return listing.match_score ? `${listing.match_score}%` : '-';

      // Consultor
      if (/consultor|comercial|agente|respons[aá]vel/i.test(col)) return consultantName;

      // Estado / Feedback
      if (/estado|status|feedback|observa[cç][oõ]es|notas/i.test(col)) return 'Enviado ao Cliente';

      return '';
    });
  }

  /**
   * Adiciona o imóvel na folha de cálculo existente (Google Sheets ou .xlsx) respeitando o formato existente
   */
  async appendToExistingSheetOrExcel(folderId, client, listing, consultantName = 'SURE Equipa') {
    if (!this.initialized && !(await this.initAuth())) {
      throw new Error('Google Drive não autenticado.');
    }

    // 1. Procurar por ficheiros Google Sheets ou Excel (.xlsx) na pasta do cliente
    const q = `'${folderId}' in parents and trashed=false and (mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or name contains '.xlsx' or name contains '.xls')`;
    const res = await this.drive.files.list({
      q,
      fields: 'files(id, name, mimeType, webViewLink)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    const files = res.data.files || [];

    // CASO A: Existe Google Spreadsheet
    const googleSheet = files.find(f => f.mimeType === 'application/vnd.google-apps.spreadsheet');
    if (googleSheet) {
      console.log(`📊 A usar Google Sheet existente: "${googleSheet.name}" (${googleSheet.id})`);
      
      // Ler a primeira linha (cabeçalhos) para mapear exatamente as colunas da equipa
      const headerRes = await this.sheets.spreadsheets.values.get({
        spreadsheetId: googleSheet.id,
        range: 'A1:Z1'
      });

      let headers = (headerRes.data.values && headerRes.data.values[0]) ? headerRes.data.values[0] : null;

      // Se a folha estiver vazia, criar cabeçalhos oficiais
      if (!headers || headers.length === 0) {
        headers = ['Data de Envio', 'Título do Imóvel', 'Tipologia', 'Preço (€)', 'Preço/m²', 'Localização / Freguesia', 'Link Idealista', 'Score Match', 'Consultor', 'Notas / Estado'];
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: googleSheet.id,
          range: 'A1:J1',
          valueInputOption: 'USER_ENTERED',
          resource: { values: [headers] }
        });
      }

      // Mapear dados do imóvel para as colunas existentes
      const rowValues = this.mapListingToHeaders(headers, listing, client, consultantName);

      // Adicionar linha
      const appendRes = await this.sheets.spreadsheets.values.append({
        spreadsheetId: googleSheet.id,
        range: 'A:Z',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [rowValues] }
      });

      return {
        fileType: 'google-sheet',
        fileId: googleSheet.id,
        fileName: googleSheet.name,
        link: googleSheet.webViewLink,
        updatedRange: appendRes.data.updates.updatedRange
      };
    }

    // CASO B: Não existe folha -> Criar Google Spreadsheet formatada na pasta do cliente
    const sheetName = `Registo_Envios_${(client.name || 'Cliente').replace(/\s+/g, '_')}`;
    const createRes = await this.sheets.spreadsheets.create({
      resource: {
        properties: { title: sheetName },
        sheets: [{ properties: { title: 'Imóveis Enviados', gridProperties: { frozenRowCount: 1 } } }]
      }
    });

    const spreadsheetId = createRes.data.spreadsheetId;
    const webViewLink = createRes.data.spreadsheetUrl;

    // Mover para a pasta do cliente
    await this.drive.files.update({
      fileId: spreadsheetId,
      addParents: folderId,
      fields: 'id, parents',
      supportsAllDrives: true
    });

    const standardHeaders = ['Data de Envio', 'Título do Imóvel', 'Tipologia', 'Preço (€)', 'Preço/m²', 'Localização / Freguesia', 'Link Idealista', 'Score Match', 'Consultor', 'Notas / Estado'];
    
    // Inserir cabeçalhos
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Imóveis Enviados'!A1:J1",
      valueInputOption: 'USER_ENTERED',
      resource: { values: [standardHeaders] }
    });

    // Inserir primeiro imóvel
    const firstRow = this.mapListingToHeaders(standardHeaders, listing, client, consultantName);
    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "'Imóveis Enviados'!A:J",
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [firstRow] }
    });

    return {
      fileType: 'google-sheet-created',
      fileId: spreadsheetId,
      fileName: sheetName,
      link: webViewLink
    };
  }

  /**
   * Cria um documento Word / Google Doc com a proposta na pasta da Drive
   */
  async createClientWordSummary(client, listings, folderId = null) {
    if (this.webhookUrl) {
      try {
        const payload = {
          action: 'create_word_doc',
          root_folder_id: this.rootFolderId,
          client_name: client.name || 'Cliente',
          listings: listings.map(l => ({
            title: l.title || 'Imóvel',
            link: l.link || '',
            price: l.price || (l.price_num ? l.price_num.toLocaleString('pt-PT') + ' €' : '-'),
            price_m2: l.price_m2 || '',
            typology: l.typology || '',
            location: l.location || '',
            match_score: l.match_score || 80
          }))
        };
        const res = await axios.post(this.webhookUrl, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 20000 });
        if (res.data && res.data.success) {
          return {
            docTitle: res.data.result.doc_title,
            link: res.data.result.doc_url,
            folderUrl: res.data.result.folder_url
          };
        } else {
          throw new Error((res.data && res.data.error) || 'Erro no Google Apps Script Webhook');
        }
      } catch (wErr) {
        console.error('Erro ao gerar Word via Webhook:', wErr.message);
        throw new Error(`Google Webhook: ${wErr.message}`);
      }
    }

    if (!this.initialized && !(await this.initAuth())) {
      throw new Error('Google Drive não autenticado.');
    }

    try {
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
      const docTitle = `Proposta_Imoveis_${(client.name || 'Cliente').replace(/\s+/g, '_')}_${dateStr}`;

      const doc = await this.docs.documents.create({
        resource: { title: docTitle }
      });

      const documentId = doc.data.documentId;

      // Mover para a pasta do cliente
      await this.drive.files.update({
        fileId: documentId,
        addParents: folderId,
        fields: 'id, parents',
        supportsAllDrives: true
      });

      let bodyText = `SURE. REAL ESTATE - SELEÇÃO DE IMÓVEIS\n`;
      bodyText += `Cliente: ${client.name || 'Cliente'}\n`;
      bodyText += `Data: ${dateStr}\n`;
      bodyText += `Critérios: ${client.property_type || 'Imóveis'} em ${client.location || 'Norte'}, até ${(client.max_price || 0).toLocaleString('pt-PT')} €\n`;
      bodyText += `──────────────────────────────────────────────\n\n`;

      listings.forEach((item, idx) => {
        bodyText += `${idx + 1}. ${item.title || 'Imóvel'}\n`;
        bodyText += `   Preço: ${item.price || (item.price_num ? item.price_num.toLocaleString('pt-PT') + ' €' : '-')}\n`;
        if (item.price_m2) bodyText += `   Preço/m²: ${item.price_m2}\n`;
        if (item.typology) bodyText += `   Tipologia: ${item.typology}\n`;
        if (item.location) bodyText += `   Localização: ${item.location}\n`;
        if (item.match_score) bodyText += `   Índice de Match: ${item.match_score}%\n`;
        if (item.link) bodyText += `   Link Idealista: ${item.link}\n`;
        bodyText += `\n`;
      });

      bodyText += `Equipa SURE. - Always by your side.`;

      await this.docs.documents.batchUpdate({
        documentId,
        resource: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: bodyText
              }
            }
          ]
        }
      });

      console.log(`📄 Documento Word/Doc criado na pasta do cliente: "${docTitle}"`);
      return { documentId, docTitle, link: `https://docs.google.com/document/d/${documentId}/edit` };
    } catch (err) {
      console.error('Erro ao gerar Google Doc na Drive:', err.message);
      throw err;
    }
  }

  async checkClientStatus(client) {
    if (this.webhookUrl) {
      try {
        const payload = {
          action: 'check_status',
          root_folder_id: this.rootFolderId,
          client_name: client.name || 'Cliente'
        };
        const res = await axios.post(this.webhookUrl, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        if (res.data && res.data.success) {
          return res.data.result;
        }
      } catch (err) {
        console.error('Erro ao verificar status do cliente na Drive:', err.message);
      }
    }
    return {
      folder_exists: false,
      folder_url: null,
      word_exists: false,
      word_url: null,
      sheet_exists: false,
      sheet_url: null
    };
  }

  async createClientFolderOnly(client) {
    if (this.webhookUrl) {
      try {
        const payload = {
          action: 'create_folder',
          root_folder_id: this.rootFolderId,
          client_name: client.name || 'Cliente'
        };
        const res = await axios.post(this.webhookUrl, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        if (res.data && res.data.success) {
          return res.data.result;
        }
      } catch (err) {
        console.error('Erro ao criar pasta do cliente na Drive:', err.message);
        throw new Error(err.message);
      }
    }
    const folder = await this.findOrCreateClientFolder(client.name);
    return {
      folder_name: folder.folderName,
      folder_url: folder.link
    };
  }

  async saveWebhookUrl(url) {
    this.webhookUrl = (url || '').trim();
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(WEBHOOK_PATH, JSON.stringify({ url: this.webhookUrl }, null, 2), 'utf-8');
    this.initialized = !!this.webhookUrl;
    return this.initialized;
  }

  /**
   * Operação Completa: Regista um ou vários imóveis enviados na Drive
   */
  async recordSentProperties(client, listings, consultantName = 'SURE Equipa') {
    const listArray = Array.isArray(listings) ? listings : (listings ? [listings] : []);
    if (!listArray.length) return null;

    if (this.webhookUrl) {
      try {
        const payload = {
          action: 'record_sent',
          root_folder_id: this.rootFolderId,
          client_name: client.name || 'Cliente',
          client_location: client.location || '',
          client_typology: client.typology ? client.typology.join('/') : '',
          consultant_name: consultantName || 'SURE Equipa',
          listings: listArray.map(listing => ({
            id: listing.id,
            title: listing.title,
            link: listing.link,
            price: listing.price,
            price_num: listing.price_num,
            price_m2: listing.price_m2,
            typology: listing.typology,
            location: listing.location,
            match_score: listing.match_score
          }))
        };
        const res = await axios.post(this.webhookUrl, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 20000 });
        if (res.data && res.data.success) {
          return {
            folder: { folderName: res.data.result.folder_name, link: res.data.result.folder_url },
            sheetResult: { fileName: res.data.result.sheet_name, link: res.data.result.sheet_url },
            addedCount: res.data.result.added_count
          };
        }
      } catch (wErr) {
        console.error('Erro ao enviar lote para Google Apps Script Webhook:', wErr.message);
      }
    }
    return null;
  }

  async recordSentProperty(client, listing, consultantName = 'SURE Equipa') {
    const webhookRes = await this.recordSentProperties(client, [listing], consultantName);
    if (webhookRes) return webhookRes;

    if (!this.initialized && !(await this.initAuth())) {
      throw new Error('Google Drive não autenticado.');
    }

    // 1. Procurar pasta do cliente
    const folder = await this.findOrCreateClientFolder(client.name);

    // 2. Procurar folha de cálculo existente (Excel ou Sheets) e mapear para o formato existente
    const sheetResult = await this.appendToExistingSheetOrExcel(folder.folderId, client, listing, consultantName);

    return {
      folder,
      sheetResult
    };
  }

  /**
   * Sincroniza marcação de visita com o Google Apps Script Webhook (se disponível)
   */
  async scheduleVisit(visitData) {
    if (this.webhookUrl) {
      try {
        const payload = {
          action: 'schedule_visit',
          root_folder_id: this.rootFolderId,
          visit: visitData
        };
        const res = await axios.post(this.webhookUrl, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        if (res.data && res.data.success) {
          return res.data.result;
        }
      } catch (wErr) {
        console.error('Aviso ao sincronizar visita com Webhook:', wErr.message);
      }
    }
    return null;
  }
}

module.exports = new GoogleDriveService();
