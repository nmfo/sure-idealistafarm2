const { resolveIdealistaLocation, resolveAllIdealistaLocations } = require('./geoResolver');
const { buildLocationUrl } = require('./scraper');

function normalizeTypologiesList(typology) {
  if (!typology) return [];
  const raw = Array.isArray(typology) ? typology : String(typology).split(/[,;\/]/);
  return raw.map(t => String(t).toLowerCase().trim()).filter(Boolean);
}

function extractRoomsCount(typologies) {
  const nums = [];
  typologies.forEach(t => {
    const m = t.match(/t(\d+)/i);
    if (m) nums.push(parseInt(m[1], 10));
  });
  return nums;
}

// Escala de preços padrão e dropdown da RE/MAX Portugal
const REMAX_PRICE_STEPS = [
  50000, 60000, 70000, 80000, 90000, 100000, 110000, 120000, 130000, 140000, 
  150000, 160000, 170000, 180000, 190000, 200000, 220000, 240000, 260000, 280000, 
  300000, 350000, 400000, 450000, 500000, 550000, 600000, 650000, 700000, 750000, 
  800000, 850000, 900000, 1000000, 1250000, 1500000, 1750000, 2000000, 2500000, 
  3000000, 4000000, 5000000
];

/**
 * Aproxima qualquer orçamento do cliente ao patamar oficial mais próximo da RE/MAX
 */
