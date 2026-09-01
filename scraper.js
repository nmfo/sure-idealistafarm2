const cheerio = require('cheerio');
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
  } else {
    // Apartamentos, Moradias, Casas -> sempre 'casas' no Idealista PT
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
  if (s.endsWith('.gif') || s.includes('.gif?') || s.endsWith('.mp4') || s.includes('.mp4#')) return false;
  if (s.includes('placeholder') || s.includes('static-map') || s.includes('st3.idealista.pt') || s.includes('st1.idealista.pt')) return false;
  if (s.includes('logo') || s.includes('banner') || s.includes('agency') || s.includes('consultor') || s.includes('avatar')) return false;
  return s.includes('idealista.pt') || s.includes('image.master') || s.includes('id.pro.pt') || s.includes('img3.idealista.com') || s.includes('multimedia') || s.includes('photos');
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

module.exports = {
  buildLocationUrl,
  parseListingsHtml,
  isRealPropertyPhoto
};
