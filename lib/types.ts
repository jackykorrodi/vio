export type AlterOption = 'jung' | 'mittel' | 'alt';
export type WohnlageOption = 'staedtisch' | 'agglo' | 'laendlich';
export type LifecycleOption =
  | 'junge_paare'
  | 'singles'
  | 'junge_familien'
  | 'familien_aeltere_kinder'
  | 'eltern_erwachsene_kinder';
export type SpracheOption = 'de' | 'fr' | 'it';

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
  unternehmensgroesse: 'klein' | 'mittel' | 'gross' | null;

  // Meta
  needsManualInput: boolean;
  isManualFallback: boolean;
  pageTitle: string;
}

export interface BriefingData {
  // Step 1
  url: string;
  campaignType: 'b2c' | 'b2b';
  // Step 3
  analysis: AnalysisResult | null;
  // Step 4/5
  budget: number;
  laufzeit: number;
  reach: number;
  // Step 6
  werbemittel: 'upload' | 'erstellen' | 'spaeter' | null;
  uploadedFiles: string[];
  // Step 7
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
  reach: 0,
  werbemittel: null,
  uploadedFiles: [],
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