function snapToRemaxPrice(val, isMax = true) {
  if (!val || isNaN(val) || Number(val) <= 0) return null;
  const num = Number(val);
  let closest = REMAX_PRICE_STEPS[0];
  let minDiff = Math.abs(num - closest);
  for (const p of REMAX_PRICE_STEPS) {
    const diff = Math.abs(num - p);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest;
}

// Mapeamento exaustivo de Concelhos para Distritos oficiais em Portugal (Zome SEO path)
const DISTRICT_MUNICIPALITY_MAP = {
  // Distrito do Porto
  'povoa-de-varzim': { distrito: 'porto', concelho: 'povoa-de-varzim' },
  'vila-do-conde': { distrito: 'porto', concelho: 'vila-do-conde' },
  'porto': { distrito: 'porto', concelho: 'porto' },
  'matosinhos': { distrito: 'porto', concelho: 'matosinhos' },
  'maia': { distrito: 'porto', concelho: 'maia' },
  'vila-nova-de-gaia': { distrito: 'porto', concelho: 'vila-nova-de-gaia' },
  'santo-tirso': { distrito: 'porto', concelho: 'santo-tirso' },
  'trofa': { distrito: 'porto', concelho: 'trofa' },
  'gondomar': { distrito: 'porto', concelho: 'gondomar' },
  'valongo': { distrito: 'porto', concelho: 'valongo' },
  'paredes': { distrito: 'porto', concelho: 'paredes' },
  'penafiel': { distrito: 'porto', concelho: 'penafiel' },
  'amarante': { distrito: 'porto', concelho: 'amarante' },
  'felgueiras': { distrito: 'porto', concelho: 'felgueiras' },
  'pacos-de-ferreira': { distrito: 'porto', concelho: 'pacos-de-ferreira' },
  'lousada': { distrito: 'porto', concelho: 'lousada' },
  'baiao': { distrito: 'porto', concelho: 'baiao' },
  'marco-de-canaveses': { distrito: 'porto', concelho: 'marco-de-canaveses' },

  // Distrito de Braga
  'braga': { distrito: 'braga', concelho: 'braga' },
  'guimaraes': { distrito: 'braga', concelho: 'guimaraes' },
  'vila-nova-de-famalicao': { distrito: 'braga', concelho: 'vila-nova-de-famalicao' },
  'famalicao': { distrito: 'braga', concelho: 'vila-nova-de-famalicao' },
  'barcelos': { distrito: 'braga', concelho: 'barcelos' },
  'esposende': { distrito: 'braga', concelho: 'esposende' },
  'vila-verde': { distrito: 'braga', concelho: 'vila-verde' },
  'amares': { distrito: 'braga', concelho: 'amares' },
  'fafe': { distrito: 'braga', concelho: 'fafe' },
  'vizela': { distrito: 'braga', concelho: 'vizela' },
  'vieira-do-minho': { distrito: 'braga', concelho: 'vieira-do-minho' },
  'povoa-de-lanhoso': { distrito: 'braga', concelho: 'povoa-de-lanhoso' },
  'terras-de-bouro': { distrito: 'braga', concelho: 'terras-de-bouro' },
  'cabeceiras-de-basto': { distrito: 'braga', concelho: 'cabeceiras-de-basto' },
  'celorico-de-basto': { distrito: 'braga', concelho: 'celorico-de-basto' },

  // Distrito de Viana do Castelo
  'viana-do-castelo': { distrito: 'viana-do-castelo', concelho: 'viana-do-castelo' },
  'ponte-de-lima': { distrito: 'viana-do-castelo', concelho: 'ponte-de-lima' },
  'caminha': { distrito: 'viana-do-castelo', concelho: 'caminha' },
  'valenca': { distrito: 'viana-do-castelo', concelho: 'valenca' },
  'moncao': { distrito: 'viana-do-castelo', concelho: 'moncao' },
  'melgaco': { distrito: 'viana-do-castelo', concelho: 'melgaco' },
  'arcos-de-valdevez': { distrito: 'viana-do-castelo', concelho: 'arcos-de-valdevez' },
  'ponte-da-barca': { distrito: 'viana-do-castelo', concelho: 'ponte-da-barca' },
  'paredes-de-coura': { distrito: 'viana-do-castelo', concelho: 'paredes-de-coura' },
  'vila-nova-de-cerveira': { distrito: 'viana-do-castelo', concelho: 'vila-nova-de-cerveira' },

  // Distrito de Aveiro
  'aveiro': { distrito: 'aveiro', concelho: 'aveiro' },
  'santa-maria-da-feira': { distrito: 'aveiro', concelho: 'santa-maria-da-feira' },
  'espinho': { distrito: 'aveiro', concelho: 'espinho' },
  'ovar': { distrito: 'aveiro', concelho: 'ovar' },
  'sao-joao-da-madeira': { distrito: 'aveiro', concelho: 'sao-joao-da-madeira' },
  'oliveira-de-azemeis': { distrito: 'aveiro', concelho: 'oliveira-de-azemeis' },
  'agueda': { distrito: 'aveiro', concelho: 'agueda' },
  'ilhavo': { distrito: 'aveiro', concelho: 'ilhavo' },
  'albergaria-a-velha': { distrito: 'aveiro', concelho: 'albergaria-a-velha' },
  'anadia': { distrito: 'aveiro', concelho: 'anadia' },
  'estarreja': { distrito: 'aveiro', concelho: 'estarreja' },
  'mealhada': { distrito: 'aveiro', concelho: 'mealhada' },
  'murtosa': { distrito: 'aveiro', concelho: 'murtosa' },
  'oliveira-do-bairro': { distrito: 'aveiro', concelho: 'oliveira-do-bairro' },
  'sever-do-vouga': { distrito: 'aveiro', concelho: 'sever-do-vouga' },
  'vagos': { distrito: 'aveiro', concelho: 'vagos' },
  'vale-de-cambra': { distrito: 'aveiro', concelho: 'vale-de-cambra' },

  // Distrito de Lisboa
  'lisboa': { distrito: 'lisboa', concelho: 'lisboa' },
  'cascais': { distrito: 'lisboa', concelho: 'cascais' },
  'sintra': { distrito: 'lisboa', concelho: 'sintra' },
  'oeiras': { distrito: 'lisboa', concelho: 'oeiras' },
  'loures': { distrito: 'lisboa', concelho: 'loures' },
  'odivelas': { distrito: 'lisboa', concelho: 'odivelas' },
  'amadora': { distrito: 'lisboa', concelho: 'amadora' },
  'mafra': { distrito: 'lisboa', concelho: 'mafra' },
  'vila-franca-de-xira': { distrito: 'lisboa', concelho: 'vila-franca-de-xira' },

  // Distrito de Setúbal
  'setubal': { distrito: 'setubal', concelho: 'setubal' },
  'almada': { distrito: 'setubal', concelho: 'almada' },
  'seixal': { distrito: 'setubal', concelho: 'seixal' },
  'barreiro': { distrito: 'setubal', concelho: 'barreiro' },
  'montijo': { distrito: 'setubal', concelho: 'montijo' },
  'moita': { distrito: 'setubal', concelho: 'moita' },
  'palmela': { distrito: 'setubal', concelho: 'palmela' },
  'sesimbra': { distrito: 'setubal', concelho: 'sesimbra' },
  'alcochete': { distrito: 'setubal', concelho: 'alcochete' },

  // Distrito de Coimbra
  'coimbra': { distrito: 'coimbra', concelho: 'coimbra' },
  'figueira-da-foz': { distrito: 'coimbra', concelho: 'figueira-da-foz' },
  'cantanhede': { distrito: 'coimbra', concelho: 'cantanhede' },
  'montemor-o-velho': { distrito: 'coimbra', concelho: 'montemor-o-velho' },
  'condeixa-a-nova': { distrito: 'coimbra', concelho: 'condeixa-a-nova' },
  'lousa': { distrito: 'coimbra', concelho: 'lousa' },

  // Distrito de Leiria
  'leiria': { distrito: 'leiria', concelho: 'leiria' },
  'marinha-grande': { distrito: 'leiria', concelho: 'marinha-grande' },
  'caldas-da-rainha': { distrito: 'leiria', concelho: 'caldas-da-rainha' },
  'alcobaca': { distrito: 'leiria', concelho: 'alcobaca' },
  'peniche': { distrito: 'leiria', concelho: 'peniche' },
  'pombal': { distrito: 'leiria', concelho: 'pombal' },
  'nazare': { distrito: 'leiria', concelho: 'nazare' },
  'batalha': { distrito: 'leiria', concelho: 'batalha' },
  'obidos': { distrito: 'leiria', concelho: 'obidos' },
  'porto-de-mos': { distrito: 'leiria', concelho: 'porto-de-mos' },

  // Distrito de Faro (Algarve)
  'faro': { distrito: 'faro', concelho: 'faro' },
  'portimao': { distrito: 'faro', concelho: 'portimao' },
  'albufeira': { distrito: 'faro', concelho: 'albufeira' },
  'loule': { distrito: 'faro', concelho: 'loule' },
  'olhao': { distrito: 'faro', concelho: 'olhao' },
  'lagos': { distrito: 'faro', concelho: 'lagos' },
  'tavira': { distrito: 'faro', concelho: 'tavira' },
  'silves': { distrito: 'faro', concelho: 'silves' },
  'lagoa': { distrito: 'faro', concelho: 'lagoa' },
  'vila-real-de-santo-antonio': { distrito: 'faro', concelho: 'vila-real-de-santo-antonio' }
};

/**
 * Constrói URL de Pesquisa para a RE/MAX Portugal com todos os filtros do cliente
 */
function buildRemaxUrl(criteria) {
  const loc = resolveIdealistaLocation(criteria.location || 'braga');
  const typs = normalizeTypologiesList(criteria.typology);
  const rooms = extractRoomsCount(typs);

  let propType = 'apartamento';
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 'moradia';
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    propType = 'terreno';
  } else if (rawType.includes('loja') || rawType.includes('comercio') || rawType.includes('espaco')) {
    propType = 'comercial';
  } else if (rawType.includes('garagem') || rawType.includes('estacionamento')) {
    propType = 'garagem';
  } else if (rawType.includes('predio') || rawType.includes('edificio')) {
    propType = 'predio';
  }

  const queryParams = [];
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    const snappedMin = snapToRemaxPrice(criteria.min_price, false);
    if (snappedMin) queryParams.push(`preco_min=${snappedMin}`);
  }
  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    const snappedMax = snapToRemaxPrice(criteria.max_price, true);
    if (snappedMax) queryParams.push(`preco_max=${snappedMax}`);
  }
  if (criteria.min_area && !isNaN(criteria.min_area) && Number(criteria.min_area) > 0) {
    queryParams.push(`area_min=${Number(criteria.min_area)}`);
  }
  if (rooms.length > 0 && propType !== 'terreno' && propType !== 'garagem') {
    queryParams.push(`quartos=${rooms.join(',')}`);
  }

  const qs = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  return `https://www.remax.pt/pt/comprar/${propType}/${loc}${qs}`;
}

