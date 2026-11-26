import React, { useState } from 'react';
import { Building2, Droplets, MapPin, Navigation } from 'lucide-react';
import {
  CrisisPreset,
  HospitalFacility,
  RiskLevel,
  TransferDispatch,
} from '../types/blood';
import {
  getFacilityExpiringUnits,
  getFacilityOverallRisk,
  getFacilityTotalUnits,
} from '../utils/predictiveEngine';
import { ROUTE_MATRIX } from '../data/networkData';

interface RegionalGeoMapProps {
  facilities: HospitalFacility[];
  activeTransfers: TransferDispatch[];
  selectedFacilityId: string | null;
  activeCrisis: CrisisPreset | null;
  onSelectFacility: (facilityId: string) => void;
}

const RISK_COLORS: Record<RiskLevel, { fill: string; stroke: string; label: string; text: string }> = {
  critical: {
    fill: '#E11D48',
    stroke: '#FFE4E6',
    label: 'Critical (<36h)',
    text: 'text-[#E11D48]',
  },
  warning: {
    fill: '#F59E0B',
    stroke: '#FEF3C7',
    label: 'Warning / Expiring',
    text: 'text-amber-600',
  },
  optimal: {
    fill: '#10B981',
    stroke: '#D1FAE5',
    label: 'Optimal Reserve',
    text: 'text-[#10B981]',
  },
};

