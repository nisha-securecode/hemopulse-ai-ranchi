import { getRouteBetween } from '../data/networkData';
import {
  BLOOD_GROUPS,
  BloodBatch,
  BloodGroup,
  CrisisPreset,
  DonorCandidate,
  ForecastPoint,
  HospitalFacility,
  InventoryEntry,
  RiskLevel,
  ShortageAlert,
} from '../types/blood';

export function getEntryUnits(entry: InventoryEntry): number {
  return entry.batches.reduce((sum, b) => sum + b.units, 0);
}

export function getEffectiveDailyBurn(
  entry: InventoryEntry,
  facilityId: string,
  activeCrisis: CrisisPreset | null
): number {
  const bloodMult = activeCrisis?.bloodGroupMultipliers[entry.bloodGroup] ?? 1.0;
  const facilityMult = activeCrisis?.facilityBurnMultipliers?.[facilityId] ?? 1.0;
  return Number((entry.baseDailyBurnRate * entry.seasonalMultiplier * bloodMult * facilityMult).toFixed(2));
}

export function getHoursUntilDepletion(units: number, effectiveDailyBurn: number): number {
  if (effectiveDailyBurn <= 0) return 999;
  return Number(((units / effectiveDailyBurn) * 24).toFixed(1));
}

export function getExpiringUnitsUnder5Days(entry: InventoryEntry): number {
  return entry.batches
    .filter((b) => b.expiresInDays <= 5)
    .reduce((sum, b) => sum + b.units, 0);
}

export function getEarliestExpiryDays(entry: InventoryEntry): number {
  if (entry.batches.length === 0) return 99;
  return Math.min(...entry.batches.map((b) => b.expiresInDays));
}

export function getEntryRiskLevel(hoursUntilDepletion: number, expiringUnder5d: number): RiskLevel {
  if (hoursUntilDepletion < 24) return 'critical';
  if (hoursUntilDepletion < 72 || expiringUnder5d > 0) return 'warning';
  return 'optimal';
}

export function getFacilityOverallRisk(
  facility: HospitalFacility,
  activeCrisis: CrisisPreset | null
): RiskLevel {
  let hasWarning = false;
  for (const bg of BLOOD_GROUPS) {
    const entry = facility.inventory[bg];
    const units = getEntryUnits(entry);
    const burn = getEffectiveDailyBurn(entry, facility.id, activeCrisis);
    const hours = getHoursUntilDepletion(units, burn);
    if (hours < 36) return 'critical';
    const expiring = getExpiringUnitsUnder5Days(entry);
    if (hours < 72 || expiring >= 15) {
      hasWarning = true;
    }
  }
  return hasWarning ? 'warning' : 'optimal';
}

export function getFacilityTotalUnits(facility: HospitalFacility): number {
  return BLOOD_GROUPS.reduce((sum, bg) => sum + getEntryUnits(facility.inventory[bg]), 0);
}

export function getFacilityExpiringUnits(facility: HospitalFacility): number {
  return BLOOD_GROUPS.reduce((sum, bg) => sum + getExpiringUnitsUnder5Days(facility.inventory[bg]), 0);
}

