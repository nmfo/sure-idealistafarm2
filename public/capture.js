// SURE Idealista Capture Script
// Carregado pelo marcador — envia o HTML da página diretamente para o servidor local
(function () {
  'use strict';
  var SERVER = 'http://localhost:3000';
  var html = document.documentElement.outerHTML;

  var overlay = document.createElement('div');
  overlay.id = '__sure_capture_overlay__';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif';
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;padding:2rem 2.5rem;text-align:center;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,0.3)';
  box.innerHTML = '<div style="font-size:2.5rem;margin-bottom:0.5rem">&#128203;</div><h2 style="color:#C75233;margin:0 0 0.5rem">A capturar imoveis...</h2><p style="color:#555;margin:0">A enviar para a SURE App</p>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  fetch(SERVER + '/api/import-active-client-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: html })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if (data.success) {
      box.innerHTML = '<div style="font-size:2.5rem;margin-bottom:0.5rem">&#127881;</div><h2 style="color:#2a7a2a;margin:0 0 0.5rem">' + data.total_found + ' imoveis capturados!</h2><p style="color:#555;margin:0 0 1rem">Guardados em <strong>' + (data.client_name || 'cliente ativo') + '</strong></p><p style="color:#888;font-size:0.85rem">Esta janela fecha em 3 segundos...</p>';
      setTimeout(function(){ if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 3000);
    } else {
      box.innerHTML = '<div style="font-size:2.5rem;margin-bottom:0.5rem">&#9888;&#65039;</div><h2 style="color:#C75233;margin:0 0 0.5rem">Nenhum imovel detetado</h2><p style="color:#555;margin:0 0 1rem">' + (data.error || 'Abra uma pagina de resultados do Idealista') + '</p><button onclick="document.getElementById(\'__sure_capture_overlay__\').remove()" style="background:#C75233;color:#fff;border:none;border-radius:6px;padding:0.6rem 1.5rem;cursor:pointer;font-size:1rem">Fechar</button>';
    }
  })
  .catch(function(err){
    box.innerHTML = '<div style="font-size:2.5rem;margin-bottom:0.5rem">&#10060;</div><h2 style="color:#C75233;margin:0 0 0.5rem">Erro de ligacao</h2><p style="color:#555;margin:0 0 0.5rem">Certifique-se que a SURE App esta aberta em <strong>localhost:3000</strong></p><button onclick="document.getElementById(\'__sure_capture_overlay__\').remove()" style="background:#C75233;color:#fff;border:none;border-radius:6px;padding:0.6rem 1.5rem;cursor:pointer;font-size:1rem;margin-top:1rem">Fechar</button>';
  });
})();
