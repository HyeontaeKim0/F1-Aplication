import { cacheLife, cacheTag } from "next/cache";
import { openf1 } from "./client";
import type {
  ChampionshipDriver,
  ChampionshipTeam,
  Driver,
  Meeting,
  Session,
  SessionResult,
} from "./types";

// 데이터 함수는 'use cache'로 감싼다. cacheLife는 각 함수 안에서 직접 호출한다.
// 진행 중인 시즌만 짧게(hours), 지난 시즌은 사실상 불변(max).
// 연도 비교는 캐시 스코프 밖의 Date 사용을 피하려고 인자로 받은 값과 고정 상수로 처리한다.
// TODO(미정 사항 1): 현재 시즌 값은 지원 시즌 범위 결정 시 src/lib/f1/season.ts로 옮긴다.
const CURRENT_SEASON = 2026;

export async function getMeetings(year: number): Promise<Meeting[]> {
  "use cache";
  if (year >= CURRENT_SEASON) {
    cacheLife("hours");
    cacheTag(`season-${year}`);
  } else {
    cacheLife("max");
  }
  return openf1<Meeting>("meetings", { year });
}

export async function getSessions(
  meetingKey: number,
  year: number,
): Promise<Session[]> {
  "use cache";
  if (year >= CURRENT_SEASON) {
    cacheLife("hours");
    cacheTag(`season-${year}`);
  } else {
    cacheLife("max");
  }
  return openf1<Session>("sessions", { meeting_key: meetingKey });
}

export async function getSessionResult(
  sessionKey: number,
  year: number,
): Promise<SessionResult[]> {
  "use cache";
  if (year >= CURRENT_SEASON) {
    cacheLife("hours");
    cacheTag(`season-${year}`);
  } else {
    cacheLife("max");
  }
  return openf1<SessionResult>("session_result", { session_key: sessionKey });
}

export async function getDrivers(
  sessionKey: number,
  year: number,
): Promise<Driver[]> {
  "use cache";
  if (year >= CURRENT_SEASON) {
    cacheLife("hours");
    cacheTag(`season-${year}`);
  } else {
    cacheLife("max");
  }
  return openf1<Driver>("drivers", { session_key: sessionKey });
}

export async function getDriverStandings(
  sessionKey: number,
  year: number,
): Promise<ChampionshipDriver[]> {
  "use cache";
  if (year >= CURRENT_SEASON) {
    cacheLife("hours");
    cacheTag(`season-${year}`);
  } else {
    cacheLife("max");
  }
  return openf1<ChampionshipDriver>("championship_drivers", {
    session_key: sessionKey,
  });
}

export async function getTeamStandings(
  sessionKey: number,
  year: number,
): Promise<ChampionshipTeam[]> {
  "use cache";
  if (year >= CURRENT_SEASON) {
    cacheLife("hours");
    cacheTag(`season-${year}`);
  } else {
    cacheLife("max");
  }
  return openf1<ChampionshipTeam>("championship_teams", {
    session_key: sessionKey,
  });
}
