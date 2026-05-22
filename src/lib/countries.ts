// Country registry: ISO codes, coordinates (lat/lng), emoji flags, default blocs
// Lightweight — no API calls, no external data

export interface CountryInfo {
  name: string;
  iso: string;
  flag: string;
  lat: number;
  lng: number;
  defaultBloc?: string;
}

export interface CountryPolygon {
  path: string;
  centroid: { x: number; y: number };
  bounds: { x: number; y: number; w: number; h: number };
}

const COUNTRIES: CountryInfo[] = [
  { name: "United States", iso: "US", flag: "🇺🇸", lat: 39, lng: -98, defaultBloc: "Western" },
  { name: "United Kingdom", iso: "GB", flag: "🇬🇧", lat: 54, lng: -2, defaultBloc: "Western" },
  { name: "France", iso: "FR", flag: "🇫🇷", lat: 47, lng: 2, defaultBloc: "Western" },
  { name: "Germany", iso: "DE", flag: "🇩🇪", lat: 51, lng: 10, defaultBloc: "Western" },
  { name: "Italy", iso: "IT", flag: "🇮🇹", lat: 42, lng: 12, defaultBloc: "Western" },
  { name: "Spain", iso: "ES", flag: "🇪🇸", lat: 40, lng: -4, defaultBloc: "Western" },
  { name: "Canada", iso: "CA", flag: "🇨🇦", lat: 56, lng: -106, defaultBloc: "Western" },
  { name: "Australia", iso: "AU", flag: "🇦🇺", lat: -25, lng: 134, defaultBloc: "Western" },
  { name: "Japan", iso: "JP", flag: "🇯🇵", lat: 36, lng: 138, defaultBloc: "Western" },
  { name: "South Korea", iso: "KR", flag: "🇰🇷", lat: 36, lng: 128, defaultBloc: "Western" },
  { name: "Netherlands", iso: "NL", flag: "🇳🇱", lat: 52, lng: 5, defaultBloc: "Western" },
  { name: "Belgium", iso: "BE", flag: "🇧🇪", lat: 51, lng: 4, defaultBloc: "Western" },
  { name: "Sweden", iso: "SE", flag: "🇸🇪", lat: 62, lng: 15, defaultBloc: "Western" },
  { name: "Norway", iso: "NO", flag: "🇳🇴", lat: 62, lng: 10, defaultBloc: "Western" },
  { name: "Denmark", iso: "DK", flag: "🇩🇰", lat: 56, lng: 10, defaultBloc: "Western" },
  { name: "Finland", iso: "FI", flag: "🇫🇮", lat: 64, lng: 26, defaultBloc: "Western" },
  { name: "Poland", iso: "PL", flag: "🇵🇱", lat: 52, lng: 20, defaultBloc: "Western" },
  { name: "Portugal", iso: "PT", flag: "🇵🇹", lat: 39, lng: -8, defaultBloc: "Western" },
  { name: "Switzerland", iso: "CH", flag: "🇨🇭", lat: 47, lng: 8, defaultBloc: "Western" },
  { name: "Austria", iso: "AT", flag: "🇦🇹", lat: 48, lng: 15, defaultBloc: "Western" },
  { name: "Ireland", iso: "IE", flag: "🇮🇪", lat: 53, lng: -8, defaultBloc: "Western" },
  { name: "New Zealand", iso: "NZ", flag: "🇳🇿", lat: -41, lng: 174, defaultBloc: "Western" },
  { name: "Israel", iso: "IL", flag: "🇮🇱", lat: 31, lng: 35, defaultBloc: "Western" },
  { name: "Russia", iso: "RU", flag: "🇷🇺", lat: 62, lng: 100, defaultBloc: "Eastern" },
  { name: "China", iso: "CN", flag: "🇨🇳", lat: 35, lng: 104, defaultBloc: "Eastern" },
  { name: "India", iso: "IN", flag: "🇮🇳", lat: 21, lng: 78, defaultBloc: "G77" },
  { name: "Brazil", iso: "BR", flag: "🇧🇷", lat: -14, lng: -51, defaultBloc: "G77" },
  { name: "South Africa", iso: "ZA", flag: "🇿🇦", lat: -29, lng: 25, defaultBloc: "G77" },
  { name: "Mexico", iso: "MX", flag: "🇲🇽", lat: 23, lng: -102, defaultBloc: "GRULAC" },
  { name: "Argentina", iso: "AR", flag: "🇦🇷", lat: -34, lng: -58, defaultBloc: "GRULAC" },
  { name: "Indonesia", iso: "ID", flag: "🇮🇩", lat: -5, lng: 120, defaultBloc: "G77" },
  { name: "Turkey", iso: "TR", flag: "🇹🇷", lat: 39, lng: 35, defaultBloc: "NAM" },
  { name: "Saudi Arabia", iso: "SA", flag: "🇸🇦", lat: 24, lng: 45, defaultBloc: "Arab Group" },
  { name: "Iran", iso: "IR", flag: "🇮🇷", lat: 32, lng: 53, defaultBloc: "NAM" },
  { name: "Egypt", iso: "EG", flag: "🇪🇬", lat: 27, lng: 30, defaultBloc: "Arab Group" },
  { name: "Nigeria", iso: "NG", flag: "🇳🇬", lat: 9, lng: 8, defaultBloc: "G77" },
  { name: "Kenya", iso: "KE", flag: "🇰🇪", lat: 0, lng: 38, defaultBloc: "G77" },
  { name: "Ethiopia", iso: "ET", flag: "🇪🇹", lat: 9, lng: 40, defaultBloc: "G77" },
  { name: "Pakistan", iso: "PK", flag: "🇵🇰", lat: 30, lng: 70, defaultBloc: "G77" },
  { name: "Bangladesh", iso: "BD", flag: "🇧🇩", lat: 24, lng: 90, defaultBloc: "G77" },
  { name: "Vietnam", iso: "VN", flag: "🇻🇳", lat: 16, lng: 108, defaultBloc: "G77" },
  { name: "Philippines", iso: "PH", flag: "🇵🇭", lat: 13, lng: 122, defaultBloc: "G77" },
  { name: "Thailand", iso: "TH", flag: "🇹🇭", lat: 15, lng: 101, defaultBloc: "G77" },
  { name: "Malaysia", iso: "MY", flag: "🇲🇾", lat: 4, lng: 102, defaultBloc: "G77" },
  { name: "Singapore", iso: "SG", flag: "🇸🇬", lat: 1, lng: 104, defaultBloc: "G77" },
  { name: "Colombia", iso: "CO", flag: "🇨🇴", lat: 4, lng: -72, defaultBloc: "GRULAC" },
  { name: "Chile", iso: "CL", flag: "🇨🇱", lat: -30, lng: -71, defaultBloc: "GRULAC" },
  { name: "Peru", iso: "PE", flag: "🇵🇪", lat: -10, lng: -76, defaultBloc: "GRULAC" },
  { name: "Venezuela", iso: "VE", flag: "🇻🇪", lat: 7, lng: -66, defaultBloc: "GRULAC" },
  { name: "Cuba", iso: "CU", flag: "🇨🇺", lat: 22, lng: -79, defaultBloc: "NAM" },
  { name: "Morocco", iso: "MA", flag: "🇲🇦", lat: 32, lng: -6, defaultBloc: "Arab Group" },
  { name: "Algeria", iso: "DZ", flag: "🇩🇿", lat: 28, lng: 2, defaultBloc: "Arab Group" },
  { name: "Libya", iso: "LY", flag: "🇱🇾", lat: 27, lng: 17, defaultBloc: "Arab Group" },
  { name: "Tunisia", iso: "TN", flag: "🇹🇳", lat: 34, lng: 9, defaultBloc: "Arab Group" },
  { name: "Iraq", iso: "IQ", flag: "🇮🇶", lat: 33, lng: 44, defaultBloc: "Arab Group" },
  { name: "Syria", iso: "SY", flag: "🇸🇾", lat: 35, lng: 38, defaultBloc: "Arab Group" },
  { name: "Jordan", iso: "JO", flag: "🇯🇴", lat: 31, lng: 36, defaultBloc: "Arab Group" },
  { name: "Lebanon", iso: "LB", flag: "🇱🇧", lat: 34, lng: 36, defaultBloc: "Arab Group" },
  { name: "UAE", iso: "AE", flag: "🇦🇪", lat: 24, lng: 54, defaultBloc: "Arab Group" },
  { name: "Qatar", iso: "QA", flag: "🇶🇦", lat: 25, lng: 51, defaultBloc: "Arab Group" },
  { name: "Kuwait", iso: "KW", flag: "🇰🇼", lat: 29, lng: 47, defaultBloc: "Arab Group" },
  { name: "Ghana", iso: "GH", flag: "🇬🇭", lat: 8, lng: -2, defaultBloc: "G77" },
  { name: "Senegal", iso: "SN", flag: "🇸🇳", lat: 14, lng: -14, defaultBloc: "G77" },
  { name: "Tanzania", iso: "TZ", flag: "🇹🇿", lat: -6, lng: 35, defaultBloc: "G77" },
  { name: "Uganda", iso: "UG", flag: "🇺🇬", lat: 1, lng: 32, defaultBloc: "G77" },
  { name: "DR Congo", iso: "CD", flag: "🇨🇩", lat: -3, lng: 24, defaultBloc: "G77" },
  { name: "Angola", iso: "AO", flag: "🇦🇴", lat: -12, lng: 18, defaultBloc: "G77" },
  { name: "Mozambique", iso: "MZ", flag: "🇲🇿", lat: -19, lng: 35, defaultBloc: "G77" },
  { name: "Zimbabwe", iso: "ZW", flag: "🇿🇼", lat: -19, lng: 30, defaultBloc: "G77" },
  { name: "Sudan", iso: "SD", flag: "🇸🇩", lat: 16, lng: 30, defaultBloc: "Arab Group" },
  { name: "Somalia", iso: "SO", flag: "🇸🇴", lat: 5, lng: 46, defaultBloc: "Arab Group" },
  { name: "Afghanistan", iso: "AF", flag: "🇦🇫", lat: 34, lng: 66, defaultBloc: "G77" },
  { name: "Nepal", iso: "NP", flag: "🇳🇵", lat: 28, lng: 84, defaultBloc: "G77" },
  { name: "Sri Lanka", iso: "LK", flag: "🇱🇰", lat: 7, lng: 81, defaultBloc: "G77" },
  { name: "Myanmar", iso: "MM", flag: "🇲🇲", lat: 20, lng: 96, defaultBloc: "G77" },
  { name: "Cambodia", iso: "KH", flag: "🇰🇭", lat: 13, lng: 105, defaultBloc: "G77" },
  { name: "Laos", iso: "LA", flag: "🇱🇦", lat: 18, lng: 103, defaultBloc: "G77" },
  { name: "North Korea", iso: "KP", flag: "🇰🇵", lat: 40, lng: 127, defaultBloc: "Eastern" },
  { name: "Mongolia", iso: "MN", flag: "🇲🇳", lat: 47, lng: 104, defaultBloc: "NAM" },
  { name: "Kazakhstan", iso: "KZ", flag: "🇰🇿", lat: 48, lng: 67, defaultBloc: "NAM" },
  { name: "Uzbekistan", iso: "UZ", flag: "🇺🇿", lat: 41, lng: 64, defaultBloc: "NAM" },
  { name: "Ukraine", iso: "UA", flag: "🇺🇦", lat: 49, lng: 31, defaultBloc: "Eastern Europe" },
  { name: "Romania", iso: "RO", flag: "🇷🇴", lat: 46, lng: 25, defaultBloc: "Western" },
  { name: "Czech Republic", iso: "CZ", flag: "🇨🇿", lat: 50, lng: 15, defaultBloc: "Western" },
  { name: "Hungary", iso: "HU", flag: "🇭🇺", lat: 47, lng: 19, defaultBloc: "Western" },
  { name: "Greece", iso: "GR", flag: "🇬🇷", lat: 39, lng: 22, defaultBloc: "Western" },
  { name: "Croatia", iso: "HR", flag: "🇭🇷", lat: 45, lng: 16, defaultBloc: "Western" },
  { name: "Serbia", iso: "RS", flag: "🇷🇸", lat: 44, lng: 21, defaultBloc: "Eastern Europe" },
  { name: "Ecuador", iso: "EC", flag: "🇪🇨", lat: -2, lng: -78, defaultBloc: "GRULAC" },
  { name: "Bolivia", iso: "BO", flag: "🇧🇴", lat: -17, lng: -65, defaultBloc: "GRULAC" },
  { name: "Paraguay", iso: "PY", flag: "🇵🇾", lat: -23, lng: -58, defaultBloc: "GRULAC" },
  { name: "Uruguay", iso: "UY", flag: "🇺🇾", lat: -33, lng: -56, defaultBloc: "GRULAC" },
  { name: "Panama", iso: "PA", flag: "🇵🇦", lat: 9, lng: -80, defaultBloc: "GRULAC" },
  { name: "Costa Rica", iso: "CR", flag: "🇨🇷", lat: 10, lng: -84, defaultBloc: "GRULAC" },
  { name: "Guatemala", iso: "GT", flag: "🇬🇹", lat: 16, lng: -90, defaultBloc: "GRULAC" },
  { name: "Honduras", iso: "HN", flag: "🇭🇳", lat: 15, lng: -87, defaultBloc: "GRULAC" },
  { name: "El Salvador", iso: "SV", flag: "🇸🇻", lat: 14, lng: -89, defaultBloc: "GRULAC" },
  { name: "Dominican Republic", iso: "DO", flag: "🇩🇴", lat: 19, lng: -70, defaultBloc: "GRULAC" },
  { name: "Jamaica", iso: "JM", flag: "🇯🇲", lat: 18, lng: -77, defaultBloc: "CARICOM" },
  { name: "Iceland", iso: "IS", flag: "🇮🇸", lat: 65, lng: -19, defaultBloc: "Western" },
  { name: "Luxembourg", iso: "LU", flag: "🇱🇺", lat: 50, lng: 6, defaultBloc: "Western" },
  { name: "Malta", iso: "MT", flag: "🇲🇹", lat: 36, lng: 14, defaultBloc: "Western" },
  { name: "Cyprus", iso: "CY", flag: "🇨🇾", lat: 35, lng: 33, defaultBloc: "Western" },
  { name: "Georgia", iso: "GE", flag: "🇬🇪", lat: 42, lng: 43, defaultBloc: "Eastern Europe" },
  { name: "Armenia", iso: "AM", flag: "🇦🇲", lat: 40, lng: 45, defaultBloc: "Eastern Europe" },
  { name: "Azerbaijan", iso: "AZ", flag: "🇦🇿", lat: 40, lng: 47, defaultBloc: "NAM" },
];

