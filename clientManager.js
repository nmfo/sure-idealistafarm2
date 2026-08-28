const fs = require('fs');
const path = require('path');
const os = require('os');

const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_VERCEL ? path.join(os.tmpdir(), 'sure_data') : path.join(__dirname, 'data');
const SEED_DATA_DIR = path.join(__dirname, 'data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');
const CONSULTANTS_FILE = path.join(DATA_DIR, 'consultants.json');

const PRIORITY_LIMITS = {
  'SU': 2, // Super Urgente: 2 dias
  'U':  5, // Urgente: 5 dias
  'S':  10 // Standard: 10 dias
};

const activeScrapes = {};

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Copiar ficheiros seed para a pasta de dados se não existirem
  ['clients.json', 'consultants.json', 'listings.json'].forEach(fileName => {
    const targetFile = path.join(DATA_DIR, fileName);
    const seedFile = path.join(SEED_DATA_DIR, fileName);
    if (!fs.existsSync(targetFile) && fs.existsSync(seedFile)) {
      try {
        fs.copyFileSync(seedFile, targetFile);
      } catch (e) {
        console.warn(`Aviso ao copiar ${fileName}:`, e.message);
      }
    }
  });

  if (!fs.existsSync(CONSULTANTS_FILE)) {
    const defaultConsultants = [
      { id: "consultant-geral", name: "Geral / Equipa SURE", color: "#C75233" },
      { id: "consultant-ana", name: "Ana Silva", color: "#5B7FA6" },
      { id: "consultant-tiago", name: "Tiago Ferreira", color: "#5B8C6A" }
    ];
    fs.writeFileSync(CONSULTANTS_FILE, JSON.stringify(defaultConsultants, null, 2), 'utf-8');
  }

  if (!fs.existsSync(CLIENTS_FILE)) {
    const defaultClients = [
      {
        id: "client-exemplo-1",
        name: "Carlos & Ana Silva",
        operation: "comprar",
        property_type: "casas",
        location: "lisboa",
        max_price: 350000,
        min_price: 180000,
        typology: ["t2", "t3"],
        notes: "Procura T2 ou T3 em Lisboa com elevador.",
        consultant_id: "consultant-ana",
        priority: "SU", // 2 dias
        last_sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Atrasado (3 dias atrás)
        created_at: new Date().toISOString()
      },
      {
        id: "client-exemplo-2",
        name: "Miguel Oliveira",
        operation: "comprar",
        property_type: "casas",
        location: "braga",
        max_price: 250000,
        min_price: 120000,
        typology: ["t2"],
        notes: "Perto do centro de Braga com garagem.",
        consultant_id: "consultant-tiago",
        priority: "U", // 5 dias
        last_sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Em dia (1 dia atrás)
        created_at: new Date().toISOString()
      }
    ];
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(defaultClients, null, 2), 'utf-8');
  }

  if (!fs.existsSync(LISTINGS_FILE)) {
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify([], null, 2), 'utf-8');
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

    fs.writeFileSync(CONSULTANTS_FILE, JSON.stringify(consultants, null, 2), 'utf-8');
    return consultant;
  }

  deleteConsultant(consultantId) {
    let consultants = this.getConsultants();
    consultants = consultants.filter(c => c.id !== consultantId);
    fs.writeFileSync(CONSULTANTS_FILE, JSON.stringify(consultants, null, 2), 'utf-8');

    // Reassign clients of this consultant to "consultant-geral"
    let clients = this.getClients();
    clients.forEach(c => {
      if (c.consultant_id === consultantId) {
        c.consultant_id = 'consultant-geral';
      }
    });
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');
    return true;
  }

  // ── CLIENTS ────────────────────────────────────────────────────────────────
  getClients() {
    ensureDataFiles();
    try {
      const data = fs.readFileSync(CLIENTS_FILE, 'utf-8');
      let clients = JSON.parse(data || '[]');
      const now = Date.now();

      // Compute overdue metadata for each client
      clients.forEach(c => {
        if (!c.priority) c.priority = 'U';
        if (!c.consultant_id) c.consultant_id = 'consultant-geral';

        const maxDays = PRIORITY_LIMITS[c.priority] || 5;
        const refDate = c.last_sent_at ? new Date(c.last_sent_at).getTime() : (c.created_at ? new Date(c.created_at).getTime() : now);
        const daysPassed = (now - refDate) / (1000 * 60 * 60 * 24);

        c.days_since_sent = Math.floor(daysPassed);
        c.max_days = maxDays;
        c.is_overdue = daysPassed > maxDays;
        c.days_overdue = c.is_overdue ? Math.floor(daysPassed - maxDays) : 0;
      });

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

    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');
    return client;
  }

  reassignClient(clientId, consultantId) {
    let clients = this.getClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) return false;

    client.consultant_id = consultantId;
    client.updated_at = new Date().toISOString();
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');
    return client;
  }

  markClientSent(clientId) {
    let clients = this.getClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) return false;

    client.last_sent_at = new Date().toISOString();
    client.updated_at = new Date().toISOString();
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');
    return client;
  }

  deleteClient(clientId) {
    let clients = this.getClients();
    clients = clients.filter(c => c.id !== clientId);
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');

    let listings = this.getListings();
    listings = listings.filter(l => l.client_id !== clientId);
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2), 'utf-8');
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

      const existingIdx = existing.findIndex(l => l.client_id === clientId && l.id === item.id);
      if (existingIdx !== -1) {
        const currentStatus = existing[existingIdx].status || 'novo';
        const existingPhotos = existing[existingIdx].photos || [];
        const combinedPhotos = Array.from(new Set([...(item.photos || []), ...existingPhotos, item.photo].filter(Boolean)));

        existing[existingIdx] = {
          ...existing[existingIdx],
          ...item,
          status: currentStatus,
          photos: combinedPhotos.length > 0 ? combinedPhotos : (item.photo ? [item.photo] : []),
          description: item.description || existing[existingIdx].description || '',
          updated_at: new Date().toISOString()
        };
        updatedCount++;
      } else {
        item.status = item.status || 'novo';
        item.created_at = new Date().toISOString();
        if (!item.photos || item.photos.length === 0) {
          item.photos = item.photo ? [item.photo] : [];
        }
        existing.push(item);
        addedCount++;
      }
    });

    fs.writeFileSync(LISTINGS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
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
      fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2), 'utf-8');
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
      fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2), 'utf-8');
      return true;
    }
    return false;
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
      fs.writeFileSync(LISTINGS_FILE, JSON.stringify(unique, null, 2), 'utf-8');
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
}

module.exports = new ClientManager();
