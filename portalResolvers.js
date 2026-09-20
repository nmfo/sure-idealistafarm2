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

function capitalize(str) {
  if (!str) return '';
  return str.split(/[- ]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Escala de preços oficial do dropdown da RE/MAX Portugal
const REMAX_PRICE_STEPS = [
  50000, 60000, 70000, 75000, 80000, 90000, 100000, 110000, 120000, 125000, 130000, 140000, 
  150000, 160000, 170000, 175000, 180000, 190000, 200000, 220000, 225000, 240000, 250000, 260000, 275000, 280000, 
  300000, 325000, 350000, 375000, 400000, 450000, 500000, 550000, 600000, 650000, 700000, 750000, 
  800000, 850000, 900000, 950000, 1000000, 1250000, 1500000, 1750000, 2000000, 2500000, 
  3000000, 4000000, 5000000
];

/**
 * Aproxima qualquer orçamento do cliente ao patamar oficial superior (ceiling) da RE/MAX
 */
function snapToRemaxPrice(val, isMax = true) {
  if (!val || isNaN(val) || Number(val) <= 0) return null;
  const num = Number(val);
  if (isMax) {
    for (const p of REMAX_PRICE_STEPS) {
      if (p >= num) return p;
    }
    return REMAX_PRICE_STEPS[REMAX_PRICE_STEPS.length - 1];
  } else {
    let matched = REMAX_PRICE_STEPS[0];
    for (const p of REMAX_PRICE_STEPS) {
      if (p <= num) matched = p;
      else break;
    }
    return matched;
  }
}

// Mapeamento exaustivo de Concelhos para Distritos oficiais em Portugal
const DISTRICT_MUNICIPALITY_MAP = {
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

// Mapeamentos específicos para portais com IDs próprios
const ARYS_PLACES = {
  'braga': 'concelho_36',
  'guimaraes': 'concelho_41',
  'vila-nova-de-famalicao': 'concelho_45',
  'famalicao': 'concelho_45',
  'barcelos': 'concelho_35',
  'amares': 'concelho_34',
  'esposende': 'concelho_38',
  'fafe': 'concelho_39',
  'povoa-de-lanhoso': 'concelho_42',
  'terras-de-bouro': 'concelho_43',
  'vieira-do-minho': 'concelho_44',
  'vila-verde': 'concelho_46',
  'vizela': 'concelho_47',
  'porto': 'distrito_13',
  'matosinhos': 'concelho_179',
  'maia': 'concelho_178',
  'vila-nova-de-gaia': 'concelho_187',
  'povoa-de-varzim': 'concelho_182',
  'vila-do-conde': 'concelho_186',
  'viana-do-castelo': 'distrito_16',
  'lisboa': 'distrito_11'
};

const MAIVAS_LOCATIONS = {
  'braga': { country: 2, region: 40, district: 146 },
  'guimaraes': { country: 2, region: 40, district: 146 },
  'famalicao': { country: 2, region: 40, district: 146 },
  'vila-nova-de-famalicao': { country: 2, region: 40, district: 146 },
  'barcelos': { country: 2, region: 40, district: 146 },
  'porto': { country: 2, region: 13, district: 145 },
  'matosinhos': { country: 2, region: 13, district: 145 },
  'maia': { country: 2, region: 13, district: 145 },
  'vila-nova-de-gaia': { country: 2, region: 13, district: 145 },
  'viana-do-castelo': { country: 2, region: 16, district: 147 },
  'lisboa': { country: 2, region: 11, district: 134 }
};

const EGO_GEO_CODES = {
  // Distrito de Braga (dd=03)
  'braga': { dd: '03', cc: '03' },
  'guimaraes': { dd: '03', cc: '08' },
  'vila-nova-de-famalicao': { dd: '03', cc: '12' },
  'famalicao': { dd: '03', cc: '12' },
  'barcelos': { dd: '03', cc: '02' },
  'esposende': { dd: '03', cc: '06' },
  'vila-verde': { dd: '03', cc: '13' },
  'amares': { dd: '03', cc: '01' },
  'fafe': { dd: '03', cc: '07' },
  'vizela': { dd: '03', cc: '14' },
  'povoa-de-lanhoso': { dd: '03', cc: '09' },
  'vieira-do-minho': { dd: '03', cc: '11' },
  'terras-de-bouro': { dd: '03', cc: '10' },
  'cabeceiras-de-basto': { dd: '03', cc: '04' },
  'celorico-de-basto': { dd: '03', cc: '05' },

  // Distrito do Porto (dd=13)
  'porto': { dd: '13', cc: '12' },
  'matosinhos': { dd: '13', cc: '08' },
  'maia': { dd: '13', cc: '06' },
  'vila-nova-de-gaia': { dd: '13', cc: '17' },
  'gondomar': { dd: '13', cc: '04' },
  'valongo': { dd: '13', cc: '15' },
  'povoa-de-varzim': { dd: '13', cc: '13' },
  'vila-do-conde': { dd: '13', cc: '16' },
  'santo-tirso': { dd: '13', cc: '14' },
  'trofa': { dd: '13', cc: '18' },
  'paredes': { dd: '13', cc: '10' },
  'penafiel': { dd: '13', cc: '11' },
  'amarante': { dd: '13', cc: '01' },
  'felgueiras': { dd: '13', cc: '03' },
  'pacos-de-ferreira': { dd: '13', cc: '09' },
  'lousada': { dd: '13', cc: '05' },
  'marco-de-canaveses': { dd: '13', cc: '07' },

  // Distrito de Viana do Castelo (dd=16)
  'viana-do-castelo': { dd: '16', cc: '09' },
  'ponte-de-lima': { dd: '16', cc: '07' },
  'caminha': { dd: '16', cc: '02' },
  'valenca': { dd: '16', cc: '08' },
  'moncao': { dd: '16', cc: '04' },
  'arcos-de-valdevez': { dd: '16', cc: '01' },
  'ponte-da-barca': { dd: '16', cc: '06' },
  'paredes-de-coura': { dd: '16', cc: '05' },
  'vila-nova-de-cerveira': { dd: '16', cc: '10' },
  'melgaco': { dd: '16', cc: '03' },

  // Distrito de Aveiro (dd=01)
  'aveiro': { dd: '01', cc: '05' },
  'santa-maria-da-feira': { dd: '01', cc: '09' },
  'espinho': { dd: '01', cc: '06' },
  'ovar': { dd: '01', cc: '14' },
  'sao-joao-da-madeira': { dd: '01', cc: '16' },
  'ilhavo': { dd: '01', cc: '10' },
  'agueda': { dd: '01', cc: '01' },
  'albergaria-a-velha': { dd: '01', cc: '02' },
  'oliveira-de-azemeis': { dd: '01', cc: '13' },
  'anadia': { dd: '01', cc: '03' },
  'estarreja': { dd: '01', cc: '08' },

  // Distrito de Lisboa (dd=11)
  'lisboa': { dd: '11', cc: '06' },
  'cascais': { dd: '11', cc: '05' },
  'sintra': { dd: '11', cc: '11' },
  'oeiras': { dd: '11', cc: '10' },
  'amadora': { dd: '11', cc: '15' },
  'odivelas': { dd: '11', cc: '16' },
  'loures': { dd: '11', cc: '07' },
  'mafra': { dd: '11', cc: '09' },
  'vila-franca-de-xira': { dd: '11', cc: '14' },

  // Distrito de Setúbal (dd=15)
  'setubal': { dd: '15', cc: '12' },
  'almada': { dd: '15', cc: '03' },
  'seixal': { dd: '15', cc: '10' },
  'barreiro': { dd: '15', cc: '04' },
  'montijo': { dd: '15', cc: '07' },
  'moita': { dd: '15', cc: '06' },
  'palmela': { dd: '15', cc: '08' },
  'sesimbra': { dd: '15', cc: '11' },

  // Distrito de Coimbra (dd=06)
  'coimbra': { dd: '06', cc: '03' },
  'figueira-da-foz': { dd: '06', cc: '05' },
  'cantanhede': { dd: '06', cc: '02' },

  // Distrito de Leiria (dd=10)
  'leiria': { dd: '10', cc: '09' },
  'marinha-grande': { dd: '10', cc: '10' },
  'caldas-da-rainha': { dd: '10', cc: '06' },

  // Distrito de Faro (dd=08)
  'faro': { dd: '08', cc: '05' },
  'portimao': { dd: '08', cc: '11' },
  'albufeira': { dd: '08', cc: '01' },
  'loule': { dd: '08', cc: '08' },
  'lagos': { dd: '08', cc: '07' }
};

/**
 * 1. RE/MAX Portugal
 * Rota canónica oficial: https://www.remax.pt/pt/comprar/imoveis/{propType}/{distrito}/{concelho}/r/{restrictions}?p=1&o=-PublishDate
 * Exemplos:
 *  - /r/t3,preco__500000 (T3 até 500.000€)
 *  - /r/preco__250000 (qualquer tipologia até 250.000€)
 *  - /r/t,preco_100000_300000 (de 100k a 300k)
 */
function buildRemaxUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  const geoInfo = DISTRICT_MUNICIPALITY_MAP[locSlug];
  const distrito = geoInfo ? geoInfo.distrito : locSlug;
  const concelho = geoInfo ? geoInfo.concelho : locSlug;

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

  // Segmento de restrições /r/...
  const restrictions = [];

  // Tipologia
  if (rooms.length === 1 && propType !== 'terreno' && propType !== 'garagem') {
    restrictions.push(`t${rooms[0]}`);
  } else if (rooms.length > 1 && propType !== 'terreno' && propType !== 'garagem') {
    restrictions.push(`t${rooms[0]}`); // RE/MAX aceita t3 ou t na rota canónica
  }

  // Patamar de preço aproximado ao step oficial da RE/MAX
  const rawMax = criteria.max_budget || criteria.max_price;
  const rawMin = criteria.min_budget || criteria.min_price;
  const maxP = rawMax && !isNaN(rawMax) && Number(rawMax) > 0 ? snapToRemaxPrice(Number(rawMax), true) : null;
  const minP = rawMin && !isNaN(rawMin) && Number(rawMin) > 0 ? snapToRemaxPrice(Number(rawMin), false) : null;

  if (maxP && minP) {
    restrictions.push(`preco_${minP}_${maxP}`);
  } else if (maxP) {
    restrictions.push(`preco__${maxP}`);
  } else if (minP) {
    restrictions.push(`preco_${minP}_`);
  }

  const rSegment = restrictions.length > 0 ? `/r/${restrictions.join(',')}` : '';
  return `https://www.remax.pt/pt/comprar/imoveis/${propType}/${distrito}/${concelho}${rSegment}?p=1&o=-PublishDate`;
}

/**
 * 2. CENTURY 21 Portugal
 * Rota canónica verificada: https://century21.pt/comprar/imoveis/distrito-{distrito}/concelho-{concelho}?price_max={maxPrice}
 */
function buildCentury21Url(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  const geoInfo = DISTRICT_MUNICIPALITY_MAP[locSlug];
  const distrito = geoInfo ? geoInfo.distrito : locSlug;
  const concelho = geoInfo ? geoInfo.concelho : locSlug;

  const queryParams = [];
  let propType = 'apartamento';
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 'moradia';
    queryParams.push("property_types=moradia");
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    propType = 'terreno';
    queryParams.push("property_types=terreno");
  } else if (rawType.includes('loja') || rawType.includes('comercio')) {
    propType = 'comercial';
    queryParams.push("property_types=comercial");
  } else if (rawType.includes('apartamento')) {
    queryParams.push("property_types=apartamento");
  }

  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    queryParams.push("price_max=" + Number(criteria.max_price));
  }
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    queryParams.push("price_min=" + Number(criteria.min_price));
  }

  const qs = queryParams.length > 0 ? "?" + queryParams.join('&') : '';
  return "https://century21.pt/comprar/imoveis/distrito-" + distrito + "/concelho-" + concelho + qs;
}

