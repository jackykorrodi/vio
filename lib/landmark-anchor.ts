import type { Region } from './regions';

interface LandmarkEntry {
  inPhrase: string;   // grammatisch korrekte "in"-Form, z.B. "ins Letzigrund"
  multPhrase: string; // Nominativ/Akkusativ für Multiplikator-Satz, z.B. "das Letzigrund"
  cap: number;        // Sortierkapazität (Fussball-Konfig, wird nie angezeigt)
}

const GENERIC_TEXT =
  'So viele Menschen, wie in eine mittelgrosse Schweizer Veranstaltungshalle passen.';

export const LANDMARKS: Record<string, LandmarkEntry[]> = {
  ZH: [
    { inPhrase: 'ins Letzigrund',        multPhrase: 'das Letzigrund',        cap: 26000 },
    { inPhrase: 'in die Swiss Life Arena', multPhrase: 'die Swiss Life Arena', cap: 12000 },
    { inPhrase: 'ins Hallenstadion',     multPhrase: 'das Hallenstadion',     cap: 11000 },
    { inPhrase: 'in die Samsung Hall',   multPhrase: 'die Samsung Hall',      cap: 5000  }, // TODO bekannt genug?
  ],
  BE: [
    { inPhrase: 'in die PostFinance Arena', multPhrase: 'die PostFinance Arena', cap: 17000 },
  ],
  GE: [
    { inPhrase: 'ins Stade de Genève',   multPhrase: 'das Stade de Genève',   cap: 30000 },
    { inPhrase: 'in die Genfer Arena',   multPhrase: 'die Genfer Arena',      cap: 9500  }, // TODO bekannt genug?
  ],
  BS: [
    { inPhrase: 'in die St. Jakobshalle', multPhrase: 'die St. Jakobshalle',  cap: 12000 },
  ],
  LU: [
    { inPhrase: 'in die Swissporarena',  multPhrase: 'die Swissporarena',     cap: 17000 },
    { inPhrase: 'ins KKL Luzern',        multPhrase: 'das KKL Luzern',        cap: 1800  },
  ],
  SG: [
    { inPhrase: 'in den Kybunpark',      multPhrase: 'den Kybunpark',         cap: 17000 },
  ],
};

export function resolveLandmarkAnchor(
  reachLowerBound: number,
  regions: Region[],
): { generic: boolean; text: string } {
  const generic = { generic: true, text: GENERIC_TEXT };

  if (!regions.length) return generic;

  const dominant = regions.reduce((a, b) => (b.stimm > a.stimm ? b : a));

  if (dominant.type === 'schweiz') return generic;

  const uniqueKantone = new Set(regions.map(r => r.kanton));
  if (uniqueKantone.size > 1) return generic;

  const set = LANDMARKS[dominant.kanton];
  if (!set?.length) return generic;

  const sorted = [...set].sort((a, b) => b.cap - a.cap);
  const largest = sorted[0];

  if (reachLowerBound >= largest.cap * 1.5) {
    const n = Math.round(reachLowerBound / largest.cap);
    return { generic: false, text: `So viele Menschen, wie rund ${n}× ${largest.multPhrase} fasst.` };
  }

  const match = sorted.find(l => l.cap <= reachLowerBound);
  if (!match) return generic;

  return { generic: false, text: `So viele Menschen, wie ${match.inPhrase} passen.` };
}
