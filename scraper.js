const cheerio = require('cheerio');
const axios = require('axios');
const { resolveIdealistaLocation } = require('./geoResolver');

function normalizeTypologySlug(t) {
  const norm = String(t || '').toLowerCase().trim();
  if (norm === 't0' || norm === 'estudio') return 't0';
  if (norm === 't1') return 't1';
  if (norm === 't2') return 't2';
  if (norm === 't3') return 't3';
  if (/^t([4-9]|\d{2,})$/i.test(norm) || norm.includes('4') || norm.includes('5') || norm === 't4+' || norm === 't4-t5') return 't4-t5';
  return null;
}

function buildLocationUrl(criteria) {
  const operation = (criteria.operation || 'comprar').toLowerCase();
  let propType = 'casas';
  let isResidential = true;
  let residentialTypeFilter = null;

  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('loja') || rawType.includes('comercio') || rawType.includes('comércio') || rawType.includes('espaco') || rawType.includes('espaço') || rawType.includes('armazem') || rawType.includes('armazém') || rawType.includes('pavilh')) {
    propType = 'espacos-comerciais';
    isResidential = false;
  } else if (rawType.includes('escritorio') || rawType.includes('escritório') || rawType.includes('gabinete')) {
    propType = 'escritorios';
    isResidential = false;
  } else if (rawType.includes('garagem') || rawType.includes('box') || rawType.includes('parqueamento')) {
    propType = 'garagens';
    isResidential = false;
  } else if (rawType.includes('terreno') || rawType.includes('lote') || rawType.includes('quinta') || rawType.includes('herdade')) {
    propType = 'terrenos';
    isResidential = false;
  } else if (rawType.includes('predio') || rawType.includes('prédio') || rawType.includes('edificio') || rawType.includes('edifício')) {
    propType = 'predios';
    isResidential = false;
  } else if (rawType.includes('quarto')) {
    propType = 'quartos';
    isResidential = false;
  } else if (rawType.includes('moradia-terrea') || rawType.includes('térrea') || rawType.includes('terrea')) {
    propType = 'casas';
    isResidential = true;
    residentialTypeFilter = 'moradias';
  } else if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 'casas';
    isResidential = true;
    residentialTypeFilter = 'moradias';
  } else if (rawType.includes('apartamento') || rawType.includes('duplex') || rawType.includes('penthouse') || rawType.includes('flat')) {
    propType = 'casas';
    isResidential = true;
    residentialTypeFilter = 'apartamentos';
  } else {
    propType = 'casas';
    isResidential = true;
  }

  // Resolução universal automática do concelho canónico aceite pelo Idealista
  let location = resolveIdealistaLocation(criteria.location);
  if (location === 'portugal') location = 'braga';

  const opPath = `${operation}-${propType}`;

  // Extrair e normalizar tipologias (apenas relevante para imóveis residenciais)
  const rawTyps = Array.isArray(criteria.typology)
    ? criteria.typology
    : (typeof criteria.typology === 'string' ? criteria.typology.split(/[,;\/]/) : []);

  const normalizedTyps = [];
  if (isResidential) {
    rawTyps.forEach(rt => {
      const n = normalizeTypologySlug(rt);
      if (n && !normalizedTyps.includes(n)) {
        normalizedTyps.push(n);
      }
    });
  }

  const filterTokens = [];

  // Filtro estrito de tipo de imóvel (moradias vs apartamentos)
  if (isResidential && residentialTypeFilter) {
    filterTokens.push(residentialTypeFilter);
  }

  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    filterTokens.push(`preco-max_${Number(criteria.max_price)}`);
  }
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    filterTokens.push(`preco-min_${Number(criteria.min_price)}`);
  }

  const minAreaNum = criteria.min_area || criteria.min_surface || null;
  const maxAreaNum = criteria.max_area || criteria.max_surface || null;
  if (minAreaNum && !isNaN(minAreaNum) && Number(minAreaNum) > 0) {
    filterTokens.push(`tamanho-min_${Number(minAreaNum)}`);
  }
  if (maxAreaNum && !isNaN(maxAreaNum) && Number(maxAreaNum) > 0) {
    filterTokens.push(`tamanho-max_${Number(maxAreaNum)}`);
  }

  let filterSegment = '/';
  if (isResidential) {
    if (filterTokens.length > 0) {
      // O primeiro parâmetro leva o prefixo 'com-', os restantes não levam 'com-'
      const firstWithCom = `com-${filterTokens[0]}`;
      const rest = filterTokens.slice(1);
      const allParts = [firstWithCom, ...rest, ...normalizedTyps];
      filterSegment = `/${allParts.join(',')}/`;
    } else if (normalizedTyps.length > 0) {
      // Apenas tipologias sem filtros: /t2-t3/ ou /t3/
      const combinedTypSegment = normalizedTyps.join('-');
      filterSegment = `/${combinedTypSegment}/`;
    }
  } else {
    if (filterTokens.length > 0) {
      const firstWithCom = `com-${filterTokens[0]}`;
      const rest = filterTokens.slice(1);
      filterSegment = `/${[firstWithCom, ...rest].join(',')}/`;
    }
  }

  return `https://www.idealista.pt/${opPath}/${location}${filterSegment}`;
}