/**
 * 3. ERA Imobiliária
 * Rota canónica verificada: https://www.era.pt/comprar/{propType}/{concelho}?preco-maximo={maxPrice}
 */
function buildEraUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  let propType = 'apartamentos';
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 'moradias';
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    propType = 'terrenos';
  } else if (rawType.includes('loja') || rawType.includes('comercio') || rawType.includes('espaco')) {
    propType = 'comerciais';
  } else if (rawType.includes('predio') || rawType.includes('edificio')) {
    propType = 'predios';
  }

  const queryParams = [];
  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    queryParams.push("preco-maximo=" + Number(criteria.max_price));
  }
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    queryParams.push("preco-minimo=" + Number(criteria.min_price));
  }

  const qs = queryParams.length > 0 ? "?" + queryParams.join('&') : '';
  return "https://www.era.pt/comprar/" + propType + "/" + locSlug + qs;
}

/**
 * 4. SUPERCASA
 * Rota canónica oficial: https://supercasa.pt/comprar-casas/{concelho}/com-{filtros}
 */
function buildSupercasaUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  
  let propType = 'apartamentos';
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 'casas';
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    propType = 'terrenos';
  } else if (rawType.includes('loja') || rawType.includes('comercio')) {
    propType = 'lojas';
  } else if (rawType.includes('garagem')) {
    propType = 'garagens';
  } else if (rawType.includes('predio')) {
    propType = 'predios';
  }

  const filters = [];
  if (propType === 'apartamentos') {
    filters.push('com-apartamentos');
  } else if (propType === 'casas') {
    filters.push('com-moradias');
  }

  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    filters.push("preco-max_" + Number(criteria.max_price));
  }
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    filters.push("preco-min_" + Number(criteria.min_price));
  }

  const typs = normalizeTypologiesList(criteria.typology);
  typs.forEach(t => {
    const m = String(t).match(/t(\d+)/i);
    if (m) filters.push('t' + m[1]);
  });

  const filterSegment = filters.length > 0 ? (filters[0].startsWith('com-') ? filters.join(',') + '/' : 'com-' + filters.join(',') + '/') : '';
  return "https://supercasa.pt/comprar-casas/" + locSlug + "/" + filterSegment;
}