export function computeNetworkAlerts(
  facilities: HospitalFacility[],
  activeCrisis: CrisisPreset | null
): ShortageAlert[] {
  const alerts: ShortageAlert[] = [];

  for (const facility of facilities) {
    for (const bg of BLOOD_GROUPS) {
      const entry = facility.inventory[bg];
      const units = getEntryUnits(entry);
      const burn = getEffectiveDailyBurn(entry, facility.id, activeCrisis);
      const hours = getHoursUntilDepletion(units, burn);
      const expiringUnits = getExpiringUnitsUnder5Days(entry);
      const earliestExpiry = getEarliestExpiryDays(entry);

      if (hours < 72) {
        const isCritical = hours < 36;
        const targetBufferUnits = Math.ceil((burn / 24) * 96); // 4-day safe runway target
        const recommendedUnits = Math.max(4, targetBufferUnits - units);
        const priorityScore = (isCritical ? 1000 : 500) + Math.max(0, 100 - hours) * 4 + burn;

        alerts.push({
          id: `shortage-${facility.id}-${bg}`,
          kind: 'shortage',
          severity: isCritical ? 'critical' : 'warning',
          facilityId: facility.id,
          facilityName: facility.name,
          bloodGroup: bg,
          currentUnits: units,
          hoursUntilDepletion: hours,
          expiringUnitsUnder5d: expiringUnits,
          earliestExpiryDays: earliestExpiry,
          effectiveDailyBurn: burn,
          headline: `${isCritical ? 'CRITICAL' : 'WARNING'}: ${facility.name} will run out of ${bg} in ${Math.round(hours)} hours`,
          rationale: `Current burn rate is ${burn.toFixed(1)} units/day (${entry.seasonalReason.toLowerCase()}). Only ${units} units remain on hand.`,
          recommendedUnits,
          priorityScore,
        });
      }

      // Also surface FEFO expiry wastage alerts for blood banks / high surplus expiring soon
      if (expiringUnits >= 10 && hours > 96) {
        const isCriticalExpiry = earliestExpiry <= 2.6;
        alerts.push({
          id: `expiry-${facility.id}-${bg}`,
          kind: 'expiry',
          severity: isCriticalExpiry ? 'critical' : 'warning',
          facilityId: facility.id,
          facilityName: facility.name,
          bloodGroup: bg,
          currentUnits: units,
          hoursUntilDepletion: hours,
          expiringUnitsUnder5d: expiringUnits,
          earliestExpiryDays: earliestExpiry,
          effectiveDailyBurn: burn,
          headline: `EXPIRY RISK: ${facility.name} has ${expiringUnits} units of ${bg} expiring in ${earliestExpiry.toFixed(1)} days`,
          rationale: `Local consumption (${burn.toFixed(1)} units/day) will not absorb expiring FEFO batch before ${earliestExpiry.toFixed(1)}-day threshold. Rebalance to high-burn hospital.`,
          recommendedUnits: Math.min(expiringUnits, Math.max(6, Math.round(expiringUnits * 0.75))),
          priorityScore: (isCriticalExpiry ? 780 : 420) + expiringUnits * 5,
        });
      }
    }
  }

  return alerts.sort((a, b) => b.priorityScore - a.priorityScore);
}