export const RegionalGeoMap: React.FC<RegionalGeoMapProps> = ({
  facilities,
  activeTransfers,
  selectedFacilityId,
  activeCrisis,
  onSelectFacility,
}) => {
  const [hoveredFacilityId, setHoveredFacilityId] = useState<string | null>(null);

  const inTransitTransfers = activeTransfers.filter((t) => t.status === 'in_transit');

  const facilityMap = new Map(facilities.map((f) => [f.id, f]));

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Regional Network Geo-Map
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any hospital or depot node to inspect 8-group blood inventory &amp; batch expiry
          </p>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          {(['critical', 'warning', 'optimal'] as RiskLevel[]).map((level) => (
            <div key={level} className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: RISK_COLORS[level].fill }}
              />
              <span>{RISK_COLORS[level].label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block w-4 border-t-2 border-dashed border-sky-600" />
            <span>Active Transfer</span>
          </div>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative bg-slate-50/70 p-3 sm:p-4">
        <svg
          viewBox="0 0 960 560"
          className="w-full h-auto max-h-[430px] rounded-lg border border-slate-200/80 bg-[#F8FAFC]"
          role="img"
          aria-label="Interactive regional hospital and blood bank network map"
        >
          <defs>
            <pattern id="clinicalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.7" />
            </pattern>
            <marker
              id="transferArrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#0284C7" />
            </marker>
          </defs>

          {/* Subtle grid background */}
          <rect width="960" height="560" fill="url(#clinicalGrid)" />

          {/* Stylized Ranchi geography: Subarnarekha / Harmu waterway & NH-33 / Ring Road */}
          <path
            d="M 850 0 C 835 130, 880 260, 865 390 C 855 470, 895 520, 915 560 L 960 560 L 960 0 Z"
            fill="#E0F2FE"
            opacity="0.55"
          />
          <path
            d="M 110 215 Q 340 165 535 280 T 830 220"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M 465 55 Q 515 260 665 495"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.45"
          />
          <ellipse
            cx="485"
            cy="285"
            rx="300"
            ry="195"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="2.5"
            strokeDasharray="8 6"
            opacity="0.6"
          />

          {/* District topographic labels */}
          <text x="45" y="42" className="fill-slate-400 text-[11px] font-medium">
            RANCHI METRO BLOOD CORRIDOR · JHARKHAND (NH-33 / RING ROAD)
          </text>
          <text x="45" y="535" className="fill-slate-400 text-[10px] font-mono">
            RANCHI GRID · LIVE AMBULANCE DISPATCH TELEMETRY
          </text>

          {/* Static baseline network edges */}
          {ROUTE_MATRIX.map((edge) => {
            const from = facilityMap.get(edge.fromId);
            const to = facilityMap.get(edge.toId);
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.fromId}-${edge.toId}`}
                x1={from.coordinates.x}
                y1={from.coordinates.y}
                x2={to.coordinates.x}
                y2={to.coordinates.y}
                stroke="#CBD5E1"
                strokeWidth="1.25"
                opacity="0.7"
              />
            );
          })}

          {/* Active Animated Transfer Routes */}
          {inTransitTransfers.map((transfer) => {
            const from = facilityMap.get(transfer.fromFacilityId);
            const to = facilityMap.get(transfer.toFacilityId);
            if (!from || !to) return null;

            const midX = (from.coordinates.x + to.coordinates.x) / 2;
            const midY = (from.coordinates.y + to.coordinates.y) / 2 - 28;
            const pathD = `M ${from.coordinates.x} ${from.coordinates.y} Q ${midX} ${midY} ${to.coordinates.x} ${to.coordinates.y}`;

            // Calculate approximate point along quadratic bezier for transit progress
            const t = Math.min(0.9, Math.max(0.15, transfer.elapsedMinutes / Math.max(1, transfer.transitMinutes)));
            const px =
              (1 - t) * (1 - t) * from.coordinates.x +
              2 * (1 - t) * t * midX +
              t * t * to.coordinates.x;
            const py =
              (1 - t) * (1 - t) * from.coordinates.y +
              2 * (1 - t) * t * midY +
              t * t * to.coordinates.y;

            return (
              <g key={transfer.id}>
                <path
                  d={pathD}
                  fill="none"
                  stroke="#BAE6FD"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.65"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2.5"
                  strokeDasharray="7 5"
                  className="animate-route-dash"
                  markerEnd="url(#transferArrow)"
                />
                {/* Moving courier tag */}
                <g transform={`translate(${px}, ${py})`}>
                  <circle r="10" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
                  <rect
                    x="13"
                    y="-12"
                    width="82"
                    height="22"
                    rx="5"
                    fill="#0F172A"
                    opacity="0.92"
                  />
                  <text
                    x="20"
                    y="2.5"
                    fill="#FFFFFF"
                    className="text-[10.5px] font-mono font-semibold"
                  >
                    {transfer.units}u {transfer.bloodGroup}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Hospital & Blood Bank Nodes */}
          {facilities.map((fac) => {
            const risk = getFacilityOverallRisk(fac, activeCrisis);
            const totalUnits = getFacilityTotalUnits(fac);
            const expiringUnits = getFacilityExpiringUnits(fac);
            const isSelected = selectedFacilityId === fac.id;
            const isHovered = hoveredFacilityId === fac.id;
            const palette = RISK_COLORS[risk];

            // Position label cleanly depending on node location
            const labelBelow = fac.coordinates.y < 360;
            const labelY = labelBelow ? fac.coordinates.y + 38 : fac.coordinates.y - 46;

            return (
              <g
                key={fac.id}
                className="cursor-pointer"
                onClick={() => onSelectFacility(fac.id)}
                onMouseEnter={() => setHoveredFacilityId(fac.id)}
                onMouseLeave={() => setHoveredFacilityId(null)}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${fac.name}, status ${palette.label}, ${totalUnits} total units`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectFacility(fac.id);
                  }
                }}
              >
                {/* Selection ring */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={fac.coordinates.x}
                    cy={fac.coordinates.y}
                    r={isSelected ? 30 : 27}
                    fill="none"
                    stroke={isSelected ? '#0F172A' : '#64748B'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={isSelected ? undefined : '4 3'}
                  />
                )}

                {/* Outer halo */}
                <circle
                  cx={fac.coordinates.x}
                  cy={fac.coordinates.y}
                  r="22"
                  fill={palette.stroke}
                  stroke={palette.fill}
                  strokeWidth="2.5"
                />

                {/* Inner solid core */}
                <circle
                  cx={fac.coordinates.x}
                  cy={fac.coordinates.y}
                  r="13"
                  fill={palette.fill}
                />

                {/* Node Unit Count */}
                <text
                  x={fac.coordinates.x}
                  y={fac.coordinates.y + 3.5}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  className="text-[10px] font-mono font-bold pointer-events-none"
                >
                  {fac.type === 'blood_bank' ? 'BB' : 'H'}
                </text>

                {/* Label plate */}
                <g transform={`translate(${fac.coordinates.x}, ${labelY})`}>
                  <rect
                    x="-82"
                    y="-13"
                    width="164"
                    height="36"
                    rx="6"
                    fill="#FFFFFF"
                    stroke={isSelected ? '#0F172A' : '#CBD5E1'}
                    strokeWidth={isSelected ? '1.5' : '1'}
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    fill="#0F172A"
                    className="text-[11px] font-semibold"
                  >
                    {fac.shortName}
                  </text>
                  <text
                    x="0"
                    y="15"
                    textAnchor="middle"
                    fill="#475569"
                    className="text-[10px] font-mono"
                  >
                    {totalUnits}u total{expiringUnits > 0 ? ` · ${expiringUnits}u exp` : ''}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Bottom quick-select bar for accessibility & rapid navigation */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {facilities.map((fac) => {
              const risk = getFacilityOverallRisk(fac, activeCrisis);
              const isSelected = fac.id === selectedFacilityId;
              return (
                <button
                  key={fac.id}
                  type="button"
                  onClick={() => onSelectFacility(fac.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {fac.type === 'blood_bank' ? (
                    <Droplets className="h-3 w-3 shrink-0" />
                  ) : (
                    <Building2 className="h-3 w-3 shrink-0" />
                  )}
                  <span>{fac.shortName}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      risk === 'critical'
                        ? 'bg-[#E11D48]'
                        : risk === 'warning'
                        ? 'bg-[#F59E0B]'
                        : 'bg-[#10B981]'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {inTransitTransfers.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-sky-700 font-medium whitespace-nowrap">
              <Navigation className="h-3.5 w-3.5 shrink-0" />
              <span>
                {inTransitTransfers[0].fromFacilityName.split(' ')[0]} →{' '}
                {inTransitTransfers[0].toFacilityName.split(' ')[0]} (
                {Math.max(1, inTransitTransfers[0].transitMinutes - inTransitTransfers[0].elapsedMinutes)}m ETA)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
