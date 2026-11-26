import React from 'react';
import { AlertTriangle, Clock, Droplet, Truck } from 'lucide-react';

interface KpiCardsProps {
  totalUnits: number;
  dailyBurnTotal: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  expiringUnitsCount: number;
  activeTransfersCount: number;
  unitsInTransit: number;
  onCardClick?: (target: 'inventory' | 'matching') => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalUnits,
  dailyBurnTotal,
  criticalAlertsCount,
  warningAlertsCount,
  expiringUnitsCount,
  activeTransfersCount,
  unitsInTransit,
  onCardClick,
}) => {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Network Key Performance Indicators">
      {/* KPI 1: Total Network Blood Units */}
      <button
        type="button"
        onClick={() => onCardClick?.('inventory')}
        className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Total Network Blood Units</span>
          <Droplet className="h-4 w-4 text-slate-400 shrink-0" />
        </div>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span className="font-mono tabular-nums text-3xl font-bold tracking-tight text-slate-900">
            {totalUnits.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">units across 6 sites</span>
        </div>
        <div className="mt-2 text-xs text-slate-600 tabular-nums">
          Regional burn: <span className="font-mono font-medium text-slate-800">{dailyBurnTotal.toFixed(1)}</span> units/day
        </div>
      </button>

      {/* KPI 2: Critical 72-Hr Shortage Alerts */}
      <button
        type="button"
        onClick={() => onCardClick?.('matching')}
        className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Critical 72-Hr Shortage Alerts</span>
          <AlertTriangle
            className={`h-4 w-4 shrink-0 ${
              criticalAlertsCount > 0 ? 'text-[#E11D48]' : 'text-[#10B981]'
            }`}
          />
        </div>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span
            className={`font-mono tabular-nums text-3xl font-bold tracking-tight ${
              criticalAlertsCount > 0 ? 'text-[#E11D48]' : 'text-[#10B981]'
            }`}
          >
            {criticalAlertsCount}
          </span>
          <span className="text-xs font-medium text-slate-600">
            {criticalAlertsCount === 1 ? 'critical pool' : 'critical pools'}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-600 tabular-nums">
          {warningAlertsCount} additional warning-level pools
        </div>
      </button>

      {/* KPI 3: Units Expiring in <5 Days */}
      <button
        type="button"
        onClick={() => onCardClick?.('inventory')}
        className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Units Expiring in &lt;5 Days</span>
          <Clock
            className={`h-4 w-4 shrink-0 ${
              expiringUnitsCount > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'
            }`}
          />
        </div>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span
            className={`font-mono tabular-nums text-3xl font-bold tracking-tight ${
              expiringUnitsCount > 0 ? 'text-amber-600' : 'text-[#10B981]'
            }`}
          >
            {expiringUnitsCount}
          </span>
          <span className="text-xs text-slate-500">wastage risk units</span>
        </div>
        <div className="mt-2 text-xs text-slate-600">
          Prioritized via FEFO matching engine
        </div>
      </button>

      {/* KPI 4: Active Inter-Hospital Transfers */}
      <button
        type="button"
        onClick={() => onCardClick?.('matching')}
        className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Active Inter-Hospital Transfers</span>
          <Truck className="h-4 w-4 text-[#10B981] shrink-0" />
        </div>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span className="font-mono tabular-nums text-3xl font-bold tracking-tight text-slate-900">
            {activeTransfersCount}
          </span>
          <span className="text-xs text-slate-500">
            {activeTransfersCount === 1 ? 'route active' : 'routes active'}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-600 tabular-nums">
          <span className="font-mono font-medium text-emerald-700">{unitsInTransit}</span> units currently en route
        </div>
      </button>
    </section>
  );
};
