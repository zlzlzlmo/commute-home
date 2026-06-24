import { CommuteData, LatLng, NeighborhoodData } from './types';

export interface DataProvider {
  listNeighborhoods(regionCode: string): Promise<NeighborhoodData[]>;
  getCommute(from: LatLng, workplace: LatLng): Promise<CommuteData>;
  getFuelPricePerLiter(regionCode: string): Promise<number>;
}

export interface FixtureConfig {
  neighborhoods: NeighborhoodData[];
  commutes: Record<string, CommuteData>; // key: 법정동 코드
  fuelPricePerLiter: number;
}

export class FixtureDataProvider implements DataProvider {
  constructor(private readonly config: FixtureConfig) {}

  async listNeighborhoods(): Promise<NeighborhoodData[]> {
    return this.config.neighborhoods;
  }

  async getCommute(from: LatLng): Promise<CommuteData> {
    const match = this.config.neighborhoods.find(
      (n) => n.location.lat === from.lat && n.location.lng === from.lng,
    );
    if (!match) {
      throw new Error(`No fixture commute for location ${from.lat},${from.lng}`);
    }
    const commute = this.config.commutes[match.code];
    if (!commute) {
      throw new Error(`No fixture commute for neighborhood code ${match.code}`);
    }
    return commute;
  }

  async getFuelPricePerLiter(): Promise<number> {
    return this.config.fuelPricePerLiter;
  }
}
