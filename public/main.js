document.addEventListener('DOMContentLoaded', () => {
  let consultants = [];
  let clients = [];
  let currentClient = null;
  let listings = [];
  let currentFilter = 'all';
  let sidebarFilter = 'all'; // 'all' or 'overdue'
  let clientSearchQuery = '';

  // Collapsed consultant states
  const collapsedConsultants = new Set();

  // Active modal slider state
  let currentSliderPhotos = [];
  let currentSliderIndex = 0;
  let currentModalItem = null;

  // Drag & drop state
  let draggedClientId = null;

  // Custom sending selection cart
  const selectedListingIds = new Set();

  // ── Element references ───────────────────────────────────────────────────
  const consultantsAccordionEl = document.getElementById('consultants-accordion');
  const sidebarCountAll = document.getElementById('sidebar-count-all');
  const sidebarCountOverdue = document.getElementById('sidebar-count-overdue');
  const filterAllClientsBtn = document.getElementById('filter-all-clients');
  const filterOverdueClientsBtn = document.getElementById('filter-overdue-clients');
  const inputClientSearch = document.getElementById('input-client-search');
  const btnClearClientSearch = document.getElementById('btn-clear-client-search');

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

  // ── Initialization & Event Listeners ─────────────────────────────────────
  init();

  async function init() {
    await loadConsultants();
    await loadClients();
  }

  document.getElementById('btn-add-client').addEventListener('click', () => showClientModal(null));
  document.getElementById('btn-add-consultant').addEventListener('click', () => showModal(modalConsultant));

  // Zoho CRM Excel File Upload
  const btnImportZoho = document.getElementById('btn-import-zoho');
  const fileInputZoho = document.getElementById('file-input-zoho');
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
  btnEditClientHeader.addEventListener('click', () => { if (currentClient) showClientModal(currentClient); });
  btnDeleteClientHeader.addEventListener('click', () => { if (currentClient) handleDeleteClient(currentClient.id); });
  
  async function openPortalUrl(portalName) {
    if (!currentClient) {
      showToast('Selecione um cliente primeiro!', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/portals-urls/${currentClient.id}`);
      const data = await res.json();
      if (data.urls && data.urls[portalName]) {
        window.open(data.urls[portalName], '_blank');
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

  if (btnImportHtml) btnImportHtml.addEventListener('click', () => showModal(modalHtml));
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

  formClient.addEventListener('submit', handleSaveClient);
  formConsultant.addEventListener('submit', handleSaveConsultant);
  formHtml.addEventListener('submit', handleImportHtml);

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

  filterAllClientsBtn.addEventListener('click', () => {
    sidebarFilter = 'all';
    filterAllClientsBtn.classList.add('active');
    filterOverdueClientsBtn.classList.remove('active');
    renderConsultantsAccordion();
  });

  filterOverdueClientsBtn.addEventListener('click', () => {
    sidebarFilter = 'overdue';
    filterOverdueClientsBtn.classList.add('active');
    filterAllClientsBtn.classList.remove('active');
    renderConsultantsAccordion();
  });

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

  btnExportCsv.addEventListener('click', () => {
    if (currentClient) window.location.href = `/api/export/${currentClient.id}`;
  });

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
  btnCopySelection.addEventListener('click', () => {
    if (selectedListingIds.size === 0) return;
    const selectedItems = listings.filter(l => selectedListingIds.has(l.id));
    const text = formatCompleteShareMessage(selectedItems, currentClient);

    copyToClipboard(text, `${selectedItems.length} opções copiadas prontas para envio! 📋`);
  });

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

  btnClearSelection.addEventListener('click', () => {
    selectedListingIds.clear();
    updateSelectionDock();
    renderListings();
    showToast('Seleção de envio limpa');
  });

  document.querySelectorAll('.btn-close-modal').forEach(b => b.addEventListener('click', hideModals));

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentFilter = e.currentTarget.dataset.filter;
      renderListings();
    });
  });

  inputSearchFilter.addEventListener('input', renderListings);

  // Slider events
  sliderBtnPrev.addEventListener('click', prevSlide);
  sliderBtnNext.addEventListener('click', nextSlide);
  document.addEventListener('keydown', e => {
    if (!modalDetail.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'Escape') hideModals();
    }
  });

  // ── DATA LOADING ─────────────────────────────────────────────────────────
  async function loadConsultants() {
    try {
      const res = await fetch('/api/consultants');
      consultants = await res.json();
      // Fechar todos os dropdowns de consultores por defeito na abertura da app
      if (collapsedConsultants.size === 0) {
        consultants.forEach(c => collapsedConsultants.add(c.id));
      }
    } catch (e) {
      consultants = [{ id: 'consultant-geral', name: 'Geral', color: '#C75233' }];
      collapsedConsultants.add('consultant-geral');
    }
  }

  async function loadClients() {
    try {
      const res = await fetch('/api/clients');
      clients = await res.json();
      updateSidebarCounters();
      renderConsultantsAccordion();

      if (clients.length > 0 && !currentClient) {
        selectClient(clients[0]);
      } else if (currentClient) {
        const found = clients.find(c => c.id === currentClient.id);
        if (found) selectClient(found);
      }
    } catch (e) {
      showToast('Erro ao carregar clientes', 'error');
    }
  }

  function updateSidebarCounters() {
    sidebarCountAll.textContent = clients.length;
    const overdueCount = clients.filter(c => c.is_overdue).length;
    sidebarCountOverdue.textContent = overdueCount;
  }

  // ── CONSULTANTS & CLIENTS ACCORDION RENDERING ────────────────────────────
  function renderConsultantsAccordion() {
    consultantsAccordionEl.innerHTML = '';

    if (!consultants.length) {
      consultantsAccordionEl.innerHTML = '<div class="loading-spinner">Sem consultores configurados.</div>';
      return;
    }

    let totalRenderedClients = 0;

    consultants.forEach(cons => {
      let consClients = clients.filter(c => (c.consultant_id || 'consultant-geral') === cons.id);
      if (sidebarFilter === 'overdue') {
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
          ${cons.id !== 'consultant-geral' ? `
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

          clientCard.innerHTML = `
            <div class="client-item-top">
              <span class="client-item-name">${esc(c.name)}</span>
              <div style="display:flex;align-items:center;gap:4px;">
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

    clientBadgesEl.innerHTML = `
      <span class="badge"><i class="fa-solid fa-user-tie"></i> ${esc(cons ? cons.name : 'Geral')}</span>
      <span class="badge badge-highlight"><i class="fa-solid fa-building"></i> ${esc(typeLabel)}</span>
      <span class="badge badge-highlight"><i class="fa-solid fa-tag"></i> ${cap(c.operation)}</span>
      <span class="badge"><i class="fa-solid fa-location-dot"></i> ${cap(c.location)}</span>
      <span class="badge"><i class="fa-solid fa-euro-sign"></i> ${priceStr}</span>
      <span class="badge"><i class="fa-solid fa-bed"></i> ${typos}</span>
      ${areaBadge}
      ${amenitiesList}`;

    loadListings();
  }

  // ── CLIENT MODAL (CREATE / EDIT) ─────────────────────────────────────────
  function showClientModal(clientToEdit = null) {
    formClient.reset();
    document.querySelectorAll('input[name="typology"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="amenities"]').forEach(cb => cb.checked = false);

    // Populate consultants dropdown
    const selectCons = document.getElementById('client-consultant');
    selectCons.innerHTML = '';
    consultants.forEach(con => {
      const opt = document.createElement('option');
      opt.value = con.id;
      opt.textContent = con.name;
      selectCons.appendChild(opt);
    });

    if (clientToEdit) {
      document.getElementById('modal-client-title').textContent = 'Editar Cliente & Preferências';
      document.getElementById('client-id').value = clientToEdit.id;
      document.getElementById('client-name').value = clientToEdit.name || '';
      document.getElementById('client-consultant').value = clientToEdit.consultant_id || 'consultant-geral';
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
      id: document.getElementById('client-id').value || null,
      name: document.getElementById('client-name').value.trim(),
      consultant_id: document.getElementById('client-consultant').value,
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

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        showToast('Cliente guardado com sucesso! 💾');
        hideModals();
        await loadClients();
        selectClient(saved);
      } else {
        showToast('Erro ao guardar cliente', 'error');
      }
    } catch (e) {
      showToast('Erro de comunicação', 'error');
    }
  }

  async function handleDeleteClient(clientId) {
    const clientToDelete = clients.find(c => c.id === clientId);
    if (!clientToDelete) return;
    if (!confirm(`Tem a certeza que deseja APAGAR permanentemente o cliente "${clientToDelete.name}" e todas as suas listagens?`)) return;

    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Cliente "${clientToDelete.name}" apagado com sucesso. 🗑️`);
        if (currentClient?.id === clientId) {
          currentClient = null;
        }
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
    } catch (e) {
      showToast('Erro ao apagar cliente', 'error');
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
      const res = await fetch(`/api/listings/clear/${currentClient.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🧹 ${data.deletedCount || listings.length} imóveis limpos com sucesso!`);
        selectedListingIds.clear();
        updateSelectionDock();
        await loadClients();
        await loadListings();
      } else {
        showToast(data.error || 'Erro ao limpar imóveis', 'error');
      }
    } catch (err) {
      showToast('Erro de comunicação com o servidor', 'error');
    }
  }

  if (btnClearListingsHeader) btnClearListingsHeader.addEventListener('click', handleClearClientListings);
  if (btnClearListings) btnClearListings.addEventListener('click', handleClearClientListings);

  // ── CONSULTANT MODAL ─────────────────────────────────────────────────────
  async function handleSaveConsultant(e) {
    e.preventDefault();
    const name = document.getElementById('consultant-name').value.trim();
    const color = document.getElementById('consultant-color').value;

    try {
      const res = await fetch('/api/consultants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      if (res.ok) {
        showToast(`Consultor "${name}" adicionado com sucesso! 👔`);
        hideModals();
        await loadConsultants();
        renderConsultantsAccordion();
      }
    } catch (e) {
      showToast('Erro ao adicionar consultor', 'error');
    }
  }

  // ── LISTINGS MANAGEMENT ──────────────────────────────────────────────────
  async function loadListings() {
    if (!currentClient) return;
    try {
      const res = await fetch(`/api/listings/${currentClient.id}`);
      listings = await res.json();
      updateCounters();
      renderTop3();
      renderListings();
    } catch (e) {
      showToast('Erro ao carregar imóveis', 'error');
    }
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
    if (!currentClient) return;

    const payload = {
      client_id: currentClient.id,
      url: document.getElementById('import-url').value.trim(),
      title: document.getElementById('import-title').value.trim(),
      price: document.getElementById('import-price').value.trim(),
      location: document.getElementById('import-location').value.trim()
    };

    try {
      const res = await fetch('/api/import-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Imóvel adicionado com sucesso! 🔗');
        hideModals();
        await loadClients();
        await loadListings();
      } else {
        showToast('Erro ao importar link', 'error');
      }
    } catch (e) {
      showToast('Erro de comunicação', 'error');
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

  function showModal(modal) { if (modal) modal.classList.remove('hidden'); }
  function hideModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    try { if (formClient) formClient.reset(); } catch (e) {}
    try { if (formConsultant) formConsultant.reset(); } catch (e) {}
    try { if (formHtml) formHtml.reset(); } catch (e) {}
  }

  // Fechar modais ao clicar no fundo ou tecla ESC
  document.querySelectorAll('.modal-backdrop').forEach(m => {
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
    if (labelFolder) labelFolder.textContent = 'Verificar Pasta...';

    btnWord.style.background = '';
    btnWord.style.color = '';
    btnWord.style.borderColor = '';
    if (labelWord) labelWord.textContent = 'Criar Word';

    try {
      const res = await fetch(`/api/drive/client-status/${currentClient.id}`);
      const data = await res.json();
      if (data.success && data.status) {
        clientDriveStatus = data.status;

        // 1. Estado da Pasta (Fica VERDE se já estiver criada)
        if (clientDriveStatus.folder_exists) {
          if (labelFolder) labelFolder.innerHTML = '<i class="fa-solid fa-check"></i> Pasta Criada';
          btnFolder.style.background = '#2e7d32';
          btnFolder.style.color = '#ffffff';
          btnFolder.style.borderColor = '#2e7d32';
        } else {
          if (labelFolder) labelFolder.textContent = 'Criar Pasta';
          btnFolder.style.background = '';
          btnFolder.style.color = '';
          btnFolder.style.borderColor = '';
        }

        // 2. Estado do Word (Fica AZUL se já estiver criado)
        if (clientDriveStatus.word_exists) {
          if (labelWord) labelWord.innerHTML = '<i class="fa-solid fa-check"></i> Word Criado';
          btnWord.style.background = '#1976d2';
          btnWord.style.color = '#ffffff';
          btnWord.style.borderColor = '#1976d2';
        } else {
          if (labelWord) labelWord.textContent = 'Criar Word';
          btnWord.style.background = '';
          btnWord.style.color = '';
          btnWord.style.borderColor = '';
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
    }
  }

  const btnDriveFolder = document.getElementById('btn-drive-folder');
  if (btnDriveFolder) {
    btnDriveFolder.addEventListener('click', async () => {
      if (!currentClient) {
        showToast('Selecione um cliente primeiro', 'error');
        return;
      }
      if (clientDriveStatus && clientDriveStatus.folder_exists) {
        showToast('A pasta já existe no Google Drive! A abrir... 📁', 'success');
        if (clientDriveStatus.folder_url) window.open(clientDriveStatus.folder_url, '_blank');
        return;
      }

      showToast('A criar pasta na pasta "01. Clientes Compradores [REB]"... ⏳');
      try {
        const res = await fetch('/api/drive/create-client-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: currentClient.id })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Pasta de ${currentClient.name} criada com sucesso! 🎉`, 'success');
          await refreshClientDriveStatus();
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
          body: JSON.stringify({ client_id: currentClient.id })
        });
        const data = await res.json();
        if (data.success && data.docResult) {
          showToast('Ficha de Cliente criada na Drive com sucesso! 🎉', 'success');
          await refreshClientDriveStatus();
          if (data.docResult.link) window.open(data.docResult.link, '_blank');
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
    try {
      const res = await fetch('/api/visits');
      visits = await res.json();
      updateVisitsBadge();
      renderVisitsCards(currentVisitsFilter);
    } catch (err) {
      console.warn('Aviso ao carregar visitas:', err);
    }
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
    // Populate Clients
    if (visitClientSelect) {
      const currentSelected = visitClientSelect.value;
      visitClientSelect.innerHTML = '<option value="">-- Selecione o Cliente --</option>';
      clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.location || 'Sem zona'})`;
        visitClientSelect.appendChild(opt);
      });
      if (currentClient) {
        visitClientSelect.value = currentClient.id;
      } else if (currentSelected) {
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
    }

    if (prefill.listing) {
      const l = prefill.listing;
      if (visitListingTitle) visitListingTitle.value = l.title || 'Imóvel para Visita';
      if (visitLocation) visitLocation.value = l.location || (prefill.client ? prefill.client.location : '');
      if (visitPrice) visitPrice.value = l.price || (l.price_num ? l.price_num.toLocaleString('pt-PT') + ' €' : '');
      if (visitLink) visitLink.value = l.link || '';
    } else if (prefill.title) {
      if (visitListingTitle) visitListingTitle.value = prefill.title;
      if (visitLocation) visitLocation.value = prefill.location || '';
      if (visitPrice) visitPrice.value = prefill.price || '';
      if (visitLink) visitLink.value = prefill.link || '';
    }

    // Switch to new visit tab
    switchVisitsTab('new');

    if (modalVisits) modalVisits.classList.remove('hidden');
  }

  function openVisitModalForListing(listing) {
    showVisitsModal({
      client: currentClient,
      listing: listing
    });
  }

  function switchVisitsTab(tab) {
    if (tab === 'new') {
      tabBtnNewVisit.classList.add('active');
      tabBtnListVisits.classList.remove('active');
      tabPaneNewVisit.classList.remove('hidden');
      tabPaneListVisits.classList.add('hidden');
    } else {
      tabBtnNewVisit.classList.remove('active');
      tabBtnListVisits.classList.add('active');
      tabPaneNewVisit.classList.add('hidden');
      tabPaneListVisits.classList.remove('hidden');
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
    const datePart = (visitData.date || '').replace(/-/g, '');
    const timePart = (visitData.time || '10:00').replace(/:/g, '') + '00';
    const startStr = `${datePart}T${timePart}`;

    const durationMin = parseInt(visitData.duration || 60, 10);
    const startObj = new Date(`${visitData.date}T${visitData.time || '10:00'}:00`);
    const endObj = new Date(startObj.getTime() + durationMin * 60 * 1000);

    const endDatePart = `${endObj.getFullYear()}${String(endObj.getMonth() + 1).padStart(2, '0')}${String(endObj.getDate()).padStart(2, '0')}`;
    const endTimePart = `${String(endObj.getHours()).padStart(2, '0')}${String(endObj.getMinutes()).padStart(2, '0')}00`;
    const endStr = `${endDatePart}T${endTimePart}`;

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

    const startObj = new Date(`${date}T${time}:00`);
    const durationMin = parseInt(duration, 10);
    const endObj = new Date(startObj.getTime() + durationMin * 60 * 1000);

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
      start_time: startObj.toISOString(),
      end_time: endObj.toISOString(),
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

  // Load visits on application startup
  loadVisits();
});
