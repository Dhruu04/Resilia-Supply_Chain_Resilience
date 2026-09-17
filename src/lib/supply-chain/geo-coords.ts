/**
 * Comprehensive Geocoding Service for Supply Chain Facilities.
 *
 * Provides high-precision coordinates for real-world global entities and
 * dynamic geocoding for any new custom nodes entered by the user.
 */

export interface GeoLocation {
  lat: number;
  lng: number;
  city?: string;
  country: string;
  regionName: string;
}

// Known facility exact coordinates (City, Country)
const EXACT_FACILITY_COORDS: Record<string, [number, number]> = {
  // North America — USA
  "Detroit, US": [42.3314, -83.0458],
  "Reno, US": [39.5296, -119.8138],
  "Columbus, US": [39.9612, -82.9988],
  "Austin, US": [30.2672, -97.7431],
  "Fremont, US": [37.5485, -121.9886],
  "Ashburn, US": [39.0438, -77.4874],
  "Dallas, US": [32.7767, -96.797],
  "Vineland, US": [39.4864, -75.0257],
  "Exton, US": [40.0326, -75.6191],
  "Portsmouth, US": [43.0718, -70.7626],
  "Bloomington, US": [39.1653, -86.5264],
  "Kalamazoo, US": [42.2917, -85.5872],
  "Memphis, US": [35.1495, -90.049],
  "Henderson, US": [36.0395, -114.9817],
  "Pittsburgh, US": [40.4406, -79.9959],
  "Cincinnati, US": [39.1031, -84.512],
  "Phoenix, US": [33.4484, -112.074],
  "Portland, US": [45.5152, -122.6784],
  "Wichita, US": [37.6872, -97.3301],
  "Seattle, US": [47.6062, -122.3321],
  "Chandler, US": [33.3062, -111.8413],

  // North America — Mexico & Canada
  "Monterrey, MX": [25.6866, -100.3161],
  "Guadalajara, MX": [20.6597, -103.3496],
  "Ramos Arizpe, MX": [25.5414, -100.9506],
  "Ontario, CA": [43.6532, -79.3832],
  "Toronto, CA": [43.6532, -79.3832],
  "Vancouver, CA": [49.2827, -123.1207],

  // South America
  "Atacama, CL": [-23.8634, -69.1328],
  "Santiago, CL": [-33.4489, -70.6693],
  "Bahia, BR": [-12.9777, -38.5016],
  "São Paulo, BR": [-23.5505, -46.6333],
  "Buenos Aires, AR": [-34.6037, -58.3816],

  // Europe — Central & Western
  "Veldhoven, NL": [51.4174, 5.4055],
  "Rotterdam, NL": [51.9244, 4.4777],
  "Venlo, NL": [51.3704, 6.1724],
  "Leuna, DE": [51.3267, 12.0167],
  "Mainz, DE": [49.9929, 8.2473],
  "Göttingen, DE": [51.5413, 9.9158],
  "Müllheim, DE": [47.8078, 7.6289],
  "Frankfurt, DE": [50.1109, 8.6821],
  "Regensburg, DE": [49.0134, 12.1016],
  "Saxony, DE": [51.1045, 13.2017],
  "Grünheide, DE": [52.4167, 13.8167],
  "Darmstadt, DE": [49.8728, 8.6512],
  "Augsburg, DE": [48.3705, 10.8978],
  "Hamburg, DE": [53.5511, 9.9937],
  "Leipzig, DE": [51.3397, 12.3731],
  "Munich, DE": [48.1351, 11.582],
  "Stuttgart, DE": [48.7758, 9.1829],
  "Visp, CH": [46.2929, 7.8817],
  "Geneva, CH": [46.2044, 6.1432],
  "Zurich, CH": [47.3769, 8.5417],
  "Puurs, BE": [51.0772, 4.2778],
  "Antwerp, BE": [51.2194, 4.4025],
  "Brussels, BE": [50.8503, 4.3517],
  "Villach, AT": [46.6111, 13.8558],
  "Graz, AT": [47.0707, 15.4395],
  "Vienna, AT": [48.2082, 16.3738],
  "Leixlip, IE": [53.3644, -6.4917],
  "Dublin, IE": [53.3498, -6.2603],
  "Toulouse, FR": [43.6047, 1.4442],
  "Gennevilliers, FR": [48.9333, 2.3],
  "Paris, FR": [48.8566, 2.3522],
  "Snaith, UK": [53.6922, -1.0303],
  "Wolverhampton, UK": [52.5862, -2.1288],
  "London, UK": [51.5074, -0.1278],
  "Madrid, ES": [40.4168, -3.7038],
  "Barcelona, ES": [41.3851, 2.1734],
  "Foggia, IT": [41.4622, 15.5447],
  "Milan, IT": [45.4642, 9.19],
  "Porto, PT": [41.1579, -8.6291],
  "Lisbon, PT": [38.7223, -9.1393],
  "Kraków, PL": [50.0647, 19.945],
  "Warsaw, PL": [52.2297, 21.0122],
  "Bratislava, SK": [48.1486, 17.1077],
  "Prague, CZ": [50.0755, 14.4378],

  // Europe — Nordic
  "Skellefteå, SE": [64.7507, 20.9528],
  "Kiruna, SE": [67.8558, 20.2253],
  "Stockholm, SE": [59.3293, 18.0686],
  "Gothenburg, SE": [57.7089, 11.9746],
  "Helsinki, FI": [60.1699, 24.9384],
  "Oslo, NO": [59.9139, 10.7522],

  // Africa
  "Kolwezi, CD": [-10.7167, 25.4667],
  "Katanga, CD": [-11.6667, 27.4833],
  "Lubumbashi, CD": [-11.6876, 27.5026],
  "Balama, MZ": [-13.3494, 38.5636],
  "Johannesburg, ZA": [-26.2041, 28.0473],
  "Cairo, EG": [30.0444, 31.2357],
  "Casablanca, MA": [33.5731, -7.5898],
  "Lagos, NG": [6.5244, 3.3792],

  // East Asia — Taiwan
  "Tainan, TW": [22.9997, 120.227],
  "Kaohsiung, TW": [22.6273, 120.3014],
  "Taoyuan, TW": [24.9936, 121.301],
  "Hsinchu, TW": [24.8138, 120.9675],
  "Taipei, TW": [25.033, 121.5654],

  // East Asia — Japan
  "Niigata, JP": [37.9162, 139.0364],
  "Ehime, JP": [33.8416, 132.7657],
  "Kyoto, JP": [35.0116, 135.7681],
  "Osaka, JP": [34.6937, 135.5023],
  "Yokohama, JP": [35.4437, 139.638],
  "Tokyo, JP": [35.6762, 139.6503],
  "Mishima, JP": [35.1183, 138.9185],
  "Nagoya, JP": [35.1815, 136.9066],
  "Kyushu, JP": [33.0, 131.0],

  // East Asia — Korea
  "Icheon, KR": [37.2723, 127.435],
  "Cheongju, KR": [36.6424, 127.489],
  "Pohang, KR": [36.019, 129.3435],
  "Busan, KR": [35.1796, 129.0756],
  "Seoul, KR": [37.5665, 126.978],

  // East Asia — China
  "Ningde, CN": [26.6657, 119.5479],
  "Hefei, CN": [31.8206, 117.2272],
  "Shanghai, CN": [31.2304, 121.4737],
  "Zhengzhou, CN": [34.7466, 113.6253],
  "Suzhou, CN": [31.299, 120.5853],
  "Shenzhen, CN": [22.5431, 114.0579],
  "Chongqing, CN": [29.563, 106.5516],
  "Anhui, CN": [31.8612, 117.2849],
  "Beijing, CN": [39.9042, 116.4074],

  // Southeast & South Asia
  "Singapore, SG": [1.3521, 103.8198],
  "Sulawesi, ID": [-2.5337, 121.6444],
  "Jakarta, ID": [-6.2088, 106.8456],
  "Hanoi, VN": [21.0285, 105.8542],
  "Ho Chi Minh City, VN": [10.8231, 106.6297],
  "Penang, MY": [5.4141, 100.3288],
  "Kuala Lumpur, MY": [3.139, 101.6869],
  "Bangkok, TH": [13.7563, 100.5018],
  "Hyderabad, IN": [17.385, 78.4867],
  "Pune, IN": [18.5204, 73.8567],
  "Chennai, IN": [13.0827, 80.2707],
  "Gujarat, IN": [22.2587, 71.1924],
  "Bengaluru, IN": [12.9716, 77.5946],
  "Mumbai, IN": [19.076, 72.8777],

  // Oceania
  "Sydney, AU": [-33.8688, 151.2093],
  "Melbourne, AU": [-37.8136, 144.9631],
  "Perth, AU": [-31.9505, 115.8605],
  "Auckland, NZ": [-36.8485, 174.7633],
};