function cleanPhotoUrl(url) {
  if (!url) return '';
  let u = url.trim().split(' ')[0];
  if (u.startsWith('//')) u = 'https:' + u;
  return u;
}

function isRealPropertyPhoto(url) {
  if (!url || typeof url !== 'string') return false;
  const s = url.toLowerCase();
  if (s.endsWith('.gif') || s.includes('.gif?') || s.endsWith('.mp4') || s.includes('.mp4#') || s.endsWith('.svg') || s.includes('.svg?')) return false;
  if (s.includes('placeholder') || s.includes('static-map') || s.includes('st3.idealista.pt') || s.includes('st1.idealista.pt')) return false;
  if (s.includes('logo') || s.includes('banner') || s.includes('agency') || s.includes('consultor') || s.includes('avatar') || s.includes('/website/')) return false;
  return s.includes('idealista') || s.includes('image.master') || s.includes('id.pro.pt') || s.includes('crm360.pt') || s.includes('lysgroup') || s.includes('arys.pt') || s.includes('remax') || s.includes('zome') || s.includes('supercasa') || s.includes('imoimg.pt') || s.includes('imovirtual') || s.includes('casasapo') || s.includes('/imoveis/') || s.includes('/imovel/') || s.includes('photos') || s.includes('foto') || s.includes('images');
}

function extractCleanPropertyLocation(title = '', explicitLoc = '', clientLocation = '') {
  // 1. Se existir localização explícita que não seja um título longo nem 'Braga'
  if (explicitLoc && explicitLoc.length > 2 && explicitLoc.length < 80 && explicitLoc.toLowerCase() !== 'braga' && !explicitLoc.includes('Apartamento') && !explicitLoc.includes('Moradia')) {
    return explicitLoc;
  }

  // 2. Extrair da estrutura do título do Idealista
  if (title) {
    const commaParts = title.split(',').map(s => s.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      const validParts = commaParts.slice(1).filter(p => !/^(?:n[º°]?\s*)?\d+(?:\s*s\/n)?$/i.test(p) && p.toLowerCase() !== 's/n');
      if (validParts.length > 0) {
        return validParts.join(', ');
      }
    }

    const emMatch = title.match(/\s+em\s+([^,]+(?:,\s*[^,]+)*)/i);
    if (emMatch && emMatch[1]) {
      return emMatch[1].trim();
    }
  }

  if (clientLocation && clientLocation.trim()) {
    return clientLocation.trim();
  }

  return 'Localização Geral';
}

