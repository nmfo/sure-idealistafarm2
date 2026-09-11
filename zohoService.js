const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');
const os = require('os');

const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_VERCEL ? path.join(os.tmpdir(), 'sure_data') : path.join(__dirname, 'data');
const ZOHO_CONFIG_FILE = path.join(DATA_DIR, 'zoho_config.json');
const SEED_CONFIG_FILE = path.join(__dirname, 'data', 'zoho_config.json');

// ── Stages to EXCLUDE (Arquivados, Propostas em diante, Fechados/Perdidos e Fases de Angariação/Vendedor) ──
const EXCLUDED_STAGES = new Set([
  'Arquivo',
  'Arquivado',
  'Arquivo Morto',
  'Perda fechada',
  'Perda fechada para a concorrência',
  'Fechado Ganho',
  'Fechado Perdido',
  'Closed Won',
  'Closed Lost',
  'Proposta',
  'Em Proposta',
  'Proposta Apresentada',
  'Proposta Aceite',
  'Proposta em Negociação',
  'CPCV',
  'Escritura',
  'Pós-Venda',
  'Vendido',
  // Fases exclusivas de Vendedores / Angariações de Venda:
  'CMI',
  'Apresentação do Serviço',
  'Estudo de Mercado',
  'Reportagem Fotográfica',
  'Promoção',
  'Visitas de Angariação',
  'Qualificação de Angariação'
]);

function isBuyerDeal(deal) {
  if (!deal) return false;

  const stage = String(deal.Stage || '').trim();
  if (EXCLUDED_STAGES.has(stage)) return false;

  const rawTypes = deal.Tipo_de_Cliente1 || deal.Tipo_de_Cliente || [];
  const typesArr = Array.isArray(rawTypes) ? rawTypes : String(rawTypes).split(/[,;]/).map(s => s.trim());
  const typesStr = typesArr.join(' ').toLowerCase();

  const dealName = String(
    deal.Nome_do_Cliente_Potencial || 
    deal.Deal_Name || 
    (deal.Contact_Name && deal.Contact_Name.name) || 
    ''
  ).trim();

  // Explicit Seller / Landlord types without Buyer / Investor components
  const hasBuyerKeyword = typesStr.includes('comprador') || typesStr.includes('investidor') || typesStr.includes('reb') || typesStr.includes('rei');
  const hasSellerKeyword = typesStr.includes('vendedor') || typesStr.includes('senhorio') || typesStr.includes('rel') || typesStr.includes('rer') || typesStr.includes('res');

  if (hasSellerKeyword && !hasBuyerKeyword) {
    return false;
  }

  // Listing Name pattern (e.g. 'Loja 1 | ...', 'Loja 2 | ...', 'Moradia | ...', 'Cedência Apt. | ...', '[ANG] ...')
  const isListingPattern = /^(loja|moradia|apartamento|prédio|predio|terreno|cedência|cedencia|restaurante|escritório|escritorio|garagem|fração|fracao|estúdios|estudios|lote|quinta|armazém|armazem|\[ang\]|ang\s*-)\b/i.test(dealName);
  
  if (isListingPattern && !hasBuyerKeyword) {
    return false;
  }

  if (dealName.includes('|') && (dealName.toLowerCase().includes('rua') || dealName.toLowerCase().includes('braga') || dealName.toLowerCase().includes('falperra') || dealName.toLowerCase().includes('loja') || dealName.toLowerCase().includes('moradia')) && !hasBuyerKeyword) {
    return false;
  }

  return true;
}

class ZohoService {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    let cfg = {};
    if (fs.existsSync(ZOHO_CONFIG_FILE)) {
      try {
        cfg = JSON.parse(fs.readFileSync(ZOHO_CONFIG_FILE, 'utf-8'));
      } catch (e) {
        console.error('Erro ao ler zoho_config.json de DATA_DIR:', e.message);
      }
    } else if (fs.existsSync(SEED_CONFIG_FILE)) {
      try {
        cfg = JSON.parse(fs.readFileSync(SEED_CONFIG_FILE, 'utf-8'));
      } catch (e) {
        console.error('Erro ao ler zoho_config.json seed:', e.message);
      }
    }