/**
 * 5. ZOME Real Estate
 * Rota canónica: /pt/pesquisar/comprar/{propType}/{rooms}/l1-{distrito}/l2-{concelho}/total-max-{maxPrice}
 */
function buildZomeUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  const pathSegments = ['comprar'];

  let zomeType = 'apartamento';
  const rawType = (criteria.property_type || '').toLowerCase();
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

  const typs = normalizeTypologiesList(criteria.typology);
  const rooms = [];
  typs.forEach(t => {
    const m = String(t).match(/t(\d+)/i);
    if (m) rooms.push('t' + m[1]);
  });
  if (rooms.length > 0 && zomeType !== 'terreno' && zomeType !== 'garagem') {
    rooms.forEach(r => pathSegments.push(r.toLowerCase()));
  }

  const geoInfo = DISTRICT_MUNICIPALITY_MAP[locSlug];
  if (geoInfo) {
    pathSegments.push("l1-" + geoInfo.distrito);
    pathSegments.push("l2-" + geoInfo.concelho);
  } else {
    pathSegments.push("l1-" + locSlug);
  }

  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    pathSegments.push("total-min-" + Number(criteria.min_price));
  }
  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    pathSegments.push("total-max-" + Number(criteria.max_price));
  }
  if (criteria.min_area && !isNaN(criteria.min_area) && Number(criteria.min_area) > 0) {
    pathSegments.push("area-" + Number(criteria.min_area));
  }

  return "https://www.zome.pt/pt/pesquisar/" + pathSegments.join('/');
}