/**
 * Constrói URL de Pesquisa para a Zome Real Estate com todos os filtros do cliente
 * Utiliza o motor canónico de rotas da Zome:
 * /pt/pesquisar/comprar/<tipo>/<t2>/<t3>/l1-<distrito>/l2-<concelho>/total-min-X/total-max-Y/area-Z
 */
function buildZomeUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  const pathSegments = ['comprar'];

  // 1. Tipo de Imóvel
  const rawType = (criteria.property_type || '').toLowerCase();
  let zomeType = 'apartamento';
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    zomeType = 'moradia';
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    zomeType = 'terreno';
  } else if (rawType.includes('loja') || rawType.includes('comercio')) {
    zomeType = 'loja';
  } else if (rawType.includes('escritorio')) {
    zomeType = 'escritorio';
  } else if (rawType.includes('garagem') || rawType.includes('estacionamento')) {
    zomeType = 'garagem';
  } else if (rawType.includes('predio') || rawType.includes('edificio')) {
    zomeType = 'predio';
  }
  pathSegments.push(zomeType);

  // 2. Tipologia / Quartos
  const typs = normalizeTypologiesList(criteria.typology);
  const rooms = [];
  typs.forEach(t => {
    const m = String(t).match(/t(\d+)/i);
    if (m) rooms.push('t' + m[1]);
  });
  if (rooms.length > 0 && zomeType !== 'terreno' && zomeType !== 'garagem') {
    rooms.forEach(r => pathSegments.push(r.toLowerCase()));
  }

  // 3. Localização (l1-<distrito>/l2-<concelho>)
  const geoInfo = DISTRICT_MUNICIPALITY_MAP[locSlug];
  if (geoInfo) {
    pathSegments.push(`l1-${geoInfo.distrito}`);
    pathSegments.push(`l2-${geoInfo.concelho}`);
  } else {
    pathSegments.push(`l1-${locSlug}`);
  }

  // 4. Preço Min / Max
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    pathSegments.push(`total-min-${Number(criteria.min_price)}`);
  }
  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    pathSegments.push(`total-max-${Number(criteria.max_price)}`);
  }

  // 5. Área Mínima
  if (criteria.min_area && !isNaN(criteria.min_area) && Number(criteria.min_area) > 0) {
    pathSegments.push(`area-${Number(criteria.min_area)}`);
  }

  return `https://www.zome.pt/pt/pesquisar/${pathSegments.join('/')}`;
}

