// Rough distance between local ZIP codes, for the "~4 mi" hint on task
// cards. Approximate centroids of Fort Bend / Katy-area ZIPs — good to a
// couple of miles, which is why the UI always says "about". Unknown ZIPs
// simply show no distance.

const ZIP_CENTROIDS: Record<string, [number, number]> = {
  "77406": [29.65, -95.8], // Richmond
  "77407": [29.66, -95.71], // Richmond E
  "77423": [29.78, -95.95], // Brookshire
  "77441": [29.69, -95.9], // Fulshear
  "77450": [29.75, -95.73], // Katy / Cinco Ranch
  "77469": [29.56, -95.72], // Richmond / Rosenberg
  "77471": [29.55, -95.82], // Rosenberg
  "77478": [29.62, -95.6], // Sugar Land
  "77479": [29.57, -95.63], // Sugar Land S
  "77485": [29.63, -96.06], // Wallis
  "77493": [29.85, -95.83], // Katy N
  "77494": [29.74, -95.83], // Katy SW
  "77498": [29.65, -95.66], // Sugar Land W
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
