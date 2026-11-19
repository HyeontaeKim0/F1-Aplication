# 1차 범위 구현 계획 (시즌 일정, 결과, 순위, 드라이버/팀)

작성: 2026-11-19 / 상태: 초안 (미정 사항 결정 전)

## 목표

OpenF1 데이터를 서버에서 가져와 캐시하고, 일정, 레이스 결과, 순위, 드라이버/팀 페이지를 한국어로 제공한다. 라이브, 게시판, 뉴스, 영상은 제외한다. 모티브: https://f1-boxbox.com/ko

## 확인된 사실

### OpenF1 (curl로 확인)

| 엔드포인트                          | 확인된 필드 / 비고                                                                                                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meetings?year=`                    | `meeting_key`, `meeting_name`, `meeting_official_name`, `country_name`, `country_code`, `country_flag`, `circuit_short_name`, `circuit_image`, `circuit_type`, `date_start`, `date_end`, `gmt_offset`, `is_cancelled`. 프리시즌 테스트도 포함 |
| `sessions?meeting_key=`             | `session_key`, `session_type`, `session_name`, `date_start`, `date_end`, `is_cancelled`                                                                                                                                                       |
| `session_result?session_key=`       | `position`, `driver_number`, `number_of_laps`, `points`, `dnf`, `dns`, `dsq`, `duration`, `gap_to_leader`                                                                                                                                     |
| `drivers?session_key=`              | `driver_number`, `full_name`, `name_acronym`, `team_name`, `team_colour`, `headshot_url`, `country_code`                                                                                                                                      |
| `championship_drivers?session_key=` | `driver_number`, `position_start`, `position_current`, `points_start`, `points_current`                                                                                                                                                       |
| `championship_teams?session_key=`   | `team_name`, `position_*`, `points_*`                                                                                                                                                                                                         |
| `starting_grid`                     | 404 (해당 세션에 데이터 없음)                                                                                                                                                                                                                 |

- `session_result`는 `session_name`으로 필터할 수 없다(404). `sessions`에서 레이스 `session_key`를 먼저 구해야 한다.
- 데이터는 2023년 이후. 최신 세션은 2026 브라질 GP(`session_key` 11412).
- `drivers.country_code`는 null이었다. 국적 표시에 의존할 수 없다.
- 팀명이 시즌마다 바뀐다(2026에 "Audi" 등).
- 순위 응답은 `driver_number`/`team_name`만 주므로 `drivers`와 조인해야 한다.
- `duration`/`gap_to_leader`가 DNF나 예선에서 어떤 형태인지 미확인. 타입은 optional/union으로 잡는다.
- 무료 플랜: 인증 없음, 초당 3회, 분당 30회. 라이브 데이터는 유료.

### Next.js 16 (node_modules/next/dist/docs 기준)

- `cacheComponents`에서는 `fetch`가 기본 비캐시. 데이터 함수에 `'use cache'`와 `cacheLife`를 붙인다.
- 캐시되지 않은 접근과 런타임 API는 `<Suspense>`로 감싸야 한다(아니면 blocking-route 오류).
- `params`/`searchParams`는 App Shell에 들어가지 않는다. `<Suspense>` 안에서 `await params`.
- 동적 라우트의 `generateStaticParams`는 빈 배열이면 빌드 오류. 1개 이상 반환.
- 서버리스에서는 런타임 `use cache` 항목이 요청 사이에 유지되지 않을 수 있다. 배포 대상이 정해지면 `'use cache: remote'` 검토.
- 같은 요청 안의 동일 `fetch`는 메모이제이션된다.

## 영향 범위

현재 `src/app/`에는 `layout.tsx`, `page.tsx`, `globals.css`만 있다.

생성:

- `src/lib/openf1/client.ts`: fetch 래퍼(베이스 URL, 429/404 처리, 직렬 큐/스로틀)
- `src/lib/openf1/types.ts`: Meeting, Session, SessionResult, Driver, ChampionshipDriver, ChampionshipTeam
- `src/lib/openf1/queries.ts`: `'use cache'` 데이터 함수 (`getMeetings`, `getSessions`, `getRaceResult`, `getDrivers`, `getDriverStandings`, `getTeamStandings`)
- `src/lib/f1/season.ts`: 시즌 유틸(기본 연도, 유효 범위, 최신 레이스 세션 찾기)
- `src/lib/f1/format.ts`: 날짜(KST), 기록/갭, 상태(DNF/DNS/DSQ) 포맷터
- 라우트 (`src/app/` 아래)
  - `schedule/page.tsx`, `schedule/[year]/page.tsx`
  - `races/[year]/[meetingKey]/page.tsx`
  - `standings/[year]/page.tsx` (드라이버/팀 탭)
  - `drivers/[year]/page.tsx`, `drivers/[year]/[driverNumber]/page.tsx`
  - `teams/[year]/page.tsx`, `teams/[year]/[teamSlug]/page.tsx`
  - 각 라우트에 `loading.tsx`, `not-found.tsx`
- `src/components/`: `SeasonSelect`(클라이언트), `MeetingCard`, `ResultsTable`, `StandingsTable`, `DriverCard`, `TeamBadge`, `Nav`

수정:

- `src/app/layout.tsx`: 한국어 `lang`, 공통 내비게이션
- `src/app/page.tsx`: 다음 레이스, 최신 결과, 순위 상위 요약
- `.claude/agents/api-integrator.md`, `CLAUDE.md`: 데이터 계층 설명 갱신(필요 시)

## 단계

| 단계 | 내용                                                                                                                                            | 완료 기준                                                                                                         | 담당                          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 0    | 데이터 계층 기반: `types.ts`, `client.ts`(스로틀, 오류 처리), `queries.ts` 골격                                                                 | `getMeetings(2025)`가 타입 있는 배열 반환. `npx tsc --noEmit`, `npm run lint` 통과. 빌드 중 호출이 분당 30회 이내 | api-integrator                |
| 1    | 레이아웃과 일정 `/schedule/[year]`: `Nav`, `SeasonSelect`, 일정 카드/리스트. 프리시즌 테스트 필터링, `is_cancelled` 표시, 다음 레이스 강조      | 연도 전환 동작. `npm run build`에서 정적 셸에 일정 포함, blocking-route 경고 없음                                 | frontend-dev                  |
| 2    | 레이스 결과 `/races/[year]/[meetingKey]`: `getSessions`로 세션 목록, Race(Qualifying, Sprint) 결과. DNF/DNS/DSQ와 갭 표시. 미개최 세션은 "예정" | 완료된 GP는 순위표 표시, 미완료/404는 빈 상태 UI                                                                  | api-integrator → frontend-dev |
| 3    | 순위 `/standings/[year]`: 마지막 완료 레이스 세션 키로 `championship_*` 조회 후 `drivers`와 조인                                                | 드라이버/팀 탭에 순위, 포인트, 팀 색상 표시. 2026 최신 순위가 OpenF1 값과 일치                                    | api-integrator, frontend-dev  |
| 4    | 드라이버/팀 목록과 상세. 팀은 `team_name`으로 그룹핑                                                                                            | 목록에서 상세로 이동, 잘못된 번호/팀은 `notFound()`                                                               | api-integrator, frontend-dev  |
| 5    | 홈 요약, 메타데이터, 로딩/오류/빈 상태 정리                                                                                                     | `npm run build`, `npm run lint` 통과. 429 없이 `npm run start`로 전체 라우트 순회                                 | frontend-dev                  |

각 단계가 끝날 때마다 reviewer가 캐싱 지시자 위치, Suspense 경계, 레이트 리밋 준수, 타입 안전성을 점검한다.

## 캐싱 전략

- 과거 시즌은 사실상 불변: `cacheLife('max')` 계열, 빌드 시 프리렌더. `generateStaticParams`에 과거 연도와 대표 라운드를 최소 1개 이상.
- 진행 중인 2026 시즌: `cacheLife('hours')` 정도, 필요하면 `cacheTag('season-2026')`와 수동 `revalidateTag`. 정확한 프로필 값은 구현 시 `cacheLife.md`로 확인.
- 레이트 리밋: `client.ts`에서 요청을 직렬화(초당 3회, 분당 30회 이하), 429면 `Retry-After`/백오프로 재시도. 페이지에서 `meetings`/`sessions`를 N번 부르지 않고 상위에서 한 번만 호출해 하위로 전달.
- 정적 셸: 헤더, 내비게이션, 캐시된 목록은 셸에 넣고 URL 의존 부분(`params`)은 `<Suspense>`로 감싼다.
- 모든 데이터 패칭은 서버 컴포넌트에서. 클라이언트 컴포넌트는 `SeasonSelect`, 탭 전환 정도로 제한.

## 미정 사항 (결정 필요)

핵심 5가지:

1. **지원 시즌 범위**: 2023~2026 전부 vs 현재/직전 시즌만. 범위가 넓을수록 빌드 시 호출이 늘어난다.
2. **빌드 시 프리렌더 전략**: 분당 30회 제한 때문에 전체 프리렌더 시 한도 초과. 일부만 빌드하고 나머지는 첫 요청 때 생성(권장) vs 오래 걸려도 전부 생성.
3. **드라이버/팀 상세의 라운드별 결과**: 호출량이 커서 1차에서는 제외하고 순위/프로필만 표시(권장).
4. **한글화**: GP/국가/팀명을 한글 매핑 표로 번역 vs 영문 유지.
5. **배포 대상**: 서버리스(Vercel 등) vs 자체 호스팅. 서버리스면 `'use cache: remote'`나 외부 캐시 필요 가능.

구현 중 결정 가능:

- 드라이버 국적 표시 (`country_code`가 null이라 별도 매핑이나 다른 소스 필요, 1차 제외 가능)
- 팀 식별자 (`team_name`이 시즌마다 바뀜. 팀 상세 URL을 연도별로 둘지 연도 간 통합할지)
- 시간대 (KST 변환 vs 현지 시간 `gmt_offset` 병기)
- 스키마 불확실성 (`duration`/`gap_to_leader`의 DNF/예선 형태, 스프린트/예선 결과, 미래 세션 응답)
- OpenF1 정책 변경 가능성 (제한 초과 시 폴백 UI)
- 정적 셸 검증 (`partialPrefetching` 활성 상태에서 `generateStaticParams`가 비면 빌드 실패)
