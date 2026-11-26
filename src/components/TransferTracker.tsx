import React from 'react';
import { ArrowRight, CheckCircle2, Truck } from 'lucide-react';
import { TransferDispatch } from '../types/blood';

interface TransferTrackerProps {
  transfers: TransferDispatch[];
  onCompleteTransfer: (transferId: string) => void;
}

export const TransferTracker: React.FC<TransferTrackerProps> = ({
  transfers,
  onCompleteTransfer,
}) => {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Live Inter-Hospital Transfer Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time cold-chain ambulance courier dispatches &amp; FEFO units rescued
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-600">
          {transfers.filter((t) => t.status === 'in_transit').length} active ·{' '}
          {transfers.filter((t) => t.status === 'delivered').length} delivered
        </span>
      </div>

      {transfers.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          No transfers dispatched yet. Click &ldquo;Resolve with AI Match&rdquo; on any alert to launch a cold-chain courier.
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {transfers.map((tr) => {
            const isDelivered = tr.status === 'delivered';
            const progressPct = isDelivered
              ? 100
              : Math.min(96, Math.round((tr.elapsedMinutes / Math.max(1, tr.transitMinutes)) * 100));
            const remainingMins = Math.max(1, tr.transitMinutes - tr.elapsedMinutes);

            return (
              <div key={tr.id} className="px-5 py-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-900">{tr.id}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-mono font-bold text-[#E11D48]">{tr.bloodGroup}</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        {tr.units} units
                      </span>
                      {tr.fefoRescuedUnits > 0 && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span className="text-amber-700 font-medium tabular-nums">
                            {tr.fefoRescuedUnits}u FEFO rescued
                          </span>
                        </>
                      )}
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-500">{tr.createdAt}</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <span>{tr.fromFacilityName}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{tr.toFacilityName}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{tr.reason}</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isDelivered ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                        <CheckCircle2 className="h-4 w-4" />
                        Delivered
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 font-mono tabular-nums">
                          <Truck className="h-4 w-4" />
                          ETA {remainingMins}m ({tr.distanceKm} km)
                        </span>
                        <button
                          type="button"
                          onClick={() => onCompleteTransfer(tr.id)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                        >
                          Confirm Arrival
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isDelivered ? 'bg-[#10B981]' : 'bg-sky-600'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
