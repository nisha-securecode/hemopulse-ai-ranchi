import {
  BloodGroup,
  CrisisPreset,
  HospitalFacility,
  InventoryEntry,
  RouteMetrics,
  TransferDispatch,
} from '../types/blood';

function makeHistory(baseBurn: number, seedOffset: number, seasonal: number): number[] {
  const days: number[] = [];
  for (let i = 0; i < 14; i++) {
    const wave = Math.sin((i + seedOffset) * 0.65) * 0.16;
    const trend = (i / 13) * 0.12 * (seasonal > 1.1 ? 1.4 : 0.4);
    const val = Math.max(0.5, Number((baseBurn * (1 + wave + trend)).toFixed(1)));
    days.push(val);
  }
  return days;
}

function entry(
  bloodGroup: BloodGroup,
  batches: InventoryEntry['batches'],
  baseDailyBurnRate: number,
  seasonalMultiplier: number,
  seasonalReason: string,
  seed: number
): InventoryEntry {
  return {
    bloodGroup,
    batches,
    baseDailyBurnRate,
    seasonalMultiplier,
    seasonalReason,
    history14d: makeHistory(baseBurn(baseDailyBurnRate), seed, seasonalMultiplier),
  };
}

function baseBurn(val: number): number {
  return val;
}

export const INITIAL_FACILITIES: HospitalFacility[] = [
  {
    id: 'rims-ranchi',
    name: 'RIMS Ranchi',
    shortName: 'RIMS Ranchi',
    type: 'trauma_hospital',
    roleLabel: 'Apex Level 1 Trauma & Teaching',
    district: 'Bariatu, Ranchi',
    coordinates: { x: 560, y: 120, lat: '23.3886° N', lng: '85.3497° E' },
    capacityUnits: 520,
    traumaLevel: 'Apex Trauma · 42 OR Suites',
    inventory: {
      'O-': entry(
        'O-',
        [
          { batchId: 'RM-ON-881', units: 7, expiresInDays: 9.2, component: 'Packed RBC', collectedDate: '2026-11-12' },
          { batchId: 'RM-ON-894', units: 5, expiresInDays: 14.5, component: 'Whole Blood', collectedDate: '2026-11-17' },
        ],
        15.0,
        1.2,
        'Elevated NH-33 trauma & emergency orthopedic referrals',
        1
      ),
      'O+': entry(
        'O+',
        [
          { batchId: 'RM-OP-412', units: 22, expiresInDays: 7.4, component: 'Packed RBC', collectedDate: '2026-11-10' },
          { batchId: 'RM-OP-429', units: 16, expiresInDays: 16.0, component: 'Packed RBC', collectedDate: '2026-11-19' },
        ],
        19.5,
        1.15,
        'High regional emergency polytrauma admissions',
        2
      ),
      'A-': entry(
        'A-',
        [
          { batchId: 'RM-AN-204', units: 9, expiresInDays: 6.5, component: 'Packed RBC', collectedDate: '2026-11-09' },
          { batchId: 'RM-AN-219', units: 7, expiresInDays: 15.2, component: 'Packed RBC', collectedDate: '2026-11-18' },
        ],
        6.8,
        1.05,
        'Baseline general surgical demand',
        3
      ),
      'A+': entry(
        'A+',
        [
          { batchId: 'RM-AP-510', units: 30, expiresInDays: 8.8, component: 'Packed RBC', collectedDate: '2026-11-11' },
          { batchId: 'RM-AP-524', units: 24, expiresInDays: 18.0, component: 'Whole Blood', collectedDate: '2026-11-21' },
        ],
        14.0,
        1.08,
        'Scheduled cardiothoracic & neurosurgery cases',
        4
      ),
      'B-': entry(
        'B-',
        [
          { batchId: 'RM-BN-118', units: 5, expiresInDays: 3.1, component: 'Packed RBC', collectedDate: '2026-10-29' },
          { batchId: 'RM-BN-132', units: 6, expiresInDays: 12.0, component: 'Packed RBC', collectedDate: '2026-11-15' },
        ],
        3.2,
        1.02,
        'Baseline trauma reserve',
        5
      ),
      'B+': entry(
        'B+',
        [
          { batchId: 'RM-BP-307', units: 14, expiresInDays: 6.2, component: 'Platelets', collectedDate: '2026-11-19' },
          { batchId: 'RM-BP-318', units: 16, expiresInDays: 14.0, component: 'Packed RBC', collectedDate: '2026-11-17' },
        ],
        9.4,
        1.22,
        'Post-monsoon Ranchi febrile & dengue thrombocytopenic admissions',
        6
      ),
      'AB-': entry(
        'AB-',
        [
          { batchId: 'RM-ABN-09', units: 6, expiresInDays: 11.4, component: 'Packed RBC', collectedDate: '2026-11-14' },
        ],
        1.6,
        1.0,
        'Rare group steady reserve',
        7
      ),
      'AB+': entry(
        'AB+',
        [
          { batchId: 'RM-ABP-71', units: 14, expiresInDays: 13.0, component: 'Packed RBC', collectedDate: '2026-11-16' },
        ],
        3.5,
        1.0,
        'Routine ICU crossmatch',
        8
      ),
    },
  },
  {
    id: 'orchid-medical',
    name: 'Orchid Medical Centre',
    shortName: 'Orchid Medical',
    type: 'tertiary_hospital',
    roleLabel: 'Cardiac & Critical Care',
    district: 'HB Road, Plaza Chowk',
    coordinates: { x: 470, y: 235, lat: '23.3728° N', lng: '85.3318° E' },
    capacityUnits: 340,
    traumaLevel: 'Level II · Cardiac Bypass Unit',
    inventory: {
      'O-': entry(
        'O-',
        [
          { batchId: 'OM-ON-610', units: 11, expiresInDays: 8.5, component: 'Packed RBC', collectedDate: '2026-11-11' },
          { batchId: 'OM-ON-622', units: 10, expiresInDays: 17.5, component: 'Packed RBC', collectedDate: '2026-11-20' },
        ],
        6.2,
        1.1,
        'Neonatal & emergency cardiac transfusions',
        9
      ),
      'O+': entry(
        'O+',
        [
          { batchId: 'OM-OP-701', units: 26, expiresInDays: 9.0, component: 'Packed RBC', collectedDate: '2026-11-12' },
          { batchId: 'OM-OP-719', units: 28, expiresInDays: 19.0, component: 'Whole Blood', collectedDate: '2026-11-22' },
        ],
        12.4,
        1.08,
        'CABG & valve replacement caseload',
        10
      ),
      'A-': entry(
        'A-',
        [
          { batchId: 'OM-AN-302', units: 6, expiresInDays: 6.0, component: 'Packed RBC', collectedDate: '2026-11-08' },
          { batchId: 'OM-AN-315', units: 5, expiresInDays: 14.0, component: 'Packed RBC', collectedDate: '2026-11-16' },
        ],
        5.8,
        1.15,
        'Hematology & oncology support',
        11
      ),
      'A+': entry(
        'A+',
        [
          { batchId: 'OM-AP-880', units: 36, expiresInDays: 10.5, component: 'Packed RBC', collectedDate: '2026-11-13' },
          { batchId: 'OM-AP-891', units: 29, expiresInDays: 21.0, component: 'Packed RBC', collectedDate: '2026-11-23' },
        ],
        13.2,
        1.05,
        'Elective cardiac schedule',
        12
      ),
      'B-': entry(
        'B-',
        [
          { batchId: 'OM-BN-192', units: 8, expiresInDays: 11.0, component: 'Packed RBC', collectedDate: '2026-11-14' },
        ],
        2.1,
        1.0,
        'Nominal demand',
        13
      ),
      'B+': entry(
        'B+',
        [
          { batchId: 'OM-BP-408', units: 12, expiresInDays: 2.8, component: 'Platelets', collectedDate: '2026-11-18' },
          { batchId: 'OM-BP-419', units: 18, expiresInDays: 13.5, component: 'Packed RBC', collectedDate: '2026-11-16' },
        ],
        11.2,
        1.25,
        'Dengue & chemo-induced thrombocytopenia platelet demand',
        14
      ),
      'AB-': entry(
        'AB-',
        [
          { batchId: 'OM-ABN-44', units: 7, expiresInDays: 9.8, component: 'Packed RBC', collectedDate: '2026-11-13' },
        ],
        1.4,
        1.0,
        'Nominal demand',
        15
      ),
      'AB+': entry(
        'AB+',
        [
          { batchId: 'OM-ABP-53', units: 18, expiresInDays: 15.0, component: 'Packed RBC', collectedDate: '2026-11-18' },
        ],
        3.2,
        1.0,
        'Nominal demand',
        16
      ),
    },
  },
  {
    id: 'sadar-blood-bank',
    name: 'Sadar Hospital Blood Bank',
    shortName: 'Sadar Blood Bank',
    type: 'blood_bank',
    roleLabel: 'District Primary Depot',
    district: 'Purulia Road, Ranchi',
    coordinates: { x: 410, y: 315, lat: '23.3688° N', lng: '85.3264° E' },
    capacityUnits: 850,
    traumaLevel: 'District Cold Chain & Maternity Reserve',
    inventory: {
      'O-': entry(
        'O-',
        [
          { batchId: 'SD-ON-104', units: 18, expiresInDays: 2.4, component: 'Packed RBC', collectedDate: '2026-10-28' },
          { batchId: 'SD-ON-119', units: 26, expiresInDays: 8.6, component: 'Packed RBC', collectedDate: '2026-11-11' },
          { batchId: 'SD-ON-135', units: 24, expiresInDays: 22.0, component: 'Whole Blood', collectedDate: '2026-11-23' },
        ],
        4.2,
        1.05,
        'District PHC & maternity clinic distribution',
        17
      ),
      'O+': entry(
        'O+',
        [
          { batchId: 'SD-OP-205', units: 24, expiresInDays: 3.4, component: 'Packed RBC', collectedDate: '2026-10-30' },
          { batchId: 'SD-OP-218', units: 62, expiresInDays: 12.0, component: 'Packed RBC', collectedDate: '2026-11-15' },
          { batchId: 'SD-OP-239', units: 58, expiresInDays: 24.0, component: 'Whole Blood', collectedDate: '2026-11-24' },
        ],
        8.5,
        1.05,
        'District outpatient & OB/GYN supply',
        18
      ),
      'A-': entry(
        'A-',
        [
          { batchId: 'SD-AN-311', units: 12, expiresInDays: 3.8, component: 'Packed RBC', collectedDate: '2026-10-31' },
          { batchId: 'SD-AN-329', units: 28, expiresInDays: 16.5, component: 'Packed RBC', collectedDate: '2026-11-19' },
        ],
        3.0,
        1.0,
        'District depot reserve',
        19
      ),
      'A+': entry(
        'A+',
        [
          { batchId: 'SD-AP-401', units: 42, expiresInDays: 11.0, component: 'Packed RBC', collectedDate: '2026-11-14' },
          { batchId: 'SD-AP-425', units: 64, expiresInDays: 23.0, component: 'Packed RBC', collectedDate: '2026-11-23' },
        ],
        7.5,
        1.0,
        'District depot reserve',
        20
      ),
      'B-': entry(
        'B-',
        [
          { batchId: 'SD-BN-502', units: 18, expiresInDays: 14.0, component: 'Packed RBC', collectedDate: '2026-11-17' },
        ],
        1.6,
        1.0,
        'District depot reserve',
        21
      ),
      'B+': entry(
        'B+',
        [
          { batchId: 'SD-BP-609', units: 16, expiresInDays: 2.6, component: 'Platelets', collectedDate: '2026-11-22' },
          { batchId: 'SD-BP-621', units: 44, expiresInDays: 15.0, component: 'Packed RBC', collectedDate: '2026-11-18' },
        ],
        5.5,
        1.15,
        'Regional platelet apheresis pool',
        22
      ),
      'AB-': entry(
        'AB-',
        [
          { batchId: 'SD-ABN-71', units: 15, expiresInDays: 17.0, component: 'Packed RBC', collectedDate: '2026-11-20' },
        ],
        1.1,
        1.0,
        'Rare plasma & RBC reserve',
        23
      ),
      'AB+': entry(
        'AB+',
        [
          { batchId: 'SD-ABP-84', units: 32, expiresInDays: 19.0, component: 'Packed RBC', collectedDate: '2026-11-21' },
        ],
        2.2,
        1.0,
        'District depot reserve',
        24
      ),
    },
  },
  {
    id: 'medica-ranchi',
    name: 'Medica Superspecialty Hospital',
    shortName: 'Medica Ranchi',
    type: 'tertiary_hospital',
    roleLabel: 'Transplant & Highway Trauma',
    district: 'Booty More, NH-33',
    coordinates: { x: 760, y: 245, lat: '23.3941° N', lng: '85.3885° E' },
    capacityUnits: 410,
    traumaLevel: 'Level II · Renal Transplant & NH-33 ER',
    inventory: {
      'O-': entry(
        'O-',
        [
          { batchId: 'MD-ON-901', units: 14, expiresInDays: 6.8, component: 'Packed RBC', collectedDate: '2026-11-10' },
          { batchId: 'MD-ON-914', units: 18, expiresInDays: 18.0, component: 'Packed RBC', collectedDate: '2026-11-20' },
        ],
        7.0,
        1.05,
        'Renal transplant & NH-33 standby',
        25
      ),
      'O+': entry(
        'O+',
        [
          { batchId: 'MD-OP-112', units: 28, expiresInDays: 8.0, component: 'Packed RBC', collectedDate: '2026-11-11' },
          { batchId: 'MD-OP-128', units: 22, expiresInDays: 17.0, component: 'Whole Blood', collectedDate: '2026-11-19' },
        ],
        13.8,
        1.1,
        'Active surgical & bypass OR rotation',
        26
      ),
      'A-': entry(
        'A-',
        [
          { batchId: 'MD-AN-208', units: 14, expiresInDays: 10.2, component: 'Packed RBC', collectedDate: '2026-11-13' },
        ],
        3.6,
        1.0,
        'Baseline surgical demand',
        27
      ),
      'A+': entry(
        'A+',
        [
          { batchId: 'MD-AP-330', units: 38, expiresInDays: 9.5, component: 'Packed RBC', collectedDate: '2026-11-12' },
          { batchId: 'MD-AP-341', units: 25, expiresInDays: 20.0, component: 'Packed RBC', collectedDate: '2026-11-22' },
        ],
        14.5,
        1.05,
        'Organ perfusion & ICU graft support',
        28
      ),
      'B-': entry(
        'B-',
        [
          { batchId: 'MD-BN-410', units: 9, expiresInDays: 13.0, component: 'Packed RBC', collectedDate: '2026-11-16' },
        ],
        2.0,
        1.0,
        'Baseline reserve',
        29
      ),
      'B+': entry(
        'B+',
        [
          { batchId: 'MD-BP-515', units: 10, expiresInDays: 4.1, component: 'Platelets', collectedDate: '2026-11-20' },
          { batchId: 'MD-BP-529', units: 14, expiresInDays: 14.5, component: 'Packed RBC', collectedDate: '2026-11-17' },
        ],
        11.5,
        1.28,
        'Seasonal Ranchi dengue & hepatobiliary ICU surge',
        30
      ),
      'AB-': entry(
        'AB-',
        [
          { batchId: 'MD-ABN-19', units: 8, expiresInDays: 12.0, component: 'Packed RBC', collectedDate: '2026-11-15' },
        ],
        1.5,
        1.0,
        'Baseline reserve',
        31
      ),
      'AB+': entry(
        'AB+',
        [
          { batchId: 'MD-ABP-62', units: 19, expiresInDays: 16.0, component: 'Packed RBC', collectedDate: '2026-11-19' },
        ],
        3.4,
        1.0,
        'Universal plasma & AB+ recipient pool',
        32
      ),
    },
  },
  {
    id: 'raj-hospital',
    name: 'Raj Hospital',
    shortName: 'Raj Hospital',
    type: 'tertiary_hospital',
    roleLabel: 'Multi-Specialty & Maternity ER',
    district: 'Main Road, Ranchi',
    coordinates: { x: 360, y: 405, lat: '23.3569° N', lng: '85.3249° E' },
    capacityUnits: 310,
    traumaLevel: 'Level II · High-Risk Obstetrics & Trauma',
    inventory: {
      'O-': entry(
        'O-',
        [
          { batchId: 'RJ-ON-301', units: 15, expiresInDays: 10.5, component: 'Packed RBC', collectedDate: '2026-11-13' },
          { batchId: 'RJ-ON-319', units: 12, expiresInDays: 19.0, component: 'Packed RBC', collectedDate: '2026-11-21' },
        ],
        5.8,
        1.05,
        'Obstetric hemorrhage standby',
        33
      ),
      'O+': entry(
        'O+',
        [
          { batchId: 'RJ-OP-402', units: 18, expiresInDays: 7.2, component: 'Packed RBC', collectedDate: '2026-11-10' },
          { batchId: 'RJ-OP-415', units: 16, expiresInDays: 16.5, component: 'Packed RBC', collectedDate: '2026-11-19' },
        ],
        12.0,
        1.12,
        'Emergency C-section & Main Road trauma ER',
        34
      ),
      'A-': entry(
        'A-',
        [
          { batchId: 'RJ-AN-504', units: 11, expiresInDays: 11.0, component: 'Packed RBC', collectedDate: '2026-11-14' },
        ],
        2.8,
        1.0,
        'Baseline demand',
        35
      ),
      'A+': entry(
        'A+',
        [
          { batchId: 'RJ-AP-611', units: 26, expiresInDays: 9.0, component: 'Packed RBC', collectedDate: '2026-11-12' },
          { batchId: 'RJ-AP-628', units: 22, expiresInDays: 18.5, component: 'Packed RBC', collectedDate: '2026-11-21' },
        ],
        10.2,
        1.05,
        'General surgical & OB/GYN',
        36
      ),
      'B-': entry(
        'B-',
        [
          { batchId: 'RJ-BN-702', units: 6, expiresInDays: 8.5, component: 'Packed RBC', collectedDate: '2026-11-11' },
        ],
        1.9,
        1.0,
        'Baseline demand',
        37
      ),
      'B+': entry(
        'B+',
        [
          { batchId: 'RJ-BP-805', units: 11, expiresInDays: 5.8, component: 'Packed RBC', collectedDate: '2026-11-08' },
          { batchId: 'RJ-BP-819', units: 13, expiresInDays: 15.0, component: 'Platelets', collectedDate: '2026-11-20' },
        ],
        8.6,
        1.2,
        'Seasonal dengue pediatric & medicine ward demand',
        38
      ),
      'AB-': entry(
        'AB-',
        [
          { batchId: 'RJ-ABN-14', units: 5, expiresInDays: 13.5, component: 'Packed RBC', collectedDate: '2026-11-16' },
        ],
        1.2,
        1.0,
        'Baseline demand',
        39
      ),
      'AB+': entry(
        'AB+',
        [
          { batchId: 'RJ-ABP-28', units: 14, expiresInDays: 14.0, component: 'Packed RBC', collectedDate: '2026-11-17' },
        ],
        2.6,
        1.0,
        'Baseline demand',
        40
      ),
    },
  },
  {
    id: 'jharkhand-redcross',
    name: 'Jharkhand Red Cross Hub',
    shortName: 'Red Cross Hub',
    type: 'blood_bank',
    roleLabel: 'State Processing & Cold Reserve',
    district: 'Morabadi, Ranchi',
    coordinates: { x: 240, y: 215, lat: '23.3812° N', lng: '85.3156° E' },
    capacityUnits: 1100,
    traumaLevel: 'State Voluntary Donor & Component Separation Hub',
    inventory: {
      'O-': entry(
        'O-',
        [
          { batchId: 'JR-ON-012', units: 12, expiresInDays: 3.2, component: 'Packed RBC', collectedDate: '2026-10-29' },
          { batchId: 'JR-ON-029', units: 30, expiresInDays: 14.0, component: 'Packed RBC', collectedDate: '2026-11-17' },
          { batchId: 'JR-ON-044', units: 28, expiresInDays: 25.0, component: 'Whole Blood', collectedDate: '2026-11-24' },
        ],
        3.5,
        1.0,
        'Direct thalassemia clinic dispatch only',
        41
      ),
      'O+': entry(
        'O+',
        [
          { batchId: 'JR-OP-105', units: 35, expiresInDays: 4.2, component: 'Packed RBC', collectedDate: '2026-10-31' },
          { batchId: 'JR-OP-118', units: 72, expiresInDays: 15.0, component: 'Packed RBC', collectedDate: '2026-11-18' },
          { batchId: 'JR-OP-139', units: 60, expiresInDays: 26.0, component: 'Whole Blood', collectedDate: '2026-11-24' },
        ],
        7.0,
        1.0,
        'Regional reserve replenishment',
        42
      ),
      'A-': entry(
        'A-',
        [
          { batchId: 'JR-AN-202', units: 14, expiresInDays: 2.9, component: 'Packed RBC', collectedDate: '2026-10-29' },
          { batchId: 'JR-AN-221', units: 26, expiresInDays: 17.5, component: 'Packed RBC', collectedDate: '2026-11-20' },
        ],
        2.4,
        1.0,
        'Regional reserve',
        43
      ),
      'A+': entry(
        'A+',
        [
          { batchId: 'JR-AP-309', units: 48, expiresInDays: 13.0, component: 'Packed RBC', collectedDate: '2026-11-16' },
          { batchId: 'JR-AP-327', units: 74, expiresInDays: 25.0, component: 'Packed RBC', collectedDate: '2026-11-24' },
        ],
        6.2,
        1.0,
        'Regional reserve',
        44
      ),
      'B-': entry(
        'B-',
        [
          { batchId: 'JR-BN-401', units: 22, expiresInDays: 16.0, component: 'Packed RBC', collectedDate: '2026-11-19' },
        ],
        1.4,
        1.0,
        'Regional reserve',
        45
      ),
      'B+': entry(
        'B+',
        [
          { batchId: 'JR-BP-508', units: 18, expiresInDays: 3.1, component: 'Platelets', collectedDate: '2026-11-23' },
          { batchId: 'JR-BP-524', units: 52, expiresInDays: 18.0, component: 'Packed RBC', collectedDate: '2026-11-20' },
        ],
        4.8,
        1.1,
        'Post-monsoon apheresis buffer',
        46
      ),
      'AB-': entry(
        'AB-',
        [
          { batchId: 'JR-ABN-61', units: 19, expiresInDays: 19.0, component: 'Packed RBC', collectedDate: '2026-11-21' },
        ],
        0.9,
        1.0,
        'Rare cold reserve',
        47
      ),
      'AB+': entry(
        'AB+',
        [
          { batchId: 'JR-ABP-78', units: 41, expiresInDays: 21.0, component: 'Packed RBC', collectedDate: '2026-11-22' },
        ],
        1.8,
        1.0,
        'Regional reserve',
        48
      ),
    },
  },
];

