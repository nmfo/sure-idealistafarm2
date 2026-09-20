const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');

const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_VERCEL ? path.join(os.tmpdir(), 'sure_data') : path.join(__dirname, 'data');
const SEED_DATA_DIR = path.join(__dirname, 'data');
const TODOIST_CONFIG_FILE = path.join(DATA_DIR, 'todoist_config.json');

const TODOIST_API_BASE = 'https://api.todoist.com/api/v1';

// Mapeamento direto de IDs de consultores/administrativos e nomes para IDs de utilizador do Todoist
const TODOIST_COLLABORATORS = {
  // IDs do sistema
  'consultant-nuno': '56581171',
  'assistant-nuno': '56581171',
  'consultant-rui': '55695606',
  'assistant-rui': '55695606',
  'consultant-diogo': '60211929',
  'assistant-diogo': '60211929',
  'consultant-gardiana': '60546297',
  'assistant-gardiana': '60546297',
  'consultant-elizabete': '60629507',
  'consultant-elisabete': '60629507',
  'assistant-elizabete': '60629507',
  'assistant-elisabete': '60629507',
  'consultant-pedro': '29012083',
  'assistant-pedro': '29012083',
  'consultant-pedro-oliveira': '58778382',
  'consultant-joao': '54941221',
  'assistant-joao': '54941221',
  'consultant-geral': '56581061',
  'assistant-geral': '56581061',

  // Nomes
  'pedro barros': '29012083',
  'pedro varandas de melo barros': '29012083',
  'joao santos': '54941221',
  'joão santos': '54941221',
  'rui rebelo': '55695606',
  'nuno oliveira': '56581171',
  'nuno miguel oliveira': '56581171',
  'pedro oliveira': '58778382',
  'pedro miguel oliveira': '58778382',
  'diogo sousa': '60211929',
  'diogo': '60211929',
  'gardiana rodrigues': '60546297',
  'gardiana ferreira': '60546297',
  'gardiana': '60546297',
  'elisabete martins': '60629507',
  'elizabete martins': '60629507',
  'elisabete': '60629507',
  'elizabete': '60629507',
  'simple unique real estate': '56581061',
  'equipa sure': '56581061',
  'geral': '56581061',

  // Emails
  'peterx.barros@gmail.com': '29012083',
  'santosjoaopt99@gmail.com': '54941221',
  'ruirebelo.realestate@outlook.com': '55695606',
  'nmfo98@gmail.com': '56581171',
  'pedromigueloliveira@outlook.pt': '58778382',
  'diogo.drs74@gmail.com': '60211929',
  'gardiana.rodrigues@arys.pt': '60546297',
  'cbfafe@gmail.com': '60629507',
  'geral@sure-pt.com': '56581061'
};

// Secções oficiais (Blocos) do projeto #Administrativo - E.A.I.
const TODOIST_ADMIN_SECTIONS = {
  'assistant-nuno': '6hVQXQx33rmcRwW3',
  'nuno oliveira': '6hVQXQx33rmcRwW3',
  'nuno': '6hVQXQx33rmcRwW3',
  '56581171': '6hVQXQx33rmcRwW3',

  'assistant-pedro': '6hVQ6mQh8QghVH93',
  'pedro barros': '6hVQ6mQh8QghVH93',
  'pedro': '6hVQ6mQh8QghVH93',
  '29012083': '6hVQ6mQh8QghVH93',

  'assistant-joao': '6hVQ6mff8vPMMGVV',
  'joao santos': '6hVQ6mff8vPMMGVV',
  'joão santos': '6hVQ6mff8vPMMGVV',
  'joao': '6hVQ6mff8vPMMGVV',
  'joão': '6hVQ6mff8vPMMGVV',
  '54941221': '6hVQ6mff8vPMMGVV'
};

