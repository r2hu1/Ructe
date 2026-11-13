import { describe, expect, it } from "vitest";
import { RiskLevel, ROUTE_COLORS, getRiskColor, getRiskTheme } from "../lib/riskColors";

describe("riskColors helper", () => {
  it("returns correct theme for each risk level", () => {
    expect(getRiskTheme(RiskLevel.LOW).badge).toBe("LOW");
    expect(getRiskTheme(RiskLevel.MODERATE).badge).toBe("MOD");
    expect(getRiskTheme(RiskLevel.HIGH).badge).toBe("HIGH");
    expect(getRiskTheme(RiskLevel.SEVERE).badge).toBe("SEVERE");
    expect(getRiskTheme(RiskLevel.NO_TRAVEL).badge).toBe("NO TRAVEL");
  });

  it("clamps out-of-range risk level values", () => {
    expect(getRiskColor(-1)).toBe(getRiskColor(RiskLevel.LOW));
    expect(getRiskColor(10)).toBe(getRiskColor(RiskLevel.NO_TRAVEL));
  });

  it("uses commercial freight teal colors for route_c", () => {
    expect(ROUTE_COLORS.route_c.stroke).toBe("#0d9488");
    expect(ROUTE_COLORS.route_c.outline).toBe("#115e59");
  });
});
