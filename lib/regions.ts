export type RegionType = 'schweiz' | 'kanton' | 'stadt';

export interface Region {
  name: string;
  type: RegionType;
  stimm: number;
  kanton?: string; // parent canton for Städte/Gemeinden
}

export const SCHWEIZ: Region[] = [
  { name: 'Gesamte Schweiz', type: 'schweiz', stimm: 5571000 },
];

export const KANTONE: Region[] = [
  { name: 'Zürich',            type: 'kanton', stimm: 1077300 },
  { name: 'Bern',              type: 'kanton', stimm: 735000 },
  { name: 'Luzern',            type: 'kanton', stimm: 299600 },
  { name: 'Uri',               type: 'kanton', stimm: 25900 },
  { name: 'Schwyz',            type: 'kanton', stimm: 116200 },
  { name: 'Obwalden',          type: 'kanton', stimm: 27300 },
  { name: 'Nidwalden',         type: 'kanton', stimm: 30800 },
  { name: 'Glarus',            type: 'kanton', stimm: 28700 },
  { name: 'Zug',               type: 'kanton', stimm: 91700 },
  { name: 'Freiburg',          type: 'kanton', stimm: 235900 },
  { name: 'Solothurn',         type: 'kanton', stimm: 198100 },
  { name: 'Basel-Stadt',       type: 'kanton', stimm: 128100 },
  { name: 'Basel-Landschaft',  type: 'kanton', stimm: 199400 },
  { name: 'Schaffhausen',      type: 'kanton', stimm: 57200 },
  { name: 'Appenzell A.Rh.',   type: 'kanton', stimm: 40800 },
  { name: 'Appenzell I.Rh.',   type: 'kanton', stimm: 11500 },
  { name: 'St. Gallen',        type: 'kanton', stimm: 340900 },
  { name: 'Graubünden',        type: 'kanton', stimm: 138900 },
  { name: 'Aargau',            type: 'kanton', stimm: 453400 },
  { name: 'Thurgau',           type: 'kanton', stimm: 185700 },
  { name: 'Tessin',            type: 'kanton', stimm: 249600 },
  { name: 'Waadt',             type: 'kanton', stimm: 516900 },
  { name: 'Wallis',            type: 'kanton', stimm: 215200 },
  { name: 'Neuenburg',         type: 'kanton', stimm: 119800 },
  { name: 'Genf',              type: 'kanton', stimm: 330000 },
  { name: 'Jura',              type: 'kanton', stimm: 52800 },
];