/**
 * 6. ARYS Imobiliária
 * Rota oficial: https://arys.pt/Imoveis?place={placeId}&imovtn_id[]=1&imovnature_id[]={natureId}&precomax={maxPrice}&rooms[]={rooms}
 */
function buildArysUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  const placeId = ARYS_PLACES[locSlug] || 'concelho_36';
  
  let natureId = '1'; // 1: Apartamentos, 7: Moradias, 10: Terrenos
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    natureId = '7';
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    natureId = '10';
  }

  const queryParams = [
    "place=" + placeId,
    "imovtn_id[]=1", // 1: Comprar/Venda
    "imovnature_id[]=" + natureId
  ];

  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    queryParams.push("precomax=" + Number(criteria.max_price));
  }
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    queryParams.push("precomin=" + Number(criteria.min_price));
  }

  const typs = normalizeTypologiesList(criteria.typology);
  const rooms = extractRoomsCount(typs);
  if (rooms.length > 0 && natureId !== '10') {
    rooms.forEach(r => queryParams.push("rooms[]=" + r));
  }

  return "https://arys.pt/Imoveis?" + queryParams.join('&');
}

/**
 * 7. MAÏVAS Imobiliária
 * Rota oficial com filtros: https://www.maivas.com/properties?bedrooms={rooms}&businessType=1&propertyType={propType}&location={locJson}&priceMax={max}
 */
function buildMaivasUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  const locObj = MAIVAS_LOCATIONS[locSlug] || { country: 2, region: 40, district: 146 };

  let propType = 1; // 1: Apartamento, 2: Moradia, 4: Terreno
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 2;
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    propType = 4;
  }

  const queryParams = [
    "businessType=1",
    "propertyType=" + propType,
    "location=" + encodeURIComponent(JSON.stringify(locObj))
  ];

  const typs = normalizeTypologiesList(criteria.typology);
  const rooms = extractRoomsCount(typs);
  if (rooms.length > 0 && propType !== 4) {
    queryParams.push("bedrooms=" + rooms[0]);
  }
  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    queryParams.push("priceMax=" + Number(criteria.max_price));
  }
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    queryParams.push("priceMin=" + Number(criteria.min_price));
  }

  return "https://www.maivas.com/properties?" + queryParams.join('&');
}

