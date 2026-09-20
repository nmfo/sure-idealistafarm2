const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const path = require('path');
const fs = require('fs');
const clientManager = require('./clientManager');
const { buildLocationUrl, parseListingsHtml } = require('./scraper');

const SESSION_DIR  = path.join(__dirname, 'data', 'bot_persistent_profile');
const COOKIES_FILE = path.join(__dirname, 'data', 'bot_cookies.json');
const MAX_RESULTS  = 150;
const MAX_PAGES    = 6;

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

// ── EXTRACT DIRECT LISTINGS VIA STEALTH BROWSER ─────────────────────────────
async function fetchDirectListingWithBrowser(rawUrls, clientLocation = '') {
  const urls = Array.isArray(rawUrls) ? rawUrls : [rawUrls];
  if (!urls.length) return [];

  let context = null;
  const results = [];

  try {
    context = await chromium.launchPersistentContext(SESSION_DIR, {
      headless: true,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    for (let rawUrl of urls) {
      let url = (rawUrl || '').trim();
      if (!url) continue;
      if (!url.startsWith('http')) url = 'https://' + url;

      // Extrair ID único
      let itemId = '';
      const idMatches = [
        url.match(/\/imovel\/([^\/\?#]+)/i),
        url.match(/\/imoveis\/[^\/]+\/([^\/\?#]+)/i),
        url.match(/\/listing\/([^\/\?#]+)/i),
        url.match(/\/anuncio\/([^\/\?#]+)/i),
        url.match(/(ZMP[T]?[0-9A-Za-z]+)/i),
        url.match(/\/([0-9]{5,})(?:\/|\?|$)/)
      ];
      for (const m of idMatches) {
        if (m && m[1]) { itemId = m[1]; break; }
      }
      if (!itemId) itemId = `direct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      let portalSource = 'idealista';
      if (url.includes('remax.pt')) portalSource = 'remax';
      else if (url.includes('zome.pt')) portalSource = 'zome';
      else if (url.includes('arys.pt')) portalSource = 'arys';
      else if (url.includes('supercasa.pt')) portalSource = 'supercasa';
      else if (url.includes('imovirtual.com')) portalSource = 'imovirtual';
      else if (url.includes('casa.sapo.pt')) portalSource = 'casasapo';

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1500);
        await acceptCookies(page);

        const extracted = await page.evaluate(() => {
          let title = document.querySelector('h1.main-info__title, h1, .item-title')?.innerText?.trim() || document.title;
          let price = document.querySelector('.info-data-price, .item-price, span.txt-bold, [class*="price"]')?.innerText?.trim() || '';
          let photos = Array.from(document.querySelectorAll('picture img, .main-image img, img[src*="image.master"], img[src*="id.pro.pt"], img[src*="idealista.pt"]'))
            .map(i => i.src)
            .filter(s => s && (s.includes('image.master') || s.includes('id.pro.pt') || s.includes('photos')) && !s.includes('.gif') && !s.includes('placeholder'));
          if (photos.length === 0) {
            photos = Array.from(document.querySelectorAll('img'))
              .map(i => i.src)
              .filter(s => s && (s.includes('image.master') || s.includes('id.pro.pt') || s.includes('zome.pt') || s.includes('remax.pt')) && !s.includes('.gif'));
          }
          let details = Array.from(document.querySelectorAll('.info-features span, .item-detail, .details-property_features li, .item-detail-char span'))
            .map(el => el.innerText.trim())
            .filter(Boolean);
          let desc = document.querySelector('.comment, .description-content, meta[name="description"]')?.innerText || '';
          let pageTitle = document.title;
          return { title, price, photos, details, desc, pageTitle };
        });

        // Limpeza e normalização do título
        let title = (extracted.title || '').replace(/^idealista\.pt\s*[:-]?\s*/i, '').trim();
        if (!title || title.length < 5 || title.toLowerCase().includes('idealista')) {
          title = (extracted.pageTitle || '').replace(/\s*—\s*idealista.*$/i, '').trim();
        }
        if (!title) title = `Imóvel ${portalSource.toUpperCase()} #${itemId}`;

        // Limpeza do preço
        let price = extracted.price || 'Consultar €';
        let priceNum = 0;
        const cleanDigits = price.replace(/[^\d]/g, '');
        if (cleanDigits) priceNum = parseInt(cleanDigits, 10);

        // Extração de tipologia
        let typology = '';
        const typMatch = `${title} ${extracted.details.join(' ')}`.match(/\b(T[0-9]|\bEst[uú]dio\b)/i);
        if (typMatch) typology = typMatch[1].toUpperCase();

        // Extração de área
        let area = '';
        const areaMatch = `${title} ${extracted.details.join(' ')}`.match(/(\d{2,4})\s*(?:m2|m²)/i);
        if (areaMatch) area = `${areaMatch[1]} m²`;

        // Extração de localização
        let location = '';
        const pageTitle = extracted.pageTitle || '';
        if (pageTitle.includes('— idealista')) {
          const locPart = pageTitle.replace(/\s*—\s*idealista.*$/i, '').split(',').slice(1).join(', ').trim();
          if (locPart) location = locPart;
        }
        if (!location) location = clientLocation || 'Portugal';

        const uniquePhotos = Array.from(new Set(extracted.photos.filter(Boolean)));

        results.push({
          id: itemId,
          title: title,
          link: url,
          price: price,
          price_num: priceNum,
          price_m2: '',
          location: location,
          typology: typology,
          area: area,
          photo: uniquePhotos[0] || '',
          photos: uniquePhotos,
          description: extracted.desc || '',
          details: extracted.details.length > 0 ? extracted.details : [typology, area, location].filter(Boolean),
          source: portalSource,
          sources: [portalSource],
          portal_links: { [portalSource]: url },
          status: 'novo',
          is_top3: false,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn(`Erro ao extrair link ${url} via browser:`, err.message);
      }
    }
  } catch (err) {
    console.error('Erro ao inicializar browser context:', err);
  } finally {
    if (context) {
      try { await context.close(); } catch {}
    }
  }

  return results;
}

module.exports = { runAutoSearchBot, fetchDirectListingWithBrowser };
