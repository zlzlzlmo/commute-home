import { describe, it, expect } from 'vitest';
import { FixtureDataProvider, FixtureConfig, DataProvider } from './provider';
import { NeighborhoodData } from './types';

const baseAmenities = {
  convenience: 0,
  gym: 0,
  hospital: 0,
  mart: 0,
  cafe: 0,
  restaurant: 0,
  park: 0,
};

function makeNeighborhood(code: string, lat: number, lng: number): NeighborhoodData {
  return {
    code,
    name: code,
    location: { lat, lng },
    avgMonthlyRent: 500000,
    avgDeposit: 10000000,
    amenities: baseAmenities,
  };
}

describe('FixtureDataProvider.getCommute', () => {
  it('일치하는 동네가 없으면 throw', async () => {
    const config: FixtureConfig = {
      fuelPricePerLiter: 1700,
      neighborhoods: [makeNeighborhood('A', 37.5, 127.0)],
      commutes: { A: { distanceKm: 1, carDurationMin: 5, transitDurationMin: 10, transitFareKrw: 1400 } },
    };
    const provider: DataProvider = new FixtureDataProvider(config);
    await expect(provider.getCommute({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).rejects.toThrow(
      'No fixture commute for location 0,0',
    );
  });

  it('일치하는 동네는 있으나 commutes에 코드가 없으면 throw', async () => {
    const config: FixtureConfig = {
      fuelPricePerLiter: 1700,
      neighborhoods: [makeNeighborhood('A', 37.5, 127.0)],
      commutes: {}, // A에 대한 통근 데이터 없음
    };
    const provider: DataProvider = new FixtureDataProvider(config);
    await expect(
      provider.getCommute({ lat: 37.5, lng: 127.0 }, { lat: 0, lng: 0 }),
    ).rejects.toThrow('No fixture commute for neighborhood code A');
  });
});
