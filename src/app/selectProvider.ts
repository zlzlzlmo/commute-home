import { FixtureDataProvider, DataProvider } from '@/lib/recommend/provider';
import { SAMPLE_FIXTURE } from '@/lib/recommend/fixtures';
import { RealDataProvider } from '@/lib/recommend/providers/realDataProvider';

const DEMO_REGION = '11680';

export function selectProvider(env: Record<string, string | undefined>): {
  provider: DataProvider;
  regionCode: string;
  isDemo: boolean;
} {
  const required = ['DATA_GO_KR_SERVICE_KEY', 'KAKAO_REST_API_KEY', 'ODSAY_API_KEY', 'OPINET_API_KEY'];
  const hasAll = required.every((k) => !!env[k]);
  if (!hasAll) {
    return { provider: new FixtureDataProvider(SAMPLE_FIXTURE), regionCode: DEMO_REGION, isDemo: true };
  }
  const provider = new RealDataProvider({
    fetchFn: fetch as unknown as ConstructorParameters<typeof RealDataProvider>[0]['fetchFn'],
    keys: {
      dataGoKr: env.DATA_GO_KR_SERVICE_KEY!,
      kakaoRest: env.KAKAO_REST_API_KEY!,
      odsay: env.ODSAY_API_KEY!,
      opinet: env.OPINET_API_KEY!,
    },
  });
  return { provider, regionCode: DEMO_REGION, isDemo: false };
}
