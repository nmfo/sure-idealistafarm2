/**
 * SURE. Mapeador Geográfico Universal para Portais Imobiliários (Idealista, RE/MAX, Zome, Arys)
 * Converte qualquer texto de localização, lista de freguesias ou concelho
 * no slug canónico oficial aceite pelos portais.
 */

// Dicionário de Freguesias e Concelhos ordenado por especificidade
const PARISH_TO_MUNICIPALITY_MAP = [
  // ── Concelhos Específicos com "Póvoa" ou nomes compostos (Prioridade Alta) ──
  { match: /p[oó]voa\s*de\s*lanhoso|lanhoso|ta[ií]de|monsul|fontarcada|ferreiros\s*de\s*lanhoso|sobradelinho|vilela\s*lanhoso|galegos\s*lanhoso|calvos|garfe|esperan[cç]a|verim|friande/i, slug: 'povoa-de-lanhoso' },
  { match: /p[oó]voa\s*de\s*varzim|aver-o-mar|aver\s*o\s*mar|agucadoura|agu[cç]adoura|beiriz|amorim|rates|balasar|estev[aã]o|p[oó]voa(?!\s*de\s*lanhoso)/i, slug: 'povoa-de-varzim' },
  { match: /vieira\s*do\s*minho|vieira|ruiv[aã]es\s*vieira|rossas|canicada|cani[cç]ada|tabua[cç]as|salamonde|soengas|parada\s*de\s*bouro|cantel[aã]es/i, slug: 'vieira-do-minho' },
  { match: /terras\s*de\s*bouro|bouro|gerez|ger[eê]s|rio\s*caldo|covide|vilar\s*da\s*veiga|campo\s*do\s*ger[eê]s|chamoim|carvalheira/i, slug: 'terras-de-bouro' },
  { match: /cabeceiras\s*de\s*basto|cabeceiras|arco\s*de\s*ba[uú]lhe|refojos|abadim|basto|painzela|pedra[cç]a/i, slug: 'cabeceiras-de-basto' },
  { match: /celorico\s*de\s*basto|celorico|ferreiros\s*celorico|gandarela|molares|ribas|veade|britelo/i, slug: 'celorico-de-basto' },
  { match: /ribeira\s*de\s*pena|salvador\s*pena|santa\s*marinha\s*pena|canedo/i, slug: 'ribeira-de-pena' },
  { match: /mondim\s*de\s*basto|mondim|vilar\s*de\s*ferreiros|paradan[cç]a/i, slug: 'mondim-de-basto' },

  // ── Alto Minho / Viana do Castelo ──
  { match: /ponte\s*de\s*lima|correlh[aã]s|feitosa|bertiandos|ribeira|calheiros|facha|sear[aã]|fornelos\s*lima/i, slug: 'ponte-de-lima' },
  { match: /ponte\s*da\s*barca|brav[aã]es|britelo\s*barca|cuide|sampriz|touvedo/i, slug: 'ponte-da-barca' },
  { match: /arcos\s*de\s*valdevez|valdevez|soajo|giela|sabadim|tavora|t[aá]vora|prozelo\s*arcos/i, slug: 'arcos-de-valdevez' },
  { match: /paredes\s*de\s*coura|coura|castanheira|rubi[aã]es|moimenta\s*coura|insua/i, slug: 'paredes-de-coura' },
  { match: /vila\s*nova\s*de\s*cerveira|cerveira|campos|cornes|loivo|reboreda|sopo/i, slug: 'vila-nova-de-cerveira' },
  { match: /caminha|vila\s*praia\s*de\s*[aâ]ncora|[aâ]ncora|moledo|vilar\s*de\s*mouros|lanhelas|seixas/i, slug: 'caminha' },
  { match: /valen[cç]a|valenca|s[aã]o\s*pedro\s*da\s*torre|fontoura|ganfei|friestas|verdoejo/i, slug: 'valenca' },
  { match: /mon[cç][aã]o|moncao|lapela|mazedo|cortes\s*mon[cç][aã]o|merufe|pinheiros/i, slug: 'moncao' },
  { match: /melga[cç]o|melgaco|castro\s*laboreiro|prado\s*melga[cç]o|penso/i, slug: 'melgaco' },
  { match: /viana\s*do\s*castelo|viana|darque|areosa|meadela|monserrate|santa\s*marta\s*de\s*portuzelo|afife|carre[cç]o|chaf[eé]|castelo\s*do\s*neiva/i, slug: 'viana-do-castelo' },

  // ── Distrito de Braga ──
  { match: /amares|dornelas|figueiredo|caires|ferreiros\s*amares|caldelas\s*amares|rendufinhe|barelos|prozelo|bico|lago|rande/i, slug: 'amares' },
  { match: /vila\s*verde|prado|soutelo|pico\s*de\s*regalados|gême|cerv[aã]es|moure|barbudo|lage|valbom|coucieiro|escariz|parada\s*de\s*gati|sande\s*vila\s*verde/i, slug: 'vila-verde' },
  { match: /esposende|f[aã]o|ap[uú]lia|marinhas|gemeses|palmeira\s*de\s*faro|vila\s*ch[aã]|forj[aã]es|antinhas/i, slug: 'esposende' },
  { match: /barcelos|barcelinhos|arcozelo|abade\s*de\s*neiva|gilmonde|manhente|viatodos|tamel|alheira|martim|galegos|carvalhas|pereira|alvito|rio\s*covo/i, slug: 'barcelos' },
  { match: /vila\s*nova\s*de\s*famalic[aã]o|famalic[aã]o|joane|riba\s*d|bairro|del[aã]es|arnoso|pedome|gavi[aã]o|ruiv[aã]es|seide|brufe|landim|avidos|caval[oõ]es|calend[aá]rio|antas|esmeriz|lousado|mogege|oliveira\s*santa\s*maria|oliveira\s*s[aã]o\s*mateus|requi[aã]o|vale\s*s[aã]o\s*cosme|vermoim|vilarinho\s*das\s*cambas/i, slug: 'vila-nova-de-famalicao' },
  { match: /guimar[aã]es|guardizela|brito|moreira\s*de\s*c[oó]negos|creixomil|azur[eé]m|urgezes|ronfe|caldas\s*das\s*taipas|taipas|sande|ponte|selho|fermentelos|lordelo|serzedelo|costa|mes[aã]o\s*frio|polvoreira|silvares|s[aã]o\s*torcato|prazins|barco|caldelas/i, slug: 'guimaraes' },
  { match: /vizela|s[aã]o\s*jo[aã]o\s*das\s*caldas|s[aã]o\s*miguel\s*das\s*caldas|infias|tagilde|santa\s*eul[aá]lia/i, slug: 'vizela' },
  { match: /fafe|arões|ar[oõ]es|fornelos|quinch[aã]es|rego|medelo|moreira\s*do\s*rei|travass[oõ]es/i, slug: 'fafe' },
  { match: /s[aã]o\s*v[ií]tor|gualtar|nogueir[oó]|ten[oõ]es|lama[cç][aã]es|frai[aã]o|real|frossos|dume|lomar|ferreiros|maximinos|s[eé]|cividade|falperra|palmeira|ada[uú]fe|celeir[oó]s|aveleda|tadim|cabreiros|merelim|mire|padim|semelhe|tib[aã]es|gondizalves|espor[oõ]es|nogueira|sobreposta|pedralva|morreira|trandeiras|guisande|crespos|navarra|prado\s*s[aã]o\s*miguel|braga/i, slug: 'braga' },

  // ── Grande Porto ──
  { match: /vila\s*do\s*conde|mindelo|arvore|[aá]rvore|azurara|fajozes|labruge|modivas|macieira|rio\s*mau|touguinha|vila\s*ch[aã]\s*vila\s*do\s*conde|vilar\s*do\s*pinheiro/i, slug: 'vila-do-conde' },
  { match: /santo\s*tirso|aves|vila\s*das\s*aves|rebord[oõ]es|s[aã]o\s*tom[eé]|couto|monte\s*c[oó]rdova|negrelos|vila\s*nova\s*do\s*campo/i, slug: 'santo-tirso' },
  { match: /trofa|bougado|coronado|covelas|muro|alandroal/i, slug: 'trofa' },
  { match: /matosinhos|le[cç]a\s*da\s*palmeira|le[cç]a|senhora\s*da\s*hora|s[aã]o\s*mamede\s*de\s*infesta|cust[oó]ias|lavra|perafita|santa\s*cruz\s*do\s*bispo/i, slug: 'matosinhos' },
  { match: /maia|moreira\s*da\s*maia|cast[eê]lo\s*da\s*maia|pedrou[cç]os|[aá]guas\s*santas|milheir[oó]s|folgosa|nogueira\s*da\s*maia|s[aã]o\s*pedro\s*fins/i, slug: 'maia' },
  { match: /porto|foz|boavista|cedofeita|paranhos|bonfim|campanh[aã]|lordelo\s*do\s*ouro|massarelos|miragaia|santo\s*ildefonso|vit[oó]ria|aldoar|nevogilde|ramalde/i, slug: 'porto' },
  { match: /gaia|vila\s*nova\s*de\s*gaia|canidelo|madalena|valadares|gulpilhares|praia\s*da\s*granja|arcozelo\s*gaia|mafamude|vilar\s*do\s*para[ií]so|santa\s*marinha|canelas|grijo|carvalhos/i, slug: 'vila-nova-de-gaia' },
  { match: /gondomar|rio\s*tinto|baguim|valbom\s*gondomar|fanzeres|f[aâ]nzeres|foz\s*do\s*sousa/i, slug: 'gondomar' },
  { match: /valongo|ermesinde|alfena|sobrado|campo\s*valongo/i, slug: 'valongo' },
  { match: /paredes|baltar|rebordosa|gandra|lordelo\s*paredes|vandoma/i, slug: 'paredes' },
  { match: /penafiel|terras\s*de\s*sena|terroso|pa[cç]o\s*de\s*sousa|abragon/i, slug: 'penafiel' },
  { match: /pa[cç]os\s*de\s*ferreira|freamunde|ferreiras|sanfins/i, slug: 'pacos-de-ferreira' },
  { match: /lousada|caide|meinedo|torno|sousela/i, slug: 'lousada' },
  { match: /amarante|vila\s*me[aã]|aboboreira|freixo\s*de\s*baixo/i, slug: 'amarante' },
  { match: /felgueiras|lixa|barrosas|sendim|varzea/i, slug: 'felgueiras' },

  // ── Distrito de Aveiro ──
  { match: /aveiro|verdemilho|esgueira|glicinias|aradas|ilha|glic[ií]nias/i, slug: 'aveiro' },
  { match: /santa\s*maria\s*da\s*feira|feira|lourosa|fi[aã]es|argoncilhe|moimenta|souto\s*feira/i, slug: 'santa-maria-da-feira' },
  { match: /espinho|silvalde|paramos|antela/i, slug: 'espinho' },
  { match: /ovar|furadouro|cortega[cç]a|eirado|valega/i, slug: 'ovar' },
  { match: /s[aã]o\s*jo[aã]o\s*da\s*madeira/i, slug: 'sao-joao-da-madeira' },
  { match: /ilhavo|[ií]lhavo|barra|costa\s*nova|gafanha/i, slug: 'ilhavo' },

  // ── Distrito de Lisboa & Setúbal ──
  { match: /lisboa|parque\s*das\s*na[cç][oõ]es|campo\s*de\s*ourique|alvalade|benfica|lumiar|arroios|avenidas\s*novas/i, slug: 'lisboa' },
  { match: /cascais|estoril|carcavelos|parede|s[aã]o\s*domingos\s*de\s*rana/i, slug: 'cascais' },
  { match: /oeiras|pa[cç]o\s*de\s*arcos|alg[eé]s|carnaxide|queijas|caxias/i, slug: 'oeiras' },
  { match: /sintra|queluz|cac[eé]m|rio\s*de\s*mouro|massam[aá]|algueir[aã]o|mem\s*martins/i, slug: 'sintra' },
  { match: /loures|odivelas|amadora|mafra|ericeira|setubal|set[uú]bal|almada|costa\s*da\s*caparica|seixal/i, slug: 'lisboa' }
];

