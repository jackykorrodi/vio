export type RegionType = 'schweiz' | 'kanton' | 'stadt';

export interface Region {
  name: string;
  type: RegionType;
  kanton: string;
  pop: number;
  stimm: number;
}

export const SCHWEIZ: Region[] = [
  { name: 'Gesamte Schweiz', type: 'schweiz', kanton: 'CH', pop: 9051000, stimm: 5600000 },
];

export const KANTONE: Region[] = [
  // Quelle: BFS Bevölkerungsstatistik per 31.12.2024
  // Stimmberechtigte: kantonsspezifische Quoten (Ausländeranteil-gewichtet)
  // Letzte Aktualisierung: 22.04.2026
  { name: 'Zürich', type: 'kanton', kanton: 'ZH', pop: 1620000, stimm: 1015000 },
  { name: 'Bern', type: 'kanton', kanton: 'BE', pop: 1071000, stimm: 775000 },
  { name: 'Waadt', type: 'kanton', kanton: 'VD', pop: 855000, stimm: 510000 },
  { name: 'Aargau', type: 'kanton', kanton: 'AG', pop: 735000, stimm: 470000 },
  { name: 'St. Gallen', type: 'kanton', kanton: 'SG', pop: 526000, stimm: 365000 },
  { name: 'Genf', type: 'kanton', kanton: 'GE', pop: 526000, stimm: 285000 },
  { name: 'Luzern', type: 'kanton', kanton: 'LU', pop: 432000, stimm: 305000 },
  { name: 'Tessin', type: 'kanton', kanton: 'TI', pop: 357000, stimm: 235000 },
  { name: 'Wallis', type: 'kanton', kanton: 'VS', pop: 360000, stimm: 240000 },
  { name: 'Freiburg', type: 'kanton', kanton: 'FR', pop: 341000, stimm: 220000 },
  { name: 'Basel-Landschaft', type: 'kanton', kanton: 'BL', pop: 300000, stimm: 200000 },
  { name: 'Solothurn', type: 'kanton', kanton: 'SO', pop: 288000, stimm: 195000 },
  { name: 'Thurgau', type: 'kanton', kanton: 'TG', pop: 296000, stimm: 195000 },
  { name: 'Graubünden', type: 'kanton', kanton: 'GR', pop: 206000, stimm: 140000 },
  { name: 'Neuenburg', type: 'kanton', kanton: 'NE', pop: 178000, stimm: 115000 },
  { name: 'Basel-Stadt', type: 'kanton', kanton: 'BS', pop: 196000, stimm: 115000 },
  { name: 'Schwyz', type: 'kanton', kanton: 'SZ', pop: 169000, stimm: 110000 },
  { name: 'Zug', type: 'kanton', kanton: 'ZG', pop: 133000, stimm: 85000 },
  { name: 'Schaffhausen', type: 'kanton', kanton: 'SH', pop: 85000, stimm: 55000 },
  { name: 'Jura', type: 'kanton', kanton: 'JU', pop: 74000, stimm: 50000 },
  { name: 'Appenzell Ausserrhoden', type: 'kanton', kanton: 'AR', pop: 57000, stimm: 38000 },
  { name: 'Nidwalden', type: 'kanton', kanton: 'NW', pop: 44000, stimm: 31000 },
  { name: 'Glarus', type: 'kanton', kanton: 'GL', pop: 41000, stimm: 27000 },
  { name: 'Obwalden', type: 'kanton', kanton: 'OW', pop: 40000, stimm: 27000 },
  { name: 'Uri', type: 'kanton', kanton: 'UR', pop: 37000, stimm: 26000 },
  { name: 'Appenzell Innerrhoden', type: 'kanton', kanton: 'AI', pop: 17000, stimm: 12000 },
];