// 124 Gemeinden / Städte
export const STAEDTE: Region[] = [
  // ── Zürich ────────────────────────────────────────────────────────────
  { name: 'Zürich (Stadt)',        type: 'stadt', stimm: 310000, kanton: 'Zürich' },
  { name: 'Winterthur',            type: 'stadt', stimm: 85000,  kanton: 'Zürich' },
  { name: 'Uster',                 type: 'stadt', stimm: 21000,  kanton: 'Zürich' },
  { name: 'Dübendorf',             type: 'stadt', stimm: 19000,  kanton: 'Zürich' },
  { name: 'Dietikon',              type: 'stadt', stimm: 18000,  kanton: 'Zürich' },
  { name: 'Wädenswil',             type: 'stadt', stimm: 16000,  kanton: 'Zürich' },
  { name: 'Kloten',                type: 'stadt', stimm: 15000,  kanton: 'Zürich' },
  { name: 'Horgen',                type: 'stadt', stimm: 15000,  kanton: 'Zürich' },
  { name: 'Bülach',                type: 'stadt', stimm: 14000,  kanton: 'Zürich' },
  { name: 'Opfikon',               type: 'stadt', stimm: 14000,  kanton: 'Zürich' },
  { name: 'Regensdorf',            type: 'stadt', stimm: 14000,  kanton: 'Zürich' },
  { name: 'Illnau-Effretikon',     type: 'stadt', stimm: 11500,  kanton: 'Zürich' },
  { name: 'Adliswil',              type: 'stadt', stimm: 12500,  kanton: 'Zürich' },
  { name: 'Schlieren',             type: 'stadt', stimm: 12500,  kanton: 'Zürich' },
  { name: 'Thalwil',               type: 'stadt', stimm: 11000,  kanton: 'Zürich' },
  { name: 'Zollikon',              type: 'stadt', stimm: 9800,   kanton: 'Zürich' },
  { name: 'Küsnacht (ZH)',         type: 'stadt', stimm: 9800,   kanton: 'Zürich' },
  { name: 'Rüti (ZH)',             type: 'stadt', stimm: 8700,   kanton: 'Zürich' },
  { name: 'Männedorf',             type: 'stadt', stimm: 8100,   kanton: 'Zürich' },
  // ── Bern ──────────────────────────────────────────────────────────────
  { name: 'Bern (Stadt)',          type: 'stadt', stimm: 112000, kanton: 'Bern' },
  { name: 'Biel/Bienne',           type: 'stadt', stimm: 45000,  kanton: 'Bern' },
  { name: 'Thun',                  type: 'stadt', stimm: 38000,  kanton: 'Bern' },
  { name: 'Köniz',                 type: 'stadt', stimm: 31000,  kanton: 'Bern' },
  { name: 'Ostermundigen',         type: 'stadt', stimm: 11000,  kanton: 'Bern' },
  { name: 'Steffisburg',           type: 'stadt', stimm: 11000,  kanton: 'Bern' },
  { name: 'Burgdorf',              type: 'stadt', stimm: 10500,  kanton: 'Bern' },
  { name: 'Muri bei Bern',         type: 'stadt', stimm: 9200,   kanton: 'Bern' },
  { name: 'Lyss',                  type: 'stadt', stimm: 9200,   kanton: 'Bern' },
  { name: 'Münsingen',             type: 'stadt', stimm: 8700,   kanton: 'Bern' },
  { name: 'Ittigen',               type: 'stadt', stimm: 8000,   kanton: 'Bern' },
  { name: 'Langenthal',            type: 'stadt', stimm: 8000,   kanton: 'Bern' },
  { name: 'Spiez',                 type: 'stadt', stimm: 7800,   kanton: 'Bern' },
  { name: 'Zollikofen',            type: 'stadt', stimm: 6800,   kanton: 'Bern' },
  // ── Luzern ────────────────────────────────────────────────────────────
  { name: 'Luzern (Stadt)',        type: 'stadt', stimm: 65000,  kanton: 'Luzern' },
  { name: 'Emmen',                 type: 'stadt', stimm: 19000,  kanton: 'Luzern' },
  { name: 'Kriens',                type: 'stadt', stimm: 17500,  kanton: 'Luzern' },
  { name: 'Horw',                  type: 'stadt', stimm: 9200,   kanton: 'Luzern' },
  { name: 'Ebikon',                type: 'stadt', stimm: 8500,   kanton: 'Luzern' },
  { name: 'Sursee',                type: 'stadt', stimm: 6700,   kanton: 'Luzern' },
  { name: 'Willisau',              type: 'stadt', stimm: 5500,   kanton: 'Luzern' },
  // ── Uri ───────────────────────────────────────────────────────────────
  { name: 'Altdorf',               type: 'stadt', stimm: 6200,   kanton: 'Uri' },
  // ── Schwyz ────────────────────────────────────────────────────────────
  { name: 'Freienbach',            type: 'stadt', stimm: 11800,  kanton: 'Schwyz' },
  { name: 'Schwyz (Hauptort)',     type: 'stadt', stimm: 9800,   kanton: 'Schwyz' },
  // ── Obwalden ──────────────────────────────────────────────────────────
  { name: 'Sarnen',                type: 'stadt', stimm: 6800,   kanton: 'Obwalden' },
  // ── Nidwalden ─────────────────────────────────────────────────────────
  { name: 'Stans',                 type: 'stadt', stimm: 5500,   kanton: 'Nidwalden' },
  // ── Glarus ────────────────────────────────────────────────────────────
  { name: 'Glarus (Hauptort)',     type: 'stadt', stimm: 8500,   kanton: 'Glarus' },
  // ── Zug ───────────────────────────────────────────────────────────────
  { name: 'Zug (Stadt)',           type: 'stadt', stimm: 19500,  kanton: 'Zug' },
  { name: 'Baar',                  type: 'stadt', stimm: 16200,  kanton: 'Zug' },
  { name: 'Cham',                  type: 'stadt', stimm: 10400,  kanton: 'Zug' },
  // ── Freiburg ──────────────────────────────────────────────────────────
  { name: 'Fribourg (Stadt)',      type: 'stadt', stimm: 25000,  kanton: 'Freiburg' },
  { name: 'Bulle',                 type: 'stadt', stimm: 15600,  kanton: 'Freiburg' },
  { name: 'Villars-sur-Glâne',     type: 'stadt', stimm: 9100,   kanton: 'Freiburg' },
  // ── Solothurn ─────────────────────────────────────────────────────────
  { name: 'Olten',                 type: 'stadt', stimm: 12000,  kanton: 'Solothurn' },
  { name: 'Solothurn (Stadt)',     type: 'stadt', stimm: 11000,  kanton: 'Solothurn' },
  { name: 'Grenchen',              type: 'stadt', stimm: 10500,  kanton: 'Solothurn' },
  // ── Basel-Stadt ───────────────────────────────────────────────────────
  { name: 'Basel (Stadt)',         type: 'stadt', stimm: 128000, kanton: 'Basel-Stadt' },
  { name: 'Riehen',                type: 'stadt', stimm: 14300,  kanton: 'Basel-Stadt' },
  // ── Basel-Landschaft ──────────────────────────────────────────────────
  { name: 'Allschwil',             type: 'stadt', stimm: 13600,  kanton: 'Basel-Landschaft' },
  { name: 'Reinach (BL)',          type: 'stadt', stimm: 13000,  kanton: 'Basel-Landschaft' },
  { name: 'Muttenz',               type: 'stadt', stimm: 11700,  kanton: 'Basel-Landschaft' },
  { name: 'Liestal',               type: 'stadt', stimm: 8500,   kanton: 'Basel-Landschaft' },
  { name: 'Birsfelden',            type: 'stadt', stimm: 6500,   kanton: 'Basel-Landschaft' },
  // ── Schaffhausen ──────────────────────────────────────────────────────
  { name: 'Schaffhausen (Stadt)',  type: 'stadt', stimm: 28000,  kanton: 'Schaffhausen' },
  { name: 'Neuhausen am Rheinfall',type: 'stadt', stimm: 7800,   kanton: 'Schaffhausen' },
  // ── Appenzell Ausserrhoden ────────────────────────────────────────────
  { name: 'Herisau',               type: 'stadt', stimm: 10400,  kanton: 'Appenzell A.Rh.' },
  // ── Appenzell Innerrhoden ─────────────────────────────────────────────
  { name: 'Appenzell (Hauptort)',  type: 'stadt', stimm: 3900,   kanton: 'Appenzell I.Rh.' },
  // ── St. Gallen ────────────────────────────────────────────────────────
  { name: 'St. Gallen (Stadt)',    type: 'stadt', stimm: 56000,  kanton: 'St. Gallen' },
  { name: 'Rapperswil-Jona',       type: 'stadt', stimm: 18400,  kanton: 'St. Gallen' },
  { name: 'Wil (SG)',              type: 'stadt', stimm: 16000,  kanton: 'St. Gallen' },
  { name: 'Gossau (SG)',           type: 'stadt', stimm: 11700,  kanton: 'St. Gallen' },
  { name: 'Arbon',                 type: 'stadt', stimm: 9800,   kanton: 'St. Gallen' },
  { name: 'Buchs (SG)',            type: 'stadt', stimm: 7200,   kanton: 'St. Gallen' },
  { name: 'Rorschach',             type: 'stadt', stimm: 6500,   kanton: 'St. Gallen' },
  // ── Graubünden ────────────────────────────────────────────────────────
  { name: 'Chur',                  type: 'stadt', stimm: 23000,  kanton: 'Graubünden' },
  { name: 'Davos',                 type: 'stadt', stimm: 7000,   kanton: 'Graubünden' },
  { name: 'Landquart',             type: 'stadt', stimm: 5200,   kanton: 'Graubünden' },
  // ── Aargau ────────────────────────────────────────────────────────────
  { name: 'Aarau',                 type: 'stadt', stimm: 14000,  kanton: 'Aargau' },
  { name: 'Wettingen',             type: 'stadt', stimm: 14200,  kanton: 'Aargau' },
  { name: 'Baden',                 type: 'stadt', stimm: 12350,  kanton: 'Aargau' },
  { name: 'Wohlen',                type: 'stadt', stimm: 11700,  kanton: 'Aargau' },
  { name: 'Spreitenbach',          type: 'stadt', stimm: 9800,   kanton: 'Aargau' },
  { name: 'Oftringen',             type: 'stadt', stimm: 9800,   kanton: 'Aargau' },
  { name: 'Suhr',                  type: 'stadt', stimm: 10000,  kanton: 'Aargau' },
  { name: 'Rheinfelden',           type: 'stadt', stimm: 9100,   kanton: 'Aargau' },
  { name: 'Zofingen',              type: 'stadt', stimm: 7800,   kanton: 'Aargau' },
  { name: 'Brugg',                 type: 'stadt', stimm: 7800,   kanton: 'Aargau' },
  { name: 'Lenzburg',              type: 'stadt', stimm: 7000,   kanton: 'Aargau' },
  // ── Thurgau ───────────────────────────────────────────────────────────
  { name: 'Frauenfeld',            type: 'stadt', stimm: 17600,  kanton: 'Thurgau' },
  { name: 'Kreuzlingen',           type: 'stadt', stimm: 14300,  kanton: 'Thurgau' },
  { name: 'Amriswil',              type: 'stadt', stimm: 10400,  kanton: 'Thurgau' },
  { name: 'Weinfelden',            type: 'stadt', stimm: 7200,   kanton: 'Thurgau' },
  // ── Tessin ────────────────────────────────────────────────────────────
  { name: 'Lugano',                type: 'stadt', stimm: 48000,  kanton: 'Tessin' },
  { name: 'Bellinzona',            type: 'stadt', stimm: 18200,  kanton: 'Tessin' },
  { name: 'Locarno',               type: 'stadt', stimm: 10400,  kanton: 'Tessin' },
  { name: 'Mendrisio',             type: 'stadt', stimm: 9800,   kanton: 'Tessin' },
  { name: 'Chiasso',               type: 'stadt', stimm: 5900,   kanton: 'Tessin' },
  // ── Waadt ─────────────────────────────────────────────────────────────
  { name: 'Lausanne',              type: 'stadt', stimm: 94000,  kanton: 'Waadt' },
  { name: 'Yverdon-les-Bains',     type: 'stadt', stimm: 20300,  kanton: 'Waadt' },
  { name: 'Renens',                type: 'stadt', stimm: 14600,  kanton: 'Waadt' },
  { name: 'Nyon',                  type: 'stadt', stimm: 15000,  kanton: 'Waadt' },
  { name: 'Montreux',              type: 'stadt', stimm: 17000,  kanton: 'Waadt' },
  { name: 'Vevey',                 type: 'stadt', stimm: 13000,  kanton: 'Waadt' },
  { name: 'Pully',                 type: 'stadt', stimm: 12000,  kanton: 'Waadt' },
  { name: 'Gland',                 type: 'stadt', stimm: 12500,  kanton: 'Waadt' },
  { name: 'Morges',                type: 'stadt', stimm: 10500,  kanton: 'Waadt' },
  { name: 'Bussigny',              type: 'stadt', stimm: 8500,   kanton: 'Waadt' },
  { name: 'Prilly',                type: 'stadt', stimm: 8000,   kanton: 'Waadt' },
  // ── Wallis ────────────────────────────────────────────────────────────
  { name: 'Sion',                  type: 'stadt', stimm: 20000,  kanton: 'Wallis' },
  { name: 'Martigny',              type: 'stadt', stimm: 14400,  kanton: 'Wallis' },
  { name: 'Monthey',               type: 'stadt', stimm: 11700,  kanton: 'Wallis' },
  { name: 'Brig-Glis',             type: 'stadt', stimm: 8500,   kanton: 'Wallis' },
  // ── Neuenburg ─────────────────────────────────────────────────────────
  { name: 'Neuchâtel',             type: 'stadt', stimm: 28000,  kanton: 'Neuenburg' },
  { name: 'La Chaux-de-Fonds',     type: 'stadt', stimm: 30000,  kanton: 'Neuenburg' },
  { name: 'Le Locle',              type: 'stadt', stimm: 7200,   kanton: 'Neuenburg' },
  // ── Genf ──────────────────────────────────────────────────────────────
  { name: 'Genf (Stadt)',          type: 'stadt', stimm: 152000, kanton: 'Genf' },
  { name: 'Vernier',               type: 'stadt', stimm: 22000,  kanton: 'Genf' },
  { name: 'Lancy',                 type: 'stadt', stimm: 21500,  kanton: 'Genf' },
  { name: 'Meyrin',                type: 'stadt', stimm: 16000,  kanton: 'Genf' },
  { name: 'Carouge',               type: 'stadt', stimm: 14300,  kanton: 'Genf' },
  { name: 'Versoix',               type: 'stadt', stimm: 13000,  kanton: 'Genf' },
  { name: 'Onex',                  type: 'stadt', stimm: 13000,  kanton: 'Genf' },
  { name: 'Thônex',                type: 'stadt', stimm: 9100,   kanton: 'Genf' },
  // ── Jura ──────────────────────────────────────────────────────────────
  { name: 'Delémont',              type: 'stadt', stimm: 8500,   kanton: 'Jura' },
  { name: 'Porrentruy',            type: 'stadt', stimm: 4900,   kanton: 'Jura' },
];

export const ALL_REGIONS: Region[] = [...SCHWEIZ, ...KANTONE, ...STAEDTE];

/**
 * Resolve a region name (Stadt or Kanton) to its canton name for map highlighting.
 * Returns null for "Gesamte Schweiz" (handled via highlightAll).
 */
export function resolveToKanton(regionName: string): string | null {
  const r = ALL_REGIONS.find(x => x.name === regionName);
  if (!r) return null;
  if (r.type === 'kanton') return r.name;
  if (r.type === 'schweiz') return null;
  return r.kanton ?? null;
}