export function rankSmartMatches(
  alert: ShortageAlert,
  facilities: HospitalFacility[],
  activeCrisis: CrisisPreset | null
): { mode: 'donors_for_recipient' | 'recipients_for_expiring'; candidates: DonorCandidate[] } {
  if (alert.kind === 'shortage') {
    const candidates: DonorCandidate[] = [];

    for (const facility of facilities) {
      if (facility.id === alert.facilityId) continue;

      const entry = facility.inventory[alert.bloodGroup];
      const available = getEntryUnits(entry);
      const burn = getEffectiveDailyBurn(entry, facility.id, activeCrisis);
      const minReserveUnits = Math.ceil((burn / 24) * 72); // keep 72h reserve at donor
      const surplus = Math.max(0, available - minReserveUnits);

      if (surplus <= 0) continue;

      const route = getRouteBetween(facility.id, alert.facilityId);
      const expiringUnder5d = getExpiringUnitsUnder5Days(entry);
      const earliestExpiry = getEarliestExpiryDays(entry);

      const recommendedDispatch = Math.min(surplus, Math.max(4, alert.recommendedUnits));

      // Sort donor batches FEFO (earliest expiry first) to preview allocation
      const sortedBatches = [...entry.batches].sort((a, b) => a.expiresInDays - b.expiresInDays);
      let remaining = recommendedDispatch;
      const batchesToAllocate: DonorCandidate['batchesToAllocate'] = [];
      for (const batch of sortedBatches) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, batch.units);
        batchesToAllocate.push({
          batchId: batch.batchId,
          units: take,
          expiresInDays: batch.expiresInDays,
          component: batch.component,
        });
        remaining -= take;
      }

      const postUnits = available - recommendedDispatch;
      const postRunway = getHoursUntilDepletion(postUnits, burn);

      // Score components 0-100
      const surplusScore = Math.min(100, Math.round((surplus / Math.max(8, alert.recommendedUnits)) * 75 + (postRunway > 140 ? 25 : 10)));
      const fefoScore =
        expiringUnder5d > 0
          ? Math.min(100, Math.round(70 + (5 - Math.min(5, earliestExpiry)) * 10))
          : Math.max(25, Math.round(65 - earliestExpiry * 1.5));
      const transitScore = Math.max(20, Math.min(100, Math.round(115 - route.transitMinutes * 2.4)));

      const composite = Math.round(surplusScore * 0.4 + fefoScore * 0.35 + transitScore * 0.25);

      candidates.push({
        facilityId: facility.id,
        facilityName: facility.name,
        shortName: facility.shortName,
        roleLabel: facility.roleLabel,
        availableUnits: available,
        surplusUnits: surplus,
        expiringUnitsUnder5d: expiringUnder5d,
        earliestExpiryDays: earliestExpiry,
        distanceKm: route.distanceKm,
        transitMinutes: route.transitMinutes,
        postTransferRunwayHours: postRunway,
        scores: {
          surplus: surplusScore,
          fefo: fefoScore,
          transit: transitScore,
          composite,
        },
        recommendedDispatchUnits: recommendedDispatch,
        batchesToAllocate,
      });
    }

    return {
      mode: 'donors_for_recipient',
      candidates: candidates.sort((a, b) => b.scores.composite - a.scores.composite).slice(0, 3),
    };
  } else {
    // Expiry alert: rank best RECIPIENT hospitals with highest daily burn rate and low stock
    const sourceFacility = facilities.find((f) => f.id === alert.facilityId);
    if (!sourceFacility) return { mode: 'recipients_for_expiring', candidates: [] };

    const sourceEntry = sourceFacility.inventory[alert.bloodGroup];
    const sortedBatches = [...sourceEntry.batches].sort((a, b) => a.expiresInDays - b.expiresInDays);

    const candidates: DonorCandidate[] = [];
    for (const recipient of facilities) {
      if (recipient.id === alert.facilityId) continue;

      const recEntry = recipient.inventory[alert.bloodGroup];
      const recUnits = getEntryUnits(recEntry);
      const recBurn = getEffectiveDailyBurn(recEntry, recipient.id, activeCrisis);
      const recHours = getHoursUntilDepletion(recUnits, recBurn);
      const route = getRouteBetween(alert.facilityId, recipient.id);

      // Can recipient consume the expiring units within 4 days?
      const absorbable4d = Math.floor(recBurn * 4);
      const dispatchUnits = Math.min(alert.expiringUnitsUnder5d, Math.max(4, Math.min(alert.recommendedUnits, absorbable4d)));

      let remaining = dispatchUnits;
      const batchesToAllocate: DonorCandidate['batchesToAllocate'] = [];
      for (const batch of sortedBatches) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, batch.units);
        batchesToAllocate.push({
          batchId: batch.batchId,
          units: take,
          expiresInDays: batch.expiresInDays,
          component: batch.component,
        });
        remaining -= take;
      }

      const needScore = Math.min(100, Math.round(Math.max(20, 110 - recHours * 0.7)));
      const burnCapacityScore = Math.min(100, Math.round((recBurn / 12) * 80 + 20));
      const transitScore = Math.max(25, Math.min(100, Math.round(115 - route.transitMinutes * 2.4)));
      const composite = Math.round(needScore * 0.45 + burnCapacityScore * 0.3 + transitScore * 0.25);

      candidates.push({
        facilityId: recipient.id,
        facilityName: recipient.name,
        shortName: recipient.shortName,
        roleLabel: recipient.roleLabel,
        availableUnits: recUnits,
        surplusUnits: absorbable4d,
        expiringUnitsUnder5d: getExpiringUnitsUnder5Days(recEntry),
        earliestExpiryDays: getEarliestExpiryDays(recEntry),
        distanceKm: route.distanceKm,
        transitMinutes: route.transitMinutes,
        postTransferRunwayHours: getHoursUntilDepletion(recUnits + dispatchUnits, recBurn),
        scores: {
          surplus: needScore,
          fefo: burnCapacityScore,
          transit: transitScore,
          composite,
        },
        recommendedDispatchUnits: dispatchUnits,
        batchesToAllocate,
      });
    }

    return {
      mode: 'recipients_for_expiring',
      candidates: candidates.sort((a, b) => b.scores.composite - a.scores.composite).slice(0, 3),
    };
  }
}

export function executeFefoTransfer(
  facilities: HospitalFacility[],
  fromId: string,
  toId: string,
  bloodGroup: BloodGroup,
  requestedUnits: number
): {
  updatedFacilities: HospitalFacility[];
  transferredUnits: number;
  fefoRescuedUnits: number;
} {
  const cloned: HospitalFacility[] = structuredClone(facilities);
  const fromFac = cloned.find((f) => f.id === fromId);
  const toFac = cloned.find((f) => f.id === toId);

  if (!fromFac || !toFac) {
    return { updatedFacilities: facilities, transferredUnits: 0, fefoRescuedUnits: 0 };
  }

  const fromEntry = fromFac.inventory[bloodGroup];
  const toEntry = toFac.inventory[bloodGroup];

  // Sort donor batches by earliest expiry first (FEFO)
  fromEntry.batches.sort((a, b) => a.expiresInDays - b.expiresInDays);

  let remaining = requestedUnits;
  let actuallyTransferred = 0;
  let fefoRescued = 0;
  const movedBatches: BloodBatch[] = [];

  const remainingDonorBatches: BloodBatch[] = [];

  for (const batch of fromEntry.batches) {
    if (remaining <= 0) {
      remainingDonorBatches.push(batch);
      continue;
    }

    const take = Math.min(remaining, batch.units);
    actuallyTransferred += take;
    if (batch.expiresInDays <= 5) {
      fefoRescued += take;
    }

    movedBatches.push({
      ...batch,
      batchId: `${batch.batchId}-TR`,
      units: take,
    });

    if (batch.units - take > 0) {
      remainingDonorBatches.push({
        ...batch,
        units: batch.units - take,
      });
    }
    remaining -= take;
  }

  fromEntry.batches = remainingDonorBatches;
  toEntry.batches = [...toEntry.batches, ...movedBatches].sort(
    (a, b) => a.expiresInDays - b.expiresInDays
  );

  return {
    updatedFacilities: cloned,
    transferredUnits: actuallyTransferred,
    fefoRescuedUnits: fefoRescued,
  };
}