const INDEX = new Map<string, CountryInfo>();
const ISO_INDEX = new Map<string, CountryInfo>();
for (const c of COUNTRIES) {
  INDEX.set(c.name.toLowerCase(), c);
  ISO_INDEX.set(c.iso, c);
}

export function getCountry(name: string): CountryInfo | undefined {
  return INDEX.get(name.toLowerCase());
}

export function getCountryByISO(iso: string): CountryInfo | undefined {
  return ISO_INDEX.get(iso.toUpperCase());
}

export function searchCountries(query: string): CountryInfo[] {
  const q = query.toLowerCase();
  return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase().includes(q));
}

export function getAllCountries(): readonly CountryInfo[] {
  return COUNTRIES;
}

export function getFlag(name: string): string {
  return getCountry(name)?.flag || "🏳️";
}

export function getCountryCoords(name: string): { lat: number; lng: number } | undefined {
  const c = getCountry(name);
  return c ? { lat: c.lat, lng: c.lng } : undefined;
}

export function project(lat: number, lng: number, w: number, h: number): [number, number] {
  return [((lng + 180) / 360) * w, ((90 - lat) / 180) * h];
}

function sizeForCountry(info: CountryInfo): { w: number; h: number } {
  const n = info.name.toLowerCase();
  if (["russia", "canada", "united states", "china", "brazil", "australia"].includes(n)) return { w: 58, h: 34 };
  if (["india", "mexico", "argentina", "south africa", "saudi arabia", "iran", "indonesia"].includes(n)) return { w: 34, h: 24 };
  if (["united kingdom", "japan", "south korea", "israel", "singapore", "qatar", "kuwait", "lebanon"].includes(n)) return { w: 18, h: 14 };
  if (Math.abs(info.lat) > 55) return { w: 28, h: 16 };
  return { w: 26, h: 18 };
}

