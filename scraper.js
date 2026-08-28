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

  const filterParts = [];
  const hasPrice = (criteria.max_price && !isNaN(criteria.max_price)) ||
                   (criteria.min_price && !isNaN(criteria.min_price));

  if (criteria.max_price && !isNaN(criteria.max_price)) {
    filterParts.push(`com-preco-max_${criteria.max_price}`);
  }
  if (criteria.min_price && !isNaN(criteria.min_price)) {
    filterParts.push(`com-preco-min_${criteria.min_price}`);
  }

  if (isResidential) {
    if (hasPrice) {
      // Com preço: /com-preco-max_400000,t3,t4-t5/ ou /com-preco-max_400000,t4-t5/
      normalizedTyps.forEach(t => filterParts.push(t));
    } else if (normalizedTyps.length > 0) {
      // Sem preço: /t4-t5/ ou /t2-t3/ ou /t3-t4-t5/
      const combinedTypSegment = normalizedTyps.join('-');
      filterParts.push(combinedTypSegment);
    }
  }

  const filterSegment = filterParts.length > 0 ? `/${filterParts.join(',')}/` : '/';
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

// ── Ultra-Robust HTML and Text Parser ──────────────────────────────────────────

function parseListingsHtml(content, baseUrl = 'https://www.idealista.pt') {
  if (!content || typeof content !== 'string') return [];
  const listings = [];
  const seenIds = new Set();

  const $ = cheerio.load(content);

  // 1. Selector universal para artigos e containers de imóveis do Idealista
  $('article, div.item-info-container, div.item[data-element-id], div.item-multimedia-container, div[data-element-id]').each((i, el) => {
    try {
      const art = $(el);
      let listingId = art.attr('data-element-id');

      const titleLink = art.find('a.item-link, a[href*="/imovel/"], a[href*="/empreendimento/"]').first();
      let href = titleLink.attr('href') || '';

      if (!href) {
        // Tentar encontrar qualquer link interno
        const anyLink = art.find('a').filter((_, a) => ($(a).attr('href') || '').includes('/imovel/')).first();
        href = anyLink.attr('href') || '';
      }

      if (!href) return;

      const link = href.startsWith('/') ? `${baseUrl}${href}` : href;

      if (!listingId) {
        const idMatch = href.match(/\/imovel\/(\d+)\//);
        listingId = idMatch ? idMatch[1] : `id_${i + 1}_${Date.now()}`;
      }

      if (seenIds.has(listingId)) return;
      seenIds.add(listingId);

      // Título
      let title = titleLink.text().trim() || titleLink.attr('title') || art.find('a').first().text().trim() || '';
      if (!title || title.length < 5) {
        title = art.find('.item-description, p').first().text().trim().substring(0, 60) || `Imóvel no Idealista (${listingId})`;
      }
      title = title.replace(/\s+/g, ' ');

      // Preço
      const rawPriceEl = art.find('span.item-price, span.price, div.price-row, .txt-bold, [class*="price"]').first();
      let rawPriceText = rawPriceEl.text().trim() || '';

      // Baixa de Preço
      const priceDropEl = art.find('.item-price-drop, .price-drop, .discount, [class*="discount"]').first();
      const priceDropText = priceDropEl.text().trim() || '';

      let priceM2 = '';
      const m2Match = rawPriceText.match(/(\d+[\d\.]*\s*€\/m²)/i);
      if (m2Match) {
        priceM2 = m2Match[1];
        rawPriceText = rawPriceText.replace(m2Match[0], '').trim();
      }

      const mainPriceMatch = rawPriceText.match(/(\d+[\d\.]*\s*€)/);
      const cleanPrice = mainPriceMatch ? mainPriceMatch[1] : (rawPriceText || 'Consultar');
      const priceNum = parseInt(cleanPrice.replace(/[^\d]/g, ''), 10) || 0;

      // Fotografias
      const photos = [];
      art.find('picture source, picture img, img').each((_, imgEl) => {
        const srcCand = $(imgEl).attr('src') || $(imgEl).attr('data-ondemand-img') || $(imgEl).attr('data-src') || $(imgEl).attr('data-srcset') || '';
        const srcsetCand = $(imgEl).attr('srcset') || '';

        [srcsetCand, srcCand].forEach(cand => {
          if (cand) {
            cand.split(',').forEach(entry => {
              const url = cleanPhotoUrl(entry);
              if (url && isRealPropertyPhoto(url) && !photos.includes(url)) {
                photos.push(url);
              }
            });
          }
        });
      });

      const primaryPhoto = photos.length > 0 ? photos[0] : '';

      // Detalhes (tipologia, m2, garagem, elevador, piso, tempo de mercado)
      const details = [];
      let marketTag = '';
      art.find('span.item-detail, div.item-detail, span.item-detail-char, .item-detail-info').each((_, d) => {
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

      let typology = '';
      let area = '';
      let areaNum = 0;
      details.forEach(d => {
        if (/T\d|quarto/i.test(d)) typology = d;
        if (d.includes('m²')) {
          area = d;
          areaNum = parseInt(d.replace(/[^\d]/g, ''), 10) || 0;
        }
      });

      if (!priceM2 && priceNum > 0 && areaNum > 0) {
        priceM2 = Math.round(priceNum / areaNum).toLocaleString('pt-PT') + ' €/m²';
      }

      const locationText = art.find('span.item-title, span.location, span.item-address, .item-detail-address').first().text().trim() || 'Braga';
      const descriptionSnippet = art.find('p.item-description, div.item-description, p.ellipsis').text().trim() || '';

      listings.push({
        id: String(listingId),
        title,
        link,
        price: cleanPrice,
        price_num: priceNum,
        price_m2: priceM2,
        price_drop: priceDropText,
        market_tag: marketTag,
        location: locationText,
        typology: typology || '',
        area: area || '',
        photo: primaryPhoto,
        photos: photos.length > 0 ? photos : (primaryPhoto ? [primaryPhoto] : []),
        description: descriptionSnippet,
        details,
        status: 'novo',
        is_top3: false,
        scraped_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Erro ao processar anúncio individual:', err.message);
    }
  });

  // 2. Fallback: Se não encontrou artigos HTML, tentar regex de links e preços no texto
  if (listings.length === 0) {
    const linkRegex = /\/imovel\/(\d+)\//g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const id = match[1];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        listings.push({
          id,
          title: `Imóvel Idealista (${id})`,
          link: `https://www.idealista.pt/imovel/${id}/`,
          price: 'Consultar',
          price_num: 0,
          price_m2: '',
          location: '',
          typology: '',
          area: '',
          photo: '',
          photos: [],
          description: '',
          details: [],
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
