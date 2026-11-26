import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, RotateCcw, Siren } from 'lucide-react';
import { AppView, CrisisPreset } from '../types/blood';

interface TopBarProps {
  activeView: AppView;
  crisisPresets: CrisisPreset[];
  activeCrisis: CrisisPreset | null;
  hasModifications: boolean;
  onTriggerCrisis: (preset: CrisisPreset) => void;
  onResetDemo: () => void;
  onOpenMobileMenu: () => void;
}

const VIEW_BREADCRUMBS: Record<AppView, { section: string; title: string }> = {
  dashboard: { section: 'Ranchi Network · JH', title: 'Executive Command Dashboard' },
  matching: { section: 'Coordination', title: 'AI Shortage Matching & Transfers' },
  inventory: { section: 'Supply Ledger', title: 'Expiry-Aware Inventory Matrix' },
  forecasting: { section: 'Predictive Analytics', title: 'Demand Forecasting & Surge Lab' },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  crisisPresets,
  activeCrisis,
  hasModifications,
  onTriggerCrisis,
  onResetDemo,
  onOpenMobileMenu,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const current = VIEW_BREADCRUMBS[activeView];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Breadcrumb / Context */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
              <span>HemoPulse AI</span>
              <span aria-hidden="true">/</span>
              <span>{current.section}</span>
            </div>
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
              {current.title}
            </h1>
          </div>
        </div>

        {/* Right: Simulate Crisis Event & Reset Demo Data */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                activeCrisis
                  ? 'bg-[#E11D48] text-white hover:bg-rose-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <Siren className="h-4 w-4 shrink-0" />
              <span>{activeCrisis ? `Active: ${activeCrisis.shortLabel}` : 'Simulate Crisis Event'}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-lg py-2 z-50"
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-900">
                    Stress-Test Regional Blood Network
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Select a crisis preset to spike burn rates and recalculate AI alerts.
                  </div>
                </div>
                <div className="py-1">
                  {crisisPresets.map((preset) => {
                    const isSelected = activeCrisis?.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onTriggerCrisis(preset);
                          setMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 ${
                          isSelected ? 'bg-rose-50/70' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-[#E11D48]' : 'text-slate-900'}`}>
                            {preset.name}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onResetDemo}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
              hasModifications
                ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};
