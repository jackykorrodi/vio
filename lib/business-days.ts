// Zürcher Werktag-Logik für DOOH-Setup-Vorlauf (SETUP_VORLAUF_WERKTAGE)
// Feiertage Kanton Zürich inkl. Halbfeiertage als ganze Sperrtage

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function shiftDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return localDate(year, month, day);
}

// n-ter Wochentag (0=So, 1=Mo, ...) im Monat (1-basiert)
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const cursor = localDate(year, month, 1);
  let count = 0;
  while (true) {
    if (cursor.getDay() === weekday) {
      count++;
      if (count === n) return new Date(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}

export function getZurichHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  // Feste Feiertage
  const fixed: [number, number][] = [
    [1, 1],   // Neujahr
    [1, 2],   // Berchtoldstag
    [5, 1],   // Tag der Arbeit
    [8, 1],   // Bundesfeier
    [12, 25], // Weihnachten
    [12, 26], // Stephanstag
  ];
  for (const [mo, d] of fixed) {
    holidays.add(toDateKey(localDate(year, mo, d)));
  }

  // Bewegliche Feiertage (Oster-basiert via Meeus/Jones/Butcher)
  const easter = getEasterSunday(year);
  holidays.add(toDateKey(shiftDays(easter, -2))); // Karfreitag
  holidays.add(toDateKey(shiftDays(easter, 1)));  // Ostermontag
  holidays.add(toDateKey(shiftDays(easter, 39))); // Auffahrt
  holidays.add(toDateKey(shiftDays(easter, 50))); // Pfingstmontag

  // Zürcher Halbfeiertage (als ganze Sperrtage)
  // Sechseläuten-Verschiebung bei Ostermontag-Konflikt nicht behandelt – seltener Edge-Case
  holidays.add(toDateKey(nthWeekdayOfMonth(year, 4, 1, 3))); // 3. Montag April

  // Knabenschiessen: Montag nach dem 2. Sonntag im September
  const secondSundaySep = nthWeekdayOfMonth(year, 9, 0, 2);
  holidays.add(toDateKey(shiftDays(secondSundaySep, 1)));

  return holidays;
}

const holidayCache = new Map<number, Set<string>>();

function getHolidays(year: number): Set<string> {
  if (!holidayCache.has(year)) {
    holidayCache.set(year, getZurichHolidays(year));
  }
  return holidayCache.get(year)!;
}

export function isBusinessDay(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  return !getHolidays(date.getFullYear()).has(toDateKey(date));
}

// Zählt n Werktage AB dem Tag nach `date` (date selbst zählt nicht).
// n=0: gibt date zurück falls Werktag, sonst nächsten Werktag.
export function addBusinessDays(date: Date, n: number): Date {
  const cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (n === 0) {
    while (!isBusinessDay(cursor)) {
      cursor.setDate(cursor.getDate() + 1);
    }
    return cursor;
  }

  cursor.setDate(cursor.getDate() + 1);
  let counted = 0;
  while (counted < n) {
    if (isBusinessDay(cursor)) counted++;
    if (counted < n) cursor.setDate(cursor.getDate() + 1);
  }
  return cursor;
}

// Werktage im halboffenen Intervall (from exkl., to inkl.).
// Negativ falls to < from.
export function calculateBusinessDays(from: Date, to: Date): number {
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  if (fromKey === toKey) return 0;

  const forward = fromKey < toKey;
  const startDate = forward ? from : to;
  const endKey = forward ? toKey : fromKey;

  let count = 0;
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1);

  while (toDateKey(cursor) <= endKey) {
    if (isBusinessDay(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return forward ? count : -count;
}
