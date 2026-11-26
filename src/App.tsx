import React, { useEffect, useMemo, useState } from 'react';
import {
  CRISIS_PRESETS,
  INITIAL_FACILITIES,
  INITIAL_TRANSFERS,
} from './data/networkData';
import {
  AppView,
  BLOOD_GROUPS,
  BloodGroup,
  CrisisPreset,
  HospitalFacility,
  ShortageAlert,
  TransferDispatch,
} from './types/blood';
import {
  build7DayForecast,
  computeNetworkAlerts,
  executeFefoTransfer,
  generateTacticalBriefing,
  getEffectiveDailyBurn,
  getEntryUnits,
  getExpiringUnitsUnder5Days,
  getFacilityExpiringUnits,
  getFacilityTotalUnits,
  getHoursUntilDepletion,
} from './utils/predictiveEngine';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { KpiCards } from './components/KpiCards';
import { RegionalGeoMap } from './components/RegionalGeoMap';
import { HospitalDetailDrawer } from './components/HospitalDetailDrawer';
import { TacticalBriefingPanel } from './components/TacticalBriefingPanel';
import { PredictiveForecastChart } from './components/PredictiveForecastChart';
import { AlertsFeed } from './components/AlertsFeed';
import { SmartAllocationModal } from './components/SmartAllocationModal';
import { InventoryMatrix } from './components/InventoryMatrix';
import { TransferTracker } from './components/TransferTracker';
import { ForecastingLab } from './components/ForecastingLab';
import { ToastContainer, ToastMessage } from './components/ToastContainer';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [facilities, setFacilities] = useState<HospitalFacility[]>(() =>
    structuredClone(INITIAL_FACILITIES)
  );
  const [transfers, setTransfers] = useState<TransferDispatch[]>(() =>
    structuredClone(INITIAL_TRANSFERS)
  );
  const [activeCrisis, setActiveCrisis] = useState<CrisisPreset | null>(null);
  const [hasModifications, setHasModifications] = useState(false);

  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [forecastBloodGroup, setForecastBloodGroup] = useState<BloodGroup | 'ALL'>('ALL');
  const [activeMatchAlert, setActiveMatchAlert] = useState<ShortageAlert | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  };

  // Gentle real-time transit progress tick for active ambulance transfers
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTransfers((prev) => {
        const hasActive = prev.some((t) => t.status === 'in_transit');
        if (!hasActive) return prev;
        return prev.map((t) => {
          if (t.status !== 'in_transit') return t;
          const nextElapsed = t.elapsedMinutes + 1;
          if (nextElapsed >= t.transitMinutes) {
            return { ...t, elapsedMinutes: t.transitMinutes, status: 'delivered' };
          }
          return { ...t, elapsedMinutes: nextElapsed };
        });
      });
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  // Derived analytics
  const alerts = useMemo(
    () => computeNetworkAlerts(facilities, activeCrisis),
    [facilities, activeCrisis]
  );

  const forecastData = useMemo(
    () => build7DayForecast(facilities, forecastBloodGroup, activeCrisis),
    [facilities, forecastBloodGroup, activeCrisis]
  );

  const briefing = useMemo(
    () => generateTacticalBriefing(facilities, alerts, activeCrisis),
    [facilities, alerts, activeCrisis]
  );

  const kpis = useMemo(() => {
    let totalUnits = 0;
    let dailyBurnTotal = 0;
    let expiringUnitsCount = 0;

    for (const fac of facilities) {
      totalUnits += getFacilityTotalUnits(fac);
      expiringUnitsCount += getFacilityExpiringUnits(fac);
      for (const bg of BLOOD_GROUPS) {
        dailyBurnTotal += getEffectiveDailyBurn(fac.inventory[bg], fac.id, activeCrisis);
      }
    }

    const shortageAlerts = alerts.filter((a) => a.kind === 'shortage');
    const criticalAlertsCount = shortageAlerts.filter((a) => a.severity === 'critical').length;
    const warningAlertsCount = shortageAlerts.filter((a) => a.severity === 'warning').length;

    const inTransit = transfers.filter((t) => t.status === 'in_transit');
    const activeTransfersCount = inTransit.length;
    const unitsInTransit = inTransit.reduce((sum, t) => sum + t.units, 0);

    return {
      totalUnits,
      dailyBurnTotal,
      criticalAlertsCount,
      warningAlertsCount,
      expiringUnitsCount,
      activeTransfersCount,
      unitsInTransit,
    };
  }, [facilities, alerts, transfers, activeCrisis]);

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === selectedFacilityId) ?? null,
    [facilities, selectedFacilityId]
  );

  // Handlers
  const handleTriggerCrisis = (preset: CrisisPreset) => {
    const freshFacilities: HospitalFacility[] = structuredClone(INITIAL_FACILITIES);

    if (preset.facilityStockReductions) {
      for (const [facId, reductions] of Object.entries(preset.facilityStockReductions)) {
        const fac = freshFacilities.find((f) => f.id === facId);
        if (!fac) continue;
        for (const [bg, keepRatio] of Object.entries(reductions)) {
          const entry = fac.inventory[bg as BloodGroup];
          if (!entry || keepRatio === undefined) continue;
          entry.batches = entry.batches.map((b) => ({
            ...b,
            units: Math.max(1, Math.round(b.units * keepRatio)),
          }));
        }
      }
    }

    setFacilities(freshFacilities);
    setActiveCrisis(preset);
    setHasModifications(true);

    // Focus forecast chart on the primary impacted blood group
    const primaryBg = Object.keys(preset.bloodGroupMultipliers)[0] as BloodGroup | undefined;
    if (primaryBg) {
      setForecastBloodGroup(primaryBg);
    }

    pushToast({
      title: `Crisis Simulation Active: ${preset.shortLabel}`,
      detail: preset.description,
      tone: 'warning',
    });
  };

  const handleResetDemo = () => {
    setFacilities(structuredClone(INITIAL_FACILITIES));
    setTransfers(structuredClone(INITIAL_TRANSFERS));
    setActiveCrisis(null);
    setHasModifications(false);
    setForecastBloodGroup('ALL');
    setActiveMatchAlert(null);
    setSelectedFacilityId(null);

    pushToast({
      title: 'Ranchi Network Reset to Baseline',
      detail: 'All 6 Ranchi facilities, batch expiry ledgers, and burn rates restored to initial state.',
      tone: 'info',
    });
  };

  const handleTriggerMatchForPool = (facilityId: string, bloodGroup: BloodGroup) => {
    const existingAlert = alerts.find(
      (a) => a.facilityId === facilityId && a.bloodGroup === bloodGroup
    );
    if (existingAlert) {
      setActiveMatchAlert(existingAlert);
      return;
    }

    // Build synthetic alert if user clicked AI Match directly from a borderline pool
    const fac = facilities.find((f) => f.id === facilityId);
    if (!fac) return;
    const entry = fac.inventory[bloodGroup];
    const units = getEntryUnits(entry);
    const burn = getEffectiveDailyBurn(entry, fac.id, activeCrisis);
    const hours = getHoursUntilDepletion(units, burn);
    const expiring = getExpiringUnitsUnder5Days(entry);

    setActiveMatchAlert({
      id: `manual-${facilityId}-${bloodGroup}`,
      kind: expiring >= 10 && hours > 96 ? 'expiry' : 'shortage',
      severity: hours < 36 ? 'critical' : 'warning',
      facilityId: fac.id,
      facilityName: fac.name,
      bloodGroup,
      currentUnits: units,
      hoursUntilDepletion: hours,
      expiringUnitsUnder5d: expiring,
      earliestExpiryDays: Math.min(...entry.batches.map((b) => b.expiresInDays)),
      effectiveDailyBurn: burn,
      headline: `${fac.name} · ${bloodGroup} Rebalance`,
      rationale: `Current stock ${units}u at ${burn.toFixed(1)}u/day burn rate.`,
      recommendedUnits: Math.max(6, Math.ceil((burn / 24) * 96) - units),
      priorityScore: 500,
    });
  };

  const handleConfirmDispatch = (payload: {
    fromFacilityId: string;
    toFacilityId: string;
    bloodGroup: BloodGroup;
    units: number;
    fefoRescuedUnits: number;
    distanceKm: number;
    transitMinutes: number;
    reason: string;
  }) => {
    const { updatedFacilities, transferredUnits, fefoRescuedUnits } = executeFefoTransfer(
      facilities,
      payload.fromFacilityId,
      payload.toFacilityId,
      payload.bloodGroup,
      payload.units
    );

    if (transferredUnits <= 0) {
      pushToast({
        title: 'Transfer Could Not Be Completed',
        detail: 'Insufficient available batch units at donor facility.',
        tone: 'warning',
      });
      return;
    }

    const fromFac = facilities.find((f) => f.id === payload.fromFacilityId);
    const toFac = facilities.find((f) => f.id === payload.toFacilityId);

    const newDispatch: TransferDispatch = {
      id: `TRF-2611-${String(transfers.length + 5).padStart(2, '0')}`,
      createdAt: 'Just now',
      fromFacilityId: payload.fromFacilityId,
      fromFacilityName: fromFac?.name ?? payload.fromFacilityId,
      toFacilityId: payload.toFacilityId,
      toFacilityName: toFac?.name ?? payload.toFacilityId,
      bloodGroup: payload.bloodGroup,
      units: transferredUnits,
      fefoRescuedUnits,
      distanceKm: payload.distanceKm,
      transitMinutes: payload.transitMinutes,
      elapsedMinutes: 1,
      status: 'in_transit',
      reason: payload.reason,
    };

    setFacilities(updatedFacilities);
    setTransfers((prev) => [newDispatch, ...prev]);
    setHasModifications(true);
    setActiveMatchAlert(null);

    pushToast({
      title: `Dispatched ${transferredUnits}u ${payload.bloodGroup} (${newDispatch.id})`,
      detail: `${fromFac?.shortName} → ${toFac?.shortName} (${payload.transitMinutes} min ETA)${
        fefoRescuedUnits > 0 ? ` · ${fefoRescuedUnits} expiring FEFO units rescued` : ''
      }. Inventories updated.`,
      tone: 'success',
    });
  };

  const handleCompleteTransfer = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? { ...t, status: 'delivered', elapsedMinutes: t.transitMinutes }
          : t
      )
    );
    pushToast({
      title: `Transfer ${transferId} Marked Delivered`,
      detail: 'Cold-chain custody verified at receiving hospital blood bank.',
      tone: 'success',
    });
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        criticalAlertsCount={kpis.criticalAlertsCount}
        activeTransfersCount={kpis.activeTransfersCount}
        activeCrisis={activeCrisis}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeView={activeView}
          crisisPresets={CRISIS_PRESETS}
          activeCrisis={activeCrisis}
          hasModifications={hasModifications}
          onTriggerCrisis={handleTriggerCrisis}
          onResetDemo={handleResetDemo}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto space-y-6">
          {/* Active Crisis Notification Strip (only when crisis simulation active) */}
          {activeCrisis && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-rose-950">
                <span className="font-bold text-[#E11D48]">Simulation Active:</span>{' '}
                <span className="font-semibold">{activeCrisis.name}</span> — {activeCrisis.description}
              </div>
              <button
                type="button"
                onClick={handleResetDemo}
                className="text-xs font-semibold text-[#E11D48] hover:text-rose-800 underline underline-offset-2 whitespace-nowrap"
              >
                End Simulation &amp; Reset
              </button>
            </div>
          )}

          {activeView === 'dashboard' && (
            <>
              <KpiCards
                totalUnits={kpis.totalUnits}
                dailyBurnTotal={kpis.dailyBurnTotal}
                criticalAlertsCount={kpis.criticalAlertsCount}
                warningAlertsCount={kpis.warningAlertsCount}
                expiringUnitsCount={kpis.expiringUnitsCount}
                activeTransfersCount={kpis.activeTransfersCount}
                unitsInTransit={kpis.unitsInTransit}
                onCardClick={(target) => setActiveView(target)}
              />

              {/* Primary Operational Row: Geo-Map + AI Tactical Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-8 flex flex-col">
                  <RegionalGeoMap
                    facilities={facilities}
                    activeTransfers={transfers}
                    selectedFacilityId={selectedFacilityId}
                    activeCrisis={activeCrisis}
                    onSelectFacility={(id) => setSelectedFacilityId(id)}
                  />
                </div>
                <div className="lg:col-span-4 flex">
                  <TacticalBriefingPanel
                    headline={briefing.headline}
                    narrative={briefing.narrative}
                    actionInstruction={briefing.actionInstruction}
                    primaryAlert={briefing.primaryAlert}
                    activeCrisis={activeCrisis}
                    onResolvePrimary={(alert) => setActiveMatchAlert(alert)}
                  />
                </div>
              </div>

              {/* Secondary Analytics Row: Predictive Forecast + Prioritized Alerts Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7">
                  <PredictiveForecastChart
                    data={forecastData}
                    selectedBloodGroup={forecastBloodGroup}
                    onChangeBloodGroup={setForecastBloodGroup}
                    activeCrisis={activeCrisis}
                  />
                </div>
                <div className="lg:col-span-5">
                  <AlertsFeed
                    alerts={alerts}
                    onResolveAlert={(alert) => setActiveMatchAlert(alert)}
                    compact
                  />
                </div>
              </div>

              {/* Live Transfer Tracker & Full Matrix */}
              <TransferTracker
                transfers={transfers}
                onCompleteTransfer={handleCompleteTransfer}
              />

              <InventoryMatrix
                facilities={facilities}
                activeCrisis={activeCrisis}
                onTriggerMatch={handleTriggerMatchForPool}
              />
            </>
          )}

          {activeView === 'matching' && (
            <>
              <TacticalBriefingPanel
                headline={briefing.headline}
                narrative={briefing.narrative}
                actionInstruction={briefing.actionInstruction}
                primaryAlert={briefing.primaryAlert}
                activeCrisis={activeCrisis}
                onResolvePrimary={(alert) => setActiveMatchAlert(alert)}
              />
              <AlertsFeed
                alerts={alerts}
                onResolveAlert={(alert) => setActiveMatchAlert(alert)}
              />
              <TransferTracker
                transfers={transfers}
                onCompleteTransfer={handleCompleteTransfer}
              />
            </>
          )}

          {activeView === 'inventory' && (
            <InventoryMatrix
              facilities={facilities}
              activeCrisis={activeCrisis}
              onTriggerMatch={handleTriggerMatchForPool}
            />
          )}

          {activeView === 'forecasting' && (
            <>
              <PredictiveForecastChart
                data={forecastData}
                selectedBloodGroup={forecastBloodGroup}
                onChangeBloodGroup={setForecastBloodGroup}
                activeCrisis={activeCrisis}
              />
              <ForecastingLab facilities={facilities} activeCrisis={activeCrisis} />
            </>
          )}
        </main>
      </div>

      {/* Interactive Hospital Detail Inspector */}
      <HospitalDetailDrawer
        facility={selectedFacility}
        activeCrisis={activeCrisis}
        onClose={() => setSelectedFacilityId(null)}
        onTriggerMatch={(facId, bg) => {
          setSelectedFacilityId(null);
          handleTriggerMatchForPool(facId, bg);
        }}
      />

      {/* Smart Allocation Modal */}
      <SmartAllocationModal
        alert={activeMatchAlert}
        facilities={facilities}
        activeCrisis={activeCrisis}
        onClose={() => setActiveMatchAlert(null)}
        onConfirmDispatch={handleConfirmDispatch}
      />

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Floating Ask HemoPulse AI Copilot */}
      <AiCopilotDrawer
        facilities={facilities}
        alerts={alerts}
        transfers={transfers}
        activeCrisis={activeCrisis}
        onResolveAlert={(alert) => setActiveMatchAlert(alert)}
      />
    </div>
  );
}
