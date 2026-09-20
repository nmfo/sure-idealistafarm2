/**
 * SURE. Mapeador Geográfico Universal & Extrator Inteligente de Localizações
 * Reconhece concelhos, freguesias, zonas, erros ortográficos, abreviações (S., Sto., Sta., V.N.)
 * e extrai exaustivamente todas as localizações desejadas pelo cliente.
 */

// Mapeamento Canónico: [Nome Oficial Formatado, Slug Canónico, Regex com variações/erros/freguesias]
const GEOGRAPHIC_MAPPINGS = [
  // ── DISTRITO DE BRAGA ──────────────────────────────────────────────────────────
  {
    name: 'Braga',
    slug: 'braga',
    distrito: 'braga',
    match: /\b(braga|s[aã]o\s*v[ií]ctor|s[aã]o\s*v[ií]tor|s\.?\s*v[ií]ctor|s\.?\s*v[ií]tor|s[aã]o\s*vicente|s\.?\s*vicente|gualtar|nogueir[oó]|ten[oõ]es|lama[cç][aã]es|frai[aã]o|real|frossos|dume|lomar|ferreiros|maximinos|s[eé]|cividade|falperra|palmeira|ada[uú]fe|celeir[oó]s|aveleda|tadim|cabreiros|merelim|mire(?:\s*de\s*tib[aã]es)?|padim|semelhe|tib[aã]es|gondizalves|espor[oõ]es|nogueira|sobreposta|pedralva|morreira|trandeiras|guisande|crespos|navarra|prado\s*s[aã]o\s*miguel|rua\s*do\s*raio|bom\s*jesus|sameiro)\b/i
  },
  {
    name: 'Guimarães',
    slug: 'guimaraes',
    distrito: 'braga',
    match: /\b(guimar[aã]es|guimaraes|guima|guardizela|brito|moreira\s*de\s*c[oó]negos|creixomil|azur[eé]m|azurem|urgezes|ronfe|caldas\s*das\s*taipas|taipas|sande|ponte|selho|fermentelos|lordelo|serzedelo|costa|mes[aã]o\s*frio|polvoreira|silvares|s[aã]o\s*torcato|s\.?\s*torcato|prazins|barco|caldelas)\b/i
  },
  {
    name: 'Vila Nova de Famalicão',
    slug: 'vila-nova-de-famalicao',
    distrito: 'braga',
    match: /\b(famalic[aã]o|famalicao|v\.?\s*n\.?\s*famalic[aã]o|v\.?\s*n\.?\s*famalicao|vn\s*famalic[aã]o|vn\s*famalicao|vila\s*nova\s*de\s*famalic[aã]o|vila\s*nova\s*de\s*famalicao|joane|riba\s*d['’]?\s*ave|del[aã]es|delaes|pedome|gavi[aã]o|gaviao|ruiv[aã]es|seide|brufe|landim|avidos|caval[oõ]es|calend[aá]rio|calendario|antas|esmeriz|lousado|mogege|oliveira\s*santa\s*maria|oliveira\s*s[aã]o\s*mateus|requi[aã]o|vale\s*s[aã]o\s*cosme|vermoim|vilarinho\s*das\s*cambas)\b/i
  },
  {
    name: 'Barcelos',
    slug: 'barcelos',
    distrito: 'braga',
    match: /\b(barcelos|barcelinhos|arcozelo|abade\s*de\s*neiva|gilmonde|manhente|viatodos|tamel|alheira|martim|galegos|carvalhas|pereira|alvito|rio\s*covo)\b/i
  },
  {
    name: 'Vila Verde',
    slug: 'vila-verde',
    distrito: 'braga',
    match: /\b(vila\s*verde|v\.?\s*verde|prado|vila\s*de\s*prado|soutelo|pico\s*de\s*regalados|g[eê]me|cerv[aã]es|moure|barbudo|lage|valbom|coucieiro|escariz|parada\s*de\s*gati|sande\s*vila\s*verde)\b/i
  },
  {
    name: 'Amares',
    slug: 'amares',
    distrito: 'braga',
    match: /\b(amares|dornelas|figueiredo|caires|ferreiros\s*amares|caldelas\s*amares|rendufinhe|barelos|prozelo|bico|lago|rande)\b/i
  },
  {
    name: 'Póvoa de Lanhoso',
    slug: 'povoa-de-lanhoso',
    distrito: 'braga',
    match: /\b(p[oó]voa\s*de\s*lanhoso|p[oó]voa\s*lanhoso|lanhoso|ta[ií]de|taide|monsul|fontarcada|ferreiros\s*de\s*lanhoso|sobradelinho|vilela\s*lanhoso|galegos\s*lanhoso|calvos|garfe|esperan[cç]a|verim|friande)\b/i
  },
  {
    name: 'Fafe',
    slug: 'fafe',
    distrito: 'braga',
    match: /\b(fafe|ar[oõ]es|arões|fornelos|quinch[aã]es|quinchaes|rego|medelo|moreira\s*do\s*rei|travass[oõ]es)\b/i
  },
  {
    name: 'Vizela',
    slug: 'vizela',
    distrito: 'braga',
    match: /\b(vizela|s[aã]o\s*jo[aã]o\s*das\s*caldas|s[aã]o\s*miguel\s*das\s*caldas|infias|tagilde|santa\s*eul[aá]lia)\b/i
  },
  {
    name: 'Esposende',
    slug: 'esposende',
    distrito: 'braga',
    match: /\b(esposende|f[aã]o|ap[uú]lia|apulia|marinhas|gemeses|palmeira\s*de\s*faro|vila\s*ch[aã]|forj[aã]es|antinhas)\b/i
  },
  {
    name: 'Vieira do Minho',
    slug: 'vieira-do-minho',
    distrito: 'braga',
    match: /\b(vieira\s*do\s*minho|vieira\s*minho|vieira|ruiv[aã]es\s*vieira|rossas|cani[cç]ada|canicada|tabua[cç]as|salamonde|soengas|parada\s*de\s*bouro|cantel[aã]es)\b/i
  },
  {
    name: 'Terras de Bouro',
    slug: 'terras-de-bouro',
    distrito: 'braga',
    match: /\b(terras\s*de\s*bouro|bouro|gerez|ger[eê]s|rio\s*caldo|covide|vilar\s*da\s*veiga|campo\s*do\s*ger[eê]s|chamoim|carvalheira)\b/i
  },
  {
    name: 'Cabeceiras de Basto',
    slug: 'cabeceiras-de-basto',
    distrito: 'braga',
    match: /\b(cabeceiras\s*de\s*basto|cabeceiras|arco\s*de\s*ba[uú]lhe|refojos|abadim|basto|painzela|pedra[cç]a)\b/i
  },
  {
    name: 'Celorico de Basto',
    slug: 'celorico-de-basto',
    distrito: 'braga',
    match: /\b(celorico\s*de\s*basto|celorico|ferreiros\s*celorico|gandarela|molares|ribas|veade|britelo)\b/i
  },

  // ── ALTO MINHO / VIANA DO CASTELO ──────────────────────────────────────────────
  {
    name: 'Viana do Castelo',
    slug: 'viana-do-castelo',
    distrito: 'viana-do-castelo',
    match: /\b(viana\s*do\s*castelo|viana\s*castelo|viana|darque|areosa|meadela|monserrate|santa\s*marta\s*de\s*portuzelo|afife|carre[cç]o|chaf[eé]|castelo\s*do\s*neiva)\b/i
  },
  {
    name: 'Ponte de Lima',
    slug: 'ponte-de-lima',
    distrito: 'viana-do-castelo',
    match: /\b(ponte\s*de\s*lima|ponte\s*lima|correlh[aã]s|feitosa|bertiandos|calheiros|facha|sear[aã]|fornelos\s*lima)\b/i
  },
  {
    name: 'Ponte da Barca',
    slug: 'ponte-da-barca',
    distrito: 'viana-do-castelo',
    match: /\b(ponte\s*da\s*barca|ponte\s*barca|brav[aã]es|britelo\s*barca|cuide|sampriz|touvedo)\b/i
  },
  {
    name: 'Arcos de Valdevez',
    slug: 'arcos-de-valdevez',
    distrito: 'viana-do-castelo',
    match: /\b(arcos\s*de\s*valdevez|arcos\s*valdevez|valdevez|soajo|giela|sabadim|t[aá]vora|prozelo\s*arcos)\b/i
  },
  {
    name: 'Paredes de Coura',
    slug: 'paredes-de-coura',
    distrito: 'viana-do-castelo',
    match: /\b(paredes\s*de\s*coura|paredes\s*coura|coura|castanheira|rubi[aã]es|moimenta\s*coura|insua)\b/i
  },
  {
    name: 'Vila Nova de Cerveira',
    slug: 'vila-nova-de-cerveira',
    distrito: 'viana-do-castelo',
    match: /\b(vila\s*nova\s*de\s*cerveira|v\.?\s*n\.?\s*cerveira|cerveira|campos|cornes|loivo|reboreda|sopo)\b/i
  },
  {
    name: 'Caminha',
    slug: 'caminha',
    distrito: 'viana-do-castelo',
    match: /\b(caminha|vila\s*praia\s*de\s*[aâ]ncora|praia\s*de\s*[aâ]ncora|[aâ]ncora|moledo|vilar\s*de\s*mouros|lanhelas|seixas)\b/i
  },
  {
    name: 'Valença',
    slug: 'valenca',
    distrito: 'viana-do-castelo',
    match: /\b(valen[cç]a|valenca|s[aã]o\s*pedro\s*da\s*torre|fontoura|ganfei|friestas|verdoejo)\b/i
  },
  {
    name: 'Monção',
    slug: 'moncao',
    distrito: 'viana-do-castelo',
    match: /\b(mon[cç][aã]o|moncao|lapela|mazedo|cortes\s*mon[cç][aã]o|merufe|pinheiros)\b/i
  },
  {
    name: 'Melgaço',
    slug: 'melgaco',
    distrito: 'viana-do-castelo',
    match: /\b(melga[cç]o|melgaco|castro\s*laboreiro|prado\s*melga[cç]o|penso)\b/i
  },

  // ── GRANDE PORTO ──────────────────────────────────────────────────────────────
  {
    name: 'Póvoa de Varzim',
    slug: 'povoa-de-varzim',
    distrito: 'porto',
    match: /\b(p[oó]voa\s*de\s*varzim|p[oó]voa\s*varzim|p[oó]voa(?!\s*de\s*lanhoso)|aver-o-mar|aver\s*o\s*mar|agu[cç]adoura|agucadoura|beiriz|amorim|rates|balasar)\b/i
  },
  {
    name: 'Vila do Conde',
    slug: 'vila-do-conde',
    distrito: 'porto',
    match: /\b(vila\s*do\s*conde|v\.?\s*do\s*conde|mindelo|[aá]rvore|arvore|azurara|fajozes|labruge|modivas|macieira|rio\s*mau|touguinha|vilar\s*do\s*pinheiro)\b/i
  },
  {
    name: 'Porto',
    slug: 'porto',
    distrito: 'porto',
    match: /\b(porto|foz|boavista|cedofeita|paranhos|bonfim|campanh[aã]|lordelo\s*do\s*ouro|massarelos|miragaia|santo\s*ildefonso|vit[oó]ria|aldoar|nevogilde|ramalde)\b/i
  },
  {
    name: 'Vila Nova de Gaia',
    slug: 'vila-nova-de-gaia',
    distrito: 'porto',
    match: /\b(gaia|vila\s*nova\s*de\s*gaia|v\.?\s*n\.?\s*gaia|vn\s*gaia|canidelo|madalena|valadares|gulpilhares|praia\s*da\s*granja|granja|arcozelo\s*gaia|mafamude|vilar\s*do\s*para[ií]so|santa\s*marinha|canelas|grij[oó]|carvalhos)\b/i
  },
  {
    name: 'Matosinhos',
    slug: 'matosinhos',
    distrito: 'porto',
    match: /\b(matosinhos|le[cç]a\s*da\s*palmeira|le[cç]a|senhora\s*da\s*hora|sra\.?\s*da\s*hora|s[aã]o\s*mamede\s*de\s*infesta|s\.?\s*mamede\s*de\s*infesta|cust[oó]ias|custoias|lavra|perafita|santa\s*cruz\s*do\s*bispo)\b/i
  },
  {
    name: 'Maia',
    slug: 'maia',
    distrito: 'porto',
    match: /\b(maia|moreira\s*da\s*maia|cast[eê]lo\s*da\s*maia|castelo\s*da\s*maia|pedrou[cç]os|[aá]guas\s*santas|aguas\s*santas|milheir[oó]s|folgosa|nogueira\s*da\s*maia|s[aã]o\s*pedro\s*fins)\b/i
  },
  {
    name: 'Santo Tirso',
    slug: 'santo-tirso',
    distrito: 'porto',
    match: /\b(santo\s*tirso|sto\.?\s*tirso|s\.?\s*tirso|aves|vila\s*das\s*aves|rebord[oõ]es|s[aã]o\s*tom[eé]|monte\s*c[oó]rdova|negrelos|vila\s*nova\s*do\s*campo)\b/i
  },
  {
    name: 'Trofa',
    slug: 'trofa',
    distrito: 'porto',
    match: /\b(trofa|bougado|coronado|covelas|muro)\b/i
  },
  {
    name: 'Gondomar',
    slug: 'gondomar',
    distrito: 'porto',
    match: /\b(gondomar|rio\s*tinto|baguim|valbom\s*gondomar|f[aâ]nzeres|fanzeres|foz\s*do\s*sousa)\b/i
  },
  {
    name: 'Valongo',
    slug: 'valongo',
    distrito: 'porto',
    match: /\b(valongo|ermesinde|alfena|sobrado|campo\s*valongo)\b/i
  },
  {
    name: 'Paredes',
    slug: 'paredes',
    distrito: 'porto',
    match: /\b(paredes|baltar|rebordosa|gandra|lordelo\s*paredes|vandoma)\b/i
  },
  {
    name: 'Penafiel',
    slug: 'penafiel',
    distrito: 'porto',
    match: /\b(penafiel|terras\s*de\s*sena|terroso|pa[cç]o\s*de\s*sousa|abrag[aã]o)\b/i
  },
  {
    name: 'Paços de Ferreira',
    slug: 'pacos-de-ferreira',
    distrito: 'porto',
    match: /\b(pa[cç]os\s*de\s*ferreira|pacos\s*de\s*ferreira|pacos\s*ferreira|freamunde|ferreiras|sanfins)\b/i
  },
  {
    name: 'Lousada',
    slug: 'lousada',
    distrito: 'porto',
    match: /\b(lousada|ca[ií]de|meinedo|torno|sousela)\b/i
  },
  {
    name: 'Amarante',
    slug: 'amarante',
    distrito: 'porto',
    match: /\b(amarante|vila\s*me[aã]|aboboreira|freixo\s*de\s*baixo)\b/i
  },
  {
    name: 'Felgueiras',
    slug: 'felgueiras',
    distrito: 'porto',
    match: /\b(felgueiras|lixa|barrosas|sendim|v[aá]rzea)\b/i
  },

  // ── DISTRITO DE AVEIRO ────────────────────────────────────────────────────────
  {
    name: 'Aveiro',
    slug: 'aveiro',
    distrito: 'aveiro',
    match: /\b(aveiro|verdemilho|esgueira|glic[ií]nias|aradas|ilha)\b/i
  },
  {
    name: 'Santa Maria da Feira',
    slug: 'santa-maria-da-feira',
    distrito: 'aveiro',
    match: /\b(santa\s*maria\s*da\s*feira|sta\.?\s*maria\s*da\s*feira|feira|lourosa|fi[aã]es|argoncilhe|moimenta|souto\s*feira)\b/i
  },
  {
    name: 'Espinho',
    slug: 'espinho',
    distrito: 'aveiro',
    match: /\b(espinho|silvalde|paramos|antela)\b/i
  },
  {
    name: 'Ovar',
    slug: 'ovar',
    distrito: 'aveiro',
    match: /\b(ovar|furadouro|cortega[cç]a|eirado|v[aá]lega)\b/i
  },
  {
    name: 'São João da Madeira',
    slug: 'sao-joao-da-madeira',
    distrito: 'aveiro',
    match: /\b(s[aã]o\s*jo[aã]o\s*da\s*madeira|s\.?\s*jo[aã]o\s*da\s*madeira)\b/i
  },
  {
    name: 'Ílhavo',
    slug: 'ilhavo',
    distrito: 'aveiro',
    match: /\b([ií]lhavo|ilhavo|barra|costa\s*nova|gafanha)\b/i
  },

  // ── DISTRITO DE COIMBRA & LEIRIA ──────────────────────────────────────────────
  {
    name: 'Coimbra',
    slug: 'coimbra',
    distrito: 'coimbra',
    match: /\b(coimbra|figueira\s*da\s*foz|cantanhede|montemor-o-velho|condeixa|lous[aã])\b/i
  },
  {
    name: 'Leiria',
    slug: 'leiria',
    distrito: 'leiria',
    match: /\b(leiria|marinha\s*grande|caldas\s*da\s*rainha|alcoba[cç]a|peniche|pombal|nazar[eé]|batalha|[oó]bidos)\b/i
  },

  // ── DISTRITO DE LISBOA & SETÚBAL ──────────────────────────────────────────────
  {
    name: 'Lisboa',
    slug: 'lisboa',
    distrito: 'lisboa',
    match: /\b(lisboa|parque\s*das\s*na[cç][oõ]es|campo\s*de\s*ourique|alvalade|benfica|lumiar|arroios|avenidas\s*novas|amadora|loures|odivelas|mafra|ericeira|vila\s*franca\s*de\s*xira)\b/i
  },
  {
    name: 'Cascais',
    slug: 'cascais',
    distrito: 'lisboa',
    match: /\b(cascais|estoril|carcavelos|parede|s[aã]o\s*domingos\s*de\s*rana)\b/i
  },
  {
    name: 'Oeiras',
    slug: 'oeiras',
    distrito: 'lisboa',
    match: /\b(oeiras|pa[cç]o\s*de\s*arcos|alg[eé]s|carnaxide|queijas|caxias)\b/i
  },
  {
    name: 'Sintra',
    slug: 'sintra',
    distrito: 'lisboa',
    match: /\b(sintra|queluz|cac[eé]m|rio\s*de\s*mouro|massam[aá]|algueir[aã]o|mem\s*martins)\b/i
  },
  {
    name: 'Setúbal',
    slug: 'setubal',
    distrito: 'setubal',
    match: /\b(set[uú]bal|almada|seixal|barreiro|montijo|moita|palmela|sesimbra|costa\s*da\s*caparica)\b/i
  },

  // ── ALGARVE ───────────────────────────────────────────────────────────────────
  {
    name: 'Faro',
    slug: 'faro',
    distrito: 'faro',
    match: /\b(faro|portim[aã]o|albufeira|loul[eé]|olh[aã]o|lagos|tavira|silves|quarteira|vilamoura|lagoa)\b/i
  }
];

/**
 * Resolve um único termo ou freguesia para o slug canónico
 */
function resolveSingleLocation(term) {
  if (!term || typeof term !== 'string') return 'braga';
  const clean = term.trim().toLowerCase();

  for (const item of GEOGRAPHIC_MAPPINGS) {
    if (item.match.test(clean)) {
      return item.slug;
    }
  }

  // Fallback: normalizar o texto
  const normalized = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'braga';
}

/**
 * Converte qualquer texto de localização no Concelho Oficial Canónico do Idealista
 */
function resolveIdealistaLocation(rawLocation) {
  if (!rawLocation || typeof rawLocation !== 'string') return 'braga';
  const parts = rawLocation.split(/[,;\/\|]|\se\s+|\sou\s+/i).map(p => p.trim()).filter(Boolean);
  if (parts.length > 0) {
    return resolveSingleLocation(parts[0]);
  }
  return resolveSingleLocation(rawLocation);
}

/**
 * Extrai e resolve todas as localizações distintas presentes no texto ou array
 * Retorna array de slugs canónicos (ex: ['braga', 'guimaraes', 'vila-nova-de-famalicao'])
 */
function resolveAllIdealistaLocations(rawLocation) {
  if (!rawLocation) return ['braga'];

  let textSources = [];
  if (Array.isArray(rawLocation)) {
    textSources = rawLocation;
  } else if (typeof rawLocation === 'string') {
    textSources = rawLocation.split(/[,;\/\|]|\se\s+|\sou\s+|\n+/i);
  } else {
    textSources = [String(rawLocation)];
  }

  const uniqueSlugs = [];
  textSources.forEach(src => {
    if (!src || typeof src !== 'string') return;
    const clean = src.trim().toLowerCase();
    if (!clean) return;

    // 1. Verificar match direto no dicionário
    let matched = false;
    for (const item of GEOGRAPHIC_MAPPINGS) {
      if (item.match.test(clean)) {
        if (!uniqueSlugs.includes(item.slug)) {
          uniqueSlugs.push(item.slug);
        }
        matched = true;
      }
    }

    // 2. Se não encontrou match direto, tentar normalizar
    if (!matched) {
      const slug = resolveSingleLocation(clean);
      if (slug && !uniqueSlugs.includes(slug)) {
        uniqueSlugs.push(slug);
      }
    }
  });

  return uniqueSlugs.length > 0 ? uniqueSlugs : ['braga'];
}

/**
 * Função Mestre de Extração e Interpretação de Localizações:
 * Examina múltiplos campos do CRM, notas, descrições e corrige erros ortográficos.
 * Retorna um objeto com a string formatada, array de nomes oficiais e array de slugs.
 */
function extractAndNormalizeAllLocations(primaryInput, extraContextText = '') {
  const combinedRaw = [
    Array.isArray(primaryInput) ? primaryInput.join(', ') : primaryInput,
    extraContextText
  ].filter(Boolean).join(' ');

  if (!combinedRaw || combinedRaw.trim().length === 0) {
    return {
      formatted: 'Braga',
      locations: ['Braga'],
      slugs: ['braga']
    };
  }

  const detectedItems = [];
  const textLow = combinedRaw.toLowerCase();

  for (const item of GEOGRAPHIC_MAPPINGS) {
    if (item.match.test(textLow)) {
      if (!detectedItems.some(d => d.slug === item.slug)) {
        detectedItems.push(item);
      }
    }
  }

  // Se nenhum concelho conhecido foi detetado, processar o input primário como fallback
  if (detectedItems.length === 0) {
    const fallbackSlug = resolveSingleLocation(primaryInput);
    const fallbackName = primaryInput ? String(primaryInput).trim() : 'Braga';
    return {
      formatted: fallbackName || 'Braga',
      locations: [fallbackName || 'Braga'],
      slugs: [fallbackSlug || 'braga']
    };
  }

  const names = detectedItems.map(d => d.name);
  const slugs = detectedItems.map(d => d.slug);

  return {
    formatted: names.join(', '),
    locations: names,
    slugs: slugs
  };
}

module.exports = {
  GEOGRAPHIC_MAPPINGS,
  resolveIdealistaLocation,
  resolveAllIdealistaLocations,
  resolveSingleLocation,
  extractAndNormalizeAllLocations
};