function normalizeString(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function syncWrite(targetFile, data) {
  try {
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2), 'utf-8');
    if (SEED_DATA_DIR && SEED_DATA_DIR !== DATA_DIR && fs.existsSync(SEED_DATA_DIR)) {
      try {
        const altFile = path.join(SEED_DATA_DIR, path.basename(targetFile));
        fs.writeFileSync(altFile, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {}
    }
  } catch (err) {
    console.error(`Erro ao gravar ${targetFile}:`, err.message);
  }
}

class TodoistService {
  constructor() {
    this.config = this.loadConfig();
    this.projectCache = null;
    this.cacheExpiry = 0;
    this.collaboratorsCache = {};
  }

  loadConfig() {
    let cfg = {};
    if (fs.existsSync(TODOIST_CONFIG_FILE)) {
      try {
        cfg = JSON.parse(fs.readFileSync(TODOIST_CONFIG_FILE, 'utf-8'));
      } catch (e) {
        console.error('Erro ao ler todoist_config.json:', e.message);
      }
    }
    return {
      api_token: cfg.api_token || process.env.TODOIST_API_TOKEN || '3b502887ef5b722dcc2d3accdaa4ee0b087e61ca',
      enabled: cfg.enabled !== false,
      admin_project_name: cfg.admin_project_name || 'Administrativo - E.A.I.',
      feedback_project_name: cfg.feedback_project_name || 'Geral',
      feedback_due_days: cfg.feedback_due_days || 2,
      last_sync_at: cfg.last_sync_at || null,
      created_tasks: cfg.created_tasks || {} // { [taskKey]: timestamp }
    };
  }

  saveConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig,
      updated_at: new Date().toISOString()
    };
    syncWrite(TODOIST_CONFIG_FILE, this.config);
    this.projectCache = null;
    return this.config;
  }

  isConfigured() {
    return Boolean(this.config.api_token && this.config.api_token.trim().length > 10);
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.config.api_token.trim()}`,
      'Content-Type': 'application/json'
    };
  }

  findAssigneeId(input) {
    if (!input) return null;
    if (typeof input === 'object') {
      return this.findAssigneeId(input.id) || this.findAssigneeId(input.name) || this.findAssigneeId(input.email);
    }
    const raw = String(input).trim();
    if (!raw) return null;

    // 1. Direct key match
    if (TODOIST_COLLABORATORS[raw.toLowerCase()]) {
      return TODOIST_COLLABORATORS[raw.toLowerCase()];
    }

    // 2. Normalized match (remove accents)
    const norm = normalizeString(raw);
    for (const [k, uid] of Object.entries(TODOIST_COLLABORATORS)) {
      if (normalizeString(k) === norm) return uid;
    }

    // 3. Partial substring match
    for (const [k, uid] of Object.entries(TODOIST_COLLABORATORS)) {
      const knorm = normalizeString(k);
      if (knorm.length >= 4 && (norm.includes(knorm) || knorm.includes(norm))) {
        return uid;
      }
    }

    return null;
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, error: 'Token da API Todoist não configurado.' };
    }
    try {
      const projects = await this.getProjects(true);
      return {
        success: true,
        projectsCount: projects.length,
        projects: projects.map(p => ({ id: p.id, name: p.name }))
      };
    } catch (err) {
      const errMsg = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
      return { success: false, error: errMsg };
    }
  }

  async getProjects(forceRefresh = false) {
    if (!this.isConfigured()) return [];
    const now = Date.now();
    if (!forceRefresh && this.projectCache && now < this.cacheExpiry) {
      return this.projectCache;
    }

    try {
      const res = await axios.get(`${TODOIST_API_BASE}/projects`, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      const data = res.data;
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
      this.projectCache = list;
      this.cacheExpiry = now + 60000; // Cache 1 min
      return this.projectCache;
    } catch (err) {
      console.error('Erro ao listar projetos Todoist:', err.message);
      return [];
    }
  }

  async findOrCreateProject(projectName) {
    if (!projectName) return null;
    const cleanName = projectName.trim().toLowerCase();
    const projects = await this.getProjects();
    
    // Exact match or partial match (ex: "Administrativo" matches "Administrativo - E.A.I.")
    let match = projects.find(p => p.name.toLowerCase() === cleanName);
    if (!match) {
      match = projects.find(p => p.name.toLowerCase().startsWith(cleanName) || cleanName.startsWith(p.name.toLowerCase()));
    }
    if (match) return match;

    try {
      const res = await axios.post(`${TODOIST_API_BASE}/projects`, {
        name: projectName.trim()
      }, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      this.projectCache = null; // Invalidate cache
      return res.data;
    } catch (err) {
      console.error(`Erro ao criar projeto "${projectName}":`, err.message);
      return null;
    }
  }

  async findOrCreateSection(projectId, sectionName) {
    if (!projectId || !sectionName) return null;
    const cleanName = sectionName.trim().toLowerCase();
    try {
      const res = await axios.get(`${TODOIST_API_BASE}/sections?project_id=${projectId}`, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      const data = res.data;
      const sections = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
      
      // Match exact name or first name
      let existing = sections.find(s => s.name.toLowerCase() === cleanName);
      if (!existing) {
        const firstName = cleanName.split(' ')[0];
        existing = sections.find(s => s.name.toLowerCase().includes(firstName) && firstName.length >= 3);
      }
      if (existing) return existing;

      const createRes = await axios.post(`${TODOIST_API_BASE}/sections`, {
        project_id: projectId,
        name: sectionName.trim()
      }, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      return createRes.data;
    } catch (err) {
      console.error(`Erro ao obter/criar secção "${sectionName}":`, err.message);
      return null;
    }
  }

  async getActiveTasks(projectId = null) {
    if (!this.isConfigured()) return [];
    try {
      const url = projectId 
        ? `${TODOIST_API_BASE}/tasks?project_id=${projectId}`
        : `${TODOIST_API_BASE}/tasks`;
      const res = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      const data = res.data;
      return Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      console.error('Erro ao obter tarefas ativas:', err.message);
      return [];
    }
  }

  async completeTask(taskId) {
    if (!this.isConfigured() || !taskId) return false;
    try {
      await axios.post(`${TODOIST_API_BASE}/tasks/${taskId}/close`, {}, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      console.log(`✅ [Todoist] Tarefa ${taskId} marcada como concluída.`);
      return true;
    } catch (err) {
      console.error(`Erro ao concluir tarefa ${taskId} no Todoist:`, err.message);
      return false;
    }
  }

  /**
   * Conclui automaticamente qualquer tarefa pendente de "Procurar e enviar opções"
   * no projeto #Administrativo para o cliente especificado quando o administrativo envia casas.
   */
  async completeAdminTaskForClient(client) {
    if (!this.isConfigured() || !this.config.enabled || !client) return { closed: 0 };
    try {
      const adminProjectName = this.config.admin_project_name || 'Administrativo - E.A.I.';
      const project = await this.findOrCreateProject(adminProjectName);
      if (!project) return { closed: 0 };

      const tasks = await this.getActiveTasks(project.id);
      const cleanClientName = String(client.name || '').toLowerCase().trim();
      if (!cleanClientName) return { closed: 0 };

      // Filtrar tarefas abertas que mencionam o cliente
      const matchingTasks = tasks.filter(t => {
        const content = String(t.content || '').toLowerCase();
        return content.includes(cleanClientName) || (client.id && content.includes(String(client.id).toLowerCase()));
      });

      let closedCount = 0;
      for (const t of matchingTasks) {
        const ok = await this.completeTask(t.id);
        if (ok) closedCount++;
      }

      if (closedCount > 0) {
        console.log(`🎉 [Todoist] Concluída(s) ${closedCount} tarefa(s) administrativa(s) para o cliente "${client.name}"`);
      }
      return { closed: closedCount };
    } catch (err) {
      console.error(`Erro ao fechar tarefas do cliente ${client.name} no Todoist:`, err.message);
      return { closed: 0, error: err.message };
    }
  }

  /**
   * REGRA 1: Sempre que são enviados imóveis a um cliente:
   * Cria tarefa no canal/projeto #Geral atribuída diretamente ao Consultor Responsável
   * para verificar os imóveis e pedir feedback ao cliente.
   */
  async createSentFeedbackTask(client, listings = [], consultant = null) {
    if (!this.isConfigured() || !this.config.enabled) {
      return { success: false, reason: 'Todoist não configurado ou inativo' };
    }
    if (!client) return { success: false, reason: 'Cliente inválido' };

    const consultantName = (consultant && consultant.name) ? consultant.name : (client.consultant_name || 'Consultor');
    const consultantId = (consultant && consultant.id) ? consultant.id : (client.consultant_id || '');
    const targetProjectName = this.config.feedback_project_name || 'Geral';
    const project = await this.findOrCreateProject(targetProjectName);
    
    // Obter Assignee UID para atribuir a tarefa ao Consultor
    const assigneeUid = this.findAssigneeId(consultantId) ||
                         this.findAssigneeId(consultantName) ||
                         this.findAssigneeId(client.consultant_id) ||
                         this.findAssigneeId(client.consultant_name) ||
                         this.findAssigneeId(client.assistant_id) ||
                         this.findAssigneeId(client.assistant_name);

    let sectionId = null;
    if (project) {
      // 1. Tentar secção do Consultor
      if (consultantName && consultantName !== 'Geral / Equipa SURE') {
        const sec = await this.findOrCreateSection(project.id, consultantName);
        if (sec) sectionId = sec.id;
      }

      // 2. Fallback para secção do Administrativo
      if (!sectionId && client.assistant_name && client.assistant_name !== 'Geral / Administração') {
        const sec = await this.findOrCreateSection(project.id, client.assistant_name);
        if (sec) sectionId = sec.id;
      }
    }

    const listingArray = Array.isArray(listings) ? listings : (listings ? [listings] : []);
    const itemsText = listingArray.map((l, idx) => {
      const title = l.title || `Imóvel #${idx + 1}`;
      const price = l.price || (l.price_num ? `${l.price_num.toLocaleString('pt-PT')} €` : '');
      const link = l.link ? ` [Ver Anúncio](${l.link})` : '';
      return `${idx + 1}. **${title}** ${price ? `(${price})` : ''}${link}`;
    }).join('\n');

    const cleanConsultantName = consultantName.split(' ')[0];
    const taskContent = `Ver casas - ${client.name} - ${cleanConsultantName}`;
    
    let taskDesc = `**Cliente:** ${client.name}\n`;
    if (client.phone) taskDesc += `**Telefone:** [${client.phone}](tel:${client.phone.replace(/\s+/g, '')})\n`;
    if (client.email) taskDesc += `**Email:** ${client.email}\n`;
    taskDesc += `**Consultor Responsável:** ${consultantName}\n\n`;
    
    if (itemsText) {
      taskDesc += `**Imóveis Enviados:**\n${itemsText}\n\n`;
    }
    
    taskDesc += `_Tarefa gerada no canal #${project ? project.name : targetProjectName} atribuída ao consultor após envio de opções no Idealista Farm._`;

    try {
      const payload = {
        content: taskContent,
        description: taskDesc,
        project_id: project ? project.id : undefined,
        section_id: sectionId || undefined,
        assignee_id: assigneeUid || undefined,
        responsible_uid: assigneeUid || undefined,
        due_string: 'today',
        priority: 3, // P2 no Todoist
        labels: ['feedback', 'imoveis', (cleanConsultantName || '').replace(/\s+/g, '_')]
      };

      const res = await axios.post(`${TODOIST_API_BASE}/tasks`, payload, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      console.log(`✅ [Todoist] Tarefa criada em #${project ? project.name : targetProjectName} atribuída a UID ${assigneeUid} (${taskContent})`);
      return { success: true, task: res.data };
    } catch (err) {
      const errMsg = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
      console.error('Erro ao criar tarefa de feedback no Todoist:', errMsg);
      return { success: false, error: errMsg };
    }
  }

  /**
   * REGRA 2: Sempre que algum cliente fica em atraso no envio de imóveis:
   * Cria tarefa no canal/projeto #Administrativo atribuída ao Administrativo Responsável
   * para procurar e enviar opções, com prazo para o próprio dia (today).
   */
  resolveResponsibleAssistant(client = {}, consultant = {}, assistants = []) {
    let assistantId = client.assistant_id;
    let assistantName = client.assistant_name;
    const consultantId = (consultant && consultant.id) ? consultant.id : (client.consultant_id || '');

    if (!assistantId || assistantId === 'assistant-geral') {
      if (consultantId === 'consultant-rui') {
        assistantId = 'assistant-joao';
      } else if (['consultant-nuno', 'consultant-pedro', 'consultant-pedro-oliveira'].includes(consultantId)) {
        assistantId = 'assistant-pedro';
      } else if (['consultant-diogo', 'consultant-gardiana', 'consultant-elizabete', 'consultant-elisabete'].includes(consultantId)) {
        assistantId = 'assistant-nuno';
      } else {
        assistantId = 'assistant-nuno';
      }
    }

    const matchedAssistant = Array.isArray(assistants) ? assistants.find(a => a.id === assistantId) : null;
    if (matchedAssistant) {
      assistantName = matchedAssistant.name;
    } else {
      if (assistantId === 'assistant-joao') assistantName = 'João Santos';
      else if (assistantId === 'assistant-pedro') assistantName = 'Pedro Barros';
      else assistantName = 'Nuno Oliveira';
    }

    let uid = this.findAssigneeId(assistantId) || this.findAssigneeId(assistantName);
    if (!uid || uid === '56581061') {
      if (assistantId === 'assistant-joao') uid = '54941221';
      else if (assistantId === 'assistant-pedro') uid = '29012083';
      else uid = '56581171'; // Nuno Oliveira
    }

    return {
      assistantId,
      assistantName,
      assigneeUid: String(uid)
    };
  }

  async getAdminSectionId(assistantIdOrName, projectId = '6hVMmvMwfJ6FMm5V') {
    if (!assistantIdOrName) return null;
    const raw = String(assistantIdOrName).trim();
    const norm = normalizeString(raw);
    
    if (TODOIST_ADMIN_SECTIONS[norm]) return TODOIST_ADMIN_SECTIONS[norm];
    for (const [k, sId] of Object.entries(TODOIST_ADMIN_SECTIONS)) {
      const knorm = normalizeString(k);
      if (knorm === norm || (knorm.length >= 4 && (norm.includes(knorm) || knorm.includes(norm)))) {
        return sId;
      }
    }
    const sec = await this.findOrCreateSection(projectId, assistantIdOrName);
    return sec ? sec.id : null;
  }

  /**
   * REGRA 2: Sempre que algum cliente fica em atraso no envio de imóveis:
   * Cria tarefa no canal/projeto #Administrativo atribuída ao Administrativo Responsável
   * para procurar e enviar opções, com prazo para o próprio dia (today).
   */
  async syncOverdueClients(clients = [], consultants = [], assistants = []) {
    if (!this.isConfigured() || !this.config.enabled) {
      return { success: false, count: 0, reason: 'Todoist não configurado ou inativo' };
    }

    const adminProjectName = this.config.admin_project_name || 'Administrativo - E.A.I.';
    const project = await this.findOrCreateProject(adminProjectName);
    if (!project) {
      return { success: false, error: `Não foi possível aceder ao projeto #${adminProjectName}` };
    }

    // Obter tarefas ativas para evitar duplicações
    const existingTasks = await this.getActiveTasks(project.id);
    const existingTitles = new Set(existingTasks.map(t => (t.content || '').toLowerCase().trim()));

    const overdueClients = clients.filter(c => c.is_overdue === true);
    let createdCount = 0;
    const results = [];

    const now = Date.now();
    const taskHistory = this.config.created_tasks || {};

    for (const client of overdueClients) {
      const consultant = consultants.find(co => co.id === client.consultant_id) || { name: 'Consultor Geral' };
      const resolved = this.resolveResponsibleAssistant(client, consultant, assistants);
      const assistantName = resolved.assistantName;
      const assigneeUid = resolved.assigneeUid;
      const daysOverdue = client.days_overdue || client.days_since_sent || 0;

      // Nome da tarefa com o nome do administrativo responsável
      const taskTitle = `🔍 Procurar e enviar opções: ${client.name} (${assistantName})`;

      // Verificar se já existe uma tarefa aberta para este cliente
      const alreadyOpen = Array.from(existingTitles).some(t => t.includes(client.name.toLowerCase().trim()));
      
      // Chave de histórico para não repetir na mesma data (últimas 20 horas)
      const historyKey = `overdue_${client.id}_${new Date().toISOString().slice(0, 10)}`;
      if (alreadyOpen || (taskHistory[historyKey] && (now - taskHistory[historyKey] < 20 * 3600 * 1000))) {
        continue;
      }

      // Secção correta do Administrativo Responsável (Bloco no Todoist)
      const sectionId = await this.getAdminSectionId(resolved.assistantId || assistantName, project.id);

      let taskDesc = `🚨 **CLIENTE EM ATRASO (${daysOverdue} dias sem envio de opções)**\n\n`;
      taskDesc += `• **Administrativo Responsável:** ${assistantName}\n`;
      taskDesc += `• **Consultor:** ${consultant.name}\n`;
      taskDesc += `• **Prioridade do Cliente:** ${client.priority === 'SU' ? 'Super Urgente (2 dias)' : client.priority === 'U' ? 'Urgente (5 dias)' : 'Standard (10 dias)'}\n`;
      taskDesc += `• **Critérios de Procura:** ${client.typology || 'Qualquer'} em ${client.location || 'Localização Geral'}\n`;
      if (client.budget) taskDesc += `• **Orçamento Máximo:** ${Number(client.budget).toLocaleString('pt-PT')} €\n`;
      if (client.notes) taskDesc += `• **Notas do Cliente:** ${client.notes}\n`;
      taskDesc += `\n⚡ _Tarefa diária prioritária com prazo para **HOJE** gerada pelo Idealista Farm._`;

      try {
        const payload = {
          content: taskTitle,
          description: taskDesc,
          project_id: project.id,
          section_id: sectionId || undefined,
          assignee_id: String(assigneeUid),
          responsible_uid: String(assigneeUid),
          due_string: 'today', // Prazo para o próprio dia!
          priority: client.priority === 'SU' ? 4 : 3, // P1 se Super Urgente, P2 se Urgente
          labels: ['atraso', 'administrativo', (assistantName || '').replace(/\s+/g, '_')]
        };

        const res = await axios.post(`${TODOIST_API_BASE}/tasks`, payload, {
          headers: this.getHeaders(),
          timeout: 10000
        });

        taskHistory[historyKey] = now;
        createdCount++;
        results.push({ client: client.name, taskId: res.data.id, assistant: assistantName, assignee: assigneeUid });
        console.log(`✅ [Todoist] Tarefa de atraso criada em #${project.name} para o Administrativo ${assistantName} (UID: ${assigneeUid}, Cliente: ${client.name})`);
      } catch (err) {
        console.error(`Erro ao criar tarefa Todoist de atraso para ${client.name}:`, err.message);
      }
    }

    // Gravar histórico de tarefas para evitar spam
    this.saveConfig({
      created_tasks: taskHistory,
      last_sync_at: new Date().toISOString()
    });

    return {
      success: true,
      total_overdue: overdueClients.length,
      created_count: createdCount,
      tasks: results
    };
  }
}

const todoistService = new TodoistService();
module.exports = todoistService;