export function build7DayForecast(
  facilities: HospitalFacility[],
  selectedBloodGroup: BloodGroup | 'ALL',
  activeCrisis: CrisisPreset | null
): ForecastPoint[] {
  const groups = selectedBloodGroup === 'ALL' ? BLOOD_GROUPS : [selectedBloodGroup];

  let startingSupply = 0;
  let dailyBurn = 0;
  let expiringByDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  for (const fac of facilities) {
    for (const bg of groups) {
      const entry = fac.inventory[bg];
      startingSupply += getEntryUnits(entry);
      dailyBurn += getEffectiveDailyBurn(entry, fac.id, activeCrisis);
      for (const batch of entry.batches) {
        const expDay = Math.ceil(batch.expiresInDays);
        if (expDay >= 1 && expDay <= 7) {
          // Only partial wastage occurs if local facility burn doesn't consume it in time
          const localBurn = getEffectiveDailyBurn(entry, fac.id, activeCrisis);
          const unconsumedRatio = Math.max(0, 1 - (localBurn * expDay) / Math.max(1, getEntryUnits(entry)));
          expiringByDay[expDay] += Math.round(batch.units * unconsumedRatio * 0.65);
        }
      }
    }
  }

  // Regional donor collection replenishment is steady ~58% of baseline (without crisis surge)
  let baselineDailyCollection = 0;
  for (const fac of facilities) {
    for (const bg of groups) {
      baselineDailyCollection += fac.inventory[bg].baseDailyBurnRate * 0.72;
    }
  }

  // Safety threshold = 48-hour regional reserve buffer based on current daily demand
  const shortageThreshold = Math.round(dailyBurn * 2.1);

  const dayLabels = ['Today', 'Day +1', 'Day +2', 'Day +3', 'Day +4', 'Day +5', 'Day +6'];
  const points: ForecastPoint[] = [];
  let runningSupply = startingSupply;
  let crossoverMarked = false;

  for (let i = 0; i < 7; i++) {
    const demandMultiplier = activeCrisis ? 1 + i * 0.04 : 1 + Math.sin(i * 0.8) * 0.04;
    const dayDemand = Math.round(dailyBurn * demandMultiplier);
    const cumulativeDemandView = Math.round(dayDemand * (i === 0 ? 1 : 1.03));

    if (i > 0) {
      runningSupply = Math.max(
        0,
        Math.round(runningSupply - dayDemand + baselineDailyCollection - (expiringByDay[i] || 0))
      );
    }

    const isBelowThreshold = runningSupply <= shortageThreshold;
    const isCrossover = !crossoverMarked && isBelowThreshold;
    if (isCrossover) {
      crossoverMarked = true;
    }

    points.push({
      day: dayLabels[i],
      dayIndex: i,
      projectedDemand: cumulativeDemandView * 2.1, // 50-hr rolling demand envelope vs supply
      availableSupply: runningSupply,
      shortageThreshold,
      isCrossoverDay: isCrossover,
    });
  }

  return points;
}