// Country Centroids for broad fallback matching
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [39.8283, -98.5795],
  CA: [56.1304, -106.3468],
  MX: [23.6345, -102.5528],
  BR: [-14.235, -51.9253],
  AR: [-38.4161, -63.6167],
  CL: [-35.6751, -71.543],
  DE: [51.1657, 10.4515],
  NL: [52.1326, 5.2913],
  SE: [60.1282, 18.6435],
  NO: [60.472, 8.4689],
  FI: [61.9241, 25.7482],
  PL: [51.9194, 19.1451],
  SK: [48.669, 19.699],
  CZ: [49.8175, 15.473],
  AT: [47.5162, 14.5501],
  CH: [46.8182, 8.2275],
  FR: [46.2276, 2.2137],
  GB: [55.3781, -3.436],
  UK: [55.3781, -3.436],
  IT: [41.8719, 12.5674],
  ES: [40.4637, -3.7492],
  PT: [39.3999, -8.2245],
  BE: [50.5039, 4.4699],
  DK: [56.2639, 9.5018],
  IE: [53.1424, -7.6921],
  CD: [-4.0383, 21.7587],
  MZ: [-18.6657, 35.5296],
  ZA: [-30.5595, 22.9375],
  EG: [26.8206, 30.8025],
  NG: [9.082, 8.6753],
  CN: [35.8617, 104.1954],
  TW: [23.6978, 120.9605],
  JP: [36.2048, 138.2529],
  KR: [35.9078, 127.7669],
  VN: [14.0583, 108.2772],
  MY: [4.2105, 101.9758],
  SG: [1.3521, 103.8198],
  IN: [20.5937, 78.9629],
  TH: [15.87, 100.9925],
  ID: [-0.7893, 113.9213],
  PH: [12.8797, 121.774],
  AU: [-25.2744, 133.7751],
  NZ: [-40.9006, 174.886],
};

