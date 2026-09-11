const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');

const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_VERCEL ? path.join(os.tmpdir(), 'sure_data') : path.join(__dirname, 'data');
const SEED_DATA_DIR = path.join(__dirname, 'data');
const TODOIST_CONFIG_FILE = path.join(DATA_DIR, 'todoist_config.json');

const TODOIST_API_BASE = 'https://api.todoist.com/api/v1';

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

  /**
   * REGRA 1: Sempre que são enviados imóveis a um cliente:
   * Cria tarefa no canal/projeto #Geral para o Consultor Responsável verificar os imóveis e pedir feedback ao cliente.
   */
  async createSentFeedbackTask(client, listings = [], consultant = null) {
    if (!this.isConfigured() || !this.config.enabled) {
      return { success: false, reason: 'Todoist não configurado ou inativo' };
    }
    if (!client) return { success: false, reason: 'Cliente inválido' };

    const consultantName = (consultant && consultant.name) ? consultant.name : (client.consultant_name || 'Consultor Responsável');
    const targetProjectName = this.config.feedback_project_name || 'Geral';
    const project = await this.findOrCreateProject(targetProjectName);
    
    let sectionId = null;
    if (project && consultantName && consultantName !== 'Geral / Equipa SURE') {
      const section = await this.findOrCreateSection(project.id, consultantName);
      if (section) sectionId = section.id;
    }

    const listingArray = Array.isArray(listings) ? listings : (listings ? [listings] : []);
    const itemsText = listingArray.map((l, idx) => {
      const title = l.title || `Imóvel #${idx + 1}`;
      const price = l.price || (l.price_num ? `${l.price_num.toLocaleString('pt-PT')} €` : '');
      const link = l.link ? ` [Ver Anúncio](${l.link})` : '';
      return `${idx + 1}. **${title}** ${price ? `(${price})` : ''}${link}`;
    }).join('\n');

    const feedbackDays = this.config.feedback_due_days || 2;
    const taskContent = `📞 Verificar imóveis e pedir feedback: ${client.name} (${consultantName})`;
    
    let taskDesc = `**Cliente:** ${client.name}\n`;
    if (client.phone) taskDesc += `**Telefone:** [${client.phone}](tel:${client.phone.replace(/\s+/g, '')})\n`;
    if (client.email) taskDesc += `**Email:** ${client.email}\n`;
    taskDesc += `**Consultor Responsável:** ${consultantName}\n\n`;
    
    if (itemsText) {
      taskDesc += `**Imóveis Enviados:**\n${itemsText}\n\n`;
    }
    
    taskDesc += `_Tarefa gerada no canal #${project ? project.name : targetProjectName} após envio de opções no Idealista Farm._`;

    try {
      const payload = {
        content: taskContent,
        description: taskDesc,
        project_id: project ? project.id : undefined,
        section_id: sectionId || undefined,
        due_string: `in ${feedbackDays} days`,
        priority: 3, // P2 no Todoist
        labels: ['feedback', 'imoveis', (consultantName || '').replace(/\s+/g, '_')]
      };

      const res = await axios.post(`${TODOIST_API_BASE}/tasks`, payload, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      console.log(`✅ [Todoist] Tarefa de feedback criada em #${project ? project.name : targetProjectName} para ${consultantName} (Cliente: ${client.name})`);
      return { success: true, task: res.data };
    } catch (err) {
      const errMsg = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
      console.error('Erro ao criar tarefa de feedback no Todoist:', errMsg);
      return { success: false, error: errMsg };
    }
  }

  /**
   * REGRA 2: Sempre que algum cliente fica em atraso no envio de imóveis:
   * Cria tarefa no canal/projeto #Administrativo para o Administrativo Responsável
   * procurar e enviar opções, com prazo para o próprio dia (today).
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
      const assistant = assistants.find(as => as.id === client.assistant_id) || { name: 'Administrativo Geral' };
      const daysOverdue = client.days_overdue || client.days_since_sent || 0;

      // Nome da tarefa
      const taskTitle = `🔍 Procurar e enviar opções: ${client.name} (${assistant.name})`;

      // Verificar se já existe uma tarefa aberta para este cliente
      const alreadyOpen = Array.from(existingTitles).some(t => t.includes(client.name.toLowerCase().trim()));
      
      // Chave de histórico para não repetir na mesma data (últimas 20 horas)
      const historyKey = `overdue_${client.id}_${new Date().toISOString().slice(0, 10)}`;
      if (alreadyOpen || (taskHistory[historyKey] && (now - taskHistory[historyKey] < 20 * 3600 * 1000))) {
        continue;
      }

      // Criar secção para o Administrativo se pretendido
      let sectionId = null;
      if (assistant && assistant.name && assistant.name !== 'Geral / Administração') {
        const section = await this.findOrCreateSection(project.id, assistant.name);
        if (section) sectionId = section.id;
      }

      let taskDesc = `🚨 **CLIENTE EM ATRASO (${daysOverdue} dias sem envio de opções)**\n\n`;
      taskDesc += `• **Administrativo Responsável:** ${assistant.name}\n`;
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
          due_string: 'today', // Prazo para o próprio dia!
          priority: client.priority === 'SU' ? 4 : 3, // P1 se Super Urgente, P2 se Urgente
          labels: ['atraso', 'administrativo', (assistant.name || '').replace(/\s+/g, '_')]
        };

        const res = await axios.post(`${TODOIST_API_BASE}/tasks`, payload, {
          headers: this.getHeaders(),
          timeout: 10000
        });

        taskHistory[historyKey] = now;
        createdCount++;
        results.push({ client: client.name, taskId: res.data.id, assistant: assistant.name });
        console.log(`✅ [Todoist] Tarefa de atraso criada em #${project.name} para o Administrativo ${assistant.name} (Cliente: ${client.name})`);
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
