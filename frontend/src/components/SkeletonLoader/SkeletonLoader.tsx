import React from "react";

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="route-cards-list">
      {[1, 2, 3].map((item) => (
        <div key={item} className="skeleton-card">
          <div className="skeleton-line" style={{ width: "40%" }} />
          <div className="skeleton-line" style={{ width: "70%", height: "20px" }} />
          <div className="skeleton-line" style={{ width: "100%", height: "8px" }} />
          <div className="skeleton-line" style={{ width: "85%" }} />
        </div>
      ))}
    </div>
  );
};
