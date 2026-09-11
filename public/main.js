document.addEventListener('DOMContentLoaded', () => {
  let consultants = [];
  let assistants = [];
  let clients = [];
  let currentClient = null;
  let currentUser = null;
  let authToken = null;
  let listings = [];
  let currentFilter = 'all';
  let sidebarFilter = 'all'; // 'all', 'mine', or 'overdue'
  let clientSearchQuery = '';

  // Collapsed consultant states
  const collapsedConsultants = new Set();

  // Active modal slider state
  let currentSliderPhotos = [];
  let currentSliderIndex = 0;
  let currentModalItem = null;

  // Drag & drop state
  let draggedClientId = null;
  let lastAutoClipboard = '';

  // Custom sending selection cart
  const selectedListingIds = new Set();

  // ── Element references ───────────────────────────────────────────────────
  const consultantsAccordionEl = document.getElementById('consultants-accordion');
  const sidebarCountAll = document.getElementById('sidebar-count-all');
  const sidebarCountMine = document.getElementById('sidebar-count-mine');
  const sidebarCountOverdue = document.getElementById('sidebar-count-overdue');
  const filterAllClientsBtn = document.getElementById('filter-all-clients');
  const filterMyClientsBtn = document.getElementById('filter-my-clients');
  const filterOverdueClientsBtn = document.getElementById('filter-overdue-clients');
  const inputClientSearch = document.getElementById('input-client-search');
  const btnClearClientSearch = document.getElementById('btn-clear-client-search');

  // Auth & User Elements
  const loginOverlay = document.getElementById('login-overlay');
  const formLogin = document.getElementById('form-login');
  const loginUserSelect = document.getElementById('login-user-select');
  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');
  const btnToggleLoginPass = document.getElementById('btn-toggle-login-pass');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const btnSubmitLogin = document.getElementById('btn-submit-login');

  const sidebarUserCard = document.getElementById('sidebar-user-card');
  const userAvatarBadge = document.getElementById('user-avatar-badge');
  const userDisplayName = document.getElementById('user-display-name');
  const userDisplayRole = document.getElementById('user-display-role');
  const btnLogout = document.getElementById('btn-logout');

  // Assistants Management Elements
  const btnManageAssistants = document.getElementById('btn-manage-assistants');
  const modalAssistants = document.getElementById('modal-assistants');
  const formAssistant = document.getElementById('form-assistant');
  const assistantIdInput = document.getElementById('assistant-id');
  const assistantNameInput = document.getElementById('assistant-name');
  const assistantUsernameInput = document.getElementById('assistant-username');
  const assistantPasswordInput = document.getElementById('assistant-password');
  const assistantRoleSelect = document.getElementById('assistant-role');
  const assistantColorSelect = document.getElementById('assistant-color');
  const btnCancelAssistantEdit = document.getElementById('btn-cancel-assistant-edit');
  const assistantsTableBody = document.getElementById('assistants-table-body');
  const assistantFormTitle = document.getElementById('assistant-form-title');

  const currentClientNameEl = document.getElementById('current-client-name');
  const headerPriorityBadge = document.getElementById('header-priority-badge');
  const clientBadgesEl = document.getElementById('client-badges');
  const btnEditClientHeader = document.getElementById('btn-edit-client-header');
  const btnClearListingsHeader = document.getElementById('btn-clear-listings-header');
  const btnDeleteClientHeader = document.getElementById('btn-delete-client-header');
  const btnScrapeNow = document.getElementById('btn-scrape-now');
  const btnOpenIdealista = document.getElementById('btn-open-idealista');
  const btnOpenRemax = document.getElementById('btn-open-remax');
  const btnOpenZome = document.getElementById('btn-open-zome');
  const btnOpenArys = document.getElementById('btn-open-arys');
  const btnShowBookmarklet = document.getElementById('btn-show-bookmarklet');
  const btnImportHtml = document.getElementById('btn-import-html');
  const scrapeStatusEl = document.getElementById('scrape-status');
  const listingsGridEl = document.getElementById('listings-grid');
  const inputSearchFilter = document.getElementById('input-search-filter');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnEnrichListings = document.getElementById('btn-enrich-listings');
  const btnClearListings = document.getElementById('btn-clear-listings');

  const top3SectionEl = document.getElementById('top3-section');
  const top3GridEl = document.getElementById('top3-grid');
  const btnCopyTop3 = document.getElementById('btn-copy-top3');
  const btnMarkTop3Sent = document.getElementById('btn-mark-top3-sent');

  // Selection Dock Elements
  const selectionDock = document.getElementById('selection-dock');
  const selectionCountEl = document.getElementById('selection-count');
  const btnCopySelection = document.getElementById('btn-copy-selection');
  const btnMarkSelectionSent = document.getElementById('btn-mark-selection-sent');
  const btnClearSelection = document.getElementById('btn-clear-selection');

  // Modals
  const modalClient = document.getElementById('modal-client');
  const formClient  = document.getElementById('form-client');
  const modalConsultant = document.getElementById('modal-consultant');
  const formConsultant  = document.getElementById('form-consultant');
  const modalImport = document.getElementById('modal-import');
  const formImport  = document.getElementById('form-import');
  const btnAddDirectLink = document.getElementById('btn-add-direct-link');
  const modalHtml   = document.getElementById('modal-html');
  const formHtml    = document.getElementById('form-html');
  const modalBookmarklet = document.getElementById('modal-bookmarklet');
  const modalDetail = document.getElementById('modal-detail');
  const modalChat   = document.getElementById('modal-chat');
  const formChat    = document.getElementById('form-chat');
  const chatInput   = document.getElementById('chat-input');
  const chatMessages= document.getElementById('chat-messages');
  const btnOpenChat = document.getElementById('btn-open-chat');

  // Slider Elements
  const sliderMainImg = document.getElementById('slider-main-img');
  const sliderCounter = document.getElementById('slider-counter');
  const sliderBtnPrev = document.getElementById('slider-btn-prev');
  const sliderBtnNext = document.getElementById('slider-btn-next');
  const sliderThumbs  = document.getElementById('slider-thumbs');

  // Visits & Google Calendar Elements
  let visits = [];
  const btnOpenVisits = document.getElementById('btn-open-visits');
  const badgeVisitsCount = document.getElementById('badge-visits-count');
  const modalVisits = document.getElementById('modal-visits');
  const formVisit = document.getElementById('form-visit');
  const tabBtnNewVisit = document.getElementById('tab-btn-new-visit');
  const tabBtnListVisits = document.getElementById('tab-btn-list-visits');
  const tabPaneNewVisit = document.getElementById('tab-pane-new-visit');
  const tabPaneListVisits = document.getElementById('tab-pane-list-visits');
  const visitsCardsContainer = document.getElementById('visits-cards-container');
  const visitsTabCount = document.getElementById('visits-tab-count');
  const btnRefreshVisits = document.getElementById('btn-refresh-visits');
  const btnAddGCalendarDirect = document.getElementById('btn-add-google-calendar-direct');
  const btnVisitOpenMap = document.getElementById('btn-visit-open-map');
  const visitClientSelect = document.getElementById('visit-client-select');
  const visitConsultantSelect = document.getElementById('visit-consultant-select');
  const visitListingTitle = document.getElementById('visit-listing-title');
  const visitDate = document.getElementById('visit-date');
  const visitTime = document.getElementById('visit-time');
  const visitDuration = document.getElementById('visit-duration');
  const visitLocation = document.getElementById('visit-location');
  const visitPrice = document.getElementById('visit-price');
  const visitContact = document.getElementById('visit-contact');
  const visitLink = document.getElementById('visit-link');
  const visitNotes = document.getElementById('visit-notes');

  // Detail Modal Elements
  const modalDetailStatus = document.getElementById('modal-detail-status');
  const modalDetailTitle  = document.getElementById('modal-detail-title');
  const modalDetailPrice  = document.getElementById('modal-detail-price');
  const modalDetailLocation = document.getElementById('modal-detail-location');
  const modalDetailSpecs  = document.getElementById('modal-detail-specs');
  const modalDetailDescription = document.getElementById('modal-detail-description');
  const modalCopyLinkBtn  = document.getElementById('modal-copy-link-btn');
  const modalToggleSentBtn= document.getElementById('modal-toggle-sent-btn');
  const modalOpenIdealistaLink = document.getElementById('modal-open-idealista-link');

  // Tab counters
  const countAll       = document.getElementById('count-all');
  const countNovo      = document.getElementById('count-novo');
  const countEnviado   = document.getElementById('count-enviado');
  const countInteresse = document.getElementById('count-interesse');
  const countVisita    = document.getElementById('count-visita');
  const countFav       = document.getElementById('count-favorito');
  const countRejeitado = document.getElementById('count-rejeitado');

  // ── STORAGE MANAGER (PERSISTÊNCIA LOCALSTORAGE & BACKUP) ──────────────────
  const STORAGE_KEYS = {
    CLIENTS: 'sure_crm_clients_v2',
    CONSULTANTS: 'sure_crm_consultants_v2',
    ASSISTANTS: 'sure_crm_assistants_v2',
    AUTH_USER: 'sure_auth_user_v2',
    AUTH_TOKEN: 'sure_auth_token_v2',
    LISTINGS: 'sure_crm_listings_v2',
    VISITS: 'sure_crm_visits_v2',
    ACTIVE_CLIENT: 'sure_crm_active_client_id_v2'
  };

  function getLocalData(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setLocalData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Erro ao gravar localStorage:', e);
    }
  }

  // ── AUTHENTICATION & LOGIN MANAGEMENT ─────────────────────────────────────
  function showLoginOverlay() {
    if (loginOverlay) loginOverlay.classList.remove('hidden');
  }

  function hideLoginOverlay() {
    if (loginOverlay) loginOverlay.classList.add('hidden');
  }

  function updateUserUI() {
    if (!currentUser) return;
    if (userDisplayName) userDisplayName.textContent = currentUser.name;
    if (userDisplayRole) {
      userDisplayRole.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Administrativo';
    }
    if (userAvatarBadge) {
      const initial = (currentUser.name || 'U').trim().charAt(0).toUpperCase();
      userAvatarBadge.textContent = initial;
      userAvatarBadge.style.backgroundColor = currentUser.color || '#C75233';
    }
    if (btnManageAssistants) {
      btnManageAssistants.style.display = currentUser.role === 'admin' ? 'inline-flex' : 'none';
    }
  }

  async function checkAuthSession() {
    const savedUser = getLocalData(STORAGE_KEYS.AUTH_USER, null);
    const savedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    if (savedUser && savedToken) {
      currentUser = savedUser;
      authToken = savedToken;
      updateUserUI();
      hideLoginOverlay();
      return true;
    }

    showLoginOverlay();
    return false;
  }

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = loginUsernameInput ? loginUsernameInput.value.trim() : '';
      const password = loginPasswordInput ? loginPasswordInput.value.trim() : '';

      if (!username) {
        showLoginError('Por favor introduza o nome de utilizador');
        return;
      }

      if (btnSubmitLogin) {
        btnSubmitLogin.disabled = true;
        btnSubmitLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A entrar...';
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          currentUser = data.user;
          authToken = data.token;
          setLocalData(STORAGE_KEYS.AUTH_USER, currentUser);
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken);

          hideLoginError();
          hideLoginOverlay();
          updateUserUI();
          showToast(`Bem-vindo, ${currentUser.name}! 👋`);

          if (currentUser.role === 'staff' && filterMyClientsBtn) {
            sidebarFilter = 'mine';
            filterMyClientsBtn.classList.add('active');
            if (filterAllClientsBtn) filterAllClientsBtn.classList.remove('active');
          }

          await init();
        } else {
          showLoginError(data.error || 'Credenciais inválidas');
        }
      } catch (err) {
        const found = assistants.find(a => String(a.username || '').toLowerCase() === username.toLowerCase());
        if (found && (String(found.password || '123') === password || !password)) {
          currentUser = {
            id: found.id,
            name: found.name,
            username: found.username,
            role: found.role || (found.id === 'assistant-geral' ? 'admin' : 'staff'),
            color: found.color || '#5B7FA6'
          };
          authToken = 'local-token-' + Date.now();
          setLocalData(STORAGE_KEYS.AUTH_USER, currentUser);
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken);
          hideLoginError();
          hideLoginOverlay();
          updateUserUI();
          showToast(`Bem-vindo, ${currentUser.name}! 👋`);
          await init();
        } else {
          showLoginError('Erro ao validar login. Verifique a password.');
        }
      } finally {
        if (btnSubmitLogin) {
          btnSubmitLogin.disabled = false;
          btnSubmitLogin.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Entrar na Aplicação';
        }
      }
    });
  }

  if (loginUserSelect) {
    loginUserSelect.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (!selectedId) return;
      const found = assistants.find(a => a.id === selectedId);
      if (found) {
        if (loginUsernameInput) loginUsernameInput.value = found.username || found.name;
        if (loginPasswordInput) {
          loginPasswordInput.value = found.password || '123';
          loginPasswordInput.focus();
        }
      }
    });
  }

  if (btnToggleLoginPass && loginPasswordInput) {
    btnToggleLoginPass.addEventListener('click', () => {
      const isPass = loginPasswordInput.type === 'password';
      loginPasswordInput.type = isPass ? 'text' : 'password';
      btnToggleLoginPass.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  function showLoginError(msg) {
    if (loginErrorMsg) {
      loginErrorMsg.textContent = msg;
      loginErrorMsg.classList.remove('hidden');
    }
  }
  function hideLoginError() {
    if (loginErrorMsg) {
      loginErrorMsg.classList.add('hidden');
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('Deseja terminar a sessão atual?')) {
        currentUser = null;
        authToken = null;
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        showToast('Sessão terminada. Até breve! 👋');
        showLoginOverlay();
      }
    });
  }

  // ── ASSISTANTS MANAGEMENT ────────────────────────────────────────────────
  async function loadAssistants() {
    let localAst = getLocalData(STORAGE_KEYS.ASSISTANTS, []);
    try {
      const res = await fetch('/api/assistants');
      if (res.ok) {
        const serverAst = await res.json();
        if (Array.isArray(serverAst) && serverAst.length > 0) {
          const map = new Map(serverAst.map(a => [a.id, a]));
          localAst.forEach(a => {
            if (!map.has(a.id)) map.set(a.id, a);
          });
          assistants = Array.from(map.values());
        } else if (localAst.length > 0) {
          assistants = localAst;
        }
      } else if (localAst.length > 0) {
        assistants = localAst;
      }
    } catch (e) {
      if (localAst.length > 0) assistants = localAst;
      else assistants = [{ id: 'assistant-geral', name: 'Geral / Administração', username: 'geral', password: '123', role: 'admin', color: '#C75233' }];
    }

    if (!assistants || assistants.length === 0) {
      assistants = [{ id: 'assistant-geral', name: 'Geral / Administração', username: 'geral', password: '123', role: 'admin', color: '#C75233' }];
    }
    setLocalData(STORAGE_KEYS.ASSISTANTS, assistants);

    if (loginUserSelect) {
      loginUserSelect.innerHTML = '<option value="">-- Escolha da Lista Rápida --</option>';
      assistants.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.name} (${a.username || a.name})`;
        loginUserSelect.appendChild(opt);
      });
    }

    renderAssistantsTable();
  }

  function renderAssistantsTable() {
    if (!assistantsTableBody) return;
    assistantsTableBody.innerHTML = '';

    assistants.forEach(a => {
      const clientCount = clients.filter(c => (c.assistant_id || 'assistant-geral') === a.id).length;
      const tr = document.createElement('tr');
      const isMaster = a.id === 'assistant-geral';

      tr.innerHTML = `
        <td style="padding:9px 12px; font-weight:600; color:var(--basalto); display:flex; align-items:center; gap:8px;">
          <span style="width:12px; height:12px; border-radius:50%; background:${a.color || '#5B7FA6'}; display:inline-block;"></span>
          ${esc(a.name)}
        </td>
        <td style="padding:9px 12px; font-family:monospace; color:#444;">${esc(a.username || '-')}</td>
        <td style="padding:9px 12px; font-family:monospace; color:#555;">
          <span class="pass-text" data-pass="${esc(a.password || '123')}">••••••</span>
          <button type="button" class="btn-toggle-row-pass" style="background:none; border:none; color:#888; cursor:pointer; margin-left:6px;" title="Mostrar/Ocultar password">
            <i class="fa-solid fa-eye"></i>
          </button>
        </td>
        <td style="padding:9px 12px;">
          <span class="${a.role === 'admin' ? 'badge-role-admin' : 'badge-role-staff'}">${a.role === 'admin' ? 'Admin (Vê Tudo)' : 'Staff (Próprios)'}</span>
        </td>
        <td style="padding:9px 12px; text-align:center; font-weight:700; color:var(--terracota);">${clientCount}</td>
        <td style="padding:9px 12px; text-align:right;">
          <button type="button" class="btn-action-edit btn-edit-ast" style="background:none; border:none; color:#5B7FA6; cursor:pointer; margin-right:6px; font-size:0.9rem;" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          ${!isMaster ? `
            <button type="button" class="btn-action-del btn-del-ast" style="background:none; border:none; color:#c0392b; cursor:pointer; font-size:0.9rem;" title="Apagar">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ''}
        </td>`;

      const togglePassBtn = tr.querySelector('.btn-toggle-row-pass');
      const passSpan = tr.querySelector('.pass-text');
      if (togglePassBtn && passSpan) {
        togglePassBtn.addEventListener('click', () => {
          const isMasked = passSpan.textContent === '••••••';
          passSpan.textContent = isMasked ? passSpan.dataset.pass : '••••••';
          togglePassBtn.innerHTML = isMasked ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        });
      }

      const editBtn = tr.querySelector('.btn-edit-ast');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          if (assistantIdInput) assistantIdInput.value = a.id;
          if (assistantNameInput) assistantNameInput.value = a.name;
          if (assistantUsernameInput) assistantUsernameInput.value = a.username || '';
          if (assistantPasswordInput) assistantPasswordInput.value = a.password || '123';
          if (assistantRoleSelect) assistantRoleSelect.value = a.role || 'staff';
          if (assistantColorSelect) assistantColorSelect.value = a.color || '#5B7FA6';
          if (assistantFormTitle) assistantFormTitle.innerHTML = `<i class="fa-solid fa-pen" style="color:var(--terracota);"></i> <span>Editar Administrativo (${esc(a.name)})</span>`;
          if (btnCancelAssistantEdit) btnCancelAssistantEdit.classList.remove('hidden');
        });
      }

      const delBtn = tr.querySelector('.btn-del-ast');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          if (!confirm(`Tem a certeza que deseja APAGAR o administrativo "${a.name}"? Os seus clientes serão reatribuídos à equipa Geral.`)) return;
          try {
            const res = await fetch(`/api/assistants/${a.id}`, { method: 'DELETE' });
            if (res.ok) {
              showToast(`Administrativo "${a.name}" removido.`);
              await loadAssistants();
              await loadClients();
            }
          } catch (e) {
            showToast('Erro ao remover administrativo', 'error');
          }
        });
      }

      assistantsTableBody.appendChild(tr);
    });
  }

  if (btnManageAssistants) {
    btnManageAssistants.addEventListener('click', () => {
      renderAssistantsTable();
      showModal(modalAssistants);
    });
  }

  if (btnCancelAssistantEdit) {
    btnCancelAssistantEdit.addEventListener('click', () => {
      if (formAssistant) formAssistant.reset();
      if (assistantIdInput) assistantIdInput.value = '';
      if (assistantFormTitle) assistantFormTitle.innerHTML = `<i class="fa-solid fa-user-plus" style="color:var(--terracota);"></i> <span>Adicionar Novo Administrativo</span>`;
      btnCancelAssistantEdit.classList.add('hidden');
    });
  }

  if (formAssistant) {
    formAssistant.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        id: assistantIdInput ? assistantIdInput.value.trim() || null : null,
        name: assistantNameInput ? assistantNameInput.value.trim() : '',
        username: assistantUsernameInput ? assistantUsernameInput.value.trim() : '',
        password: assistantPasswordInput ? assistantPasswordInput.value.trim() : '123',
        role: assistantRoleSelect ? assistantRoleSelect.value : 'staff',
        color: assistantColorSelect ? assistantColorSelect.value : '#5B7FA6'
      };

      if (!payload.name) {
        showToast('Nome é obrigatório', 'error');
        return;
      }

      try {
        const res = await fetch('/api/assistants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast(`Administrativo "${payload.name}" guardado com sucesso! 💾`);
          formAssistant.reset();
          if (assistantIdInput) assistantIdInput.value = '';
          if (btnCancelAssistantEdit) btnCancelAssistantEdit.classList.add('hidden');
          if (assistantFormTitle) assistantFormTitle.innerHTML = `<i class="fa-solid fa-user-plus" style="color:var(--terracota);"></i> <span>Adicionar Novo Administrativo</span>`;
          await loadAssistants();
        }
      } catch (err) {
        showToast('Erro ao guardar administrativo', 'error');
      }
    });
  }

  function updateBackupStats() {
    if (backupStatClients) {
      const c = getLocalData(STORAGE_KEYS.CLIENTS, []);
      backupStatClients.textContent = c.length;
    }
    if (backupStatListings) {
      const l = getLocalData(STORAGE_KEYS.LISTINGS, []);
      backupStatListings.textContent = l.length;
    }
    if (backupStatVisits) {
      const v = getLocalData(STORAGE_KEYS.VISITS, []);
      backupStatVisits.textContent = v.length;
    }
  }

  // Backup Modal Elements
  const modalBackup = document.getElementById('modal-backup');
  const btnBackupModal = document.getElementById('btn-backup-modal');
  const btnExportBackupJson = document.getElementById('btn-export-backup-json');
  const btnImportBackupJson = document.getElementById('btn-import-backup-json');
  const fileInputBackup = document.getElementById('file-input-backup');
  const backupStatClients = document.getElementById('backup-stat-clients');
  const backupStatListings = document.getElementById('backup-stat-listings');
  const backupStatVisits = document.getElementById('backup-stat-visits');

  if (btnBackupModal) {
    btnBackupModal.addEventListener('click', () => {
      updateBackupStats();
      showModal(modalBackup);
    });
  }

  if (btnExportBackupJson) {
    btnExportBackupJson.addEventListener('click', () => {
      const payload = {
        version: '2.0',
        exported_at: new Date().toISOString(),
        consultants: getLocalData(STORAGE_KEYS.CONSULTANTS, consultants),
        assistants: getLocalData(STORAGE_KEYS.ASSISTANTS, assistants),
        clients: getLocalData(STORAGE_KEYS.CLIENTS, clients),
        listings: getLocalData(STORAGE_KEYS.LISTINGS, []),
        visits: getLocalData(STORAGE_KEYS.VISITS, visits)
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SURE_Backup_Clientes_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Cópia de segurança descarregada com sucesso! 💾');
    });
  }

  if (btnImportBackupJson && fileInputBackup) {
    btnImportBackupJson.addEventListener('click', () => fileInputBackup.click());

    fileInputBackup.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!parsed || typeof parsed !== 'object') throw new Error('Formato inválido');

          showToast('A restaurar backup... ⏳');
          if (Array.isArray(parsed.consultants)) setLocalData(STORAGE_KEYS.CONSULTANTS, parsed.consultants);
          if (Array.isArray(parsed.assistants)) setLocalData(STORAGE_KEYS.ASSISTANTS, parsed.assistants);
          if (Array.isArray(parsed.clients)) setLocalData(STORAGE_KEYS.CLIENTS, parsed.clients);
          if (Array.isArray(parsed.listings)) setLocalData(STORAGE_KEYS.LISTINGS, parsed.listings);
          if (Array.isArray(parsed.visits)) setLocalData(STORAGE_KEYS.VISITS, parsed.visits);

          // Enviar para o servidor restaurar também
          await fetch('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          }).catch(() => {});

          showToast(`🎉 Backup restaurado! ${(parsed.clients || []).length} clientes carregados!`);
          hideModals();
          await loadConsultants();
          await loadAssistants();
          await loadClients();
          await loadVisits();
        } catch (err) {
          showToast('Erro ao ler ficheiro de backup JSON', 'error');
        } finally {
          fileInputBackup.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  // ── Initialization & Event Listeners ─────────────────────────────────────
  (async () => {
    await loadAssistants();
    const isAuthed = await checkAuthSession();
    if (isAuthed) {
      await init();
    }
  })();

  async function init() {
    await loadConsultants();
    await loadAssistants();
    await loadClients();
    await loadVisits();
    autoSyncGoogleDriveMaster();
  }

  async function autoSyncGoogleDriveMaster() {
    try {
      const res = await fetch('/api/drive/sync-master-clients');
      const data = await res.json();
      if (data.success && data.count > 0) {
        await loadClients();
      }
    } catch (e) {}
  }

  const btnAddClient = document.getElementById('btn-add-client');
  if (btnAddClient) btnAddClient.addEventListener('click', () => showClientModal(null));

  const btnAddCons = document.getElementById('btn-add-consultant');
  if (btnAddCons) btnAddCons.addEventListener('click', () => showModal(modalConsultant));

  // Zoho CRM Excel File Upload
  const btnImportZoho = document.getElementById('btn-import-zoho');
  const fileInputZoho = document.getElementById('file-input-zoho');
  if (btnImportZoho && fileInputZoho) {
    btnImportZoho.addEventListener('click', () => fileInputZoho.click());

    fileInputZoho.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result;
        showToast('A processar ficheiro Excel do Zoho CRM... ⏳');
        try {
          const res = await fetch('/api/import-zoho-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data, filename: file.name })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(data.message);
            await loadConsultants();
            await loadClients();
          } else {
            showToast(data.error || 'Erro ao processar ficheiro', 'error');
          }
        } catch (err) {
          showToast('Erro ao carregar ficheiro Excel', 'error');
        } finally {
          fileInputZoho.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnEditClientHeader) btnEditClientHeader.addEventListener('click', () => { if (currentClient) showClientModal(currentClient); });
  if (btnDeleteClientHeader) btnDeleteClientHeader.addEventListener('click', () => { if (currentClient) handleDeleteClient(currentClient.id); });
  
  async function openPortalUrl(portalName) {
    if (!currentClient) {
      showToast('Selecione um cliente primeiro!', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/portals-urls/${currentClient.id}`);
      const data = await res.json();
      if (data.urls) {
        const allUrls = data.urls.all_urls && data.urls.all_urls[portalName];
        if (Array.isArray(allUrls) && allUrls.length > 1) {
          allUrls.forEach((u, idx) => {
            setTimeout(() => window.open(u, '_blank'), idx * 250);
          });
          showToast(`A abrir ${allUrls.length} pesquisas no ${portalName.toUpperCase()} para cada zona! 🚀`);
        } else if (data.urls[portalName]) {
          window.open(data.urls[portalName], '_blank');
        } else {
          showToast(`Link de pesquisa ${portalName.toUpperCase()} indisponível`, 'error');
        }
      } else {
        showToast(`Link de pesquisa ${portalName.toUpperCase()} indisponível`, 'error');
      }
    } catch (e) {
      showToast(`Erro ao gerar link de pesquisa para ${portalName.toUpperCase()}`, 'error');
    }
  }

  if (btnOpenIdealista) btnOpenIdealista.addEventListener('click', () => openPortalUrl('idealista'));
  if (btnOpenRemax) btnOpenRemax.addEventListener('click', () => openPortalUrl('remax'));
  if (btnOpenZome) btnOpenZome.addEventListener('click', () => openPortalUrl('zome'));
  if (btnOpenArys) btnOpenArys.addEventListener('click', () => openPortalUrl('arys'));

  if (btnShowBookmarklet) btnShowBookmarklet.addEventListener('click', () => showModal(modalBookmarklet));
  
  const btnCopyBmCode = document.getElementById('btn-copy-bm-code');
  if (btnCopyBmCode) {
    btnCopyBmCode.addEventListener('click', () => {
      const codeInput = document.getElementById('bookmarklet-code-input');
      copyToClipboard(codeInput.value, 'Código do marcador copiado! 📋');
    });
  }

  if (btnScrapeNow) btnScrapeNow.addEventListener('click', triggerScrape);

  const btnPasteClipboard = document.getElementById('btn-paste-clipboard');
  if (btnPasteClipboard) {
    btnPasteClipboard.addEventListener('click', async () => {
      if (!currentClient) {
        showToast('Selecione um cliente na lista antes de colar os imóveis!', 'error');
        return;
      }
      try {
        let text = '';
        if (navigator.clipboard && navigator.clipboard.readText) {
          text = await navigator.clipboard.readText();
        }
        if (text && text.trim().length > 30) {
          showToast('A extrair imóveis da área de transferência... ⏳');
          const res = await fetch('/api/import-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: currentClient.id, html: text })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`🎉 ${data.total_found} imóveis extraídos para ${currentClient.name}! (${data.added_new || 0} novos)`);
            hideModals();
            await loadClients();
            await loadListings();
          } else {
            showToast(data.error || 'Nenhum imóvel detetado no conteúdo colado', 'error');
            showModal(modalHtml);
            const htmlTextarea = document.getElementById('html-content');
            if (htmlTextarea) htmlTextarea.value = text;
          }
        } else {
          showModal(modalHtml);
        }
      } catch (e) {
        showModal(modalHtml);
      }
    });
  }

  // Atalho global de colar na janela (Ctrl+V) em qualquer lugar
  window.addEventListener('paste', async (e) => {
    if (!currentClient || !modalClient.classList.contains('hidden')) return;
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    if (pastedText && pastedText.length > 50) {
      showToast('A extrair imóveis colados... ⏳');
      try {
        const res = await fetch('/api/import-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: currentClient.id, html: pastedText })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`🎉 ${data.total_found} imóveis extraídos para ${currentClient.name}!`);
          hideModals();
          await loadClients();
          await loadListings();
        } else {
          showToast(data.error || 'Nenhum imóvel detetado no texto colado', 'error');
        }
      } catch (err) {}
    }
  });

  // Função auxiliar para verificar se o conteúdo copiado é genuinamente do Idealista
  function isIdealistaContent(text) {
    if (!text || typeof text !== 'string' || text.length < 60) return false;
    const s = text.toLowerCase();
    const hasIdealistaKeywords = s.includes('idealista.pt') || s.includes('/imovel/') || s.includes('item-info') || (s.includes('€') && s.includes('article') && s.includes('t3'));
    return hasIdealistaKeywords;
  }

  // Atalho global Ctrl+V inteligente — IGNORA se o utilizador estiver a escrever num campo de texto
  window.addEventListener('paste', async (e) => {
    // Se o utilizador estiver a escrever num input, textarea ou com modal de edição aberto, NÃO interceptar
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
    if (!currentClient || !modalClient.classList.contains('hidden')) return;

    const pastedText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    if (!isIdealistaContent(pastedText)) {
      // É texto comum (não é do Idealista) — ignorar silenciosamente
      return;
    }

    showToast('A extrair imóveis do Idealista colados... ⏳');
    try {
      const res = await fetch('/api/import-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: currentClient.id, html: pastedText })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🎉 ${data.total_found} imóveis extraídos para ${currentClient.name}!`);
        hideModals();
        await loadClients();
        await loadListings();
      } else {
        showToast(data.error || 'Nenhum imóvel detetado no conteúdo colado', 'error');
      }
    } catch (err) {}
  });

  if (btnAddDirectLink) {
    btnAddDirectLink.addEventListener('click', () => {
      if (!currentClient) {
        showToast('Selecione um cliente na lista primeiro!', 'error');
        return;
      }
      showModal(modalImport);
      const urlInput = document.getElementById('import-url');
      if (urlInput) setTimeout(() => urlInput.focus(), 150);
    });
  }

  if (formClient) formClient.addEventListener('submit', handleSaveClient);
  if (formConsultant) formConsultant.addEventListener('submit', handleSaveConsultant);
  if (formHtml) formHtml.addEventListener('submit', handleImportHtml);
  if (formImport) formImport.addEventListener('submit', handleImportLink);

  // ── CHAT ASSISTENTE IA ───────────────────────────────────────────────────
  if (btnOpenChat) {
    btnOpenChat.addEventListener('click', () => {
      showModal(modalChat);
      setTimeout(() => chatInput.focus(), 150);
    });
  }

  // Suporte a Enter para submeter no textarea do Chat
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        formChat.dispatchEvent(new Event('submit'));
      }
    });
  }

  if (formChat) {
    formChat.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      // 1. Renderizar mensagem do utilizador
      const userMsg = document.createElement('div');
      userMsg.className = 'chat-msg user-msg';
      userMsg.style.cssText = 'display:flex; gap:0.6rem; align-items:flex-start; justify-content:flex-end;';
      userMsg.innerHTML = `
        <div style="background:#C75233; color:#fff; border-radius:10px; padding:0.8rem 1rem; max-width:85%; font-size:0.92rem; line-height:1.5; box-shadow:0 2px 5px rgba(0,0,0,0.06);">
          ${esc(message).replace(/\n/g, '<br>')}
        </div>
        <div style="background:#C75233; color:#fff; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.9rem;">
          <i class="fa-solid fa-user"></i>
        </div>`;
      chatMessages.appendChild(userMsg);
      chatInput.value = '';
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // 2. Renderizar indicador de escrita
      const typingMsg = document.createElement('div');
      typingMsg.className = 'chat-msg ai-msg typing';
      typingMsg.style.cssText = 'display:flex; gap:0.6rem; align-items:flex-start;';
      typingMsg.innerHTML = `
        <div style="background:#5B7FA6; color:#fff; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.9rem;">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div style="background:#fff; border:1px solid #E2D9D0; border-radius:10px; padding:0.8rem 1rem; font-size:0.88rem; color:#666;">
          <i class="fa-solid fa-spinner fa-spin"></i> A analisar preferências e a qualificar cliente...
        </div>`;
      chatMessages.appendChild(typingMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      try {
        const res = await fetch('/api/chat/parse-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        const data = await res.json();
        typingMsg.remove();

        if (res.ok && data.success) {
          const c = data.client;
          const s = data.summary;
          const titleAction = data.is_update ? '🔄 Ficha Atualizada com Sucesso!' : '🎉 Novo Cliente Registado com Sucesso!';

          const aiMsg = document.createElement('div');
          aiMsg.className = 'chat-msg ai-msg';
          aiMsg.style.cssText = 'display:flex; gap:0.6rem; align-items:flex-start;';
          aiMsg.innerHTML = `
            <div style="background:#5B7FA6; color:#fff; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.9rem;">
              <i class="fa-solid fa-robot"></i>
            </div>
            <div style="background:#fff; border:1px solid #E2D9D0; border-radius:10px; padding:1rem; max-width:88%; font-size:0.9rem; line-height:1.5; color:#2D2D2D; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
              <div style="font-weight:700; color:#5B7FA6; font-size:0.98rem; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
                <i class="fa-solid fa-circle-check" style="color:#5B8C6A;"></i> ${titleAction}
              </div>
              <div style="background:#FBF9F6; border:1px solid #EAE3DC; border-radius:8px; padding:0.75rem; margin-bottom:0.75rem; font-size:0.86rem;">
                <div><strong>👤 Cliente:</strong> ${esc(s.name)}</div>
                <div><strong>🏡 Tipo & Zona:</strong> ${esc(s.property_type)} em ${esc(s.location)}</div>
                <div><strong>💰 Budget Máximo:</strong> ${esc(s.budget)}</div>
                <div><strong>📐 Tipologias:</strong> ${esc(s.typology)}</div>
                <div><strong>✨ Comodidades:</strong> ${esc(s.amenities)}</div>
                <div><strong>⏱ Urgência:</strong> ${esc(s.priority)}</div>
              </div>
              <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <button type="button" class="btn-chat-select-client" data-id="${c.id}" style="background:#5B7FA6; color:#fff; border:none; padding:0.45rem 0.9rem; border-radius:6px; font-size:0.82rem; font-weight:600; cursor:pointer;">
                  <i class="fa-solid fa-user-check"></i> Ver Ficha na SURE
                </button>
                <a href="${data.search_url}" target="_blank" style="background:#C75233; color:#fff; text-decoration:none; padding:0.45rem 0.9rem; border-radius:6px; font-size:0.82rem; font-weight:600; display:inline-flex; align-items:center; gap:0.3rem;">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir no Idealista
                </a>
              </div>
            </div>`;

          aiMsg.querySelector('.btn-chat-select-client').addEventListener('click', () => {
            hideModals();
            selectClient(c);
            loadClients();
            loadListings();
          });

          chatMessages.appendChild(aiMsg);
          chatMessages.scrollTop = chatMessages.scrollHeight;

          showToast(`${titleAction} (${c.name})`);
          await loadClients();
          selectClient(c);
          await loadListings();
        } else {
          const errorMsg = document.createElement('div');
          errorMsg.className = 'chat-msg ai-msg';
          errorMsg.style.cssText = 'display:flex; gap:0.6rem; align-items:flex-start;';
          errorMsg.innerHTML = `
            <div style="background:#E15759; color:#fff; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.9rem;">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div style="background:#fff; border:1px solid #fecaca; border-radius:10px; padding:0.8rem 1rem; max-width:85%; font-size:0.9rem; color:#b91c1c;">
              ${esc(data.error || 'Não foi possível processar a mensagem. Tente especificar o nome do cliente, tipo de imóvel e cidade.')}
            </div>`;
          chatMessages.appendChild(errorMsg);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      } catch (err) {
        typingMsg.remove();
        showToast('Erro de ligação ao processar mensagem', 'error');
      }
    });
  }

  if (filterAllClientsBtn) {
    filterAllClientsBtn.addEventListener('click', () => {
      sidebarFilter = 'all';
      filterAllClientsBtn.classList.add('active');
      if (filterMyClientsBtn) filterMyClientsBtn.classList.remove('active');
      if (filterOverdueClientsBtn) filterOverdueClientsBtn.classList.remove('active');
      renderConsultantsAccordion();
    });
  }

  if (filterMyClientsBtn) {
    filterMyClientsBtn.addEventListener('click', () => {
      sidebarFilter = 'mine';
      filterMyClientsBtn.classList.add('active');
      if (filterAllClientsBtn) filterAllClientsBtn.classList.remove('active');
      if (filterOverdueClientsBtn) filterOverdueClientsBtn.classList.remove('active');
      renderConsultantsAccordion();
    });
  }

  if (filterOverdueClientsBtn) {
    filterOverdueClientsBtn.addEventListener('click', () => {
      sidebarFilter = 'overdue';
      filterOverdueClientsBtn.classList.add('active');
      if (filterAllClientsBtn) filterAllClientsBtn.classList.remove('active');
      if (filterMyClientsBtn) filterMyClientsBtn.classList.remove('active');
      renderConsultantsAccordion();
    });
  }

  // Client Search Bar Listener
  if (inputClientSearch) {
    inputClientSearch.addEventListener('input', (e) => {
      clientSearchQuery = e.target.value;
      if (btnClearClientSearch) {
        if (clientSearchQuery && clientSearchQuery.trim()) {
          btnClearClientSearch.classList.remove('hidden');
        } else {
          btnClearClientSearch.classList.add('hidden');
        }
      }
      renderConsultantsAccordion();
    });
  }

  if (btnClearClientSearch) {
    btnClearClientSearch.addEventListener('click', () => {
      clientSearchQuery = '';
      if (inputClientSearch) {
        inputClientSearch.value = '';
        inputClientSearch.focus();
      }
      btnClearClientSearch.classList.add('hidden');
      renderConsultantsAccordion();
    });
  }

  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      if (currentClient) window.location.href = `/api/export/${currentClient.id}`;
    });
  }

  // ── FORMATTER PARA PARTILHA DE IMÓVEIS (WhatsApp / Email) ───────────────
  function isMultiplePeople(name = '') {
    const clean = (name || '').trim();
    return /\s+(?:e|&|\/|\+)\s+/i.test(clean) || /,\s*/.test(clean);
  }

  function formatIntroMessage(client, count = 1) {
    const name = client ? client.name.trim() : 'Cliente';
    const plural = isMultiplePeople(name);
    if (count === 1) {
      return plural
        ? `Olá ${name}, selecionamos esta opção que vos pode interessar:\n\n`
        : `Olá ${name}, selecionamos esta opção que lhe pode interessar:\n\n`;
    }
    return plural
      ? `Olá ${name}, selecionamos estas ${count} opções que vos podem interessar:\n\n`
      : `Olá ${name}, selecionamos estas ${count} opções que lhe podem interessar:\n\n`;
  }

  function formatOutroMessage(client) {
    const name = client ? client.name.trim() : '';
    const plural = isMultiplePeople(name);
    return plural
      ? `\n\nAgradecemos sempre o envio de algum feedback para nos irmos adaptado às vossas preferências! 😀`
      : `\n\nAgradecemos sempre o envio de algum feedback para nos irmos adaptado às suas preferências! 😀`;
  }

  function formatListingShareText(item, idx = null) {
    const title = item.title || 'Imóvel';
    const price = item.price || 'Sob Consulta';
    const loc = item.location || (currentClient ? currentClient.location : '');
    const m2 = item.price_m2 ? ` (${item.price_m2})` : '';
    const area = item.area ? ` • 📐 ${item.area}` : '';
    const specs = (item.details || []).join(' • ');
    
    // Regra de Mercado: se o preço/m² estiver acima da média de mercado, NUNCA incluir essa informação para o cliente
    let m2Text = '';
    if (item.m2_analysis && item.m2_analysis.badge_text) {
      const diffPct = typeof item.m2_analysis.diff_pct === 'number' ? item.m2_analysis.diff_pct : 0;
      const isAbove = item.m2_analysis.status === 'above' || diffPct > 0 || /acima|⚠️/i.test(item.m2_analysis.badge_text);
      if (!isAbove && diffPct < 0) {
        m2Text = `\n📊 Mercado: ${item.m2_analysis.badge_text}`;
      }
    }

    const header = idx !== null ? `🏡 *Opção ${idx + 1}: ${title}*` : `🏡 *${title}*`;

    return `${header}
📍 *Zona:* ${loc}
💰 *Preço:* ${price}${m2}${area}${specs ? `\n✨ *Caraterísticas:* ${specs}` : ''}${m2Text}
🔗 *Link:* ${item.link}`;
  }

  function formatCompleteShareMessage(items, client = currentClient) {
    const list = Array.isArray(items) ? items : [items];
    if (list.length === 0) return '';
    const intro = formatIntroMessage(client, list.length);
    const body = list.map((it, i) => formatListingShareText(it, list.length > 1 ? i : null)).join('\n\n---\n\n');
    const outro = formatOutroMessage(client);
    return intro + body + outro;
  }

  // Selection Dock Actions
  if (btnCopySelection) {
    btnCopySelection.addEventListener('click', () => {
      if (selectedListingIds.size === 0) return;
      const selectedItems = listings.filter(l => selectedListingIds.has(l.id));
      const text = formatCompleteShareMessage(selectedItems, currentClient);

      copyToClipboard(text, `${selectedItems.length} opções copiadas prontas para envio! 📋`);
    });
  }

  if (btnMarkSelectionSent) {
    btnMarkSelectionSent.addEventListener('click', async () => {
      if (selectedListingIds.size === 0) return;
      const ids = Array.from(selectedListingIds);
      await fetch('/api/listings/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_ids: ids, client_id: currentClient.id, status: 'enviado' })
      });

      listings.forEach(it => {
        if (selectedListingIds.has(it.id)) it.status = 'enviado';
      });

      const count = selectedListingIds.size;
      selectedListingIds.clear();
      updateSelectionDock();
      showToast(`${count} imóveis marcados como ENVIADOS ✉`);
      await loadClients();
      await loadListings();
    });
  }

  if (btnClearSelection) {
    btnClearSelection.addEventListener('click', () => {
      selectedListingIds.clear();
      updateSelectionDock();
      renderListings();
      showToast('Seleção de envio limpa');
    });
  }

  document.querySelectorAll('.btn-close-modal').forEach(b => b.addEventListener('click', hideModals));

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentFilter = e.currentTarget.dataset.filter;
      renderListings();
    });
  });

  if (inputSearchFilter) inputSearchFilter.addEventListener('input', renderListings);

  // Slider events
  if (sliderBtnPrev) sliderBtnPrev.addEventListener('click', prevSlide);
  if (sliderBtnNext) sliderBtnNext.addEventListener('click', nextSlide);
  document.addEventListener('keydown', e => {
    if (!modalDetail.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'Escape') hideModals();
    }
  });

  // ── DATA LOADING ─────────────────────────────────────────────────────────
  async function loadConsultants() {
    let localCons = getLocalData(STORAGE_KEYS.CONSULTANTS, []);
    try {
      const res = await fetch('/api/consultants');
      if (res.ok) {
        const serverCons = await res.json();
        if (Array.isArray(serverCons) && serverCons.length > 0) {
          const consMap = new Map(serverCons.map(c => [c.id, c]));
          localCons.forEach(c => {
            if (!consMap.has(c.id)) consMap.set(c.id, c);
          });
          consultants = Array.from(consMap.values());
        } else if (localCons.length > 0) {
          consultants = localCons;
        }
      } else if (localCons.length > 0) {
        consultants = localCons;
      }
    } catch (e) {
      if (localCons.length > 0) consultants = localCons;
      else consultants = [{ id: 'consultant-geral', name: 'Geral', color: '#C75233' }];
    }
    if (!consultants || consultants.length === 0) {
      consultants = [{ id: 'consultant-geral', name: 'Geral', color: '#C75233' }];
    }
    setLocalData(STORAGE_KEYS.CONSULTANTS, consultants);

    // Fechar todos os dropdowns de consultores por defeito na abertura da app
    if (collapsedConsultants.size === 0) {
      consultants.forEach(c => collapsedConsultants.add(c.id));
    }
  }

  function isCurrentUserAdmin() {
    if (!currentUser) return true;
    return currentUser.role === 'admin' || currentUser.id === 'assistant-geral' || currentUser.username === 'geral';
  }

  function getAllowedClients() {
    if (isCurrentUserAdmin()) {
      return clients;
    }
    const myId = currentUser ? currentUser.id : 'assistant-geral';
    return clients.filter(c => (c.assistant_id || 'assistant-geral') === myId);
  }

  async function loadClients() {
    let localClients = getLocalData(STORAGE_KEYS.CLIENTS, []);
    let localListings = getLocalData(STORAGE_KEYS.LISTINGS, []);

    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const serverClients = await res.json();
        clients = Array.isArray(serverClients) ? serverClients : [];
      } else if (localClients.length > 0) {
        clients = localClients;
      }
    } catch (e) {
      if (localClients.length > 0) {
        clients = localClients;
      }
    }

    setLocalData(STORAGE_KEYS.CLIENTS, clients);
    updateSidebarCounters();
    renderConsultantsAccordion();
    updateBackupStats();

    const allowed = getAllowedClients();
    const savedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLIENT);
    if (savedActiveId && !currentClient) {
      const found = allowed.find(c => c.id === savedActiveId);
      if (found) selectClient(found);
    }

    if (allowed.length > 0 && (!currentClient || !allowed.some(c => c.id === currentClient.id))) {
      selectClient(allowed[0]);
    } else if (currentClient) {
      const found = allowed.find(c => c.id === currentClient.id);
      if (found) selectClient(found);
      else if (allowed.length > 0) selectClient(allowed[0]);
    }
  }

  function updateSidebarCounters() {
    const allowed = getAllowedClients();
    if (sidebarCountAll) sidebarCountAll.textContent = allowed.length;
    if (sidebarCountMine) {
      sidebarCountMine.textContent = allowed.length;
    }
    if (sidebarCountOverdue) {
      const overdueCount = allowed.filter(c => c.is_overdue).length;
      sidebarCountOverdue.textContent = overdueCount;
    }
  }

  // ── CONSULTANTS & CLIENTS ACCORDION RENDERING ────────────────────────────
  function renderConsultantsAccordion() {
    consultantsAccordionEl.innerHTML = '';

    if (!consultants.length) {
      consultantsAccordionEl.innerHTML = '<div class="loading-spinner">Sem consultores configurados.</div>';
      return;
    }

    const allowed = getAllowedClients();
    const isAdmin = isCurrentUserAdmin();
    let totalRenderedClients = 0;

    consultants.forEach(cons => {
      let consClients = allowed.filter(c => (c.consultant_id || 'consultant-geral') === cons.id);

      // Regra de Acesso: Administrativos normais só veem consultores dos quais têm clientes atribuídos
      if (!isAdmin && consClients.length === 0 && (!clientSearchQuery || !clientSearchQuery.trim())) {
        return;
      }

      if (sidebarFilter === 'mine') {
        consClients = consClients.filter(c => (c.assistant_id || 'assistant-geral') === (currentUser ? currentUser.id : 'assistant-geral'));
      } else if (sidebarFilter === 'overdue') {
        consClients = consClients.filter(c => c.is_overdue);
      }

      if (clientSearchQuery && clientSearchQuery.trim()) {
        const q = clientSearchQuery.toLowerCase().trim();
        consClients = consClients.filter(c => {
          return (c.name || '').toLowerCase().includes(q) ||
                 (c.location || '').toLowerCase().includes(q) ||
                 (c.property_type || '').toLowerCase().includes(q) ||
                 (c.notes || '').toLowerCase().includes(q) ||
                 (c.operation || '').toLowerCase().includes(q) ||
                 (c.priority || '').toLowerCase().includes(q);
        });
      }

      if (!isAdmin && consClients.length === 0) {
        return;
      }

      totalRenderedClients += consClients.length;

      const overdueCount = consClients.filter(c => c.is_overdue).length;
      const isCollapsed = clientSearchQuery && clientSearchQuery.trim() ? false : collapsedConsultants.has(cons.id);

      const groupEl = document.createElement('div');
      groupEl.className = `consultant-group ${isCollapsed ? 'collapsed' : ''}`;
      groupEl.dataset.consultantId = cons.id;

      // Dropzone events
      groupEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        groupEl.classList.add('drag-over');
      });
      groupEl.addEventListener('dragleave', () => {
        groupEl.classList.remove('drag-over');
      });
      groupEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        groupEl.classList.remove('drag-over');
        if (draggedClientId) {
          await reassignClientConsultant(draggedClientId, cons.id);
          draggedClientId = null;
        }
      });

      // Header
      const headerEl = document.createElement('div');
      headerEl.className = 'consultant-header';
      headerEl.innerHTML = `
        <div class="consultant-title">
          <span class="consultant-color-dot" style="background:${cons.color || '#C75233'};"></span>
          <span>${esc(cons.name)}</span>
        </div>
        <div class="consultant-badges-row">
          ${overdueCount > 0 ? `<span class="consultant-overdue-badge" title="${overdueCount} clientes em atraso">⚠️ ${overdueCount}</span>` : ''}
          <span class="consultant-count-badge">${consClients.length}</span>
          ${isAdmin && cons.id !== 'consultant-geral' ? `
            <button class="consultant-del-btn" title="Apagar consultor">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ''}
          <i class="fa-solid fa-chevron-down consultant-arrow"></i>
        </div>`;

      headerEl.addEventListener('click', (e) => {
        if (e.target.closest('.consultant-del-btn')) return;
        if (collapsedConsultants.has(cons.id)) {
          collapsedConsultants.delete(cons.id);
          groupEl.classList.remove('collapsed');
        } else {
          collapsedConsultants.add(cons.id);
          groupEl.classList.add('collapsed');
        }
      });

      const delBtn = headerEl.querySelector('.consultant-del-btn');
      if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm(`Tem a certeza que deseja APAGAR o consultor "${cons.name}"? Os seus clientes serão automaticamente transferidos para a equipa Geral.`)) return;
          try {
            const res = await fetch(`/api/consultants/${cons.id}`, { method: 'DELETE' });
            if (res.ok) {
              showToast(`Consultor "${cons.name}" apagado. Clientes transferidos para Geral. 🗑️`);
              await loadConsultants();
              await loadClients();
            }
          } catch (err) {
            showToast('Erro ao apagar consultor', 'error');
          }
        });
      }

      groupEl.appendChild(headerEl);

      // Client list container
      const listEl = document.createElement('div');
      listEl.className = 'consultant-client-list';

      if (!consClients.length) {
        listEl.className += ' empty-dropzone';
        listEl.textContent = 'Arraste clientes para aqui';
      } else {
        consClients.forEach(c => {
          const clientCard = document.createElement('div');
          const isSelected = currentClient?.id === c.id;
          clientCard.className = `client-item ${isSelected ? 'active' : ''} ${c.is_overdue ? 'is-overdue' : ''}`;
          clientCard.draggable = true;
          clientCard.dataset.clientId = c.id;

          const prio = c.priority || 'U';
          const prioClass = prio === 'SU' ? 'badge-su' : (prio === 'U' ? 'badge-u' : 'badge-s');
          const prioDesc = prio === 'SU' ? 'SU (2d)' : (prio === 'U' ? 'U (5d)' : 'S (10d)');

          const clientAst = assistants.find(a => a.id === (c.assistant_id || 'assistant-geral'));
          const astTag = clientAst && clientAst.id !== 'assistant-geral' ? `
            <span class="assistant-tag" style="background:${clientAst.color || '#5B7FA6'};font-size:0.68rem;padding:1px 5px;border-radius:4px;" title="Administrativo Responsável: ${esc(clientAst.name)}">
              <i class="fa-solid fa-user-check"></i> ${esc(clientAst.name.split(' ')[0])}
            </span>` : '';

          clientCard.innerHTML = `
            <div class="client-item-top">
              <span class="client-item-name">${esc(c.name)}</span>
              <div style="display:flex;align-items:center;gap:4px;">
                ${astTag}
                <span class="badge-priority ${prioClass}" title="Prioridade ${prioDesc}">${prio}</span>
                ${c.is_overdue ? `<span class="badge-overdue-pill" title="${c.days_overdue} dias de atraso no envio">⚠️ ${c.days_overdue}d</span>` : ''}
              </div>
            </div>
            <div class="client-item-bottom">
              <span>${cap(c.operation)} • ${cap(c.location)}</span>
              <div class="client-item-actions">
                <button class="client-action-btn btn-edit" title="Editar critérios"><i class="fa-solid fa-pen"></i></button>
                <button class="client-action-btn btn-del" title="Apagar cliente"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>`;

          // Drag events
          clientCard.addEventListener('dragstart', (e) => {
            draggedClientId = c.id;
            clientCard.classList.add('dragging');
            e.dataTransfer.setData('text/plain', c.id);
          });
          clientCard.addEventListener('dragend', () => {
            clientCard.classList.remove('dragging');
          });

          // Click selection
          clientCard.addEventListener('click', (e) => {
            if (!e.target.closest('.client-action-btn')) {
              selectClient(c);
            }
          });

          // Action buttons
          clientCard.querySelector('.btn-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            showClientModal(c);
          });
          clientCard.querySelector('.btn-del').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteClient(c.id);
          });

          listEl.appendChild(clientCard);
        });
      }

      groupEl.appendChild(listEl);
      consultantsAccordionEl.appendChild(groupEl);
    });

    if (clientSearchQuery && clientSearchQuery.trim() && totalRenderedClients === 0) {
      consultantsAccordionEl.innerHTML = `
        <div style="padding:1.5rem 1rem; text-align:center; color:var(--cinza); font-size:0.85rem; line-height:1.5;">
          <i class="fa-solid fa-user-xmark" style="font-size:1.8rem; opacity:0.5; margin-bottom:0.5rem; display:block;"></i>
          Nenhum cliente encontrado para "<strong>${esc(clientSearchQuery)}</strong>"
        </div>`;
    }
  }

  async function reassignClientConsultant(clientId, consultantId) {
    try {
      const res = await fetch('/api/clients/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, consultant_id: consultantId })
      });
      if (res.ok) {
        const consName = consultants.find(c => c.id === consultantId)?.name || 'Consultor';
        showToast(`Cliente reatribuído a ${consName} com sucesso! 🤝`);
        await loadClients();
      }
    } catch (e) {
      showToast('Erro ao reatribuir cliente', 'error');
    }
  }

  function selectClient(c) {
    currentClient = c;
    if (c && c.id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLIENT, c.id);
    }
    // Resetar memória de clipboard ao mudar de cliente — garante nova captura automática
    lastAutoClipboard = '';
    renderConsultantsAccordion();

    currentClientNameEl.textContent = c.name;
    btnEditClientHeader.disabled = false;
    if (btnClearListingsHeader) btnClearListingsHeader.disabled = false;
    if (btnClearListings) btnClearListings.disabled = false;
    btnDeleteClientHeader.disabled = false;
    if (btnOpenIdealista) btnOpenIdealista.disabled = false;

    // Atualizar estado e cores dos botões da Google Drive para este cliente
    refreshClientDriveStatus();

    // Sincronizar cliente ativo com o servidor para o Bookmarklet 1-Clique
    fetch('/api/active-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: c.id })
    }).catch(() => {});

    // Atualizar link direto do Idealista com os critérios deste cliente
    if (btnOpenIdealista) {
      fetch(`/api/client-search-url/${c.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.url) btnOpenIdealista.href = data.url;
        })
        .catch(() => {});
    }

    // Header priority badge
    const prio = c.priority || 'U';
    const prioClass = prio === 'SU' ? 'badge-su' : (prio === 'U' ? 'badge-u' : 'badge-s');
    const prioDesc = prio === 'SU' ? 'Super Urgente (a cada 2 dias)' : (prio === 'U' ? 'Urgente (a cada 5 dias)' : 'Standard (a cada 10 dias)');
    const cons = consultants.find(con => con.id === c.consultant_id);

    headerPriorityBadge.innerHTML = `
      <span class="badge-priority ${prioClass}" style="padding:4px 9px;font-size:.78rem;" title="Frequência: ${prioDesc}">${prio}</span>
      ${c.is_overdue ? `<span class="badge badge-overdue-header"><i class="fa-solid fa-triangle-exclamation"></i> EM ATRASO (${c.days_overdue} dias sem envio)</span>` : ''}`;

    const typos = (Array.isArray(c.typology) ? c.typology : [c.typology]).filter(Boolean).join(', ').toUpperCase() || 'Todas';
    let priceStr = c.min_price && c.max_price ? `${formatMoney(c.min_price)} – ${formatMoney(c.max_price)}`
      : c.max_price ? `Até ${formatMoney(c.max_price)}`
      : c.min_price ? `Desde ${formatMoney(c.min_price)}`
      : 'Sem limite de preço';

    // Property Type Label
    const typeLabels = {
      apartamentos: 'Apartamento',
      moradias: 'Moradia',
      'moradia-terrea': 'Moradia Térrea',
      terrenos: 'Terreno',
      predios: 'Prédio',
      lojas: 'Loja / Comércio',
      escritorios: 'Escritório',
      garagens: 'Garagem',
      trespasse: 'Trespasse',
      empreendimentos: 'Construção Nova'
    };
    const typeLabel = typeLabels[c.property_type] || 'Apartamento / Casa';

    const amenitiesList = (Array.isArray(c.amenities) ? c.amenities : []).map(a => {
      const map = {
        garagem: '🚗 Garagem Box',
        'lugar-garagem': '🅿️ Lugar Garagem',
        piscina: '🏊 Piscina',
        elevador: `🛗 Elevador${c.elevator_floor && c.elevator_floor !== '0' ? ` (≥${c.elevator_floor}º piso)` : ''}`,
        'construcao-nova': '🏗️ Nova Construção',
        varanda: '🌅 Varanda/Terraço',
        'ar-condicionado': '❄️ AC',
        jardim: '🌿 Jardim'
      };
      return map[a] ? `<span class="badge">${map[a]}</span>` : '';
    }).join(' ');

    const areaBadge = c.min_area ? `<span class="badge"><i class="fa-solid fa-ruler-combined"></i> Mín. ${c.min_area} m²</span>` : '';
    const clientAst = assistants.find(a => a.id === (c.assistant_id || 'assistant-geral'));
    const astBadge = clientAst ? `<span class="badge" style="background:${clientAst.color || '#5B7FA6'};color:#fff;"><i class="fa-solid fa-user-check"></i> Procura: ${esc(clientAst.name)}</span>` : '';
    const zohoBadge = c.zoho_id ? `<span class="badge" style="background:#e0523d;color:#fff;" title="Sincronizado com Zoho CRM (ID: ${c.zoho_id})"><i class="fa-solid fa-cloud"></i> Zoho CRM</span>` : '';

    clientBadgesEl.innerHTML = `
      <span class="badge"><i class="fa-solid fa-user-tie"></i> ${esc(cons ? cons.name : 'Geral')}</span>
      ${astBadge}
      ${zohoBadge}
      <span class="badge badge-highlight"><i class="fa-solid fa-building"></i> ${esc(typeLabel)}</span>
      <span class="badge badge-highlight"><i class="fa-solid fa-tag"></i> ${cap(c.operation)}</span>
      <span class="badge"><i class="fa-solid fa-location-dot"></i> ${cap(c.location)}</span>
      <span class="badge"><i class="fa-solid fa-euro-sign"></i> ${priceStr}</span>
      <span class="badge"><i class="fa-solid fa-bed"></i> ${typos}</span>
      ${areaBadge}
      ${amenitiesList}`;

    // Atualizar botões de ação do Zoho CRM no Header
    const btnZohoDeal = document.getElementById('btn-zoho-deal-open');
    const btnZohoNote = document.getElementById('btn-zoho-add-note');
    if (btnZohoDeal) {
      if (c.zoho_id) {
        btnZohoDeal.classList.remove('hidden');
        btnZohoDeal.onclick = (e) => {
          e.preventDefault();
          window.open(`https://crm.zoho.eu/crm/tab/Deals/${c.zoho_id}`, '_blank');
        };
      } else {
        btnZohoDeal.classList.add('hidden');
      }
    }
    if (btnZohoNote) {
      if (c.zoho_id) {
        btnZohoNote.classList.remove('hidden');
        btnZohoNote.onclick = (e) => {
          e.preventDefault();
          showZohoNoteModal(c);
        };
      } else {
        btnZohoNote.classList.add('hidden');
      }
    }

    loadListings();
  }

  // ── CLIENT MODAL (CREATE / EDIT) ─────────────────────────────────────────
  function showClientModal(clientToEdit = null) {
    formClient.reset();
    document.querySelectorAll('input[name="typology"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="amenities"]').forEach(cb => cb.checked = false);

    // Populate consultants dropdown
    const selectCons = document.getElementById('client-consultant');
    if (selectCons) {
      selectCons.innerHTML = '';
      consultants.forEach(con => {
        const opt = document.createElement('option');
        opt.value = con.id;
        opt.textContent = con.name;
        selectCons.appendChild(opt);
      });
    }

    // Populate assistants dropdown
    const selectAst = document.getElementById('client-assistant');
    if (selectAst) {
      selectAst.innerHTML = '';
      assistants.forEach(ast => {
        const opt = document.createElement('option');
        opt.value = ast.id;
        opt.textContent = ast.name;
        selectAst.appendChild(opt);
      });
    }

    if (clientToEdit) {
      document.getElementById('modal-client-title').textContent = 'Editar Cliente & Preferências';
      document.getElementById('client-id').value = clientToEdit.id;
      document.getElementById('client-name').value = clientToEdit.name || '';
      if (selectCons) selectCons.value = clientToEdit.consultant_id || 'consultant-geral';
      if (selectAst) selectAst.value = clientToEdit.assistant_id || 'assistant-geral';
      document.getElementById('client-priority').value = clientToEdit.priority || 'U';
      document.getElementById('client-op').value = clientToEdit.operation || 'comprar';
      document.getElementById('client-type').value = clientToEdit.property_type || 'apartamentos';
      document.getElementById('client-location').value = clientToEdit.location || '';
      document.getElementById('client-min-price').value = clientToEdit.min_price || '';
      document.getElementById('client-max-price').value = clientToEdit.max_price || '';
      document.getElementById('client-min-area').value = clientToEdit.min_area || '';
      document.getElementById('client-elevator-floor').value = clientToEdit.elevator_floor || '0';
      document.getElementById('client-notes').value = clientToEdit.notes || '';
      document.getElementById('client-custom-search-url').value = clientToEdit.custom_search_url || '';

      const typos = Array.isArray(clientToEdit.typology) ? clientToEdit.typology : [clientToEdit.typology].filter(Boolean);
      typos.forEach(t => {
        const cb = document.querySelector(`input[name="typology"][value="${t.toLowerCase()}"]`);
        if (cb) cb.checked = true;
      });

      const ams = Array.isArray(clientToEdit.amenities) ? clientToEdit.amenities : [];
      ams.forEach(a => {
        const cb = document.querySelector(`input[name="amenities"][value="${a}"]`);
        if (cb) cb.checked = true;
      });
    } else {
      document.getElementById('modal-client-title').textContent = 'Novo Cliente';
      document.getElementById('client-id').value = '';
      if (selectAst) selectAst.value = currentUser ? currentUser.id : 'assistant-geral';
      document.getElementById('client-priority').value = 'U';
      document.getElementById('client-type').value = 'apartamentos';
      document.getElementById('client-min-area').value = '';
      document.getElementById('client-elevator-floor').value = '0';
      document.getElementById('client-custom-search-url').value = '';
      ['t2', 't3'].forEach(v => {
        const cb = document.querySelector(`input[name="typology"][value="${v}"]`);
        if (cb) cb.checked = true;
      });
    }
    showModal(modalClient);
  }

  async function handleSaveClient(e) {
    e.preventDefault();
    const typologies = [...document.querySelectorAll('input[name="typology"]:checked')].map(cb => cb.value);
    const amenities = [...document.querySelectorAll('input[name="amenities"]:checked')].map(cb => cb.value);

    const payload = {
      id: document.getElementById('client-id').value || ('client-' + Math.random().toString(36).substring(2, 9)),
      name: document.getElementById('client-name').value.trim(),
      consultant_id: document.getElementById('client-consultant')?.value || 'consultant-geral',
      assistant_id: document.getElementById('client-assistant')?.value || (currentUser ? currentUser.id : 'assistant-geral'),
      priority: document.getElementById('client-priority').value,
      operation: document.getElementById('client-op').value,
      property_type: document.getElementById('client-type').value,
      location: document.getElementById('client-location').value.trim(),
      min_price: +document.getElementById('client-min-price').value || null,
      max_price: +document.getElementById('client-max-price').value || null,
      min_area: +document.getElementById('client-min-area').value || null,
      typology: typologies,
      amenities: amenities,
      elevator_floor: document.getElementById('client-elevator-floor').value,
      notes: document.getElementById('client-notes').value.trim(),
      custom_search_url: document.getElementById('client-custom-search-url').value.trim() || null
    };

    // Guardar imediatamente no estado local e localStorage
    const localIdx = clients.findIndex(c => c.id === payload.id);
    if (localIdx !== -1) {
      clients[localIdx] = { ...clients[localIdx], ...payload, updated_at: new Date().toISOString() };
    } else {
      payload.created_at = new Date().toISOString();
      clients.push(payload);
    }
    setLocalData(STORAGE_KEYS.CLIENTS, clients);
    updateSidebarCounters();
    renderConsultantsAccordion();
    updateBackupStats();

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        const sIdx = clients.findIndex(c => c.id === saved.id);
        if (sIdx !== -1) clients[sIdx] = saved;
        setLocalData(STORAGE_KEYS.CLIENTS, clients);
        showToast('Cliente guardado em memória com sucesso! 💾');
        hideModals();
        await loadClients();
        selectClient(saved);
      } else {
        showToast('Cliente guardado na memória do navegador! 💾');
        hideModals();
        selectClient(payload);
      }
    } catch (e) {
      showToast('Cliente guardado na memória do navegador! 💾');
      hideModals();
      selectClient(payload);
    }
  }

  async function handleDeleteClient(clientId) {
    const clientToDelete = clients.find(c => c.id === clientId);
    if (!clientToDelete) return;
    if (!confirm(`Tem a certeza que deseja APAGAR permanentemente o cliente "${clientToDelete.name}" e todas as suas listagens?`)) return;

    // Atualizar imediatamente o estado local e localStorage
    clients = clients.filter(c => c.id !== clientId);
    setLocalData(STORAGE_KEYS.CLIENTS, clients);

    // Remover listings locais deste cliente
    let allLocalListings = getLocalData(STORAGE_KEYS.LISTINGS, []);
    allLocalListings = allLocalListings.filter(l => l.client_id !== clientId);
    setLocalData(STORAGE_KEYS.LISTINGS, allLocalListings);

    if (currentClient?.id === clientId) {
      currentClient = null;
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CLIENT);
    }
    updateSidebarCounters();
    renderConsultantsAccordion();
    updateBackupStats();

    try {
      await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
    } catch (e) {}

    showToast(`Cliente "${clientToDelete.name}" apagado com sucesso. 🗑️`);
    await loadClients();
    if (!clients.length) {
      currentClientNameEl.textContent = 'Selecione um Cliente';
      headerPriorityBadge.innerHTML = '';
      clientBadgesEl.innerHTML = '';
      listingsGridEl.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-users"></i>
          <h3>Nenhum cliente ativo</h3>
          <p>Adicione um novo cliente no botão <strong>+</strong> da barra lateral.</p>
        </div>`;
      top3SectionEl.classList.add('hidden');
    }
  }

  async function handleClearClientListings() {
    if (!currentClient) {
      showToast('Selecione um cliente primeiro!', 'error');
      return;
    }
    if (!listings || !listings.length) {
      showToast(`O cliente "${currentClient.name}" não tem imóveis guardados.`, 'info');
      return;
    }
    if (!confirm(`Tem a certeza que deseja LIMPAR todos os ${listings.length} imóveis da procura de "${currentClient.name}"?\n\n(Apenas a lista de imóveis deste cliente será limpa. O cliente e os seus critérios serão mantidos).`)) {
      return;
    }

    try {
      showToast('A limpar imóveis... ⏳');
      // Limpar no localStorage
      let allLocalListings = getLocalData(STORAGE_KEYS.LISTINGS, []);
      allLocalListings = allLocalListings.filter(l => l.client_id !== currentClient.id);
      setLocalData(STORAGE_KEYS.LISTINGS, allLocalListings);
      listings = [];

      const res = await fetch(`/api/listings/clear/${currentClient.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🧹 ${data.deletedCount || listings.length} imóveis limpos com sucesso!`);
      } else {
        showToast('Imóveis limpos localmente com sucesso! 🧹');
      }
      selectedListingIds.clear();
      updateSelectionDock();
      updateBackupStats();
      await loadClients();
      await loadListings();
    } catch (err) {
      showToast('Imóveis limpos localmente com sucesso! 🧹');
      selectedListingIds.clear();
      updateSelectionDock();
      await loadListings();
    }
  }

  async function handleEnrichListings() {
    if (!currentClient) {
      showToast('Selecione um cliente primeiro!', 'error');
      return;
    }
    if (!listings || !listings.length) {
      showToast(`O cliente "${currentClient.name}" não tem imóveis para atualizar.`, 'info');
      return;
    }

    const origHtml = btnEnrichListings ? btnEnrichListings.innerHTML : '';
    if (btnEnrichListings) {
      btnEnrichListings.disabled = true;
      btnEnrichListings.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A atualizar...';
    }

    showToast('A obter fotos HD, preços e detalhes dos imóveis... ⏳');

    try {
      const res = await fetch(`/api/listings/enrich/${currentClient.id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Dados atualizados com sucesso! 🎉');
        await loadClients();
        await loadListings();
      } else {
        showToast(data.error || 'Não foi possível atualizar dados', 'error');
      }
    } catch (e) {
      showToast('Erro de comunicação ao atualizar dados', 'error');
    } finally {
      if (btnEnrichListings) {
        btnEnrichListings.disabled = false;
        btnEnrichListings.innerHTML = origHtml;
      }
    }
  }

  if (btnClearListingsHeader) btnClearListingsHeader.addEventListener('click', handleClearClientListings);
  if (btnClearListings) btnClearListings.addEventListener('click', handleClearClientListings);
  if (btnEnrichListings) btnEnrichListings.addEventListener('click', handleEnrichListings);

  // ── CONSULTANT MODAL ─────────────────────────────────────────────────────
  async function handleSaveConsultant(e) {
    e.preventDefault();
    const name = document.getElementById('consultant-name').value.trim();
    const color = document.getElementById('consultant-color').value;

    const newCons = {
      id: 'consultant-' + Math.random().toString(36).substring(2, 9),
      name,
      color: color || '#C75233'
    };
    consultants.push(newCons);
    setLocalData(STORAGE_KEYS.CONSULTANTS, consultants);
    renderConsultantsAccordion();

    try {
      const res = await fetch('/api/consultants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      if (res.ok) {
        const saved = await res.json();
        const idx = consultants.findIndex(c => c.id === newCons.id);
        if (idx !== -1) consultants[idx] = saved;
        setLocalData(STORAGE_KEYS.CONSULTANTS, consultants);
      }
    } catch (e) {}

    showToast(`Consultor "${name}" adicionado com sucesso! 👔`);
    hideModals();
    await loadConsultants();
    renderConsultantsAccordion();
  }

  function persistCurrentListings() {
    if (!currentClient) return;
    let allListings = getLocalData(STORAGE_KEYS.LISTINGS, []);
    allListings = allListings.filter(l => l.client_id !== currentClient.id);
    allListings.push(...listings);
    setLocalData(STORAGE_KEYS.LISTINGS, allListings);
    updateBackupStats();
  }

  // ── LISTINGS MANAGEMENT ──────────────────────────────────────────────────
  async function loadListings() {
    if (!currentClient) return;
    let allLocalListings = getLocalData(STORAGE_KEYS.LISTINGS, []);
    let clientLocalListings = allLocalListings.filter(l => l.client_id === currentClient.id);

    try {
      const res = await fetch(`/api/listings/${currentClient.id}`);
      if (res.ok) {
        const serverListings = await res.json();
        if (Array.isArray(serverListings) && serverListings.length > 0) {
          listings = serverListings;
          persistCurrentListings();
        } else if (clientLocalListings.length > 0) {
          listings = clientLocalListings;
          fetch('/api/sync-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listings: clientLocalListings })
          }).catch(() => {});
        } else {
          listings = [];
        }
      } else if (clientLocalListings.length > 0) {
        listings = clientLocalListings;
      } else {
        listings = [];
      }
    } catch (e) {
      if (clientLocalListings.length > 0) {
        listings = clientLocalListings;
      } else {
        listings = [];
      }
    }

    updateCounters();
    renderTop3();
    renderListings();
  }

  function updateSelectionDock() {
    if (selectedListingIds.size > 0) {
      selectionDock.classList.remove('hidden');
      selectionCountEl.textContent = selectedListingIds.size;
    } else {
      selectionDock.classList.add('hidden');
    }
  }

  function updateCounters() {
    countAll.textContent       = listings.length;
    countNovo.textContent      = listings.filter(l => l.status === 'novo' || !l.status).length;
    countEnviado.textContent   = listings.filter(l => l.status === 'enviado').length;
    countInteresse.textContent = listings.filter(l => l.status === 'interesse').length;
    countVisita.textContent    = listings.filter(l => l.status === 'visita').length;
    countFav.textContent       = listings.filter(l => l.status === 'favorito').length;
    countRejeitado.textContent = listings.filter(l => l.status === 'rejeitado').length;
  }

  // ── TOP 3 RECOMMENDATIONS ────────────────────────────────────────────────
  function renderTop3() {
    const candidates = listings.filter(l => l.status !== 'enviado' && l.status !== 'rejeitado');
    const top3 = candidates.slice(0, 3);

    if (!top3.length) {
      top3SectionEl.classList.add('hidden');
      return;
    }

    top3SectionEl.classList.remove('hidden');
    top3GridEl.innerHTML = '';

    top3.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'top3-card';
      const score = item.match_score || 85;
      const reasons = item.match_reasons || ['🎯 Compatível com o Cliente'];
      const reasonsHtml = reasons.map(r => `<span style="display:inline-block;background:rgba(199,82,51,0.08);color:var(--terracota);font-size:0.75rem;font-weight:600;padding:2px 8px;border-radius:4px;margin-right:4px;margin-bottom:4px;">${esc(r)}</span>`).join('');
      const photo = item.photo || (item.photos && item.photos[0]) || '';
      const dropHtml = item.price_drop ? `<span style="display:inline-block;background:#e53e3e;color:#fff;font-size:0.72rem;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:6px;">🔻 ${esc(item.price_drop)}</span>` : '';

      let m2BadgeTop3 = '';
      if (item.m2_analysis && item.m2_analysis.short_badge) {
        const bg = item.m2_analysis.status === 'opportunity' ? '#ebf8ff' : (item.m2_analysis.status === 'fair' ? '#f0fff4' : '#fffaf0');
        const textCol = item.m2_analysis.color || '#2b6cb0';
        m2BadgeTop3 = `<div style="background:${bg};color:${textCol};font-size:0.75rem;font-weight:700;padding:3px 6px;border-radius:4px;margin-bottom:0.4rem;">${esc(item.m2_analysis.badge_text || item.m2_analysis.short_badge)}</div>`;
      }

      const portalSource = item.source || (item.link && item.link.includes('remax') ? 'remax' : (item.link && item.link.includes('zome') ? 'zome' : (item.link && item.link.includes('arys') ? 'arys' : 'idealista')));
      const sourceBadgeHtml = `<span class="badge-source source-${portalSource}" style="position:absolute;bottom:8px;left:8px;">${portalSource.toUpperCase()}</span>`;

      card.innerHTML = `
        <div style="position:relative;margin-bottom:0.75rem;">
          ${photo ? `<img src="${photo}" alt="${esc(item.title)}" style="width:100%;height:130px;object-fit:cover;border-radius:6px;" onerror="this.remove()">` : ''}
          <div class="top3-rank-badge" style="position:absolute;top:8px;left:8px;margin:0;">#${idx + 1} Recomendado</div>
          ${sourceBadgeHtml}
          <div style="position:absolute;top:8px;right:8px;background:${item.match_color || '#C75233'};color:#fff;font-weight:700;font-size:0.78rem;padding:3px 8px;border-radius:20px;box-shadow:0 2px 6px rgba(0,0,0,0.25);">
            🔥 ${score}% Match
          </div>
        </div>
        <div class="top3-card-price" style="display:flex;align-items:center;">${esc(item.price)} ${dropHtml}</div>
        <h4 style="margin:0.25rem 0 0.5rem;font-size:0.95rem;line-height:1.3;">${esc(item.title)}</h4>
        <div class="top3-card-loc" style="font-size:0.82rem;margin-bottom:0.4rem;"><i class="fa-solid fa-location-dot"></i> ${esc(item.location || currentClient.location)}</div>
        ${m2BadgeTop3}
        <div style="margin-bottom:0.75rem;">${reasonsHtml}</div>
        <div class="top3-card-actions">
          <button class="btn-copy-link" data-link="${item.link}"><i class="fa-solid fa-copy"></i> Copiar Link</button>
          <button class="btn-mark-sent" data-id="${item.id}"><i class="fa-solid fa-envelope-circle-check"></i> Já Enviado</button>
          <button class="btn-schedule-visit" data-id="${item.id}" title="Marcar Visita no Google Calendar" style="background:#fff;border:1px solid #d8d1c9;color:var(--castanho);padding:0.4rem 0.6rem;border-radius:6px;cursor:pointer;"><i class="fa-solid fa-calendar-plus" style="color:var(--terracota);"></i> Visita</button>
          <a href="${item.link}" target="_blank" class="btn-open-link" title="Abrir no Idealista"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
          <button class="btn-delete-listing" data-id="${item.id}" title="Remover anúncio repetido ou descartar" style="background:#fff;border:1px solid #e2e8f0;color:#e53e3e;padding:0.4rem 0.6rem;border-radius:6px;cursor:pointer;"><i class="fa-solid fa-trash-can"></i></button>
        </div>`;

      card.querySelector('.btn-copy-link').addEventListener('click', () => {
        const shareText = formatCompleteShareMessage(item, currentClient);
        copyToClipboard(shareText, `Imóvel #${idx + 1} copiado com mensagem completa para o cliente! 📋`);
      });

      card.querySelector('.btn-schedule-visit').addEventListener('click', () => {
        openVisitModalForListing(item);
      });

      card.querySelector('.btn-mark-sent').addEventListener('click', async () => {
        await setStatus(item.id, 'enviado');
        showToast(`Imóvel #${idx + 1} marcado como ENVIADO ✉`);
        await loadClients();
      });

      card.querySelector('.btn-delete-listing').addEventListener('click', async () => {
        if (!currentClient) return;
        await fetch(`/api/listings/${currentClient.id}/${item.id}`, { method: 'DELETE' });
        showToast('Anúncio removido com sucesso 🗑️');
        await loadListings();
      });

      top3GridEl.appendChild(card);
    });

    btnCopyTop3.onclick = () => {
      if (!top3 || !top3.length) return;
      const text = formatCompleteShareMessage(top3, currentClient);
      copyToClipboard(text, 'Top 3 copiado pronto para envio! 📋');
    };

    btnMarkTop3Sent.onclick = async () => {
      const ids = top3.map(it => it.id);
      try {
        const res = await fetch('/api/listings/batch-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listing_ids: ids, client_id: currentClient.id, status: 'enviado' })
        });
        const data = await res.json();
        if (data.driveSync) {
          showToast('✅ Top 3 marcado como ENVIADO e gravado no Excel da Drive!', 'success');
        } else {
          showToast('Os 3 imóveis foram marcados como ENVIADOS ✉');
        }
      } catch (e) {
        showToast('Erro ao atualizar Top 3', 'error');
      }

      top3.forEach(it => it.status = 'enviado');
      await loadClients();
      await loadListings();
    };
  }

  // ── LISTINGS GRID & CARDS ────────────────────────────────────────────────
  function renderListings() {
    listingsGridEl.innerHTML = '';
    let filtered = [...listings];

    if (currentFilter === 'novo') {
      filtered = filtered.filter(l => l.status === 'novo' || !l.status);
    } else if (currentFilter !== 'all') {
      filtered = filtered.filter(l => l.status === currentFilter);
    }

    const q = inputSearchFilter.value.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(l =>
        [l.title, l.location, l.price, l.typology, l.description, ...(l.details || [])].some(v => v?.toLowerCase().includes(q))
      );
    }

    if (!filtered.length) {
      listingsGridEl.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-house-chimney-crack"></i>
          <h3>Sem imóveis nesta categoria</h3>
          <p>Clique em <strong>Pesquisar com Bot</strong> para procurar anúncios no Idealista.</p>
        </div>`;
      return;
    }

    const statusLabels = {
      novo: 'Novo',
      enviado: '✉ Enviado',
      interesse: '💡 Tem Interesse',
      visita: '📅 Visita Marcada / Feita',
      favorito: '⭐ Favorito',
      rejeitado: 'Descartado'
    };

    filtered.forEach(item => {
      const card = document.createElement('div');
      const isSelected = selectedListingIds.has(item.id);
      card.className = `property-card ${isSelected ? 'is-selected' : ''}`;
      const status = item.status || 'novo';
      const statusLabel = statusLabels[status] || 'Novo';
      const photo = item.photo || (item.photos && item.photos[0]) || '';
      const photoCount = (item.photos && item.photos.length) || (photo ? 1 : 0);
      const specs = (item.details || []).map(d => `<span class="spec-pill">${esc(d)}</span>`).join('');
      const score = item.match_score || 80;
      const reasons = item.match_reasons || [];
      const reasonsHtml = reasons.length > 0 ? reasons.map(r => `<span style="display:inline-block;background:#f3ede8;color:var(--castanho);font-size:0.75rem;font-weight:600;padding:2px 7px;border-radius:4px;margin-right:4px;margin-bottom:3px;">${esc(r)}</span>`).join('') : '';

      const dropHtml = item.price_drop ? `<span style="display:inline-block;background:#e53e3e;color:#fff;font-size:0.72rem;font-weight:700;padding:2px 7px;border-radius:4px;margin-left:6px;">🔻 ${esc(item.price_drop)}</span>` : '';
      const marketHtml = item.market_tag ? `<span style="display:inline-block;background:#edf2f7;color:#4a5568;font-size:0.72rem;font-weight:600;padding:2px 6px;border-radius:4px;margin-left:4px;">⏱ ${esc(item.market_tag)}</span>` : '';

      // Comparação de €/m² com a zona
      let m2BadgeHtml = '';
      if (item.m2_analysis && item.m2_analysis.badge_text) {
        const bg = item.m2_analysis.status === 'opportunity' ? '#ebf8ff' : (item.m2_analysis.status === 'fair' ? '#f0fff4' : '#fffaf0');
        const textCol = item.m2_analysis.color || '#2b6cb0';
        m2BadgeHtml = `<div style="background:${bg};color:${textCol};font-size:0.78rem;font-weight:700;padding:4px 8px;border-radius:6px;margin-bottom:0.4rem;display:flex;align-items:center;gap:4px;">${esc(item.m2_analysis.badge_text)}</div>`;
      }

      const sourcesList = (item.sources && item.sources.length) ? item.sources : [item.source || (item.link && item.link.includes('remax') ? 'remax' : (item.link && item.link.includes('zome') ? 'zome' : (item.link && item.link.includes('arys') ? 'arys' : 'idealista')))];
      const sourceBadgesHtml = sourcesList.map(src => `<span class="badge-source source-${src}">${src.toUpperCase()}</span>`).join('');

      const portalLinks = item.portal_links || { [item.source || 'idealista']: item.link };
      const portalEntries = Object.entries(portalLinks).filter(([_, u]) => u && u.startsWith('http'));
      let portalLinksCardHtml = '';
      if (portalEntries.length > 1) {
        portalLinksCardHtml = portalEntries.map(([src, u]) => `
          <a href="${u}" target="_blank" class="btn-portal btn-portal-${src}" style="padding:4px 8px;font-size:0.75rem;border:1px solid #ddd;" title="Abrir no portal ${src.toUpperCase()}">
            <span class="portal-dot ${src}-dot"></span> ${src.toUpperCase()}
          </a>
        `).join('');
      } else {
        const singleUrl = portalEntries[0] ? portalEntries[0][1] : item.link;
        const singleSrc = portalEntries[0] ? portalEntries[0][0] : (item.source || 'idealista');
        portalLinksCardHtml = `<a href="${singleUrl}" target="_blank" class="btn-open-link" title="Abrir no ${singleSrc.toUpperCase()}"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
      }

      card.innerHTML = `
        <div class="card-image-container">
          ${photo ? `<img src="${photo}" alt="${esc(item.title)}" onerror="this.parentElement.style.background='#EDE3D8';this.remove()">` : ''}
          <div class="card-badges-top-left">
            ${sourceBadgesHtml}
            <span class="badge-status status-${status}">${statusLabel}</span>
          </div>
          <span style="position:absolute;bottom:8px;left:8px;background:${item.match_color || '#C75233'};color:#fff;font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,0.3);">
            🔥 ${score}% Match
          </span>
          ${photoCount > 1 ? `<span class="card-photo-count"><i class="fa-solid fa-camera"></i> ${photoCount} fotos</span>` : ''}
        </div>
        <div class="card-content">
          <div class="card-price-row">
            <div style="display:flex;align-items:center;">
              <div class="price-tag">${esc(item.price)}</div>
              ${dropHtml}
            </div>
            <div style="display:flex;align-items:center;">
              ${item.price_m2 ? `<div class="price-m2-tag">${esc(item.price_m2)}</div>` : ''}
              ${marketHtml}
            </div>
          </div>
          ${m2BadgeHtml}
          ${reasonsHtml ? `<div style="margin:0.25rem 0 0.5rem;">${reasonsHtml}</div>` : ''}
          <h3 class="property-title">${esc(item.title)}</h3>
          <div class="property-location"><i class="fa-solid fa-location-dot"></i> ${esc(item.location || currentClient.location)}</div>
          <div class="property-specs">${specs}</div>
          <div class="card-actions">
            <button class="btn-select-for-send ${isSelected ? 'selected' : ''}" data-id="${item.id}">
              <i class="fa-solid ${isSelected ? 'fa-square-check' : 'fa-plus'}"></i>
              <span>${isSelected ? '✔ Na Lista de Envio' : 'Adicionar à Lista de Envio'}</span>
            </button>
            <div class="action-buttons-row">
              <button class="btn-copy-link" data-link="${item.link}"><i class="fa-solid fa-copy"></i> Copiar Link</button>
              <button class="btn-mark-sent" data-id="${item.id}">
                <i class="fa-solid fa-envelope-circle-check"></i> ${status === 'enviado' ? 'Já Enviado (Remover)' : 'Marcar Enviado'}
              </button>
            </div>
            <div class="action-buttons-row" style="flex-wrap:wrap;align-items:center;">
              <button class="btn-view-detail"><i class="fa-solid fa-eye"></i> Ver Anúncio</button>
              <button class="btn-schedule-visit" data-id="${item.id}" title="Marcar Visita no Google Calendar" style="background:#fff;border:1px solid #d8d1c9;color:var(--castanho);padding:0.45rem 0.7rem;border-radius:6px;cursor:pointer;"><i class="fa-solid fa-calendar-plus" style="color:var(--terracota);"></i> Visita</button>
              ${portalLinksCardHtml}
              <button class="btn-delete-listing" data-id="${item.id}" title="Apagar este anúncio" style="background:#fff;border:1px solid #e2e8f0;color:#e53e3e;padding:0.45rem 0.7rem;border-radius:6px;cursor:pointer;"><i class="fa-solid fa-trash-can"></i></button>
              <select class="dropdown-status" data-id="${item.id}">
                <option value="novo"      ${status === 'novo'      ? 'selected' : ''}>Novo</option>
                <option value="enviado"   ${status === 'enviado'   ? 'selected' : ''}>✉ Já Enviado</option>
                <option value="interesse" ${status === 'interesse' ? 'selected' : ''}>💡 Tem Interesse</option>
                <option value="visita"    ${status === 'visita'    ? 'selected' : ''}>📅 Visitou / Quer Visitar</option>
                <option value="favorito"  ${status === 'favorito'  ? 'selected' : ''}>⭐ Favorito</option>
                <option value="rejeitado" ${status === 'rejeitado' ? 'selected' : ''}>🗑️ Descartado</option>
              </select>
            </div>
          </div>
        </div>`;

      // Botão de apagar anúncio
      card.querySelector('.btn-delete-listing').addEventListener('click', async () => {
        if (!currentClient) return;
        await fetch(`/api/listings/${currentClient.id}/${item.id}`, { method: 'DELETE' });
        showToast('Anúncio apagado com sucesso 🗑️');
        await loadListings();
      });

      // Toggle Custom Sending Selection
      card.querySelector('.btn-select-for-send').addEventListener('click', () => {
        if (selectedListingIds.has(item.id)) {
          selectedListingIds.delete(item.id);
        } else {
          selectedListingIds.add(item.id);
        }
        updateSelectionDock();
        renderListings();
      });

      // Open detail modal with slider
      card.querySelector('.card-image-container').addEventListener('click', () => openDetailModal(item));
      card.querySelector('.property-title').addEventListener('click', () => openDetailModal(item));
      card.querySelector('.btn-view-detail').addEventListener('click', () => openDetailModal(item));

      // 1-Click Copy Link Rico (WhatsApp / Email)
      card.querySelector('.btn-copy-link').addEventListener('click', () => {
        const shareText = formatCompleteShareMessage(item, currentClient);
        copyToClipboard(shareText, 'Imóvel copiado com mensagem completa para o cliente! 📋');
      });

      // Schedule Visit in Google Calendar
      const visitBtn = card.querySelector('.btn-schedule-visit');
      if (visitBtn) {
        visitBtn.addEventListener('click', () => {
          openVisitModalForListing(item);
        });
      }

      // Toggle Sent Status (allow easily removing the sent tag!)
      card.querySelector('.btn-mark-sent').addEventListener('click', async () => {
        const nextStatus = item.status === 'enviado' ? 'novo' : 'enviado';
        await setStatus(item.id, nextStatus);
        showToast(nextStatus === 'enviado' ? 'Imóvel marcado como JÁ ENVIADO ✉' : 'Tag "Já Enviado" removida (reposto como NOVO)');
        await loadClients();
      });

      // Status selector change
      card.querySelector('.dropdown-status').addEventListener('change', async e => {
        await setStatus(item.id, e.target.value);
        showToast(`Estado alterado para: ${statusLabels[e.target.value] || e.target.value}`);
        await loadClients();
      });

      listingsGridEl.appendChild(card);
    });
  }

  // ── PHOTO SLIDER CAROUSEL & DETAIL MODAL ─────────────────────────────────
  function openDetailModal(item) {
    currentModalItem = item;

    currentSliderPhotos = (item.photos && item.photos.length > 0)
      ? item.photos
      : (item.photo ? [item.photo] : []);

    currentSliderIndex = 0;
    updateSliderView();

    const status = item.status || 'novo';
    const statusLabels = {
      novo: 'Novo',
      enviado: '✉ Já Enviado',
      interesse: '💡 Tem Interesse',
      visita: '📅 Visitou / Quer Visitar',
      favorito: '⭐ Favorito',
      rejeitado: 'Descartado'
    };

    modalDetailStatus.className = `badge badge-status status-${status}`;
    modalDetailStatus.textContent = statusLabels[status] || 'Novo';

    modalDetailTitle.textContent = item.title;
    modalDetailPrice.textContent = item.price;
    modalDetailLocation.querySelector('span').textContent = item.location || currentClient.location;

    modalDetailSpecs.innerHTML = '';
    (item.details || []).forEach(d => {
      const pill = document.createElement('span');
      pill.className = 'spec-pill';
      pill.style.padding = '6px 12px';
      pill.style.fontSize = '.82rem';
      pill.textContent = d;
      modalDetailSpecs.appendChild(pill);
    });

    modalDetailDescription.textContent = item.description || 'Abra o anúncio no Idealista para ler o texto completo e todos os detalhes do proprietário / agência.';

    modalCopyLinkBtn.onclick = () => {
      const shareText = formatCompleteShareMessage(item, currentClient);
      copyToClipboard(shareText, 'Imóvel copiado com mensagem completa para o cliente! 📋');
    };

    modalToggleSentBtn.textContent = item.status === 'enviado' ? 'Remover "Já Enviado"' : 'Marcar como Já Enviado';
    modalToggleSentBtn.onclick = async () => {
      const nextStatus = item.status === 'enviado' ? 'novo' : 'enviado';
      await setStatus(item.id, nextStatus);
      item.status = nextStatus;
      modalDetailStatus.className = `badge badge-status status-${nextStatus}`;
      modalDetailStatus.textContent = statusLabels[nextStatus] || 'Novo';
      modalToggleSentBtn.textContent = nextStatus === 'enviado' ? 'Remover "Já Enviado"' : 'Marcar como Já Enviado';
      showToast(nextStatus === 'enviado' ? 'Marcado como JÁ ENVIADO ✉' : 'Tag de envio removida');
      await loadClients();
    };

    const portalLinks = item.portal_links || { [item.source || 'idealista']: item.link };
    const portalContainer = document.getElementById('modal-portal-links-container');
    if (portalContainer) {
      portalContainer.innerHTML = '';
      const portalEntries = Object.entries(portalLinks).filter(([_, u]) => u && u.startsWith('http'));
      portalEntries.forEach(([src, u]) => {
        const a = document.createElement('a');
        a.href = u;
        a.target = '_blank';
        a.className = `btn btn-portal btn-portal-${src}`;
        a.style.border = '1px solid #ccc';
        a.style.padding = '8px 14px';
        a.innerHTML = `<span class="portal-dot ${src}-dot"></span> Ver no ${src.toUpperCase()}`;
        portalContainer.appendChild(a);
      });
      modalOpenIdealistaLink.style.display = 'none';
    } else {
      modalOpenIdealistaLink.href = item.link;
      modalOpenIdealistaLink.style.display = 'inline-flex';
    }

    showModal(modalDetail);
  }

  function updateSliderView() {
    if (currentSliderPhotos.length === 0) {
      sliderMainImg.src = '';
      sliderMainImg.style.display = 'none';
      sliderCounter.textContent = 'Sem fotos';
      sliderBtnPrev.style.display = 'none';
      sliderBtnNext.style.display = 'none';
      sliderThumbs.innerHTML = '';
      return;
    }

    sliderMainImg.style.display = 'block';
    sliderMainImg.src = currentSliderPhotos[currentSliderIndex];
    sliderCounter.textContent = `Foto ${currentSliderIndex + 1} de ${currentSliderPhotos.length}`;

    sliderBtnPrev.style.display = currentSliderPhotos.length > 1 ? 'flex' : 'none';
    sliderBtnNext.style.display = currentSliderPhotos.length > 1 ? 'flex' : 'none';

    sliderThumbs.innerHTML = '';
    currentSliderPhotos.forEach((photoUrl, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `slider-thumb ${idx === currentSliderIndex ? 'active' : ''}`;
      thumb.innerHTML = `<img src="${photoUrl}" alt="Miniatura ${idx + 1}" onerror="this.parentElement.remove()">`;
      thumb.addEventListener('click', () => {
        currentSliderIndex = idx;
        updateSliderView();
      });
      sliderThumbs.appendChild(thumb);
    });
  }

  function prevSlide() {
    if (currentSliderPhotos.length <= 1) return;
    currentSliderIndex = (currentSliderIndex - 1 + currentSliderPhotos.length) % currentSliderPhotos.length;
    updateSliderView();
  }

  function nextSlide() {
    if (currentSliderPhotos.length <= 1) return;
    currentSliderIndex = (currentSliderIndex + 1) % currentSliderPhotos.length;
    updateSliderView();
  }

  // ── BOT SEARCH TRIGGER ───────────────────────────────────────────────────
  async function triggerScrape() {
    if (!currentClient) return;
    btnScrapeNow.disabled = true;
    scrapeStatusEl.classList.remove('hidden');
    const statusTextEl = scrapeStatusEl.querySelector('p');
    const originalText = statusTextEl.textContent;

    let pollingActive = true;
    const pollStatus = async () => {
      if (!pollingActive) return;
      try {
        const res = await fetch(`/api/scrape/status/${currentClient.id}`);
        const data = await res.json();
        if (data.status) {
          statusTextEl.innerHTML = `<strong>Estado atual:</strong> ${data.status}`;
          if (data.status.includes('CAPTCHA')) {
            scrapeStatusEl.classList.add('captcha-warning');
          } else {
            scrapeStatusEl.classList.remove('captcha-warning');
          }
        }
      } catch (e) {}
      setTimeout(pollStatus, 1000);
    };
    pollStatus();

    try {
      const res = await fetch(`/api/scrape/${currentClient.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (data.success) {
        showToast(`✅ ${data.total_found} imóveis reais encontrados e gravados com sucesso!`);
        await loadClients();
        await loadListings();
      } else {
        showToast('Erro durante a execução do Bot: ' + (data.error || ''), 'error');
      }
    } catch (e) {
      showToast('Erro de comunicação com o servidor do Bot', 'error');
    } finally {
      pollingActive = false;
      btnScrapeNow.disabled = false;
      scrapeStatusEl.classList.add('hidden');
      scrapeStatusEl.classList.remove('captcha-warning');
      statusTextEl.textContent = originalText;
    }
  }

  // ── MANUAL IMPORTS ───────────────────────────────────────────────────────
  async function handleImportLink(e) {
    e.preventDefault();
    if (!currentClient) {
      showToast('Selecione um cliente na lista primeiro!', 'error');
      return;
    }

    const urlValue = (document.getElementById('import-url')?.value || '').trim();
    if (!urlValue) {
      showToast('Por favor insira pelo menos um link de imóvel', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-import');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A extrair dados do anúncio...';
    }

    showToast('A extrair dados e fotos do anúncio... ⏳');

    const payload = {
      client_id: currentClient.id,
      url: urlValue,
      title: (document.getElementById('import-title')?.value || '').trim(),
      price: (document.getElementById('import-price')?.value || '').trim(),
      location: (document.getElementById('import-location')?.value || '').trim()
    };

    try {
      const res = await fetch('/api/import-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🎉 ${data.total_found || 1} imóvel(is) adicionado(s) com sucesso para ${currentClient.name}! (${data.added_new || 0} novos)`);
        hideModals();
        if (formImport) formImport.reset();
        await loadClients();
        await loadListings();
      } else {
        showToast(data.error || 'Erro ao importar link', 'error');
      }
    } catch (e) {
      showToast('Erro de comunicação com o servidor', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  }

  async function handleImportHtml(e) {
    e.preventDefault();
    if (!currentClient) return;

    const htmlContent = document.getElementById('html-content').value;
    if (!htmlContent.trim()) {
      showToast('Por favor cole o código HTML da página', 'error');
      return;
    }

    try {
      const res = await fetch('/api/import-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: currentClient.id, html: htmlContent })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`🎉 ${data.total_found} imóveis reais extraídos e gravados!`);
        hideModals();
        await loadClients();
        await loadListings();
      } else {
        showToast(data.error || 'Nenhum imóvel encontrado no HTML', 'error');
      }
    } catch (e) {
      showToast('Erro ao enviar o código HTML', 'error');
    }
  }

  // ── HELPER FUNCTIONS ─────────────────────────────────────────────────────
  async function setStatus(listingId, status) {
    if (!currentClient) return;
    try {
      const res = await fetch('/api/listings/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, client_id: currentClient.id, status })
      });
      const data = await res.json();
      if (status === 'enviado') {
        if (data.driveSync) {
          showToast('✅ Imóvel marcado como ENVIADO e registado no Excel da Google Drive!');
        } else {
          showToast('Imóvel marcado como JÁ ENVIADO ✉');
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar status:', e);
    }

    const item = listings.find(l => l.id === listingId);
    if (item) item.status = status;
    persistCurrentListings();

    updateCounters();
    renderTop3();
    renderListings();
  }

  async function copyToClipboard(text, successMsg) {
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (err) {
        console.warn('navigator.clipboard.writeText falhou:', err);
      }
    }
    if (!copied) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (err) {
        console.error('Fallback execCommand falhou:', err);
      }
    }
    if (copied) {
      showToast(successMsg || 'Copiado para a área de transferência! 📋');
    } else {
      showToast('Não foi possível copiar automaticamente.', 'error');
    }
  }

  function showModal(modal) {
    if (modal) modal.classList.remove('hidden');
  }

  function hideModals() {
    document.querySelectorAll('.modal-backdrop, .modal-overlay').forEach(m => m.classList.add('hidden'));
    try { if (formClient) formClient.reset(); } catch (e) {}
    try { if (formConsultant) formConsultant.reset(); } catch (e) {}
  }

  // Fechar modais ao clicar no botão fechar, fundo ou tecla ESC
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      hideModals();
    });
  });

  document.querySelectorAll('.modal-backdrop, .modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) hideModals();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideModals();
  });

  function showToast(msg, type = 'success') {
    const tc = document.getElementById('toast-container');
    const t  = document.createElement('div');
    t.className = 'toast';
    if (type === 'error') t.style.borderLeftColor = '#E15759';
    t.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}" style="color:${type === 'error' ? '#E15759' : 'var(--terracota)'}"></i> <span>${esc(msg)}</span>`;
    tc.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3800);
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function cap(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ── ZOHO CRM API INTEGRATION & NOTES ──────────────────────────────────────
  const btnSyncZohoApi = document.getElementById('btn-sync-zoho-api');
  const modalZohoNote = document.getElementById('modal-zoho-note');
  const btnCloseZohoNoteModal = document.getElementById('btn-close-zoho-note-modal');
  const btnCancelZohoNote = document.getElementById('btn-cancel-zoho-note');
  const btnSubmitZohoNote = document.getElementById('btn-submit-zoho-note');
  const selectZohoNoteAuthor = document.getElementById('select-zoho-note-author');
  const selectZohoNoteAction = document.getElementById('select-zoho-note-action');
  const selectZohoNoteChannel = document.getElementById('select-zoho-note-channel');
  const zohoNoteTitlePreview = document.getElementById('zoho-note-title-preview');
  const btnReloadPopTemplate = document.getElementById('btn-reload-pop-template');
  const inputZohoNoteContent = document.getElementById('input-zoho-note-content');
  const zohoNoteClientName = document.getElementById('zoho-note-client-name');

  function updateZohoNoteTitlePreview() {
    const author = selectZohoNoteAuthor ? selectZohoNoteAuthor.value : (currentUser ? currentUser.name : 'Equipa SURE');
    const action = selectZohoNoteAction ? selectZohoNoteAction.value : 'Troca de Mensagens';
    if (zohoNoteTitlePreview) {
      zohoNoteTitlePreview.textContent = `${author} — ${action}`;
    }
  }

  function generatePopNoteTemplate(client, authorName, actionName, channelName) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-PT') + ' ' + now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const clientName = client ? client.name : 'Cliente';
    const cons = consultants.find(c => c.id === (client ? client.consultant_id : ''));
    const consName = cons ? cons.name : 'Consultor Responsável';
    const ast = assistants.find(a => a.id === (client ? client.assistant_id : ''));
    const astName = ast ? ast.name : (authorName || 'Administrativo');

    const participants = `${astName} (Administrativo), ${consName} (Consultor) e ${clientName} (Cliente)`;

    return [
      `Data e Hora: ${dateStr}`,
      `Canal: ${channelName || 'WhatsApp'}`,
      `Participantes: ${participants}`,
      `Objetivo da Interação: ${actionName || 'Troca de Mensagens'} com o cliente e acompanhamento de critérios`,
      ``,
      `Factos Confirmados:`,
      `- `,
      ``,
      `Necessidades / Critérios:`,
      `- `,
      ``,
      `Resultado:`,
      `- `,
      ``,
      `Próxima Ação, Responsável e Prazo:`,
      `• Próxima Ação: Agendar visita / Enviar novas opções de imóveis`,
      `• Responsável: ${consName}`,
      `• Prazo: 48 horas`,
      ``,
      `Log Técnico: Registo manual via Idealista Farm (POP 00.05.05.POP)`
    ].join('\n');
  }

  if (selectZohoNoteAuthor) selectZohoNoteAuthor.addEventListener('change', updateZohoNoteTitlePreview);
  if (selectZohoNoteAction) selectZohoNoteAction.addEventListener('change', updateZohoNoteTitlePreview);

  if (btnReloadPopTemplate) {
    btnReloadPopTemplate.addEventListener('click', () => {
      if (!currentClient) return;
      const author = selectZohoNoteAuthor ? selectZohoNoteAuthor.value : (currentUser ? currentUser.name : 'Equipa SURE');
      const action = selectZohoNoteAction ? selectZohoNoteAction.value : 'Troca de Mensagens';
      const channel = selectZohoNoteChannel ? selectZohoNoteChannel.value : 'WhatsApp';
      if (inputZohoNoteContent) {
        inputZohoNoteContent.value = generatePopNoteTemplate(currentClient, author, action, channel);
      }
      showToast('Modelo POP 00.05.05 reposto com sucesso!');
    });
  }

  if (btnSyncZohoApi) {
    btnSyncZohoApi.addEventListener('click', async (e) => {
      e.preventDefault();
      const origHtml = btnSyncZohoApi.innerHTML;
      btnSyncZohoApi.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      btnSyncZohoApi.disabled = true;
      showToast('A sincronizar com Zoho CRM em tempo real... ⏳');

      try {
        const res = await fetch('/api/zoho/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`🎉 Zoho CRM Sincronizado: +${data.added_count} novos, ${data.updated_count} atualizados!`, 'success');
          await loadConsultants();
          await loadAssistants();
          await loadClients();
          if (currentClient) {
            const updatedCurr = clients.find(c => c.id === currentClient.id);
            if (updatedCurr) selectClient(updatedCurr);
          }
        } else {
          showToast('Erro ao sincronizar com Zoho: ' + (data.error || 'Verifique as credenciais'), 'error');
        }
      } catch (err) {
        showToast('Erro de comunicação ao sincronizar Zoho CRM', 'error');
      } finally {
        btnSyncZohoApi.innerHTML = origHtml;
        btnSyncZohoApi.disabled = false;
      }
    });
  }

  function showZohoNoteModal(client) {
    if (!client || !client.zoho_id || !modalZohoNote) return;
    if (zohoNoteClientName) zohoNoteClientName.textContent = client.name || 'Cliente';

    // Populate Author dropdown with active user, assistants and consultants
    if (selectZohoNoteAuthor) {
      selectZohoNoteAuthor.innerHTML = '';
      const authorsSet = new Map();
      if (currentUser && currentUser.name) authorsSet.set(currentUser.name, currentUser.name);
      assistants.forEach(a => { if (a.name && !a.name.startsWith('Geral')) authorsSet.set(a.name, a.name); });
      consultants.forEach(c => { if (c.name && !c.name.startsWith('Geral')) authorsSet.set(c.name, c.name); });
      authorsSet.set('Equipa SURE', 'Equipa SURE');

      authorsSet.forEach((label, val) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        selectZohoNoteAuthor.appendChild(opt);
      });

      // Default to active user name or client's assigned assistant
      const defaultAuthor = (currentUser && currentUser.name && !currentUser.name.startsWith('Geral'))
        ? currentUser.name
        : ((assistants.find(a => a.id === client.assistant_id) || {}).name || 'João Santos');
      selectZohoNoteAuthor.value = defaultAuthor;
    }

    if (selectZohoNoteAction) selectZohoNoteAction.value = 'Troca de Mensagens';
    if (selectZohoNoteChannel) selectZohoNoteChannel.value = 'WhatsApp';

    updateZohoNoteTitlePreview();

    const author = selectZohoNoteAuthor ? selectZohoNoteAuthor.value : (currentUser ? currentUser.name : 'Equipa SURE');
    if (inputZohoNoteContent) {
      inputZohoNoteContent.value = generatePopNoteTemplate(client, author, 'Troca de Mensagens', 'WhatsApp');
      inputZohoNoteContent.focus();
    }
    modalZohoNote.classList.remove('hidden');
  }

  if (btnCloseZohoNoteModal) {
    btnCloseZohoNoteModal.addEventListener('click', () => {
      if (modalZohoNote) modalZohoNote.classList.add('hidden');
    });
  }
  if (btnCancelZohoNote) {
    btnCancelZohoNote.addEventListener('click', () => {
      if (modalZohoNote) modalZohoNote.classList.add('hidden');
    });
  }

  if (btnSubmitZohoNote) {
    btnSubmitZohoNote.addEventListener('click', async () => {
      if (!currentClient || !currentClient.zoho_id) {
        showToast('Nenhum cliente do Zoho CRM selecionado', 'error');
        return;
      }
      const author = selectZohoNoteAuthor ? selectZohoNoteAuthor.value : (currentUser ? currentUser.name : 'Equipa SURE');
      const action = selectZohoNoteAction ? selectZohoNoteAction.value : 'Troca de Mensagens';
      const channel = selectZohoNoteChannel ? selectZohoNoteChannel.value : 'WhatsApp';
      const content = inputZohoNoteContent ? inputZohoNoteContent.value.trim() : '';

      if (!content) {
        showToast('Por favor introduza o conteúdo da nota a gravar', 'error');
        return;
      }

      btnSubmitZohoNote.disabled = true;
      btnSubmitZohoNote.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A gravar...';

      try {
        const res = await fetch('/api/zoho/note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deal_id: currentClient.zoho_id,
            author_name: author,
            action: action,
            channel: channel,
            content: content,
            client_id: currentClient.id
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Nota registada no Zoho CRM (${author} — ${action})! 🎉`, 'success');
          if (modalZohoNote) modalZohoNote.classList.add('hidden');
        } else {
          showToast('Erro ao gravar nota no Zoho: ' + (data.error || 'Falha na API'), 'error');
        }
      } catch (err) {
        showToast('Erro de comunicação ao gravar nota no Zoho', 'error');
      } finally {
        btnSubmitZohoNote.disabled = false;
        btnSubmitZohoNote.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Gravar Nota no Zoho CRM';
      }
    });
  }

  // ── GOOGLE DRIVE INTEGRATION ───────────────────────────────────────────────
  const btnGoogleDrive = document.getElementById('btn-google-drive');
  const modalDriveSettings = document.getElementById('modal-drive-settings');
  const btnCloseDriveModal = document.getElementById('btn-close-drive-modal');
  const btnSaveDriveModal = document.getElementById('btn-save-drive-modal');
  const fileInputDriveJson = document.getElementById('file-input-drive-json');
  const btnCreateWordDoc = document.getElementById('btn-create-word-doc');

  if (btnGoogleDrive) {
    btnGoogleDrive.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const m = document.getElementById('modal-drive-settings');
      if (m) {
        m.classList.remove('hidden');
        checkDriveStatus();
      }
    });
  }

  if (btnCloseDriveModal) {
    btnCloseDriveModal.addEventListener('click', () => {
      const m = document.getElementById('modal-drive-settings');
      if (m) m.classList.add('hidden');
    });
  }

  const inputDriveWebhook = document.getElementById('input-drive-webhook');
  const btnSaveWebhook = document.getElementById('btn-save-webhook');

  if (btnSaveWebhook && inputDriveWebhook) {
    btnSaveWebhook.addEventListener('click', async () => {
      const url = inputDriveWebhook.value.trim();
      if (!url || !url.startsWith('http')) {
        showToast('Por favor insira um URL válido do Google Apps Script', 'error');
        return;
      }

      showToast('A testar conexão com o Google Apps Script Webhook... ⏳');
      try {
        const res = await fetch('/api/drive/set-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhook_url: url })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Google Apps Script Webhook conectado com sucesso! 🎉', 'success');
          await checkDriveStatus();
        } else {
          showToast('Erro ao ligar Webhook: ' + (data.error || data.message), 'error');
        }
      } catch (err) {
        showToast('Falha na comunicação com o servidor', 'error');
      }
    });
  }

  const btnSyncCloudClients = document.getElementById('btn-sync-cloud-clients');
  if (btnSyncCloudClients) {
    btnSyncCloudClients.addEventListener('click', async () => {
      showToast('A sincronizar clientes da Google Drive... ⏳');
      try {
        const res = await fetch('/api/drive/sync-master-clients');
        const data = await res.json();
        if (data.success) {
          showToast(data.message || `🎉 ${data.count} clientes sincronizados da Drive!`);
          await loadConsultants();
          await loadClients();
        } else {
          showToast(data.error || 'Erro ao sincronizar clientes da Drive', 'error');
        }
      } catch (e) {
        showToast('Erro de comunicação ao sincronizar', 'error');
      }
    });
  }

  const btnPushCloudClients = document.getElementById('btn-push-cloud-clients');
  if (btnPushCloudClients) {
    btnPushCloudClients.addEventListener('click', async () => {
      showToast('A enviar clientes para a Google Drive... ⏳');
      try {
        const res = await fetch('/api/drive/push-all-clients', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || '🎉 Clientes enviados para a Drive!');
        } else {
          showToast(data.error || 'Erro ao enviar clientes para a Drive', 'error');
        }
      } catch (e) {
        showToast('Erro de comunicação ao enviar', 'error');
      }
    });
  }

  async function checkDriveStatus() {
    try {
      const res = await fetch('/api/drive/status');
      const data = await res.json();
      const icon = document.getElementById('drive-status-icon');
      const title = document.getElementById('drive-status-title');
      const desc = document.getElementById('drive-status-desc');

      if (data.connected) {
        if (icon) {
          icon.className = 'fa-solid fa-circle-check';
          icon.style.color = '#38a169';
        }
        if (title) title.textContent = 'Google Drive & Sheets Conectado ✅';
        if (desc) desc.textContent = `Pasta Raiz: ${data.rootFolderId}`;
      } else {
        if (icon) {
          icon.className = 'fa-solid fa-circle-exclamation';
          icon.style.color = '#dd6b20';
        }
        if (title) title.textContent = 'Google Drive: Credenciais Pendentes';
        if (desc) desc.textContent = 'Carregue o ficheiro google_credentials.json para ativar a criação de pastas e registo automático.';
      }
    } catch (e) {
      console.warn('Erro ao verificar status da Drive:', e);
    }
  }

  if (fileInputDriveJson) {
    fileInputDriveJson.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const jsonText = evt.target.result;
          const res = await fetch('/api/drive/upload-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credentials: jsonText })
          });
          const result = await res.json();
          if (result.success) {
            showToast('Google Drive conectado com sucesso!', 'success');
            await checkDriveStatus();
          } else {
            showToast('Erro ao validar credenciais Google: ' + (result.error || result.message), 'error');
          }
        } catch (err) {
          showToast('Ficheiro JSON inválido', 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  // ── CLIENT DRIVE ACTION BUTTONS (HEADER) ─────────────────────────────────
  let clientDriveStatus = null;

  async function refreshClientDriveStatus() {
    const btnFolder = document.getElementById('btn-drive-folder');
    const labelFolder = document.getElementById('label-drive-folder');
    const btnWord = document.getElementById('btn-drive-word');
    const labelWord = document.getElementById('label-drive-word');
    const btnOpen = document.getElementById('btn-drive-open');

    if (!currentClient || !btnFolder) return;

    // Reset visual temporário enquanto verifica
    btnFolder.style.background = '';
    btnFolder.style.color = '';
    btnFolder.style.borderColor = '';
    if (labelFolder) labelFolder.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A verificar...';

    btnWord.style.background = '';
    btnWord.style.color = '';
    btnWord.style.borderColor = '';
    if (labelWord) labelWord.innerHTML = '<i class="fa-solid fa-file-word"></i> Criar Word';

    try {
      const res = await fetch(`/api/drive/client-status/${currentClient.id}`);
      const data = await res.json();
      if (data.success && data.status) {
        clientDriveStatus = data.status;

        // 1. Estado da Pasta (Fica VERDE se já estiver criada)
        if (clientDriveStatus.folder_exists) {
          if (labelFolder) labelFolder.innerHTML = '<i class="fa-solid fa-circle-check"></i> Pasta Criada';
          btnFolder.style.background = '#2e7d32';
          btnFolder.style.color = '#ffffff';
          btnFolder.style.borderColor = '#2e7d32';
          btnFolder.title = `Pasta Google Drive: "${clientDriveStatus.folder_name || currentClient.name}" (Clique para abrir)`;
        } else {
          if (labelFolder) labelFolder.innerHTML = '<i class="fa-solid fa-folder-plus"></i> Criar Pasta';
          btnFolder.style.background = '';
          btnFolder.style.color = '';
          btnFolder.style.borderColor = '';
          btnFolder.title = 'Criar pasta do cliente no Google Drive';
        }

        // 2. Estado do Word (Fica AZUL se já estiver criado)
        if (clientDriveStatus.word_exists) {
          if (labelWord) labelWord.innerHTML = '<i class="fa-solid fa-file-circle-check"></i> Word Criado';
          btnWord.style.background = '#1976d2';
          btnWord.style.color = '#ffffff';
          btnWord.style.borderColor = '#1976d2';
          btnWord.title = `Ficha Docs: "${clientDriveStatus.word_name || 'Ficha'}" (Clique para abrir)`;
        } else {
          if (labelWord) labelWord.innerHTML = '<i class="fa-solid fa-file-word"></i> Criar Word';
          btnWord.style.background = '';
          btnWord.style.color = '';
          btnWord.style.borderColor = '';
          btnWord.title = 'Gerar Ficha de Cliente em Google Docs/Word';
        }

        // 3. Botão de Consultar Pasta na Drive
        if (btnOpen) {
          btnOpen.disabled = false;
          btnOpen.onclick = () => {
            const url = clientDriveStatus.folder_url || 'https://drive.google.com/drive/folders/12ZPicg-lxXy2nyNowmvEUCQNkQi_smaJ';
            window.open(url, '_blank');
          };
        }
      }
    } catch (err) {
      console.warn('Aviso ao consultar status do cliente na Drive:', err);
      if (labelFolder) labelFolder.innerHTML = '<i class="fa-solid fa-folder-plus"></i> Criar Pasta';
      if (labelWord) labelWord.innerHTML = '<i class="fa-solid fa-file-word"></i> Criar Word';
    }
  }

  const btnDriveFolder = document.getElementById('btn-drive-folder');
  if (btnDriveFolder) {
    btnDriveFolder.addEventListener('click', async () => {
      if (!currentClient) {
        showToast('Selecione um cliente primeiro', 'error');
        return;
      }
      if (clientDriveStatus && clientDriveStatus.folder_exists && clientDriveStatus.folder_url) {
        showToast('A abrir pasta no Google Drive... 📁', 'success');
        window.open(clientDriveStatus.folder_url, '_blank');
        return;
      }

      showToast('A criar pasta na pasta "01. Clientes Compradores [REB]"... ⏳');
      try {
        const res = await fetch('/api/drive/create-client-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: currentClient.id, client: currentClient })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Pasta de ${currentClient.name} criada com sucesso! 🎉`, 'success');
          await refreshClientDriveStatus();
          if (data.result && data.result.folder_url) {
            window.open(data.result.folder_url, '_blank');
          }
        } else {
          showToast('Erro ao criar pasta: ' + (data.error || 'Verifique o Webhook'), 'error');
        }
      } catch (e) {
        showToast('Falha na comunicação com o servidor', 'error');
      }
    });
  }

  const btnDriveWord = document.getElementById('btn-drive-word');
  if (btnDriveWord) {
    btnDriveWord.addEventListener('click', async () => {
      if (!currentClient) {
        showToast('Selecione um cliente primeiro', 'error');
        return;
      }
      if (clientDriveStatus && clientDriveStatus.word_exists && clientDriveStatus.word_url) {
        showToast('A abrir Ficha de Cliente em Google Docs... 📄', 'success');
        window.open(clientDriveStatus.word_url, '_blank');
        return;
      }

      showToast('A gerar Ficha/Word na pasta do cliente na Drive... ⏳');
      try {
        const res = await fetch('/api/drive/create-word-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: currentClient.id, client: currentClient })
        });
        const data = await res.json();
        if (data.success && data.docResult) {
          showToast('Ficha de Cliente criada na Drive com sucesso! 🎉', 'success');
          await refreshClientDriveStatus();
          const docLink = data.docResult.link || data.docResult.doc_url;
          if (docLink) window.open(docLink, '_blank');
        } else {
          showToast('Erro ao criar Word: ' + (data.error || 'Verifique o Webhook'), 'error');
        }
      } catch (err) {
        showToast('Falha na comunicação com o servidor', 'error');
      }
    });
  }

  function formatMoney(num) {
    if (!num || isNaN(num)) return '0€';
    return Number(num).toLocaleString('pt-PT') + ' €';
  }

  // ── MARCADOR DE VISITAS & GOOGLE CALENDAR ────────────────────────────────
  let currentVisitsFilter = 'all';

  async function loadVisits() {
    let localVisits = getLocalData(STORAGE_KEYS.VISITS, []);
    try {
      const res = await fetch('/api/visits');
      if (res.ok) {
        const serverVisits = await res.json();
        if (Array.isArray(serverVisits) && serverVisits.length > 0) {
          visits = serverVisits;
        } else if (localVisits.length > 0) {
          visits = localVisits;
          fetch('/api/sync-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visits: localVisits })
          }).catch(() => {});
        } else {
          visits = [];
        }
      } else if (localVisits.length > 0) {
        visits = localVisits;
      }
    } catch (err) {
      if (localVisits.length > 0) visits = localVisits;
    }
    setLocalData(STORAGE_KEYS.VISITS, visits);
    updateVisitsBadge();
    renderVisitsCards(currentVisitsFilter);
    updateBackupStats();
  }

  function updateVisitsBadge() {
    if (!badgeVisitsCount || !visitsTabCount) return;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const upcoming = visits.filter(v => v.status !== 'cancelada' && v.status !== 'realizada');
    const todayVisits = upcoming.filter(v => (v.date || '').startsWith(todayStr));

    visitsTabCount.textContent = upcoming.length;

    if (upcoming.length > 0) {
      badgeVisitsCount.textContent = upcoming.length;
      badgeVisitsCount.classList.remove('hidden');
      if (todayVisits.length > 0) {
        badgeVisitsCount.classList.add('has-today');
        badgeVisitsCount.title = `Hoje: ${todayVisits.length} visita(s) agendada(s)!`;
      } else {
        badgeVisitsCount.classList.remove('has-today');
        badgeVisitsCount.title = `${upcoming.length} visita(s) agendada(s)`;
      }
    } else {
      badgeVisitsCount.classList.add('hidden');
      badgeVisitsCount.classList.remove('has-today');
    }
  }

  function populateVisitsSelects() {
    // Populate Clients (only clients this administrative is allowed to see)
    if (visitClientSelect) {
      const currentSelected = visitClientSelect.value;
      visitClientSelect.innerHTML = '<option value="">-- Selecione o Cliente --</option>';
      const allowed = getAllowedClients();
      allowed.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.location || 'Sem zona'})`;
        visitClientSelect.appendChild(opt);
      });
      if (currentClient && allowed.some(c => c.id === currentClient.id)) {
        visitClientSelect.value = currentClient.id;
      } else if (currentSelected && allowed.some(c => c.id === currentSelected)) {
        visitClientSelect.value = currentSelected;
      }
    }

    // Populate Consultants
    if (visitConsultantSelect) {
      const currentSelected = visitConsultantSelect.value;
      visitConsultantSelect.innerHTML = '<option value="">-- Selecione o Consultor --</option>';
      consultants.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        visitConsultantSelect.appendChild(opt);
      });
      if (currentClient && currentClient.consultant_id) {
        visitConsultantSelect.value = currentClient.consultant_id;
      } else if (currentSelected) {
        visitConsultantSelect.value = currentSelected;
      }
    }
  }

  function showVisitsModal(prefill = {}) {
    populateVisitsSelects();

    // Default Date & Time: Today or prefilled
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (visitDate) visitDate.value = prefill.date || todayStr;

    // Time: next nearest hour
    let nextHour = now.getHours() + 1;
    if (nextHour > 23) nextHour = 10;
    const defaultTime = `${String(nextHour).padStart(2, '0')}:00`;
    if (visitTime) visitTime.value = prefill.time || defaultTime;

    if (visitDuration) visitDuration.value = prefill.duration || '60';

    if (prefill.client) {
      if (visitClientSelect) visitClientSelect.value = prefill.client.id;
      if (visitConsultantSelect && prefill.client.consultant_id) {
        visitConsultantSelect.value = prefill.client.consultant_id;
      }
    } else if (currentClient) {
      if (visitClientSelect) visitClientSelect.value = currentClient.id;
      if (visitConsultantSelect && currentClient.consultant_id) {
        visitConsultantSelect.value = currentClient.consultant_id;
      }
    }

    if (prefill.listing) {
      const l = prefill.listing;
      if (visitListingTitle) visitListingTitle.value = l.title || 'Imóvel para Visita';
      if (visitLocation) visitLocation.value = l.location || (prefill.client ? prefill.client.location : (currentClient ? currentClient.location : ''));
      if (visitPrice) visitPrice.value = l.price || (l.price_num ? l.price_num.toLocaleString('pt-PT') + ' €' : '');
      if (visitLink) visitLink.value = l.link || '';
    } else if (prefill.title) {
      if (visitListingTitle) visitListingTitle.value = prefill.title;
      if (visitLocation) visitLocation.value = prefill.location || '';
      if (visitPrice) visitPrice.value = prefill.price || '';
      if (visitLink) visitLink.value = prefill.link || '';
    } else {
      if (visitListingTitle) visitListingTitle.value = '';
      if (visitLocation) visitLocation.value = currentClient ? currentClient.location : '';
      if (visitPrice) visitPrice.value = '';
      if (visitLink) visitLink.value = '';
      if (visitNotes) visitNotes.value = '';
      if (visitContact) visitContact.value = '';
    }

    // Switch to new visit tab
    switchVisitsTab('new');

    showModal(modalVisits);
  }

  function openVisitModalForListing(listing) {
    showVisitsModal({
      client: currentClient,
      listing: listing
    });
  }

  function switchVisitsTab(tab) {
    if (tab === 'new') {
      if (tabBtnNewVisit) tabBtnNewVisit.classList.add('active');
      if (tabBtnListVisits) tabBtnListVisits.classList.remove('active');
      if (tabPaneNewVisit) tabPaneNewVisit.classList.remove('hidden');
      if (tabPaneListVisits) tabPaneListVisits.classList.add('hidden');
    } else {
      if (tabBtnNewVisit) tabBtnNewVisit.classList.remove('active');
      if (tabBtnListVisits) tabBtnListVisits.classList.add('active');
      if (tabPaneNewVisit) tabPaneNewVisit.classList.add('hidden');
      if (tabPaneListVisits) tabPaneListVisits.classList.remove('hidden');
      renderVisitsCards(currentVisitsFilter);
    }
  }

  if (tabBtnNewVisit) tabBtnNewVisit.addEventListener('click', () => switchVisitsTab('new'));
  if (tabBtnListVisits) tabBtnListVisits.addEventListener('click', () => switchVisitsTab('list'));
  if (btnOpenVisits) btnOpenVisits.addEventListener('click', () => showVisitsModal());
  if (btnRefreshVisits) btnRefreshVisits.addEventListener('click', loadVisits);

  const btnCloseVisitsModal = document.getElementById('btn-close-visits-modal');
  if (btnCloseVisitsModal) {
    btnCloseVisitsModal.addEventListener('click', () => {
      if (modalVisits) modalVisits.classList.add('hidden');
    });
  }

  // Google Maps helper
  if (btnVisitOpenMap) {
    btnVisitOpenMap.addEventListener('click', () => {
      const loc = (visitLocation ? visitLocation.value : '').trim();
      if (!loc) {
        showToast('Introduza primeiro uma localização ou morada', 'error');
        return;
      }
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
      window.open(mapUrl, '_blank');
    });
  }

  // Build Google Calendar Event Creation URL
  function buildGoogleCalendarUrl(visitData) {
    const clientName = visitData.client_name || 'Cliente';
    const title = `🏡 Visita: ${clientName} — ${visitData.title || 'Imóvel'}`;
    const location = visitData.location || '';

    // Calculate dates in YYYYMMDDTHHmmSSZ format (or local YYYYMMDDTHHmmSS)
    const datePart = (visitData.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const timePart = (visitData.time || '10:00').replace(/:/g, '') + '00';
    const startStr = `${datePart}T${timePart}`;

    let endStr = startStr;
    try {
      const durationMin = parseInt(visitData.duration || 60, 10) || 60;
      const startObj = new Date(`${visitData.date || new Date().toISOString().slice(0, 10)}T${visitData.time || '10:00'}:00`);
      if (!isNaN(startObj.getTime())) {
        const endObj = new Date(startObj.getTime() + durationMin * 60 * 1000);
        const endDatePart = `${endObj.getFullYear()}${String(endObj.getMonth() + 1).padStart(2, '0')}${String(endObj.getDate()).padStart(2, '0')}`;
        const endTimePart = `${String(endObj.getHours()).padStart(2, '0')}${String(endObj.getMinutes()).padStart(2, '0')}00`;
        endStr = `${endDatePart}T${endTimePart}`;
      }
    } catch (e) {}

    let details = `SURE. REAL ESTATE — MARCAÇÃO DE VISITA\n`;
    details += `──────────────────────────────────────────────\n`;
    details += `👤 Cliente: ${clientName}\n`;
    if (visitData.client_phone) details += `📞 Contacto Cliente: ${visitData.client_phone}\n`;
    if (visitData.consultant_name) details += `💼 Consultor Responsável: ${visitData.consultant_name}\n`;
    if (visitData.price) details += `💶 Preço: ${visitData.price}\n`;
    if (visitData.link) details += `🔗 Link do Imóvel: ${visitData.link}\n`;
    if (visitData.contact) details += `🏢 Contacto Agência/Proprietário: ${visitData.contact}\n`;
    if (visitData.notes) details += `📝 Notas / Código / Acesso: ${visitData.notes}\n`;
    details += `──────────────────────────────────────────────\n`;
    details += `Agendado via SURE. IdealistaFarm`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  }

  // Get data from form
  function getVisitFormData() {
    const selectedClientId = visitClientSelect ? visitClientSelect.value : '';
    const selectedClient = clients.find(c => c.id === selectedClientId);
    const selectedConsId = visitConsultantSelect ? visitConsultantSelect.value : '';
    const selectedCons = consultants.find(c => c.id === selectedConsId);

    const title = visitListingTitle ? visitListingTitle.value.trim() : '';
    const date = visitDate ? visitDate.value : '';
    const time = visitTime ? visitTime.value : '15:00';
    const duration = visitDuration ? visitDuration.value : '60';
    const location = visitLocation ? visitLocation.value.trim() : '';
    const price = visitPrice ? visitPrice.value.trim() : '';
    const contact = visitContact ? visitContact.value.trim() : '';
    const link = visitLink ? visitLink.value.trim() : '';
    const notes = visitNotes ? visitNotes.value.trim() : '';

    let startIso = new Date().toISOString();
    let endIso = new Date(Date.now() + 3600000).toISOString();
    try {
      if (date) {
        const startObj = new Date(`${date}T${time || '15:00'}:00`);
        if (!isNaN(startObj.getTime())) {
          startIso = startObj.toISOString();
          const durationMin = parseInt(duration, 10) || 60;
          const endObj = new Date(startObj.getTime() + durationMin * 60 * 1000);
          endIso = endObj.toISOString();
        }
      }
    } catch (e) {}

    return {
      client_id: selectedClientId,
      client_name: selectedClient ? selectedClient.name : 'Sem cliente específico',
      client_phone: selectedClient ? (selectedClient.phone || '') : '',
      consultant_id: selectedConsId,
      consultant_name: selectedCons ? selectedCons.name : 'Equipa SURE',
      title: title || `Visita Imóvel - ${location || 'Portugal'}`,
      date: date,
      time: time,
      duration: duration,
      start_time: startIso,
      end_time: endIso,
      location: location,
      price: price,
      contact: contact,
      link: link,
      notes: notes,
      status: 'agendada'
    };
  }

  // Form Submit Handler (Save to backend & Google Calendar sync)
  if (formVisit) {
    formVisit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const visitData = getVisitFormData();

      if (!visitData.date || !visitData.time) {
        showToast('Indique a data e hora da visita', 'error');
        return;
      }

      try {
        const res = await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(visitData)
        });
        const data = await res.json();
        if (data.success) {
          showToast('✅ Visita agendada com sucesso na Agenda SURE!', 'success');
          await loadVisits();
          switchVisitsTab('list');
          formVisit.reset();
        } else {
          showToast('Erro ao guardar visita: ' + (data.error || ''), 'error');
        }
      } catch (err) {
        showToast('Falha na comunicação com o servidor', 'error');
      }
    });
  }

  // Direct 1-Click Add to Google Calendar Button
  if (btnAddGCalendarDirect) {
    btnAddGCalendarDirect.addEventListener('click', async () => {
      const visitData = getVisitFormData();

      if (!visitData.date || !visitData.time) {
        showToast('Preencha a data e hora antes de abrir no Google Calendar', 'error');
        return;
      }

      // 1. Open Google Calendar in new tab immediately
      const calUrl = buildGoogleCalendarUrl(visitData);
      window.open(calUrl, '_blank');

      // 2. Save locally and in Webhook
      try {
        const res = await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(visitData)
        });
        const data = await res.json();
        if (data.success) {
          showToast('📅 Abertura no Google Calendar + Gravado na Agenda SURE!', 'success');
          await loadVisits();
          switchVisitsTab('list');
          formVisit.reset();
        }
      } catch (e) {
        console.warn('Erro ao guardar em segundo plano:', e);
      }
    });
  }

  // Render Visits Cards in the List Tab
  function renderVisitsCards(filter = 'all') {
    if (!visitsCardsContainer) return;
    visitsCardsContainer.innerHTML = '';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let filtered = [...visits];

    if (filter === 'today') {
      filtered = filtered.filter(v => (v.date || '').startsWith(todayStr));
    } else if (filter === 'upcoming') {
      filtered = filtered.filter(v => v.status === 'agendada');
    } else if (filter === 'done') {
      filtered = filtered.filter(v => v.status === 'realizada');
    }

    if (filtered.length === 0) {
      visitsCardsContainer.innerHTML = `
        <div style="text-align:center; padding:2.5rem 1rem; color:var(--cinza);">
          <i class="fa-solid fa-calendar-xmark" style="font-size:2.4rem; opacity:0.4; margin-bottom:0.8rem; display:block;"></i>
          <p style="font-size:0.92rem; margin:0;">Nenhuma visita agendada nesta categoria.</p>
          <button type="button" class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="document.getElementById('tab-btn-new-visit').click()">
            <i class="fa-solid fa-plus"></i> Agendar Agora
          </button>
        </div>`;
      return;
    }

    filtered.forEach(visit => {
      const card = document.createElement('div');
      card.className = `visit-card status-${visit.status || 'agendada'}`;

      const isToday = (visit.date || '').startsWith(todayStr);
      const dateFormatted = visit.date ? new Date(visit.date + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Data a definir';
      const timeFormatted = visit.time || '--:--';
      const durationFormatted = visit.duration ? `${visit.duration} min` : '1 hora';

      const gcalUrl = buildGoogleCalendarUrl(visit);
      const mapsUrl = visit.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.location)}` : null;

      card.innerHTML = `
        <div class="visit-card-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="visit-time-badge ${isToday ? 'is-today' : ''}">
              <i class="fa-regular fa-clock"></i> ${timeFormatted} (${durationFormatted})
            </span>
            <span style="font-size:0.85rem; font-weight:700; color:var(--castanho);">
              📅 ${dateFormatted} ${isToday ? '<strong style="color:var(--terracota); margin-left:4px;">(HOJE)</strong>' : ''}
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="badge" style="font-size:0.72rem; padding:2px 8px; background:#f0ebe4;">
              <i class="fa-solid fa-user-tie"></i> ${esc(visit.consultant_name || 'Consultor')}
            </span>
          </div>
        </div>

        <div class="visit-card-title">${esc(visit.title)}</div>

        <div class="visit-card-details">
          <span><i class="fa-solid fa-user" style="color:var(--terracota);"></i> <strong>${esc(visit.client_name)}</strong></span>
          ${visit.location ? `<span><i class="fa-solid fa-location-dot" style="color:#2b6cb0;"></i> ${esc(visit.location)}</span>` : ''}
          ${visit.price ? `<span><i class="fa-solid fa-tag" style="color:#2f855a;"></i> ${esc(visit.price)}</span>` : ''}
          ${visit.contact ? `<span><i class="fa-solid fa-phone" style="color:#d69e2e;"></i> ${esc(visit.contact)}</span>` : ''}
        </div>

        ${visit.notes ? `<div style="background:#faf8f5; border-left:3px solid #d8d1c9; padding:6px 10px; font-size:0.8rem; color:#666; border-radius:4px;">${esc(visit.notes)}</div>` : ''}

        <div class="visit-card-actions">
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <a href="${gcalUrl}" target="_blank" class="btn btn-gcalendar btn-sm" style="background:#4285F4; color:#fff; font-size:0.75rem; padding:4px 8px;" title="Abrir / Adicionar no Google Calendar">
              <i class="fa-brands fa-google"></i> Google Calendar
            </a>
            ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:4px 8px;" title="Ver localização no Google Maps"><i class="fa-solid fa-map-location-dot"></i> Maps</a>` : ''}
            ${visit.link ? `<a href="${visit.link}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:4px 8px;" title="Ver Imóvel no Portal"><i class="fa-solid fa-arrow-up-right-from-square"></i> Imóvel</a>` : ''}
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            <select class="dropdown-visit-status form-control" data-id="${visit.id}" style="font-size:0.75rem; padding:3px 6px; border-radius:4px; border:1px solid #d8d1c9;">
              <option value="agendada"  ${visit.status === 'agendada'  ? 'selected' : ''}>⏳ Agendada</option>
              <option value="realizada" ${visit.status === 'realizada' ? 'selected' : ''}>✅ Realizada</option>
              <option value="cancelada" ${visit.status === 'cancelada' ? 'selected' : ''}>❌ Cancelada</option>
            </select>
            <button type="button" class="btn-del-visit btn btn-secondary btn-sm" data-id="${visit.id}" title="Eliminar visita" style="color:var(--danger); padding:3px 6px;">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;

      // Status selector change
      const statusSelect = card.querySelector('.dropdown-visit-status');
      if (statusSelect) {
        statusSelect.addEventListener('change', async (e) => {
          const newStatus = e.target.value;
          try {
            await fetch(`/api/visits/${visit.id}/status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
            });
            showToast(`Estado da visita atualizado para: ${newStatus.toUpperCase()}`);
            await loadVisits();
          } catch (err) {
            showToast('Erro ao atualizar estado da visita', 'error');
          }
        });
      }

      // Delete button
      const delBtn = card.querySelector('.btn-del-visit');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          if (!confirm(`Tem a certeza que deseja eliminar a visita com ${visit.client_name}?`)) return;
          try {
            await fetch(`/api/visits/${visit.id}`, { method: 'DELETE' });
            showToast('Visita eliminada da agenda');
            await loadVisits();
          } catch (err) {
            showToast('Erro ao eliminar visita', 'error');
          }
        });
      }

      visitsCardsContainer.appendChild(card);
    });
  }

  // Filter Buttons in List Tab
  document.querySelectorAll('.btn-filter-visit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-filter-visit').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentVisitsFilter = e.currentTarget.dataset.filter || 'all';
      renderVisitsCards(currentVisitsFilter);
    });
  });

  // ── TODOIST CRM & TASK INTEGRATION ─────────────────────────────────────────
  const btnTodoistSettings = document.getElementById('btn-todoist-settings');
  const modalTodoist = document.getElementById('modal-todoist');
  const btnCloseTodoistModal = document.getElementById('btn-close-todoist-modal');
  const formTodoistConfig = document.getElementById('form-todoist-config');
  const inputTodoistToken = document.getElementById('input-todoist-token');
  const inputTodoistFeedbackProject = document.getElementById('input-todoist-feedback-project');
  const inputTodoistAdminProject = document.getElementById('input-todoist-admin-project');
  const inputTodoistFeedbackDays = document.getElementById('input-todoist-feedback-days');
  const btnTestTodoist = document.getElementById('btn-test-todoist');
  const btnSyncTodoistOverdue = document.getElementById('btn-sync-todoist-overdue');
  const btnSaveTodoist = document.getElementById('btn-save-todoist');

  const todoistStatusBadge = document.getElementById('todoist-status-badge');
  const todoistStatusIcon = document.getElementById('todoist-status-icon');
  const todoistStatusTitle = document.getElementById('todoist-status-title');
  const todoistStatusDesc = document.getElementById('todoist-status-desc');

  async function checkTodoistStatus() {
    try {
      const res = await fetch('/api/todoist/status');
      const data = await res.json();
      if (data.configured) {
        if (todoistStatusBadge) {
          todoistStatusBadge.style.background = '#f0fff4';
          todoistStatusBadge.style.borderColor = '#c6f6d5';
        }
        if (todoistStatusIcon) {
          todoistStatusIcon.className = 'fa-solid fa-circle-check';
          todoistStatusIcon.style.color = '#276749';
        }
        if (todoistStatusTitle) {
          todoistStatusTitle.textContent = 'Todoist Conectado & Ativo';
          todoistStatusTitle.style.color = '#22543d';
        }
        const projCount = data.projects ? data.projects.length : 0;
        if (todoistStatusDesc) {
          todoistStatusDesc.textContent = `${projCount} projetos sincronizados. Tarefas de feedback em #${data.feedback_project_name || 'Geral'} e atrasos em #${data.admin_project_name || 'Administrativo'}.`;
        }
        if (data.feedback_project_name && inputTodoistFeedbackProject) {
          inputTodoistFeedbackProject.value = data.feedback_project_name;
        }
        if (data.admin_project_name && inputTodoistAdminProject) {
          inputTodoistAdminProject.value = data.admin_project_name;
        }
        if (data.feedback_due_days && inputTodoistFeedbackDays) {
          inputTodoistFeedbackDays.value = data.feedback_due_days;
        }
      } else {
        if (todoistStatusBadge) {
          todoistStatusBadge.style.background = '#fff5f5';
          todoistStatusBadge.style.borderColor = '#fed7d7';
        }
        if (todoistStatusIcon) {
          todoistStatusIcon.className = 'fa-solid fa-triangle-exclamation';
          todoistStatusIcon.style.color = '#e53e3e';
        }
        if (todoistStatusTitle) {
          todoistStatusTitle.textContent = 'Todoist Não Configurado';
          todoistStatusTitle.style.color = '#9b2c2c';
        }
        if (todoistStatusDesc) {
          todoistStatusDesc.textContent = 'Insira o seu API Token abaixo para ligar.';
        }
      }
    } catch (e) {
      console.warn('Aviso ao verificar Todoist:', e);
    }
  }

  if (btnTodoistSettings) {
    btnTodoistSettings.addEventListener('click', () => {
      checkTodoistStatus();
      if (modalTodoist) modalTodoist.classList.remove('hidden');
    });
  }

  if (btnCloseTodoistModal) {
    btnCloseTodoistModal.addEventListener('click', () => {
      if (modalTodoist) modalTodoist.classList.add('hidden');
    });
  }

  if (btnTestTodoist) {
    btnTestTodoist.addEventListener('click', async () => {
      btnTestTodoist.disabled = true;
      btnTestTodoist.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A testar...';
      try {
        const token = inputTodoistToken ? inputTodoistToken.value.trim() : '';
        if (token) {
          await fetch('/api/todoist/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_token: token })
          });
        }
        const res = await fetch('/api/todoist/test', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`✅ Ligação bem sucedida! ${data.projectsCount} projetos encontrados no Todoist.`);
          checkTodoistStatus();
        } else {
          showToast(`❌ Erro de ligação: ${data.error || 'Token inválido'}`, 'error');
        }
      } catch (err) {
        showToast(`Erro ao testar: ${err.message}`, 'error');
      } finally {
        btnTestTodoist.disabled = false;
        btnTestTodoist.innerHTML = '<i class="fa-solid fa-vial"></i> Testar Ligação';
      }
    });
  }

  if (btnSyncTodoistOverdue) {
    btnSyncTodoistOverdue.addEventListener('click', async () => {
      btnSyncTodoistOverdue.disabled = true;
      btnSyncTodoistOverdue.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A sincronizar...';
      try {
        const res = await fetch('/api/todoist/sync-overdue', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`🎉 ${data.created_count} tarefas de atraso criadas no #Administrativo para os administrativos responsáveis!`);
        } else {
          showToast(`Aviso: ${data.reason || data.error || 'Nenhum atraso pendente de sincronização.'}`);
        }
      } catch (err) {
        showToast(`Erro ao sincronizar: ${err.message}`, 'error');
      } finally {
        btnSyncTodoistOverdue.disabled = false;
        btnSyncTodoistOverdue.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Sincronizar Atrasos Agora';
      }
    });
  }

  if (btnSaveTodoist) {
    btnSaveTodoist.addEventListener('click', async () => {
      btnSaveTodoist.disabled = true;
      btnSaveTodoist.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A guardar...';
      try {
        const payload = {
          api_token: inputTodoistToken ? inputTodoistToken.value.trim() : '',
          feedback_project_name: inputTodoistFeedbackProject ? (inputTodoistFeedbackProject.value.trim() || 'Geral') : 'Geral',
          admin_project_name: inputTodoistAdminProject ? (inputTodoistAdminProject.value.trim() || 'Administrativo') : 'Administrativo',
          feedback_due_days: inputTodoistFeedbackDays ? (Number(inputTodoistFeedbackDays.value) || 2) : 2
        };
        const res = await fetch('/api/todoist/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('✅ Configurações do Todoist guardadas com sucesso!');
          checkTodoistStatus();
          if (modalTodoist) modalTodoist.classList.add('hidden');
        }
      } catch (err) {
        showToast(`Erro ao guardar: ${err.message}`, 'error');
      } finally {
        btnSaveTodoist.disabled = false;
        btnSaveTodoist.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar';
      }
    });
  }

  // ── CHANGE PASSWORD MODAL ──────────────────────────────────────────────────
  const btnOpenChangePassword = document.getElementById('btn-open-change-password');
  const modalChangePassword = document.getElementById('modal-change-password');
  const btnCloseChangePasswordModal = document.getElementById('btn-close-change-password-modal');
  const formChangePassword = document.getElementById('form-change-password');
  const changePassUsername = document.getElementById('change-pass-username');
  const inputCurrentPass = document.getElementById('input-current-pass');
  const inputNewPass = document.getElementById('input-new-pass');
  const inputConfirmNewPass = document.getElementById('input-confirm-new-pass');
  const btnSubmitChangePassword = document.getElementById('btn-submit-change-password');

  if (btnOpenChangePassword) {
    btnOpenChangePassword.addEventListener('click', () => {
      const activeUser = currentUser || { username: 'geral', name: 'Geral' };
      if (changePassUsername) changePassUsername.textContent = `${activeUser.name} (${activeUser.username})`;
      if (inputCurrentPass) inputCurrentPass.value = '';
      if (inputNewPass) inputNewPass.value = '';
      if (inputConfirmNewPass) inputConfirmNewPass.value = '';
      if (modalChangePassword) modalChangePassword.classList.remove('hidden');
    });
  }

  if (btnCloseChangePasswordModal) {
    btnCloseChangePasswordModal.addEventListener('click', () => {
      if (modalChangePassword) modalChangePassword.classList.add('hidden');
    });
  }

  if (btnSubmitChangePassword) {
    btnSubmitChangePassword.addEventListener('click', async () => {
      const activeUser = currentUser || { username: 'geral', id: 'assistant-geral' };
      const currentPass = inputCurrentPass ? inputCurrentPass.value.trim() : '';
      const newPass = inputNewPass ? inputNewPass.value.trim() : '';
      const confirmPass = inputConfirmNewPass ? inputConfirmNewPass.value.trim() : '';

      if (!currentPass) {
        showToast('Por favor insira a palavra-passe atual.', 'error');
        return;
      }
      if (!newPass || newPass.length < 3) {
        showToast('A nova palavra-passe deve ter pelo menos 3 caracteres.', 'error');
        return;
      }
      if (newPass !== confirmPass) {
        showToast('A nova palavra-passe e a confirmação não coincidem.', 'error');
        return;
      }

      btnSubmitChangePassword.disabled = true;
      btnSubmitChangePassword.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A guardar...';

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: activeUser.id,
            username: activeUser.username,
            current_password: currentPass,
            new_password: newPass
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✅ Palavra-passe alterada com sucesso!');
          if (modalChangePassword) modalChangePassword.classList.add('hidden');
        } else {
          showToast(`❌ Erro: ${data.error || 'Não foi possível alterar'}`, 'error');
        }
      } catch (err) {
        showToast(`Erro de rede: ${err.message}`, 'error');
      } finally {
        btnSubmitChangePassword.disabled = false;
        btnSubmitChangePassword.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Nova Palavra-passe';
      }
    });
  }

  // Load visits on application startup
  loadVisits();
  checkTodoistStatus();
});
