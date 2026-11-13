import React from "react";
import { RISK_THEMES, ROUTE_COLORS, RiskLevel } from "../../lib/riskColors";
import { useAppStore } from "../../store/useAppStore";

export const Legend: React.FC = () => {
  const { analyzeResult } = useAppStore();

  return (
    <div className="legend-panel">
      <span className="legend-title">Weather Risk</span>
      <div className="legend-items">
        {([
          RiskLevel.LOW,
          RiskLevel.MODERATE,
          RiskLevel.HIGH,
          RiskLevel.SEVERE,
          RiskLevel.NO_TRAVEL,
        ] as const).map((lvl) => (
          <div key={lvl} className="legend-item">
            <span
              className="risk-dot"
              style={{ backgroundColor: RISK_THEMES[lvl].color }}
            />
            <span>{RISK_THEMES[lvl].name}</span>
          </div>
        ))}
      </div>

      {analyzeResult && analyzeResult.routes.length > 0 && (
        <>
          <span className="legend-title" style={{ marginTop: "6px" }}>Routes</span>
          <div className="legend-items">
            {analyzeResult.routes.map((r) => (
              <div key={r.id} className="legend-item">
                <span
                  style={{
                    width: "12px",
                    height: "3px",
                    backgroundColor: ROUTE_COLORS[r.id]?.stroke || "#3b82f6",
                    borderRadius: "1px",
                  }}
                />
                <span>{r.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
