export type BloodGroup = 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+';

export const BLOOD_GROUPS: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export type FacilityType = 'trauma_hospital' | 'tertiary_hospital' | 'blood_bank';

export type RiskLevel = 'critical' | 'warning' | 'optimal';

export type AppView = 'dashboard' | 'matching' | 'inventory' | 'forecasting';

export interface BloodBatch {
  batchId: string;
  units: number;
  expiresInDays: number;
  component: 'Packed RBC' | 'Whole Blood' | 'Platelets';
  collectedDate: string;
}

export interface InventoryEntry {
  bloodGroup: BloodGroup;
  batches: BloodBatch[];
  baseDailyBurnRate: number;
  seasonalMultiplier: number;
  seasonalReason: string;
  history14d: number[];
}

export interface HospitalFacility {
  id: string;
  name: string;
  shortName: string;
  type: FacilityType;
  roleLabel: string;
  district: string;
  coordinates: {
    x: number; // SVG map 0-1000 scale
    y: number; // SVG map 0-600 scale
    lat: string;
    lng: string;
  };
  capacityUnits: number;
  traumaLevel: string;
  inventory: Record<BloodGroup, InventoryEntry>;
}

export interface RouteMetrics {
  fromId: string;
  toId: string;
  distanceKm: number;
  transitMinutes: number;
}

export interface ShortageAlert {
  id: string;
  kind: 'shortage' | 'expiry';
  severity: 'critical' | 'warning';
  facilityId: string;
  facilityName: string;
  bloodGroup: BloodGroup;
  currentUnits: number;
  hoursUntilDepletion: number;
  expiringUnitsUnder5d: number;
  earliestExpiryDays: number;
  effectiveDailyBurn: number;
  headline: string;
  rationale: string;
  recommendedUnits: number;
  priorityScore: number;
}

export interface DonorCandidate {
  facilityId: string;
  facilityName: string;
  shortName: string;
  roleLabel: string;
  availableUnits: number;
  surplusUnits: number;
  expiringUnitsUnder5d: number;
  earliestExpiryDays: number;
  distanceKm: number;
  transitMinutes: number;
  postTransferRunwayHours: number;
  scores: {
    surplus: number;
    fefo: number;
    transit: number;
    composite: number;
  };
  recommendedDispatchUnits: number;
  batchesToAllocate: { batchId: string; units: number; expiresInDays: number; component: string }[];
}

export interface TransferDispatch {
  id: string;
  createdAt: string;
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  bloodGroup: BloodGroup;
  units: number;
  fefoRescuedUnits: number;
  distanceKm: number;
  transitMinutes: number;
  elapsedMinutes: number;
  status: 'in_transit' | 'delivered';
  reason: string;
}

export interface CrisisPreset {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  bloodGroupMultipliers: Partial<Record<BloodGroup, number>>;
  facilityBurnMultipliers?: Record<string, number>;
  facilityStockReductions?: Record<string, Partial<Record<BloodGroup, number>>>;
}

export interface ForecastPoint {
  day: string;
  dayIndex: number;
  projectedDemand: number;
  availableSupply: number;
  shortageThreshold: number;
  isCrossoverDay: boolean;
}
