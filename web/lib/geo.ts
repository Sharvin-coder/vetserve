// Rough distance between local ZIP codes, for the "~4 mi" hint on task
// cards. Approximate centroids of Athens-area (GA-10) ZIPs — good to a
// couple of miles, which is why the UI always says "about". Unknown ZIPs
// simply show no distance.

const ZIP_CENTROIDS: Record<string, [number, number]> = {
  "30601": [33.96, -83.32], // Athens NE
  "30605": [33.9, -83.32], // Athens SE
  "30606": [33.93, -83.44], // Athens W
  "30607": [34.02, -83.44], // Athens NW
  "30549": [34.11, -83.59], // Jefferson
  "30622": [33.92, -83.53], // Bogart
  "30655": [33.78, -83.7], // Monroe
  "30677": [33.84, -83.43], // Watkinsville
  "30680": [33.99, -83.72], // Winder
};

export function roughMilesBetween(zipA?: string | null, zipB?: string | null): number | null {
  if (!zipA || !zipB) return null;
  if (zipA === zipB) return 0;
  const a = ZIP_CENTROIDS[zipA];
  const b = ZIP_CENTROIDS[zipB];
  if (!a || !b) return null;
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(3959 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
