/**
 * SURE. Mapeador Geográfico Universal para o Idealista Portugal
 * Converte qualquer texto de localização, lista de freguesias ou concelho
 * no slug canónico oficial aceite pelo Idealista.
 */

// Dicionário de Freguesias e Zonas mapeadas para o Concelho Oficial do Idealista
const PARISH_TO_MUNICIPALITY_MAP = [
  // ── Freguesias de Braga ──
  { match: /s[aã]o\s*v[ií]tor|gualtar|nogueir[oó]|ten[oõ]es|lama[cç][aã]es|frai[aã]o|real|frossos|dume|lomar|ferreiros|maximinos|s[eé]|cividade|falperra|palmeira|ada[uú]fe|celeir[oó]s|aveleda|tadim|cabreiros|merelim|mire|padim|semelhe|tib[aã]es|gondizalves|espor[oõ]es|nogueira|sobreposta|pedralva|morreira|trandeiras|guisande|crespos|navarra|prado\s*s[aã]o\s*miguel|braga/i, slug: 'braga' },

  // ── Freguesias de Vila Nova de Famalicão ──
  { match: /famalic[aã]o|joane|riba\s*d|bairro|del[aã]es|arnoso|pedome|gavi[aã]o|ruiv[aã]es|seide|brufe|landim|avidos|caval[oõ]es|calend[aá]rio|antas|esmeriz|lousado|mogege|oliveira\s*santa\s*maria|oliveira\s*s[aã]o\s*mateus|requi[aã]o|vale\s*s[aã]o\s*cosme|vermoim|vilarinho\s*das\s*cambas/i, slug: 'vila-nova-de-famalicao' },

  // ── Freguesias de Guimarães ──
  { match: /guimar[aã]es|guardizela|brito|moreira\s*de\s*c[oó]negos|creixomil|azur[eé]m|urgezes|ronfe|taipas|caldas\s*das\s*taipas|sande|ponte|selho|fermentelos|lordelo|serzedelo|costa|mes[aã]o\s*frio|polvoreira|silvares|s[aã]o\s*torcato|prazins|barco|caldelas/i, slug: 'guimaraes' },

  // ── Freguesias de Barcelos ──
  { match: /barcelos|barcelinhos|arcozelo|abade\s*de\s*neiva|gilmonde|manhente|viatodos|tamel|alheira|martim|galegos|riga|carvalhas|pereira|alvito|rio\s*covo/i, slug: 'barcelos' },

  // ── Freguesias de Amares ──
  { match: /amares|dornelas|figueiredo|caires|bouro|ferreiros\s*amares|caldelas\s*amares|rendufinhe|barelos|prozelo|bico|lago/i, slug: 'amares' },

  // ── Freguesias de Vila Verde ──
  { match: /vila\s*verde|prado|soutelo|pico\s*de\s*regalados|gême|cerv[aã]es|moure|barbudo|lage|valbom|coucieiro|escariz|parada\s*de\s*gati|sande\s*vila\s*verde/i, slug: 'vila-verde' },

  // ── Freguesias de Esposende ──
  { match: /esposende|f[aã]o|ap[uú]lia|marinhas|gemeses|palmeira\s*de\s*faro|vila\s*ch[aã]|forj[aã]es|antinhas/i, slug: 'esposende' },

  // ── Freguesias de Póvoa de Varzim ──
  { match: /p[oó]voa\s*de\s*varzim|p[oó]voa|aver-o-mar|aver\s*o\s*mar|agucadoura|agu[cç]adoura|beiriz|amorim|rates|balasar|estev[aã]o/i, slug: 'povoa-de-varzim' },

  // ── Freguesias de Vila do Conde ──
  { match: /vila\s*do\s*conde|mindelo|arvore|[aá]rvore|azurara|fajozes|labruge|modivas|macieira|rio\s*mau|touguinha|vila\s*ch[aã]\s*vila\s*do\s*conde|vilar\s*do\s*pinheiro/i, slug: 'vila-do-conde' },

  // ── Freguesias de Santo Tirso / Aves ──
  { match: /santo\s*tirso|aves|vila\s*das\s*aves|rebord[oõ]es|s[aã]o\s*tom[eé]|couto|monte\s*c[oó]rdova|negrelos|vila\s*nova\s*do\s*campo/i, slug: 'santo-tirso' },

  // ── Freguesias de Trofa ──
  { match: /trofa|bougado|coronado|covelas|muro|alandroal/i, slug: 'trofa' },

  // ── Freguesias de Vizela ──
  { match: /vizela|s[aã]o\s*jo[aã]o\s*das\s*caldas|s[aã]o\s*miguel\s*das\s*caldas|infias|tagilde|santa\s*eul[aá]lia/i, slug: 'vizela' },

  // ── Freguesias de Fafe ──
  { match: /fafe|arões|ar[oõ]es|fornelos|quinch[aã]es|rego|medelo|moreira\s*do\s*rei|travass[oõ]es/i, slug: 'fafe' },

  // ── Freguesias de Matosinhos / Leça ──
  { match: /matosinhos|le[cç]a\s*da\s*palmeira|le[cç]a|senhora\s*da\s*hora|s[aã]o\s*mamede\s*de\s*infesta|cust[oó]ias|lavra|perafita|santa\s*cruz\s*do\s*bispo/i, slug: 'matosinhos' },

  // ── Freguesias da Maia ──
  { match: /maia|moreira\s*da\s*maia|cast[eê]lo\s*da\s*maia|pedrou[cç]os|[aá]guas\s*santas|milheir[oó]s|folgosa|nogueira\s*da\s*maia|s[aã]o\s*pedro\s*fins/i, slug: 'maia' },

  // ── Freguesias do Porto ──
  { match: /porto|foz|boavista|cedofeita|paranhos|bonfim|campanh[aã]|lordelo\s*do\s*ouro|massarelos|miragaia|santo\s*ildefonso|vit[oó]ria|aldoar|nevogilde|ramalde/i, slug: 'porto' },

  // ── Freguesias de Vila Nova de Gaia ──
  { match: /gaia|vila\s*nova\s*de\s*gaia|canidelo|madalena|valadares|gulpilhares|praia\s*da\s*granja|arcozelo\s*gaia|mafamude|vilar\s*do\s*para[ií]so|santa\s*marinha|canelas|grijo|carvalhos/i, slug: 'vila-nova-de-gaia' },

  // ── Freguesias de Viana do Castelo ──
  { match: /viana\s*do\s*castelo|viana|darque|areosa|meadela|monserrate|santa\s*marta\s*de\s*portuzelo|afife|ancora|[aâ]ncora|carre[cç]o|chaf[eé]|castelo\s*do\s*neiva/i, slug: 'viana-do-castelo' },

  // ── Freguesias de Ponte de Lima ──
  { match: /ponte\s*de\s*lima|arcozelo\s*ponte\s*de\s*lima|correlh[aã]s|feitosa|bertiandos|ribeira|calheiros/i, slug: 'ponte-de-lima' }
];

/**
 * Resolve qualquer texto de localização no Concelho Oficial Canónico do Idealista
 */
function resolveIdealistaLocation(rawLocation) {
  if (!rawLocation || typeof rawLocation !== 'string') return 'braga';

  const clean = rawLocation.trim().toLowerCase();

  // 1. Procurar nas regras de mapeamento de freguesias e concelhos
  for (const item of PARISH_TO_MUNICIPALITY_MAP) {
    if (item.match.test(clean)) {
      return item.slug;
    }
  }

  // 2. Se não encontrou, normalizar a primeira palavra ou termo limpo
  const firstWord = clean.split(/[,;\-\/\|]/)[0].trim();
  const normalized = firstWord
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'braga';
}

module.exports = {
  resolveIdealistaLocation,
  PARISH_TO_MUNICIPALITY_MAP
};
