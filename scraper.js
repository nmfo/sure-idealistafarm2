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

function isRealPropertyPhoto(url) {
  if (!url || typeof url !== 'string') return false;
  const s = url.toLowerCase().trim();
  if (!s || s.startsWith('data:image/svg') || s.startsWith('data:image/gif')) return false;
  if (s.endsWith('.gif') || s.includes('.gif?') || s.endsWith('.mp4') || s.includes('.mp4#') || s.endsWith('.svg') || s.includes('.svg?')) return false;
  if (s.includes('placeholder') || s.includes('static-map') || s.includes('pixel') || s.includes('tracking') || s.includes('facebook.com/tr') || s.includes('doubleclick') || s.includes('google-analytics')) return false;
  if (s.includes('logo') || s.includes('banner-publicidade') || s.includes('agency_') || s.includes('avatar') || s.includes('favicon') || s.includes('icon-') || s.includes('ico_') || s.includes('rating-') || s.includes('star-')) return false;
  return true;
}

function cleanPhotoUrl(url, baseUrl = '') {
  if (!url || typeof url !== 'string') return '';
  let u = url.trim().split(' ')[0].replace(/['",]/g, '');
  if (!u) return '';
  if (u.startsWith('//')) {
    u = 'https:' + u;
  } else if (u.startsWith('/') && baseUrl) {
    u = baseUrl.replace(/\/+$/, '') + u;
  }
  return u;
}

function detectPortalSource(url = '', text = '') {
  const combined = (url + ' ' + text).toLowerCase();
  if (combined.includes('idealista.pt') || combined.includes('idealista')) return 'idealista';
  if (combined.includes('remax.pt') || combined.includes('remax')) return 'remax';
  if (combined.includes('era.pt') || combined.includes('era imobiliaria')) return 'era';
  if (combined.includes('century21.pt') || combined.includes('c21') || combined.includes('century 21')) return 'century21';
  if (combined.includes('zome.pt') || combined.includes('zome') || combined.includes('-zmp') || combined.includes('zmt-')) return 'zome';
  if (combined.includes('supercasa.pt') || combined.includes('supercasa')) return 'supercasa';
  if (combined.includes('arys.pt') || combined.includes('arys')) return 'arys';
  if (combined.includes('maivas.com') || combined.includes('maivas')) return 'maivas';
  if (combined.includes('vivas.pt') || combined.includes('vivas')) return 'vivas';
  if (combined.includes('dsimobiliaria.pt') || combined.includes('dsbragacentro') || combined.includes('ds ')) return 'ds';
  if (combined.includes('one.pt') || combined.includes('realty one') || combined.includes('realtyone')) return 'realtyone';
  if (combined.includes('imovirtual.com') || combined.includes('imovirtual')) return 'imovirtual';
  if (combined.includes('casa.sapo.pt') || combined.includes('casasapo')) return 'casasapo';
  return 'idealista';
}

function getPortalBaseUrl(source, fallbackUrl = '') {
  const map = {
    idealista: 'https://www.idealista.pt',
    remax: 'https://www.remax.pt',
    era: 'https://www.era.pt',
    century21: 'https://century21.pt',
    zome: 'https://www.zome.pt',
    supercasa: 'https://supercasa.pt',
    arys: 'https://arys.pt',
    maivas: 'https://www.maivas.com',
    vivas: 'https://www.vivas.pt',
    ds: 'https://www.dsimobiliaria.pt',
    realtyone: 'https://www.one.pt',
    imovirtual: 'https://www.imovirtual.com',
    casasapo: 'https://casa.sapo.pt'
  };
  return map[source] || fallbackUrl || 'https://www.idealista.pt';
}

function extractCleanPropertyLocation(title = '', explicitLoc = '', clientLocation = '') {
  // 1. Se existir localização explícita válida
  if (explicitLoc && explicitLoc.length > 2 && explicitLoc.length < 45 && explicitLoc.toLowerCase() !== 'braga' && !explicitLoc.includes('Apartamento') && !explicitLoc.includes('Moradia') && !/licen[cç]a|pessoa|seguro|ap[oó]lice|#ref:|se\s*procura|conforto/i.test(explicitLoc)) {
    return explicitLoc.trim();
  }

  // 2. Extrair da estrutura do título do Idealista
  if (title && title.length < 80 && !/licen[cç]a|pessoa|seguro|ap[oó]lice|se\s*procura/i.test(title)) {
    const commaParts = title.split(',').map(s => s.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      const validParts = commaParts.slice(1).filter(p => p.length < 35 && !/^(?:n[º°]?\s*)?\d+(?:\s*s\/n)?$/i.test(p) && p.toLowerCase() !== 's/n' && !/licen[cç]a|seguro/i.test(p));
      if (validParts.length > 0) {
        return validParts.join(', ');
      }
    }

    const emMatch = title.match(/\s+em\s+([A-Za-zÀ-ÿ0-9\.\s\-]{2,35})(?:,|$)/i);
    if (emMatch && emMatch[1] && !/conforto|espa[cç]o|oportunidade|qualidade|destaque|fase/i.test(emMatch[1])) {
      return emMatch[1].trim();
    }
  }

  if (clientLocation && clientLocation.trim()) {
    return clientLocation.trim();
  }

  return 'Braga';
}

// ── Ultra-Robust HTML, JSON, Plain-Text & Multi-Portal Parser ─────────────────
function parseListingsHtml(content, defaultBaseUrl = 'https://www.idealista.pt', clientLocation = '') {
  if (!content || typeof content !== 'string') return [];
  const listings = [];
  const seenIds = new Set();
  const seenUrls = new Set();

  const detectedSource = detectPortalSource(defaultBaseUrl, content);
  const baseUrl = getPortalBaseUrl(detectedSource, defaultBaseUrl);

  // ── 1. PARSE DIRECT JSON / API PAYLOADS ────────────────────────────────────
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      const items = Array.isArray(parsedJson) ? parsedJson : (parsedJson.results || parsedJson.items || parsedJson.listings || parsedJson.data || []);
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item, idx) => {
          const id = item.id || item.listingId || item.reference || `json_${idx}_${Date.now()}`;
          if (seenIds.has(String(id))) return;
          seenIds.add(String(id));

          let link = item.url || item.link || '';
          if (link && !link.startsWith('http')) link = baseUrl.replace(/\/+$/, '') + (link.startsWith('/') ? '' : '/') + link;
          if (!link) link = `${baseUrl}/imovel/${id}`;

          let photos = [];
          if (Array.isArray(item.photos)) photos = item.photos.map(p => typeof p === 'string' ? p : (p.url || p.src || ''));
          else if (Array.isArray(item.images)) photos = item.images.map(p => typeof p === 'string' ? p : (p.url || p.src || ''));
          else if (item.photo) photos = [item.photo];
          else if (item.image) photos = [item.image];
          photos = photos.map(p => cleanPhotoUrl(p, baseUrl)).filter(isRealPropertyPhoto);

          const priceVal = item.price || item.listingPrice || item.currentPrice || 0;
          const priceNum = parseInt(String(priceVal).replace(/[^\d]/g, ''), 10) || 0;
          const cleanPrice = priceNum > 0 ? `${priceNum.toLocaleString('pt-PT')} €` : 'Consultar €';

          listings.push({
            id: String(id),
            title: item.title || item.name || `Imóvel ${detectedSource.toUpperCase()} #${id}`,
            link,
            source: detectPortalSource(link, detectedSource),
            price: cleanPrice,
            price_num: priceNum,
            price_m2: '',
            price_drop: '',
            market_tag: '',
            location: item.location || item.address || clientLocation || 'Portugal',
            typology: item.typology || '',
            area: item.area ? `${item.area} m²` : '',
            photo: photos[0] || '',
            photos,
            description: item.description || '',
            details: [item.typology, item.area, item.location].filter(Boolean),
            status: 'novo',
            is_top3: false,
            scraped_at: new Date().toISOString()
          });
        });
        if (listings.length > 0) return listings;
      }
    } catch (e) {}
  }

  // ── 2. PARSE NEXT.JS __NEXT_DATA__ (RE/MAX, Realty ONE, Idealista Next) ───
  const nextMatch = content.match(/<script id="__NEXT_DATA__"[\s\S]*?>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1]);
      const pp = data.props?.pageProps || {};
      const results = pp.initialSearchResultsInfo?.results || pp.results || pp.listings || pp.items || [];
      if (Array.isArray(results) && results.length > 0) {
        results.forEach((item, idx) => {
          const id = item.listingId || item.id || item.listingID || item.reference || `next_${idx}`;
          if (seenIds.has(String(id))) return;
          seenIds.add(String(id));

          let link = item.url || item.link || item.listingUrl || item.detailUrl || '';
          if (link && !link.startsWith('http')) link = baseUrl.replace(/\/+$/, '') + (link.startsWith('/') ? '' : '/') + link;
          if (!link) {
            const slug = item.slug || item.titleSlug || `${item.listingClass || 'imovel'}-${item.listingType || ''}-${id}`;
            link = `${baseUrl}/pt/imoveis/${slug}/${id}`;
          }

          let photos = [];
          if (Array.isArray(item.photos)) photos = item.photos.map(p => typeof p === 'string' ? p : (p.url || p.src || ''));
          else if (Array.isArray(item.images)) photos = item.images.map(p => typeof p === 'string' ? p : (p.url || p.src || ''));
          else if (item.listingPictureUrl) photos = [item.listingPictureUrl];
          else if (item.pictureUrl) photos = [item.pictureUrl];
          else if (item.photo) photos = [item.photo];

          photos = photos.map(p => cleanPhotoUrl(p, baseUrl)).filter(isRealPropertyPhoto);
          const primaryPhoto = photos[0] || '';

          const priceNum = item.listingPrice || item.price || item.currentPrice || 0;
          const cleanPrice = priceNum > 0 ? `${Number(priceNum).toLocaleString('pt-PT')} €` : 'Consultar €';

          const title = item.listingTitle || item.title || item.name || `Imóvel ${detectedSource.toUpperCase()} #${id}`;
          const typ = item.typology || (item.numberOfBedrooms ? `T${item.numberOfBedrooms}` : (item.bedrooms ? `T${item.bedrooms}` : ''));
          const area = item.totalArea ? `${item.totalArea} m²` : (item.area ? `${item.area} m²` : '');
          const loc = item.regionName || item.location || item.address || clientLocation || 'Portugal';

          listings.push({
            id: String(id),
            title,
            link,
            source: detectedSource,
            price: cleanPrice,
            price_num: priceNum,
            price_m2: area && priceNum > 0 ? `${Math.round(priceNum / parseInt(area, 10)).toLocaleString('pt-PT')} €/m²` : '',
            price_drop: item.previousPrice && item.previousPrice > priceNum ? `Baixou ${(item.previousPrice - priceNum).toLocaleString('pt-PT')} €` : '',
            market_tag: '',
            location: loc,
            typology: typ,
            area: area,
            photo: primaryPhoto,
            photos,
            description: item.description || '',
            details: [typ, area, loc].filter(Boolean),
            status: 'novo',
            is_top3: false,
            scraped_at: new Date().toISOString()
          });
        });
      }
    } catch(e) {}
  }

  // ── 3. PARSE JSON-LD MICRODATA (Supercasa, Century 21, Idealista, etc.) ────
  const ldMatches = [...content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const ldm of ldMatches) {
    try {
      let ldObj = JSON.parse(ldm[1]);
      const items = Array.isArray(ldObj) ? ldObj : (ldObj['@graph'] ? ldObj['@graph'] : [ldObj]);
      items.forEach((item, idx) => {
        if (item['@type'] === 'Product' || item['@type'] === 'SingleFamilyResidence' || item['@type'] === 'RealEstateListing' || item['@type'] === 'Apartment' || item['@type'] === 'House' || item['offers']) {
          const id = item.sku || item.identifier || item.productID || item.url || `ld_${idx}_${Date.now()}`;
          if (seenIds.has(String(id))) return;
          seenIds.add(String(id));

          let link = item.url || '';
          if (link && !link.startsWith('http')) link = baseUrl.replace(/\/+$/, '') + (link.startsWith('/') ? '' : '/') + link;
          if (!link) link = baseUrl;

          let rawPhotos = Array.isArray(item.image) ? item.image : (item.image ? [item.image] : []);
          rawPhotos = rawPhotos.map(p => typeof p === 'string' ? p : (p.url || p.contentUrl || ''));
          const photos = rawPhotos.map(p => cleanPhotoUrl(p, baseUrl)).filter(isRealPropertyPhoto);
          const primaryPhoto = photos[0] || '';

          const priceVal = item.offers?.price || item.price || 0;
          const priceNum = parseInt(String(priceVal).replace(/[^\d]/g, ''), 10) || 0;
          const cleanPrice = priceNum > 0 ? `${priceNum.toLocaleString('pt-PT')} €` : 'Consultar €';

          const title = item.name || item.description || `Imóvel ${detectedSource.toUpperCase()}`;

          listings.push({
            id: String(id),
            title,
            link,
            source: detectPortalSource(link, detectedSource),
            price: cleanPrice,
            price_num: priceNum,
            price_m2: '',
            price_drop: '',
            market_tag: '',
            location: item.address?.addressLocality || clientLocation || 'Portugal',
            typology: '',
            area: '',
            photo: primaryPhoto,
            photos,
            description: item.description || '',
            details: [cleanPrice, item.address?.addressLocality].filter(Boolean),
            status: 'novo',
            is_top3: false,
            scraped_at: new Date().toISOString()
          });
        }
      });
    } catch(e) {}
  }

  // ── 4. MULTI-SELECTOR CHEERIO DOM PARSER ──────────────────────────────────
  const $ = cheerio.load(content);

  const containerSelectors = [
    'article',
    'div.item-info-container',
    'div.item[data-element-id]',
    'div.card',
    'div.property-item',
    'div.property-card',
    'div.property-list-item',
    'div.property-box',
    'div.c21-card',
    'div.imovel-card',
    'div.card-imovel',
    'div.estate-item',
    'div[class*="property"]',
    'div[class*="listing"]',
    'div[class*="imovel"]',
    'li[class*="property"]',
    'li[class*="imovel"]',
    'a[href*="/imovel/"]',
    'a[href*="/imoveis/"]',
    'a[href*="/listing/"]',
    'a[href*="/pt/imovel/"]',
    'a[href*="/pt/imoveis/"]',
    'a[href*="-ZMP"]',
    'a[href*="ZMT-"]',
    'a[href*="/comprar-"]',
    'a[href*="/venda-"]',
    'a[href*="/properties/"]',
    'a[href*="/comprar/"]',
    'a[href*="/arrendar/"]',
    'a[href*="century21.pt"]',
    'a[href*="c21-"]',
    'a[href*="-c21"]',
    'div[class*="c21"]',
    'div[data-testid*="property"]',
    'div[data-testid*="card"]'
  ];

  $(containerSelectors.join(', ')).each((i, el) => {
    try {
      let container = $(el);
      let href = '';

      if (el.tagName === 'a') {
        href = container.attr('href') || '';
        const parentCard = container.closest('div.card, div.property-item, div.property-card, div.property-list-item, div.item, div.col, div[class*="col-"], li, article, div.card-body, div[class*="property"], div[class*="listing"], div[class*="imovel"], div[class*="c21"]');
        if (parentCard.length) container = parentCard;
      } else {
        const titleLink = container.find('a[href*="/imovel/"], a[href*="/imoveis/"], a[href*="/properties/"], a[href*="/listing/"], a[href*="/pt/imovel/"], a[href*="/pt/imoveis/"], a[href*="-ZMP"], a[href*="ZMT-"], a[href*="/comprar-"], a[href*="/venda-"], a[href*="/comprar/"], a[href*="c21-"], a.item-link').first();
        href = titleLink.attr('href') || '';
        if (!href) {
          const anyLink = container.find('a').filter((_, a) => {
            const h = $(a).attr('href') || '';
            return h.includes('/imovel') || h.includes('/imoveis') || h.includes('-ZMP') || h.includes('ZMT') || h.includes('/properties/') || h.includes('/comprar-') || h.includes('/venda-') || h.includes('/comprar/') || h.includes('century21') || h.includes('c21-');
          }).first();
          href = anyLink.attr('href') || '';
        }
      }

      if (!href || href.includes('#') || href.startsWith('javascript:')) return;

      // Make full absolute URL
      let fullLink = href;
      if (fullLink.startsWith('/')) {
        fullLink = baseUrl.replace(/\/+$/, '') + fullLink;
      } else if (!fullLink.startsWith('http')) {
        fullLink = baseUrl.replace(/\/+$/, '') + '/' + fullLink;
      }

      if (seenUrls.has(fullLink)) return;
      seenUrls.add(fullLink);

      const portalSource = detectPortalSource(fullLink, content);

      // Unique ID
      let listingId = container.attr('data-element-id') || container.attr('data-id') || '';
      if (!listingId) {
        const idMatches = [
          fullLink.match(/(ZMP[T]?[0-9A-Za-z]+)/i),
          fullLink.match(/(?:imovel|imoveis|listing|properties|anuncio)\/([^\/\?#]+)/i),
          fullLink.match(/(C21-[^\/\?#]+)/i),
          fullLink.match(/([0-9]{5,})(?:\/|\?|$)/)
        ];
        for (const m of idMatches) {
          if (m && m[1]) {
            listingId = m[1];
            break;
          }
        }
      }
      if (!listingId) listingId = `item_${seenIds.size + 1}_${Date.now()}`;
      if (seenIds.has(listingId)) return;
      seenIds.add(listingId);

      const containerText = container.text().replace(/\s+/g, ' ').trim();

      // Title
      let title = container.find('h1, h2, h3, h4, .title, .item-title, a.item-link, a[title], [class*="title"]').first().text().trim();
      if (!title || title.length < 4 || title.toLowerCase() === 'en' || title.toLowerCase() === 'pt') {
        title = container.find('a[title]').first().attr('title') || container.find('a').first().text().trim();
      }
      if (!title || title.length < 4 || title.toLowerCase() === 'en' || title.toLowerCase() === 'pt') {
        const slug = fullLink.split('/').filter(Boolean).pop() || '';
        title = slug.replace(/[\-_]/g, ' ').trim();
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
      if (!title || title.length < 4) title = `Imóvel ${portalSource.toUpperCase()} #${listingId}`;
      title = title.replace(/\s+/g, ' ').trim();

      // Price
      let rawPrice = '';
      const priceEl = container.find('.price, .item-price, .valor, [class*="price"], [class*="valor"], [class*="preco"], h2 span, h3 span').first();
      if (priceEl.length) rawPrice = priceEl.text().trim();
      if (!rawPrice || !rawPrice.includes('€')) {
        const pm = containerText.match(/(\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?\s*€)/i);
        if (pm) rawPrice = pm[1];
      }
      const priceCleanMatch = rawPrice.match(/(\d[\d\.\s]*\s*€)/);
      const cleanPrice = priceCleanMatch ? priceCleanMatch[1].trim() : (rawPrice || 'Consultar €');
      const priceNum = parseInt(cleanPrice.replace(/[^\d]/g, ''), 10) || 0;

      // Photos
      const photos = [];
      const imgScope = container.closest('div.card, div.col, article, li, div.property-item, div.property-card, div[class*="property"]').length 
        ? container.closest('div.card, div.col, article, li, div.property-item, div.property-card, div[class*="property"]') 
        : container;

      imgScope.find('img, picture source, picture img, div[style*="background-image"], [data-src], [data-lazy], [data-original], [data-image], [data-ondemand-img]').each((_, el) => {
        const tag = $(el);
        const candidates = [
          tag.attr('src'),
          tag.attr('data-src'),
          tag.attr('data-lazy'),
          tag.attr('data-lazy-src'),
          tag.attr('data-original'),
          tag.attr('data-image'),
          tag.attr('data-ondemand-img'),
          tag.attr('data-srcset'),
          tag.attr('srcset')
        ];

        const style = tag.attr('style') || '';
        const bgMatch = style.match(/background(?:-image)?\s*:\s*url\(['"]?([^'"]+)['"]?\)/i);
        if (bgMatch) candidates.push(bgMatch[1]);

        candidates.forEach(cand => {
          if (!cand) return;
          cand.split(',').forEach(entry => {
            const u = cleanPhotoUrl(entry, baseUrl);
            if (u && isRealPropertyPhoto(u) && !photos.includes(u)) {
              photos.push(u);
            }
          });
        });
      });

      const primaryPhoto = photos[0] || '';

      // Details
      const details = [];
      let typology = '';
      let area = '';

      container.find('.spec, .item-detail, .detail, [class*="spec"], [class*="detail"], [class*="feature"]').each((_, d) => {
        const txt = $(d).text().trim();
        if (txt) details.push(txt);
      });

      const typMatch = containerText.match(/\b(T\d(?:\s*\+\s*\d)?)\b/i);
      if (typMatch) typology = typMatch[1].toUpperCase();

      const areaMatch = containerText.match(/(\d+[\d\.]*\s*m²)/i);
      if (areaMatch) area = areaMatch[1];

      let location = container.find('.location, .address, [class*="location"], [class*="address"]').first().text().trim();
      if (!location || location.length < 3) location = extractCleanPropertyLocation(title, '', clientLocation);

      listings.push({
        id: String(listingId),
        title,
        link: fullLink,
        source: portalSource,
        price: cleanPrice,
        price_num: priceNum,
        price_m2: area && priceNum > 0 ? `${Math.round(priceNum / parseInt(area, 10)).toLocaleString('pt-PT')} €/m²` : '',
        price_drop: '',
        market_tag: '',
        location,
        typology,
        area,
        photo: primaryPhoto,
        photos,
        description: container.find('p').first().text().trim() || '',
        details: details.length > 0 ? details : [typology, area, location].filter(Boolean),
        status: 'novo',
        is_top3: false,
        scraped_at: new Date().toISOString()
      });
    } catch(err) {
      console.warn('Error on item:', err.message);
    }
  });

  // ── 5. FALLBACK: PLAIN TEXT & LINK REGEX EXTRACTOR (CTRL+A / CTRL+C) ──────
  if (listings.length === 0) {
    const urlMatches = content.match(/https?:\/\/[^\s"'<>\)]+/gi) || [];
    const validPropertyUrls = urlMatches.filter(u => 
      u.includes('/imovel') || u.includes('/imoveis') || u.includes('/listing') || 
      u.includes('/anuncio') || u.includes('-ZMP') || u.includes('ZMT') || 
      u.includes('/comprar-') || u.includes('/venda-') || u.includes('/properties/') ||
      u.includes('century21.pt') || u.includes('/comprar/') || u.includes('/arrendar/') ||
      u.includes('remax.pt') || u.includes('supercasa.pt') || u.includes('era.pt')
    );

    if (validPropertyUrls.length > 0) {
      validPropertyUrls.forEach((u, idx) => {
        if (seenUrls.has(u)) return;
        seenUrls.add(u);
        const pSource = detectPortalSource(u, '');
        const idMatch = u.match(/(?:imovel|imoveis|listing|properties|anuncio)\/([^\/\?#]+)/i) || u.match(/([0-9]{5,})(?:\/|\?|$)/);
        const id = idMatch ? idMatch[1] : `pasted_${idx}_${Date.now()}`;
        const slug = u.split('/').filter(Boolean).pop() || '';
        const title = slug.replace(/[\-_]/g, ' ').trim() || `Imóvel ${pSource.toUpperCase()} #${id}`;

        listings.push({
          id: String(id),
          title: title.charAt(0).toUpperCase() + title.slice(1),
          link: u,
          source: pSource,
          price: 'Consultar €',
          price_num: 0,
          price_m2: '',
          price_drop: '',
          market_tag: '',
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
      });
    } else {
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let currentItem = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const priceMatch = line.match(/(\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?\s*€)/i);
        const typMatch = line.match(/\b(T\d(?:\s*\+\s*\d)?)\b/i);

        if (priceMatch || (typMatch && line.length < 80)) {
          if (!currentItem) {
            currentItem = {
              title: lines[Math.max(0, i - 1)] || `Imóvel ${detectedSource.toUpperCase()}`,
              price: priceMatch ? priceMatch[1].trim() : 'Consultar €',
              typology: typMatch ? typMatch[1].toUpperCase() : '',
              location: clientLocation || 'Portugal',
              details: []
            };
          } else {
            if (priceMatch) currentItem.price = priceMatch[1].trim();
            if (typMatch) currentItem.typology = typMatch[1].toUpperCase();
          }
        }

        const areaMatch = line.match(/(\d+[\d\.]*\s*m²)/i);
        if (areaMatch && currentItem) {
          currentItem.area = areaMatch[1];
        }

        if (currentItem && (currentItem.price !== 'Consultar €' || currentItem.typology)) {
          if (line.includes('€') || i === lines.length - 1 || lines[i+1]?.includes('€')) {
            const priceNum = parseInt(currentItem.price.replace(/[^\d]/g, ''), 10) || 0;
            const fakeId = `txt_${listings.length + 1}_${Date.now()}`;
            listings.push({
              id: fakeId,
              title: currentItem.title,
              link: baseUrl,
              source: detectedSource,
              price: currentItem.price,
              price_num: priceNum,
              price_m2: '',
              price_drop: '',
              market_tag: '',
              location: currentItem.location,
              typology: currentItem.typology,
              area: currentItem.area || '',
              photo: '',
              photos: [],
              description: '',
              details: [currentItem.typology, currentItem.area, currentItem.location].filter(Boolean),
              status: 'novo',
              is_top3: false,
              scraped_at: new Date().toISOString()
            });
            currentItem = null;
          }
        }
      }
    }
  }

  // Limites justos de extração por portal (proporcionais à relevância de mercado)
  const PORTAL_EXTRACTION_LIMITS = {
    idealista: 150,
    remax: 100,
    supercasa: 90,
    century21: 80,
    era: 80,
    zome: 75,
    imovirtual: 75,
    casasapo: 75,
    realtyone: 50,
    arys: 40,
    maivas: 40,
    vivas: 30,
    ds: 30,
    outro: 50
  };

  const portalCounts = {};
  const limitedListings = [];
  for (const item of listings) {
    const src = (item.source || detectedSource || 'outro').toLowerCase();
    const maxLimit = PORTAL_EXTRACTION_LIMITS[src] || 50;
    portalCounts[src] = (portalCounts[src] || 0) + 1;
    if (portalCounts[src] <= maxLimit) {
      // Higienização profunda de dados (preços, descrições coladas e botões do Supercasa / outros portais)
      const sanitized = sanitizeListingData(item);
      item.title = sanitized.title || item.title;
      item.price = sanitized.price || item.price;
      item.price_num = parseInt(item.price.replace(/[^\d]/g, ''), 10) || item.price_num || 0;
      item.description = sanitized.description;
      item.details = sanitized.details.length > 0 ? sanitized.details : item.details;
      limitedListings.push(item);
    }
  }

  return limitedListings;
}

function detectPropertyType(text) {
  const t = (text || '').toLowerCase();
  if (/\b(?:apartamento|duplex|penthouse|est[uú]dio|andar\s*de\s*moradia)\b/i.test(t)) return 'Apartamento';
  if (/\b(?:moradia|vivenda|casa)\b/i.test(t)) return 'Moradia';
  if (/\b(?:terreno|lote|quinta|herdade)\b/i.test(t)) return 'Terreno';
  if (/\b(?:loja|espa[cç]o\s*comercial|armaz[eé]m|pavilh[aã]o)\b/i.test(t)) return 'Espaço Comercial';
  if (/\b(?:escrit[oó]rio|gabinete)\b/i.test(t)) return 'Escritório';
  if (/\b(?:garagem|box|parqueamento)\b/i.test(t)) return 'Garagem';
  if (/\b(?:pr[eé]dio|edif[ií]cio)\b/i.test(t)) return 'Prédio';
  return 'Apartamento';
}

function detectParish(text) {
  const t = (text || '').toLowerCase();
  if (/\b(?:s[\.\s]*vicente|são\s*vicente)\b/i.test(t)) return 'São Vicente';
  if (/\b(?:s[\.\s]*v[ií]tor|são\s*vítor|são\s*victor)\b/i.test(t)) return 'São Vítor';
  if (/\b(?:gualtar)\b/i.test(t)) return 'Gualtar';
  if (/\b(?:nogueir[oó])\b/i.test(t)) return 'Nogueiró';
  if (/\b(?:ten[oõ]es)\b/i.test(t)) return 'Tenões';
  if (/\b(?:lama[cç][aã]es)\b/i.test(t)) return 'Lamaçães';
  if (/\b(?:frai[aã]o)\b/i.test(t)) return 'Fraião';
  if (/\b(?:real)\b/i.test(t)) return 'Real';
  if (/\b(?:frossos)\b/i.test(t)) return 'Frossos';
  if (/\b(?:dume)\b/i.test(t)) return 'Dume';
  if (/\b(?:maximinos)\b/i.test(t)) return 'Maximinos';
  if (/\b(?:cividade)\b/i.test(t)) return 'Cividade';
  if (/\b(?:s[eé]\s*de\s*braga|freguesia\s*da\s*s[eé])\b/i.test(t)) return 'Sé';
  if (/\b(?:lomar)\b/i.test(t)) return 'Lomar';
  if (/\b(?:ferreiros)\b/i.test(t)) return 'Ferreiros';
  if (/\b(?:palmeira)\b/i.test(t)) return 'Palmeira';
  if (/\b(?:celeir[oó]s)\b/i.test(t)) return 'Celeirós';
  if (/\b(?:azur[eé]m)\b/i.test(t)) return 'Azurém';
  if (/\b(?:creixomil)\b/i.test(t)) return 'Creixomil';
  if (/\b(?:urgezes)\b/i.test(t)) return 'Urgezes';
  if (/\b(?:calend[aá]rio)\b/i.test(t)) return 'Calendário';
  if (/\b(?:antas)\b/i.test(t)) return 'Antas';
  if (/\b(?:joane)\b/i.test(t)) return 'Joane';
  return '';
}

function sanitizeListingData(raw) {
  let title = (raw.title || '').trim();
  let price = (raw.price || '').trim();
  let description = (raw.description || '').trim();
  let details = Array.isArray(raw.details) ? raw.details : [];
  let location = (raw.location || '').trim();
  let typology = (raw.typology || '').trim();
  let area = (raw.area || '').trim();

  // 1. Extrair Preço se estiver embutido no título ou descrição
  const priceRegex = /(\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?\s*€)/i;
  if (!price || price === 'Consultar €') {
    const pm = description.match(priceRegex) || title.match(priceRegex);
    if (pm) price = pm[1].trim();
  }

  // 2. Extrair Tipologia se embutida
  if (!typology) {
    const typM = (title + ' ' + description).match(/\b(T\d(?:\s*\+\s*\d)?|\d+\s*quartos)\b/i);
    if (typM) {
      if (/quartos/i.test(typM[1])) {
        const qNum = typM[1].match(/\d+/);
        if (qNum) typology = `T${qNum[0]}`;
      } else {
        typology = typM[1].toUpperCase().replace(/\s+/g, '');
      }
    }
  }

  // 3. Extrair Área se embutida
  if (!area) {
    const areaM = (title + ' ' + description).match(/(\d+[\d\.]*\s*m²)/i);
    if (areaM) area = areaM[1].trim();
  }

  // 4. Limpar e Sintetizar TÍTULO (Prevenir parágrafos gigantes, AMI e texto de marketing)
  const isDescriptionDump = title.length > 70 || 
    /licen[cç]a\s*ami|pessoa\s*coletiva|seguro\s*responsabilidade|ap[oó]lice|fidelidade|#ref:|se\s*procura|encontra-se|excelente\s*oportunidade|marque\s*j[aá]\s*a\s*sua|venha\s*conhecer|desloca[cç][oõ]es\s*f[aá]ceis|predimed|remax|era\s*imobili[aá]ria|century\s*21/i.test(title);

  if (isDescriptionDump) {
    if (!description || description.length < 20) {
      description = title;
    }
    
    const propType = detectPropertyType(title + ' ' + description);
    const cleanTyp = typology || (title.match(/\bT\d\b/i) ? title.match(/\bT\d\b/i)[0].toUpperCase() : '');
    const cleanLoc = (location && location !== 'Portugal' && location !== 'Localização Geral' && location.length < 35 && !/conforto|espa[cç]o|oportunidade|licen[cç]a|seguro|ap[oó]lice|#ref:|se\s*procura/i.test(location)) ? location : (raw.client_location || 'Braga');
    const extraLoc = detectParish(title + ' ' + description);

    if (extraLoc && !cleanLoc.toLowerCase().includes(extraLoc.toLowerCase())) {
      title = `${propType} ${cleanTyp} em ${extraLoc}, ${cleanLoc}`.replace(/\s+/g, ' ').trim();
    } else {
      title = `${propType} ${cleanTyp} em ${cleanLoc}`.replace(/\s+/g, ' ').trim();
    }
  } else {
    title = title.replace(priceRegex, '').replace(/#ref:[^\s]+/gi, '').replace(/\s+/g, ' ').trim();
    title = title.replace(/^\s*-\s*/, '').replace(/,\s*$/, '').trim();
  }

  // 5. Limpar Descrição: remover avisos legais, licença AMI, apólices de seguro, telefones
  if (description) {
    description = description.replace(priceRegex, '');
    description = description.replace(/(?:Predimed|RE\/MAX|ERA|Century\s*21|Zome|Decisões\s*e\s*Soluções)[^.]*?(?:Licen[cç]a\s*AMI|Pessoa\s*Coletiva|Ap[oó]lice)[^.]*\./gi, '');
    description = description.replace(/Licen[cç]a\s*AMI\s*(?:n[º°])?\s*\d+/gi, '');
    description = description.replace(/Pessoa\s*Coletiva\s*(?:n[º°])?\s*\d+/gi, '');
    description = description.replace(/Seguro\s*Responsabilidade\s*Civil[^#\n]*/gi, '');
    description = description.replace(/#ref:[^\s]+/gi, '');
    description = description.replace(/(?:\bVer telefone\b|\bContactar\b|\bPedir Informação\b|\bGuardar anúncio\b|\bPartilhar\b)[\s\S]*$/gi, '');
    description = description.replace(/\s+/g, ' ').trim();
  }

  // 6. Limpar Detalhes: remover botões e deduplicar
  const invalidDetailPattern = /telefone|contactar|contacto|ver telefone|pedir|guardar|partilhar|anunciante|agência|imobiliária|ref:|ami|consultor|privacidade|apólice|seguro|fidelidade|coletiva|predimed/i;
  const cleanedDetails = [];
  const seenDetail = new Set();

  if (typology && !seenDetail.has(typology.toLowerCase())) {
    seenDetail.add(typology.toLowerCase());
    cleanedDetails.push(typology);
  }
  if (area && !seenDetail.has(area.toLowerCase())) {
    seenDetail.add(area.toLowerCase());
    cleanedDetails.push(area);
  }

  details.forEach(d => {
    if (!d || typeof d !== 'string') return;
    let cleanD = d.replace(/\s+/g, ' ').trim();
    if (cleanD.length < 2 || cleanD.length > 35) return;
    if (invalidDetailPattern.test(cleanD)) return;
    if (/\b(?:quartos|t\d)\b/i.test(cleanD) && /m²/i.test(cleanD)) return;

    const qMatch = cleanD.match(/^(\d+)\s*quartos?$/i);
    if (qMatch) cleanD = `T${qMatch[1]}`;

    const key = cleanD.toLowerCase();
    if (!seenDetail.has(key)) {
      seenDetail.add(key);
      cleanedDetails.push(cleanD);
    }
  });

  const lowerDesc = description.toLowerCase();
  if (/garagem|box|lugar de garagem/i.test(lowerDesc) && !seenDetail.has('garagem') && !seenDetail.has('com garagem')) {
    seenDetail.add('garagem');
    cleanedDetails.push('Com Garagem');
  }
  if (/elevador/i.test(lowerDesc) && !seenDetail.has('elevador') && !seenDetail.has('com elevador')) {
    seenDetail.add('elevador');
    cleanedDetails.push('Com Elevador');
  }

  return {
    title,
    price: price || 'Consultar €',
    description: description.slice(0, 300),
    details: cleanedDetails.slice(0, 4),
    typology,
    area
  };
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
