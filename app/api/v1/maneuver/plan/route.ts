import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const satelliteName = body.satelliteName || body.satellite_name || 'ISS (ZARYA)';
    const currentMissKm = Number(body.currentMissDist ?? body.current_miss_distance_km ?? 1.8);
    const requiredSafeKm = Number(body.targetMissDist ?? body.required_safe_distance_km ?? 10.0);
    const satelliteMassKg = Number(body.satelliteMass ?? body.satellite_mass_kg ?? 420000);
    const burnDirection = body.burnDirection || body.burn_direction || 'posigrade';

    const deltaDistanceKm = Math.max(0, requiredSafeKm - currentMissKm);
    const deltaV = Number((deltaDistanceKm * 0.42 + 0.15).toFixed(3));
    const isp = 310.0;
    const g0 = 9.81;
    const massRatio = 1 - 1 / Math.exp(deltaV / (isp * g0));
    const fuelCost = Number(Math.max(0.1, satelliteMassKg * massRatio).toFixed(2));
    const newDistance = Number((currentMissKm + deltaDistanceKm).toFixed(1));
    const riskReduction = Number(
      Math.min(99.9, (deltaDistanceKm / requiredSafeKm) * 100).toFixed(1)
    );

    return NextResponse.json({
      satellite_name: satelliteName,
      satelliteName,
      delta_v_m_s: deltaV,
      deltaV,
      burn_direction: burnDirection,
      burnDirection,
      fuel_cost_kg: fuelCost,
      fuelKg: fuelCost,
      new_miss_distance_km: newDistance,
      newMissDist: newDistance,
      risk_reduction_pct: riskReduction,
      status: 'Maneuver Solution Computed',
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid maneuver plan parameters' },
      { status: 400 }
    );
  }
}
