// SURE Idealista Capture Script v2.0
// Carregado pelo marcador — envia diretamente para a SURE App ou copia para o clipboard com fallback robusto
(function () {
  'use strict';
  var SERVER = 'http://localhost:3000';
  var html = document.documentElement.outerHTML;

  var existing = document.getElementById('__sure_capture_overlay__');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = '__sure_capture_overlay__';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:9999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:14px;padding:2rem 2.5rem;text-align:center;max-width:440px;box-shadow:0 12px 40px rgba(0,0,0,0.35);color:#2D2D2D';
  box.innerHTML = '<div style="font-size:2.8rem;margin-bottom:0.6rem">📋</div><h2 style="color:#C75233;margin:0 0 0.5rem;font-size:1.35rem">A capturar imóveis...</h2><p style="color:#666;margin:0;font-size:0.95rem">A comunicar com a SURE App</p>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function copyFallback() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(html).then(function() {
        showSuccessCopy();
      }).catch(function() {
        execCommandFallback();
      });
    } else {
      execCommandFallback();
    }
  }

  function execCommandFallback() {
    var ta = document.createElement('textarea');
    ta.value = html;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      var ok = document.execCommand('copy');
      if (ok) showSuccessCopy();
      else showManualInstructions();
    } catch(e) {
      showManualInstructions();
    }
    document.body.removeChild(ta);
  }

  function showSuccessCopy() {
    box.innerHTML = '<div style="font-size:2.8rem;margin-bottom:0.6rem">✅</div><h2 style="color:#2a7a2a;margin:0 0 0.5rem;font-size:1.35rem">Página Copiada com Sucesso!</h2><p style="color:#555;margin:0 0 1.2rem;font-size:0.95rem;line-height:1.5">Volte à aplicação SURE e clique no botão verde <strong>📋 Colar Página</strong>.</p><button onclick="document.getElementById(\'__sure_capture_overlay__\').remove()" style="background:#2a7a2a;color:#fff;border:none;border-radius:8px;padding:0.65rem 1.6rem;cursor:pointer;font-size:0.95rem;font-weight:600">Fechar</button>';
    setTimeout(function(){ if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 3500);
  }

  function showManualInstructions() {
    box.innerHTML = '<div style="font-size:2.8rem;margin-bottom:0.6rem">⚠️</div><h2 style="color:#C75233;margin:0 0 0.5rem;font-size:1.3rem">Copiar Código-Fonte</h2><p style="color:#555;font-size:0.92rem;line-height:1.5;margin-bottom:1.2rem">Pressione <strong>Ctrl+U</strong> nesta página, depois <strong>Ctrl+A</strong> e <strong>Ctrl+C</strong>, e cole na SURE App.</p><button onclick="document.getElementById(\'__sure_capture_overlay__\').remove()" style="background:#C75233;color:#fff;border:none;border-radius:8px;padding:0.65rem 1.6rem;cursor:pointer;font-size:0.95rem;font-weight:600">Fechar</button>';
  }

  fetch(SERVER + '/api/import-active-client-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: html })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if (data.success) {
      box.innerHTML = '<div style="font-size:2.8rem;margin-bottom:0.6rem">🎉</div><h2 style="color:#2a7a2a;margin:0 0 0.5rem;font-size:1.35rem">' + data.total_found + ' imóveis capturados!</h2><p style="color:#555;margin:0 0 1rem;font-size:0.95rem">Guardados em <strong>' + (data.client_name || 'cliente ativo') + '</strong> (' + (data.added_new || 0) + ' novos)</p><p style="color:#888;font-size:0.85rem">A fechar em 3 segundos...</p>';
      setTimeout(function(){ if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 3000);
    } else {
      copyFallback();
    }
  })
  .catch(function(err){
    copyFallback();
  });
})();
