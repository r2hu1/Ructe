export enum RiskLevel {
  LOW = 0,
  MODERATE = 1,
  HIGH = 2,
  SEVERE = 3,
  NO_TRAVEL = 4,
}

export interface RiskTheme {
  name: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const RISK_THEMES: Record<RiskLevel, RiskTheme> = {
  [RiskLevel.LOW]: {
    name: "Low",
    badge: "LOW",
    color: "#16a34a",
    bgColor: "#dcfce7",
    borderColor: "#86efac",
    textColor: "#15803d",
  },
  [RiskLevel.MODERATE]: {
    name: "Moderate",
    badge: "MOD",
    color: "#eab308",
    bgColor: "#fef9c3",
    borderColor: "#fde047",
    textColor: "#854d0e",
  },
  [RiskLevel.HIGH]: {
    name: "High",
    badge: "HIGH",
    color: "#f97316",
    bgColor: "#ffedd5",
    borderColor: "#fdba74",
    textColor: "#9a3412",
  },
  [RiskLevel.SEVERE]: {
    name: "Severe",
    badge: "SEVERE",
    color: "#ef4444",
    bgColor: "#fee2e2",
    borderColor: "#fca5a5",
    textColor: "#991b1b",
  },
  [RiskLevel.NO_TRAVEL]: {
    name: "No Travel",
    badge: "NO TRAVEL",
    color: "#7f1d1d",
    bgColor: "#ffe4e6",
    borderColor: "#fda4af",
    textColor: "#4c0519",
  },
};

export const ROUTE_COLORS: Record<string, { stroke: string; outline: string }> = {
  route_a: { stroke: "#2563eb", outline: "#1e3a8a" },
  route_b: { stroke: "#0891b2", outline: "#164e63" },
  route_c: { stroke: "#7c3aed", outline: "#4c1d95" },
};

export function getRiskTheme(level: number | RiskLevel): RiskTheme {
  const normalized = Math.min(Math.max(Math.round(level), 0), 4) as RiskLevel;
  return RISK_THEMES[normalized];
}

export function getRiskColor(level: number | RiskLevel): string {
  return getRiskTheme(level).color;
}
