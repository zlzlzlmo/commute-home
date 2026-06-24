export interface LatLng {
  lat: number;
  lng: number;
}

export type CommuteMode = 'car' | 'transit';

export interface AmenityCounts {
  convenience: number; // 편의점
  gym: number;
  hospital: number;
  mart: number;
  cafe: number;
  restaurant: number;
  park: number;
}

export interface NeighborhoodData {
  code: string; // 법정동 코드
  name: string; // 동 이름
  location: LatLng;
  avgMonthlyRent: number; // 평균 월세 (원)
  avgDeposit: number; // 평균 보증금 (원)
  amenities: AmenityCounts;
}

export interface CommuteData {
  distanceKm: number; // 자동차 편도 거리
  carDurationMin: number; // 자동차 편도 소요(분)
  transitDurationMin: number; // 대중교통 편도 소요(분)
  transitFareKrw: number; // 대중교통 1회 요금(원)
}

export interface Weights {
  rent: number;
  realCost: number;
  opportunity: number;
  amenity: number;
  taste: number;
}

export interface UserInput {
  workplace: LatLng;
  budgetMonthlyRent: number; // 원
  budgetDeposit: number; // 원
  commuteMode: CommuteMode;
  hourlyValueKrw?: number;
  livelyPreference: number; // 0(한적) ~ 1(번화)
  weights?: Partial<Weights>;
  workingDaysPerMonth?: number;
  fuelEfficiencyKmPerL?: number;
}

export interface CostBreakdown {
  monthlyRent: number;
  commuteRealCost: number;
  opportunityCost: number;
  totalMonthlyCost: number;
}

export interface AxisScores {
  rent: number;
  realCost: number;
  opportunity: number;
  amenity: number;
  taste: number;
}

export interface Candidate {
  data: NeighborhoodData;
  commute: CommuteData;
  cost: CostBreakdown;
}

export interface ScoredNeighborhood extends Candidate {
  axisScores: AxisScores;
  totalScore: number;
  rank: number;
}

export interface RecommendOptions {
  regionCode: string;
  topN?: number;
}