    return {
      client_id: process.env.ZOHO_CLIENT_ID || cfg.client_id || '',
      client_secret: process.env.ZOHO_CLIENT_SECRET || cfg.client_secret || '',
      refresh_token: process.env.ZOHO_REFRESH_TOKEN || cfg.refresh_token || '',
      access_token: cfg.access_token || '',
      expires_at: cfg.expires_at || 0,
      api_domain: process.env.ZOHO_API_DOMAIN || cfg.api_domain || 'https://www.zohoapis.eu',
      accounts_url: process.env.ZOHO_ACCOUNTS_URL || cfg.accounts_url || 'https://accounts.zoho.eu'
    };
  }

  saveConfig(updated) {
    this.config = { ...this.config, ...updated };
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ZOHO_CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
      if (SEED_CONFIG_FILE !== ZOHO_CONFIG_FILE && fs.existsSync(path.dirname(SEED_CONFIG_FILE))) {
        fs.writeFileSync(SEED_CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('Aviso ao guardar zoho_config:', e.message);
    }
  }

  isConfigured() {
    return !!(this.config.client_id && this.config.client_secret && this.config.refresh_token);
  }

  async getAccessToken() {
    if (!this.isConfigured()) {
      throw new Error('Zoho CRM não está configurado com Client ID, Client Secret e Refresh Token.');
    }

    const now = Date.now();
    if (this.config.access_token && this.config.expires_at && this.config.expires_at > (now + 180000)) {
      return this.config.access_token;
    }

    console.log('🔄 A renovar Access Token do Zoho CRM...');
    return new Promise((resolve, reject) => {
      const postData = querystring.stringify({
        grant_type: 'refresh_token',
        client_id: this.config.client_id,
        client_secret: this.config.client_secret,
        refresh_token: this.config.refresh_token
      });

      const accountsHost = new URL(this.config.accounts_url).hostname;

      const req = https.request({
        hostname: accountsHost,
        port: 443,
        path: '/oauth/v2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.access_token) {
              const expiresAt = Date.now() + ((data.expires_in || 3600) - 300) * 1000;
              this.saveConfig({
                access_token: data.access_token,
                expires_at: expiresAt,
                api_domain: data.api_domain || this.config.api_domain
              });
              console.log('✅ Access Token do Zoho renovado com sucesso!');
              resolve(data.access_token);
            } else {
              console.error('❌ Erro na resposta do Zoho OAuth:', body);
              reject(new Error(data.error || 'Falha ao renovar token Zoho'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async apiRequest(apiPath, method = 'GET', data = null, retryOn401 = true) {
    const token = await this.getAccessToken();
    const apiUrl = new URL(this.config.api_domain + apiPath);
    const postBody = data ? JSON.stringify(data) : null;

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: apiUrl.hostname,
        path: apiUrl.pathname + apiUrl.search,
        method: method,
        headers: {
          'Authorization': 'Zoho-oauthtoken ' + token,
          'Content-Type': 'application/json',
          ...(postBody ? { 'Content-Length': Buffer.byteLength(postBody) } : {})
        }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', async () => {
          if (res.statusCode === 401 && retryOn401) {
            console.log('⚠️ Token Zoho 401, a forçar renovação...');
            this.config.expires_at = 0;
            try {
              const retryRes = await this.apiRequest(apiPath, method, data, false);
              return resolve(retryRes);
            } catch (err) {
              return reject(err);
            }
          }

          try {
            const parsed = JSON.parse(body);
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      });

      req.on('error', reject);
      if (postBody) req.write(postBody);
      req.end();
    });
  }

  getConsultantId(rawName, existingConsultants = []) {
    const n = String(rawName || '').toLowerCase().trim();
    if (!n) return 'consultant-geral';

    if (n.includes('rui')) return 'consultant-rui';
    if (n.includes('nuno')) return 'consultant-nuno';
    if (n.includes('diogo')) return 'consultant-diogo';
    if (n.includes('gardiana')) return 'consultant-gardiana';
    if (n.includes('elizabete') || n.includes('elisabete')) return 'consultant-elizabete';

    for (const c of existingConsultants) {
      const cName = String(c.name || '').toLowerCase();
      const firstName = cName.split(' ')[0];
      if (firstName && firstName.length > 2 && n.includes(firstName)) {
        return c.id;
      }
    }

    return 'consultant-geral';
  }

  getAssistantIdForConsultant(consultantId) {
    if (consultantId === 'consultant-rui') return 'assistant-joao'; // João Santos gere os do Rui
    if (consultantId === 'consultant-nuno') return 'assistant-pedro'; // Pedro Barros gere os do Nuno
    if (['consultant-diogo', 'consultant-gardiana', 'consultant-elizabete'].includes(consultantId)) {
      return 'assistant-nuno'; // Nuno Oliveira gere os de Diogo, Gardiana e Elisabete
    }
    return 'assistant-geral';
  }

  mapDealToClient(deal, existingClient = null, consultants = []) {
    const name = String(
      deal.Nome_do_Cliente_Potencial || 
      deal.Deal_Name || 
      (deal.Contact_Name && deal.Contact_Name.name) || 
      (deal.Account_Name && deal.Account_Name.name) || 
      'Cliente Zoho'
    ).trim();

    const rawConsultor = String(deal.Pr_xima_A_o || (deal.Owner && deal.Owner.name) || '').trim();
    const consultantId = this.getConsultantId(rawConsultor, consultants);
    const assistantId = (existingClient && existingClient.assistant_id) ? existingClient.assistant_id : this.getAssistantIdForConsultant(consultantId);

    // Free text buffer para NLP inteligente caso campos estruturados estejam vazios
    const fullTextBuffer = [
      deal.Informa_es_Extra,
      deal.Motiva_o_Dor_Desejo,
      deal.Description,
      Array.isArray(deal.Requisitos) ? deal.Requisitos.join(' ') : deal.Requisitos,
      Array.isArray(deal.Prefer_ncias) ? deal.Prefer_ncias.join(' ') : deal.Prefer_ncias
    ].filter(Boolean).join(' ');
    const fullTextLow = fullTextBuffer.toLowerCase();

    // 1. Location / Freguesias
    let location = String(deal.Zona_Freguesias || deal.Distrito || deal.Cidade || '').trim();
    if (!location && fullTextLow) {
      // Deteção inteligente de cidades e distritos frequentes
      const knownLocations = [
        'Guimarães', 'Braga', 'Porto', 'Vila Nova de Gaia', 'Gaia', 'Matosinhos', 'Maia',
        'Vila Nova de Famalicão', 'Famalicão', 'Barcelos', 'Vila do Conde', 'Póvoa de Varzim',
        'Viana do Castelo', 'Coimbra', 'Aveiro', 'Lisboa', 'Cascais', 'Oeiras', 'Sintra',
        'Santo Tirso', 'Trofa', 'Esposende', 'Ponte de Lima', 'Vizela', 'Fafe', 'Amarante',
        'Penafiel', 'Felgueiras', 'Leiria', 'Viseu', 'Faro', 'Portimão', 'Setúbal'
      ];
      const matchedLocs = [];
      for (const loc of knownLocations) {
        const regex = new RegExp(`\\b${loc.toLowerCase()}\\b`, 'i');
        if (regex.test(fullTextLow)) {
          matchedLocs.push(loc);
        }
      }
      if (matchedLocs.length > 0) {
        location = matchedLocs.slice(0, 2).join(', ');
      }
    }
    if (!location) location = 'Braga';

    // 2. Operation
    const rawTypeClient = Array.isArray(deal.Tipo_de_Cliente1) 
      ? deal.Tipo_de_Cliente1.join(' ') 
      : String(deal.Tipo_de_Cliente1 || deal.Tipo_de_Cliente || '');
    const operation = (rawTypeClient.toLowerCase().includes('arrend') || fullTextLow.includes('para arrendar')) ? 'arrendar' : 'comprar';

    // 3. Property Type
    const rawProp = Array.isArray(deal.Tipo_de_Im_vel) 
      ? deal.Tipo_de_Im_vel.join(' ') 
      : String(deal.Tipo_de_Im_vel || '');
    const rawPropLow = (rawProp + ' ' + fullTextLow).toLowerCase();

    let propType = 'apartamentos';
    if (rawPropLow.includes('moradia terrea') || rawPropLow.includes('moradia térrea')) propType = 'moradia-terrea';
    else if (rawPropLow.includes('moradia') || rawPropLow.includes('vivenda') || rawPropLow.includes('casa')) propType = 'moradias';
    else if (rawPropLow.includes('terreno') || rawPropLow.includes('lote')) propType = 'terrenos';
    else if (rawPropLow.includes('prédio') || rawPropLow.includes('predio')) propType = 'predios';
    else if (rawPropLow.includes('loja') || rawPropLow.includes('comerc')) propType = 'lojas';
    else if (rawPropLow.includes('escritor')) propType = 'escritorios';
    else if (rawPropLow.includes('garagem')) propType = 'garagens';
    else if (rawPropLow.includes('trespasse')) propType = 'trespasse';
    else if (rawPropLow.includes('nova') || rawPropLow.includes('constru')) propType = 'empreendimentos';

    // 4. Max Price
    let maxPrice = Number(deal.Or_amento_M_ximo || deal.Amount) || null;
    if (!maxPrice && fullTextLow) {
      const priceMatch = fullTextLow.match(/(?:budget|orçamento|orcam|preço|valor|ate|até)\s*(?:de\s*)?([0-9]+(?:\.[0-9]{3})*|[0-9]+)\s*(k|mil|€|eur|euros)?/i);
      if (priceMatch) {
        let val = parseInt(priceMatch[1].replace(/\./g, ''), 10);
        if (priceMatch[2] && (priceMatch[2].toLowerCase() === 'k' || priceMatch[2].toLowerCase() === 'mil') && val < 1000) {
          val *= 1000;
        } else if (val < 1000) {
          val *= 1000;
        }
        if (val >= 20000 && val <= 5000000) maxPrice = val;
      }
    }

    // 5. Typology
    const rawTypo = Array.isArray(deal.Tipologia) 
      ? deal.Tipologia.join(' ') 
      : String(deal.Tipologia || '').toLowerCase();
    const typos = [];
    ['t0','t1','t2','t3','t4','t5'].forEach(t => { 
      if (rawTypo.includes(t)) typos.push(t); 
    });
    // Se tipologia não estava preenchida no campo do CRM, procurar no texto (ex: "procura t1", "t2 ou t3")
    if (typos.length === 0 && fullTextLow) {
      ['t0','t1','t2','t3','t4','t5'].forEach(t => {
        const typoRegex = new RegExp(`\\b${t}\\b`, 'i');
        if (typoRegex.test(fullTextLow)) typos.push(t);
      });
    }
    if (!typos.length) typos.push('t2', 't3');

    // 6. Priority
    const rawFollowup = String(deal.Tipo_de_Acompanhamento || deal.Stage || '').toUpperCase();
    let priority = 'U';
    if (rawFollowup.includes('SU ') || rawFollowup.startsWith('SU')) priority = 'SU';
    else if (rawFollowup.startsWith('S (') || rawFollowup === 'S' || rawFollowup.includes('SIMPLES')) priority = 'S';
    else if (rawFollowup.startsWith('U (') || rawFollowup === 'U' || rawFollowup.includes('URGENTE')) priority = 'U';
    else if (['ARQUIVO', 'PERDIDO', 'CLOSED LOST'].some(s => rawFollowup.includes(s))) priority = 'S';
    else if (['PROPOSTA', 'NEGOCIAÇÃO', 'VISITA'].some(s => rawFollowup.includes(s))) priority = 'SU';

    // 7. Amenities
    const amenities = [];
    const allReqs = [
      Array.isArray(deal.Requisitos) ? deal.Requisitos.join(' ') : (deal.Requisitos || ''),
      Array.isArray(deal.Prefer_ncias) ? deal.Prefer_ncias.join(' ') : (deal.Prefer_ncias || ''),
      deal.Varanda_s,
      deal.Terra_o,
      deal.Informa_es_Extra,
      deal.Motiva_o_Dor_Desejo
    ].filter(Boolean).join(' ').toLowerCase();

    if (allReqs.includes('garagem') || allReqs.includes('box')) amenities.push('garagem');
    if (allReqs.includes('lugar de garagem') || allReqs.includes('lugar garagem') || allReqs.includes('estacionamento')) amenities.push('lugar-garagem');
    if (allReqs.includes('piscina')) amenities.push('piscina');
    if (allReqs.includes('elevador')) amenities.push('elevador');
    if (allReqs.includes('varanda') || allReqs.includes('terraço') || allReqs.includes('terraco') || allReqs.includes('balcão')) amenities.push('varanda');
    if (allReqs.includes('jardim') || allReqs.includes('quintal') || allReqs.includes('exterior')) amenities.push('jardim');
    if (allReqs.includes('ar condicionado') || allReqs.includes('climatiz')) amenities.push('ar-condicionado');

    const elevatorFloor = (allReqs.includes('acima do rc') || allReqs.includes('acima do r/c')) ? '1' : '0';

    // 8. Formatted Notes
    const phone = deal.Telem_vel ? '📞 ' + deal.Telem_vel : '';
    const email = deal.E_mail ? '✉ ' + deal.E_mail : '';
    const stageLabel = deal.Stage ? '📌 Zoho Stage: ' + deal.Stage : '';
    const timing = deal.Timing ? '⏱ ' + deal.Timing : '';
    const motivacao = deal.Motiva_o_Dor_Desejo ? '🎯 ' + deal.Motiva_o_Dor_Desejo : '';
    const reqText = (Array.isArray(deal.Requisitos) ? deal.Requisitos.join(', ') : deal.Requisitos) ? '📝 ' + (Array.isArray(deal.Requisitos) ? deal.Requisitos.join(', ') : deal.Requisitos) : '';
    const prefText = (Array.isArray(deal.Prefer_ncias) ? deal.Prefer_ncias.join(', ') : deal.Prefer_ncias) ? '⭐ ' + (Array.isArray(deal.Prefer_ncias) ? deal.Prefer_ncias.join(', ') : deal.Prefer_ncias) : '';
    const drive = deal.Ficha_de_Cliente ? '📁 ' + deal.Ficha_de_Cliente : '';
    const estadoCredito = deal.Estado_do_Cr_dito ? '🏦 ' + deal.Estado_do_Cr_dito : '';
    const infoExtra = deal.Informa_es_Extra ? '💬 ' + deal.Informa_es_Extra : '';

    const formattedNotes = [stageLabel, phone, email, timing, motivacao, reqText, prefText, estadoCredito, infoExtra, drive]
      .filter(Boolean)
      .join(' | ');

    const clientId = existingClient ? existingClient.id : 'client-zoho-' + deal.id;

    return {
      id: clientId,
      zoho_id: String(deal.id),
      zoho_stage: deal.Stage || '',
      zoho_synced_at: new Date().toISOString(),
      name: name,
      consultant_id: consultantId,
      assistant_id: assistantId,
      priority: priority,
      operation: operation,
      property_type: propType,
      location: location,
      min_price: null,
      max_price: maxPrice,
      typology: typos,
      amenities: amenities,
      elevator_floor: elevatorFloor,
      notes: formattedNotes,
      phone: deal.Telem_vel || (existingClient ? existingClient.phone : '') || '',
      email: deal.E_mail || (existingClient ? existingClient.email : '') || '',
      created_at: existingClient ? existingClient.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sent_at: existingClient ? (existingClient.last_sent_at || new Date().toISOString()) : new Date().toISOString()
    };
  }

  async fetchAllDeals() {
    let page = 1;
    let moreRecords = true;
    const allDeals = [];

    while (moreRecords && page <= 10) {
      const res = await this.apiRequest('/crm/v2/Deals?page=' + page + '&per_page=200');
      if (res.statusCode === 200 && res.data && Array.isArray(res.data.data)) {
        allDeals.push(...res.data.data);
        if (res.data.info && res.data.info.more_records) {
          page++;
        } else {
          moreRecords = false;
        }
      } else {
        moreRecords = false;
      }
    }

    return allDeals;
  }

  async syncDealsToClients(clientManager) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Zoho CRM não configurado.' };
    }

    console.log('🔄 A iniciar sincronização direta com Zoho CRM...');
    const deals = await this.fetchAllDeals();
    console.log('📊 Total de negócios obtidos do Zoho CRM:', deals.length);

    const existingClients = clientManager.getClients();
    const existingConsultants = clientManager.getConsultants();

    const clientMap = new Map();
    existingClients.forEach(c => {
      if (c.zoho_id) clientMap.set('zoho_' + c.zoho_id, c);
      clientMap.set('id_' + c.id, c);
      const cleanName = String(c.name || '').toLowerCase().trim();
      if (cleanName) clientMap.set('name_' + cleanName, c);
    });

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const mergedClients = [...existingClients];

    for (const deal of deals) {
      if (!isBuyerDeal(deal)) {
        skippedCount++;
        continue;
      }

      const dealName = String(
        deal.Nome_do_Cliente_Potencial || 
        deal.Deal_Name || 
        (deal.Contact_Name && deal.Contact_Name.name) || 
        ''
      ).trim();

      if (!dealName || dealName.length < 2) {
        skippedCount++;
        continue;
      }

      const cleanName = dealName.toLowerCase().trim();
      const existing = clientMap.get('zoho_' + deal.id) || clientMap.get('name_' + cleanName);

      const mappedClient = this.mapDealToClient(deal, existing, existingConsultants);

      if (existing) {
        const idx = mergedClients.findIndex(c => c.id === existing.id);
        if (idx !== -1) {
          mergedClients[idx] = { ...existing, ...mappedClient };
          updatedCount++;
        }
      } else {
        mergedClients.push(mappedClient);
        clientMap.set('zoho_' + deal.id, mappedClient);
        clientMap.set('name_' + cleanName, mappedClient);
        addedCount++;
      }
    }

    clientManager.saveAllClients(mergedClients);

    console.log('✅ Sincronização Zoho concluída: +' + addedCount + ' novos, ' + updatedCount + ' atualizados, ' + skippedCount + ' ignorados.');

    return {
      success: true,
      total_zoho_deals: deals.length,
      added_count: addedCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      total_clients: mergedClients.length,
      synced_at: new Date().toISOString()
    };
  }

  formatPopNote({
    authorName = 'Equipa SURE',
    action = 'Envio de Imóveis',
    client = null,
    consultantName = '',
    assistantName = '',
    listings = [],
    channel = 'Idealista Farm / WhatsApp',
    objective = '',
    facts = '',
    result = '',
    nextAction = '',
    nextResponsible = '',
    nextDueDate = '',
    technicalOrigin = 'Registo automático via Idealista Farm (POP 00.05.05.POP)',
    customBody = ''
  } = {}) {
    // 1. Title format: {Nome do Colaborador} — {Ação}
    const cleanAuthor = String(authorName || assistantName || consultantName || 'Equipa SURE').trim();
    const cleanAction = String(action || 'Envio de Imóveis').trim();
    const title = `${cleanAuthor} — ${cleanAction}`;

    if (customBody && customBody.trim()) {
      return { title, content: customBody.trim() };
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-PT') + ' ' + now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    // Due date (default 48h / 2 days for feedback)
    let dueStr = nextDueDate;
    if (!dueStr) {
      const due = new Date(now.getTime() + 48 * 3600 * 1000);
      dueStr = `48 horas (${due.toLocaleDateString('pt-PT')})`;
    }

    const clientName = client ? (client.name || 'Cliente') : 'Cliente';
    const finalConsultant = consultantName || (client && client.consultant_name) || 'Consultor Responsável';
    const finalAssistant = assistantName || (client && client.assistant_name) || cleanAuthor;

    // Build participants list
    const participantsArr = [];
    if (finalAssistant) participantsArr.push(`${finalAssistant} (Administrativo)`);
    if (finalConsultant && finalConsultant !== finalAssistant) participantsArr.push(`${finalConsultant} (Consultor)`);
    participantsArr.push(`${clientName} (Cliente)`);
    const participantsStr = participantsArr.join(', ');

    // Build listings list if applicable
    let listingsBlock = '';
    if (Array.isArray(listings) && listings.length > 0) {
      const items = listings.map((l, idx) => {
        const t = l.title || 'Imóvel Sugerido';
        const p = l.price || 'Preço sob consulta';
        const d = l.details || l.typology || '';
        const loc = l.location || '';
        const link = l.link || '';
        return `${idx + 1}. ${t} — ${p}${d ? ` (${d})` : ''}${loc ? ` | ${loc}` : ''}${link ? `\n   🔗 ${link}` : ''}`;
      }).join('\n\n');
      listingsBlock = `\n\nFactos Confirmados / Imóveis Enviados (${listings.length}):\n${items}`;
    } else if (facts) {
      listingsBlock = `\n\nFactos Confirmados:\n${facts}`;
    }

    const defaultObjective = listings.length > 0 
      ? 'Envio de opções de imóveis selecionadas no Idealista' 
      : 'Acompanhamento do processo de compra e critérios de pesquisa';

    const defaultNextAction = listings.length > 0
      ? 'Verificar imóveis enviados e recolher feedback detalhado junto do cliente'
      : 'Próximo contacto de acompanhamento e refinamento de critérios';

    const content = [
      `Data e Hora: ${dateStr}`,
      `Canal: ${channel}`,
      `Participantes: ${participantsStr}`,
      `Objetivo da Interação: ${objective || defaultObjective}`,
      listingsBlock ? listingsBlock.trim() : null,
      result ? `Resultado: ${result}` : null,
      `Próxima Ação, Responsável e Prazo:`,
      `• Próxima Ação: ${nextAction || defaultNextAction}`,
      `• Responsável: ${nextResponsible || finalConsultant}`,
      `• Prazo: ${dueStr}`,
      ``,
      `Log Técnico: ${technicalOrigin}`
    ].filter(Boolean).join('\n');

    return { title, content };
  }

  async addDealNote(dealId, title, content) {
    if (!this.isConfigured() || !dealId) {
      return { success: false, error: 'Zoho CRM não configurado ou Deal ID em falta.' };
    }

    try {
      const payload = {
        data: [
          {
            Note_Title: title || 'Registo de Atividade',
            Note_Content: content,
            se_module: 'Deals',
            Parent_Id: String(dealId)
          }
        ]
      };

      const res = await this.apiRequest('/crm/v2/Notes', 'POST', payload);
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('📝 Nota registada com sucesso no Deal ' + dealId + ' do Zoho CRM! (' + (title || '') + ')');
        return { success: true, data: res.data };
      } else {
        console.error('❌ Erro ao registar nota no Zoho CRM:', res);
        return { success: false, error: res.data || res.raw };
      }
    } catch (e) {
      console.error('❌ Exceção ao registar nota no Zoho CRM:', e.message);
      return { success: false, error: e.message };
    }
  }

  async handleWebhook(payload, clientManager) {
    if (!payload) return { success: false, message: 'Payload vazio' };

    console.log('⚡ Webhook recebido do Zoho CRM:', JSON.stringify(payload).substring(0, 300));
    
    const dealData = payload.data ? (Array.isArray(payload.data) ? payload.data[0] : payload.data) : payload;
    if (!dealData || !dealData.id) {
      return { success: true, message: 'Webhook registado mas sem Deal ID direto' };
    }

    const existingClients = clientManager.getClients();
    const existingConsultants = clientManager.getConsultants();
    const existing = existingClients.find(c => c.zoho_id === String(dealData.id) || c.id === ('client-zoho-' + dealData.id));

    const mapped = this.mapDealToClient(dealData, existing, existingConsultants);
    clientManager.saveClient(mapped);

    return {
      success: true,
      action: existing ? 'updated' : 'created',
      client_id: mapped.id,
      client_name: mapped.name
    };
  }
}

module.exports = new ZohoService();
