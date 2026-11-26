import React from 'react';
import { ArrowRight, Building2, Clock, Droplets, MapPin, X } from 'lucide-react';
import {
  BLOOD_GROUPS,
  BloodGroup,
  CrisisPreset,
  HospitalFacility,
} from '../types/blood';
import {
  getEarliestExpiryDays,
  getEffectiveDailyBurn,
  getEntryRiskLevel,
  getEntryUnits,
  getExpiringUnitsUnder5Days,
  getFacilityTotalUnits,
  getHoursUntilDepletion,
} from '../utils/predictiveEngine';

interface HospitalDetailDrawerProps {
  facility: HospitalFacility | null;
  activeCrisis: CrisisPreset | null;
  onClose: () => void;
  onTriggerMatch: (facilityId: string, bloodGroup: BloodGroup) => void;
}

export const HospitalDetailDrawer: React.FC<HospitalDetailDrawerProps> = ({
  facility,
  activeCrisis,
  onClose,
  onTriggerMatch,
}) => {
  if (!facility) return null;

  const totalUnits = getFacilityTotalUnits(facility);
  const utilizationPct = Math.min(100, Math.round((totalUnits / facility.capacityUnits) * 100));

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${facility.name} inventory details`}
    >
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {facility.type === 'blood_bank' ? (
                <Droplets className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              ) : (
                <Building2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              )}
              <span>{facility.roleLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{facility.district}</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              {facility.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono tabular-nums">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {facility.coordinates.lat}, {facility.coordinates.lng}
              </span>
              <span>{facility.traumaLevel}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close hospital detail panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50">
          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500">On-Hand Stock</div>
            <div className="mt-0.5 font-mono tabular-nums text-xl font-bold text-slate-900">
              {totalUnits} <span className="text-xs font-normal text-slate-500">units</span>
            </div>
          </div>
          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500">Cold Storage Load</div>
            <div className="mt-0.5 font-mono tabular-nums text-xl font-bold text-slate-900">
              {utilizationPct}% <span className="text-xs font-normal text-slate-500">of {facility.capacityUnits}</span>
            </div>
          </div>
          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500">Burn Status</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">
              {activeCrisis ? 'Surge Adjusted' : 'Baseline + Seasonal'}
            </div>
          </div>
        </div>

        {/* 8-Blood-Group Inventory Breakdown */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Live Blood Group Breakdown
            </h3>
            <span className="text-xs text-slate-500">
              Sorted by ABO / Rh · FEFO Batches
            </span>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {BLOOD_GROUPS.map((bg) => {
              const entry = facility.inventory[bg];
              const units = getEntryUnits(entry);
              const burn = getEffectiveDailyBurn(entry, facility.id, activeCrisis);
              const hours = getHoursUntilDepletion(units, burn);
              const expiring = getExpiringUnitsUnder5Days(entry);
              const earliest = getEarliestExpiryDays(entry);
              const risk = getEntryRiskLevel(hours, expiring);

              return (
                <div key={bg} className="p-4 bg-white hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-9 w-11 items-center justify-center rounded-lg font-mono text-sm font-bold border ${
                          risk === 'critical'
                            ? 'bg-rose-50 text-[#E11D48] border-rose-200'
                            : risk === 'warning'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {bg}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums text-base font-bold text-slate-900">
                            {units} units
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="font-mono tabular-nums text-xs text-slate-600">
                            {burn.toFixed(1)}/day burn
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`font-medium tabular-nums ${
                              hours < 36
                                ? 'text-[#E11D48]'
                                : hours < 72
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {Math.round(hours)}h runway
                          </span>
                          {expiring > 0 && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="inline-flex items-center gap-1 text-amber-700 font-medium tabular-nums">
                                <Clock className="h-3 w-3" />
                                {expiring}u expiring ({earliest.toFixed(1)}d)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {(hours < 72 || expiring >= 10) && (
                      <button
                        type="button"
                        onClick={() => onTriggerMatch(facility.id, bg)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          hours < 36
                            ? 'bg-[#E11D48] text-white hover:bg-rose-700'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        <span>{hours < 72 ? 'Resolve Shortage' : 'Redistribute FEFO'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Batch-level strip */}
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-mono tabular-nums">
                    {entry.batches.map((b) => (
                      <span key={b.batchId}>
                        {b.batchId}: {b.units}u {b.component} (exp {b.expiresInDays.toFixed(1)}d)
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
