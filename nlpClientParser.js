const cm = require('./clientManager');

function parseClientText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. LISTA DE CONSULTORES CONHECIDOS
  const consultants = cm.getConsultants();
  let consultant_id = 'consultant-geral';
  let matchedConsultantName = '';

  for (const c of consultants) {
    const cName = c.name.toLowerCase();
    const firstName = cName.split(' ')[0];
    const lastName = cName.split(' ').slice(1).join(' ');
    
    // Match "do consultor nuno oliveira", "consultor nuno", "nuno oliveira", etc.
    const consultantRegex = new RegExp(`(?:consultor(?:a)?\\s*:?\\s*|do\\s+consultor\\s+|da\\s+consultora\\s+|do\\s+|da\\s+)?\\b${firstName}(?:\\s+${lastName})?\\b`, 'i');
    if (consultantRegex.test(text)) {
      consultant_id = c.id;
      matchedConsultantName = c.name;
      break;
    }
  }

  // 2. EXTRAÇÃO DE NOME DO CLIENTE
  let textForName = text;
  if (matchedConsultantName) {
    const parts = matchedConsultantName.split(' ');
    textForName = textForName.replace(new RegExp(`(?:do\\s+consultor|da\\s+consultora|consultor(?:a)?\\s*:?|do|da)?\\s*\\b${matchedConsultantName}\\b`, 'gi'), ' ');
    parts.forEach(p => {
      textForName = textForName.replace(new RegExp(`\\b${p}\\b`, 'gi'), ' ');
    });
  }

  // Stop-words e delimitadores de corte
  const stopWordCuts = '\\b(?:do\\s+consultor|da\\s+consultora|consultor|consultora|que\\s+quer|que\\s+pretende|que\\s+procura|quer\\s+comprar|quer\\s+arrendar|quer|pretende|procura|comprar|arrendar|t[0-9]|em\\s+|no\\s+|na\\s+|ate\\s+|até\\s+|com\\s+|para\\s+|apartamento|moradia|casa|terreno|lote|predio|loja|or[cç]amento|budget)\\b';

  let name = '';

  // Padrão 1: "cliente: DUDA TESTE", "nome: Carlos Silva", "comprador: ..."
  const explicitMatch = textForName.match(new RegExp(`(?:cliente|nome|comprador|investidor)\\s*:?\\s*([A-Za-zÀ-ÖØ-öø-ÿ0-9\\s\\.\\-]+?)(?:,|$|${stopWordCuts})`, 'i'));
  if (explicitMatch && explicitMatch[1].trim().length >= 2) {
    name = explicitMatch[1].trim();
  }

  // Padrão 2: "tenho uma cliente que é a DUDA TESTE", "a cliente chama-se...", "regista o cliente...", "adiciona a Duda..."
  if (!name) {
    const introMatch = textForName.match(new RegExp(`(?:tenho\\s+(?:um|uma)\\s+cliente\\s+(?:que\\s+[eé]\\s+(?:o|a)\\s*)?|(?:o|a)\\s+cliente\\s+(?:chama-se\\s+|[eé]\\s+(?:o|a)\\s*)?|regista(?:r)?\\s+(?:o|a)?\\s*|adiciona(?:r)?\\s+(?:o|a)?\\s*|para\\s+(?:o|a)\\s+)([A-Za-zÀ-ÖØ-öø-ÿ0-9\\s\\.\\-]+?)(?:,|$|${stopWordCuts})`, 'i'));
    if (introMatch && introMatch[1].trim().length >= 2) {
      name = introMatch[1].trim();
    }
  }

  // Padrão 3: Encontrar palavras em ALL CAPS ou TitleCase que pareçam nomes (ex: "DUDA TESTE", "Carlos Silva")
  if (!name) {
    const words = textForName.split(/[,;:\n]/)[0].split(/\s+/);
    const candidateWords = [];
    const nonNames = /^(o|a|os|as|um|uma|cliente|consultor|tenho|novo|nova|para|com|em|no|na|de|do|da|e|que|quer|comprar|arrendar|t0|t1|t2|t3|t4|t5|t6|vila|verde|braga|porto|famalicao|famalicão|guimaraes|guimarães|ate|até|k|mil|euros|€)$/i;
    
    for (const w of words) {
      const cleanW = w.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
      if (!cleanW) continue;
      if (nonNames.test(cleanW)) {
        if (candidateWords.length > 0) break;
        continue;
      }
      if (/^[A-ZÀ-ÖØ-ß]/.test(cleanW)) {
        candidateWords.push(cleanW);
      } else if (candidateWords.length > 0) {
        break;
      }
    }
    if (candidateWords.length > 0) {
      name = candidateWords.join(' ');
    }
  }

  // Limpeza final do nome
  name = (name || '').replace(/^(?:que\s+)?(?:[eé]\s+(?:o|a)?\s*|(?:o|a|os|as|sr\.?|sra\.?|de|do|da|que|e)\s+)/i, '')
                    .replace(/\s+(?:que|do|da|de|e|com|em|no|na)$/i, '')
                    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s\.\-]/g, '')
                    .trim();

  if (!name || name.length < 2 || /^(cliente|novo cliente|comprar|arrendar|apartamento|moradia)$/i.test(name)) {
    name = 'Novo Cliente';
  }

  // 3. OPERAÇÃO
  let operation = 'comprar';
  if (lower.includes('arrendar') || lower.includes('alugar') || lower.includes('arrendamento')) {
    operation = 'arrendar';
  }

  // 4. TIPO DE IMÓVEL
  let property_type = 'apartamentos';
  if (/moradia|casa\b|villa|quinta/i.test(lower)) {
    property_type = 'moradias';
  } else if (/terreno|lote/i.test(lower)) {
    property_type = 'terrenos';
  } else if (/pr[eé]dio/i.test(lower)) {
    property_type = 'predios';
  } else if (/loja|com[eé]rcio/i.test(lower)) {
    property_type = 'lojas';
  } else if (/escrit[oó]rio/i.test(lower)) {
    property_type = 'escritorios';
  } else if (/comprar\s+garagem|arrendar\s+garagem/i.test(lower)) {
    property_type = 'garagens';
  } else {
    property_type = 'apartamentos';
  }

  // 5. LOCALIZAÇÃO
  const locations = [
    { match: /famalic[aã]o|v\.?\s*n\.?\s*famalic[aã]o/i, loc: 'Vila Nova de Famalicão' },
    { match: /guimar[aã]es/i, loc: 'Guimarães' },
    { match: /barcelos/i, loc: 'Barcelos' },
    { match: /amares/i, loc: 'Amares' },
    { match: /vila\s*verde/i, loc: 'Vila Verde' },
    { match: /esposende/i, loc: 'Esposende' },
    { match: /p[oó]voa\s*de\s*varzim|p[oó]voa/i, loc: 'Póvoa de Varzim' },
    { match: /vila\s*do\s*conde/i, loc: 'Vila do Conde' },
    { match: /viana\s*do\s*castelo|viana/i, loc: 'Viana do Castelo' },
    { match: /ponte\s*de\s*lima/i, loc: 'Ponte de Lima' },
    { match: /fafe/i, loc: 'Fafe' },
    { match: /porto/i, loc: 'Porto' },
    { match: /matosinhos|le[cç]a/i, loc: 'Matosinhos' },
    { match: /maia/i, loc: 'Maia' },
    { match: /braga/i, loc: 'Braga' }
  ];

  let location = 'Braga';
  for (const l of locations) {
    if (l.match.test(lower)) {
      location = l.loc;
      break;
    }
  }

  // 6. EXTRAÇÃO DE PREÇO
  let max_price = null;
  let min_price = null;
  const pricesFound = [];

  const regexA = /(\d{1,3}(?:[\.\s]\d{3})+|\d{2,3}\s*k|\d{1,3}\s*mil|\d{5,7})\s*(?:€|euros|mil)?/gi;
  let matchA;
  while ((matchA = regexA.exec(text)) !== null) {
    let rawStr = matchA[0].toLowerCase().replace(/\s+/g, '');
    let val = 0;
    if (rawStr.includes('k') || rawStr.includes('mil')) {
      const num = parseFloat(rawStr.replace(/[^\d\.]/g, ''));
      val = num < 1000 ? num * 1000 : num;
    } else {
      val = parseInt(rawStr.replace(/[^\d]/g, ''), 10);
    }
    if (val >= 10000 && val <= 5000000 && !pricesFound.includes(val)) {
      pricesFound.push(val);
    }
  }

  if (pricesFound.length === 1) {
    max_price = pricesFound[0];
  } else if (pricesFound.length >= 2) {
    pricesFound.sort((a, b) => a - b);
    min_price = pricesFound[0];
    max_price = pricesFound[pricesFound.length - 1];
  }

  // 7. TIPOLOGIAS
  const typologies = [];
  const typMatches = lower.match(/\bt[0-9]\b|\bt[0-9]\+[0-9]\b|\b[0-9]\s*quartos?\b/gi);
  if (typMatches) {
    typMatches.forEach(t => {
      const clean = t.replace(/\s*quartos?/, '').toLowerCase();
      const norm = clean.startsWith('t') ? clean : 't' + clean;
      if (!typologies.includes(norm)) typologies.push(norm);
    });
  }
  if (typologies.length === 0) {
    typologies.push('t3');
  }

  // 8. COMODIDADES
  const amenities = [];
  if (/garagem|lugar|box|estacionamento/i.test(lower)) amenities.push('garagem');
  if (/piscina/i.test(lower)) amenities.push('piscina');
  if (/jardim|quintal|espa[cç]o\s*exterior|terreno/i.test(lower)) amenities.push('jardim');
  if (/elevador/i.test(lower)) amenities.push('elevador');
  if (/terra[cç]o|varanda/i.test(lower)) amenities.push('terraco');
  if (/ar\s*condicionado/i.test(lower)) amenities.push('ar_condicionado');
  if (/suite|su[ií]te/i.test(lower)) amenities.push('suite');

  // Piso do elevador
  let elevator_floor = '0';
  if (amenities.includes('elevador')) {
    elevator_floor = '1';
    if (/acima\s*do\s*1|a\s*partir\s*do\s*1|1[º\.]?\s*piso/i.test(lower)) elevator_floor = '1';
    else if (/acima\s*do\s*2|a\s*partir\s*do\s*2|2[º\.]?\s*piso/i.test(lower)) elevator_floor = '2';
    else if (/acima\s*do\s*3|a\s*partir\s*do\s*3|3[º\.]?\s*piso/i.test(lower)) elevator_floor = '3';
  }

  // 9. PRIORIDADE
  let priority = 'U';
  if (/super\s*urgente|muito\s*urgente|imediato|esta\s*semana|urgent[ií]ssimo/i.test(lower)) {
    priority = 'SU';
  } else if (/sem\s*pressa|quando\s*surgir|tranquilo|médio\s*prazo|ano/i.test(lower)) {
    priority = 'S';
  }

  // 10. NOTAS EXTRA LIMPAS & ESPECÍFICAS
  const extraNotes = [];
  if (amenities.includes('elevador') && elevator_floor !== '0') {
    extraNotes.push(`Elevador exigido a partir do ${elevator_floor}º Piso`);
  }
  if (/garantia\s*p[uú]blica/i.test(lower)) extraNotes.push('Quer aproveitar Garantia Pública');
  if (/cr[eé]dito\s*aprovado/i.test(lower)) extraNotes.push('Crédito bancário pré-aprovado');
  if (/moderno|moderna|recente|nova\s*constru[cç][aã]o/i.test(lower)) extraNotes.push('Preferência por imóvel recente / moderno');

  let notes = '';
  if (extraNotes.length > 0) {
    notes = `📌 Preferências: ${extraNotes.join(' | ')}`;
  } else {
    notes = `📌 Registado via Assistente IA (${name})`;
  }

  return {
    name,
    operation,
    property_type,
    location,
    max_price,
    min_price,
    typology: typologies,
    amenities,
    consultant_id,
    priority,
    notes,
    elevator_floor
  };
}

module.exports = { parseClientText };
