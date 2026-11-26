import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BLOOD_GROUPS, BloodGroup, CrisisPreset, ForecastPoint } from '../types/blood';

interface PredictiveForecastChartProps {
  data: ForecastPoint[];
  selectedBloodGroup: BloodGroup | 'ALL';
  onChangeBloodGroup: (group: BloodGroup | 'ALL') => void;
  activeCrisis: CrisisPreset | null;
}

export const PredictiveForecastChart: React.FC<PredictiveForecastChartProps> = ({
  data,
  selectedBloodGroup,
  onChangeBloodGroup,
  activeCrisis,
}) => {
  const crossoverPoint = data.find((d) => d.isCrossoverDay);
  const thresholdValue = data[0]?.shortageThreshold ?? 0;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            7-Day Predictive Supply vs. Demand Forecast
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeCrisis
              ? `Adjusted for ${activeCrisis.shortLabel} burn surge`
              : 'Incorporates 14-day consumption velocity, seasonal multiplier & batch expiry decay'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <label htmlFor="forecast-blood-group" className="text-xs font-medium text-slate-600">
            Blood Group
          </label>
          <select
            id="forecast-blood-group"
            value={selectedBloodGroup}
            onChange={(e) => onChangeBloodGroup(e.target.value as BloodGroup | 'ALL')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="ALL">All Blood Groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Crossover Callout Strip */}
      <div className="mt-3 mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-500" />
            Available Network Supply
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-slate-900" />
            50-Hr Rolling Demand Envelope
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-[#E11D48]" />
            Shortage Threshold ({thresholdValue}u)
          </span>
        </div>

        {crossoverPoint ? (
          <span className="font-mono tabular-nums text-xs font-semibold text-[#E11D48]">
            Shortage Crossover: {crossoverPoint.day} ({crossoverPoint.availableSupply}u)
          </span>
        ) : (
          <span className="font-mono tabular-nums text-xs font-medium text-emerald-700">
            Supply remains above 48h safety threshold across 7 days
          </span>
        )}
      </div>

      {/* Chart Viewport */}
      <div className="h-[280px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 18, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="supplyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              width={44}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#F8FAFC',
              }}
              labelStyle={{ color: '#CBD5E1', fontWeight: 600, marginBottom: '4px' }}
              formatter={(value, name) => [
                `${value ?? 0} units`,
                name === 'availableSupply'
                  ? 'Available Supply'
                  : name === 'projectedDemand'
                  ? 'Projected Demand Envelope'
                  : 'Shortage Threshold',
              ]}
            />
            <ReferenceLine
              y={thresholdValue}
              stroke="#E11D48"
              strokeDasharray="5 4"
              strokeWidth={1.75}
              label={{
                value: 'Shortage Threshold',
                position: 'insideTopRight',
                fill: '#E11D48',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Area
              type="monotone"
              dataKey="availableSupply"
              stroke="#10B981"
              strokeWidth={2.5}
              fill="url(#supplyGradient)"
              name="availableSupply"
            />
            <Line
              type="monotone"
              dataKey="projectedDemand"
              stroke="#0F172A"
              strokeWidth={2}
              dot={{ r: 3, fill: '#0F172A' }}
              name="projectedDemand"
            />
            {crossoverPoint && (
              <ReferenceDot
                x={crossoverPoint.day}
                y={crossoverPoint.availableSupply}
                r={6}
                fill="#E11D48"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