// Quelle: BFS + dooh-screens.json
// Buchbarkeit: stimm >= 10'000 ODER politScreens >= 20
// 16 Gemeinden am 22.04.2026 entfernt (zu klein UND zu wenig Screens).
// Klassifikation (Voll/Begrenzt/Display-dom) erfolgt runtime in lib/region-buchbarkeit.ts
// Letzte Aktualisierung: 22.04.2026
export const STAEDTE: Region[] = [
  { name: 'Zürich', type: 'stadt', kanton: 'ZH', pop: 443300, stimm: 310000 },
  { name: 'Genf', type: 'stadt', kanton: 'GE', pop: 207350, stimm: 145000 },
  { name: 'Basel', type: 'stadt', kanton: 'BS', pop: 178750, stimm: 125000 },
  { name: 'Lausanne', type: 'stadt', kanton: 'VD', pop: 150150, stimm: 105000 },
  { name: 'Bern', type: 'stadt', kanton: 'BE', pop: 150150, stimm: 105000 },
  { name: 'Winterthur', type: 'stadt', kanton: 'ZH', pop: 117260, stimm: 82000 },
  { name: 'Luzern', type: 'stadt', kanton: 'LU', pop: 82940, stimm: 58000 },
  { name: 'St. Gallen', type: 'stadt', kanton: 'SG', pop: 81510, stimm: 57000 },
  { name: 'Lugano', type: 'stadt', kanton: 'TI', pop: 64350, stimm: 45000 },
  { name: 'Biel/Bienne', type: 'stadt', kanton: 'BE', pop: 55770, stimm: 39000 },
  { name: 'Bellinzona', type: 'stadt', kanton: 'TI', pop: 44330, stimm: 31000 },
  { name: 'Thun', type: 'stadt', kanton: 'BE', pop: 44330, stimm: 31000 },
  { name: 'Köniz', type: 'stadt', kanton: 'BE', pop: 42900, stimm: 30000 },
  { name: 'Fribourg/Freiburg', type: 'stadt', kanton: 'FR', pop: 40040, stimm: 28000 },
  { name: 'La Chaux-de-Fonds', type: 'stadt', kanton: 'NE', pop: 38610, stimm: 27000 },
  { name: 'Chur', type: 'stadt', kanton: 'GR', pop: 37180, stimm: 26000 },
  { name: 'Schaffhausen', type: 'stadt', kanton: 'SH', pop: 37180, stimm: 26000 },
  { name: 'Sion', type: 'stadt', kanton: 'VS', pop: 35750, stimm: 25000 },
  { name: 'Vernier', type: 'stadt', kanton: 'GE', pop: 35750, stimm: 25000 },
  { name: 'Uster', type: 'stadt', kanton: 'ZH', pop: 35750, stimm: 25000 },
  { name: 'Neuenburg', type: 'stadt', kanton: 'NE', pop: 34320, stimm: 24000 },
  { name: 'Lancy', type: 'stadt', kanton: 'GE', pop: 32890, stimm: 23000 },
  { name: 'Emmen', type: 'stadt', kanton: 'LU', pop: 31460, stimm: 22000 },
  { name: 'Zug', type: 'stadt', kanton: 'ZG', pop: 31460, stimm: 22000 },
  { name: 'Yverdon-les-Bains', type: 'stadt', kanton: 'VD', pop: 30030, stimm: 21000 },
  { name: 'Dübendorf', type: 'stadt', kanton: 'ZH', pop: 30030, stimm: 21000 },
  { name: 'Kriens', type: 'stadt', kanton: 'LU', pop: 28600, stimm: 20000 },
  { name: 'Dietikon', type: 'stadt', kanton: 'ZH', pop: 28600, stimm: 20000 },
  { name: 'Montreux', type: 'stadt', kanton: 'VD', pop: 27170, stimm: 19000 },
  { name: 'Frauenfeld', type: 'stadt', kanton: 'TG', pop: 25740, stimm: 18000 },
  { name: 'Wetzikon', type: 'stadt', kanton: 'ZH', pop: 25740, stimm: 18000 },
  { name: 'Meyrin', type: 'stadt', kanton: 'GE', pop: 25740, stimm: 18000 },
  { name: 'Wil', type: 'stadt', kanton: 'SG', pop: 25740, stimm: 18000 },
  { name: 'Baar', type: 'stadt', kanton: 'ZG', pop: 24310, stimm: 17000 },
  { name: 'Bulle', type: 'stadt', kanton: 'FR', pop: 24310, stimm: 17000 },
  { name: 'Renens', type: 'stadt', kanton: 'VD', pop: 22880, stimm: 16000 },
  { name: 'Carouge', type: 'stadt', kanton: 'GE', pop: 22880, stimm: 16000 },
  { name: 'Aarau', type: 'stadt', kanton: 'AG', pop: 22165, stimm: 15500 },
  { name: 'Riehen', type: 'stadt', kanton: 'BS', pop: 21450, stimm: 15000 },
  { name: 'Nyon', type: 'stadt', kanton: 'VD', pop: 21450, stimm: 15000 },
  { name: 'Allschwil', type: 'stadt', kanton: 'BL', pop: 21450, stimm: 15000 },
  { name: 'Kreuzlingen', type: 'stadt', kanton: 'TG', pop: 21450, stimm: 15000 },
  { name: 'Horgen', type: 'stadt', kanton: 'ZH', pop: 21450, stimm: 15000 },
  { name: 'Wettingen', type: 'stadt', kanton: 'AG', pop: 21450, stimm: 15000 },
  { name: 'Kloten', type: 'stadt', kanton: 'ZH', pop: 20020, stimm: 14000 },
  { name: 'Vevey', type: 'stadt', kanton: 'VD', pop: 20020, stimm: 14000 },
  { name: 'Schlieren', type: 'stadt', kanton: 'ZH', pop: 20020, stimm: 14000 },
  { name: 'Baden', type: 'stadt', kanton: 'AG', pop: 20020, stimm: 14000 },
  { name: 'Onex', type: 'stadt', kanton: 'GE', pop: 18590, stimm: 13000 },
  { name: 'Regensdorf', type: 'stadt', kanton: 'ZH', pop: 18590, stimm: 13000 },
  { name: 'Adliswil', type: 'stadt', kanton: 'ZH', pop: 18590, stimm: 13000 },
  { name: 'Volketswil', type: 'stadt', kanton: 'ZH', pop: 18590, stimm: 13000 },
  { name: 'Pully', type: 'stadt', kanton: 'VD', pop: 18590, stimm: 13000 },
  { name: 'Monthey', type: 'stadt', kanton: 'VS', pop: 18590, stimm: 13000 },
  { name: 'Olten', type: 'stadt', kanton: 'SO', pop: 18590, stimm: 13000 },
  { name: 'Gossau', type: 'stadt', kanton: 'SG', pop: 18590, stimm: 13000 },
  { name: 'Thalwil', type: 'stadt', kanton: 'ZH', pop: 18590, stimm: 13000 },
  { name: 'Reinach', type: 'stadt', kanton: 'BL', pop: 18590, stimm: 13000 },
  { name: 'Illnau-Effretikon', type: 'stadt', kanton: 'ZH', pop: 18590, stimm: 13000 },
  { name: 'Ostermundigen', type: 'stadt', kanton: 'BE', pop: 18590, stimm: 13000 },
  { name: 'Muttenz', type: 'stadt', kanton: 'BL', pop: 18590, stimm: 13000 },
  { name: 'Grenchen', type: 'stadt', kanton: 'SO', pop: 17875, stimm: 12500 },
  { name: 'Steffisburg', type: 'stadt', kanton: 'BE', pop: 17160, stimm: 12000 },
  { name: 'Locarno', type: 'stadt', kanton: 'TI', pop: 17160, stimm: 12000 },
  { name: 'Morges', type: 'stadt', kanton: 'VD', pop: 17160, stimm: 12000 },
  { name: 'Pratteln', type: 'stadt', kanton: 'BL', pop: 17160, stimm: 12000 },
  { name: 'Solothurn', type: 'stadt', kanton: 'SO', pop: 17160, stimm: 12000 },
  { name: 'Burgdorf', type: 'stadt', kanton: 'BE', pop: 17160, stimm: 12000 },
  { name: 'Wallisellen', type: 'stadt', kanton: 'ZH', pop: 17160, stimm: 12000 },
  { name: 'Freienbach', type: 'stadt', kanton: 'SZ', pop: 17160, stimm: 12000 },
  { name: 'Wohlen', type: 'stadt', kanton: 'AG', pop: 17160, stimm: 12000 },
  { name: 'Herisau', type: 'stadt', kanton: 'AR', pop: 15730, stimm: 11000 },
  { name: 'Arbon', type: 'stadt', kanton: 'TG', pop: 15730, stimm: 11000 },
  { name: 'Langenthal', type: 'stadt', kanton: 'BE', pop: 15730, stimm: 11000 },
  { name: 'Mendrisio', type: 'stadt', kanton: 'TI', pop: 15730, stimm: 11000 },
  { name: 'Einsiedeln', type: 'stadt', kanton: 'SZ', pop: 15730, stimm: 11000 },
  { name: 'Lyss', type: 'stadt', kanton: 'BE', pop: 15730, stimm: 11000 },
  { name: 'Meilen', type: 'stadt', kanton: 'ZH', pop: 15730, stimm: 11000 },
  { name: 'Binningen', type: 'stadt', kanton: 'BL', pop: 15730, stimm: 11000 },
  { name: 'Thônex', type: 'stadt', kanton: 'GE', pop: 15015, stimm: 10500 },
  { name: 'Amriswil', type: 'stadt', kanton: 'TG', pop: 14300, stimm: 10000 },
  { name: 'Liestal', type: 'stadt', kanton: 'BL', pop: 14300, stimm: 10000 },
  { name: 'Richterswil', type: 'stadt', kanton: 'ZH', pop: 14300, stimm: 10000 },
  { name: 'Rheinfelden', type: 'stadt', kanton: 'AG', pop: 14300, stimm: 10000 },
  { name: 'Horw', type: 'stadt', kanton: 'LU', pop: 14300, stimm: 10000 },
  { name: 'Ebikon', type: 'stadt', kanton: 'LU', pop: 14300, stimm: 10000 },
  { name: 'Uzwil', type: 'stadt', kanton: 'SG', pop: 13585, stimm: 9500 },
  { name: 'Spreitenbach', type: 'stadt', kanton: 'AG', pop: 12870, stimm: 9000 },
  { name: 'Altstätten', type: 'stadt', kanton: 'SG', pop: 12870, stimm: 9000 },
  { name: 'Rapperswil-Jona', type: 'stadt', kanton: 'SG', pop: 28600, stimm: 20000 },
  { name: 'Wädenswil', type: 'stadt', kanton: 'ZH', pop: 22880, stimm: 16000 },
  { name: 'Bülach', type: 'stadt', kanton: 'ZH', pop: 21450, stimm: 15000 },
  { name: 'Sierre', type: 'stadt', kanton: 'VS', pop: 17160, stimm: 12000 },
  { name: 'Stäfa', type: 'stadt', kanton: 'ZH', pop: 15730, stimm: 11000 },
  { name: 'Oftringen', type: 'stadt', kanton: 'AG', pop: 14300, stimm: 10000 },
  { name: 'Brig-Glis', type: 'stadt', kanton: 'VS', pop: 13585, stimm: 9500 },
  { name: 'Muri bei Bern', type: 'stadt', kanton: 'BE', pop: 13585, stimm: 9500 },
  { name: 'Münchenstein', type: 'stadt', kanton: 'BL', pop: 12870, stimm: 9000 },
  { name: 'Le Grand-Saconnex', type: 'stadt', kanton: 'GE', pop: 12870, stimm: 9000 },
  { name: 'Spiez', type: 'stadt', kanton: 'BE', pop: 12870, stimm: 9000 },
  { name: 'Worb', type: 'stadt', kanton: 'BE', pop: 12155, stimm: 8500 },
  { name: 'Zofingen', type: 'stadt', kanton: 'AG', pop: 12155, stimm: 8500 },
  { name: 'Sursee', type: 'stadt', kanton: 'LU', pop: 10725, stimm: 7500 },
];

export const ALL_REGIONS: Region[] = [...SCHWEIZ, ...KANTONE, ...STAEDTE];

export function resolveToKanton(name: string): string | null {
  const r = ALL_REGIONS.find(x => x.name === name);
  if (!r) return null;
  if (r.type === 'schweiz') return null;
  if (r.type === 'kanton') return r.name;
  return KANTONE.find(k => k.kanton === r.kanton)?.name ?? null;
}