/**
 * Constrói URL de Pesquisa para a Arys Imobiliária com todos os filtros do cliente
 * imovnature_id[]: 1=Apartamento, 2=Moradia, 3=Terreno, 4=Comercial
 */
function buildArysUrl(criteria) {
  const typs = normalizeTypologiesList(criteria.typology);
  const rooms = extractRoomsCount(typs);

  const queryParams = [];

  const rawType = (criteria.property_type || '').toLowerCase();
  let arysNatureId = 1; // Default: Apartamento
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    arysNatureId = 2; // Moradia
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    arysNatureId = 3; // Terreno
  } else if (rawType.includes('loja') || rawType.includes('comercio')) {
    arysNatureId = 4; // Comercial
  }

  queryParams.push(`imovnature_id[]=${arysNatureId}`);

  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    queryParams.push(`precomin=${Number(criteria.min_price)}`);
  }
  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    queryParams.push(`precomax=${Number(criteria.max_price)}`);
  }
  if (criteria.min_area && !isNaN(criteria.min_area) && Number(criteria.min_area) > 0) {
    queryParams.push(`areamin=${Number(criteria.min_area)}`);
  }
  if (rooms.length > 0 && arysNatureId !== 3) {
    rooms.forEach(r => queryParams.push(`rooms[]=${r}`));
  }

  const qs = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  return `https://arys.pt/Imoveis${qs}`;
}

/**
 * Retorna todos os links de portais disponíveis para o cliente com suporte a multi-localizações
 */
function getAllPortalUrls(client) {
  const locations = resolveAllIdealistaLocations(client.location);
  const idealistaUrls = locations.map(loc => buildLocationUrl({ ...client, location: loc }));
  const remaxUrls = locations.map(loc => buildRemaxUrl({ ...client, location: loc }));
  const zomeUrls = locations.map(loc => buildZomeUrl({ ...client, location: loc }));
  const arysUrls = locations.map(loc => buildArysUrl({ ...client, location: loc }));

  return {
    idealista: client.custom_search_url || idealistaUrls[0],
    remax: remaxUrls[0],
    zome: zomeUrls[0],
    arys: arysUrls[0],
    locations: locations,
    all_urls: {
      idealista: idealistaUrls,
      remax: remaxUrls,
      zome: zomeUrls,
      arys: arysUrls
    }
  };
}

module.exports = {
  buildRemaxUrl,
  buildZomeUrl,
  buildArysUrl,
  getAllPortalUrls,
  DISTRICT_MUNICIPALITY_MAP
};
