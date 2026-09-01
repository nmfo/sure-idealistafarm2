const PARISH_DATABASE = {
  "lisboa": [
    "Arroios", "Alvalade", "Estrela", "Avenidas Novas", "Campo de Ourique",
    "Parque das Nações", "Belém", "Misericórdia", "Santo António", "São Domingos de Benfica",
    "Lumiar", "Olivais", "Campolide", "Marvila", "Penha de França", "Beato",
    "Ajuda", "Santa Maria Maior", "Carnide", "Benfica"
  ],
  "porto": [
    "Cedofeita, Santo Ildefonso, Sé, Miragaia, São Nicolau e Vitória",
    "Bonfim", "Paranhos", "Ramalde", "Campanhã",
    "Lordelo do Ouro e Massarelos", "Aldoar, Foz do Douro e Nevogilde"
  ],
  "cascais": [
    "Cascais e Estoril", "Carcavelos e Parede", "Alcabideche", "São Domingos de Rana"
  ],
  "sintra": [
    "Algueirão-Mem Martins", "Colares", "Rio de Mouro",
    "Sintra (Santa Maria e São Miguel)", "Cacém e São Marcos",
    "Massamá e Monte Abraão", "Queluz e Belas", "Agualva e Mira-Sintra"
  ],
  "oeiras": [
    "Oeiras e São Julião da Barra, Paço de Arcos e Caxias",
    "Algés, Linda-a-Velha e Cruz Quebrada-Dafundo", "Barcarena",
    "Porto Salvo", "Carnaxide e Queijas"
  ],
  "faro": [
    "Faro (Sé e São Pedro)", "Montenegro", "Santa Bárbara de Nexe", "Conceição e Estoi"
  ],
  "setubal": [
    "Setúbal (São Julião, Nossa Senhora da Anunciada e Santa Maria da Graça)",
    "Azeitão (São Lourenço e São Simão)", "Sado"
  ],
  "braga": [
    "Braga (Maximinos, Sé e Cividade)", "São Victor", "Nogueiró e Tenões", "Gualtar", "Real, Dume e Semelhe"
  ],
  "coimbra": [
    "Coimbra (Sé Nova, Santa Cruz, Almedina e São Bartolomeu)", "Santo António dos Olivais", "Eiras e São Paulo de Frades"
  ],
  "matosinhos": [
    "Matosinhos e Leça da Palmeira", "Senhora da Hora e São Mamede de Infesta", "Custóias, Leça do Balio e Guifões"
  ],
  "gaia": [
    "Mafamude e Vilar do Paraíso", "Santa Marinha e São Pedro da Afurada", "Canidelo", "Madalena", "Gulpilhares e Valadares"
  ]
};

function getParishesForLocation(locationStr) {
  if (!locationStr) return PARISH_DATABASE["lisboa"];
  
  const norm = locationStr.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  for (const [key, parishes] of Object.entries(PARISH_DATABASE)) {
    if (norm.includes(key) || key.includes(norm)) {
      return parishes;
    }
  }

  const cleanLoc = locationStr.trim().replace(/^\w/, c => c.toUpperCase());
  return [
    `Centro, ${cleanLoc}`,
    `Zona Histórica, ${cleanLoc}`,
    `Freguesia Central, ${cleanLoc}`,
    `Zona Norte, ${cleanLoc}`,
    `Zona Sul, ${cleanLoc}`
  ];
}

module.exports = {
  PARISH_DATABASE,
  getParishesForLocation
};
