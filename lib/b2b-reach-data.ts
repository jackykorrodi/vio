export const B2B_REACH: Record<string, Record<string, { min: number; max: number }>> = {
  'Gesamte Schweiz': {
    'Alle Branchen': { min: 2800000, max: 3200000 },
    'Detailhandel': { min: 380000, max: 450000 },
    'Gastronomie & Hotellerie': { min: 220000, max: 270000 },
    'Bau & Handwerk': { min: 280000, max: 320000 },
    'Gesundheit & Soziales': { min: 350000, max: 420000 },
    'Bildung': { min: 190000, max: 230000 },
    'Finanz & Versicherung': { min: 210000, max: 250000 },
    'Immobilien': { min: 80000, max: 100000 },
    'IT & Kommunikation': { min: 180000, max: 220000 },
    'Produktion & Industrie': { min: 320000, max: 380000 },
    'Transport & Logistik': { min: 160000, max: 200000 },
    'Öffentliche Verwaltung': { min: 170000, max: 210000 },
    'Andere': { min: 400000, max: 500000 },
  },
  'Zürich': {
    'Alle Branchen': { min: 720000, max: 850000 },
    'IT & Kommunikation': { min: 65000, max: 80000 },
    'Finanz & Versicherung': { min: 85000, max: 100000 },
    'Gesundheit & Soziales': { min: 70000, max: 85000 },
    'Bau & Handwerk': { min: 55000, max: 68000 },
    'Detailhandel': { min: 90000, max: 110000 },
    'Produktion & Industrie': { min: 60000, max: 75000 },
    'Gastronomie & Hotellerie': { min: 50000, max: 62000 },
    'Bildung': { min: 55000, max: 68000 },
    'Andere': { min: 90000, max: 110000 },
  },
  'Bern': {
    'Alle Branchen': { min: 320000, max: 390000 },
    'IT & Kommunikation': { min: 22000, max: 28000 },
    'Finanz & Versicherung': { min: 28000, max: 35000 },
    'Gesundheit & Soziales': { min: 45000, max: 55000 },
    'Bau & Handwerk': { min: 25000, max: 32000 },
    'Detailhandel': { min: 38000, max: 47000 },
    'Produktion & Industrie': { min: 35000, max: 43000 },
    'Gastronomie & Hotellerie': { min: 22000, max: 28000 },
    'Bildung': { min: 30000, max: 37000 },
    'Andere': { min: 25000, max: 32000 },
  },
  'Basel': {
    'Alle Branchen': { min: 210000, max: 260000 },
    'Gesundheit & Soziales': { min: 45000, max: 56000 },
    'Produktion & Industrie': { min: 35000, max: 43000 },
    'Finanz & Versicherung': { min: 18000, max: 23000 },
    'IT & Kommunikation': { min: 14000, max: 18000 },
    'Andere': { min: 25000, max: 32000 },
  },
  'Genf': {
    'Alle Branchen': { min: 240000, max: 290000 },
    'Finanz & Versicherung': { min: 32000, max: 40000 },
    'Gesundheit & Soziales': { min: 28000, max: 35000 },
    'IT & Kommunikation': { min: 16000, max: 21000 },
    'Andere': { min: 54000, max: 66000 },
  },
};

export function getB2BReach(region: string, branche: string): { min: number; max: number } {
  const regionData = B2B_REACH[region] ?? B2B_REACH['Gesamte Schweiz'];
  return regionData[branche] ?? regionData['Alle Branchen'];
}