/**
 * Resolve um único termo ou freguesia para o slug canónico
 */
function resolveSingleLocation(term) {
  if (!term || typeof term !== 'string') return 'braga';
  const clean = term.trim().toLowerCase();

  for (const item of PARISH_TO_MUNICIPALITY_MAP) {
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
  
  // Se tiver múltiplas localizações separadas por vírgula, barra ou 'e', resolver a primeira relevante
  const parts = rawLocation.split(/[,;\/\|]|\se\s+/i).map(p => p.trim()).filter(Boolean);
  if (parts.length > 0) {
    return resolveSingleLocation(parts[0]);
  }
  return resolveSingleLocation(rawLocation);
}

/**
 * Extrai e resolve todas as localizações distintas presentes no texto (ex: "Póvoa de Lanhoso, Braga" -> ['povoa-de-lanhoso', 'braga'])
 */
function resolveAllIdealistaLocations(rawLocation) {
  if (!rawLocation || typeof rawLocation !== 'string') return ['braga'];

  const parts = rawLocation.split(/[,;\/\|]|\se\s+/i).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return ['braga'];

  const uniqueSlugs = [];
  parts.forEach(part => {
    const slug = resolveSingleLocation(part);
    if (slug && !uniqueSlugs.includes(slug)) {
      uniqueSlugs.push(slug);
    }
  });

  return uniqueSlugs.length > 0 ? uniqueSlugs : ['braga'];
}

module.exports = {
  resolveIdealistaLocation,
  resolveAllIdealistaLocations,
  resolveSingleLocation,
  PARISH_TO_MUNICIPALITY_MAP
};
