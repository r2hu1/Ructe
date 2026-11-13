export function formatDuration(durationSeconds: number): string {
  const total = Math.max(0, Math.round(durationSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} mi`;
}

export function formatSpeed(mph: number): string {
  return `${Math.round(mph)} mph`;
}

export function formatPrecipitation(inches: number): string {
  return `${inches.toFixed(2)} in/hr`;
}

export function formatWeight(pounds: number): string {
  return `${Math.round(pounds).toLocaleString()} lb`;
}

export function formatIsoDateTime(isoString: string): { utc: string; local: string } {
  try {
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) {
      return { utc: isoString, local: isoString };
    }
    const utcHours = String(dt.getUTCHours()).padStart(2, "0");
    const utcMinutes = String(dt.getUTCMinutes()).padStart(2, "0");
    const utcDate = dt.toISOString().slice(0, 10);
    const utcDisplay = `${utcDate} ${utcHours}:${utcMinutes} UTC`;

    const localDisplay = dt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return { utc: utcDisplay, local: localDisplay };
  } catch {
    return { utc: isoString, local: isoString };
  }
}

export function computeForecastTimeAtHour(
  startIso: string,
  hourIndex: number
): { utc: string; local: string } {
  const base = new Date(startIso);
  const target = new Date(base.getTime() + hourIndex * 3600 * 1000);
  return formatIsoDateTime(target.toISOString());
}
