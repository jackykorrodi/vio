import type { DashboardData } from './types';

export const mockWerbemittel: DashboardData = {
  phase: 'werbemittel',
  campaignName: 'Energiezukunft Zürich',
  package: 'Präsenz · 5× / 28 Tage',
  startDate: '1. Juni 2026',
  region: 'Stadt Zürich',
  budget: "CHF 6'000",
  calloutDeadline: '22. Mai 2026',
  calloutBody: "Damit deine Kampagne am 1. Juni pünktlich startet — die DOOH-Freigabe kann bis zu 10 Tage dauern.",
  checkpoints: [
    { status: 'done',    title: 'Buchung bestätigt',       subtitle: "12. Mai 2026 · Paket Präsenz, CHF 6'000" },
    { status: 'pending', title: 'Werbemittel einreichen',  subtitle: 'Du bist hier · Upload bis 22. Mai empfohlen' },
    { status: 'todo',    title: 'Technische Freigabe',     subtitle: 'DOOH bis 10 Tage · Display 1–2 Tage' },
    { status: 'todo',    title: 'Kampagne startet',        subtitle: '1. Juni 2026 · automatisch ausgespielt' },
  ],
};

export const mockPreLive: DashboardData = {
  phase: 'preLive',
  campaignName: 'Energiezukunft Zürich',
  daysUntilStart: 12,
  startDate: '1. Juni 2026',
  region: 'Stadt Zürich',
  package: 'Präsenz',
  durationDays: 28,
  estimatedReach: "~125'000",
  frequency: '5× je Person',
  creativeText: 'Energiezukunft.\nJetzt JA stimmen.',
  checkpoints: [
    { status: 'done',    title: 'Buchung bestätigt',          subtitle: '12. Mai 2026' },
    { status: 'done',    title: 'Werbemittel eingereicht',    subtitle: 'Sujet "Energiezukunft"' },
    { status: 'done',    title: 'Technische Freigabe',        subtitle: 'DOOH und Display freigegeben am 19. Mai' },
    { status: 'pending', title: 'Kampagne wird vorbereitet',  subtitle: 'Startet automatisch am 1. Juni um 6 Uhr' },
  ],
  contact: { initials: 'SM', name: 'Stefan Müller', role: 'Kampagnenbetreuung VIO' },
};

export const mockLive: DashboardData = {
  phase: 'live',
  campaignName: 'Energiezukunft Zürich',
  reached: 87240,
  reachedTarget: 125000,
  reachedPct: 70,
  avgSeen: 3.6,
  avgSeenTarget: 5,
  avgSeenPct: 72,
  currentDay: 12,
  totalDays: 28,
  startLabel: '1. Juni',
  endLabel: '28. Juni',
  remainingDays: 16,
  screenshotsNewCount: 4,
  screenshots: [
    { label: 'Bahnhof Stadelhofen', variant: 'photo' },
    { label: 'Tram 11, Bellevue',   variant: 'photo2' },
    { label: 'Limmatquai',          variant: 'photo' },
    { label: 'Online · Tages-Anzeiger', variant: 'sample' },
  ],
  doohPct: 70,
  displayPct: 30,
  activeScreensLabel: "1'247 Screens aktiv · alle Kreise abgedeckt",
  region: 'Stadt Zürich',
  budget: "CHF 6'000",
};

export const mockPost: DashboardData = {
  phase: 'post',
  campaignName: 'Energiezukunft Zürich',
  finalReached: 124800,
  finalAvgSeen: 5.2,
  durationLabel: '28 Tage · 1. – 28. Juni 2026',
  region: 'Stadt Zürich',
  channelsLabel: '70% DOOH · 30% Display',
  budget: "CHF 6'000",
  totalContactsLabel: "~649'000 Sichtkontakte",
  postScreenshots: [
    { label: 'Bahnhof Stadelhofen', variant: 'photo' },
    { label: 'Tram 11, Bellevue',   variant: 'photo2' },
  ],
};

export const MOCK_DATA: Record<string, DashboardData> = {
  werbemittel: mockWerbemittel,
  preLive:     mockPreLive,
  live:        mockLive,
  post:        mockPost,
};