// Lightweight local vector geometry. These are simplified country polygons generated
// from real centroids and sized by country scale. The map renders countries as SVG
// shapes and uses SVG path hit-testing; no country appears unless it is present in
// the user's local relationship registry.
export function getCountryPolygon(name: string, mapW = 1000, mapH = 500): CountryPolygon | undefined {
  const info = getCountry(name);
  if (!info) return undefined;
  const [cx, cy] = project(info.lat, info.lng, mapW, mapH);
  const { w, h } = sizeForCountry(info);
  const jitter = (info.iso.charCodeAt(0) + info.iso.charCodeAt(1)) % 7;
  const x1 = cx - w / 2;
  const x2 = cx + w / 2;
  const y1 = cy - h / 2;
  const y2 = cy + h / 2;
  const path = [
    `M ${x1 + jitter * 0.3} ${cy - h * 0.15}`,
    `L ${cx - w * 0.18} ${y1}`,
    `L ${x2 - jitter * 0.2} ${y1 + h * 0.25}`,
    `L ${x2} ${cy + h * 0.12}`,
    `L ${cx + w * 0.22} ${y2}`,
    `L ${x1 + w * 0.18} ${y2 - h * 0.08}`,
    `L ${x1} ${cy + h * 0.1}`,
    "Z",
  ].join(" ");
  return { path, centroid: { x: cx, y: cy }, bounds: { x: x1, y: y1, w, h } };
}