// Symmetric 6x6 realistic Ranchi road distances & ambulance transit times
export const ROUTE_MATRIX: RouteMetrics[] = [
  { fromId: 'rims-ranchi', toId: 'orchid-medical', distanceKm: 3.4, transitMinutes: 10 },
  { fromId: 'rims-ranchi', toId: 'sadar-blood-bank', distanceKm: 4.2, transitMinutes: 12 },
  { fromId: 'rims-ranchi', toId: 'medica-ranchi', distanceKm: 6.8, transitMinutes: 15 },
  { fromId: 'rims-ranchi', toId: 'raj-hospital', distanceKm: 5.8, transitMinutes: 16 },
  { fromId: 'rims-ranchi', toId: 'jharkhand-redcross', distanceKm: 4.5, transitMinutes: 13 },

  { fromId: 'orchid-medical', toId: 'sadar-blood-bank', distanceKm: 1.5, transitMinutes: 6 },
  { fromId: 'orchid-medical', toId: 'medica-ranchi', distanceKm: 8.2, transitMinutes: 19 },
  { fromId: 'orchid-medical', toId: 'raj-hospital', distanceKm: 2.9, transitMinutes: 10 },
  { fromId: 'orchid-medical', toId: 'jharkhand-redcross', distanceKm: 3.1, transitMinutes: 11 },

  { fromId: 'sadar-blood-bank', toId: 'medica-ranchi', distanceKm: 9.1, transitMinutes: 21 },
  { fromId: 'sadar-blood-bank', toId: 'raj-hospital', distanceKm: 1.9, transitMinutes: 7 },
  { fromId: 'sadar-blood-bank', toId: 'jharkhand-redcross', distanceKm: 2.8, transitMinutes: 10 },

  { fromId: 'medica-ranchi', toId: 'raj-hospital', distanceKm: 10.5, transitMinutes: 24 },
  { fromId: 'medica-ranchi', toId: 'jharkhand-redcross', distanceKm: 9.8, transitMinutes: 22 },

  { fromId: 'raj-hospital', toId: 'jharkhand-redcross', distanceKm: 4.4, transitMinutes: 14 },
];

