import { useRef, useState, useMemo, useCallback } from "react";
import type { BlocEntry } from "../types";
import { stanceToRel, REL_META } from "../types";
import { countryIsInRegion, getCountry, getCountryPolygon, project } from "../lib/countries";

// Compact world land outline (continents simplified) — clean, fast, no GeoJSON dep
const WORLD_PATHS = [
  // Africa
  "M 480 230 Q 460 220 470 250 L 475 290 Q 480 320 500 340 L 530 360 Q 555 365 565 340 L 580 300 Q 595 270 575 250 L 540 230 L 510 220 Z",
  // Eurasia main
  "M 440 130 Q 470 120 510 130 L 590 130 Q 660 130 720 140 L 800 150 Q 850 160 870 175 L 870 200 Q 850 215 810 220 L 730 218 L 660 215 L 590 210 L 530 200 L 470 190 Q 440 175 440 150 Z",
  // Indian subcontinent
  "M 700 200 L 720 200 L 730 230 L 720 245 L 700 240 Z",
  // SE Asia + Indonesia
  "M 770 230 L 800 235 L 815 250 L 825 265 L 840 270 L 845 280 L 815 285 L 790 275 L 775 255 Z",
  // Australia
  "M 830 320 L 880 315 L 905 330 L 905 355 L 875 365 L 845 355 L 830 340 Z",
  // North America
  "M 130 130 Q 110 140 100 165 L 95 195 Q 100 220 130 240 L 175 250 L 220 245 L 250 230 L 270 200 L 280 175 L 260 145 L 220 130 L 175 125 Z",
  // Central America
  "M 220 260 L 250 265 L 260 280 L 250 295 L 230 285 Z",
  // South America
  "M 270 290 Q 255 300 260 325 L 270 360 Q 280 395 295 410 L 305 395 L 310 360 L 305 325 L 295 300 L 285 290 Z",
  // UK + Ireland
  "M 425 165 L 440 162 L 442 178 L 432 182 L 423 175 Z",
  // Japan
  "M 855 195 L 870 200 L 875 215 L 865 220 L 855 210 Z",
  // Iceland
  "M 410 130 L 425 128 L 425 138 L 415 140 Z",
  // New Zealand
  "M 925 365 L 935 370 L 935 380 L 925 380 Z",
];

interface WorldMapProps {
  entries: BlocEntry[];
  ownCountry: string;
  onSelect: (country: string | null) => void;
  selected: string | null;
  filter?: "all" | "ally" | "neutral" | "opponent" | "swing";
  region?: "all" | "africa" | "americas" | "asia" | "europe" | "oceania";
  showInfluence?: boolean;
}