/**
 * 8. VIVAS Imobiliária
 * Rota canónica verificada eGO: https://www.vivas.pt/pt/imoveis/?pg=1&o=1&g={g}&dd={dd}&cc={cc}&nq={rooms}-
 */
function buildVivasUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  const egoGeo = EGO_GEO_CODES[locSlug] || { dd: '03', cc: '03' };

  let propType = 1; // 1: Apartamento, 2: Moradia, 3: Terreno, 4: Comercial, 5: Garagem, 6: Prédio
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 2;
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    propType = 3;
  } else if (rawType.includes('loja') || rawType.includes('comercio')) {
    propType = 4;
  } else if (rawType.includes('garagem')) {
    propType = 5;
  } else if (rawType.includes('predio')) {
    propType = 6;
  }

  const queryParams = [
    "pg=1",
    "o=1", // Comprar
    "g=" + propType,
    "dd=" + egoGeo.dd,
    "cc=" + egoGeo.cc
  ];

  const typs = normalizeTypologiesList(criteria.typology);
  const rooms = extractRoomsCount(typs);
  if (rooms.length > 0 && propType === 1) {
    queryParams.push("nq=" + rooms[0] + "-");
  }

  return "https://www.vivas.pt/pt/imoveis/?" + queryParams.join('&');
}

/**
 * 9. DS Imobiliária
 * Rota canónica verificada eGO: https://www.dsimobiliaria.pt/pt/imoveis/?pg=1&o=1&g={g}&dd={dd}&cc={cc}&nq={rooms}-
 */
function buildDsUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  const egoGeo = EGO_GEO_CODES[locSlug] || { dd: '03', cc: '03' };

  let propType = 1; // 1: Apartamento, 2: Moradia, 3: Terreno, 4: Comercial, 5: Garagem, 6: Prédio
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 2;
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    propType = 3;
  } else if (rawType.includes('loja') || rawType.includes('comercio')) {
    propType = 4;
  } else if (rawType.includes('garagem')) {
    propType = 5;
  } else if (rawType.includes('predio')) {
    propType = 6;
  }

  const queryParams = [
    "pg=1",
    "o=1", // Comprar
    "g=" + propType,
    "dd=" + egoGeo.dd,
    "cc=" + egoGeo.cc
  ];

  const typs = normalizeTypologiesList(criteria.typology);
  const rooms = extractRoomsCount(typs);
  if (rooms.length > 0 && propType === 1) {
    queryParams.push("nq=" + rooms[0] + "-");
  }

  return "https://www.dsimobiliaria.pt/pt/imoveis/?" + queryParams.join('&');
}

/**
 * 10. REALTY ONE GROUP (one.pt)
 * Rota oficial: https://www.one.pt/imoveis/comprar/{tipo}/{concelho}?bedrooms={rooms}&priceMin={min}&priceMax={max}
 */
function buildRealtyOneUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');

  let propType = 'apartamento';
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 'moradia';
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    propType = 'terreno';
  } else if (rawType.includes('loja') || rawType.includes('comercio')) {
    propType = 'comercial';
  } else if (rawType.includes('garagem')) {
    propType = 'garagem';
  } else if (rawType.includes('predio')) {
    propType = 'predio';
  }

  const queryParams = [];

  const typs = normalizeTypologiesList(criteria.typology);
  const rooms = extractRoomsCount(typs);
  if (rooms.length > 0 && propType !== 'terreno' && propType !== 'garagem') {
    queryParams.push("bedrooms=" + rooms.join(','));
  }
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    queryParams.push("priceMin=" + Number(criteria.min_price));
  }
  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    queryParams.push("priceMax=" + Number(criteria.max_price));
  }

  const qs = queryParams.length > 0 ? "?" + queryParams.join('&') : '';
  return "https://www.one.pt/imoveis/comprar/" + propType + "/" + encodeURIComponent(locSlug) + qs;
}

/**
 * 11. IMOVIRTUAL
 * Rota canónica: https://www.imovirtual.com/pt/resultados/comprar/{tipo}/{distrito}/{concelho}
 */