export function getRouteBetween(fromId: string, toId: string): RouteMetrics {
  if (fromId === toId) {
    return { fromId, toId, distanceKm: 0, transitMinutes: 0 };
  }
  const found = ROUTE_MATRIX.find(
    (r) => (r.fromId === fromId && r.toId === toId) || (r.fromId === toId && r.toId === fromId)
  );
  if (found) {
    return {
      fromId,
      toId,
      distanceKm: found.distanceKm,
      transitMinutes: found.transitMinutes,
    };
  }
  return { fromId, toId, distanceKm: 6.0, transitMinutes: 15 };
}

export const INITIAL_TRANSFERS: TransferDispatch[] = [
  {
    id: 'TRF-2611-04',
    createdAt: '6 mins ago',
    fromFacilityId: 'jharkhand-redcross',
    fromFacilityName: 'Jharkhand Red Cross Hub',
    toFacilityId: 'orchid-medical',
    toFacilityName: 'Orchid Medical Centre',
    bloodGroup: 'A-',
    units: 8,
    fefoRescuedUnits: 6,
    distanceKm: 3.1,
    transitMinutes: 11,
    elapsedMinutes: 6,
    status: 'in_transit',
    reason: 'Routine FEFO hematology & cardiac rebalance',
  },
];

export const CRISIS_PRESETS: CrisisPreset[] = [
  {
    id: 'nh33-highway-trauma',
    name: 'NH-33 Highway Mass Trauma (+250% O- & O+ Demand)',
    shortLabel: 'NH-33 Mass Trauma',
    description:
      'Multi-vehicle collision near Ormanjhi on NH-33 triggers massive transfusion protocols at RIMS Ranchi and Medica Superspecialty.',
    bloodGroupMultipliers: {
      'O-': 3.5,
      'O+': 3.5,
      'A+': 1.4,
    },
    facilityBurnMultipliers: {
      'rims-ranchi': 1.35,
      'medica-ranchi': 1.25,
    },
  },
  {
    id: 'ranchi-dengue-surge',
    name: 'Post-Monsoon Ranchi Dengue Surge (+180% B+ & Platelet Demand)',
    shortLabel: 'Ranchi Dengue Surge',
    description:
      'Acute post-monsoon dengue surge across Bariatu and Main Road wards spikes B+ and O+ platelet & whole blood demand.',
    bloodGroupMultipliers: {
      'B+': 2.8,
      'O+': 2.1,
      'A+': 1.6,
    },
    facilityBurnMultipliers: {
      'medica-ranchi': 1.3,
      'orchid-medical': 1.25,
      'raj-hospital': 1.2,
    },
  },
  {
    id: 'cold-chain-excursion',
    name: 'Cold Chain Power Excursion (-45% Raj Hospital Reserve)',
    shortLabel: 'Cold Chain Power Excursion',
    description:
      'Substation voltage fault on Main Road quarantines 45% of Raj Hospital O-, O+, and A+ cold-storage reserves, requiring urgent Ranchi backfill.',
    bloodGroupMultipliers: {
      'O-': 1.3,
      'O+': 1.25,
    },
    facilityStockReductions: {
      'raj-hospital': {
        'O-': 0.45,
        'O+': 0.45,
        'A+': 0.55,
      },
    },
  },
];
