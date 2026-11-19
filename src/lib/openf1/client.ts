import "server-only";

const BASE_URL = "https://api.openf1.org/v1";

// 무료 플랜: 초당 3회, 분당 30회. 여유를 두고 운용한다.
const MIN_INTERVAL_MS = 400;
const MAX_PER_MINUTE = 28;
const MAX_RETRIES = 3;

export class OpenF1Error extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OpenF1Error";
  }
}

export class OpenF1RateLimitError extends OpenF1Error {
  constructor() {
    super("OpenF1 rate limit exceeded", 429);
    this.name = "OpenF1RateLimitError";
  }
}

type Params = Record<string, string | number | boolean | undefined>;

// 프로세스 내 직렬 큐. 모든 요청이 이 체인을 통과한다.
let tail: Promise<unknown> = Promise.resolve();
const sentAt: number[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForSlot() {
  const now = Date.now();
  while (sentAt.length && now - sentAt[0] >= 60_000) sentAt.shift();
  let wait = 0;
  if (sentAt.length)
    wait = Math.max(0, MIN_INTERVAL_MS - (now - sentAt[sentAt.length - 1]));
  if (sentAt.length >= MAX_PER_MINUTE)
    wait = Math.max(wait, 60_000 - (now - sentAt[0]) + 50);
  if (wait > 0) await sleep(wait);
  sentAt.push(Date.now());
  while (sentAt.length && Date.now() - sentAt[0] >= 60_000) sentAt.shift();
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => undefined);
  return run;
}

function buildUrl(path: string, params: Params) {
  const url = new URL(`${BASE_URL}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function request<T>(url: string): Promise<T[]> {
  for (let attempt = 0; ; attempt++) {
    await waitForSlot();
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: "application/json" } });
    } catch (e) {
      throw new OpenF1Error(`OpenF1 network error: ${(e as Error).message}`);
    }

    // OpenF1은 결과가 없을 때 404를 준다 → 빈 배열로 취급
    if (res.status === 404) return [];

    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) throw new OpenF1RateLimitError();
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 2000 * 2 ** attempt;
      await sleep(backoff);
      continue;
    }

    if (!res.ok)
      throw new OpenF1Error(`OpenF1 ${res.status} for ${url}`, res.status);

    const data: unknown = await res.json();
    if (!Array.isArray(data))
      throw new OpenF1Error(
        `OpenF1 unexpected response shape for ${url}`,
        res.status,
      );
    return data as T[];
  }
}

/** OpenF1 GET. 결과가 없으면 []. 429는 재시도 후 OpenF1RateLimitError. */
export function openf1<T>(path: string, params: Params = {}): Promise<T[]> {
  const url = buildUrl(path, params);
  return enqueue(() => request<T>(url));
}
