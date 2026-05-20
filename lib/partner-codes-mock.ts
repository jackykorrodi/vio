export type PartnerCode = {
  code: string;
  type: 'direct' | 'agentur' | 'vermittler';
  reachBoostPct: number;   // 0–10
  commissionPct: number;   // 0–10
  active: boolean;
};

export const PARTNER_CODES_MOCK: PartnerCode[] = [
  { code: 'VIO-DIRECT-TEST',     type: 'direct',     reachBoostPct: 10, commissionPct: 0,  active: true },
  { code: 'VIO-AGENTUR-TEST',    type: 'agentur',    reachBoostPct: 5,  commissionPct: 5,  active: true },
  { code: 'VIO-VERMITTLER-TEST', type: 'vermittler', reachBoostPct: 0,  commissionPct: 10, active: true },
];

export function validatePartnerCode(input: string): PartnerCode | null {
  const normalized = input.trim().toUpperCase();
  return PARTNER_CODES_MOCK.find(c => c.code === normalized && c.active) ?? null;
}
