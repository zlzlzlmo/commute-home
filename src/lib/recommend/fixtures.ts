import { FixtureConfig } from './provider';
import { UserInput } from './types';

export const SAMPLE_FIXTURE: FixtureConfig = {
  fuelPricePerLiter: 1700,
  neighborhoods: [
    {
      code: '1168010100',
      name: '역삼동',
      location: { lat: 37.5006, lng: 127.0366 },
      avgMonthlyRent: 750000,
      avgDeposit: 20000000,
      amenities: { convenience: 40, gym: 8, hospital: 12, mart: 5, cafe: 60, restaurant: 80, park: 2 },
    },
    {
      code: '1168010300',
      name: '대치동',
      location: { lat: 37.4942, lng: 127.0628 },
      avgMonthlyRent: 650000,
      avgDeposit: 18000000,
      amenities: { convenience: 25, gym: 5, hospital: 8, mart: 4, cafe: 30, restaurant: 45, park: 6 },
    },
    {
      code: '1168011500',
      name: '수서동',
      location: { lat: 37.487, lng: 127.101 },
      avgMonthlyRent: 520000,
      avgDeposit: 15000000,
      amenities: { convenience: 15, gym: 3, hospital: 5, mart: 3, cafe: 12, restaurant: 20, park: 9 },
    },
  ],
  commutes: {
    '1168010100': { distanceKm: 3.2, carDurationMin: 14, transitDurationMin: 22, transitFareKrw: 1400 },
    '1168010300': { distanceKm: 5.1, carDurationMin: 19, transitDurationMin: 28, transitFareKrw: 1500 },
    '1168011500': { distanceKm: 9.8, carDurationMin: 28, transitDurationMin: 41, transitFareKrw: 1700 },
  },
};

export const SAMPLE_INPUT: UserInput = {
  workplace: { lat: 37.4979, lng: 127.0276 }, // 강남역
  budgetMonthlyRent: 800000,
  budgetDeposit: 25000000,
  commuteMode: 'transit',
  hourlyValueKrw: 15000,
  livelyPreference: 0.5,
};
