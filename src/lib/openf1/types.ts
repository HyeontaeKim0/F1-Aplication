// OpenF1 응답 타입. 실제 응답으로 확인한 필드만 정의하고, 불확실한 값은 null/optional로 둔다.

export type Meeting = {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_key: number;
  country_code: string;
  country_name: string;
  country_flag: string;
  circuit_key: number;
  circuit_short_name: string;
  circuit_type: string;
  circuit_image: string;
  /** "11:00:00" 형태 */
  gmt_offset: string;
  /** ISO 8601 (UTC offset 포함) */
  date_start: string;
  date_end: string;
  year: number;
  is_cancelled: boolean;
};

export type Session = {
  session_key: number;
  /** Practice | Qualifying | Race 등 */
  session_type: string;
  /** "Practice 1", "Sprint Qualifying", "Sprint", "Race" 등 */
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_code: string;
  country_name: string;
  location: string;
  gmt_offset: string;
  year: number;
  is_cancelled: boolean;
};

export type SessionResult = {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  /** DNF/DNS/DSQ면 null */
  position: number | null;
  number_of_laps: number | null;
  points: number | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  /** 레이스는 초 단위 number. 예선 등은 형태 미확인 → 사용 전 좁혀서 처리 */
  duration: number | number[] | null;
  gap_to_leader: number | string | (number | string | null)[] | null;
};

export type Driver = {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  /** 6자리 hex, '#' 없음 */
  team_colour: string;
  first_name?: string;
  last_name?: string;
  headshot_url: string | null;
  /** 실제로 null이 확인됨. 국적 표시에 의존하지 말 것 */
  country_code: string | null;
};

export type ChampionshipDriver = {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  position_start: number | null;
  position_current: number;
  points_start: number | null;
  points_current: number;
};

export type ChampionshipTeam = {
  meeting_key: number;
  session_key: number;
  team_name: string;
  position_start: number | null;
  position_current: number;
  points_start: number | null;
  points_current: number;
};
