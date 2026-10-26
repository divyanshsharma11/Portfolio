import { system, log, ago, type GithubData, type Repo } from './system'

// Live GitHub data behind a real circuit breaker, retry with backoff and a cache fallback.
// "Break it" mode injects failures before the request goes out; everything after that is the real recovery path.

const USER = 'divyanshsharma11'
const CACHE_KEY = 'gh-cache-v1'
const FAILS_TO_OPEN = 3
const COOLDOWN_MS = 8000
const BACKOFF_MS = [500, 1000]
const PROBE_MS = 4000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let failures = 0
let openedAt = 0
let inflight = false

// Anything that ends up in an href or on screen is checked first, whether it came from the API or from localStorage.
const isRepo = (r: Repo) =>
  typeof r?.name === 'string' &&
  typeof r.html_url === 'string' &&
  r.html_url.startsWith('https://github.com/') &&
  !Number.isNaN(Date.parse(r.pushed_at))

const isGithubData = (d: GithubData): boolean =>
  Number.isFinite(d?.repos) &&
  Number.isFinite(d.followers) &&
  Number.isFinite(d.fetchedAt) &&
  Array.isArray(d.recent) &&
  d.recent.every(isRepo)

function readCache(): GithubData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const data = raw ? (JSON.parse(raw) as GithubData) : null
    return data && isGithubData(data) ? data : null
  } catch {
    return null
  }
}

function writeCache(data: GithubData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // storage unavailable: the in-memory copy still works as a fallback
  }
}

async function request(path: string) {
  const t0 = performance.now()
  if (system.get().chaos) {
    await sleep(200)
    throw new Error('injected: connection reset')
  }
  const res = await fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  log(`GET ${path.split('?')[0]} → ${res.status} in ${Math.round(performance.now() - t0)}ms`, 'ok')
  return json
}

async function fetchGithub(): Promise<GithubData> {
  const [user, repos] = await Promise.all([
    request(`/users/${USER}`),
    request(`/users/${USER}/repos?sort=pushed&per_page=4`),
  ])
  if (typeof user?.public_repos !== 'number' || !Array.isArray(repos)) throw new Error('unexpected payload shape')
  const data: GithubData = {
    repos: user.public_repos,
    followers: user.followers,
    recent: (repos as Repo[]).map(({ name, pushed_at, html_url, language }) => ({
      name,
      pushed_at,
      html_url,
      language,
    })),
    fetchedAt: Date.now(),
  }
  if (!isGithubData(data)) throw new Error('unexpected payload shape')
  return data
}

function openBreaker() {
  openedAt = Date.now()
  system.set({ breaker: 'open' })
  log(`circuit breaker OPEN: pausing GitHub calls for ${COOLDOWN_MS / 1000}s`, 'err')
}

async function attempt(trial: boolean): Promise<GithubData> {
  for (let i = 0; ; i++) {
    try {
      return await fetchGithub()
    } catch (e) {
      failures++
      const why = e instanceof Error ? e.message : 'request failed'
      if (trial || failures >= FAILS_TO_OPEN || i >= BACKOFF_MS.length) {
        log(`GitHub request failed (${why})`, 'err')
        if (trial || failures >= FAILS_TO_OPEN) openBreaker()
        throw e
      }
      log(`GitHub request failed (${why}). Retrying in ${BACKOFF_MS[i]}ms`, 'warn')
      await sleep(BACKOFF_MS[i])
    }
  }
}

export async function refresh() {
  if (inflight) return
  let trial = false
  if (system.get().breaker === 'open') {
    if (Date.now() - openedAt < COOLDOWN_MS) return
    trial = true
    system.set({ breaker: 'half-open' })
    log('circuit breaker HALF-OPEN: sending one trial request', 'warn')
  }
  inflight = true
  try {
    const data = await attempt(trial)
    const feed = system.get().feed
    failures = 0
    writeCache(data)
    system.set({ github: data, feed: 'live', breaker: 'closed' })
    if (trial) log('circuit breaker CLOSED: GitHub recovered, serving live data', 'ok')
    else if (feed === 'cached' || feed === 'offline') log('GitHub reachable again: serving live data', 'ok')
  } catch {
    const cached = system.get().github ?? readCache()
    const wasFeed = system.get().feed
    system.set({ github: cached, feed: cached ? 'cached' : 'offline' })
    if (wasFeed === 'live' || wasFeed === 'connecting')
      log(
        cached
          ? `fallback: serving cached data from ${ago(cached.fetchedAt)}`
          : 'fallback: nothing cached, showing offline state',
        'warn',
      )
  } finally {
    inflight = false
  }
}

export function setChaos(on: boolean) {
  if (system.get().chaos === on) return
  system.set({ chaos: on })
  if (on) {
    log('break-it mode ON: injecting failures into GitHub requests', 'err')
    refresh()
  } else {
    log('break-it mode OFF: no more injected failures. Waiting for the breaker to retry', 'ok')
  }
}

let timer = 0
let started = false
export function startGithub() {
  if (timer) return () => {}
  if (!started) {
    started = true
    const cached = readCache()
    if (cached) system.set({ github: cached })
    log('core online: connecting to GitHub')
    refresh()
  }
  timer = window.setInterval(() => {
    const s = system.get()
    if (s.chaos || s.feed !== 'live') refresh()
  }, PROBE_MS)
  return () => {
    clearInterval(timer)
    timer = 0
  }
}
