export interface ScreenData {
  total: number;
  politik: number;
  bruttoReichweite: number;
  bruttoReichweitePolitik: number;
}

export const DOOH_MULTIPLIER = 2.5; // avg persons viewing per ad play

export const SCREENS_KANTONE: Record<string, ScreenData> = {
  'Bern': { total: 2599, politik: 2241, bruttoReichweite: 134007085, bruttoReichweitePolitik: 131356970 },
  'Zürich': { total: 2431, politik: 1726, bruttoReichweite: 423125421, bruttoReichweitePolitik: 416651615 },
  'Sankt Gallen': { total: 1490, politik: 1200, bruttoReichweite: 31293247, bruttoReichweitePolitik: 28922428 },
  'St. Gallen': { total: 1490, politik: 1200, bruttoReichweite: 31293247, bruttoReichweitePolitik: 28922428 },
  'Aargau': { total: 1345, politik: 1109, bruttoReichweite: 26610198, bruttoReichweitePolitik: 24088915 },
  'Waadt': { total: 1193, politik: 1017, bruttoReichweite: 47175940, bruttoReichweitePolitik: 45708643 },
  'Genf': { total: 1084, politik: 956, bruttoReichweite: 56005529, bruttoReichweitePolitik: 55262008 },
  'Graubünden': { total: 950, politik: 816, bruttoReichweite: 11665422, bruttoReichweitePolitik: 10710899 },
  'Freiburg': { total: 796, politik: 690, bruttoReichweite: 24806760, bruttoReichweitePolitik: 24188162 },
  'Luzern': { total: 735, politik: 521, bruttoReichweite: 50089743, bruttoReichweitePolitik: 48355108 },
  'Basel-Landschaft': { total: 726, politik: 628, bruttoReichweite: 9837143, bruttoReichweitePolitik: 9129392 },
  'Tessin': { total: 696, politik: 525, bruttoReichweite: 26901869, bruttoReichweitePolitik: 25375751 },
  'Wallis': { total: 669, politik: 574, bruttoReichweite: 9905334, bruttoReichweitePolitik: 9023173 },
  'Solothurn': { total: 608, politik: 555, bruttoReichweite: 15879403, bruttoReichweitePolitik: 15280640 },
  'Basel-Stadt': { total: 527, politik: 376, bruttoReichweite: 46567508, bruttoReichweitePolitik: 45693352 },
  'Neuenburg': { total: 505, politik: 423, bruttoReichweite: 9885984, bruttoReichweitePolitik: 9691303 },
  'Thurgau': { total: 437, politik: 338, bruttoReichweite: 9380007, bruttoReichweitePolitik: 8233516 },
  'Schwyz': { total: 369, politik: 310, bruttoReichweite: 3790966, bruttoReichweitePolitik: 3204012 },
  'Schaffhausen': { total: 199, politik: 166, bruttoReichweite: 4873961, bruttoReichweitePolitik: 4534001 },
  'Appenzell Ausserrhoden': { total: 192, politik: 172, bruttoReichweite: 2496546, bruttoReichweitePolitik: 2271354 },
  'Jura': { total: 130, politik: 121, bruttoReichweite: 2899897, bruttoReichweitePolitik: 2853626 },
  'Zug': { total: 126, politik: 95, bruttoReichweite: 5444837, bruttoReichweitePolitik: 5094504 },
  'Nidwalden': { total: 65, politik: 53, bruttoReichweite: 435619, bruttoReichweitePolitik: 256250 },
  'Glarus': { total: 63, politik: 41, bruttoReichweite: 438802, bruttoReichweitePolitik: 307809 },
  'Obwalden': { total: 39, politik: 27, bruttoReichweite: 308389, bruttoReichweitePolitik: 188852 },
  'Appenzell Innerrhoden': { total: 36, politik: 29, bruttoReichweite: 140782, bruttoReichweitePolitik: 70892 },
  'Uri': { total: 35, politik: 24, bruttoReichweite: 869010, bruttoReichweitePolitik: 755945 },
  'Gesamte Schweiz': { total: 18382, politik: 15037, bruttoReichweite: 1000000000, bruttoReichweitePolitik: 820000000 },
};

