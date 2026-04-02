// Mitarbeitende pro Branche pro Region (Platzhalterzahlen bis Permaleads API)
export const B2B_MITARBEITENDE: Record<string, Record<string, number>> = {
  'Gesamte Schweiz': {
    'Alle Branchen':           3100000,
    'Detailhandel':             420000,
    'Gastronomie & Hotellerie': 245000,
    'Bau & Handwerk':           300000,
    'Gesundheit & Soziales':    385000,
    'Bildung':                  210000,
    'Finanz & Versicherung':    230000,
    'Immobilien':                90000,
    'IT & Kommunikation':       200000,
    'Produktion & Industrie':   350000,
    'Transport & Logistik':     180000,
    'Öffentliche Verwaltung':   195000,
    'Andere':                   295000,
  },
  'Zürich': {
    'Alle Branchen':            780000,
    'IT & Kommunikation':        72000,
    'Finanz & Versicherung':     92000,
    'Gesundheit & Soziales':     77000,
    'Bau & Handwerk':            61000,
    'Detailhandel':             100000,
    'Produktion & Industrie':    67000,
    'Gastronomie & Hotellerie':  56000,
    'Bildung':                   61000,
    'Andere':                   214000,
  },
  'Bern': {
    'Alle Branchen':            355000,
    'IT & Kommunikation':        25000,
    'Finanz & Versicherung':     31000,
    'Gesundheit & Soziales':     50000,
    'Bau & Handwerk':            28000,
    'Detailhandel':              42000,
    'Produktion & Industrie':    39000,
    'Gastronomie & Hotellerie':  25000,
    'Bildung':                   33000,
    'Andere':                    82000,
  },
  'Basel': {
    'Alle Branchen':            235000,
    'Gesundheit & Soziales':     50000,
    'Produktion & Industrie':    39000,
    'Finanz & Versicherung':     20000,
    'IT & Kommunikation':        16000,
    'Andere':                   110000,
  },
  'Genf': {
    'Alle Branchen':            265000,
    'Finanz & Versicherung':     36000,
    'Gesundheit & Soziales':     31000,
    'IT & Kommunikation':        18000,
    'Andere':                   180000,
  },
}

// Unternehmensgrösse → Anteil am Branchenpotenzial
export const UNTERNEHMENSGROESSE_FAKTOR: Record<string, number> = {
  '1-10':   0.15,
  '11-50':  0.30,
  '51-250': 0.35,
  '250+':   0.20,
  'Alle':   1.00,
}

export function getMitarbeitende(region: string, branche: string, groesse: string): number {
  const regionData = B2B_MITARBEITENDE[region] ?? B2B_MITARBEITENDE['Gesamte Schweiz']
  const base = regionData[branche] ?? regionData['Alle Branchen']
  const faktor = UNTERNEHMENSGROESSE_FAKTOR[groesse] ?? 1.0
  return Math.round(base * faktor)
}