export function generateTacticalBriefing(
  facilities: HospitalFacility[],
  alerts: ShortageAlert[],
  activeCrisis: CrisisPreset | null
): {
  headline: string;
  narrative: string;
  actionInstruction: string;
  primaryAlert: ShortageAlert | null;
} {
  const shortageAlerts = alerts.filter((a) => a.kind === 'shortage');
  const expiryAlerts = alerts.filter((a) => a.kind === 'expiry');
  const topShortage = shortageAlerts[0] ?? null;
  const topExpiry = expiryAlerts[0] ?? null;

  if (activeCrisis && topShortage) {
    const matchResult = rankSmartMatches(topShortage, facilities, activeCrisis);
    const bestDonor = matchResult.candidates[0];
    const donorText = bestDonor
      ? `Immediately dispatch ${bestDonor.recommendedDispatchUnits} units of ${topShortage.bloodGroup} from ${bestDonor.facilityName} (${bestDonor.transitMinutes} min ambulance transit, ${bestDonor.expiringUnitsUnder5d > 0 ? `rescues ${Math.min(bestDonor.recommendedDispatchUnits, bestDonor.expiringUnitsUnder5d)} FEFO units` : 'maintains >72h donor reserve'}).`
      : `Initiate emergency regional donor mobilization for ${topShortage.bloodGroup}.`;

    return {
      headline: `Active Surge Protocol: ${activeCrisis.shortLabel}`,
      narrative: `${activeCrisis.description} Network burn for ${topShortage.bloodGroup} at ${topShortage.facilityName} has escalated to ${topShortage.effectiveDailyBurn.toFixed(1)} units/day, compressing runway to ${Math.round(topShortage.hoursUntilDepletion)} hours with ${topShortage.currentUnits} units remaining.`,
      actionInstruction: donorText,
      primaryAlert: topShortage,
    };
  }

  if (topShortage) {
    const matchResult = rankSmartMatches(topShortage, facilities, activeCrisis);
    const bestDonor = matchResult.candidates[0];
    const entry = facilities.find((f) => f.id === topShortage.facilityId)?.inventory[topShortage.bloodGroup];
    const histAvg = entry
      ? (entry.history14d.reduce((a, b) => a + b, 0) / entry.history14d.length).toFixed(1)
      : topShortage.effectiveDailyBurn.toFixed(1);

    const donorText = bestDonor
      ? `Recommended Action: Route ${bestDonor.recommendedDispatchUnits} units of ${topShortage.bloodGroup} from ${bestDonor.facilityName} (${bestDonor.distanceKm} km · ${bestDonor.transitMinutes} min ETA). ${
          bestDonor.expiringUnitsUnder5d > 0
            ? `FEFO optimization prioritizes ${Math.min(bestDonor.recommendedDispatchUnits, bestDonor.expiringUnitsUnder5d)} units expiring within ${bestDonor.earliestExpiryDays.toFixed(1)} days.`
            : `Donor retains ${Math.round(bestDonor.postTransferRunwayHours)} hours of safety buffer post-dispatch.`
        }`
      : `Recommended Action: Activate standby donor call-in for ${topShortage.bloodGroup}.`;

    return {
      headline: `${topShortage.facilityName} requires urgent ${topShortage.bloodGroup} replenishment`,
      narrative: `14-day consumption averaged ${histAvg} units/day, but ${entry?.seasonalReason.toLowerCase() ?? 'elevated surgical demand'} (${entry?.seasonalMultiplier.toFixed(2)}x factor) raised current burn to ${topShortage.effectiveDailyBurn.toFixed(1)} units/day. At ${topShortage.currentUnits} units on hand, depletion occurs in ${Math.round(topShortage.hoursUntilDepletion)} hours.`,
      actionInstruction: donorText,
      primaryAlert: topShortage,
    };
  }

  if (topExpiry) {
    const matchResult = rankSmartMatches(topExpiry, facilities, activeCrisis);
    const bestRecipient = matchResult.candidates[0];
    return {
      headline: `Zero critical depletion alerts · FEFO wastage prevention opportunity`,
      narrative: `All 6 regional facilities maintain >72 hours of runway across all 8 blood groups. However, ${topExpiry.facilityName} holds ${topExpiry.expiringUnitsUnder5d} units of ${topExpiry.bloodGroup} expiring in ${topExpiry.earliestExpiryDays.toFixed(1)} days.`,
      actionInstruction: bestRecipient
        ? `Recommended Action: Rebalance ${bestRecipient.recommendedDispatchUnits} expiring ${topExpiry.bloodGroup} units to ${bestRecipient.facilityName} (${bestRecipient.transitMinutes} min transit) where high surgical turnover will absorb stock before expiry.`
        : `Monitor expiring batches for routine clinical rotation.`,
      primaryAlert: topExpiry,
    };
  }

  return {
    headline: 'Regional Blood Network Balanced & Optimal',
    narrative:
      'All 6 regional hospitals and blood banks are operating above 72-hour safety buffers with zero immediate cold-chain wastage risks.',
    actionInstruction: 'Continue standard 12-hour predictive telemetry sweeps across all 48 blood inventory pools.',
    primaryAlert: null,
  };
}
