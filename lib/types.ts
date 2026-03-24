export type AlterOption = 'jung' | 'mittel' | 'alt';
export type WohnlageOption = 'staedtisch' | 'agglo' | 'laendlich';
export type LifecycleOption =
  | 'junge_paare'
  | 'singles'
  | 'junge_familien'
  | 'familien_aeltere_kinder'
  | 'eltern_erwachsene_kinder';
export type SpracheOption = 'de' | 'fr' | 'it';
export type UnternehmensgroesseOption = 'micro' | 'klein' | 'mittel' | 'gross';

export interface AnalysisResult {
  // Shared
  organisation: string | null;
  beschreibung: string | null;
  region: string[];
  sprache: SpracheOption[];

  // B2C only
  gemeinden: string[];
  alter: AlterOption[];
  einkommen: 'tief' | 'mittel' | 'hoch' | null;
  wohnsituation: 'mieter' | 'eigentuemer' | null;
  wohnlage: WohnlageOption[];
  lifecycle: LifecycleOption[];
  kinder: 'keine' | 'ein_kind' | 'mehrere' | null;
  bildung: 'tief' | 'mittel' | 'hoch' | null;
  auto: 'kein_auto' | 'ein_auto' | 'mehrere_autos' | null;

  // B2B only
  branche: string | null;
  nogaCode: string | null;
  unternehmensgroesse: UnternehmensgroesseOption[];

  // Meta
  needsManualInput: boolean;
  isManualFallback: boolean;
  pageTitle: string;
  ogImage: string;
  ogLogo: string;
  favicon: string;
  themeColor?: string;
  headlines?: string[];
  sublines?: string[];
  ctaText?: string;
  suggestedImageUrl?: string;
  fontFamily?: string | null;
}

export interface BriefingData {
  // Step 1
  url: string;
  campaignType: 'b2c' | 'b2b' | 'politik';
  // Step 2 – Politik path
  politikType?: 'ja' | 'nein' | 'kandidat' | 'event';
  politikRegion?: string;
  politikRegionType?: 'kanton' | 'stadt' | 'gemeinde' | 'schweiz';
  stimmberechtigte?: number;
  votingDate?: string;
  daysUntil?: number;
  recommendedBudget?: number;
  recommendedLaufzeit?: number;
  selectedRegions?: Array<{ name: string; type: string; stimm: number; kanton?: string }>;
  totalStimmber?: number;
  // Step 3
  analysis: AnalysisResult | null;
  // Step 4
  budget: number;
  laufzeit: number;
  startDate: string;
  reach: number;
  freq?: number;
  tierSelected?: number;
  b2bReach: { unternehmen: number; mitarbeiter: number } | null;
  // Step 5
  werbemittel: 'upload' | 'erstellen' | 'spaeter' | null;
  uploadedFiles: string[];
  werbemittelErstellt: boolean;
  adHeadline: string;
  adSubline: string;
  adCta: string;
  adBgStyle: 'overlay' | 'pure' | 'split' | null;
  adBgColor: string;
  adTextColor: string;
  adAccentColor: string;
  adLogoMode?: 'text' | 'image';
  adBgImageData?: string;     // base64 data URL for persistence
  adLogoImageData?: string;   // base64 data URL for persistence
  adFont?: string;            // font id: fraunces | outfit | georgia | helvetica
  adFontScale?: number;       // 0.7–1.5, default 1.0
  adLogoText?: string;        // org name for text logo
  adFocusX?: number;          // 0-2: bg image focus column
  adFocusY?: number;          // 0-2: bg image focus row
  adAnimation?: string;       // none | fade | slide | pulse
  adPositionsQuer?: Record<string, { x: number; y: number }>;
  adPositionsHoch?: Record<string, { x: number; y: number }>;
  werbemittelService?: 'upload' | 'später' | 'erstellen'; // option chosen in Step 5
  werbemittelFiles?: string[];  // uploaded file names for option A
  adCreation?: 'upload' | 'selbst' | 'later'; // werbemittel choice for routing
  adCreationFee?: number;       // 500 when erstellen lassen selected
  // B2B audience fields (direct storage, in addition to analysis)
  branche?: string[];
  nogaCodes?: string[];
  unternehmensgroesse?: string[];
  // Session persistence
  sessionId?: string;
  dealId?: string;
  // Step 6
  agenturcode?: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  firma: string;
  adresse: string;
  plz: string;
  ort: string;
  abschluss: 'offerte' | 'buchen' | null;
}

export const initialBriefing: BriefingData = {
  url: '',
  campaignType: 'b2c',
  analysis: null,
  budget: 5000,
  laufzeit: 4,
  startDate: '',
  reach: 0,
  b2bReach: null,
  werbemittel: null,
  uploadedFiles: [],
  werbemittelErstellt: false,
  adHeadline: '',
  adSubline: '',
  adCta: '',
  adBgStyle: null,
  adBgColor: '',
  adTextColor: '',
  adAccentColor: '',
  vorname: '',
  nachname: '',
  email: '',
  telefon: '',
  firma: '',
  adresse: '',
  plz: '',
  ort: '',
  abschluss: null,
};