export const SCREENS_GEMEINDEN: Record<string, ScreenData> = {
  'Zürich': { total: 1193, politik: 928, bruttoReichweite: 267931789, bruttoReichweitePolitik: 265386936 },
  'Bern': { total: 736, politik: 623, bruttoReichweite: 89211367, bruttoReichweitePolitik: 88590514 },
  'St. Gallen': { total: 589, politik: 447, bruttoReichweite: 16139147, bruttoReichweitePolitik: 15619702 },
  'Basel': { total: 519, politik: 369, bruttoReichweite: 46280030, bruttoReichweitePolitik: 45416375 },
  'Genf': { total: 418, politik: 351, bruttoReichweite: 36362910, bruttoReichweitePolitik: 36009599 },
  'Freiburg': { total: 290, politik: 265, bruttoReichweite: 15204179, bruttoReichweitePolitik: 15112897 },
  'Winterthur': { total: 264, politik: 143, bruttoReichweite: 42642436, bruttoReichweitePolitik: 42148154 },
  'Luzern': { total: 249, politik: 192, bruttoReichweite: 44210135, bruttoReichweitePolitik: 43577193 },
  'Biel': { total: 232, politik: 192, bruttoReichweite: 18489637, bruttoReichweitePolitik: 18309985 },
  'Chur': { total: 213, politik: 142, bruttoReichweite: 8025557, bruttoReichweitePolitik: 7815545 },
  'Lausanne': { total: 206, politik: 152, bruttoReichweite: 24438083, bruttoReichweitePolitik: 24160754 },
  'Solothurn': { total: 205, politik: 197, bruttoReichweite: 2378097, bruttoReichweitePolitik: 2260306 },
  'Neuenburg': { total: 188, politik: 167, bruttoReichweite: 4676570, bruttoReichweitePolitik: 4612895 },
  'Aarau': { total: 168, politik: 136, bruttoReichweite: 7240527, bruttoReichweitePolitik: 6873491 },
  'Thun': { total: 73, politik: 58, bruttoReichweite: 8084540, bruttoReichweitePolitik: 7876156 },
  'Sursee': { total: 61, politik: 57, bruttoReichweite: 519494, bruttoReichweitePolitik: 474287 },
  'Le Grand-Saconnex': { total: 59, politik: 59, bruttoReichweite: 5413506, bruttoReichweitePolitik: 5413506 },
  'Lugano': { total: 57, politik: 29, bruttoReichweite: 13607453, bruttoReichweitePolitik: 13347533 },
  'Schaffhausen': { total: 57, politik: 25, bruttoReichweite: 4403434, bruttoReichweitePolitik: 4073975 },
  'Zug': { total: 49, politik: 39, bruttoReichweite: 3469576, bruttoReichweitePolitik: 3290153 },
  'Wadenswil': { total: 11, politik: 3, bruttoReichweite: 140734, bruttoReichweitePolitik: 15309 },
  'Wädenswil': { total: 11, politik: 3, bruttoReichweite: 140734, bruttoReichweitePolitik: 15309 },
};

export function getScreenData(regionName: string, isPolitik: boolean): {
  screens: number;
  bruttoReichweite: number;
  politikPct: number;
  politikNote: string | null;
} {
  const data = SCREENS_GEMEINDEN[regionName]
    ?? SCREENS_KANTONE[regionName]
    ?? null;

  if (!data) {
    return { screens: isPolitik ? 10 : 15, bruttoReichweite: 50000, politikPct: 80, politikNote: null };
  }

  const screens = isPolitik ? data.politik : data.total;
  const br = isPolitik ? data.bruttoReichweitePolitik : data.bruttoReichweite;
  const politikPct = Math.round(data.politik / data.total * 100);
  const politikNote = isPolitik && data.politik < data.total
    ? `${data.politik} von ${data.total} Screens in dieser Region erlauben politische Werbung (${politikPct}%)`
    : null;

  return { screens, bruttoReichweite: br, politikPct, politikNote };
}