/**
 * Deterministic hash-based jitter to avoid overlapping nodes in the same city/country
 */
function hashJitter(seed: string, scale: number = 0.35): [number, number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const jLat = ((hash & 0xff) / 255 - 0.5) * scale;
  const jLng = (((hash >> 8) & 0xff) / 255 - 0.5) * scale;
  return [jLat, jLng];
}

/**
 * Universal Geocoding function:
 * Converts any region string (e.g. "Shenzhen, CN", "Austin, US", "Tokyo, JP",
 * or raw "lat,lng" coordinates) into accurate [lat, lng].
 */
export function geocodeLocation(region: string, entityId: string = ""): [number, number] {
  if (!region) return [20, 0];

  const trimmed = region.trim();

  // 1. Direct coordinates format like "37.77,-122.41" or "37.77, -122.41"
  const coordMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (coordMatch && coordMatch[1] && coordMatch[2]) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [lat, lng];
    }
  }

  // 2. Exact match in pre-mapped facility directory
  if (EXACT_FACILITY_COORDS[trimmed]) {
    const [bLat, bLng] = EXACT_FACILITY_COORDS[trimmed]!;
    // Apply micro-jitter only if an entityId is provided to differentiate co-located facilities
    if (entityId) {
      const [jLat, jLng] = hashJitter(entityId, 0.08);
      return [bLat + jLat, bLng + jLng];
    }
    return [bLat, bLng];
  }

  // 3. Case-insensitive lookup against city database
  const lowerTrimmed = trimmed.toLowerCase();
  for (const [key, coords] of Object.entries(EXACT_FACILITY_COORDS)) {
    if (key.toLowerCase() === lowerTrimmed) {
      if (entityId) {
        const [jLat, jLng] = hashJitter(entityId, 0.08);
        return [coords[0] + jLat, coords[1] + jLng];
      }
      return coords;
    }
  }

  // 4. Extract parts (e.g. "Austin, US" -> city "Austin", country "US")
  const parts = trimmed.split(",").map((p) => p.trim());
  const countryToken = (parts[parts.length - 1] ?? "").toUpperCase();
  const cityToken = (parts[0] ?? "").toLowerCase();

  // Check city match across database
  for (const [key, coords] of Object.entries(EXACT_FACILITY_COORDS)) {
    const keyParts = key.split(",").map((p) => p.trim().toLowerCase());
    if (keyParts[0] === cityToken) {
      const [jLat, jLng] = hashJitter(entityId || trimmed, 0.12);
      return [coords[0] + jLat, coords[1] + jLng];
    }
  }

  // 5. Country Centroid lookup with hash jitter so multi-nodes in same country don't overlap
  if (COUNTRY_CENTROIDS[countryToken]) {
    const [cLat, cLng] = COUNTRY_CENTROIDS[countryToken]!;
    const [jLat, jLng] = hashJitter(entityId || trimmed, 1.4);
    return [cLat + jLat, cLng + jLng];
  }

  // 6. Universal fallback
  const [jLat, jLng] = hashJitter(entityId || trimmed, 4.0);
  return [25.0 + jLat, 10.0 + jLng];
}

