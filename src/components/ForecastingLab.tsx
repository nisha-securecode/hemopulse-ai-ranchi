import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BLOOD_GROUPS, BloodGroup, CrisisPreset, HospitalFacility } from '../types/blood';
import { getEffectiveDailyBurn, getEntryUnits, getHoursUntilDepletion } from '../utils/predictiveEngine';

interface ForecastingLabProps {
  facilities: HospitalFacility[];
  activeCrisis: CrisisPreset | null;
}

export const ForecastingLab: React.FC<ForecastingLabProps> = ({ facilities, activeCrisis }) => {
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>('O-');

  const historical14dChartData = useMemo(() => {
    const days: { day: string; networkBurn: number }[] = [];
    for (let i = 0; i < 14; i++) {
      let sum = 0;
      for (const fac of facilities) {
        sum += fac.inventory[selectedGroup].history14d[i] ?? 0;
      }
      days.push({
        day: `D-${14 - i}`,
        networkBurn: Number(sum.toFixed(1)),
      });
    }
    return days;
  }, [facilities, selectedGroup]);

  return (
    <div className="space-y-6">
      {/* 14-Day Historical Burn Chart */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              14-Day Historical Network Consumption Velocity
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregate daily unit transfusions across all 6 regional facilities for blood group {selectedGroup}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => setSelectedGroup(bg)}
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedGroup === bg
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[260px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historical14dChartData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#F8FAFC',
                }}
                formatter={(value) => [`${value ?? 0} units`, `${selectedGroup} Daily Burn`]}
              />
              <Bar dataKey="networkBurn" fill="#0F172A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Seasonal Multiplier & Facility Stress Comparison */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-bold text-slate-900">
            Seasonal Demand Multipliers &amp; Facility Runway ({selectedGroup})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeCrisis
              ? `Includes active crisis preset: ${activeCrisis.name}`
              : 'Baseline burn weighted by clinical seasonal demand factors'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 pl-5 pr-3">Facility</th>
                <th className="py-3 px-3 text-right">Current Stock</th>
                <th className="py-3 px-3 text-right">Base Burn</th>
                <th className="py-3 px-3 text-right">Seasonal Factor</th>
                <th className="py-3 px-3 text-right">Effective Burn</th>
                <th className="py-3 px-3 text-right">Runway</th>
                <th className="py-3 pl-3 pr-5">Primary Demand Driver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {facilities.map((fac) => {
                const entry = fac.inventory[selectedGroup];
                const units = getEntryUnits(entry);
                const effBurn = getEffectiveDailyBurn(entry, fac.id, activeCrisis);
                const hours = getHoursUntilDepletion(units, effBurn);

                return (
                  <tr key={fac.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pl-5 pr-3 font-medium text-slate-900">{fac.name}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {units}u
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {entry.baseDailyBurnRate.toFixed(1)}/d
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {entry.seasonalMultiplier.toFixed(2)}x
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {effBurn.toFixed(1)}/d
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                      <span
                        className={
                          hours < 36
                            ? 'text-[#E11D48]'
                            : hours < 72
                            ? 'text-amber-600'
                            : 'text-[#10B981]'
                        }
                      >
                        {Math.round(hours)} hrs
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-5 text-xs text-slate-600">{entry.seasonalReason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
