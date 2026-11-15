import React from "react";
import { RISK_THEMES, ROUTE_COLORS, RiskLevel } from "../../lib/riskColors";
import { useAppStore } from "../../store/useAppStore";

export const Legend: React.FC = () => {
  const { analyzeResult, isLoading } = useAppStore();

  return (
    <div className="absolute top-4 right-16 z-20 flex flex-col gap-2 rounded-[21px] bg-[#0c0a09]/92 backdrop-blur-2xl border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.8),0_1px_3px_rgba(255,255,255,0.06)] px-3.5 py-2.5 text-[11px] text-white">
      <span className="font-bold text-stone-400 text-[10px] uppercase tracking-wider">
        Weather Risk
      </span>
      <div className="flex items-center gap-2.5">
        {([
          RiskLevel.LOW,
          RiskLevel.MODERATE,
          RiskLevel.HIGH,
          RiskLevel.SEVERE,
          RiskLevel.NO_TRAVEL,
        ] as const).map((lvl) => (
          <div key={lvl} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: RISK_THEMES[lvl].color }}
            />
            <span className="font-medium text-stone-200">{RISK_THEMES[lvl].name}</span>
          </div>
        ))}
      </div>

      {!isLoading && analyzeResult && analyzeResult.routes.length > 0 && (
        <>
          <span className="font-bold text-stone-400 text-[10px] uppercase tracking-wider pt-1.5 border-t border-white/10">
            Routes
          </span>
          <div className="flex items-center gap-2.5">
            {analyzeResult.routes.map((r) => (
              <div key={r.id} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-1 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: ROUTE_COLORS[r.id]?.stroke || "#6366f1",
                  }}
                />
                <span className="font-medium text-stone-200">{r.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
