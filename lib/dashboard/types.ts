export type Phase = 'werbemittel' | 'preLive' | 'live' | 'post';

export interface Checkpoint {
  status: 'done' | 'pending' | 'todo';
  title: string;
  subtitle: string;
}

export interface Screenshot {
  label: string;
  variant: 'photo' | 'photo2' | 'sample';
}

export interface Contact {
  initials: string;
  name: string;
  role: string;
}

export interface DashboardData {
  phase: Phase;
  campaignName: string;

  // werbemittel + preLive + post
  package?: string;
  startDate?: string;
  region?: string;
  budget?: string;

  // werbemittel
  deadline?: string;
  calloutDeadline?: string;
  calloutBody?: string;
  checkpoints?: Checkpoint[];

  // preLive
  daysUntilStart?: number;
  creativeText?: string;
  estimatedReach?: string;
  frequency?: string;
  durationDays?: number;
  contact?: Contact;

  // live
  reached?: number;
  reachedTarget?: number;
  reachedPct?: number;
  avgSeen?: number;
  avgSeenTarget?: number;
  avgSeenPct?: number;
  currentDay?: number;
  totalDays?: number;
  startLabel?: string;
  endLabel?: string;
  remainingDays?: number;
  screenshots?: Screenshot[];
  screenshotsNewCount?: number;
  doohPct?: number;
  displayPct?: number;
  activeScreensLabel?: string;

  // post
  finalReached?: number;
  finalAvgSeen?: number;
  durationLabel?: string;
  channelsLabel?: string;
  totalContactsLabel?: string;
  postScreenshots?: Screenshot[];
}