export default function WorldMap({ entries, ownCountry, onSelect, selected, filter = "all", region = "all", showInfluence = false }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Filter entries by stance and region
  const visible = useMemo(() => {
    return entries.filter((e) => {
      if (!getCountry(e.country)) return false;
      if (e.visible === false) return false;
      if (!countryIsInRegion(e.country, region)) return false;
      if (filter !== "all" && e.stance !== filter) return false;
      return true;
    });
  }, [entries, filter, region]);

  // Own country info
  const ownInfo = useMemo(() => ownCountry ? getCountry(ownCountry) : undefined, [ownCountry]);

  // Coordinate scale based on the view
  const baseSvgW = 1000, baseSvgH = 500;

  const handleClick = useCallback(() => {
    if (hovered) {
      onSelect(hovered === selected ? null : hovered);
    } else {
      onSelect(null);
    }
  }, [hovered, selected, onSelect]);

  const hoveredEntry = hovered ? entries.find((e) => e.country.toLowerCase() === hovered.toLowerCase()) : null;
  const hoveredInfo = hovered ? getCountry(hovered) : null;

  // Build curved alliance/relationship lines from own country
  const relationLines = useMemo(() => {
    if (!ownInfo) return [];
    const [ox, oy] = project(ownInfo.lat, ownInfo.lng, baseSvgW, baseSvgH);
    return visible.map((e) => {
      const info = getCountry(e.country);
      const polygon = getCountryPolygon(e.country, baseSvgW, baseSvgH);
      if (!info || !polygon) return null;
      const { x: tx, y: ty } = polygon.centroid;
      const rel = stanceToRel(e.stance, e.supportLevel);
      const meta = REL_META[rel];
      // Curved path (arc above the line)
      const mx = (ox + tx) / 2;
      const my = (oy + ty) / 2 - Math.abs(tx - ox) * 0.15;
      const dash = rel === "opponent" ? "6,4" : rel === "uncertain" ? "3,3" : rel === "neutral" ? "2,4" : "";
      const width = rel === "strong_ally" ? 1.8 : rel === "opponent" ? 1.6 : 1;
      return {
        d: `M ${ox} ${oy} Q ${mx} ${my} ${tx} ${ty}`,
        color: meta.fill,
        dash, width,
        id: e.id,
        rel,
        country: e.country,
        ox, oy, tx, ty,
      };
    }).filter(Boolean) as Array<{ d: string; color: string; dash: string; width: number; id: string; rel: string; country: string; ox: number; oy: number; tx: number; ty: number }>;
  }, [visible, ownInfo]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[320px] relative">
      <svg ref={svgRef}
        viewBox={`0 0 ${baseSvgW} ${baseSvgH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        onMouseMove={() => undefined}
        onClick={handleClick}
        onMouseLeave={() => setHovered(null)}
        style={{ cursor: hovered ? "pointer" : "default", display: "block" }}>

        <defs>
          <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#0a1020" />
          </linearGradient>
          <radialGradient id="ownGlow">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ocean background */}
        <rect width={baseSvgW} height={baseSvgH} fill="url(#oceanGrad)" rx="6" />

        {/* Latitude/longitude grid */}
        {[-60, -30, 0, 30, 60].map((lat) => {
          const [, y] = project(lat, 0, baseSvgW, baseSvgH);
          return <line key={`lat${lat}`} x1={0} y1={y} x2={baseSvgW} y2={y} stroke="#1a2540" strokeWidth={0.5} />;
        })}
        {[-150, -120, -90, -60, -30, 30, 60, 90, 120, 150].map((lng) => {
          const [x] = project(0, lng, baseSvgW, baseSvgH);
          return <line key={`lng${lng}`} x1={x} y1={0} x2={x} y2={baseSvgH} stroke="#1a2540" strokeWidth={0.5} />;
        })}

        {/* Equator emphasized */}
        <line x1={0} y1={baseSvgH / 2} x2={baseSvgW} y2={baseSvgH / 2} stroke="#1e2a42" strokeWidth={0.8} strokeDasharray="4,4" />

        {/* Continents */}
        {WORLD_PATHS.map((p, i) => (
          <path key={i} d={p} fill="#1e2738" stroke="#2a3654" strokeWidth={1} />
        ))}

        {/* Influence radius for own country */}
        {showInfluence && ownInfo && (() => {
          const [ox, oy] = project(ownInfo.lat, ownInfo.lng, baseSvgW, baseSvgH);
          const allyCount = entries.filter((e) => e.stance === "ally").length;
          const radius = 50 + allyCount * 15;
          return <circle cx={ox} cy={oy} r={radius} fill="#3b82f6" opacity={0.05} stroke="#3b82f6" strokeOpacity={0.2} strokeWidth={1} strokeDasharray="3,4" />;
        })()}

        {/* Curved relationship lines */}
        {relationLines.map((line) => {
          const isHi = hovered === line.country || selected === line.country;
          return (
            <g key={line.id}>
              <path d={line.d} fill="none"
                stroke={line.color}
                strokeOpacity={isHi ? 0.95 : 0.45}
                strokeWidth={isHi ? line.width + 1 : line.width}
                strokeDasharray={line.dash}
                strokeLinecap="round" />
              {/* Pulse for strong allies */}
              {(line.rel === "strong_ally" || line.rel === "opponent") && (
                <circle r={2.5} fill={line.color} opacity={0.7}>
                  <animateMotion dur={line.rel === "opponent" ? "2.5s" : "3s"} repeatCount="indefinite" path={line.d} />
                </circle>
              )}
            </g>
          );
        })}

        {/* Tracked country polygons. Only user-added registry entries render. */}
        {visible.map((entry) => {
          const info = getCountry(entry.country);
          const polygon = getCountryPolygon(entry.country, baseSvgW, baseSvgH);
          if (!info || !polygon) return null;
          const { x: cx, y: cy } = polygon.centroid;
          const rel = stanceToRel(entry.stance, entry.supportLevel);
          const meta = REL_META[rel];
          const isHi = hovered === entry.country;
          const isSel = selected === entry.country;

          return (
            <g
              key={entry.id}
              onMouseEnter={() => setHovered(entry.country)}
              onMouseLeave={() => setHovered(null)}
              onClick={(event) => { event.stopPropagation(); onSelect(selected === entry.country ? null : entry.country); }}
              className="cursor-pointer"
            >
              {(isHi || isSel) && <path d={polygon.path} fill={meta.fill} opacity={0.28} stroke={meta.fill} strokeWidth={5} strokeLinejoin="round" />}
              <path
                d={polygon.path}
                fill={meta.fill}
                fillOpacity={isSel ? 0.58 : isHi ? 0.48 : 0.32}
                stroke={isSel ? "#ffffff" : meta.fill}
                strokeOpacity={isSel || isHi ? 1 : 0.8}
                strokeWidth={isSel ? 2.2 : isHi ? 1.8 : 1.2}
                strokeLinejoin="round"
              />
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13">{info.flag}</text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="#d1d5db" fontWeight={isSel ? "700" : "500"}>{info.iso}</text>
            </g>
          );
        })}

        {/* Own country emphasized */}
        {ownInfo && (() => {
          const [cx, cy] = project(ownInfo.lat, ownInfo.lng, baseSvgW, baseSvgH);
          return (
            <g>
              <circle cx={cx} cy={cy} r={22} fill="url(#ownGlow)" />
              <circle cx={cx} cy={cy} r={10} fill="#3b82f6" stroke="#60a5fa" strokeWidth={2} />
              <circle cx={cx} cy={cy} r={14} fill="none" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="3,2">
                <animate attributeName="r" values="14;18;14" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <text x={cx} y={cy - 18} textAnchor="middle" fontSize="14">{ownInfo.flag}</text>
              <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fill="#93c5fd" fontWeight="bold">{ownInfo.name}</text>
            </g>
          );
        })()}
      </svg>

      {/* Hover tooltip */}
      {hovered && hoveredInfo && (
        <div className="absolute top-2 right-2 bg-gray-950/95 border border-gray-700/60 rounded-lg px-3 py-2 pointer-events-none z-10 min-w-[180px] backdrop-blur-sm shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{hoveredInfo.flag}</span>
            <span className="text-sm font-semibold text-white">{hoveredInfo.name}</span>
          </div>
          <div className="text-[10px] text-gray-500">{hoveredInfo.defaultBloc || "Unaffiliated"} · {hoveredInfo.iso}</div>
          {hoveredEntry && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-800/50 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: REL_META[stanceToRel(hoveredEntry.stance, hoveredEntry.supportLevel)].fill }} />
                <span className={`text-[10px] font-medium ${REL_META[stanceToRel(hoveredEntry.stance, hoveredEntry.supportLevel)].color}`}>
                  {REL_META[stanceToRel(hoveredEntry.stance, hoveredEntry.supportLevel)].label}
                </span>
              </div>
              <div className="text-[10px] text-gray-400">Support: {hoveredEntry.supportLevel}% · Risk: {hoveredEntry.riskLevel}%</div>
              {hoveredEntry.notes && <div className="text-[10px] text-gray-500 italic line-clamp-2">{hoveredEntry.notes}</div>}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-3xl mb-2 opacity-40">🌐</div>
            <p className="text-gray-600 text-xs">Add countries in Relationships to see them on the map</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 bg-gray-950/90 rounded-md px-2.5 py-1.5 border border-gray-800/60 backdrop-blur-sm">
        {(["strong_ally", "likely_ally", "neutral", "uncertain", "opponent"] as const).map((key) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: REL_META[key].fill }} />
            <span className="text-[9px] text-gray-400">{REL_META[key].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-gray-800">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[9px] text-gray-400">You</span>
        </div>
      </div>
    </div>
  );
}
