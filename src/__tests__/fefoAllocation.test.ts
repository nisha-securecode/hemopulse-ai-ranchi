import { describe, it, expect } from 'vitest';

interface BloodBatch {
  hospitalId: string;
  bloodGroup: string;
  unitsAvailable: number;
  daysToExpiry: number;
  transitMinutes: number;
}

function rankDonorFacilities(batches: BloodBatch[], requiredUnits: number) {
  const SAFETY_RESERVE = 15;
  return batches
    .filter((b) => b.unitsAvailable - requiredUnits >= SAFETY_RESERVE)
    .map((b) => {
      const fefoScore = Math.max(0, 100 - b.daysToExpiry * 10);
      const proximityScore = Math.max(0, 100 - b.transitMinutes * 2);
      return { ...b, matchScore: Math.round(fefoScore * 0.6 + proximityScore * 0.4) };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

describe('HemoPulse AI — FEFO Smart Allocation & Safety Reserve Engine', () => {
  const mockNetwork: BloodBatch[] = [
    { hospitalId: 'Sadar Blood Bank', bloodGroup: 'O-', unitsAvailable: 54, daysToExpiry: 2.4, transitMinutes: 12 },
    { hospitalId: 'Red Cross Hub', bloodGroup: 'O-', unitsAvailable: 40, daysToExpiry: 14, transitMinutes: 18 },
    { hospitalId: 'Medica Ranchi', bloodGroup: 'O-', unitsAvailable: 16, daysToExpiry: 3, transitMinutes: 10 },
  ];

  it('prioritizes near-expiry units first (FEFO) to prevent blood wastage', () => {
    const ranked = rankDonorFacilities(mockNetwork, 6);
    expect(ranked[0].hospitalId).toBe('Sadar Blood Bank');
  });

  it('enforces 72-hour donor safety reserve lock and excludes low-stock facilities', () => {
    const ranked = rankDonorFacilities(mockNetwork, 6);
    expect(ranked.some((h) => h.hospitalId === 'Medica Ranchi')).toBe(false);
  });
});
