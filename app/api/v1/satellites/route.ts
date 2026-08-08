import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_SATELLITES = [
  { id: '1', name: 'ISS (ZARYA)', norad_id: 25544, altitude_km: 418, status: 'tracked' },
  { id: '2', name: 'Hubble Space Telescope', norad_id: 20580, altitude_km: 540, status: 'tracked' },
  { id: '3', name: 'Sentinel-6 Michael Freilich', norad_id: 46984, altitude_km: 1336, status: 'monitored' },
  { id: '4', name: 'NOAA-20', norad_id: 43013, altitude_km: 824, status: 'tracked' },
  { id: '5', name: 'Landsat 9', norad_id: 49260, altitude_km: 705, status: 'tracked' },
];

export async function GET() {
  const apiKey = process.env.N2YO_API_KEY?.trim();

  // If N2YO_API_KEY is provided in .env, fetch live telemetry from N2YO API
  if (apiKey) {
    try {
      const targetNoradIds = [25544, 20580, 46984, 43013, 49260];
      const fetchPromises = targetNoradIds.map(async (noradId, idx) => {
        try {
          const url = `https://api.n2yo.com/rest/v1/satellite/positions/${noradId}/0/0/0/1/&apiKey=${apiKey}`;
          const res = await fetch(url, { next: { revalidate: 30 } });
          if (!res.ok) return null;
          const data = await res.json();
          if (data?.info && Array.isArray(data.positions) && data.positions[0]) {
            const pos = data.positions[0];
            return {
              id: String(idx + 1),
              name: data.info.satname || DEFAULT_SATELLITES[idx].name,
              norad_id: data.info.satid || noradId,
              altitude_km: Math.round(pos.sataltitude || DEFAULT_SATELLITES[idx].altitude_km),
              status: idx === 2 ? 'monitored' : 'tracked',
            };
          }
        } catch {
          return null;
        }
        return null;
      });

      const results = await Promise.all(fetchPromises);
      const validLiveSatellites = results.filter((s): s is NonNullable<typeof s> => s !== null);

      if (validLiveSatellites.length > 0) {
        return NextResponse.json(validLiveSatellites);
      }
    } catch (err) {
      console.error('Error fetching N2YO API data:', err);
    }
  }

  // Fallback to CelesTrak JSON or default satellite catalog
  try {
    const celestrakRes = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json', {
      headers: { 'User-Agent': 'SpaceShield/1.0' },
      next: { revalidate: 60 },
    });
    if (celestrakRes.ok) {
      const rawData = await celestrakRes.json();
      if (Array.isArray(rawData) && rawData.length > 0) {
        const liveFromCelesTrak = rawData.slice(0, 5).map((sat: any, index: number) => ({
          id: String(index + 1),
          name: sat.OBJECT_NAME || DEFAULT_SATELLITES[index].name,
          norad_id: Number(sat.NORAD_CAT_ID || DEFAULT_SATELLITES[index].norad_id),
          altitude_km: DEFAULT_SATELLITES[index].altitude_km,
          status: index === 2 ? 'monitored' : 'tracked',
        }));
        return NextResponse.json(liveFromCelesTrak);
      }
    }
  } catch {
    // Fallback to default catalog
  }

  return NextResponse.json(DEFAULT_SATELLITES);
}
