import type { DashboardData } from './types';

const fallback: DashboardData = {
  satellites: [
    {
      id: '1',
      name: 'ISS (ZARYA)',
      noradId: 25544,
      altitudeKm: 418,
      status: 'tracked',
    },
    {
      id: '2',
      name: 'Hubble Space Telescope',
      noradId: 20580,
      altitudeKm: 540,
      status: 'tracked',
    },
    {
      id: '3',
      name: 'Sentinel-6 Michael Freilich',
      noradId: 46984,
      altitudeKm: 1336,
      status: 'monitored',
    },
    {
      id: '4',
      name: 'NOAA-20',
      noradId: 43013,
      altitudeKm: 824,
      status: 'tracked',
    },
    {
      id: '5',
      name: 'Landsat 9',
      noradId: 49260,
      altitudeKm: 705,
      status: 'tracked',
    },
  ],
  predictions: [
    {
      id: 'demo-1',
      primaryName: 'ISS (ZARYA)',
      secondaryName: 'COSMOS 2251 DEB',
      closestApproach: '2026-08-05T14:30:00Z',
      missDistanceKm: 1.8,
      riskScore: 0.88,
      riskLevel: 'high',
    },
    {
      id: 'demo-2',
      primaryName: 'Hubble Space Telescope',
      secondaryName: 'FENGYUN 1C DEB',
      closestApproach: '2026-08-06T09:15:00Z',
      missDistanceKm: 4.2,
      riskScore: 0.54,
      riskLevel: 'medium',
    },
    {
      id: 'demo-3',
      primaryName: 'Sentinel-6 Michael Freilich',
      secondaryName: 'SL-12 R/B DEB',
      closestApproach: '2026-08-07T21:45:00Z',
      missDistanceKm: 12.5,
      riskScore: 0.15,
      riskLevel: 'low',
    },
  ],
};

interface ApiSatellite {
  id: string;
  name: string;
  norad_id: number;
  altitude_km: number;
  status: string;
}
interface ApiPrediction {
  id: string;
  primary_name: string;
  secondary_name: string;
  closest_approach: string;
  miss_distance_km: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
}

async function request<T>(path: string): Promise<T> {
  const baseUrl =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://127.0.0.1:3000/api/v1';
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { next: { revalidate: 30 } });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getDashboardData(): Promise<DashboardData> {
  return fallback;
}
