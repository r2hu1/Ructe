import { describe, expect, it } from "vitest";
import { formatDistance, formatDuration, formatPrecipitation, formatSpeed } from "../lib/format";

describe("format helpers", () => {
  it("formats duration into hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(5400)).toBe("1h 30m");
    expect(formatDuration(1200)).toBe("20m");
  });

  it("formats distance in miles", () => {
    expect(formatDistance(12.34)).toBe("12.3 mi");
  });

  it("formats speed and precipitation", () => {
    expect(formatSpeed(35.2)).toBe("35 mph");
    expect(formatPrecipitation(0.5)).toBe("0.50 in/hr");
  });
});
