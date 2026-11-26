import React from 'react';
import {
  Activity,
  ArrowLeftRight,
  Droplets,
  LayoutDashboard,
  LineChart,
  TableProperties,
  X,
} from 'lucide-react';
import { AppView, CrisisPreset } from '../types/blood';

interface SidebarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  criticalAlertsCount: number;
  activeTransfersCount: number;
  activeCrisis: CrisisPreset | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: AppView; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
  { id: 'matching', label: 'AI Match & Transfers', icon: ArrowLeftRight },
  { id: 'inventory', label: 'Inventory Matrix', icon: TableProperties },
  { id: 'forecasting', label: 'Forecasting & Surge', icon: LineChart },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  criticalAlertsCount,
  activeTransfersCount,
  activeCrisis,
  mobileOpen,
  onCloseMobile,
}) => {
  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#0F172A] text-slate-100 select-none">
      <div>
        {/* Brand mark */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E11D48] text-white shadow-sm">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
                HemoPulse AI
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap">
                Ranchi Network · JH
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="px-3 py-5 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const badge =
              item.id === 'matching'
                ? criticalAlertsCount > 0
                  ? { count: criticalAlertsCount, tone: 'critical' as const }
                  : activeTransfersCount > 0
                  ? { count: activeTransfersCount, tone: 'neutral' as const }
                  : null
                : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </span>
                {badge && (
                  <span
                    className={`font-mono tabular-nums text-xs font-semibold px-1.5 py-0.5 rounded ${
                      badge.tone === 'critical'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {badge.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Operational Context */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        {activeCrisis ? (
          <div className="rounded-lg bg-rose-950/60 border border-rose-800/70 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <Activity className="h-3.5 w-3.5 shrink-0" />
              <span>Surge Simulation Active</span>
            </div>
            <p className="mt-1 text-xs text-rose-100/90 leading-relaxed">
              {activeCrisis.shortLabel}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-slate-800/50 border border-slate-700/60 p-3.5">
            <div className="text-xs font-medium text-slate-300">
              Ranchi Regional Coverage
            </div>
            <div className="mt-1 text-xs text-slate-400 leading-relaxed">
              6 Ranchi Hospitals &amp; Depots · 8 Blood Groups · FEFO Engine
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-800 bg-[#0F172A]">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile slide-over sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
