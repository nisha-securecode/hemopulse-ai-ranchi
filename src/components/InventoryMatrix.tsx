import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Search } from 'lucide-react';
import { BLOOD_GROUPS, BloodGroup, CrisisPreset, HospitalFacility, RiskLevel } from '../types/blood';
import {
  getEarliestExpiryDays,
  getEffectiveDailyBurn,
  getEntryRiskLevel,
  getEntryUnits,
  getExpiringUnitsUnder5Days,
  getHoursUntilDepletion,
} from '../utils/predictiveEngine';

interface InventoryMatrixProps {
  facilities: HospitalFacility[];
  activeCrisis: CrisisPreset | null;
  onTriggerMatch: (facilityId: string, bloodGroup: BloodGroup) => void;
}

interface MatrixRow {
  key: string;
  facilityId: string;
  facilityName: string;
  shortName: string;
  bloodGroup: BloodGroup;
  units: number;
  dailyBurn: number;
  seasonalMultiplier: number;
  hoursUntilDepletion: number;
  expiringUnder5d: number;
  earliestExpiryDays: number;
  risk: RiskLevel;
  batches: HospitalFacility['inventory'][BloodGroup]['batches'];
}

export const InventoryMatrix: React.FC<InventoryMatrixProps> = ({
  facilities,
  activeCrisis,
  onTriggerMatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'expiring' | 'optimal'>('all');
  const [sortBy, setSortBy] = useState<'hours' | 'expiry' | 'units' | 'burn'>('hours');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const rows: MatrixRow[] = useMemo(() => {
    const all: MatrixRow[] = [];
    for (const fac of facilities) {
      for (const bg of BLOOD_GROUPS) {
        const entry = fac.inventory[bg];
        const units = getEntryUnits(entry);
        const dailyBurn = getEffectiveDailyBurn(entry, fac.id, activeCrisis);
        const hours = getHoursUntilDepletion(units, dailyBurn);
        const expiringUnder5d = getExpiringUnitsUnder5Days(entry);
        const earliestExpiryDays = getEarliestExpiryDays(entry);
        const risk = getEntryRiskLevel(hours, expiringUnder5d);

        all.push({
          key: `${fac.id}-${bg}`,
          facilityId: fac.id,
          facilityName: fac.name,
          shortName: fac.shortName,
          bloodGroup: bg,
          units,
          dailyBurn,
          seasonalMultiplier: entry.seasonalMultiplier,
          hoursUntilDepletion: hours,
          expiringUnder5d,
          earliestExpiryDays,
          risk,
          batches: entry.batches,
        });
      }
    }
    return all;
  }, [facilities, activeCrisis]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (selectedFacility !== 'ALL' && row.facilityId !== selectedFacility) return false;
        if (selectedBloodGroup !== 'ALL' && row.bloodGroup !== selectedBloodGroup) return false;
        if (statusFilter === 'critical' && row.hoursUntilDepletion >= 72) return false;
        if (statusFilter === 'expiring' && row.expiringUnder5d === 0) return false;
        if (statusFilter === 'optimal' && (row.hoursUntilDepletion < 72 || row.expiringUnder5d > 0)) {
          return false;
        }
        if (q) {
          const matchesText =
            row.facilityName.toLowerCase().includes(q) ||
            row.bloodGroup.toLowerCase().includes(q) ||
            row.batches.some((b) => b.batchId.toLowerCase().includes(q));
          if (!matchesText) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'hours') return a.hoursUntilDepletion - b.hoursUntilDepletion;
        if (sortBy === 'expiry') return a.earliestExpiryDays - b.earliestExpiryDays;
        if (sortBy === 'units') return b.units - a.units;
        return b.dailyBurn - a.dailyBurn;
      });
  }, [rows, searchQuery, selectedFacility, selectedBloodGroup, statusFilter, sortBy]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header & Controls */}
      <div className="px-5 py-4 border-b border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Expiry-Aware Multi-Hospital Inventory Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Showing {filteredRows.length} of {rows.length} blood group pools across 6 regional facilities · Click any row to inspect batches
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'All Pools' },
                { id: 'critical', label: '<72h Runway' },
                { id: 'expiring', label: 'Expiring <5d' },
                { id: 'optimal', label: 'Optimal' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hospital, blood type, batch ID..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              aria-label="Search inventory matrix"
            />
          </div>

          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Filter by hospital or blood bank"
          >
            <option value="ALL">All 6 Facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value as BloodGroup | 'ALL')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Filter by blood group"
          >
            <option value="ALL">All 8 Blood Groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                Blood Group {bg}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'hours' | 'expiry' | 'units' | 'burn')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Sort inventory rows"
          >
            <option value="hours">Sort: Lowest Runway First</option>
            <option value="expiry">Sort: Earliest Expiry First (FEFO)</option>
            <option value="burn">Sort: Highest Daily Burn</option>
            <option value="units">Sort: Highest Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 pl-5 pr-3">Facility</th>
              <th className="py-3 px-3">Blood Group</th>
              <th className="py-3 px-3 text-right">Stock</th>
              <th className="py-3 px-3 text-right">Daily Burn</th>
              <th className="py-3 px-3 text-right">Hours Until Depletion</th>
              <th className="py-3 px-3">Expiry / Wastage Status</th>
              <th className="py-3 pl-3 pr-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                  No inventory pools match the current search and filter criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isExpanded = expandedKey === row.key;
                const isCritical = row.hoursUntilDepletion < 36;
                const isWarning = row.hoursUntilDepletion >= 36 && row.hoursUntilDepletion < 72;

                return (
                  <React.Fragment key={row.key}>
                    <tr
                      onClick={() => setExpandedKey(isExpanded ? null : row.key)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 pl-5 pr-3">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-medium text-slate-900">{row.facilityName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-900">{row.bloodGroup}</span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {row.units}u
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                        {row.dailyBurn.toFixed(1)}/d
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                        <span
                          className={
                            isCritical
                              ? 'text-[#E11D48]'
                              : isWarning
                              ? 'text-amber-600'
                              : 'text-[#10B981]'
                          }
                        >
                          {Math.round(row.hoursUntilDepletion)} hrs
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {row.expiringUnder5d > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 tabular-nums whitespace-nowrap">
                            <Clock className="h-3 w-3 shrink-0" />
                            Expiring Soon · {row.expiringUnder5d}u ({row.earliestExpiryDays.toFixed(1)}d)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono tabular-nums">
                            Earliest exp: {row.earliestExpiryDays.toFixed(1)}d
                          </span>
                        )}
                      </td>

                      <td className="py-3 pl-3 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        {row.hoursUntilDepletion < 72 || row.expiringUnder5d >= 10 ? (
                          <button
                            type="button"
                            onClick={() => onTriggerMatch(row.facilityId, row.bloodGroup)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                              isCritical
                                ? 'bg-[#E11D48] text-white hover:bg-rose-700'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            {row.hoursUntilDepletion < 72 ? 'AI Match' : 'FEFO Route'}
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700">Optimal</span>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/90">
                        <td colSpan={7} className="px-10 py-3 border-t border-slate-100">
                          <div className="text-xs font-semibold text-slate-700 mb-2">
                            Batch-Level Expiry Ledger ({row.facilityName} · {row.bloodGroup})
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {row.batches.map((b) => (
                              <div
                                key={b.batchId}
                                className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs font-mono tabular-nums"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">{b.batchId}</div>
                                  <div className="font-sans text-[11px] text-slate-500">
                                    {b.component} · Coll. {b.collectedDate}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-slate-900">{b.units}u</div>
                                  <div
                                    className={
                                      b.expiresInDays <= 5 ? 'text-amber-700 font-semibold' : 'text-slate-500'
                                    }
                                  >
                                    {b.expiresInDays.toFixed(1)}d left
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
