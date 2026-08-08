export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskFilterType = 'all' | 'high' | 'medium' | 'low';

export interface Satellite {
  id: string;
  name: string;
  noradId: number;
  altitudeKm: number;
  status: string;
  riskScore?: number;
  inclinationDeg?: number;
  periodMin?: number;
}

export interface Prediction {
  id: string;
  primaryName: string;
  secondaryName: string;
  closestApproach: string;
  missDistanceKm: number;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface DashboardData {
  satellites: Satellite[];
  predictions: Prediction[];
}