export function countryIsInRegion(name: string, region: string): boolean {
  const c = getCountry(name);
  if (!c || region === "all") return !!c;
  const regions: Record<string, { lat: [number, number]; lng: [number, number] }> = {
    africa: { lat: [-35, 38], lng: [-20, 55] },
    americas: { lat: [-60, 75], lng: [-170, -30] },
    asia: { lat: [-10, 75], lng: [40, 150] },
    europe: { lat: [35, 72], lng: [-15, 50] },
    oceania: { lat: [-50, 5], lng: [100, 180] },
  };
  const r = regions[region];
  return !!r && c.lat >= r.lat[0] && c.lat <= r.lat[1] && c.lng >= r.lng[0] && c.lng <= r.lng[1];
}

export const KNOWN_BLOCS = [
  "Western", "G77", "NAM", "Arab Group", "GRULAC", "African Group",
  "CARICOM", "Eastern Europe", "ASEAN", "EU", "NATO", "OIC",
];

// UNGA regional presets. The app adds only countries available in the local registry,
// keeping the list lightweight while preserving the correct UN grouping workflow.
export const REGIONAL_BLOC_PRESETS: Record<string, string[]> = {
  "African Group": [
    "Algeria", "Angola", "DR Congo", "Egypt", "Ethiopia", "Ghana", "Kenya",
    "Libya", "Morocco", "Mozambique", "Nigeria", "Senegal", "Somalia", "South Africa",
    "Sudan", "Tanzania", "Tunisia", "Uganda", "Zimbabwe",
  ],
  "Asia-Pacific Group": [
    "Afghanistan", "Bangladesh", "Cambodia", "China", "India", "Indonesia", "Iran",
    "Iraq", "Japan", "Jordan", "Kuwait", "Laos", "Lebanon", "Malaysia", "Mongolia",
    "Myanmar", "Nepal", "North Korea", "Pakistan", "Philippines", "Qatar", "Saudi Arabia",
    "Singapore", "South Korea", "Sri Lanka", "Syria", "Thailand", "UAE", "Vietnam",
  ],
  "Eastern European Group": [
    "Armenia", "Azerbaijan", "Croatia", "Czech Republic", "Georgia", "Hungary",
    "Poland", "Romania", "Russia", "Serbia", "Ukraine",
  ],
  "Latin American & Caribbean (GRULAC)": [
    "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Costa Rica", "Cuba",
    "Dominican Republic", "Ecuador", "El Salvador", "Guatemala", "Honduras", "Jamaica",
    "Mexico", "Panama", "Paraguay", "Peru", "Uruguay", "Venezuela",
  ],
  "Western European & Others (WEOG)": [
    "Australia", "Austria", "Belgium", "Canada", "Cyprus", "Denmark", "Finland", "France",
    "Germany", "Greece", "Iceland", "Ireland", "Israel", "Italy", "Luxembourg", "Malta",
    "Netherlands", "New Zealand", "Norway", "Portugal", "Spain", "Sweden", "Switzerland",
    "Turkey", "United Kingdom", "United States",
  ],
  "G77 + China": [
    "Algeria", "Angola", "Argentina", "Bangladesh", "Brazil", "China", "Colombia", "Cuba",
    "Egypt", "Ethiopia", "Ghana", "India", "Indonesia", "Iran", "Iraq", "Kenya", "Malaysia",
    "Mexico", "Morocco", "Nigeria", "Pakistan", "Peru", "Philippines", "Saudi Arabia",
    "Senegal", "South Africa", "Sri Lanka", "Thailand", "UAE", "Venezuela", "Vietnam",
  ],
  "Nordic States": ["Denmark", "Finland", "Iceland", "Norway", "Sweden"],
  "Small Island Developing States (SIDS)": ["Jamaica", "Singapore", "Malta"],
};
