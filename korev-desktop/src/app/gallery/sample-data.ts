import type { DiffLine, FileRowProps, FindingProps } from '../../design-system';

export const SAMPLE_HUNK: DiffLine[] = [
  {
    type: 'hunk',
    code: '@@ -38,11 +38,17 @@ export async function take(key: string, cost = 1)',
  },
  { type: 'ctx', code: '  const cfg = limits.forTenant(key);' },
  { type: 'ctx', code: '  const bucket = await store.get(key);' },
  { type: 'del', code: '  if (bucket.tokens >= cost) {' },
  { type: 'del', code: '    bucket.tokens -= cost;' },
  { type: 'add', code: '  const now = Date.now();', flag: true },
  {
    type: 'add',
    code: '  const tokens = refill(bucket, cfg, now);',
    flag: true,
  },
  { type: 'add', code: '  if (tokens >= cost) {', flag: true },
  {
    type: 'add',
    code: '    await store.set(key, { tokens: tokens - cost, at: now });',
    flag: true,
  },
  { type: 'ctx', code: '    return { ok: true };' },
  { type: 'ctx', code: '  }' },
  { type: 'add', code: '  // caller sets Retry-After from this value' },
  {
    type: 'add',
    code: '  return { ok: false, retryInMs: msUntil(cfg, tokens, cost) };',
  },
  { type: 'del', code: '  return { ok: false };' },
  { type: 'ctx', code: '}' },
];

export const SAMPLE_NOTE_LINE = 8;

type SampleFinding = Pick<
  FindingProps,
  'level' | 'category' | 'location' | 'status'
> & { id: string; title: string; body: string };

export const SAMPLE_FINDINGS: SampleFinding[] = [
  {
    id: 'f1',
    level: 'high',
    category: 'Concurrency',
    location: 'src/api/limiter.ts:44',
    title: 'Read-modify-write on the token bucket is not atomic',
    body: 'take() reads the bucket, refills it in process, then writes it back. Two concurrent requests for the same tenant can both read tokens = 1 and both succeed.',
  },
  {
    id: 'f2',
    level: 'critical',
    category: 'Reliability',
    location: 'src/api/store/redis.ts:21',
    title: 'Limiter fails closed when Redis is unreachable',
    body: 'get() throws on connection errors and take() does not catch it, so every public request returns 500 during a Redis blip.',
  },
  {
    id: 'f3',
    level: 'medium',
    category: 'Behavior change',
    location: 'src/api/routes/public.ts:17',
    title: '429 response drops the Retry-After header',
    body: 'The old throttle set Retry-After in seconds. Two SDKs in this org read it to back off.',
    status: 'accepted',
  },
  {
    id: 'f4',
    level: 'low',
    category: 'Config',
    location: 'src/api/config.ts:12',
    title: 'Default burst of 50 is not documented',
    body: 'docs/rate-limits.md lists the sustained rate but not the burst size.',
    status: 'resolved',
  },
];

export const SAMPLE_FILES: FileRowProps[] = [
  {
    path: 'src/api/limiter.ts',
    status: 'M',
    additions: 64,
    deletions: 12,
    risk: 'high',
  },
  {
    path: 'src/api/store/redis.ts',
    status: 'M',
    additions: 38,
    deletions: 4,
    risk: 'high',
  },
  {
    path: 'src/api/middleware/tenant.ts',
    status: 'A',
    additions: 52,
    deletions: 0,
    risk: 'low',
  },
  {
    path: 'src/api/config.ts',
    status: 'M',
    additions: 6,
    deletions: 1,
    reviewed: true,
  },
  { path: 'src/legacy/throttle.ts', status: 'D', additions: 0, deletions: 41 },
  {
    path: 'docs/rate-limits.md',
    status: 'R',
    additions: 55,
    deletions: 0,
  },
];
