const XLSX = require('xlsx');
const clientManager = require('./clientManager');
const { extractAndNormalizeAllLocations } = require('./geoResolver');

function normalizeStr(str) {
  if (!str) return '';
  return String(str).trim();
}

function parseZohoExcel(bufferOrPath) {
  let workbook;
  if (typeof bufferOrPath === 'string') {
    workbook = XLSX.readFile(bufferOrPath);
  } else {
    workbook = XLSX.read(bufferOrPath, { type: 'buffer' });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const consultants = clientManager.getConsultants();
  const existingClients = clientManager.getClients();
  let importedCount = 0;
  let updatedCount = 0;

  rows.forEach(row => {
    // 1. Find Name
    let name = row['Nome'] || row['Nome Completo'] || row['Contact Name'] || row['Lead Name'] || row['Cliente'] || row['Full Name'] || row['Nome do Contacto'] || row['Primeiro Nome'];
    if (row['Último Nome'] && row['Primeiro Nome']) {
      name = `${row['Primeiro Nome']} ${row['Último Nome']}`.trim();
    }
    if (!name) return;

    // 2. Find Consultant / Owner
    const consultantName = row['Proprietário do Lead'] || row['Proprietário do Contacto'] || row['Proprietário'] || row['Responsável'] || row['Consultor'] || row['Owner'] || row['Lead Owner'] || row['Contact Owner'] || 'Geral';
    let consultant = consultants.find(c => c.name.toLowerCase() === consultantName.toLowerCase().trim());
    if (!consultant && consultantName && consultantName !== 'Geral') {
      consultant = clientManager.saveConsultant({ name: consultantName.trim(), color: '#5B7FA6' });
      consultants.push(consultant);
    }
    const consultantId = consultant ? consultant.id : 'consultant-geral';

    // 3. Find All Location Columns & Free Text Notes
    const locationCandidates = [
      row['Localização'], row['Localizações'],
      row['Cidade'], row['Cidades'], row['City'], row['Mailing City'],
      row['Concelho'], row['Concelhos'],
      row['Distrito'], row['Distritos'], row['State'], row['Mailing State'],
      row['Freguesia'], row['Freguesias'],
      row['Zona de Procura'], row['Zonas de Procura'], row['Zona'], row['Zonas'],
      row['Outras Localizações'], row['Outras Zonas']
    ].filter(Boolean);

    const notesRaw = row['Notas'] || row['Descrição'] || row['Description'] || row['Observações'] || '';
    const geoInfo = extractAndNormalizeAllLocations(locationCandidates, notesRaw);

    // 4. Operation (comprar / arrendar)
    let op = (row['Operação'] || row['Tipo de Negócio'] || row['Objetivo'] || row['Operation'] || 'comprar').toLowerCase();
    op = op.includes('arrend') || op.includes('rent') ? 'arrendar' : 'comprar';

    // 5. Property Type
    const rawType = (row['Tipo de Imóvel'] || row['Property Type'] || row['Tipo'] || 'apartamentos').toLowerCase();
    let propType = 'apartamentos';
    if (rawType.includes('moradia-terrea')) propType = 'moradia-terrea';
    else if (rawType.includes('moradia')) propType = 'moradias';
    else if (rawType.includes('terreno')) propType = 'terrenos';
    else if (rawType.includes('predio')) propType = 'predios';
    else if (rawType.includes('loja') || rawType.includes('comerc')) propType = 'lojas';
    else if (rawType.includes('escritor')) propType = 'escritorios';
    else if (rawType.includes('garagem')) propType = 'garagens';
    else if (rawType.includes('trespasse')) propType = 'trespasse';
    else if (rawType.includes('construcao') || rawType.includes('nova') || rawType.includes('empreend')) propType = 'empreendimentos';

    // 6. Prices
    const rawMaxPrice = row['Preço Máximo'] || row['Orçamento'] || row['Budget'] || row['Max Price'] || row['Preço'] || row['Valor'] || '';
    const maxPrice = parseInt(String(rawMaxPrice).replace(/[^\d]/g, ''), 10) || null;

    const rawMinPrice = row['Preço Mínimo'] || row['Min Price'] || '';
    const minPrice = parseInt(String(rawMinPrice).replace(/[^\d]/g, ''), 10) || null;

    // 7. Typologies
    const rawTypo = String(row['Tipologia'] || row['Tipologias'] || row['Bedrooms'] || row['Quartos'] || row['Typology'] || 'T2, T3').toLowerCase();
    const typos = [];
    ['t0', 't1', 't2', 't3', 't4', 't5'].forEach(t => {
      if (rawTypo.includes(t) || rawTypo.includes(t.replace('t', ''))) typos.push(t);
    });
    if (typos.length === 0) typos.push('t2', 't3');

    // 8. Priority (SU, U, S)
    let rawPriority = String(row['Prioridade'] || row['Priority'] || row['Rating'] || 'U').toUpperCase().trim();
    let priority = 'U';
    if (rawPriority.includes('SU') || rawPriority.includes('SUPER') || rawPriority.includes('ALTA') || rawPriority.includes('HIGH')) {
      priority = 'SU';
    } else if (rawPriority.includes('BAIXA') || rawPriority.includes('LOW') || rawPriority === 'S' || rawPriority.includes('STANDARD')) {
      priority = 'S';
    }

    // 9. Notes & Phone & Email
    const phone = row['Telemóvel'] || row['Telefone'] || row['Phone'] || row['Mobile'] || '';
    const email = row['Email'] || row['E-mail'] || '';
    const notes = [
      phone ? `📞 ${phone}` : '',
      email ? `✉ ${email}` : '',
      notesRaw
    ].filter(Boolean).join(' | ');

    // Check if client already exists by name
    const existingIdx = existingClients.findIndex(c => c.name.toLowerCase() === name.toLowerCase().trim());
    const clientData = {
      id: existingIdx !== -1 ? existingClients[existingIdx].id : null,
      name: name.trim(),
      consultant_id: consultantId,
      priority: priority,
      operation: op,
      property_type: propType,
      location: geoInfo.formatted,
      locations: geoInfo.locations,
      min_price: minPrice,
      max_price: maxPrice,
      typology: typos,
      amenities: [],
      elevator_floor: '0',
      notes: notes
    };

    clientManager.saveClient(clientData);
    if (existingIdx !== -1) updatedCount++;
    else importedCount++;
  });

  return {
    total_processed: rows.length,
    imported: importedCount,
    updated: updatedCount,
    clients: clientManager.getClients()
  };
}

module.exports = {
  parseZohoExcel
};