/**
 * Ensures a collection of nodes in the same geographic spot are arranged neatly
 * in a small circular dispersion so pins never completely cover one another.
 */
export function disperseOverlappingPoints(
  nodes: { id: string; coords: [number, number] }[],
  thresholdDegrees: number = 0.25,
): Map<string, [number, number]> {
  const result = new Map<string, [number, number]>();
  const clusters: { id: string; coords: [number, number] }[][] = [];

  for (const node of nodes) {
    let placed = false;
    for (const cluster of clusters) {
      const rep = cluster[0];
      if (rep) {
        const dist = Math.hypot(node.coords[0] - rep.coords[0], node.coords[1] - rep.coords[1]);
        if (dist < thresholdDegrees) {
          cluster.push(node);
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      clusters.push([node]);
    }
  }

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      const item = cluster[0]!;
      result.set(item.id, item.coords);
    } else {
      const rep = cluster[0]!;
      const count = cluster.length;
      const radius = Math.min(0.5, 0.15 + count * 0.05);

      cluster.forEach((item, idx) => {
        const angle = (2 * Math.PI * idx) / count;
        const offsetLat = Math.sin(angle) * radius;
        const offsetLng = Math.cos(angle) * (radius / Math.cos((rep.coords[0] * Math.PI) / 180));
        result.set(item.id, [rep.coords[0] + offsetLat, rep.coords[1] + offsetLng]);
      });
    }
  }

  return result;
}

/**
 * Computes intermediate curved geodesic points between two lat/lngs for smooth trade arcs
 */
export function createGeodesicArc(
  start: [number, number],
  end: [number, number],
  numPoints: number = 30,
): [number, number][] {
  const points: [number, number][] = [];
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  // Handle anti-meridian wrap-around if needed
  let dLng = lng2 - lng1;
  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    // Linear interpolation with vertical arc bow
    const currentLat = lat1 + (lat2 - lat1) * f;
    const currentLng = lng1 + dLng * f;

    // Add arc curvature proportional to distance
    const dist = Math.hypot(lat2 - lat1, dLng);
    const arcHeight = Math.min(16, dist * 0.15);
    const bow = Math.sin(f * Math.PI) * arcHeight;

    points.push([currentLat + bow, currentLng]);
  }

  return points;
}

export const resolveNodeCoordinates = geocodeLocation;
