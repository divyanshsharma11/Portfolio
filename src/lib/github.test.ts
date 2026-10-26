import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const REPO = {
  name: 'calendlyIntegration',
  pushed_at: '2026-10-01T10:00:00Z',
  html_url: 'https://github.com/divyanshsharma11/calendlyIntegration',
  language: 'JavaScript',
}
const USER = { public_repos: 33, followers: 11 }

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
const route = (url: string) => (url.includes('/repos') ? ok([REPO]) : ok(USER))

// github.ts keeps module-level state (failure count, breaker timestamp), so every test gets a fresh copy.
async function load() {
  vi.resetModules()
  const system = await import('./system')
  const github = await import('./github')
  return { ...github, ...system }
}

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
  return store
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-26T12:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('GitHub feed', () => {
  it('goes live, closes the breaker and caches the result', async () => {
    const store = stubStorage()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => route(url)),
    )
    const { refresh, system } = await load()

    await refresh()

    const s = system.get()
    expect(s.feed).toBe('live')
    expect(s.breaker).toBe('closed')
    expect(s.github?.repos).toBe(33)
    expect(store.get('gh-cache-v1')).toContain('calendlyIntegration')
  })

  it('opens the breaker after repeated failures and serves cached data', async () => {
    const cached = { repos: 30, followers: 9, recent: [REPO], fetchedAt: Date.now() - 60_000 }
    stubStorage({ 'gh-cache-v1': JSON.stringify(cached) })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => route(url)),
    )
    const { setChaos, system } = await load()

    setChaos(true)
    await vi.advanceTimersByTimeAsync(3000)

    const s = system.get()
    expect(s.breaker).toBe('open')
    expect(s.feed).toBe('cached')
    expect(s.github?.repos).toBe(30)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports offline when GitHub is down and nothing is cached', async () => {
    stubStorage()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    )
    const { refresh, system } = await load()

    const p = refresh()
    await vi.advanceTimersByTimeAsync(3000)
    await p

    expect(system.get().feed).toBe('offline')
    expect(system.get().github).toBeNull()
  })

  it('recovers through half-open once the cooldown has passed and the failure is gone', async () => {
    stubStorage()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => route(url)),
    )
    const { setChaos, refresh, system } = await load()

    setChaos(true)
    await vi.advanceTimersByTimeAsync(3000)
    expect(system.get().breaker).toBe('open')

    setChaos(false)
    await refresh() // still inside the cooldown: must not call GitHub
    expect(system.get().breaker).toBe('open')
    expect(fetch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(8000)
    await refresh()
    expect(system.get().breaker).toBe('closed')
    expect(system.get().feed).toBe('live')
  })

  it('rejects payloads with non-GitHub links', async () => {
    stubStorage()
    const evil = { ...REPO, html_url: 'javascript:alert(1)' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url.includes('/repos') ? ok([evil]) : ok(USER))),
    )
    const { refresh, system } = await load()

    const p = refresh()
    await vi.advanceTimersByTimeAsync(3000)
    await p

    expect(system.get().github).toBeNull()
    expect(system.get().feed).toBe('offline')
  })

  it('ignores a tampered cache', async () => {
    const tampered = {
      repos: 1,
      followers: 1,
      recent: [{ ...REPO, html_url: 'javascript:alert(1)' }],
      fetchedAt: Date.now(),
    }
    stubStorage({ 'gh-cache-v1': JSON.stringify(tampered) })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    )
    const { refresh, system } = await load()

    const p = refresh()
    await vi.advanceTimersByTimeAsync(3000)
    await p

    expect(system.get().github).toBeNull()
  })
})

describe('system helpers', () => {
  it('formats relative times', async () => {
    const { ago } = await load()
    expect(ago(Date.now() - 30_000)).toBe('30s ago')
    expect(ago(Date.now() - 5 * 60_000)).toBe('5m ago')
    expect(ago(Date.now() - 3 * 3_600_000)).toBe('3h ago')
    expect(ago(Date.now() - 2 * 86_400_000)).toBe('2d ago')
  })

  it('keeps the event log bounded, newest first', async () => {
    const { log, system } = await load()
    for (let i = 0; i < 100; i++) log(`event ${i}`)
    const { events } = system.get()
    expect(events).toHaveLength(80)
    expect(events[0].text).toBe('event 99')
  })
})
