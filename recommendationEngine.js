/**
 * SURE. Algoritmo Inteligente de Matching, Preço/m² da Zona e Comparativo de Mercado
 * Tabela Oficial de Preços Médios de Mercado 2025/2026 (Idealista / INE)
 */

const ZONE_BENCHMARKS = [
  // ── VILA NOVA DE FAMALICÃO (Freguesias & Concelho - Média 2025/2026: 1.934 €/m²) ──
  { match: /famalic[aã]o\s*centro|calend[aá]rio|antas|uni[aã]o\s*de\s*freguesias\s*de\s*famalic/i, name: 'Famalicão Centro / Calendário', m2: 2200 },
  { match: /joane|riba\s*d['\s]*ave|brufe|lousado/i, name: 'Joane / Riba d\'Ave (Famalicão)', m2: 1750 },
  { match: /louro|arnoso|pedome|del[aã]es|bairro|gavi[aã]o|landim|ruiv[aã]es|seide|avidos|caval[oõ]es|esmeriz|mogege|requi[aã]o|vermoim|vilarinho/i, name: 'Louro / Freguesias de Famalicão', m2: 1550 },
  { match: /famalic[aã]o|v\.?\s*n\.?\s*famalic[aã]o/i, name: 'Vila Nova de Famalicão', m2: 1934 },

  // ── BRAGA (Freguesias & Concelho - Média 2025/2026: 1.988 €/m²) ──
  { match: /s[aã]o\s*v[ií]tor/i, name: 'São Vítor (Braga)', m2: 2250 },
  { match: /gualtar|nogueir[oó]|ten[oõ]es/i, name: 'Nogueiró / Gualtar (Braga)', m2: 2350 },
  { match: /lama[cç][aã]es|frai[aã]o/i, name: 'Lamaçães / Fraião (Braga)', m2: 2300 },
  { match: /real|frossos|dume/i, name: 'Real / Frossos (Braga)', m2: 1850 },
  { match: /s[eé]|cividade|maximinos/i, name: 'Sé / Maximinos (Braga Centro)', m2: 2050 },
  { match: /ferreiros|gondizalves/i, name: 'Ferreiros (Braga)', m2: 1700 },
  { match: /lomar|arcos/i, name: 'Lomar (Braga)', m2: 1650 },
  { match: /palmeira|ada[uú]fe/i, name: 'Palmeira / Adaúfe (Braga)', m2: 1550 },
  { match: /celeir[oó]s|aveleda|tadim|cabreiros|merelim|mire|padim|semelhe|tib[aã]es/i, name: 'Celeirós / Periferia de Braga', m2: 1500 },
  { match: /braga/i, name: 'Braga (Concelho)', m2: 1988 },

  // ── GUIMARÃES (Média 2025/2026: 1.855 €/m²) ──
  { match: /azur[eé]m|creixomil|urgezes|costa|mes[aã]o\s*frio/i, name: 'Guimarães Centro Urbano', m2: 2150 },
  { match: /taipas|caldas\s*das\s*taipas|sande/i, name: 'Caldas das Taipas (Guimarães)', m2: 1750 },
  { match: /guardizela|brito|moreira|ronfe|silvares|lordelo|serzedelo|polvoreira|s[aã]o\s*torcato/i, name: 'Guardizela / Freguesias de Guimarães', m2: 1600 },
  { match: /guimar[aã]es/i, name: 'Guimarães', m2: 1855 },

  // ── BARCELOS (Média 2025/2026: 1.816 €/m²) ──
  { match: /barcelos\s*centro|barcelinhos|arcozelo/i, name: 'Barcelos Centro', m2: 1950 },
  { match: /viatodos|martim|galegos|gilmonde|manhente|abade|alheira/i, name: 'Freguesias de Barcelos', m2: 1550 },
  { match: /barcelos/i, name: 'Barcelos', m2: 1816 },

  // ── AMARES & VILA VERDE ──
  { match: /amares|dornelas|figueiredo|caires|bouro|caldelas\s*amares/i, name: 'Amares', m2: 1450 },
  { match: /prado|soutelo/i, name: 'Vila de Prado / Soutelo', m2: 1650 },
  { match: /vila\s*verde|cerv[aã]es|moure|barbudo|lage|pico/i, name: 'Vila Verde', m2: 1500 },

  // ── LITORAL (Esposende, Póvoa, Vila do Conde) ──
  { match: /esposende|f[aã]o|ap[uú]lia|marinhas/i, name: 'Esposende / Apúlia', m2: 2350 },
  { match: /p[oó]voa\s*de\s*varzim|p[oó]voa|aver-o-mar|agucadoura/i, name: 'Póvoa de Varzim', m2: 2550 },
  { match: /vila\s*do\s*conde|mindelo|[aá]rvore|azurara/i, name: 'Vila do Conde', m2: 2450 },

  // ── VALE DO AVE / LESTE ──
  { match: /santo\s*tirso|aves|vila\s*das\s*aves|rebord[oõ]es/i, name: 'Santo Tirso / Aves', m2: 1550 },
  { match: /trofa|bougado|coronado/i, name: 'Trofa', m2: 1650 },
  { match: /vizela|infias|tagilde/i, name: 'Vizela', m2: 1550 },
  { match: /fafe|ar[oõ]es|fornelos/i, name: 'Fafe', m2: 1450 },

  // ── GRANDE PORTO ──
  { match: /foz|boavista|nevogilde/i, name: 'Porto (Foz / Boavista)', m2: 4200 },
  { match: /cedofeita|paranhos|bonfim|santo\s*ildefonso|campanh[aã]|massarelos/i, name: 'Porto Centro / Paranhos', m2: 3400 },
  { match: /porto/i, name: 'Porto (Concelho)', m2: 3400 },
  { match: /matosinhos|le[cç]a\s*da\s*palmeira|senhora\s*da\s*hora/i, name: 'Matosinhos / Leça', m2: 3150 },
  { match: /gaia|vila\s*nova\s*de\s*gaia|canidelo|madalena/i, name: 'Vila Nova de Gaia', m2: 2550 },
  { match: /maia|moreira\s*da\s*maia|[aá]guas\s*santas/i, name: 'Maia', m2: 2250 },

  // ── ALTO MINHO ──
  { match: /viana\s*do\s*castelo|viana|areosa|meadela|darque|afife/i, name: 'Viana do Castelo', m2: 1950 },
  { match: /ponte\s*de\s*lima/i, name: 'Ponte de Lima', m2: 1650 }
];

const { resolveIdealistaLocation } = require('./geoResolver');

function getZoneBenchmark(listingText, clientLocation = '') {
  const listingLower = (listingText || '').toLowerCase();
  const clientLower = (clientLocation || '').toLowerCase();
  
  // 1. Tentar encontrar a freguesia/concelho no texto do próprio anúncio
  for (const item of ZONE_BENCHMARKS) {
    if (item.match.test(listingLower)) {
      return item;
    }
  }

  // 2. Tentar a localização do cliente
  for (const item of ZONE_BENCHMARKS) {
    if (item.match.test(clientLower)) {
      return item;
    }
  }

  // 3. Fallback genérico regional
  return { name: 'Média Regional', m2: 1850 };
}

function analyzePriceM2(listing, client) {
  let m2Val = 0;
  if (listing.price_m2) {
    m2Val = parseInt(String(listing.price_m2).replace(/[^\d]/g, ''), 10) || 0;
  }
  if (!m2Val && listing.price_num > 0 && listing.area) {
    const areaNum = parseInt(String(listing.area).replace(/[^\d]/g, ''), 10) || 0;
    if (areaNum > 0) m2Val = Math.round(listing.price_num / areaNum);
  }

  const listingFullText = `${listing.title} ${listing.location} ${listing.description || ''}`;
  const zoneInfo = getZoneBenchmark(listingFullText, client.location || 'Braga');

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
