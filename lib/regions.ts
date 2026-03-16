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

export const STAEDTE: Region[] = [
  { name: 'Zürich (Stadt)',        type: 'stadt', stimm: 310000, kanton: 'Zürich' },
  { name: 'Genf (Stadt)',          type: 'stadt', stimm: 152000, kanton: 'Genf' },
  { name: 'Basel (Stadt)',         type: 'stadt', stimm: 128000, kanton: 'Basel-Stadt' },
  { name: 'Bern (Stadt)',          type: 'stadt', stimm: 112000, kanton: 'Bern' },
  { name: 'Lausanne',              type: 'stadt', stimm: 94000,  kanton: 'Waadt' },
  { name: 'Winterthur',            type: 'stadt', stimm: 85000,  kanton: 'Zürich' },
  { name: 'Luzern (Stadt)',        type: 'stadt', stimm: 65000,  kanton: 'Luzern' },
  { name: 'St. Gallen (Stadt)',    type: 'stadt', stimm: 56000,  kanton: 'St. Gallen' },
  { name: 'Lugano',                type: 'stadt', stimm: 48000,  kanton: 'Tessin' },
  { name: 'Biel/Bienne',           type: 'stadt', stimm: 45000,  kanton: 'Bern' },
  { name: 'Thun',                  type: 'stadt', stimm: 38000,  kanton: 'Bern' },
  { name: 'Köniz',                 type: 'stadt', stimm: 31000,  kanton: 'Bern' },
  { name: 'La Chaux-de-Fonds',     type: 'stadt', stimm: 30000,  kanton: 'Neuenburg' },
  { name: 'Schaffhausen (Stadt)',  type: 'stadt', stimm: 28000,  kanton: 'Schaffhausen' },
  { name: 'Fribourg (Stadt)',      type: 'stadt', stimm: 25000,  kanton: 'Freiburg' },
  { name: 'Chur',                  type: 'stadt', stimm: 23000,  kanton: 'Graubünden' },
  { name: 'Vernier',               type: 'stadt', stimm: 22000,  kanton: 'Genf' },
  { name: 'Uster',                 type: 'stadt', stimm: 21000,  kanton: 'Zürich' },
  { name: 'Sion',                  type: 'stadt', stimm: 20000,  kanton: 'Wallis' },
  { name: 'Emmen',                 type: 'stadt', stimm: 19000,  kanton: 'Luzern' },
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
