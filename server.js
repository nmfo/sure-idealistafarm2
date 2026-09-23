const express = require('express');
const cors = require('cors');
const path = require('path');
const clientManager = require('./clientManager');
const googleDriveService = require('./googleDriveService');
const { parseListingsHtml, fetchDirectListingFromUrl } = require('./scraper');
const { parseZohoExcel } = require('./importer');
const zohoService = require('./zohoService');
const todoistService = require('./todoistService');

let botModule = null;
function getBot() {
  if (!botModule) {
    try {
      botModule = require('./bot');
    } catch (e) {
      console.warn('Bot de browser indisponível em serverless:', e.message);
      botModule = {
        runAutoSearchBot: async () => { throw new Error('O Bot Playwright com navegador requer execução local/VPS. Em ambiente Vercel/Cloud utilize a importação direta, extensão ou colagem.'); },
        fetchDirectListingWithBrowser: async () => []
      };
    }
  }
  return botModule;
}

process.on('uncaughtException', (err) => {
  console.error('⚠️ [SERVER SAFEGUARD] Exceção capturada:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [SERVER SAFEGUARD] Rejeição assíncrona:', reason ? reason.message || reason : '');
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── ZOHO CRM DIRECT INTEGRATION API ──────────────────────────────────────────
app.get('/api/zoho/status', (req, res) => {
  res.json({
    configured: zohoService.isConfigured(),
    api_domain: zohoService.config.api_domain,
    has_token: !!zohoService.config.access_token,
    expires_at: zohoService.config.expires_at
  });
});

app.post('/api/zoho/sync', async (req, res) => {
  try {
    const result = await zohoService.syncDealsToClients(clientManager);
    res.json(result);
  } catch (err) {
    console.error('Erro ao sincronizar com Zoho CRM:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/zoho/note', async (req, res) => {
  const { deal_id, title, content, author_name, action, client_id, channel, next_action, next_responsible, next_due_date } = req.body;
  if (!deal_id || !content) {
    return res.status(400).json({ error: 'deal_id e content são obrigatórios' });
  }
  try {
    let finalTitle = title;
    let finalContent = content;

    if (author_name || action) {
      const client = client_id ? clientManager.getClient(client_id) : null;
      const consultants = clientManager.getConsultants();
      const assistants = clientManager.getAssistants();
      const consultant = client ? consultants.find(c => c.id === client.consultant_id) : null;
      const assistant = client ? assistants.find(a => a.id === client.assistant_id) : null;

      const formatted = zohoService.formatPopNote({
        authorName: author_name || (assistant && assistant.name) || (consultant && consultant.name) || 'Equipa SURE',
        action: action || 'Troca de Mensagens',
        client,
        consultantName: consultant ? consultant.name : '',
        assistantName: assistant ? assistant.name : '',
        channel: channel || 'Idealista Farm / WhatsApp',
        customBody: content,
        nextAction: next_action,
        nextResponsible: next_responsible,
        nextDueDate: next_due_date
      });
      finalTitle = formatted.title;
      finalContent = formatted.content;
    }

    const result = await zohoService.addDealNote(deal_id, finalTitle, finalContent);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/zoho/webhook', async (req, res) => {
  try {
    const result = await zohoService.handleWebhook(req.body, clientManager);
    res.json(result);
  } catch (err) {
    console.error('Erro no webhook Zoho:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── TODOIST CRM & TASK INTEGRATION API ───────────────────────────────────────
app.get('/api/todoist/status', async (req, res) => {
  const configured = todoistService.isConfigured();
  let projects = [];
  if (configured) {
    try {
      projects = await todoistService.getProjects();
    } catch (e) {}
  }
  res.json({
    configured,
    enabled: todoistService.config.enabled,
    admin_project_name: todoistService.config.admin_project_name,
    consultants_project_name: todoistService.config.consultants_project_name,
    feedback_due_days: todoistService.config.feedback_due_days,
    last_sync_at: todoistService.config.last_sync_at,
    projects: projects.map(p => ({ id: p.id, name: p.name }))
  });
});

app.post('/api/todoist/config', async (req, res) => {
  const { api_token, enabled, admin_project_name, consultants_project_name, feedback_due_days } = req.body;
  const updated = todoistService.saveConfig({
    ...(api_token !== undefined && { api_token: String(api_token).trim() }),
    ...(enabled !== undefined && { enabled: Boolean(enabled) }),
    ...(admin_project_name !== undefined && { admin_project_name: String(admin_project_name).trim() }),
    ...(consultants_project_name !== undefined && { consultants_project_name: String(consultants_project_name).trim() }),
    ...(feedback_due_days !== undefined && { feedback_due_days: Number(feedback_due_days) || 2 })
  });
  res.json({ success: true, config: updated });
});

app.post('/api/todoist/test', async (req, res) => {
  const result = await todoistService.testConnection();
  res.json(result);
});

app.post('/api/todoist/sync-overdue', async (req, res) => {
  try {
    const clients = clientManager.getClients();
    const consultants = clientManager.getConsultants();
    const assistants = clientManager.getAssistants();
    const result = await todoistService.syncOverdueClients(clients, consultants, assistants);
    res.json(result);
  } catch (err) {
    console.error('Erro na sincronização de atrasos com Todoist:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── ZOHO CRM EXCEL IMPORT ───────────────────────────────────────────────────
app.post('/api/import-zoho-excel', (req, res) => {
  const { base64Data } = req.body;
  if (!base64Data) return res.status(400).json({ error: 'Ficheiro Excel obrigatório' });

  try {
    const buffer = Buffer.from(base64Data.split(',').pop(), 'base64');
    const result = parseZohoExcel(buffer);
    res.json({
      success: true,
      message: `🎉 ${result.imported} clientes novos importados e ${result.updated} atualizados!`,
      ...result
    });
  } catch (err) {
    console.error('Erro ao importar Excel Zoho:', err);
    res.status(500).json({ error: 'Erro ao processar ficheiro Excel: ' + err.message });
  }
});

// ── AUTH & ASSISTANTS API ──────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'Nome de utilizador / Login obrigatório' });
  
  const user = clientManager.authenticateAssistant(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Utilizador ou palavra-passe incorretos' });
  }

  // Generate simple base64 session token
  const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
  res.json({
    success: true,
    user,
    token
  });
});

app.post('/api/auth/change-password', (req, res) => {
  const { user_id, username, current_password, new_password } = req.body;
  if (!new_password) {
    return res.status(400).json({ error: 'Nova palavra-passe obrigatória' });
  }
  const result = clientManager.changePassword(user_id || username, current_password, new_password);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: result.message });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [id, username] = decoded.split(':');
    const assistant = clientManager.getAssistant(id) || clientManager.getAssistantByUsername(username);
    if (!assistant) return res.status(401).json({ error: 'Sessão inválida ou utilizador não encontrado' });
    
    res.json({
      success: true,
      user: {
        id: assistant.id,
        name: assistant.name,
        username: assistant.username,
        role: assistant.role || (assistant.id === 'assistant-geral' ? 'admin' : 'staff'),
        color: assistant.color || '#5B7FA6'
      }
    });
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/assistants', (req, res) => {
  res.json(clientManager.getAssistants());
});

app.post('/api/assistants', (req, res) => {
  const { id, name, username, password, role, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do administrativo obrigatório' });
  const saved = clientManager.saveAssistant({
    id,
    name,
    username,
    password,
    role: role || (id === 'assistant-geral' ? 'admin' : 'staff'),
    color: color || '#5B7FA6'
  });

  // Sync to Google Drive / Sheets if active
  try {
    if (googleDriveService && googleDriveService.webhookUrl) {
      googleDriveService.saveMasterAssistant(saved);
    }
  } catch (e) {}

  res.json(saved);
});

app.delete('/api/assistants/:id', (req, res) => {
  if (req.params.id === 'assistant-geral') {
    return res.status(400).json({ error: 'Não é possível eliminar a conta principal Geral' });
  }
  const ok = clientManager.deleteAssistant(req.params.id);
  res.json({ success: ok });
});

// ── CONSULTANTS API ──────────────────────────────────────────────────────────
app.get('/api/consultants', (req, res) => {
  res.json(clientManager.getConsultants());
});

app.post('/api/consultants', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do consultor obrigatório' });
  const saved = clientManager.saveConsultant({ name, color: color || '#C75233' });
  res.json(saved);
});

app.delete('/api/consultants/:id', (req, res) => {
  res.json({ success: clientManager.deleteConsultant(req.params.id) });
});

// ── CLIENTS API ───────────────────────────────────────────────────────────────
app.get('/api/clients', async (req, res) => {
  const assistantId = req.query.assistant_id || null;
  const clients = clientManager.getClients(assistantId);
  const allListings = clientManager.getListings();

  clients.forEach(c => {
    const cl = allListings.filter(l => l.client_id === c.id);
    c.total_listings = cl.length;
    c.new_listings   = cl.filter(l => l.status === 'novo' || !l.status).length;
    c.sent_listings  = cl.filter(l => l.status === 'enviado').length;
    c.fav_listings   = cl.filter(l => l.status === 'favorito').length;
  });

  res.json(clients);
});

app.get('/api/clients/:id', (req, res) => {
  const client = clientManager.getClient(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(client);
});

const { parseClientText } = require('./nlpClientParser');

app.post('/api/chat/parse-client', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return res.status(400).json({ error: 'Por favor envie uma mensagem com detalhes do cliente.' });
  }

  const parsed = parseClientText(message);
  if (!parsed || !parsed.name) {
    return res.status(400).json({ error: 'Não foi possível extrair os dados do cliente.' });
  }

  // Verificar se o cliente já existe por nome EXATO (e não genérico)
  const existingClients = clientManager.getClients();
  const existing = (parsed.name && parsed.name !== 'Novo Cliente')
    ? existingClients.find(c => c.name.toLowerCase().trim() === parsed.name.toLowerCase().trim())
    : null;

  let clientToSave = { ...parsed };
  let isUpdate = false;

  if (existing) {
    isUpdate = true;
    clientToSave.id = existing.id;
    clientToSave.consultant_id = parsed.consultant_id !== 'consultant-geral' ? parsed.consultant_id : existing.consultant_id;
    clientToSave.created_at = existing.created_at;
    clientToSave.last_sent_at = existing.last_sent_at;
    clientToSave.notes = parsed.notes || existing.notes;
  } else {
    clientToSave.id = 'client-' + Math.random().toString(36).substring(2, 9);
    clientToSave.created_at = new Date().toISOString();
  }

  const saved = clientManager.saveClient(clientToSave);
  
  // Sincronizar com folha Master no Google Drive se ativo
  try {
    if (googleDriveService.webhookUrl) {
      googleDriveService.saveMasterClient(saved);
    }
  } catch(e) {}

  const { buildLocationUrl } = require('./scraper');
  const searchUrl = buildLocationUrl(saved);

  res.json({
    success: true,
    is_update: isUpdate,
    client: saved,
    search_url: searchUrl,
    summary: {
      name: saved.name,
      property_type: saved.property_type,
      location: saved.location,
      budget: saved.max_price ? `${saved.max_price.toLocaleString('pt-PT')} €` : 'Sem limite definido',
      typology: Array.isArray(saved.typology) ? saved.typology.join(', ').toUpperCase() : 'T3',
      amenities: Array.isArray(saved.amenities) && saved.amenities.length > 0 ? saved.amenities.join(', ') : 'Nenhuma específica',
      priority: saved.priority === 'SU' ? 'Super Urgente (2 dias)' : (saved.priority === 'U' ? 'Urgente (5 dias)' : 'Standard (10 dias)')
    }
  });
});

app.post('/api/clients', async (req, res) => {
  const data = req.body;
  if (!data?.name || !data?.location) {
    return res.status(400).json({ error: 'Nome e localização são obrigatórios' });
  }
  const saved = clientManager.saveClient(data);

  // Sincronizar com folha Master no Google Drive se ativo
  try {
    if (googleDriveService.webhookUrl) {
      googleDriveService.saveMasterClient(saved);
    }
  } catch(e) {}

  res.json(saved);
});

app.post('/api/clients/reassign', (req, res) => {
  const { client_id, consultant_id } = req.body;
  if (!client_id || !consultant_id) {
    return res.status(400).json({ error: 'client_id e consultant_id são obrigatórios' });
  }
  const updated = clientManager.reassignClient(client_id, consultant_id);
  if (!updated) return res.status(404).json({ error: 'Cliente não encontrado' });
  try {
    if (googleDriveService.webhookUrl) googleDriveService.saveMasterClient(updated);
  } catch(e) {}
  res.json({ success: true, client: updated });
});

app.post('/api/clients/reassign-assistant', (req, res) => {
  const { client_id, assistant_id } = req.body;
  if (!client_id || !assistant_id) {
    return res.status(400).json({ error: 'client_id e assistant_id são obrigatórios' });
  }
  const updated = clientManager.reassignClientAssistant(client_id, assistant_id);
  if (!updated) return res.status(404).json({ error: 'Cliente não encontrado' });
  try {
    if (googleDriveService.webhookUrl) googleDriveService.saveMasterClient(updated);
  } catch(e) {}
  res.json({ success: true, client: updated });
});

app.post('/api/clients/mark-sent', (req, res) => {
  const { client_id } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' });
  const updated = clientManager.markClientSent(client_id);
  try {
    if (googleDriveService.webhookUrl && updated) googleDriveService.saveMasterClient(updated);
  } catch(e) {}
  if (todoistService.isConfigured() && updated) {
    todoistService.completeAdminTaskForClient(updated).catch(e => console.warn('Aviso Todoist mark-sent:', e.message));
  }
  res.json({ success: true });
});

app.delete('/api/clients/:id', (req, res) => {
  const success = clientManager.deleteClient(req.params.id);
  try {
    if (googleDriveService.webhookUrl) googleDriveService.deleteMasterClient(req.params.id);
  } catch(e) {}
  res.json({ success });
});

// ── BOT AUTOMATED SEARCH ──────────────────────────────────────────────────────
app.post('/api/scrape/:clientId', async (req, res) => {
  const client = clientManager.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  try {
    const result = await getBot().runAutoSearchBot(client.id);
    res.json({
      success: true,
      client_id: client.id,
      total_found: result.total_found,
      listings: clientManager.getListings(client.id)
    });
  } catch (err) {
    console.error('Erro ao executar bot:', err);
    res.status(500).json({ error: 'Erro ao executar o Bot de pesquisa: ' + err.message });
  }
});

app.get('/api/scrape/status/:clientId', (req, res) => {
  const status = clientManager.getScrapeStatus(req.params.clientId);
  res.json({ status });
});

let lastSelectedClientId = null;

app.post('/api/active-client', (req, res) => {
  const { client_id } = req.body;
  if (client_id) lastSelectedClientId = client_id;
  res.json({ success: true, active_client_id: lastSelectedClientId });
});

app.get('/api/client-search-url/:clientId', (req, res) => {
  const client = clientManager.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  if (client.custom_search_url && client.custom_search_url.trim().startsWith('http')) {
    return res.json({ url: client.custom_search_url.trim() });
  }
  const { buildLocationUrl } = require('./scraper');
  const url = buildLocationUrl(client);
  res.json({ url });
});

app.get('/api/portals-urls/:clientId', (req, res) => {
  const client = clientManager.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  const { getAllPortalUrls } = require('./portalResolvers');
  const urls = getAllPortalUrls(client);
  res.json({ urls });
});

// ── BOOKMARKLET 1-CLICK CAPTURE ENDPOINT ─────────────────────────────────────
app.post('/api/import-active-client-html', (req, res) => {
  const { html, client_id, url } = req.body;
  const targetId = client_id || lastSelectedClientId;

  if (!targetId) {
    return res.status(400).json({ error: 'Nenhum cliente selecionado na aplicação SURE.' });
  }

  const client = clientManager.getClient(targetId);
  if (!client) return res.status(404).json({ error: 'Cliente ativo não encontrado.' });
  if (!html) return res.status(400).json({ error: 'Conteúdo HTML da página não recebido.' });

  const originUrl = url || 'https://www.idealista.pt';
  const listings = parseListingsHtml(html, originUrl, client.location);
  if (listings.length === 0) {
    return res.status(400).json({ error: 'Nenhum imóvel detetado na página aberta.' });
  }

  const { addedCount, updatedCount } = clientManager.saveListings(listings, targetId, false);
  res.json({
    success: true,
    client_name: client.name,
    message: `🎉 ${listings.length} imóveis reais capturados e guardados para o cliente "${client.name}"! (${addedCount} novos)`,
    total_found: listings.length,
    added_new: addedCount,
    updated: updatedCount
  });
});

// ── IMPORT HTML / TEXT / MULTI-URL SOURCE ────────────────────────────────────
app.post('/api/import-html', (req, res) => {
  const { client_id, html, url } = req.body;
  if (!client_id || !html) return res.status(400).json({ error: 'client_id e html são obrigatórios' });
  const client = clientManager.getClient(client_id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  // Debug: guardar HTML completo para diagnóstico
  const fs = require('fs');
  const path = require('path');
  try {
    fs.writeFileSync(path.join(__dirname, 'data', 'last_html_debug.html'), html, 'utf-8');
  } catch(e) {}

  const originUrl = url || (html.includes('remax.pt') ? 'https://www.remax.pt' : (html.includes('zome.pt') ? 'https://www.zome.pt' : (html.includes('era.pt') ? 'https://www.era.pt' : (html.includes('century21.pt') ? 'https://century21.pt' : (html.includes('supercasa.pt') ? 'https://supercasa.pt' : (html.includes('arys.pt') ? 'https://arys.pt' : 'https://www.idealista.pt'))))));
  const listings = parseListingsHtml(html, originUrl, client.location);
  if (listings.length === 0) {
    return res.status(400).json({ error: 'Nenhum imóvel encontrado no conteúdo colado.' });
  }

  const { addedCount, updatedCount } = clientManager.saveListings(listings, client_id, false);
  res.json({
    success: true,
    total_found: listings.length,
    added_new: addedCount,
    updated: updatedCount,
    listings: clientManager.getListings(client_id)
  });
});

// ── IMPORT DIRECT LINK (SINGLE OR MULTIPLE) ──────────────────────────────────
app.post('/api/import-link', async (req, res) => {
  const { client_id, url, urls, title, price, location } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id é obrigatório' });
  const client = clientManager.getClient(client_id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  // Reunir lista de links (aceita string com múltiplos links ou array)
  let rawUrls = [];
  if (Array.isArray(urls)) {
    rawUrls = urls;
  } else if (typeof url === 'string') {
    rawUrls = url.split(/[\r\n,]+/).map(u => u.trim()).filter(Boolean);
  }

  if (rawUrls.length === 0) {
    return res.status(400).json({ error: 'Pelo menos um URL de imóvel é obrigatório' });
  }

  const fetchedListings = [];
  const idealistaUrls = [];
  const otherUrls = [];

  for (const rawUrl of rawUrls) {
    if (!rawUrl || rawUrl.length < 5) continue;
    if (rawUrl.includes('idealista.pt')) {
      idealistaUrls.push(rawUrl);
    } else {
      otherUrls.push(rawUrl);
    }
  }

  // Processar Idealista com Playwright Stealth persistent session
  if (idealistaUrls.length > 0) {
    try {
      const browserResults = await getBot().fetchDirectListingWithBrowser(idealistaUrls, client.location);
      if (Array.isArray(browserResults)) {
        fetchedListings.push(...browserResults);
      }
    } catch (bErr) {
      console.warn('Aviso ao extrair Idealista via browser:', bErr.message);
    }
  }

  // Processar outros portais (RE/MAX, Zome, Arys, Supercasa, etc.) via HTTP rápido
  for (const rawUrl of otherUrls) {
    try {
      const listing = await fetchDirectListingFromUrl(
        rawUrl,
        rawUrls.length === 1 ? { title, price, location } : {},
        client.location
      );
      if (listing) {
        fetchedListings.push(listing);
      }
    } catch (err) {
      console.warn('Erro ao processar link individual:', rawUrl, err.message);
    }
  }

  // Fallback se algum link do Idealista falhou no browser
  const processedUrls = new Set(fetchedListings.map(l => l.link));
  for (const rawUrl of idealistaUrls) {
    if (!processedUrls.has(rawUrl)) {
      try {
        const fallback = await fetchDirectListingFromUrl(
          rawUrl,
          rawUrls.length === 1 ? { title, price, location } : {},
          client.location
        );
        if (fallback) fetchedListings.push(fallback);
      } catch (fErr) {}
    }
  }

  if (fetchedListings.length === 0) {
    return res.status(400).json({ error: 'Não foi possível extrair nenhum imóvel dos links fornecidos.' });
  }

  const { addedCount, updatedCount } = clientManager.saveListings(fetchedListings, client_id, false);
  res.json({
    success: true,
    total_found: fetchedListings.length,
    added_new: addedCount,
    updated: updatedCount,
    listings: clientManager.getListings(client_id)
  });
});

app.post('/api/listings/enrich/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const client = clientManager.getClient(clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const listings = clientManager.getListings(clientId);
  const incomplete = listings.filter(l => 
    !l.title || l.title === l.id || !l.price || l.price === 'Consultar €' || !l.photos || l.photos.length === 0
  );

  if (incomplete.length === 0) {
    return res.json({ success: true, enriched: 0, message: 'Todos os imóveis já contêm informações completas!' });
  }

  const idealistaUrls = incomplete.filter(l => l.link && l.link.includes('idealista.pt')).map(l => l.link);
  const otherListings = incomplete.filter(l => !l.link || !l.link.includes('idealista.pt'));

  const enrichedListings = [];

  if (idealistaUrls.length > 0) {
    try {
      const browserResults = await getBot().fetchDirectListingWithBrowser(idealistaUrls, client.location);
      if (Array.isArray(browserResults)) {
        enrichedListings.push(...browserResults);
      }
    } catch (e) {
      console.warn('Aviso ao enriquecer Idealista via browser:', e.message);
    }
  }

  for (const item of otherListings) {
    if (item.link) {
      try {
        const fullData = await fetchDirectListingFromUrl(item.link, {}, client.location);
        if (fullData) {
          fullData.id = item.id;
          enrichedListings.push(fullData);
        }
      } catch (e) {}
    }
  }

  if (enrichedListings.length > 0) {
    clientManager.saveListings(enrichedListings, clientId, false);
  }

  res.json({
    success: true,
    enriched: enrichedListings.length,
    listings: clientManager.getListings(clientId),
    message: `🎉 ${enrichedListings.length} imóveis atualizados com sucesso!`
  });
});

const { calculateMatchScore, rankListingsForClient } = require('./recommendationEngine');

// ── LISTINGS & STATUS ─────────────────────────────────────────────────────────
app.get('/api/listings/:clientId', (req, res) => {
  const client = clientManager.getClient(req.params.clientId);
  clientManager.deduplicateListings(req.params.clientId);
  let listings = clientManager.getListings(req.params.clientId, req.query.status);
  if (client && listings.length > 0) {
    listings = rankListingsForClient(client, listings);
  }
  res.json(listings);
});

app.delete('/api/listings/clear/:clientId', (req, res) => {
  const { clientId } = req.params;
  const client = clientManager.getClient(clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  const result = clientManager.clearClientListings(clientId);
  res.json({ success: true, ...result });
});

app.delete('/api/listings/:clientId/:listingId', (req, res) => {
  const { clientId, listingId } = req.params;
  const success = clientManager.deleteListing(listingId, clientId);
  res.json({ success });
});

app.post('/api/listings/deduplicate/:clientId', (req, res) => {
  const unique = clientManager.deduplicateListings(req.params.clientId);
  res.json({ success: true, count: unique.length });
});

// Inicializar Google Drive em background
googleDriveService.initAuth().catch(err => console.log('Aviso Google Drive:', err.message));

app.post('/api/listings/status', async (req, res) => {
  const { listing_id, client_id, status, consultant_name, assistant_name, author_name } = req.body;
  if (!listing_id || !client_id || !status) {
    return res.status(400).json({ error: 'listing_id, client_id e status são obrigatórios' });
  }
  const success = clientManager.updateListingStatus(listing_id, client_id, status);

  // Se marcado como "enviado", tentar adicionar linha automaticamente no Google Sheets da Drive e nota no Zoho CRM
  let driveSync = null;
  let zohoNoteSync = null;
  if (status === 'enviado') {
    const client = clientManager.getClient(client_id);
    const listings = clientManager.getListings(client_id);
    const listing = listings.find(l => l.id === listing_id);

    if (client && listing) {
      const consultants = clientManager.getConsultants();
      const assistants = clientManager.getAssistants();
      const consultant = consultants.find(co => co.id === client.consultant_id);
      const assistant = assistants.find(as => as.id === client.assistant_id);
      const consultantFinal = consultant_name || (consultant && consultant.name) || 'SURE Equipa';
      const assistantFinal = assistant_name || author_name || (assistant && assistant.name) || 'Nuno Oliveira';

      // 1. Google Drive / Sheets sync
      if (!googleDriveService.initialized) await googleDriveService.initAuth();
      if (googleDriveService.initialized) {
        try {
          driveSync = await googleDriveService.recordSentProperty(client, listing, consultantFinal, assistantFinal);
        } catch (dErr) {
          console.warn('Aviso sincronização Drive ao mudar estado:', dErr.message);
        }
      }

      // 2. Zoho CRM Direct Note sync (POP 00.05.05.POP: {Colaborador} — Envio de Imóveis)
      if (client.zoho_id && zohoService.isConfigured()) {
        try {
          const popNote = zohoService.formatPopNote({
            authorName: assistantFinal,
            action: 'Envio de Imóveis',
            client,
            consultantName: consultantFinal,
            assistantName: assistantFinal,
            listings: [listing],
            channel: 'Idealista Farm / WhatsApp'
          });

          zohoNoteSync = await zohoService.addDealNote(client.zoho_id, popNote.title, popNote.content);
        } catch (zErr) {
          console.warn('Aviso sincronização Zoho Note ao mudar estado:', zErr.message);
        }
      }

      // 3. Todoist Task sync (Concluir tarefa do Administrativo e criar tarefa para Consultor em #Geral)
      if (todoistService.isConfigured()) {
        try {
          // Fechar tarefa de atraso do administrativo se existir
          todoistService.completeAdminTaskForClient(client).catch(tErr => {
            console.warn('Aviso ao concluir tarefa do administrativo no Todoist:', tErr.message);
          });

          // Atualizar último envio do cliente no sistema
          clientManager.markClientSent(client_id);

          todoistService.createSentFeedbackTask(client, [listing], consultant).catch(tErr => {
            console.warn('Aviso sincronização Todoist ao mudar estado:', tErr.message);
          });
        } catch (tErr) {
          console.warn('Aviso Todoist:', tErr.message);
        }
      }
    }
  }

  res.json({ success, driveSync, zohoNoteSync });
});

// ── GOOGLE DRIVE & SHEETS API ────────────────────────────────────────────────
app.get('/api/drive/status', async (req, res) => {
  const isAuth = googleDriveService.initialized || (await googleDriveService.initAuth());
  res.json({
    connected: isAuth,
    rootFolderId: googleDriveService.rootFolderId,
    credentialsPath: path.join(__dirname, 'data', 'google_credentials.json')
  });
});

app.post('/api/drive/upload-credentials', async (req, res) => {
  try {
    const { credentials } = req.body;
    if (!credentials) return res.status(400).json({ error: 'Credenciais JSON não fornecidas' });
    const ok = await googleDriveService.saveCredentials(credentials);
    res.json({ success: ok, message: ok ? 'Google Drive conectado com sucesso!' : 'Falha na autenticação' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drive/set-webhook', async (req, res) => {
  try {
    const { webhook_url } = req.body;
    if (!webhook_url) return res.status(400).json({ error: 'URL do Webhook não fornecido' });
    const ok = await googleDriveService.saveWebhookUrl(webhook_url);
    res.json({ success: ok, message: ok ? 'Google Apps Script Webhook ativado com sucesso!' : 'Falha ao gravar Webhook' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drive/sync-master-clients', async (req, res) => {
  try {
    const cloudClients = await googleDriveService.fetchMasterClients();
    if (cloudClients && Array.isArray(cloudClients) && cloudClients.length > 0) {
      clientManager.saveAllClients(cloudClients);
      return res.json({
        success: true,
        count: cloudClients.length,
        clients: clientManager.getClients(),
        message: `🎉 ${cloudClients.length} clientes sincronizados da folha Master da Google Drive!`
      });
    }
    res.json({ success: true, count: 0, clients: clientManager.getClients() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drive/push-all-clients', async (req, res) => {
  try {
    const allClients = clientManager.getClients();
    const count = await googleDriveService.saveMasterClientsBulk(allClients);
    res.json({
      success: true,
      count,
      message: `🎉 ${count} clientes enviados para a folha Master da Google Drive!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drive/client-status/:clientId', async (req, res) => {
  try {
    const client = clientManager.getClient(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
    const status = await googleDriveService.checkClientStatus(client);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drive/create-client-folder', async (req, res) => {
  try {
    const { client_id } = req.body;
    const client = clientManager.getClient(client_id);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
    const result = await googleDriveService.createClientFolderOnly(client);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drive/record-sent', async (req, res) => {
  try {
    const { client_id, listing_id, consultant_name, assistant_name, author_name } = req.body;
    const client = clientManager.getClient(client_id);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    const listings = clientManager.getListings(client_id);
    const listing = listings.find(l => l.id === listing_id);
    if (!listing) return res.status(404).json({ error: 'Imóvel não encontrado' });

    clientManager.updateListingStatus(listing_id, client_id, 'enviado');

    const consultants = clientManager.getConsultants();
    const assistants = clientManager.getAssistants();
    const consultant = consultants.find(co => co.id === client.consultant_id);
    const assistant = assistants.find(as => as.id === client.assistant_id);
    const consultantFinal = consultant_name || (consultant && consultant.name) || 'SURE Equipa';
    const assistantFinal = assistant_name || author_name || (assistant && assistant.name) || 'Nuno Oliveira';

    const driveResult = await googleDriveService.recordSentProperty(client, listing, consultantFinal, assistantFinal);

    // Zoho CRM Note sync (POP 00.05.05.POP: {Colaborador} — Envio de Imóveis)
    if (client.zoho_id && zohoService.isConfigured()) {
      try {
        const popNote = zohoService.formatPopNote({
          authorName: assistantFinal,
          action: 'Envio de Imóveis',
          client,
          consultantName: consultantFinal,
          assistantName: assistantFinal,
          listings: [listing],
          channel: 'Idealista Farm / WhatsApp'
        });

        await zohoService.addDealNote(client.zoho_id, popNote.title, popNote.content);
      } catch (zErr) {
        console.warn('Aviso sincronização Zoho Note em record-sent:', zErr.message);
      }
    }

    // Todoist Task sync (Concluir tarefa do Administrativo e criar tarefa para Consultor em #Geral)
    if (todoistService.isConfigured()) {
      try {
        todoistService.completeAdminTaskForClient(client).catch(tErr => {
          console.warn('Aviso ao concluir tarefa do administrativo no Todoist (record-sent):', tErr.message);
        });
        clientManager.markClientSent(client_id);

        todoistService.createSentFeedbackTask(client, [listing], consultant).catch(tErr => {
          console.warn('Aviso sincronização Todoist record-sent:', tErr.message);
        });
      } catch (tErr) {}
    }

    res.json({ success: true, driveResult });
  } catch (err) {
    console.error('Erro ao registar na Drive:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drive/create-word-doc', async (req, res) => {
  try {
    const { client_id } = req.body;
    const client = clientManager.getClient(client_id);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    const listings = clientManager.getListings(client_id, 'enviado');
    const targetListings = listings.length > 0 ? listings : clientManager.getListings(client_id);

    let folder = null;
    if (!googleDriveService.webhookUrl) {
      folder = await googleDriveService.findOrCreateClientFolder(client.name);
    }
    const docResult = await googleDriveService.createClientWordSummary(client, targetListings || [], folder ? folder.folderId : null);

    res.json({ success: true, folder, docResult });
  } catch (err) {
    console.error('Erro ao gerar documento Word:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/listings/batch-status', async (req, res) => {
  const { listing_ids, client_id, status, consultant_name, assistant_name, author_name } = req.body;
  if (!Array.isArray(listing_ids) || !client_id || !status) {
    return res.status(400).json({ error: 'listing_ids array, client_id e status são obrigatórios' });
  }
  listing_ids.forEach(id => clientManager.updateListingStatus(id, client_id, status));

  let driveSync = null;
  let zohoNoteSync = null;
  if (status === 'enviado') {
    try {
      const client = clientManager.getClient(client_id);
      const allListings = clientManager.getListings(client_id);
      const targetListings = allListings.filter(l => listing_ids.includes(l.id));
      if (client && targetListings.length > 0) {
        const consultants = clientManager.getConsultants();
        const assistants = clientManager.getAssistants();
        const consultant = consultants.find(co => co.id === client.consultant_id);
        const assistant = assistants.find(as => as.id === client.assistant_id);
        const consultantFinal = consultant_name || (consultant && consultant.name) || 'SURE Equipa';
        const assistantFinal = assistant_name || author_name || (assistant && assistant.name) || 'Nuno Oliveira';

        driveSync = await googleDriveService.recordSentProperties(client, targetListings, consultantFinal, assistantFinal);

        // Zoho CRM Note sync (POP 00.05.05.POP: {Colaborador} — Envio de Imóveis)
        if (client.zoho_id && zohoService.isConfigured()) {
          try {
            const popNote = zohoService.formatPopNote({
              authorName: assistantFinal,
              action: 'Envio de Imóveis',
              client,
              consultantName: consultantFinal,
              assistantName: assistantFinal,
              listings: targetListings,
              channel: 'Idealista Farm / WhatsApp'
            });

            zohoNoteSync = await zohoService.addDealNote(client.zoho_id, popNote.title, popNote.content);
          } catch (zErr) {
            console.warn('Aviso sincronização Zoho Note em lote:', zErr.message);
          }
        }

        // Todoist Task sync (Concluir tarefa do Administrativo e criar tarefa para Consultor em #Geral)
        if (todoistService.isConfigured()) {
          todoistService.completeAdminTaskForClient(client).catch(tErr => {
            console.warn('Aviso ao concluir tarefa do administrativo no Todoist em lote:', tErr.message);
          });
          clientManager.markClientSent(client_id);

          todoistService.createSentFeedbackTask(client, targetListings, consultant).catch(tErr => {
            console.warn('Aviso sincronização Todoist em lote:', tErr.message);
          });
        }
      }
    } catch (dErr) {
      console.warn('Aviso sincronização Drive ao mudar estado em lote:', dErr.message);
    }
  }

  res.json({ success: true, count: listing_ids.length, driveSync, zohoNoteSync });
});

// ── CSV EXPORT ────────────────────────────────────────────────────────────────
app.get('/api/export/:clientId', (req, res) => {
  const client = clientManager.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const listings = clientManager.getListings(client.id);
  if (!listings.length) return res.status(400).json({ error: 'Nenhum imóvel para exportar' });

  const assistants = clientManager.getAssistants();
  const assistant = assistants.find(a => a.id === client.assistant_id);
  const assistantName = (assistant && assistant.name) || client.assistant_name || 'Nuno Oliveira';

  const headers = ['Administrativo', 'ID', 'Titulo', 'Link Direto', 'Preco', 'Localizacao', 'Tipologia', 'Estado', 'Data'];
  const rows = listings.map(l => [
    `"${assistantName.replace(/"/g, '""')}"`,
    `"${l.id}"`,
    `"${(l.title || '').replace(/"/g, '""')}"`,
    `"${l.link}"`,
    `"${l.price}"`,
    `"${(l.location || '').replace(/"/g, '""')}"`,
    `"${l.typology || ''}"`,
    `"${(l.status || 'novo').toUpperCase()}"`,
    `"${l.scraped_at || ''}"`
  ]);

  const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="SURE_Imoveis_${(client.name || 'cliente').replace(/\s+/g, '_')}.csv"`);
  res.send(csv);
});

// ── VISITS API (MARCADOR DE VISITAS & GOOGLE CALENDAR) ────────────────────────
app.get('/api/visits', (req, res) => {
  const { clientId, consultantId } = req.query;
  const visits = clientManager.getVisits(clientId, consultantId);
  res.json(visits);
});

app.post('/api/visits', async (req, res) => {
  const visitData = req.body;
  if (!visitData || !visitData.date) {
    return res.status(400).json({ error: 'Data e hora da visita são obrigatórias' });
  }

  const saved = clientManager.saveVisit(visitData);

  // 1. Sincronizar com Google Calendar via Webhook se ativado
  let googleSync = null;
  try {
    googleSync = await googleDriveService.scheduleVisit(saved);
  } catch (e) {
    console.warn('Aviso sincronização Google Calendar:', e.message);
  }

  // 2. Registar Nota automaticamente no Zoho CRM se o cliente tiver zoho_id
  let zohoNoteSync = null;
  if (saved.client_id) {
    const client = clientManager.getClient(saved.client_id);
    if (client && client.zoho_id && zohoService.isConfigured()) {
      try {
        const visitTimeStr = saved.time ? ` às ${saved.time}` : '';
        const visitDateFormatted = `${saved.date}${visitTimeStr}`;
        const noteTitle = `📅 Visita Agendada: ${saved.listing_title || saved.property_title || 'Imóvel para Visita'}`;
        const noteContent = `Visita marcada no Marcador de Visitas SURE:\n\n` +
          `• Imóvel: ${saved.listing_title || saved.property_title || 'N/A'}\n` +
          `• Data e Hora: ${visitDateFormatted} (${saved.duration || '60'} min)\n` +
          `• Localização / Morada: ${saved.location || client.location || 'N/A'}\n` +
          `• Preço: ${saved.price || 'N/A'}\n` +
          `• Consultor: ${saved.consultant_name || 'N/A'}\n` +
          `• Contacto / Responsável: ${saved.contact_person || 'N/A'}\n` +
          `• Link do Imóvel: ${saved.link || saved.listing_url || 'N/A'}\n` +
          `• Notas / Observações: ${saved.notes || 'Sem observações adicionais'}\n` +
          `• Registado em: ${new Date().toLocaleString('pt-PT')}`;

        zohoNoteSync = await zohoService.addDealNote(client.zoho_id, noteTitle, noteContent);
      } catch (zErr) {
        console.warn('Aviso sincronização Visita no Zoho CRM:', zErr.message);
      }
    }
  }

  res.json({ success: true, visit: saved, googleSync, zohoNoteSync });
});

app.delete('/api/visits/:id', (req, res) => {
  const success = clientManager.deleteVisit(req.params.id);
  res.json({ success });
});

app.post('/api/visits/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status obrigatório' });
  const updated = clientManager.updateVisitStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Visita não encontrada' });

  // Registar atualização de estado da visita no Zoho CRM se relevante (realizada / cancelada)
  if (updated && updated.client_id && (status === 'realizada' || status === 'cancelada')) {
    const client = clientManager.getClient(updated.client_id);
    if (client && client.zoho_id && zohoService.isConfigured()) {
      try {
        const isDone = status === 'realizada';
        const noteTitle = isDone ? `✅ Visita Realizada: ${updated.listing_title || 'Imóvel'}` : `❌ Visita Cancelada: ${updated.listing_title || 'Imóvel'}`;
        const noteContent = `Atualização de Estado de Visita:\n\n` +
          `• Estado: ${status.toUpperCase()}\n` +
          `• Imóvel: ${updated.listing_title || 'N/A'}\n` +
          `• Data: ${updated.date} ${updated.time || ''}\n` +
          `• Consultor: ${updated.consultant_name || 'N/A'}\n` +
          `• Notas: ${updated.notes || 'N/A'}\n` +
          `• Atualizado em: ${new Date().toLocaleString('pt-PT')}`;

        zohoService.addDealNote(client.zoho_id, noteTitle, noteContent).catch(() => {});
      } catch (e) {}
    }
  }

  res.json({ success: true, visit: updated });
});

app.post('/api/visits/google-sync', async (req, res) => {
  const visitData = req.body;
  try {
    const result = await googleDriveService.scheduleVisit(visitData);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DATA PERSISTENCE, BACKUP & BATCH SYNC ──────────────────────────────────
app.get('/api/backup/export', (req, res) => {
  try {
    const backup = clientManager.getFullBackup();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="SURE_Backup_${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar backup: ' + err.message });
  }
});

app.post('/api/backup/restore', (req, res) => {
  try {
    const backupData = req.body;
    const ok = clientManager.restoreFullBackup(backupData);
    if (ok) {
      res.json({
        success: true,
        message: 'Backup restaurado com sucesso!',
        clients_count: clientManager.getClients().length,
        listings_count: clientManager.getListings().length
      });
    } else {
      res.status(400).json({ error: 'Ficheiro de backup inválido ou vazio.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao restaurar backup: ' + err.message });
  }
});

app.post('/api/sync-batch', (req, res) => {
  try {
    const batch = req.body;
    const result = clientManager.syncBatchData(batch);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao sincronizar dados em lote: ' + err.message });
  }
});

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║   🏡 SURE. IDEALISTA FARM - v1.2.0           ║`);
    console.log(`║   http://localhost:${PORT}                      ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);

    // Sincronização periódica automática no Todoist para clientes em atraso (Regra 2)
    setTimeout(async () => {
      if (todoistService.isConfigured() && todoistService.config.enabled) {
        try {
          const clients = clientManager.getClients();
          const consultants = clientManager.getConsultants();
          const assistants = clientManager.getAssistants();
          await todoistService.syncOverdueClients(clients, consultants, assistants);
        } catch (e) {
          console.warn('Aviso sincronização inicial Todoist:', e.message);
        }
      }
    }, 5000);

    setInterval(async () => {
      if (todoistService.isConfigured() && todoistService.config.enabled) {
        try {
          const clients = clientManager.getClients();
          const consultants = clientManager.getConsultants();
          const assistants = clientManager.getAssistants();
          await todoistService.syncOverdueClients(clients, consultants, assistants);
        } catch (e) {
          console.warn('Aviso sincronização periódica Todoist:', e.message);
        }
      }
    }, 30 * 60 * 1000); // Executar a cada 30 min
  });
}

module.exports = app;