// ── Ultra-Robust HTML and Text Parser ──────────────────────────────────────────

function parseListingsHtml(content, baseUrl = 'https://www.idealista.pt', clientLocation = '') {
  if (!content || typeof content !== 'string') return [];
  const listings = [];
  const seenIds = new Set();
  const seenUrls = new Set();

  const $ = cheerio.load(content);

  // 1. Selector universal para artigos e containers de imóveis (Idealista, Arys, RE/MAX, Zome)
  $('article, div.item-info-container, div.item[data-element-id], div.card, div.property-item, div.property-card, div[class*="property"], div[class*="listing"], a[href*="/imovel/"], a[href*="/imoveis/"], a[href*="/listing/"], a[href*="/pt/imovel/"], a[href*="/pt/imoveis/"], a[href*="-ZMP"], a[href*="ZMT-"], a[href*="/pt/moradia-"], a[href*="/pt/apartamento-"], a[href*="/pt/terreno-"], a[href*="/pt/predio-"], a[href*="/pt/loja-"]').each((i, el) => {
    try {
      let container = $(el);
      let href = '';

      if (el.tagName === 'a') {
        href = container.attr('href') || '';
        // Procurar o container pai relevante
        const parentCard = container.closest('div.card, div.property-item, div.item, div.col, div[class*="col-"], li, article, div.card-body, .property-card, div[class*="property"], div[class*="listing"]');
        if (parentCard.length) container = parentCard;
      } else {
        const titleLink = container.find('a.item-link, a[href*="/imovel/"], a[href*="/imoveis/"], a[href*="/empreendimento/"], a[href*="/listing/"], a[href*="/pt/imovel/"], a[href*="-ZMP"], a[href*="ZMT-"]').first();
        href = titleLink.attr('href') || '';
        if (!href) {
          const anyLink = container.find('a').filter((_, a) => ($(a).attr('href') || '').includes('/imovel/') || ($(a).attr('href') || '').includes('/imoveis/') || ($(a).attr('href') || '').includes('-ZMP')).first();
          href = anyLink.attr('href') || '';
        }
      }

      if (!href || href.includes('#') || href.startsWith('javascript:')) return;

      // Normalizar link completo
      let fullLink = href;
      if (fullLink.startsWith('/')) {
        if (content.includes('arys.pt')) fullLink = 'https://arys.pt' + href;
        else if (content.includes('remax.pt')) fullLink = 'https://www.remax.pt' + href;
        else if (content.includes('zome.pt') || href.includes('-ZMP') || href.includes('ZMT-')) fullLink = 'https://www.zome.pt' + href;
        else fullLink = baseUrl.replace(/\/$/, '') + href;
      }

      if (seenUrls.has(fullLink)) return;
      seenUrls.add(fullLink);

      // Identificar portal de origem
      let portalSource = 'idealista';
      if (fullLink.includes('remax.pt') || fullLink.includes('remax')) portalSource = 'remax';
      else if (fullLink.includes('zome.pt') || fullLink.includes('zome') || fullLink.includes('-ZMP') || fullLink.includes('ZMT-')) portalSource = 'zome';
      else if (fullLink.includes('arys.pt') || fullLink.includes('arys')) portalSource = 'arys';

      // Extrair ID único
      let listingId = container.attr('data-element-id') || '';
      if (!listingId) {
        const zomeMatch = fullLink.match(/(ZMP[T]?[0-9A-Za-z]+)/i);
        const generalMatch = fullLink.match(/(?:imovel|imoveis|listing)\/([^\/\?#]+)/i);
        listingId = zomeMatch ? zomeMatch[1] : (generalMatch ? generalMatch[1] : `prop_${i + 1}_${Date.now()}`);
      }

      if (seenIds.has(listingId)) return;
      seenIds.add(listingId);

      // Extrair texto completo do container
      const containerText = container.text().replace(/\s+/g, ' ').trim();

      // Título
      let title = container.find('h1, h2, h3, h4, a.item-link, a[title], [class*="title"]').first().text().trim();
      if (!title || title.length < 4) {
        title = container.find('a').first().attr('title') || container.find('a').first().text().trim() || `Imóvel ${portalSource.toUpperCase()} (${listingId})`;
      }
      title = title.replace(/\s+/g, ' ').trim();

      // Preço
      let rawPriceText = '';
      const priceEl = container.find('span.item-price, span.price, div.price-row, .txt-bold, [class*="price"], h2 span, h3 span, [class*="valor"]').first();
      if (priceEl.length) {
        rawPriceText = priceEl.text().trim();
      }
      if (!rawPriceText || !rawPriceText.includes('€')) {
        const pm = containerText.match(/(\d[\d\.\s]*\s*€)/);
        if (pm) rawPriceText = pm[1];
      }

      // Baixa de Preço
      const priceDropEl = container.find('.item-price-drop, .price-drop, .discount, [class*="discount"]').first();
      const priceDropText = priceDropEl.text().trim() || '';

      let priceM2 = '';
      const m2Match = containerText.match(/(\d+[\d\.]*\s*€\/m²)/i);
      if (m2Match) {
        priceM2 = m2Match[1];
      }

      const mainPriceMatch = rawPriceText.match(/(\d[\d\.\s]*\s*€)/);
      const cleanPrice = mainPriceMatch ? mainPriceMatch[1].trim() : (rawPriceText || 'Consultar €');
      const priceNum = parseInt(cleanPrice.replace(/[^\d]/g, ''), 10) || 0;

      // Fotografias
      const photos = [];
      const imgScope = container.closest('div.card, div.col, article, li, div.property-item, div[class*="property"]').length ? container.closest('div.card, div.col, article, li, div.property-item, div[class*="property"]') : container;
      imgScope.find('picture source, picture img, img').each((_, imgEl) => {
        const srcCand = $(imgEl).attr('src') || $(imgEl).attr('data-ondemand-img') || $(imgEl).attr('data-src') || $(imgEl).attr('data-srcset') || '';
        const srcsetCand = $(imgEl).attr('srcset') || '';

        [srcsetCand, srcCand].forEach(cand => {
          if (cand) {
            cand.split(',').forEach(entry => {
              const url = cleanPhotoUrl(entry);
              if (url && !url.includes('.gif') && !url.includes('.svg') && !url.includes('logo') && !url.includes('avatar') && !url.includes('icon') && !photos.includes(url)) {
                photos.push(url);
              }
            });
          }
        });
      });

      const primaryPhoto = photos.length > 0 ? photos[0] : '';

      // Detalhes & Localização
      const details = [];
      let marketTag = '';
      container.find('span.item-detail, div.item-detail, span.item-detail-char, .item-detail-info, [class*="spec"]').each((_, d) => {
        const txt = $(d).text().trim();
        if (txt) {
          if (txt.includes('€/m²') && !priceM2) {
            priceM2 = txt;
          } else {
            details.push(txt);
            if (/ontem|hoje|dias|semana|mês|meses/i.test(txt)) {
              marketTag = txt;
            }
          }
        }
      });

      let locationText = '';
      const locEl = container.find('.location, span.item-address, span.location, p.location, span.item-detail-address, [class*="location"]').first();
      if (locEl.length) {
        locationText = locEl.text().trim().replace(/&gt;/g, '>').replace(/\s+/g, ' ');
      }
      if (!locationText) {
        locationText = extractCleanPropertyLocation(title, '', clientLocation);
      }

      // Tipologia & Área
      let typology = '';
      let area = '';
      details.forEach(d => {
        if (/T\d|quarto/i.test(d)) typology = d;
        if (d.includes('m²')) area = d;
      });

      if (!typology) {
        const typMatch = containerText.match(/\b(T\d(?:\s*\+\s*\d)?)\b/i);
        if (typMatch) typology = typMatch[1].toUpperCase();
      }

      if (!area) {
        const areaMatch = containerText.match(/(\d+[\d\.]*\s*m²)/i);
        if (areaMatch) area = areaMatch[1];
      }

      const areaNum = area ? parseInt(area.replace(/[^\d]/g, ''), 10) : 0;
      if (!priceM2 && priceNum > 0 && areaNum > 0) {
        priceM2 = Math.round(priceNum / areaNum).toLocaleString('pt-PT') + ' €/m²';
      }

      const descriptionSnippet = container.find('p.item-description, div.item-description, p.ellipsis, p').first().text().trim() || '';

      listings.push({
        id: String(listingId),
        title,
        link: fullLink,
        source: portalSource,
        price: cleanPrice,
        price_num: priceNum,
        price_m2: priceM2,
        price_drop: priceDropText,
        market_tag: marketTag,
        location: locationText || 'Portugal',
        typology: typology || '',
        area: area || '',
        photo: primaryPhoto,
        photos: photos.length > 0 ? photos : (primaryPhoto ? [primaryPhoto] : []),
        description: descriptionSnippet,
        details: details.length > 0 ? details : [typology, area, locationText].filter(Boolean),
        status: 'novo',
        is_top3: false,
        scraped_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Erro ao processar anúncio individual:', err.message);
    }
  });

  // 2. Fallback por Regex e Nuxt State no HTML completo
  if (listings.length === 0) {
    const linkRegex = /(?:https?:\/\/(?:www\.)?(?:idealista\.pt|arys\.pt|remax\.pt|zome\.pt))?(\/(?:(?:pt\/)?(?:imovel|imoveis|listing))\/([^\/\?"'\s>]+))/gi;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const path = match[1];
      const id = match[2];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const fullLink = match[0].startsWith('http') ? match[0] : `${baseUrl.replace(/\/$/, '')}${path}`;
        let portalSource = 'idealista';
        if (fullLink.includes('remax.pt')) portalSource = 'remax';
        else if (fullLink.includes('zome.pt')) portalSource = 'zome';
        else if (fullLink.includes('arys.pt')) portalSource = 'arys';

        listings.push({
          id,
          title: `Imóvel ${portalSource.toUpperCase()} (${id})`,
          link: fullLink,
          source: portalSource,
          price: 'Consultar €',
          price_num: 0,
          price_m2: '',
          location: clientLocation || 'Portugal',
          typology: '',
          area: '',
          photo: '',
          photos: [],
          description: '',
          details: [],
          status: 'novo',
          is_top3: false,
          scraped_at: new Date().toISOString()
        });
      }
    }
  }

  return listings;
}

// ── DIRECT LINK FETCH & ENRICH ───────────────────────────────────────────────
async function fetchDirectListingFromUrl(rawUrl, extraData = {}, clientLocation = '') {
  let url = (rawUrl || '').trim();
  if (!url) return null;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Identificar portal de origem
  let portalSource = 'idealista';
  const urlLower = url.toLowerCase();
  if (urlLower.includes('idealista.pt') || urlLower.includes('idealista.com')) portalSource = 'idealista';
  else if (urlLower.includes('remax.pt') || urlLower.includes('remax.com')) portalSource = 'remax';
  else if (urlLower.includes('zome.pt') || urlLower.includes('zome.com')) portalSource = 'zome';
  else if (urlLower.includes('arys.pt')) portalSource = 'arys';
  else if (urlLower.includes('supercasa.pt')) portalSource = 'supercasa';
  else if (urlLower.includes('imovirtual.com')) portalSource = 'imovirtual';
  else if (urlLower.includes('casa.sapo.pt') || urlLower.includes('casasapo')) portalSource = 'casasapo';
  else if (urlLower.includes('era.pt')) portalSource = 'era';
  else if (urlLower.includes('century21.pt') || urlLower.includes('c21')) portalSource = 'century21';
  else if (urlLower.includes('kwportugal.pt') || urlLower.includes('kellerwilliams')) portalSource = 'kw';
  else portalSource = 'outro';

  // Extrair ID único a partir do URL
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
    if (m && m[1]) {
      itemId = m[1];
      break;
    }
  }
  if (!itemId) {
    itemId = `direct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }

  let title = extraData.title ? extraData.title.trim() : '';
  let price = extraData.price ? extraData.price.trim() : '';
  let location = extraData.location ? extraData.location.trim() : '';
  let typology = '';
  let area = '';
  let photo = '';
  let photos = [];
  let description = '';
  let details = ['Link Direto'];

  // Tentativa de obter metadados via HTTP Request
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 6000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });

    if (res.data && typeof res.data === 'string') {
      const $ = cheerio.load(res.data);

      // Parse all key-value pairs from dl/dt/dd, tables, and detail lists (Arys, Supercasa, Remax, Zome)
      const detailsMap = {};
      $('dl, tr, .row > div').each((_, el) => {
        const dt = $(el).find('dt, th, .label, .title').first().text().trim().toLowerCase();
        const dd = $(el).find('dd, td, .value, span').last().text().trim();
        if (dt && dd && !detailsMap[dt]) {
          detailsMap[dt] = dd;
        }
      });

      // 1. Título
      if (!title) {
        const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content');
        if (ogTitle && ogTitle.length > 5 && !ogTitle.toLowerCase().includes('idealista.pt')) {
          title = ogTitle.trim();
        } else {
          const h1 = $('h1').first().text().trim();
          const h2 = $('h2.fs-32, h2.title, h2.property-title, h2').first().text().trim();
          const pageTitle = $('title').text().trim();
          title = h1 || h2 || pageTitle || '';
        }
      }

      // 2. Preço
      if (!price) {
        const ogPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[property="og:price:amount"]').attr('content');
        if (ogPrice && !isNaN(ogPrice)) {
          price = `${Number(ogPrice).toLocaleString('pt-PT')} €`;
        } else {
          const priceEls = $('p.fs-26, span.item-price, span.price, div.price, [class*="price"], [class*="valor"], [class*="preco"], h2 span, h3 span');
          priceEls.each((_, el) => {
            const txt = $(el).text().trim();
            if (txt.includes('€') && !price) {
              price = txt;
            }
          });
        }
        if (!price) {
          const matchPrice = res.data.match(/(\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?\s*€)/i);
          if (matchPrice) price = matchPrice[1].replace(/\s+/g, ' ').trim();
        }
      }

      // 3. Imagem / Fotos
      const ogImg = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || $('link[rel="image_src"]').attr('href');
      if (ogImg && isRealPropertyPhoto(ogImg)) {
        photo = cleanPhotoUrl(ogImg);
        photos.push(photo);
      }

      $('img').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy') || $(img).attr('data-original');
        if (src && isRealPropertyPhoto(src)) {
          const cleaned = cleanPhotoUrl(src);
          if (cleaned && !photos.includes(cleaned)) {
            photos.push(cleaned);
          }
        }
      });
      if (!photo && photos.length > 0) {
        photo = photos[0];
      }

      // 4. Descrição
      const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('.description, .descricao, [class*="description"]').text();
      if (ogDesc) description = ogDesc.trim();

      // 5. Tipologia, Área, Garagem & Quartos a partir do mapa de detalhes
      if (detailsMap['quartos']) {
        const qNum = detailsMap['quartos'].replace(/[^\d]/g, '');
        if (qNum) typology = `T${qNum}`;
      }
      if (detailsMap['área útil'] || detailsMap['área bruta'] || detailsMap['área']) {
        area = detailsMap['área útil'] || detailsMap['área bruta'] || detailsMap['área'];
      }
      if (detailsMap['garagem']) {
        const gNum = parseInt(detailsMap['garagem'], 10);
        if (gNum > 0) details.push('Garagem incluída');
      }
      if (detailsMap['wc']) {
        details.push(`${detailsMap['wc']} WC`);
      }

      // 6. Localização & Freguesia
      const freg = detailsMap['freguesia'] || '';
      const conc = detailsMap['concelho'] || '';
      if (freg && conc) {
        location = `${freg}, ${conc}`;
      } else if (freg) {
        location = freg;
      } else if (conc) {
        location = conc;
      }

      if (!location) {
        const metaLoc = $('meta[name="geo.placename"]').attr('content');
        if (metaLoc) location = metaLoc.trim();
        else location = extractCleanPropertyLocation(title, '', clientLocation);
      }

      // 7. Enriquecer título se for apenas "Apartamento T3" ou slug
      if (title && (title.length < 20 || !title.includes(location))) {
        if (location && location !== 'Portugal') {
          title = `${title} em ${location}`;
        }
      }
    }
  } catch (err) {
    // Ignorar falhas de rede / anti-bot do portal e seguir com inferência inteligente por URL
  }

  // Se o título ou dados continuam em branco, inferir a partir do slug do URL
  if (!title) {
    const urlSlug = url.replace(/https?:\/\/[^\/]+\//, '').replace(/[?#].*$/, '').replace(/\/$/, '');
    const cleanSlug = decodeURIComponent(urlSlug)
      .replace(/[\/\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b(?:imovel|imoveis|anuncio|listing|pt|comprar|venda)\b/gi, '')
      .trim();

    if (cleanSlug.length > 5) {
      title = cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1);
    } else {
      title = `Imóvel ${portalSource.toUpperCase()} #${itemId}`;
    }
  }

  // Título limpo e formatado
  title = title.replace(/\s+/g, ' ').replace(/^idealista\.pt\s*[:-]?\s*/i, '').trim();

  // Inferir tipologia se ainda vazia
  if (!typology) {
    const tm = `${title} ${url}`.match(/\b(T[0-9]|\bEst[uú]dio\b)/i);
    if (tm) typology = tm[1].toUpperCase();
  }

  // Inferir área se ainda vazia
  if (!area) {
    const am = `${title} ${url}`.match(/(\d{2,4})\s*(?:m2|m²)/i);
    if (am) area = `${am[1]} m²`;
  }

  // Inferir localização se ainda vazia
  if (!location) {
    location = extractCleanPropertyLocation(title, '', clientLocation);
  }

  // Preço numérico
  let priceNum = 0;
  if (price) {
    const cleanDigits = price.replace(/[^\d]/g, '');
    if (cleanDigits) {
      priceNum = parseInt(cleanDigits, 10);
      price = `${priceNum.toLocaleString('pt-PT')} €`;
    }
  }
  if (!price || price === '0' || priceNum === 0) {
    price = 'Consultar €';
  }

  if (typology && !details.some(d => d.includes('Tipologia') || d === typology)) details.unshift(`Tipologia ${typology}`);
  if (area && !details.includes(area)) details.push(area);

  return {
    id: itemId,
    title: title || `Imóvel ${portalSource.toUpperCase()} #${itemId}`,
    link: url,
    price: price,
    price_num: priceNum,
    price_m2: '',
    location: location || clientLocation || 'Portugal',
    typology: typology,
    area: area,
    photo: photo || '',
    photos: photos.length > 0 ? photos : (photo ? [photo] : []),
    description: description || '',
    details: details,
    source: portalSource,
    sources: [portalSource],
    portal_links: { [portalSource]: url },
    status: 'novo',
    is_top3: false,
    scraped_at: new Date().toISOString()
  };
}

module.exports = {
  buildLocationUrl,
  parseListingsHtml,
  isRealPropertyPhoto,
  fetchDirectListingFromUrl
};
