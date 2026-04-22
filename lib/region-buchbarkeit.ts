// Buchbarkeits- und Klassifikations-Logik für politische Kampagnen-Regionen
//
// Annahme: 70% aller DOOH-Screens sind für politische Werbung freigegeben.
// CH-weit empirisch zwischen 62% und 100%, 70% ist konservativer Schnitt.
// Fallback: Wenn screens_politik im JSON höher ist, vertrauen wir dem.
//
// Buchbarkeits-Regel (ODER):
//   stimm >= 10'000 ODER politScreens >= 20
//   UND NICHT in PERMANENTLY_EXCLUDED
//
// Drei Screen-Klassen mit automatischem Channel-Split:
//   Voll        (politScreens >= 30)  -> 70/30, kein Hinweis
//   Begrenzt    (politScreens 10-29)  -> 50/50, Hinweis
//   Display-dom (politScreens < 10)   -> 20/80, klarer Hinweis
//
// Kantone und "Gesamte Schweiz" sind immer Klasse Voll.

import doohScreens from './dooh-screens.json';
import type { Region } from './regions';

type DoohEntry = {
  type: 'schweiz' | 'kanton' | 'stadt';
  name?: string;
  kanton: string;
  screens: number;
  screens_politik: number;
  standorte: number;
  reach: number;
};

const DOOH_DATA = doohScreens as DoohEntry[];

export const MIN_STIMM = 10000;
export const MIN_SCREENS_QUALIFIER = 20;
export const FREIGABE_QUOTE = 0.7;

export const PERMANENTLY_EXCLUDED = new Set([
  'Küsnacht',
  'Martigny',
  'Opfikon',
  'Veyrier',
]);

export type ScreenKlasse = 'voll' | 'begrenzt' | 'display-dominant';

export interface ChannelSplit {
  dooh: number;
  display: number;
}

export interface KlassifikationsErgebnis {
  klasse: ScreenKlasse;
  politScreens: number;
  split: ChannelSplit;
  hinweis: string | null;
}

function findDoohEntry(region: Region): DoohEntry | undefined {
  if (region.type === 'schweiz') {
    return DOOH_DATA.find(d => d.type === 'schweiz');
  }
  if (region.type === 'kanton') {
    return DOOH_DATA.find(d => d.type === 'kanton' && d.kanton === region.kanton);
  }
  return DOOH_DATA.find(d => d.type === 'stadt' && d.name === region.name);
}

export function getPolitScreens(region: Region): number {
  const entry = findDoohEntry(region);
  if (!entry) return 0;
  const calculated = Math.floor(entry.screens * FREIGABE_QUOTE);
  return Math.max(calculated, entry.screens_politik);
}

export function isBuchbar(region: Region): boolean {
  if (PERMANENTLY_EXCLUDED.has(region.name)) return false;
  if (region.type !== 'stadt') return true;
  const politScreens = getPolitScreens(region);
  return region.stimm >= MIN_STIMM || politScreens >= MIN_SCREENS_QUALIFIER;
}

export function filterBuchbareRegionen(regions: Region[]): Region[] {
  return regions.filter(isBuchbar);
}

export function klassifiziereRegion(region: Region): KlassifikationsErgebnis {
  if (region.type !== 'stadt') {
    return {
      klasse: 'voll',
      politScreens: getPolitScreens(region),
      split: { dooh: 0.70, display: 0.30 },
      hinweis: null,
    };
  }
  const politScreens = getPolitScreens(region);
  if (politScreens >= 30) {
    return {
      klasse: 'voll',
      politScreens,
      split: { dooh: 0.70, display: 0.30 },
      hinweis: null,
    };
  }
  if (politScreens >= 10) {
    return {
      klasse: 'begrenzt',
      politScreens,
      split: { dooh: 0.50, display: 0.50 },
      hinweis: `In ${region.name} läuft deine Kampagne mit erhöhtem Online-Anteil — das ist für diese Gemeindegrösse normal.`,
    };
  }
  return {
    klasse: 'display-dominant',
    politScreens,
    split: { dooh: 0.20, display: 0.80 },
    hinweis: `In ${region.name} erreichen wir deine Zielgruppe primär online. Digitale Plakate sind lokal stark begrenzt.`,
  };
}

export function klassifiziereMehrereRegionen(regions: Region[]): KlassifikationsErgebnis {
  if (regions.length === 0) {
    return {
      klasse: 'voll',
      politScreens: 0,
      split: { dooh: 0.70, display: 0.30 },
      hinweis: null,
    };
  }
  if (regions.length === 1) {
    return klassifiziereRegion(regions[0]);
  }
  const total_stimm = regions.reduce((s, r) => s + r.stimm, 0);
  let weighted_dooh = 0;
  let weighted_display = 0;
  let total_polit = 0;
  const klassen: ScreenKlasse[] = [];
  for (const r of regions) {
    const k = klassifiziereRegion(r);
    const weight = total_stimm > 0 ? r.stimm / total_stimm : 1 / regions.length;
    weighted_dooh += k.split.dooh * weight;
    weighted_display += k.split.display * weight;
    total_polit += k.politScreens;
    klassen.push(k.klasse);
  }
  let klasse: ScreenKlasse = 'voll';
  if (klassen.includes('display-dominant')) klasse = 'display-dominant';
  else if (klassen.includes('begrenzt')) klasse = 'begrenzt';
  const hinweis = klasse === 'voll'
    ? null
    : klasse === 'begrenzt'
      ? 'In deiner Region-Auswahl ist DOOH-Inventar teilweise begrenzt — der Online-Anteil wird entsprechend erhöht.'
      : 'In Teilen deiner Region-Auswahl erreichen wir deine Zielgruppe primär online.';
  return {
    klasse,
    politScreens: total_polit,
    split: { dooh: weighted_dooh, display: weighted_display },
    hinweis,
  };
}

export const GEMEINDE_NICHT_GEFUNDEN_HINWEIS =
  'Deine Gemeinde ist nicht in der Liste? Das liegt am Verhältnis zwischen ' +
  'Einwohnerzahl und verfügbaren DOOH-Flächen vor Ort. Melde dich bei uns — ' +
  'wir finden eine Lösung, zum Beispiel über den Kanton oder eine benachbarte ' +
  'Gemeinde.';
