import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Navigation, ShieldCheck, Truck, X } from 'lucide-react';
import { CrisisPreset, DonorCandidate, HospitalFacility, ShortageAlert } from '../types/blood';
import { rankSmartMatches } from '../utils/predictiveEngine';

interface SmartAllocationModalProps {
  alert: ShortageAlert | null;
  facilities: HospitalFacility[];
  activeCrisis: CrisisPreset | null;
  onClose: () => void;
  onConfirmDispatch: (payload: {
    fromFacilityId: string;
    toFacilityId: string;
    bloodGroup: ShortageAlert['bloodGroup'];
    units: number;
    fefoRescuedUnits: number;
    distanceKm: number;
    transitMinutes: number;
    reason: string;
  }) => void;
}

export const SmartAllocationModal: React.FC<SmartAllocationModalProps> = ({
  alert,
  facilities,
  activeCrisis,
  onClose,
  onConfirmDispatch,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [dispatchUnits, setDispatchUnits] = useState<number>(8);

  const matchData = alert ? rankSmartMatches(alert, facilities, activeCrisis) : null;
  const candidates = matchData?.candidates ?? [];
  const isExpiryMode = matchData?.mode === 'recipients_for_expiring';

  useEffect(() => {
    if (candidates.length > 0) {
      setSelectedCandidateId(candidates[0].facilityId);
      setDispatchUnits(candidates[0].recommendedDispatchUnits);
    }
  }, [alert?.id]);

  if (!alert || !matchData) return null;

  const selectedCandidate: DonorCandidate | undefined =
    candidates.find((c) => c.facilityId === selectedCandidateId) ?? candidates[0];

  const maxDispatchable = selectedCandidate
    ? isExpiryMode
      ? Math.max(2, alert.expiringUnitsUnder5d)
      : Math.max(2, selectedCandidate.surplusUnits)
    : 10;

  const handleSelectCandidate = (candidate: DonorCandidate) => {
    setSelectedCandidateId(candidate.facilityId);
    setDispatchUnits(candidate.recommendedDispatchUnits);
  };

  const handleDispatch = () => {
    if (!selectedCandidate) return;

    const fromFacilityId = isExpiryMode ? alert.facilityId : selectedCandidate.facilityId;
    const toFacilityId = isExpiryMode ? selectedCandidate.facilityId : alert.facilityId;
    const fefoCount = isExpiryMode
      ? Math.min(dispatchUnits, alert.expiringUnitsUnder5d)
      : Math.min(dispatchUnits, selectedCandidate.expiringUnitsUnder5d);

    onConfirmDispatch({
      fromFacilityId,
      toFacilityId,
      bloodGroup: alert.bloodGroup,
      units: dispatchUnits,
      fefoRescuedUnits: fefoCount,
      distanceKm: selectedCandidate.distanceKm,
      transitMinutes: selectedCandidate.transitMinutes,
      reason: isExpiryMode
        ? `FEFO expiry rescue (${alert.earliestExpiryDays.toFixed(1)}d remaining)`
        : `Critical ${Math.round(alert.hoursUntilDepletion)}h shortage resolution`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI Smart Allocation & Dispatch"
    >
      <div
        className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>AI Smart Allocation Engine</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-bold text-[#E11D48]">{alert.bloodGroup}</span>
              <span aria-hidden="true">·</span>
              <span>{isExpiryMode ? 'FEFO Wastage Rescue' : 'Shortage Match'}</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              {isExpiryMode
                ? `Redistribute Expiring ${alert.bloodGroup} from ${alert.facilityName}`
                : `Top 3 Donor Matches for ${alert.facilityName}`}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {isExpiryMode
                ? `Ranked by recipient surgical burn capacity, current runway urgency, and shortest ambulance transit.`
                : `Scored by (a) Surplus above 72h buffer, (b) FEFO expiry priority, and (c) Shortest ambulance transit time.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
            aria-label="Close smart allocation modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {candidates.length === 0 ? (
            <div className="rounded-xl border border-slate-200 p-8 text-center">
              <div className="text-sm font-semibold text-slate-900">
                No Regional Facility Has Surplus Above 72-Hr Buffer
              </div>
              <p className="mt-1 text-xs text-slate-500">
                All neighboring depots are near minimum safety stock for {alert.bloodGroup}. Trigger emergency donor call-in or reset demo stock.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {candidates.map((cand, index) => {
                  const isSelected = cand.facilityId === selectedCandidate?.facilityId;

                  return (
                    <button
                      key={cand.facilityId}
                      type="button"
                      onClick={() => handleSelectCandidate(cand)}
                      className={`w-full text-left rounded-xl border p-4 transition-colors ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50/90 ring-1 ring-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-slate-900">
                              Rank #{index + 1}
                            </span>
                            <span className="text-slate-300" aria-hidden="true">·</span>
                            <span className="text-slate-500">{cand.roleLabel}</span>
                          </div>
                          <div className="mt-0.5 font-display text-base font-bold text-slate-900">
                            {cand.facilityName}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono tabular-nums text-lg font-bold text-emerald-700">
                            {cand.scores.composite}% Match
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            {cand.distanceKm} km · {cand.transitMinutes} min ETA
                          </div>
                        </div>
                      </div>

                      {/* 3-Factor Score Breakdown */}
                      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/80 text-xs">
                        <div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>{isExpiryMode ? 'Recipient Need' : 'Surplus Buffer'}</span>
                            <span className="font-mono tabular-nums font-semibold text-slate-800">
                              {cand.scores.surplus}/100
                            </span>
                          </div>
                          <div className="mt-1 text-slate-700 font-mono tabular-nums">
                            {isExpiryMode
                              ? `${cand.availableUnits}u on hand`
                              : `${cand.surplusUnits}u safe surplus`}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>{isExpiryMode ? 'Burn Absorption' : 'FEFO Priority'}</span>
                            <span className="font-mono tabular-nums font-semibold text-slate-800">
                              {cand.scores.fefo}/100
                            </span>
                          </div>
                          <div className="mt-1 text-amber-700 font-mono tabular-nums">
                            {cand.expiringUnitsUnder5d > 0 && !isExpiryMode
                              ? `${cand.expiringUnitsUnder5d}u exp in ${cand.earliestExpiryDays.toFixed(1)}d`
                              : `Runway post-tx: ${Math.round(cand.postTransferRunwayHours)}h`}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Transit Speed</span>
                            <span className="font-mono tabular-nums font-semibold text-slate-800">
                              {cand.scores.transit}/100
                            </span>
                          </div>
                          <div className="mt-1 text-slate-700 font-mono tabular-nums inline-flex items-center gap-1">
                            <Navigation className="h-3 w-3 text-slate-400" />
                            <span>{cand.transitMinutes} mins cold courier</span>
                          </div>
                        </div>
                      </div>

                      {/* Selected Batch Preview */}
                      {cand.batchesToAllocate.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums text-slate-500">
                          <span className="font-sans font-medium text-slate-600">FEFO Batches:</span>
                          {cand.batchesToAllocate.map((b) => (
                            <span key={b.batchId}>
                              {b.batchId} ({b.units}u · exp {b.expiresInDays.toFixed(1)}d)
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dispatch Quantity Control */}
              {selectedCandidate && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span>Dispatch Quantity ({alert.bloodGroup})</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {dispatchUnits} units (max {maxDispatchable}u)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={maxDispatchable}
                      value={dispatchUnits}
                      onChange={(e) => setDispatchUnits(Number(e.target.value))}
                      className="mt-2 w-full accent-[#E11D48]"
                      aria-label="Dispatch unit quantity"
                    />
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
                        Donor keeps &ge;72h safety stock
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        Auto-deducts earliest expiry first
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          {selectedCandidate && (
            <button
              type="button"
              onClick={handleDispatch}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#E11D48] text-white hover:bg-rose-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Truck className="h-4 w-4" />
              <span>Confirm &amp; Dispatch Transfer ({dispatchUnits}u)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
