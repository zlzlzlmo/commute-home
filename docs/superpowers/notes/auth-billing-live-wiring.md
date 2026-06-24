# 인증·결제 라이브 연결 (이연 작업)

도메인 로직(entitlements/subscription/session/toss/tossWebhook)과 UI 게이팅은 구현·테스트 완료. 아래는 실제 계정/키 연결 시 할 일.

## Supabase
1. Supabase 프로젝트 생성, `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`를 `.env`에 설정.
2. `supabase/migrations/0001_subscriptions.sql` 적용(supabase db push 또는 MCP `apply_migration`).
3. `@supabase/supabase-js` 설치 후, 서버에서 클라이언트를 만들어 `createSupabaseSessionProvider(client)`로 세션 주입.
4. 로그인 UI(이메일/소셜)는 Supabase Auth 가이드대로 추가. 미들웨어/쿠키 SSR은 `node_modules/next/dist/docs/`의 현재 Next.js 가이드를 먼저 확인(AGENTS.md).

## Toss Payments
1. Toss 개발자센터에서 `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY` 발급, `.env`에 설정.
2. 결제위젯/빌링 인증 페이지에서 authKey 수령 → `issueBillingKey`로 billingKey 발급 → `subscriptions.toss_billing_key`에 저장.
3. 정기결제 시 `chargeBillingKey`로 승인.
4. Toss 웹훅 수신 라우트를 추가(현재 Next.js 라우트 핸들러 가이드를 docs에서 확인) → 바디를 `TossPaymentEvent`로 매핑 → `applyTossWebhook`로 구독 갱신 → DB 저장.
5. 실제 티어는 `effectiveTier(subscription, new Date())`로 계산해 세션과 함께 페이지에 전달, `PremiumFeature`의 `tier`로 사용(데모 토글 대체).

## 결제 금액
- 프리미엄 월 구독 금액은 제품 결정 후 `chargeBillingKey`의 `amount`/`orderName`에 반영.
