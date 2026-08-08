import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const predictions = [
    {
      id: 'pred-1',
      primary_name: 'ISS (ZARYA)',
      secondary_name: 'COSMOS 2251 DEB',
      closest_approach: '2026-08-05T14:30:00Z',
      miss_distance_km: 1.8,
      risk_score: 0.88,
      risk_level: 'high',
    },
    {
      id: 'pred-2',
      primary_name: 'Hubble Space Telescope',
      secondary_name: 'FENGYUN 1C DEB',
      closest_approach: '2026-08-06T09:15:00Z',
      miss_distance_km: 4.2,
      risk_score: 0.54,
      risk_level: 'medium',
    },
    {
      id: 'pred-3',
      primary_name: 'Sentinel-6 Michael Freilich',
      secondary_name: 'SL-12 R/B DEB',
      closest_approach: '2026-08-07T21:45:00Z',
      miss_distance_km: 12.5,
      risk_score: 0.15,
      risk_level: 'low',
    },
  ];
  return NextResponse.json(predictions);
}