function buildImovirtualUrl(criteria) {
  const locSlug = resolveIdealistaLocation(criteria.location || 'braga');
  const geoInfo = DISTRICT_MUNICIPALITY_MAP[locSlug];
  const distrito = geoInfo ? geoInfo.distrito : locSlug;
  const concelho = geoInfo ? geoInfo.concelho : locSlug;

  let propType = 'apartamento';
  const rawType = (criteria.property_type || '').toLowerCase();
  if (rawType.includes('moradia') || rawType.includes('casa') || rawType.includes('vivenda')) {
    propType = 'moradia';
  } else if (rawType.includes('terreno') || rawType.includes('lote')) {
    propType = 'terreno';
  }

  const queryParams = [];
  if (criteria.max_price && !isNaN(criteria.max_price) && Number(criteria.max_price) > 0) {
    queryParams.push("priceMax=" + Number(criteria.max_price));
  }
  if (criteria.min_price && !isNaN(criteria.min_price) && Number(criteria.min_price) > 0) {
    queryParams.push("priceMin=" + Number(criteria.min_price));
  }

  const qs = queryParams.length > 0 ? "?" + queryParams.join('&') : '';
  return "https://www.imovirtual.com/pt/resultados/comprar/" + propType + "/" + distrito + "/" + concelho + qs;
}

/**
 * Retorna todos os links de portais disponíveis para o cliente com suporte a multi-localizações
 */
function getAllPortalUrls(client) {
  const locations = resolveAllIdealistaLocations(client.location);
  
  const idealistaUrls = locations.map(loc => buildLocationUrl({ ...client, location: loc }));
  const remaxUrls = locations.map(loc => buildRemaxUrl({ ...client, location: loc }));
  const eraUrls = locations.map(loc => buildEraUrl({ ...client, location: loc }));
  const century21Urls = locations.map(loc => buildCentury21Url({ ...client, location: loc }));
  const zomeUrls = locations.map(loc => buildZomeUrl({ ...client, location: loc }));
  const supercasaUrls = locations.map(loc => buildSupercasaUrl({ ...client, location: loc }));
  const arysUrls = locations.map(loc => buildArysUrl({ ...client, location: loc }));
  const maivasUrls = locations.map(loc => buildMaivasUrl({ ...client, location: loc }));
  const vivasUrls = locations.map(loc => buildVivasUrl({ ...client, location: loc }));
  const dsUrls = locations.map(loc => buildDsUrl({ ...client, location: loc }));
  const realtyOneUrls = locations.map(loc => buildRealtyOneUrl({ ...client, location: loc }));
  const imovirtualUrls = locations.map(loc => buildImovirtualUrl({ ...client, location: loc }));

  return {
    idealista: client.custom_search_url || idealistaUrls[0],
    remax: remaxUrls[0],
    era: eraUrls[0],
    century21: century21Urls[0],
    zome: zomeUrls[0],
    supercasa: supercasaUrls[0],
    arys: arysUrls[0],
    maivas: maivasUrls[0],
    vivas: vivasUrls[0],
    ds: dsUrls[0],
    realtyone: realtyOneUrls[0],
    imovirtual: imovirtualUrls[0],
    locations: locations,
    all_urls: {
      idealista: idealistaUrls,
      remax: remaxUrls,
      era: eraUrls,
      century21: century21Urls,
      zome: zomeUrls,
      supercasa: supercasaUrls,
      arys: arysUrls,
      maivas: maivasUrls,
      vivas: vivasUrls,
      ds: dsUrls,
      realtyone: realtyOneUrls,
      imovirtual: imovirtualUrls
    }
  };
}

// Limites justos de extração proporcionais à dimensão e relevância de cada portal no mercado nacional
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

function getPortalLimit(portal) {
  if (!portal) return 50;
  const key = String(portal).toLowerCase().trim();
  return PORTAL_EXTRACTION_LIMITS[key] || 50;
}

module.exports = {
  buildRemaxUrl,
  buildCentury21Url,
  buildEraUrl,
  buildSupercasaUrl,
  buildZomeUrl,
  buildArysUrl,
  buildMaivasUrl,
  buildVivasUrl,
  buildDsUrl,
  buildRealtyOneUrl,
  buildImovirtualUrl,
  getAllPortalUrls,
  snapToRemaxPrice,
  DISTRICT_MUNICIPALITY_MAP,
  PORTAL_EXTRACTION_LIMITS,
  getPortalLimit
};
