const express = require('express');
const cors = require('cors');
const path = require('path');
const clientManager = require('./clientManager');
const { parseListingsHtml } = require('./scraper');
const { runAutoSearchBot } = require('./bot');
const { parseZohoExcel } = require('./importer');

process.on('uncaughtException', (err) => {
  console.error('⚠️ [SERVER SAFEGUARD] Exceção capturada:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [SERVER SAFEGUARD] Rejeição assíncrona:', reason ? reason.message || reason : '');
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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
app.get('/api/clients', (req, res) => {
  const clients = clientManager.getClients();
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

app.post('/api/chat/parse-client', (req, res) => {
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

app.post('/api/clients', (req, res) => {
  const data = req.body;
  if (!data?.name || !data?.location) {
    return res.status(400).json({ error: 'Nome e localização são obrigatórios' });
  }
  const saved = clientManager.saveClient(data);
  res.json(saved);
});

app.post('/api/clients/reassign', (req, res) => {
  const { client_id, consultant_id } = req.body;
  if (!client_id || !consultant_id) {
    return res.status(400).json({ error: 'client_id e consultant_id são obrigatórios' });
  }
  const updated = clientManager.reassignClient(client_id, consultant_id);
  if (!updated) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({ success: true, client: updated });
});

app.post('/api/clients/mark-sent', (req, res) => {
  const { client_id } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' });
  clientManager.markClientSent(client_id);
  res.json({ success: true });
});

app.delete('/api/clients/:id', (req, res) => {
  const success = clientManager.deleteClient(req.params.id);
  res.json({ success });
});

// ── BOT AUTOMATED SEARCH ──────────────────────────────────────────────────────
app.post('/api/scrape/:clientId', async (req, res) => {
  const client = clientManager.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  try {
    const result = await runAutoSearchBot(client.id);
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

// ── BOOKMARKLET 1-CLICK CAPTURE ENDPOINT ─────────────────────────────────────
app.post('/api/import-active-client-html', (req, res) => {
  const { html, client_id } = req.body;
  const targetId = client_id || lastSelectedClientId;

  if (!targetId) {
    return res.status(400).json({ error: 'Nenhum cliente selecionado na aplicação SURE.' });
  }

  const client = clientManager.getClient(targetId);
  if (!client) return res.status(404).json({ error: 'Cliente ativo não encontrado.' });
  if (!html) return res.status(400).json({ error: 'Conteúdo HTML da página não recebido.' });

  const listings = parseListingsHtml(html);
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

// ── IMPORT HTML SOURCE ────────────────────────────────────────────────────────
app.post('/api/import-html', (req, res) => {
  const { client_id, html } = req.body;
  if (!client_id || !html) return res.status(400).json({ error: 'client_id e html são obrigatórios' });
  if (!clientManager.getClient(client_id)) return res.status(404).json({ error: 'Cliente não encontrado' });

  // Debug: guardar HTML completo para diagnóstico
  const fs = require('fs');
  const path = require('path');
  try {
    fs.writeFileSync(path.join(__dirname, 'data', 'last_html_debug.html'), html, 'utf-8');
  } catch(e) {}

  const listings = parseListingsHtml(html);
  if (listings.length === 0) {
    return res.status(400).json({ error: 'Nenhum imóvel encontrado no código HTML colado.' });
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

// ── IMPORT DIRECT LINK ────────────────────────────────────────────────────────
app.post('/api/import-link', (req, res) => {
  const { client_id, url, title, price, location } = req.body;
  if (!client_id || !url) return res.status(400).json({ error: 'client_id e url são obrigatórios' });
  if (!clientManager.getClient(client_id)) return res.status(404).json({ error: 'Cliente não encontrado' });

  const match = url.match(/\/imovel\/(\d+)\//);
  const itemId = match ? match[1] : `manual_${Date.now()}`;

  const listing = {
    id: itemId,
    title: title || `Imóvel Idealista #${itemId}`,
    link: url.startsWith('http') ? url : `https://${url}`,
    price: price || 'Consultar €',
    price_num: parseInt((price || '0').replace(/[^\d]/g, ''), 10) || 0,
    location: location || '',
    typology: '',
    area: '',
    photo: '',
    photos: [],
    description: '',
    details: ['Importado Manualmente'],
    status: 'novo',
    scraped_at: new Date().toISOString()
  };

  const { addedCount } = clientManager.saveListings([listing], client_id, false);
  res.json({ success: true, listing, added: addedCount > 0 });
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

app.delete('/api/listings/:clientId/:listingId', (req, res) => {
  const { clientId, listingId } = req.params;
  const success = clientManager.deleteListing(listingId, clientId);
  res.json({ success });
});

app.post('/api/listings/deduplicate/:clientId', (req, res) => {
  const unique = clientManager.deduplicateListings(req.params.clientId);
  res.json({ success: true, count: unique.length });
});

const googleDriveService = require('./googleDriveService');

// Inicializar Google Drive em background
googleDriveService.initAuth().catch(err => console.log('Aviso Google Drive:', err.message));

app.post('/api/listings/status', async (req, res) => {
  const { listing_id, client_id, status } = req.body;
  if (!listing_id || !client_id || !status) {
    return res.status(400).json({ error: 'listing_id, client_id e status são obrigatórios' });
  }
  const success = clientManager.updateListingStatus(listing_id, client_id, status);

  // Se marcado como "enviado", tentar adicionar linha automaticamente no Google Sheets da Drive
  let driveSync = null;
  if (status === 'enviado') {
    if (!googleDriveService.initialized) await googleDriveService.initAuth();
    if (googleDriveService.initialized) {
      try {
        const client = clientManager.getClient(client_id);
        const listings = clientManager.getListings(client_id);
        const listing = listings.find(l => l.id === listing_id);
        if (client && listing) {
          driveSync = await googleDriveService.recordSentProperty(client, listing);
        }
      } catch (dErr) {
        console.warn('Aviso sincronização Drive ao mudar estado:', dErr.message);
      }
    }
  }

  res.json({ success, driveSync });
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
    const { client_id, listing_id, consultant_name } = req.body;
    const client = clientManager.getClient(client_id);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    const listings = clientManager.getListings(client_id);
    const listing = listings.find(l => l.id === listing_id);
    if (!listing) return res.status(404).json({ error: 'Imóvel não encontrado' });

    clientManager.updateListingStatus(listing_id, client_id, 'enviado');

    const driveResult = await googleDriveService.recordSentProperty(client, listing, consultant_name || 'SURE Equipa');
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
    if (!targetListings.length) return res.status(400).json({ error: 'Nenhum imóvel disponível para o relatório' });

    let folder = null;
    if (!googleDriveService.webhookUrl) {
      folder = await googleDriveService.findOrCreateClientFolder(client.name);
    }
    const docResult = await googleDriveService.createClientWordSummary(client, targetListings, folder ? folder.folderId : null);

    res.json({ success: true, folder, docResult });
  } catch (err) {
    console.error('Erro ao gerar documento Word:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/listings/batch-status', async (req, res) => {
  const { listing_ids, client_id, status } = req.body;
  if (!Array.isArray(listing_ids) || !client_id || !status) {
    return res.status(400).json({ error: 'listing_ids array, client_id e status são obrigatórios' });
  }
  listing_ids.forEach(id => clientManager.updateListingStatus(id, client_id, status));

  let driveSync = null;
  if (status === 'enviado') {
    try {
      const client = clientManager.getClient(client_id);
      const allListings = clientManager.getListings(client_id);
      const targetListings = allListings.filter(l => listing_ids.includes(l.id));
      if (client && targetListings.length > 0) {
        driveSync = await googleDriveService.recordSentProperties(client, targetListings);
      }
    } catch (dErr) {
      console.warn('Aviso sincronização Drive ao mudar estado em lote:', dErr.message);
    }
  }

  res.json({ success: true, count: listing_ids.length, driveSync });
});

// ── CSV EXPORT ────────────────────────────────────────────────────────────────
app.get('/api/export/:clientId', (req, res) => {
  const client = clientManager.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const listings = clientManager.getListings(client.id);
  if (!listings.length) return res.status(400).json({ error: 'Nenhum imóvel para exportar' });

  const headers = ['ID', 'Titulo', 'Link Direto', 'Preco', 'Localizacao', 'Tipologia', 'Estado', 'Data'];
  const rows = listings.map(l => [
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

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║   🏡 SURE. IDEALISTA FARM - v1.2.0           ║`);
    console.log(`║   http://localhost:${PORT}                      ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);
  });
}

module.exports = app;
