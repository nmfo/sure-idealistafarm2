const { resolveIdealistaLocation } = require('./geoResolver');

const CONCELHO_BENCHMARKS = {
  // ── BRAGA (Média 2025/2026: 1.988 - 2.250 €/m²) ──
  braga: [
    { match: /\b(s[aã]o\s*v[ií]tor|são\s*victor)\b/i, name: 'São Vítor (Braga)', m2: 2250 },
    { match: /\b(s[aã]o\s*vicente)\b/i, name: 'São Vicente (Braga)', m2: 2200 },
    { match: /\b(gualtar|nogueir[oó]|ten[oõ]es)\b/i, name: 'Nogueiró / Gualtar (Braga)', m2: 2350 },
    { match: /\b(lama[cç][aã]es|frai[aã]o)\b/i, name: 'Lamaçães / Fraião (Braga)', m2: 2300 },
    { match: /\b(frossos|dume|real|semelhe)\b/i, name: 'Real / Frossos (Braga)', m2: 1850 },
    { match: /\b(maximinos|cividade|s[eé]\s*de\s*braga|freguesia\s*da\s*s[eé]|braga\s*centro|s[aã]o\s*l[aá]zaro)\b/i, name: 'Sé / Maximinos / S. Lázaro (Braga Centro)', m2: 2100 },
    { match: /\b(ferreiros|gondizalves)\b/i, name: 'Ferreiros (Braga)', m2: 1700 },
    { match: /\b(lomar|arcos\s*braga)\b/i, name: 'Lomar (Braga)', m2: 1650 },
    { match: /\b(palmeira|ada[uú]fe)\b/i, name: 'Palmeira / Adaúfe (Braga)', m2: 1550 },
    { match: /\b(celeir[oó]s|aveleda|tadim|cabreiros|merelim|mire\s*de\s*tib[aã]es|padim|tib[aã]es|ruilhe)\b/i, name: 'Celeirós / Periferia de Braga', m2: 1500 },
    { match: /.*/, name: 'Braga (Concelho)', m2: 1988 }
  ],

  // ── VILA NOVA DE FAMALICÃO (Média 2025/2026: 1.934 €/m²) ──
  famalicao: [
    { match: /\b(famalic[aã]o\s*centro|calend[aá]rio|antas)\b/i, name: 'Famalicão Centro / Calendário', m2: 2200 },
    { match: /\b(joane|riba\s*d['\s]*ave|brufe|lousado)\b/i, name: 'Joane / Riba d\'Ave (Famalicão)', m2: 1750 },
    { match: /\b(louro|arnoso|pedome|del[aã]es|bairro\s*famalic[aã]o|gavi[aã]o|landim|ruiv[aã]es|seide|avidos|caval[oõ]es|esmeriz|mogege|requi[aã]o|vermoim|vilarinho|vale\s*s[aã]o\s*cosme|gondifelos)\b/i, name: 'Louro / Freguesias de Famalicão', m2: 1550 },
    { match: /.*/, name: 'Vila Nova de Famalicão', m2: 1934 }
  ],

  // ── GUIMARÃES (Média 2025/2026: 1.855 €/m²) ──
  guimaraes: [
    { match: /\b(azur[eé]m|creixomil|urgezes|costa\s*guimar[aã]es|mes[aã]o\s*frio|centro)\b/i, name: 'Guimarães Centro Urbano', m2: 2150 },
    { match: /\b(taipas|caldas\s*das\s*taipas|sande)\b/i, name: 'Caldas das Taipas (Guimarães)', m2: 1750 },
    { match: /\b(guardizela|brito|moreira\s*de\s*c[oó]negos|ronfe|silvares|lordelo|serzedelo|polvoreira|s[aã]o\s*torcato)\b/i, name: 'Guardizela / Freguesias de Guimarães', m2: 1600 },
    { match: /.*/, name: 'Guimarães', m2: 1855 }
  ],

  // ── BARCELOS (Média 2025/2026: 1.816 €/m²) ──
  barcelos: [
    { match: /\b(barcelos\s*centro|barcelinhos|arcozelo\s*barcelos)\b/i, name: 'Barcelos Centro', m2: 1950 },
    { match: /\b(viatodos|martim|galegos|gilmonde|manhente|abade|alheira)\b/i, name: 'Freguesias de Barcelos', m2: 1550 },
    { match: /.*/, name: 'Barcelos', m2: 1816 }
  ],

  // ── MINHO / LITORAL NORTE ──
  minho_litoral: [
    { match: /\b(p[oó]voa\s*de\s*varzim|p[oó]voa|aver-o-mar|agucadoura)\b/i, name: 'Póvoa de Varzim', m2: 2550 },
    { match: /\b(vila\s*do\s*conde|mindelo|[aá]rvore|azurara)\b/i, name: 'Vila do Conde', m2: 2450 },
    { match: /\b(esposende|f[aã]o|ap[uú]lia|marinhas)\b/i, name: 'Esposende / Apúlia', m2: 2350 },
    { match: /\b(viana\s*do\s*castelo|viana|areosa|meadela|darque|afife)\b/i, name: 'Viana do Castelo', m2: 1950 },
    { match: /\b(amares|dornelas|figueiredo|caires|bouro|caldelas\s*amares)\b/i, name: 'Amares', m2: 1450 },
    { match: /\b(prado|soutelo)\b/i, name: 'Vila de Prado / Soutelo', m2: 1650 },
    { match: /\b(vila\s*verde|cerv[aã]es|moure|barbudo|lage|pico)\b/i, name: 'Vila Verde', m2: 1500 },
    { match: /\b(santo\s*tirso|aves|vila\s*das\s*aves|rebord[oõ]es)\b/i, name: 'Santo Tirso / Aves', m2: 1550 },
    { match: /\btrofa\b/i, name: 'Trofa', m2: 1650 },
    { match: /\bvizela\b/i, name: 'Vizela', m2: 1550 },
    { match: /\bfafe\b/i, name: 'Fafe', m2: 1450 },
    { match: /.*/, name: 'Minho / Litoral Norte', m2: 1750 }
  ],

  // ── PORTO CONCELHO (Média 2025/2026: 3.500 €/m²) ──
  porto: [
    { match: /\b(foz|foz\s*do\s*douro|nevogilde|aldoar)\b/i, name: 'Porto (Foz / Aldoar)', m2: 4400 },
    { match: /\b(boavista|lordelo\s*do\s*ouro|massarelos)\b/i, name: 'Porto (Boavista / Massarelos)', m2: 3900 },
    { match: /\b(cedofeita|santo\s*ildefonso|miragaia|s[aã]o\s*nicolau|vit[oó]ria|baixa\s*do\s*porto|baixa\s*porto)\b/i, name: 'Porto Centro Histórico', m2: 3650 },
    { match: /\b(bonfim|campanh[aã])\b/i, name: 'Porto (Bonfim / Campanhã)', m2: 3100 },
    { match: /\b(paranhos|ramalde|areosa)\b/i, name: 'Porto (Paranhos / Ramalde)', m2: 3250 },
    { match: /.*/, name: 'Porto (Concelho)', m2: 3500 }
  ],

  // ── MATOSINHOS & GRANDE PORTO LITORAL (Média 2025/2026: 2.950 €/m²) ──
  matosinhos: [
    { match: /\b(le[cç]a\s*da\s*palmeira|matosinhos\s*sul)\b/i, name: 'Leça da Palmeira / Matosinhos Sul', m2: 3400 },
    { match: /\b(senhora\s*da\s*hora|s[aã]o\s*mamede\s*de\s*infesta|s\.\s*mamede)\b/i, name: 'Senhora da Hora / S. Mamede (Matosinhos)', m2: 2850 },
    { match: /\b(cust[oó]ias|guif[oõ]es|lavra|perafita|santa\s*cruz\s*do\s*bispo|sendim|bou[cç]as)\b/i, name: 'Custóias / Guifões / Lavra (Matosinhos)', m2: 2500 },
    { match: /.*/, name: 'Matosinhos (Concelho)', m2: 2950 }
  ],

  // ── VILA NOVA DE GAIA ──
  gaia: [
    { match: /\b(canidelo|madalena|afurada|valadares|praia\s*de\s*lavadores|lavadores)\b/i, name: 'Gaia Litoral / Canidelo', m2: 2950 },
    { match: /\b(mafamude|vilar\s*do\s*para[ií]so|santa\s*marinha|centro\s*de\s*gaia)\b/i, name: 'Gaia Centro / Mafamude', m2: 2550 },
    { match: /.*/, name: 'Vila Nova de Gaia', m2: 2450 }
  ],

  // ── MAIA, GONDOMAR & VALONGO ──
  maia: [
    { match: /\b(cidade\s*da\s*maia|moreira\s*da\s*maia|castelo\s*da\s*maia)\b/i, name: 'Maia Centro', m2: 2350 },
    { match: /\b([aá]guas\s*santas|pedrou[cç]os|milheir[oó]s)\b/i, name: 'Águas Santas / Maia', m2: 2100 },
    { match: /\b(rio\s*tinto|gondomar)\b/i, name: 'Rio Tinto / Gondomar', m2: 2050 },
    { match: /\b(valongo|ermesinde)\b/i, name: 'Valongo / Ermesinde', m2: 1950 },
    { match: /.*/, name: 'Maia (Concelho)', m2: 2250 }
  ],

  // ── LISBOA CONCELHO (Média 2025/2026: 5.100 €/m²) ──
  lisboa: [
    { match: /\b(chiado|pr[ií]ncipe\s*real|baixa\s*de\s*lisboa|baixa\s*pombalina|miseric[oó]rdia|santo\s*ant[oó]nio)\b/i, name: 'Lisboa Prime (Chiado / Baixa)', m2: 6800 },
    { match: /\b(estrela|lapa|campo\s*de\s*ourique|bel[eé]m|restelo)\b/i, name: 'Lisboa (Estrela / Belém)', m2: 5900 },
    { match: /\b(avenidas\s*novas|alvalade|parque\s*das\s*na[cç][oõ]es|expo)\b/i, name: 'Lisboa (Avenidas Novas / Expo)', m2: 5400 },
    { match: /\b(arroios|penha\s*de\s*fran[cç]a|marvila|beato|gra[cç]a|alc[aâ]ntara|s[aã]o\s*vicente\s*de\s*fora)\b/i, name: 'Lisboa (Arroios / Graça)', m2: 4400 },
    { match: /\b(benfica|s[aã]o\s*domingos\s*de\s*benfica|carnide|lumiar|telheiras|ajuda)\b/i, name: 'Lisboa Residencial (Benfica / Lumiar)', m2: 3900 },
    { match: /\b(cascais|estoril|carcavelos|parede|s[aã]o\s*pedro\s*do\s*estoril)\b/i, name: 'Cascais / Estoril', m2: 5200 },
    { match: /\b(oeiras|pa[cç]o\s*de\s*arcos|caxias|alg[eé]s)\b/i, name: 'Oeiras / Algés', m2: 3950 },
    { match: /\b(sintra|amadora|odivelas|queluz|mem\s*martins|cac[eé]m|massam[aá])\b/i, name: 'Linha de Sintra / Amadora / Odivelas', m2: 2400 },
    { match: /\b(almada|costa\s*da\s*caparica|charneca|seixal|set[uú]bal)\b/i, name: 'Margem Sul (Almada / Seixal)', m2: 2700 },
    { match: /.*/, name: 'Lisboa (Concelho)', m2: 5100 }
  ]
};

function detectConcelho(text) {
  const t = (text || '').toLowerCase();
  if (/\b(braga|s[aã]o\s*v[ií]tor|s[aã]o\s*victor|s[aã]o\s*vicente|gualtar|nogueir[oó]|ten[oõ]es|lama[cç][aã]es|frai[aã]o|frossos|dume|real|maximinos|cividade|s[eé]\s*de\s*braga|ferreiros|lomar|palmeira|celeir[oó]s)\b/i.test(t) && !/\b(lisboa|porto|famalic|matosinhos|gaia)\b/i.test(t)) {
    return 'braga';
  }
  if (/\b(famalic[aã]o|v\.?\s*n\.?\s*famalic[aã]o|calend[aá]rio|antas|louro|arnoso|pedome|del[aã]es|landim|requi[aã]o|vermoim|joane|riba\s*d['\s]*ave|gondifelos)\b/i.test(t)) {
    return 'famalicao';
  }
  if (/\b(guimar[aã]es|azur[eé]m|creixomil|urgezes|taipas|ronfe|silvares|guardizela)\b/i.test(t)) {
    return 'guimaraes';
  }
  if (/\b(barcelos|barcelinhos|arcozelo\s*barcelos|viatodos)\b/i.test(t)) {
    return 'barcelos';
  }
  if (/\b(matosinhos|le[cç]a\s*da\s*palmeira|senhora\s*da\s*hora|s[aã]o\s*mamede\s*de\s*infesta|cust[oó]ias|guif[oõ]es|lavra|perafita)\b/i.test(t)) {
    return 'matosinhos';
  }
  if (/\b(gaia|vila\s*nova\s*de\s*gaia|canidelo|mafamude|madalena|afurada|valadares|lavadores)\b/i.test(t)) {
    return 'gaia';
  }
  if (/\b(porto|foz\s*do\s*douro|boavista|cedofeita|bonfim|campanh[aã]|paranhos|ramalde|miragaia)\b/i.test(t) && !/\b(braga|famalic|gaia|matosinhos)\b/i.test(t)) {
    return 'porto';
  }
  if (/\b(maia|rio\s*tinto|gondomar|valongo|ermesinde|[aá]guas\s*santas)\b/i.test(t)) {
    return 'maia';
  }
  if (/\b(p[oó]voa\s*de\s*varzim|vila\s*do\s*conde|esposende|viana\s*do\s*castelo|amares|vila\s*verde|santo\s*tirso|trofa|vizela|fafe)\b/i.test(t)) {
    return 'minho_litoral';
  }
  if (/\b(lisboa|chiado|arroios|avenidas\s*novas|expo|cascais|estoril|oeiras|sintra|amadora|odivelas|almada|seixal|set[uú]bal)\b/i.test(t)) {
    return 'lisboa';
  }
  return null;
}

function getZoneBenchmark(listing, client = {}) {
  const listingText = typeof listing === 'string'
    ? listing
    : `${listing?.title || ''} ${listing?.location || ''} ${listing?.description || ''}`;
  const clientLoc = typeof client === 'string'
    ? client
    : (client?.location || '');

  const listingLower = listingText.toLowerCase();
  const clientLower = clientLoc.toLowerCase();

  // 1. Detectar primeiro o concelho a partir do anúncio ou do cliente
  // Se o anúncio ou cliente contiver Braga -> concelho = 'braga'
  // Se o anúncio ou cliente contiver Famalicão -> concelho = 'famalicao'
  const concelho = detectConcelho(listingText) || detectConcelho(clientLoc);

  if (concelho && CONCELHO_BENCHMARKS[concelho]) {
    const list = CONCELHO_BENCHMARKS[concelho];
    for (const item of list) {
      if (item.match.test(listingLower) || item.match.test(clientLower)) {
        return item;
      }
    }
  }

  // 2. Se não detectou concelho específico, testar em cada grupo de concelhos
  for (const cKey of Object.keys(CONCELHO_BENCHMARKS)) {
    // Ignorar Lisboa a menos que o texto mencione explicitamente Lisboa
    if (cKey === 'lisboa' && !listingLower.includes('lisboa') && !clientLower.includes('lisboa')) {
      continue;
    }
    const list = CONCELHO_BENCHMARKS[cKey];
    for (const item of list) {
      if (item.match !== /.*/ && (item.match.test(listingLower) || item.match.test(clientLower))) {
        return item;
      }
    }
  }

  // 3. Fallback inteligente com base no local do cliente
  if (clientLoc && clientLoc.trim()) {
    const fallbackM2 = detectConcelho(clientLoc) === 'braga' ? 1988
      : detectConcelho(clientLoc) === 'famalicao' ? 1934
      : detectConcelho(clientLoc) === 'porto' ? 3500
      : detectConcelho(clientLoc) === 'lisboa' ? 5100
      : 2200;
    return { name: clientLoc.trim(), m2: fallbackM2 };
  }

  return { name: 'Média de Mercado', m2: 2200 };
}

function parseAreaNumber(areaStr) {
  if (!areaStr) return 0;
  const clean = String(areaStr).replace(/[^\d.,]/g, '').trim();
  if (/,\d{1,2}$/.test(clean)) {
    return Math.round(parseFloat(clean.replace(/\./g, '').replace(',', '.'))) || 0;
  }
  if (/\.\d{1,2}$/.test(clean)) {
    return Math.round(parseFloat(clean)) || 0;
  }
  const digits = clean.replace(/[^\d]/g, '');
  return parseInt(digits, 10) || 0;
}

function analyzePriceM2(listing, client) {
  let m2Val = 0;
  if (listing.price_m2) {
    m2Val = parseInt(String(listing.price_m2).replace(/[^\d]/g, ''), 10) || 0;
  }
  if (!m2Val && listing.price_num > 0 && listing.area) {
    const areaNum = parseAreaNumber(listing.area);
    if (areaNum > 0) m2Val = Math.round(listing.price_num / areaNum);
  }

  const zoneInfo = getZoneBenchmark(listing, client);

  if (!m2Val || m2Val <= 0) {
    return {
      property_m2: 0,
      benchmark_m2: zoneInfo.m2,
      zone_name: zoneInfo.name,
      diff_pct: 0,
      status: 'unknown',
      badge_text: `Média ${zoneInfo.name}: ${zoneInfo.m2.toLocaleString('pt-PT')} €/m²`,
      color: '#718096'
    };
  }

  const diffPct = Math.round(((m2Val - zoneInfo.m2) / zoneInfo.m2) * 100);

  if (diffPct <= -12) {
    return {
      property_m2: m2Val,
      benchmark_m2: zoneInfo.m2,
      zone_name: zoneInfo.name,
      diff_pct: diffPct,
      status: 'opportunity',
      badge_text: `💎 ${Math.abs(diffPct)}% abaixo da média de ${zoneInfo.name} (${m2Val.toLocaleString('pt-PT')} vs ${zoneInfo.m2.toLocaleString('pt-PT')} €/m²)`,
      short_badge: `💎 ${Math.abs(diffPct)}% abaixo da média (${m2Val} €/m²)`,
      color: '#2b6cb0'
    };
  } else if (diffPct <= 8) {
    return {
      property_m2: m2Val,
      benchmark_m2: zoneInfo.m2,
      zone_name: zoneInfo.name,
      diff_pct: diffPct,
      status: 'fair',
      badge_text: `📊 No valor de mercado de ${zoneInfo.name} (${m2Val.toLocaleString('pt-PT')} €/m²)`,
      short_badge: `📊 Preço Justo (${m2Val} €/m²)`,
      color: '#38a169'
    };
  } else {
    return {
      property_m2: m2Val,
      benchmark_m2: zoneInfo.m2,
      zone_name: zoneInfo.name,
      diff_pct: diffPct,
      status: 'above',
      badge_text: `⚠️ +${diffPct}% vs média de ${zoneInfo.name} (${m2Val.toLocaleString('pt-PT')} vs ${zoneInfo.m2.toLocaleString('pt-PT')} €/m²)`,
      short_badge: `⚠️ +${diffPct}% vs média da zona`,
      color: '#d69e2e'
    };
  }
}

function calculateMatchScore(client, listing) {
  if (!client || !listing) return { score: 50, reasons: [], badge: 'Normal' };

  let score = 0;
  const reasons = [];
  const penalties = [];

  const clientMaxPrice = client.max_price || 0;
  const clientMinPrice = client.min_price || 0;
  const listingPrice = listing.price_num || 0;
  const listingTitle = (listing.title || '').toLowerCase();
  const listingDesc = (listing.description || '').toLowerCase();
  const listingLoc = (listing.location || '').toLowerCase();
  const listingDetails = (listing.details || []).map(d => String(d).toLowerCase()).join(' ');
  const fullListingText = `${listingTitle} ${listingDesc} ${listingLoc} ${listingDetails}`;

  const clientNotes = (client.notes || '').toLowerCase();
  const clientAmenities = Array.isArray(client.amenities) ? client.amenities.map(a => a.toLowerCase()) : [];

  // ── 1. PREÇO & BUDGET (Peso: 25 pts) ───────────────────────────────────────
  if (clientMaxPrice > 0 && listingPrice > 0) {
    if (listingPrice <= clientMaxPrice) {
      const ratio = listingPrice / clientMaxPrice;
      if (ratio >= 0.70 && ratio <= 0.95) {
        score += 25;
        const diff = Math.round(clientMaxPrice - listingPrice);
        reasons.push(`🎯 Budget Perfeito (Margem de ${diff.toLocaleString('pt-PT')}€)`);
      } else if (ratio < 0.70) {
        score += 23;
        reasons.push(`💎 Excelente Preço (${Math.round((1 - ratio) * 100)}% abaixo do teto)`);
      } else {
        score += 20;
        reasons.push('🎯 No Limite do Orçamento');
      }
    } else {
      const overRatio = (listingPrice - clientMaxPrice) / clientMaxPrice;
      if (overRatio <= 0.05) {
        score += 12;
        reasons.push('🤝 Negociável (Ligeiramente acima do budget)');
      } else {
        score += 3;
      }
    }
  } else {
    score += 18;
  }

  // ── 2. PREÇO POR M² vs BENCHMARK DA ZONA (Peso: 20 pts) ───────────────────
  const m2Analysis = analyzePriceM2(listing, client);
  if (m2Analysis.status === 'opportunity') {
    score += 20;
    reasons.push(m2Analysis.badge_text);
  } else if (m2Analysis.status === 'fair') {
    score += 16;
    reasons.push(m2Analysis.badge_text);
  } else if (m2Analysis.status === 'above') {
    score += 8;
  } else {
    score += 12;
  }

  // ── 3. TEMPO NO MERCADO & BAIXA DE PREÇO (Peso: 10 pts) ─────────────────────
  if (listing.price_drop) {
    score += 10;
    reasons.push(`🔻 Oportunidade: ${listing.price_drop}`);
  } else if (listing.market_tag && /ontem|hoje|dias/i.test(listing.market_tag)) {
    score += 8;
    reasons.push(`⚡ Novo no Mercado (${listing.market_tag})`);
  } else if (listing.market_tag && /mês|meses/i.test(listing.market_tag)) {
    score += 6;
    reasons.push(`🤝 Forte Margem de Negociação (${listing.market_tag} no mercado)`);
  }

  // ── 4. TIPOLOGIA EXATA (Peso: 15 pts) ──────────────────────────────────────
  const clientTyps = (Array.isArray(client.typology) ? client.typology : [client.typology || ''])
    .map(t => String(t).toLowerCase().trim());
  const listingTyp = (listing.typology || '').toLowerCase().trim();

  let matchedTyp = false;
  if (clientTyps.length > 0 && clientTyps[0]) {
    for (const t of clientTyps) {
      if (t && (listingTyp.includes(t) || fullListingText.includes(t))) {
        matchedTyp = true;
        break;
      }
    }
    if (matchedTyp) {
      score += 15;
      reasons.push(`📐 Tipologia Exata (${listing.typology || clientTyps.join('/')})`);
    } else {
      score += 4;
    }
  } else {
    score += 10;
  }

  // ── ÁREA MÍNIMA (m²) ───────────────────────────────────────────────────────
  const clientMinArea = Number(client.min_area || client.min_surface || 0);
  const listingAreaNum = parseAreaNumber(listing.area);
  if (clientMinArea > 0) {
    if (listingAreaNum > 0) {
      if (listingAreaNum >= clientMinArea) {
        score += 10;
        reasons.push(`📐 Área Pretendida (${listingAreaNum} m² ≥ ${clientMinArea} m²)`);
      } else {
        score = Math.max(score - 18, 10);
        penalties.push(`Área inferior (${listingAreaNum} m² < ${clientMinArea} m²)`);
      }
    }
  }

  // ── 5. TIPO DE IMÓVEL (Peso: 15 pts) ───────────────────────────────────────
  const clientPropType = (client.property_type || '').toLowerCase();
  if (clientPropType.includes('loja') || clientPropType.includes('comercio') || clientPropType.includes('espaco') || clientPropType.includes('armazem')) {
    if (/loja|com[eé]rcio|comercial|espa[cç]o|armaz[eé]m|pavilhao|pavilhão/i.test(fullListingText)) {
      score += 15;
      reasons.push('🏪 Espaço Comercial / Loja Pretendido');
    } else {
      score += 3;
    }
  } else if (clientPropType.includes('escritorio')) {
    if (/escrit[oó]rio|gabinete|sala|comercial/i.test(fullListingText)) {
      score += 15;
      reasons.push('💼 Escritório / Gabinete Pretendido');
    } else {
      score += 3;
    }
  } else if (clientPropType.includes('garagem')) {
    if (/garagem|box|parqueamento|estacionamento/i.test(fullListingText)) {
      score += 15;
      reasons.push('🚗 Garagem / Box Pretendida');
    } else {
      score += 3;
    }
  } else if (clientPropType.includes('predio')) {
    if (/pr[eé]dio|edif[ií]cio/i.test(fullListingText)) {
      score += 15;
      reasons.push('🏢 Prédio / Edifício Pretendido');
    } else {
      score += 3;
    }
  } else if (clientPropType.includes('terreno')) {
    if (fullListingText.includes('terreno') || fullListingText.includes('lote') || fullListingText.includes('quinta') || fullListingText.includes('herdade')) {
      score += 15;
      reasons.push('🌱 Terreno / Lote Pretendido');
    } else {
      score += 4;
    }
  } else if (clientPropType.includes('moradia') || clientNotes.includes('moradia')) {
    if (fullListingText.includes('moradia') || fullListingText.includes('casa') || fullListingText.includes('villa')) {
      score += 15;
      reasons.push('🏡 Moradia Pretendida');
    } else {
      score += 3;
    }
  } else if (clientPropType.includes('apartamento') || clientPropType.includes('casas')) {
    if (fullListingText.includes('apartamento') || fullListingText.includes('duplex') || fullListingText.includes('andar') || fullListingText.includes('estúdio')) {
      score += 15;
      reasons.push('🏢 Apartamento Residencial');
    } else {
      score += 8;
    }
  } else {
    score += 10;
  }

  // ── 6. COMODIDADES ESSENCIAIS (Peso: 15 pts) ───────────────────────────────
  let amenityScore = 0;

  // Garagem
  const wantsGarage = clientAmenities.includes('garagem') || clientNotes.includes('garagem') || clientNotes.includes('estacionamento') || clientNotes.includes('box');
  const hasGarage = fullListingText.includes('garagem') || fullListingText.includes('lugar de garagem') || fullListingText.includes('box') || fullListingText.includes('estacionamento');
  if (wantsGarage) {
    if (hasGarage) {
      amenityScore += 5;
      reasons.push('🚗 Com Garagem / Lugar');
    }
  } else if (hasGarage) {
    amenityScore += 2;
  }

  // Piscina
  const wantsPool = clientAmenities.includes('piscina') || clientNotes.includes('piscina');
  const hasPool = fullListingText.includes('piscina');
  if (wantsPool) {
    if (hasPool) {
      amenityScore += 5;
      reasons.push('🏊 Com Piscina');
    }
  } else if (hasPool) {
    amenityScore += 2;
  }

  // Jardim / Espaço Exterior / Terraço
  const wantsGarden = clientAmenities.includes('jardim') || clientAmenities.includes('terraco') || clientNotes.includes('jardim') || clientNotes.includes('espaço exterior') || clientNotes.includes('quintal') || clientNotes.includes('terraço');
  const hasGarden = fullListingText.includes('jardim') || fullListingText.includes('terraço') || fullListingText.includes('terraco') || fullListingText.includes('quintal') || fullListingText.includes('espaço exterior');
  if (wantsGarden) {
    if (hasGarden) {
      amenityScore += 4;
      reasons.push('🌿 Jardim / Espaço Exterior');
    }
  } else if (hasGarden) {
    amenityScore += 2;
  }

  // Elevador
  const wantsElevator = clientAmenities.includes('elevador') || clientNotes.includes('elevador') || (client.elevator_floor && client.elevator_floor !== '0');
  const hasElevator = fullListingText.includes('elevador') || fullListingText.includes('com elevador');
  if (wantsElevator) {
    if (hasElevator) {
      amenityScore += 3;
      reasons.push('🛗 Com Elevador');
    }
  }

  score += Math.min(amenityScore, 15);

  // ── 7. CONCELHO & FREGUESIAS ESPECÍFICAS (Peso: 20 pts) ─────────────────
  const clientLocSlug = resolveIdealistaLocation(client.location || '');
  // Usar o TÍTULO do anúncio para resolver o município real (o campo location costuma ser 'Braga' genérico)
  const listingLocSlug = resolveIdealistaLocation(listing.title || listing.location || '');

  // Penalização se o imóvel for de um município diferente do pretendido
  // Só penalizar quando AMBOS têm município específico (não 'braga' genérico)
  if (clientLocSlug && listingLocSlug && clientLocSlug !== 'braga' && listingLocSlug !== 'braga' && clientLocSlug !== listingLocSlug) {
    score = Math.max(score - 35, 15);
    reasons.push(`⚠️ Noutro Município (${listingLocSlug})`);
  }

  // Freguesias específicas mencionadas na localização do cliente
  const clientLocationStr = (client.location || '').toLowerCase();
  const subParishes = [
    // Vila Verde & Amares
    'prado', 'soutelo', 'pico de regalados', 'cervães', 'moure', 'barbudo', 'lage', 'valbom', 'passô', 'carreiras', 'marrancos', 'oleiros', 'coucieiro', 'cabanelas', 'valdreu', 'aboim',
    'dornelas', 'figueiredo', 'caires', 'bouro', 'caldelas', 'rendufinhe', 'barelos', 'prozelo', 'bico', 'lago',
    // Famalicão
    'joane', 'riba d\'ave', 'riba d', 'guardizela', 'aves', 'vila das aves', 'bairro', 'delães', 'delaes',
    'arnoso', 'pedome', 'gavião', 'gaviao', 'ruivães', 'ruivaes', 'seide', 'brufe', 'landim',
    // Braga
    'são vítor', 'sao vitor', 'gualtar', 'nogueiró', 'nogueiro', 'tenões', 'tenoes', 'lamaçães', 'lamacaes',
    'fraião', 'fraiao', 'real', 'frossos', 'dume', 'lomar', 'ferreiros', 'maximinos', 'sé', 'falperra', 'palmeira',
    // Guimarães
    'creixomil', 'azurém', 'azurem', 'urgezes', 'ronfe', 'taipas', 'brito', 'moreira de cónegos', 'silvares', 'lordelo',
    // Barcelos
    'barcelinhos', 'arcozelo', 'abade de neiva', 'gilmonde', 'manhente', 'viatodos'
  ];

  let matchedSubParish = '';
  for (const sp of subParishes) {
    if (clientLocationStr.includes(sp) && fullListingText.includes(sp)) {
      matchedSubParish = sp.charAt(0).toUpperCase() + sp.slice(1);
      score += 20;
      reasons.push(`📍 Na Freguesia Pretendida (${matchedSubParish})`);
      break;
    }
  }

  // Se o cliente explicitamente NÃO quer no centro (ex: notas do cliente)
  const rejectsCenter = /n[aã]o\s*quer(?:em)?\s*(?:no\s*)?centro|fora\s*do\s*centro|longe\s*do\s*centro/i.test(clientNotes);
  if (rejectsCenter) {
    const isCenter = /centro|antas|calend[aá]rio|uni[aã]o\s*de\s*freguesias|s[aã]o\s*mateus/i.test(fullListingText);
    if (isCenter) {
      score = Math.max(score - 18, 15);
      penalties.push('Localizado no Centro');
    }
  }

  const finalScore = Math.min(Math.max(Math.round(score), 18), 99);

  let badge = 'Match Médio';
  let badgeColor = '#5B7FA6';
  if (finalScore >= 88) {
    badge = '🔥 Recomendação Máxima';
    badgeColor = '#C75233';
  } else if (finalScore >= 72) {
    badge = '⭐ Forte Compatibilidade';
    badgeColor = '#5B8C6A';
  }

  return {
    score: finalScore,
    reasons: reasons.slice(0, 4),
    m2_analysis: m2Analysis,
    badge,
    badgeColor
  };
}

/**
 * Ordena e classifica os imóveis para um cliente específico
 */
function rankListingsForClient(client, listings) {
  if (!listings || !listings.length) return [];

  return listings.map(l => {
    const match = calculateMatchScore(client, l);
    return {
      ...l,
      match_score: match.score,
      match_reasons: match.reasons,
      match_badge: match.badge,
      match_color: match.badgeColor,
      m2_analysis: match.m2_analysis
    };
  }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
}

module.exports = {
  calculateMatchScore,
  analyzePriceM2,
  rankListingsForClient
};
