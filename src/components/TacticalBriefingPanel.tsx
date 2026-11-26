import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { CrisisPreset, ShortageAlert } from '../types/blood';

interface TacticalBriefingPanelProps {
  headline: string;
  narrative: string;
  actionInstruction: string;
  primaryAlert: ShortageAlert | null;
  activeCrisis: CrisisPreset | null;
  onResolvePrimary: (alert: ShortageAlert) => void;
}

export const TacticalBriefingPanel: React.FC<TacticalBriefingPanelProps> = ({
  headline,
  narrative,
  actionInstruction,
  primaryAlert,
  activeCrisis,
  onResolvePrimary,
}) => {
  return (
    <section
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
      aria-label="AI Tactical Executive Briefing"
    >
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#E11D48] shrink-0" />
            <h2 className="font-display text-sm font-bold text-slate-900">
              AI Tactical Summary
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {activeCrisis ? 'Surge Telemetry Mode' : 'Predictive Briefing'}
          </span>
        </div>

        <h3 className="mt-4 font-display text-base font-bold text-slate-900 leading-snug">
          {headline}
        </h3>

        <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
          {narrative}
        </p>

        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200/80 p-3.5">
          <div className="text-xs font-semibold text-slate-800">
            Tactical Dispatch Instruction
          </div>
          <p className="mt-1 text-xs text-slate-700 leading-relaxed">
            {actionInstruction}
          </p>
        </div>
      </div>

      {primaryAlert && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 tabular-nums">
            Target: <span className="font-semibold text-slate-800">{primaryAlert.bloodGroup}</span> ·{' '}
            {primaryAlert.recommendedUnits} units recommended
          </div>
          <button
            type="button"
            onClick={() => onResolvePrimary(primaryAlert)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#E11D48] text-white hover:bg-rose-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <span>Open Smart Match</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
