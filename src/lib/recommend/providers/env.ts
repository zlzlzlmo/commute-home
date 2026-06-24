export interface ApiKeys {
  dataGoKr: string;
  kakaoRest: string;
  odsay: string;
  opinet: string;
}

const KEY_MAP: Array<[keyof ApiKeys, string]> = [
  ['dataGoKr', 'DATA_GO_KR_SERVICE_KEY'],
  ['kakaoRest', 'KAKAO_REST_API_KEY'],
  ['odsay', 'ODSAY_API_KEY'],
  ['opinet', 'OPINET_API_KEY'],
];

export function loadApiKeys(env: Record<string, string | undefined> = process.env): ApiKeys {
  const result = {} as ApiKeys;
  const missing: string[] = [];
  for (const [field, envName] of KEY_MAP) {
    const value = env[envName];
    if (!value) {
      missing.push(envName);
    } else {
      result[field] = value;
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing API keys: ${missing.join(', ')}`);
  }
  return result;
}
