import { FetchFn } from './http';
import { ApiKeys } from './env';
import { fetchOfficetelRent, aggregateRentByDong } from './realPrice';
import { geocodeAddress, fetchAmenities } from './kakaoLocal';
import { fetchCarRoute } from './kakaoCar';
import { fetchTransit } from './odsay';
import { fetchSidoFuelPrice } from './opinet';
import { getRegionInfo } from './regionTable';
import { recentDealYmds } from './dealYmd';
import { DataProvider } from '../provider';
import { CommuteData, LatLng, NeighborhoodData } from '../types';

export interface RealDataProviderOptions {
  fetchFn: FetchFn;
  keys: ApiKeys;
  dealYmds?: string[];
  amenityRadius?: number;
  maxNeighborhoods?: number;
  now?: Date;
}

export class RealDataProvider implements DataProvider {
  private readonly fetchFn: FetchFn;
  private readonly keys: ApiKeys;
  private readonly dealYmds: string[];
  private readonly amenityRadius: number;
  private readonly maxNeighborhoods: number;

  constructor(opts: RealDataProviderOptions) {
    this.fetchFn = opts.fetchFn;
    this.keys = opts.keys;
    this.dealYmds = opts.dealYmds ?? recentDealYmds(opts.now ?? new Date(), 3);
    this.amenityRadius = opts.amenityRadius ?? 500;
    this.maxNeighborhoods = opts.maxNeighborhoods ?? 10;
  }

  async listNeighborhoods(regionCode: string): Promise<NeighborhoodData[]> {
    const region = getRegionInfo(regionCode);

    // 여러 거래월의 실거래가를 모아 법정동별 집계
    const itemsPerMonth = await Promise.all(
      this.dealYmds.map((dealYmd) =>
        fetchOfficetelRent(this.fetchFn, { serviceKey: this.keys.dataGoKr, lawdCd: regionCode, dealYmd }),
      ),
    );
    const allItems = itemsPerMonth.flat();
    const byDong = aggregateRentByDong(allItems);

    // 거래 건수 많은 순으로 상한 적용 (카카오 호출 수 제한)
    const dongs = [...byDong.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, this.maxNeighborhoods);

    return Promise.all(
      dongs.map(async ([dong, rent]) => {
        const location = await geocodeAddress(
          this.fetchFn,
          this.keys.kakaoRest,
          `${region.sido} ${region.sigungu} ${dong}`,
        );
        const amenities = await fetchAmenities(this.fetchFn, this.keys.kakaoRest, location, this.amenityRadius);
        return {
          code: `${regionCode}-${dong}`,
          name: dong,
          location,
          avgMonthlyRent: rent.avgMonthlyRent,
          avgDeposit: rent.avgDeposit,
          amenities,
        } satisfies NeighborhoodData;
      }),
    );
  }

  async getCommute(from: LatLng, workplace: LatLng): Promise<CommuteData> {
    const [car, transit] = await Promise.all([
      fetchCarRoute(this.fetchFn, this.keys.kakaoRest, from, workplace),
      fetchTransit(this.fetchFn, this.keys.odsay, from, workplace),
    ]);
    return {
      distanceKm: car.distanceKm,
      carDurationMin: car.carDurationMin,
      transitDurationMin: transit.transitDurationMin,
      transitFareKrw: transit.transitFareKrw,
    };
  }

  async getFuelPricePerLiter(regionCode: string): Promise<number> {
    const region = getRegionInfo(regionCode);
    return fetchSidoFuelPrice(this.fetchFn, this.keys.opinet, region.opinetSido);
  }
}
