import React from "react";

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="p-4 rounded-[21px] bg-[#1c1917]/70 border border-white/10 shadow-sm space-y-2.5 animate-pulse"
        >
          <div className="h-3 bg-stone-700/60 rounded-[21px] w-1/3" />
          <div className="h-5 bg-stone-700/60 rounded-[21px] w-2/3" />
          <div className="h-1.5 bg-stone-700/60 rounded-[21px] w-full" />
          <div className="h-3 bg-stone-700/60 rounded-[21px] w-4/5" />
        </div>
      ))}
    </div>
  );
};
