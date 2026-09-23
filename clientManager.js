const fs = require('fs');
const path = require('path');
const os = require('os');
const { extractAndNormalizeAllLocations } = require('./geoResolver');

const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_VERCEL ? path.join(os.tmpdir(), 'sure_data') : path.join(__dirname, 'data');
const SEED_DATA_DIR = path.join(__dirname, 'data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');
const CONSULTANTS_FILE = path.join(DATA_DIR, 'consultants.json');
const ASSISTANTS_FILE = path.join(DATA_DIR, 'assistants.json');
const VISITS_FILE = path.join(DATA_DIR, 'visits.json');

const PRIORITY_LIMITS = {
  'SU': 2, // Super Urgente: 2 dias
  'U':  5, // Urgente: 5 dias
  'S':  10 // Standard: 10 dias
};

const activeScrapes = {};

function syncWrite(targetFile, data) {
  fs.writeFileSync(targetFile, JSON.stringify(data, null, 2), 'utf-8');
  if (SEED_DATA_DIR && SEED_DATA_DIR !== DATA_DIR && fs.existsSync(SEED_DATA_DIR)) {
    try {
      const altFile = path.join(SEED_DATA_DIR, path.basename(targetFile));
      fs.writeFileSync(altFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      // Ignorar erros em ambiente read-only
    }
  }
}

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Copiar ficheiros existentes da pasta seed se a pasta de destino não tiver ou ao iniciar no Vercel
  ['clients.json', 'consultants.json', 'assistants.json', 'listings.json'].forEach(fileName => {
    const targetFile = path.join(DATA_DIR, fileName);
    const seedFile = path.join(SEED_DATA_DIR, fileName);
    if (fs.existsSync(seedFile)) {
      if (!fs.existsSync(targetFile) || (IS_VERCEL && !global.__dataSeeded)) {
        try {
          fs.copyFileSync(seedFile, targetFile);
        } catch (e) {
          console.warn(`Aviso ao copiar ${fileName}:`, e.message);
        }
      }
    }
  });
  global.__dataSeeded = true;

  if (!fs.existsSync(CONSULTANTS_FILE)) {
    const defaultConsultants = [
      { id: "consultant-geral", name: "Geral / Equipa SURE", color: "#C75233" },
      { id: "consultant-ana", name: "Ana Silva", color: "#5B7FA6" },
      { id: "consultant-tiago", name: "Tiago Ferreira", color: "#5B8C6A" }
    ];
    fs.writeFileSync(CONSULTANTS_FILE, JSON.stringify(defaultConsultants, null, 2), 'utf-8');
  }

  if (!fs.existsSync(ASSISTANTS_FILE)) {
    const defaultAssistants = [
      { id: "assistant-geral", name: "Geral / Administração", username: "geral", password: "123", role: "admin", color: "#C75233" },
      { id: "assistant-maria", name: "Maria Santos", username: "maria", password: "123", role: "staff", color: "#5B7FA6" }
    ];
    fs.writeFileSync(ASSISTANTS_FILE, JSON.stringify(defaultAssistants, null, 2), 'utf-8');
  }

  if (!fs.existsSync(CLIENTS_FILE)) {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  if (!fs.existsSync(LISTINGS_FILE)) {
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  if (!fs.existsSync(VISITS_FILE)) {
    fs.writeFileSync(VISITS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

ensureDataFiles();

class ClientManager {
  // ── CONSULTANTS ────────────────────────────────────────────────────────────
  getConsultants() {
    ensureDataFiles();
    try {
      const data = fs.readFileSync(CONSULTANTS_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (e) {
      console.error('Erro ao ler consultants.json:', e);
      return [];
    }
  }

  saveConsultant(consultantData) {
    const consultants = this.getConsultants();
    let consultant = { ...consultantData };

    if (!consultant.id) {
      consultant.id = 'consultant-' + Math.random().toString(36).substring(2, 9);
      consultants.push(consultant);
    } else {
      const idx = consultants.findIndex(c => c.id === consultant.id);
      if (idx !== -1) consultants[idx] = consultant;
      else consultants.push(consultant);
    }

    syncWrite(CONSULTANTS_FILE, consultants);
    return consultant;
  }

  deleteConsultant(consultantId) {
    let consultants = this.getConsultants();
    consultants = consultants.filter(c => c.id !== consultantId);
    syncWrite(CONSULTANTS_FILE, consultants);

    // Reassign clients of this consultant to "consultant-geral"
    let clients = this.getClients();
    clients.forEach(c => {
      if (c.consultant_id === consultantId) {
        c.consultant_id = 'consultant-geral';
      }
    });
    syncWrite(CLIENTS_FILE, clients);
    return true;
  }

  saveAllConsultants(consultantsList) {
    syncWrite(CONSULTANTS_FILE, consultantsList);
  }

  // ── ASSISTANTS (ADMINISTRATIVOS) ──────────────────────────────────────────
  getAssistants() {
    ensureDataFiles();
    try {
      const data = fs.readFileSync(ASSISTANTS_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (e) {
      console.error('Erro ao ler assistants.json:', e);
      return [];
    }
  }

  getAssistant(assistantId) {
    const assistants = this.getAssistants();
    return assistants.find(a => a.id === assistantId) || null;
  }

  getAssistantByUsername(username) {
    if (!username) return null;
    const assistants = this.getAssistants();
    const cleanUser = String(username).trim().toLowerCase();
    return assistants.find(a => 
      String(a.username || '').trim().toLowerCase() === cleanUser ||
      String(a.name || '').trim().toLowerCase() === cleanUser ||
      String(a.username || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '') === cleanUser.replace(/[^a-z0-9]/g, '')
    ) || null;
  }

  authenticateAssistant(username, password) {
    if (!username) return null;
    const user = this.getAssistantByUsername(username);
    if (!user) return null;
    // Password verification (direct match or default 123 if empty)
    const expectedPass = String(user.password || '123').trim();
    const providedPass = String(password || '').trim();
    if (expectedPass === providedPass) {
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role || (user.id === 'assistant-geral' ? 'admin' : 'staff'),
        color: user.color || '#5B7FA6'
      };
    }
    return null;
  }

  changePassword(userIdOrUsername, currentPassword, newPassword) {
    const assistants = this.getAssistants();
    const clean = String(userIdOrUsername || '').trim().toLowerCase();
    const user = assistants.find(a => 
      a.id === userIdOrUsername || 
      String(a.username || '').trim().toLowerCase() === clean ||
      String(a.name || '').trim().toLowerCase() === clean
    );

    if (!user) {
      return { success: false, error: 'Utilizador não encontrado.' };
    }

    const expectedPass = String(user.password || '123').trim();
    if (currentPassword && currentPassword !== expectedPass) {
      return { success: false, error: 'A palavra-passe atual está incorreta.' };
    }

    if (!newPassword || newPassword.trim().length < 3) {
      return { success: false, error: 'A nova palavra-passe deve ter pelo menos 3 caracteres.' };
    }

    user.password = newPassword.trim();
    syncWrite(ASSISTANTS_FILE, assistants);
    return { success: true, message: 'Palavra-passe alterada com sucesso!' };
  }

  saveAssistant(assistantData) {
    const assistants = this.getAssistants();
    let assistant = { ...assistantData };

    if (!assistant.username) {
      assistant.username = String(assistant.name || 'user').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    }
    if (!assistant.password) {
      assistant.password = '123';
    }
    if (!assistant.role) {
      assistant.role = assistant.id === 'assistant-geral' ? 'admin' : 'staff';
    }
    if (!assistant.color) {
      assistant.color = '#5B7FA6';
    }

    if (!assistant.id) {
      assistant.id = 'assistant-' + Math.random().toString(36).substring(2, 9);
      assistants.push(assistant);
    } else {
      const idx = assistants.findIndex(a => a.id === assistant.id);
      if (idx !== -1) assistants[idx] = assistant;
      else assistants.push(assistant);
    }

    syncWrite(ASSISTANTS_FILE, assistants);
    return assistant;
  }

  deleteAssistant(assistantId) {
    if (assistantId === 'assistant-geral') return false; // Prevent deleting master account
    let assistants = this.getAssistants();
    assistants = assistants.filter(a => a.id !== assistantId);
    syncWrite(ASSISTANTS_FILE, assistants);

    // Reassign clients of this assistant to "assistant-geral"
    let clients = this.getClients();
    clients.forEach(c => {
      if (c.assistant_id === assistantId) {
        c.assistant_id = 'assistant-geral';
      }
    });
    syncWrite(CLIENTS_FILE, clients);
    return true;
  }

  saveAllAssistants(assistantsList) {
    syncWrite(ASSISTANTS_FILE, assistantsList);
  }

  getAssistantIdForConsultant(consultantId) {
    if (consultantId === 'consultant-rui' || consultantId === 'consultant-joao') return 'assistant-joao';
    if (consultantId === 'consultant-nuno' || consultantId === 'consultant-pedro' || consultantId === 'consultant-pedro-oliveira') return 'assistant-pedro';
    if (['consultant-diogo', 'consultant-gardiana', 'consultant-elizabete', 'consultant-elisabete'].includes(consultantId)) {
      return 'assistant-nuno';
    }
    return 'assistant-nuno';
  }

  // ── CLIENTS ────────────────────────────────────────────────────────────────
  getClients(filterAssistantId = null) {
    ensureDataFiles();
    try {
      const data = fs.readFileSync(CLIENTS_FILE, 'utf-8');
      let clients = JSON.parse(data || '[]');
      const now = Date.now();

      // Compute overdue metadata for each client
      clients.forEach(c => {
        if (!c.priority) c.priority = 'U';
        c.assistant_id = this.getAssistantIdForConsultant(c.consultant_id);

        const maxDays = PRIORITY_LIMITS[c.priority] || 5;
        const refDate = c.last_sent_at ? new Date(c.last_sent_at).getTime() : (c.created_at ? new Date(c.created_at).getTime() : now);
        const daysPassed = (now - refDate) / (1000 * 60 * 60 * 24);

        c.days_since_sent = Math.floor(daysPassed);
        c.max_days = maxDays;
        c.is_overdue = daysPassed > maxDays;
        c.days_overdue = c.is_overdue ? Math.floor(daysPassed - maxDays) : 0;
      });

      if (filterAssistantId && filterAssistantId !== 'all' && filterAssistantId !== 'assistant-geral') {
        clients = clients.filter(c => c.assistant_id === filterAssistantId);
      }

      return clients;
    } catch (e) {
      console.error('Erro ao ler clients.json:', e);
      return [];
    }
  }

  getClient(clientId) {
    const clients = this.getClients();
    return clients.find(c => c.id === clientId) || null;
  }

  saveClient(clientData) {
    const clients = this.getClients();
    let client = { ...clientData };

    if (!client.priority) client.priority = 'U';
    if (!client.consultant_id) client.consultant_id = 'consultant-geral';
    if (!client.assistant_id || client.assistant_id === 'assistant-geral') {
      client.assistant_id = this.getAssistantIdForConsultant(client.consultant_id);
    }

    // Normalização Inteligente de Múltiplas Localizações e Erros Ortográficos
    if (client.location || client.locations) {
      const geoInfo = extractAndNormalizeAllLocations(client.locations || client.location, client.notes || '');
      client.location = geoInfo.formatted;
      client.locations = geoInfo.locations;
    } else {
      client.location = 'Braga';
      client.locations = ['Braga'];
    }

    if (!client.id) {
      client.id = 'client-' + Math.random().toString(36).substring(2, 9);
      client.created_at = new Date().toISOString();
      clients.push(client);
    } else {
      const idx = clients.findIndex(c => c.id === client.id);
      if (idx !== -1) {
        client.created_at = clients[idx].created_at || new Date().toISOString();
        client.last_sent_at = client.last_sent_at || clients[idx].last_sent_at || null;
        client.updated_at = new Date().toISOString();
        clients[idx] = client;
      } else {
        clients.push(client);
      }
    }

    syncWrite(CLIENTS_FILE, clients);
    return client;
  }

  reassignClient(clientId, consultantId) {
    let clients = this.getClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) return false;

    client.consultant_id = consultantId;
    client.updated_at = new Date().toISOString();
    syncWrite(CLIENTS_FILE, clients);
    return client;
  }

  reassignClientAssistant(clientId, assistantId) {
    let clients = this.getClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) return false;

    client.assistant_id = assistantId;
    client.updated_at = new Date().toISOString();
    syncWrite(CLIENTS_FILE, clients);
    return client;
  }

  markClientSent(clientId) {
    let clients = this.getClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) return false;

    client.last_sent_at = new Date().toISOString();
    client.updated_at = new Date().toISOString();
    syncWrite(CLIENTS_FILE, clients);
    return client;
  }

  deleteClient(clientId) {
    let clients = this.getClients();
    clients = clients.filter(c => c.id !== clientId);
    syncWrite(CLIENTS_FILE, clients);

    let listings = this.getListings();
    listings = listings.filter(l => l.client_id !== clientId);
    syncWrite(LISTINGS_FILE, listings);
    return true;
  }

  // ── LISTINGS ───────────────────────────────────────────────────────────────
  getListings(clientId = null, status = null) {
    ensureDataFiles();
    try {
      const data = fs.readFileSync(LISTINGS_FILE, 'utf-8');
      let listings = JSON.parse(data || '[]');

      if (clientId) {
        listings = listings.filter(l => l.client_id === clientId);
      }
      if (status && status !== 'all') {
        listings = listings.filter(l => l.status === status);
      }
      return listings;
    } catch (e) {
      console.error('Erro ao ler listings.json:', e);
      return [];
    }
  }

  saveListings(newListings, clientId, isAutomatedBot = false) {
    ensureDataFiles();
    const data = fs.readFileSync(LISTINGS_FILE, 'utf-8');
    let existing = JSON.parse(data || '[]');

    let addedCount = 0;
    let updatedCount = 0;

    // Se é uma pesquisa do Bot e foram encontrados imóveis novos, limpar anúncios antigos não-salvos/não-enviados deste cliente
    if (isAutomatedBot && Array.isArray(newListings) && newListings.length > 0) {
      existing = existing.filter(l => l.client_id !== clientId || l.status === 'enviado' || l.status === 'favorito');
    }

    newListings.forEach(item => {
      item.client_id = clientId;
      if (!item.scraped_at) item.scraped_at = new Date().toISOString();

      const itemSource = item.source || 'idealista';
      const itemSources = Array.isArray(item.sources) ? item.sources : [itemSource];
      const itemPortalLinks = item.portal_links || (item.link ? { [itemSource]: item.link } : {});

      const normTitle = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
      const price = item.price_num || 0;

      const existingIdx = existing.findIndex(l =>
        l.client_id === clientId && (
          l.id === item.id ||
          l.link === item.link ||
          (normTitle.length > 8 && price > 10000 && (l.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30) === normTitle && Math.abs((l.price_num || 0) - price) < 5000)
        )
      );

      if (existingIdx !== -1) {
        const current = existing[existingIdx];
        const currentSources = Array.isArray(current.sources) ? current.sources : [current.source || 'idealista'];
        const mergedSources = Array.from(new Set([...currentSources, ...itemSources].filter(Boolean)));
        const mergedLinks = { ...(current.portal_links || (current.link ? { [current.source || 'idealista']: current.link } : {})), ...itemPortalLinks };
        const combinedPhotos = Array.from(new Set([...(item.photos || []), ...(current.photos || []), item.photo, current.photo].filter(Boolean)));

        existing[existingIdx] = {
          ...current,
          ...item,
          sources: mergedSources,
          portal_links: mergedLinks,
          photos: combinedPhotos.length > 0 ? combinedPhotos : (item.photo ? [item.photo] : []),
          photo: combinedPhotos[0] || current.photo || item.photo || '',
          description: item.description || current.description || '',
          status: current.status || 'novo',
          updated_at: new Date().toISOString()
        };
        updatedCount++;
      } else {
        item.status = item.status || 'novo';
        item.sources = itemSources;
        item.portal_links = itemPortalLinks;
        item.created_at = new Date().toISOString();
        if (!item.photos || item.photos.length === 0) {
          item.photos = item.photo ? [item.photo] : [];
        }
        existing.push(item);
        addedCount++;
      }
    });

    syncWrite(LISTINGS_FILE, existing);
    return { addedCount, updatedCount };
  }

  updateListing(listingId, clientId, updates) {
    ensureDataFiles();
    const data = fs.readFileSync(LISTINGS_FILE, 'utf-8');
    let listings = JSON.parse(data || '[]');

    let updated = false;
    listings.forEach(l => {
      if (l.id === listingId && l.client_id === clientId) {
        Object.assign(l, updates, { updated_at: new Date().toISOString() });
        updated = true;
      }
    });

    if (updated) {
      syncWrite(LISTINGS_FILE, listings);
    }
    return updated;
  }

  updateListingStatus(listingId, clientId, status) {
    const res = this.updateListing(listingId, clientId, { status });
    if (status === 'enviado') {
      this.markClientSent(clientId);
    }
    return res;
  }

  deleteListing(listingId, clientId) {
    ensureDataFiles();
    const data = fs.readFileSync(LISTINGS_FILE, 'utf-8');
    let listings = JSON.parse(data || '[]');
    const initialLen = listings.length;
    listings = listings.filter(l => !(l.id === listingId && l.client_id === clientId));
    if (listings.length !== initialLen) {
      syncWrite(LISTINGS_FILE, listings);
      return true;
    }
    return false;
  }

  clearClientListings(clientId) {
    ensureDataFiles();
    const data = fs.readFileSync(LISTINGS_FILE, 'utf-8');
    let listings = JSON.parse(data || '[]');
    const initialLen = listings.length;
    listings = listings.filter(l => l.client_id !== clientId);
    const deletedCount = initialLen - listings.length;
    syncWrite(LISTINGS_FILE, listings);
    return { success: true, deletedCount };
  }

  deduplicateListings(clientId = null) {
    ensureDataFiles();
    const data = fs.readFileSync(LISTINGS_FILE, 'utf-8');
    let listings = JSON.parse(data || '[]');
    const seen = new Set();
    const unique = [];
    let removed = 0;

    listings.forEach(l => {
      // Chave semântica: client + título normalizado + preço + foto
      const normTitle = (l.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
      const price = l.price_num || 0;
      const key = `${l.client_id}_${normTitle}_${price}`;
      const idKey = `${l.client_id}_${l.id}`;

      if (seen.has(key) || seen.has(idKey)) {
        removed++;
      } else {
        seen.add(key);
        seen.add(idKey);
        unique.push(l);
      }
    });

    if (removed > 0) {
      syncWrite(LISTINGS_FILE, unique);
      console.log(`🧹 Deduplicação: ${removed} anúncios repetidos removidos.`);
    }
    return unique;
  }

  setScrapeStatus(clientId, status) {
    activeScrapes[clientId] = status;
  }

  getScrapeStatus(clientId) {
    return activeScrapes[clientId] || null;
  }

  // ── VISITS (MARCADOR DE VISITAS / GOOGLE CALENDAR) ────────────────────────
  getVisits(clientId = null, consultantId = null) {
    ensureDataFiles();
    try {
      const data = fs.readFileSync(VISITS_FILE, 'utf-8');
      let visits = JSON.parse(data || '[]');
      if (clientId) {
        visits = visits.filter(v => v.client_id === clientId);
      }
      if (consultantId) {
        visits = visits.filter(v => v.consultant_id === consultantId);
      }
      // Ordenar por data/hora crescente
      visits.sort((a, b) => new Date(a.start_time || a.date) - new Date(b.start_time || b.date));
      return visits;
    } catch (e) {
      console.error('Erro ao ler visits.json:', e);
      return [];
    }
  }

  saveVisit(visitData) {
    ensureDataFiles();
    const visits = this.getVisits();
    let visit = { ...visitData };

    if (!visit.id) {
      visit.id = 'visit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      visit.created_at = new Date().toISOString();
      visit.status = visit.status || 'agendada';
      visits.push(visit);
    } else {
      const idx = visits.findIndex(v => v.id === visit.id);
      if (idx !== -1) {
        visit.updated_at = new Date().toISOString();
        visits[idx] = { ...visits[idx], ...visit };
      } else {
        visit.created_at = new Date().toISOString();
        visit.status = visit.status || 'agendada';
        visits.push(visit);
      }
    }

    syncWrite(VISITS_FILE, visits);
    return visit;
  }

  deleteVisit(visitId) {
    ensureDataFiles();
    let visits = this.getVisits();
    const initialLen = visits.length;
    visits = visits.filter(v => v.id !== visitId);
    if (visits.length !== initialLen) {
      syncWrite(VISITS_FILE, visits);
      return true;
    }
    return false;
  }

  updateVisitStatus(visitId, status) {
    ensureDataFiles();
    const visits = this.getVisits();
    const visit = visits.find(v => v.id === visitId);
    if (visit) {
      visit.status = status;
      visit.updated_at = new Date().toISOString();
      syncWrite(VISITS_FILE, visits);
      return visit;
    }
    return null;
  }

  // ── BATCH SYNC & FULL BACKUP / RESTORE ────────────────────────────────────
  saveAllClients(newClients) {
    ensureDataFiles();
    if (Array.isArray(newClients)) {
      syncWrite(CLIENTS_FILE, newClients);
      return newClients;
    }
    return this.getClients();
  }

  saveAllConsultants(newConsultants) {
    ensureDataFiles();
    if (Array.isArray(newConsultants)) {
      syncWrite(CONSULTANTS_FILE, newConsultants);
      return newConsultants;
    }
    return this.getConsultants();
  }

  saveAllListings(newListings) {
    ensureDataFiles();
    if (Array.isArray(newListings)) {
      syncWrite(LISTINGS_FILE, newListings);
      return newListings;
    }
    return this.getListings();
  }

  saveAllVisits(newVisits) {
    ensureDataFiles();
    if (Array.isArray(newVisits)) {
      syncWrite(VISITS_FILE, newVisits);
      return newVisits;
    }
    return this.getVisits();
  }

  getFullBackup() {
    return {
      version: '2.0',
      exported_at: new Date().toISOString(),
      consultants: this.getConsultants(),
      assistants: this.getAssistants(),
      clients: this.getClients(),
      listings: this.getListings(),
      visits: this.getVisits()
    };
  }

  restoreFullBackup(data) {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data.consultants) && data.consultants.length > 0) {
      this.saveAllConsultants(data.consultants);
    }
    if (Array.isArray(data.assistants) && data.assistants.length > 0) {
      this.saveAllAssistants(data.assistants);
    }
    if (Array.isArray(data.clients)) {
      this.saveAllClients(data.clients);
    }
    if (Array.isArray(data.listings)) {
      this.saveAllListings(data.listings);
    }
    if (Array.isArray(data.visits)) {
      this.saveAllVisits(data.visits);
    }
    return true;
  }

  syncBatchData(batch) {
    if (!batch || typeof batch !== 'object') return { success: false };
    
    // Merge clients
    if (Array.isArray(batch.clients) && batch.clients.length > 0) {
      const existingClients = this.getClients();
      const clientMap = new Map(existingClients.map(c => [c.id, c]));
      batch.clients.forEach(c => {
        if (c && c.id) {
          clientMap.set(c.id, { ...(clientMap.get(c.id) || {}), ...c });
        }
      });
      syncWrite(CLIENTS_FILE, Array.from(clientMap.values()));
    }

    // Merge consultants
    if (Array.isArray(batch.consultants) && batch.consultants.length > 0) {
      const existingConsultants = this.getConsultants();
      const consMap = new Map(existingConsultants.map(c => [c.id, c]));
      batch.consultants.forEach(c => {
        if (c && c.id) {
          consMap.set(c.id, { ...(consMap.get(c.id) || {}), ...c });
        }
      });
      syncWrite(CONSULTANTS_FILE, Array.from(consMap.values()));
    }

    // Merge assistants
    if (Array.isArray(batch.assistants) && batch.assistants.length > 0) {
      const existingAssistants = this.getAssistants();
      const astMap = new Map(existingAssistants.map(a => [a.id, a]));
      batch.assistants.forEach(a => {
        if (a && a.id) {
          astMap.set(a.id, { ...(astMap.get(a.id) || {}), ...a });
        }
      });
      syncWrite(ASSISTANTS_FILE, Array.from(astMap.values()));
    }

    // Merge listings
    if (Array.isArray(batch.listings) && batch.listings.length > 0) {
      const existingListings = this.getListings();
      const listMap = new Map(existingListings.map(l => [`${l.client_id}_${l.id}`, l]));
      batch.listings.forEach(l => {
        if (l && l.id && l.client_id) {
          const key = `${l.client_id}_${l.id}`;
          listMap.set(key, { ...(listMap.get(key) || {}), ...l });
        }
      });
      syncWrite(LISTINGS_FILE, Array.from(listMap.values()));
    }

    // Merge visits
    if (Array.isArray(batch.visits) && batch.visits.length > 0) {
      const existingVisits = this.getVisits();
      const visitMap = new Map(existingVisits.map(v => [v.id, v]));
      batch.visits.forEach(v => {
        if (v && v.id) {
          visitMap.set(v.id, { ...(visitMap.get(v.id) || {}), ...v });
        }
      });
      syncWrite(VISITS_FILE, Array.from(visitMap.values()));
    }

    return {
      success: true,
      clients_count: this.getClients().length,
      listings_count: this.getListings().length
    };
  }
}

module.exports = new ClientManager();
