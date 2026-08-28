const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const path = require('path');
const fs = require('fs');
const clientManager = require('./clientManager');
const { buildLocationUrl, parseListingsHtml } = require('./scraper');

const SESSION_DIR  = path.join(__dirname, 'data', 'bot_persistent_profile');
const COOKIES_FILE = path.join(__dirname, 'data', 'bot_cookies.json');
const MAX_RESULTS  = 80;
const MAX_PAGES    = 4;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function countItems(page) {
  try {
    return await page.evaluate(() => {
      const specific = document.querySelectorAll(
        'article.item, article[data-element-id], div.item-info-container'
      ).length;
      if (specific > 0) return specific;
      return [...document.querySelectorAll('article')]
        .filter(a => a.querySelector('a[href*="/imovel/"]')).length;
    });
  } catch { return 0; }
}

async function isRealCaptcha(page) {
  try {
    const count = await countItems(page);
    if (count > 0) return false; // Se tem imóveis, NUNCA é CAPTCHA!

    return await page.evaluate(() => {
      const t = document.title;
      const h = document.documentElement.innerHTML;
      return (t === 'idealista.pt' && !document.querySelector('article')) ||
             h.includes('Deslize para a direita') ||
             h.includes('Certificamo-nos de que nos estamos a dirigir a si') ||
             (document.querySelector('iframe[src*="captcha-delivery"]') !== null && !document.querySelector('article'));
    });
  } catch { return false; }
}

async function acceptCookies(page) {
  try {
    const btn = await page.$('#didomi-notice-agree-button, button:has-text("Aceitar tudo"), button:has-text("Concordar"), [id*="agree"]');
    if (btn) {
      await btn.click();
      await page.waitForTimeout(500);
    }
  } catch {}
}

function buildPageUrl(url, pageNum) {
  if (pageNum <= 1) return url;
  const base = url.split('?')[0].replace(/\/+$/, '');
  return `${base}/?pagina=${pageNum}`;
}

function applyClientFilters(listings, client) {
  const pType = (client.property_type || '').toLowerCase();
  const isResidential = !pType.includes('loja') && !pType.includes('comercio') && !pType.includes('espaco') && !pType.includes('armazem') && !pType.includes('escritorio') && !pType.includes('garagem') && !pType.includes('terreno') && !pType.includes('predio');

  return listings.filter(l => {
    if (client.max_price && l.price_num > 0 && l.price_num > Number(client.max_price)) return false;
    if (client.min_price && l.price_num > 0 && l.price_num < Number(client.min_price)) return false;

    if (isResidential && client.typology && client.typology.length > 0 && l.typology) {
      const clientTyps = Array.isArray(client.typology)
        ? client.typology.map(t => t.toLowerCase())
        : [client.typology.toLowerCase()];
      const listingTyp = l.typology.toLowerCase();
      const matches = clientTyps.some(t => listingTyp.includes(t));
      if (!matches) return false;
    }

    return true;
  });
}

// ── Extract listings from page with scrolling for HD photos ──────────────────

async function collectPage(page) {
  try {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 450) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 60));
      }
    });
    await page.waitForTimeout(800);
  } catch {}
  const html = await page.content();
  return parseListingsHtml(html);
}

// ── Main Bot Runner with Stealth Integration ──────────────────────────────────

async function runAutoSearchBot(clientId) {
  const client = clientManager.getClient(clientId);
  if (!client) throw new Error('Cliente não encontrado');

  const targetUrl = buildLocationUrl(client);

  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  🤖 PESQUISA STEALTH — ${client.name}`);
  console.log(`  🔍 URL : ${targetUrl}`);
  console.log(`${'═'.repeat(64)}\n`);

  const setStatus = s => clientManager.setScrapeStatus(clientId, s);
  let browser = null;
  let page    = null;
  let allListings = [];

  try {
    setStatus('A iniciar navegador seguro...');

    browser = await chromium.launch({
      channel: 'chrome',
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-size=1280,850'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pt-PT'
    });

    page = await context.newPage();

    setStatus('A aceder ao Idealista...');
    console.log(`1. Navegar para: ${targetUrl}`);
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    } catch (e) { console.warn('Aviso navegação:', e.message); }

    await page.waitForTimeout(1500);
    await acceptCookies(page);
    await page.waitForTimeout(1000);

    // Verificar itens ou aguardar caso seja necessário
    let found = 0;
    for (let i = 0; i < 15; i++) {
      try {
        found = await countItems(page);
        if (found > 0) {
          setStatus(`✅ ${found} anúncios detetados na página 1!`);
          console.log(`✅ ${found} anúncios detetados na página 1.`);
          break;
        }

        if (await isRealCaptcha(page)) {
          setStatus('⚠️ CAPTCHA detetado no ecrã — aguardando resolução...');
          console.log('⚠️  CAPTCHA detetado!');
        } else {
          setStatus(`A carregar anúncios (${i + 1}/15)...`);
        }

        await page.waitForTimeout(1000);
      } catch (loopErr) {
        console.warn('Navegador fechado ou intervenção manual:', loopErr.message);
        break;
      }
    }

    // Extrair até 4 páginas (até 80 opções)
    if (found > 0) {
      console.log(`\n📄 A extrair até ${MAX_RESULTS} imóveis (${MAX_PAGES} páginas)...`);

      for (let p = 1; p <= MAX_PAGES && allListings.length < MAX_RESULTS; p++) {
        if (p > 1) {
          const pageUrl = buildPageUrl(targetUrl, p);
          setStatus(`A recolher página ${p}/${MAX_PAGES}...`);
          console.log(`   Página ${p}: ${pageUrl}`);
          try {
            await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
            await page.waitForTimeout(1500);
            await acceptCookies(page);
            const n = await countItems(page);
            if (n === 0) { console.log(`   Página ${p} sem mais anúncios.`); break; }
          } catch (e) {
            console.warn(`   Página ${p} erro:`, e.message);
            break;
          }
        }

        const batch = await collectPage(page);
        console.log(`   Página ${p}: ${batch.length} imóveis extraídos.`);
        allListings.push(...batch);
      }

      // Deduplicar
      const seen = new Set();
      allListings = allListings.filter(l => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });

      // Validação de critérios
      const rawCount = allListings.length;
      allListings = applyClientFilters(allListings, client);
      console.log(`\n✅ Critérios aplicados: ${rawCount} lidos → ${allListings.length} válidos.`);
      console.log(`🎉 SUCESSO! ${allListings.length} IMÓVEIS GRAVADOS PARA O CLIENTE ${client.name}!`);

      if (allListings.length > 0) {
        clientManager.saveListings(allListings, client.id, true);
      }
    } else {
      console.log('⚠️  0 imóveis encontrados para este cliente.');
    }

  } catch (err) {
    console.error('Erro no bot:', err.message);
    throw err;
  } finally {
    setStatus(null);
    try { if (browser) await browser.close(); } catch {}
  }

  return { success: true, total_found: allListings.length, listings: allListings };
}

module.exports = { runAutoSearchBot };
