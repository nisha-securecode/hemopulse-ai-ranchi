import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { ShortageAlert } from '../types/blood';

interface AlertsFeedProps {
  alerts: ShortageAlert[];
  onResolveAlert: (alert: ShortageAlert) => void;
  compact?: boolean;
}

export const AlertsFeed: React.FC<AlertsFeedProps> = ({
  alerts,
  onResolveAlert,
  compact = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'shortage' | 'expiry'>('all');

  const filtered = alerts.filter((a) => (filter === 'all' ? true : a.kind === filter));
  const displayed = compact ? filtered.slice(0, 5) : filtered;

  return (
    <section className="bg-white border border-slate-200 rounded-xl flex flex-col">
      {/* Header & Filter Segmented Control */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            AI Shortage &amp; Expiry Alerts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Ranked by depletion urgency and FEFO wastage risk · {alerts.length} active signals
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'shortage', label: 'Shortages' },
              { id: 'expiry', label: 'Expiring' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      {displayed.length === 0 ? (
        <div className="p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto" />
          <div className="mt-2.5 text-sm font-semibold text-slate-900">
            No Active {filter === 'shortage' ? 'Shortage' : filter === 'expiry' ? 'Expiry' : ''} Alerts
          </div>
          <p className="mt-1 text-xs text-slate-500">
            All monitored hospital blood pools are operating safely above 72-hour reserve thresholds.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {displayed.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isExpiry = alert.kind === 'expiry';

            return (
              <div
                key={alert.id}
                className="px-5 py-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        isCritical
                          ? 'text-[#E11D48]'
                          : isExpiry
                          ? 'text-amber-700'
                          : 'text-amber-600'
                      }`}
                    >
                      {isExpiry ? (
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>
                        {isExpiry ? 'FEFO Expiry Risk' : isCritical ? 'Critical Shortage' : '72-Hr Warning'}
                      </span>
                    </span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="font-mono font-bold text-slate-900">{alert.bloodGroup}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {alert.currentUnits}u on hand
                    </span>
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {alert.headline}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                    {alert.rationale}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onResolveAlert(alert)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                    isCritical && !isExpiry
                      ? 'bg-[#E11D48] text-white hover:bg-rose-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <span>Resolve with AI Match</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
