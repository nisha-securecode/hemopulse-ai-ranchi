import {
  BLOOD_GROUPS,
  BloodGroup,
  CrisisPreset,
  HospitalFacility,
  ShortageAlert,
  TransferDispatch,
} from '../types/blood';
import {
  getEarliestExpiryDays,
  getEffectiveDailyBurn,
  getEntryUnits,
  getExpiringUnitsUnder5Days,
  getFacilityExpiringUnits,
  getFacilityTotalUnits,
  getHoursUntilDepletion,
  rankSmartMatches,
} from './predictiveEngine';

export interface CopilotReply {
  headline: string;
  body: string;
  bullets: string[];
  actionLabel?: string;
  actionAlert?: ShortageAlert;
}

export const STARTER_QUESTIONS: string[] = [
  'Which Ranchi hospital faces the most urgent shortage?',
  'How can we prevent blood wastage today?',
  'Summarize current network risk',
];

export function generateCopilotReply(
  question: string,
  facilities: HospitalFacility[],
  alerts: ShortageAlert[],
  transfers: TransferDispatch[],
  activeCrisis: CrisisPreset | null
): CopilotReply {
  const q = question.trim().toLowerCase();
  const shortageAlerts = alerts.filter((a) => a.kind === 'shortage');
  const expiryAlerts = alerts.filter((a) => a.kind === 'expiry');

  // 1. Most urgent shortage query
  if (
    q.includes('urgent') ||
    q.includes('shortage') ||
    q.includes('run out') ||
    q.includes('critical')
  ) {
    const top = shortageAlerts[0];
    if (!top) {
      return {
        headline: 'No Immediate Critical Shortages in Ranchi',
        body: 'Every facility in the 6-hospital Ranchi network currently holds more than 72 hours of runway across all 8 blood groups.',
        bullets: [
          `Total network reserve: ${facilities.reduce((s, f) => s + getFacilityTotalUnits(f), 0)} units on hand`,
          activeCrisis
            ? `Active simulation (${activeCrisis.shortLabel}) is being absorbed without sub-72h depletion.`
            : 'All trauma and district blood banks are operating within optimal safety margins.',
        ],
      };
    }

    const match = rankSmartMatches(top, facilities, activeCrisis);
    const bestDonor = match.candidates[0];
    const secondary = shortageAlerts.slice(1, 3);

    const bullets = [
      `Remaining stock: ${top.currentUnits} units of ${top.bloodGroup} · Effective burn: ${top.effectiveDailyBurn.toFixed(1)} units/day`,
      bestDonor
        ? `Best AI match: Transfer ${bestDonor.recommendedDispatchUnits}u from ${bestDonor.facilityName} (${bestDonor.distanceKm} km · ${bestDonor.transitMinutes} min ambulance ETA, ${bestDonor.scores.composite}% score)`
        : `No neighboring Ranchi depot holds >72h surplus for ${top.bloodGroup}; trigger voluntary donor call-in.`,
      ...secondary.map(
        (s) =>
          `Next watch: ${s.facilityName} (${s.bloodGroup}) — ${Math.round(s.hoursUntilDepletion)}h runway (${s.currentUnits}u)`
      ),
    ];

    return {
      headline: `${top.facilityName} (${top.bloodGroup}) — ${Math.round(top.hoursUntilDepletion)}h Until Depletion`,
      body: activeCrisis
        ? `Under the active ${activeCrisis.shortLabel} simulation, ${top.facilityName} faces the steepest deficit in the Ranchi network.`
        : `${top.facilityName} currently has the tightest runway in Ranchi due to ${top.rationale.toLowerCase()}`,
      bullets,
      actionLabel: bestDonor ? `Open AI Match for ${top.facilityName} (${top.bloodGroup})` : undefined,
      actionAlert: bestDonor ? top : undefined,
    };
  }

  // 2. Wastage / FEFO / Expiry query
  if (
    q.includes('wastage') ||
    q.includes('expir') ||
    q.includes('fefo') ||
    q.includes('save')
  ) {
    const expiringPools: {
      fac: HospitalFacility;
      bg: BloodGroup;
      expUnits: number;
      earliest: number;
      burn: number;
      batchIds: string[];
    }[] = [];

    for (const fac of facilities) {
      for (const bg of BLOOD_GROUPS) {
        const entry = fac.inventory[bg];
        const expUnits = getExpiringUnitsUnder5Days(entry);
        if (expUnits > 0) {
          expiringPools.push({
            fac,
            bg,
            expUnits,
            earliest: getEarliestExpiryDays(entry),
            burn: getEffectiveDailyBurn(entry, fac.id, activeCrisis),
            batchIds: entry.batches.filter((b) => b.expiresInDays <= 5).map((b) => b.batchId),
          });
        }
      }
    }

    expiringPools.sort((a, b) => a.earliest - b.earliest || b.expUnits - a.expUnits);
    const totalExpiring = expiringPools.reduce((s, p) => s + p.expUnits, 0);

    if (totalExpiring === 0) {
      return {
        headline: 'Zero Short-Term Wastage Risk Across Ranchi',
        body: 'All blood units across the 6 Ranchi facilities have more than 5 days of shelf life remaining.',
        bullets: ['Continue standard FEFO (First-Expired, First-Out) rotation at Sadar Blood Bank and Red Cross Hub.'],
      };
    }

    const topExpiryAlert = expiryAlerts[0];
    const topMatch = topExpiryAlert ? rankSmartMatches(topExpiryAlert, facilities, activeCrisis).candidates[0] : null;

    const bullets = expiringPools.slice(0, 4).map(
      (p) =>
        `${p.fac.shortName} · ${p.bg}: ${p.expUnits}u expiring in ${p.earliest.toFixed(1)}d (Batches: ${p.batchIds.join(', ')})`
    );

    if (topExpiryAlert && topMatch) {
      bullets.push(
        `Immediate FEFO Rescue: Route ${topMatch.recommendedDispatchUnits}u ${topExpiryAlert.bloodGroup} from ${topExpiryAlert.facilityName} → ${topMatch.facilityName} (${topMatch.transitMinutes} min ETA) for rapid surgical absorption.`
      );
    }

    return {
      headline: `${totalExpiring} Units at Wastage Risk (<5 Days Expiry)`,
      body: `FEFO telemetry flags ${expiringPools.length} Ranchi pools holding near-expiry RBC or platelet batches that exceed local 4-day consumption.`,
      bullets,
      actionLabel: topExpiryAlert
        ? `Redistribute ${topExpiryAlert.bloodGroup} from ${topExpiryAlert.facilityName}`
        : undefined,
      actionAlert: topExpiryAlert,
    };
  }

  // 3. Summarize current network risk
  if (q.includes('summarize') || q.includes('summary') || q.includes('network') || q.includes('risk') || q.includes('status')) {
    let totalUnits = 0;
    let totalBurn = 0;
    let totalExpiring = 0;
    for (const fac of facilities) {
      totalUnits += getFacilityTotalUnits(fac);
      totalExpiring += getFacilityExpiringUnits(fac);
      for (const bg of BLOOD_GROUPS) {
        totalBurn += getEffectiveDailyBurn(fac.inventory[bg], fac.id, activeCrisis);
      }
    }

    const critCount = shortageAlerts.filter((a) => a.severity === 'critical').length;
    const warnCount = shortageAlerts.filter((a) => a.severity === 'warning').length;
    const activeTransit = transfers.filter((t) => t.status === 'in_transit');
    const topAlert = shortageAlerts[0] ?? expiryAlerts[0];

    return {
      headline: activeCrisis
        ? `Elevated Risk · ${activeCrisis.shortLabel} Active`
        : critCount > 0
        ? `Moderate-High Risk · ${critCount} Critical Pool${critCount > 1 ? 's' : ''} in Ranchi`
        : 'Ranchi Network Stable & Balanced',
      body: `Across all 6 Ranchi hospitals and blood depots, ${totalUnits.toLocaleString()} total units are in cold storage against a combined regional demand of ${totalBurn.toFixed(1)} units/day.`,
      bullets: [
        `Depletion Alerts: ${critCount} critical (<36h) and ${warnCount} warning (<72h) blood pools`,
        `Wastage Watch: ${totalExpiring} units across Ranchi expire within 5 days`,
        `Live Logistics: ${activeTransit.length} active ambulance transfer${activeTransit.length === 1 ? '' : 's'} (${activeTransit.reduce((s, t) => s + t.units, 0)} units en route)`,
        topAlert
          ? `Top Priority: ${topAlert.headline}`
          : 'No immediate dispatch interventions required.',
      ],
      actionLabel: topAlert ? `Resolve Top Priority (${topAlert.bloodGroup})` : undefined,
      actionAlert: topAlert,
    };
  }

  // 4. Specific facility query
  const matchedFac = facilities.find(
    (f) =>
      q.includes(f.shortName.toLowerCase()) ||
      q.includes(f.name.toLowerCase()) ||
      (q.includes('rims') && f.id === 'rims-ranchi') ||
      (q.includes('medica') && f.id === 'medica-ranchi') ||
      (q.includes('raj') && f.id === 'raj-hospital') ||
      (q.includes('orchid') && f.id === 'orchid-medical') ||
      (q.includes('sadar') && f.id === 'sadar-blood-bank') ||
      ((q.includes('red cross') || q.includes('redcross')) && f.id === 'jharkhand-redcross')
  );

  if (matchedFac) {
    const total = getFacilityTotalUnits(matchedFac);
    const exp = getFacilityExpiringUnits(matchedFac);
    const lowGroups = BLOOD_GROUPS.map((bg) => {
      const entry = matchedFac.inventory[bg];
      const units = getEntryUnits(entry);
      const burn = getEffectiveDailyBurn(entry, matchedFac.id, activeCrisis);
      return { bg, units, burn, hours: getHoursUntilDepletion(units, burn) };
    }).sort((a, b) => a.hours - b.hours);

    const tightest = lowGroups[0];
    const facAlert = alerts.find((a) => a.facilityId === matchedFac.id);

    return {
      headline: `${matchedFac.name} (${matchedFac.district})`,
      body: `${matchedFac.roleLabel} holds ${total} total units (${Math.round((total / matchedFac.capacityUnits) * 100)}% capacity) with ${exp} units expiring in <5 days.`,
      bullets: [
        `Tightest runway: ${tightest.bg} at ${Math.round(tightest.hours)}h (${tightest.units}u on hand, ${tightest.burn.toFixed(1)}u/day burn)`,
        `Second tightest: ${lowGroups[1].bg} at ${Math.round(lowGroups[1].hours)}h (${lowGroups[1].units}u)`,
        `Strongest reserve: ${lowGroups[lowGroups.length - 1].bg} at ${lowGroups[lowGroups.length - 1].units}u (${Math.round(lowGroups[lowGroups.length - 1].hours)}h)`,
      ],
      actionLabel: facAlert ? `Resolve ${facAlert.bloodGroup} Alert` : undefined,
      actionAlert: facAlert,
    };
  }

  // 5. Specific blood group query (e.g., O-, B+, etc.)
  const matchedBg = BLOOD_GROUPS.find((bg) => q.includes(bg.toLowerCase()));
  if (matchedBg) {
    const perFac = facilities
      .map((f) => {
        const entry = f.inventory[matchedBg];
        const units = getEntryUnits(entry);
        const burn = getEffectiveDailyBurn(entry, f.id, activeCrisis);
        return {
          fac: f,
          units,
          burn,
          hours: getHoursUntilDepletion(units, burn),
          exp: getExpiringUnitsUnder5Days(entry),
        };
      })
      .sort((a, b) => a.hours - b.hours);

    const totalBgUnits = perFac.reduce((s, p) => s + p.units, 0);
    const bgAlert = alerts.find((a) => a.bloodGroup === matchedBg);

    return {
      headline: `Ranchi ${matchedBg} Blood Group Telemetry (${totalBgUnits}u Total)`,
      body: `Regional supply for ${matchedBg} is tracked across all 6 Ranchi hospitals and blood banks.`,
      bullets: perFac.slice(0, 4).map(
        (p) =>
          `${p.fac.shortName}: ${p.units}u (${Math.round(p.hours)}h runway · ${p.burn.toFixed(1)}/d burn${
            p.exp > 0 ? ` · ${p.exp}u exp <5d` : ''
          })`
      ),
      actionLabel: bgAlert ? `Open AI Match for ${bgAlert.facilityName} (${matchedBg})` : undefined,
      actionAlert: bgAlert,
    };
  }

  // 6. Transfer / logistics query
  if (q.includes('transfer') || q.includes('dispatch') || q.includes('ambulance') || q.includes('route')) {
    const inTransit = transfers.filter((t) => t.status === 'in_transit');
    return {
      headline: `${inTransit.length} Active Ranchi Ambulance Transfer${inTransit.length === 1 ? '' : 's'}`,
      body: `Cold-chain courier dispatches operate across Ranchi corridors (6–24 min ETAs between Bariatu, Main Road, Morabadi, and NH-33 Booty More).`,
      bullets:
        transfers.length > 0
          ? transfers.slice(0, 4).map(
              (t) =>
                `${t.id}: ${t.units}u ${t.bloodGroup} (${t.fromFacilityName} → ${t.toFacilityName}) — ${
                  t.status === 'delivered'
                    ? 'Delivered'
                    : `In transit · ${Math.max(1, t.transitMinutes - t.elapsedMinutes)}m ETA`
                }`
            )
          : ['No active dispatches logged. Select any shortage alert to schedule a transfer.'],
    };
  }

  // Default intelligent summary
  const top = shortageAlerts[0] ?? expiryAlerts[0];
  return {
    headline: 'HemoPulse AI — Ranchi Network Intelligence',
    body: `Monitoring 6 Ranchi facilities (${facilities.reduce((s, f) => s + getFacilityTotalUnits(f), 0)} total units) across 48 blood pools. Ask about any specific hospital (e.g., RIMS, Medica, Raj Hospital), blood group (O-, B+), wastage prevention, or active shortages.`,
    bullets: [
      `Active alerts: ${shortageAlerts.length} depletion alerts, ${expiryAlerts.length} FEFO expiry opportunities`,
      top ? `Top priority: ${top.headline}` : 'All Ranchi hospitals are currently within safe operational limits.',
    ],
    actionLabel: top ? `Resolve Top Alert (${top.bloodGroup})` : undefined,
    actionAlert: top,
  };
}
