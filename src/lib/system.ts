import { useEffect, useState, useSyncExternalStore } from 'react'

// Site-wide state shared by the core, the status bar and the panels.
export type Breaker = 'closed' | 'open' | 'half-open'
export type Feed = 'connecting' | 'live' | 'cached' | 'offline'
export type Tone = 'ok' | 'warn' | 'err' | 'info'
export type SysEvent = { id: number; at: number; text: string; tone: Tone }
export type Repo = { name: string; pushed_at: string; html_url: string; language: string | null }
export type GithubData = { repos: number; followers: number; recent: Repo[]; fetchedAt: number }

// Which side is pointing at the work platforms: the hero card's integrations slot or a connector on the core.
export type Link = 'card' | 'core' | null

type State = {
  chaos: boolean
  breaker: Breaker
  feed: Feed
  github: GithubData | null
  events: SysEvent[]
  link: Link
}

let state: State = { chaos: false, breaker: 'closed', feed: 'connecting', github: null, events: [], link: null }
const listeners = new Set<() => void>()
let seq = 0

export const system = {
  get: () => state,
  set(patch: Partial<State>) {
    state = { ...state, ...patch }
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export const useSystem = () => useSyncExternalStore(system.subscribe, system.get)

export function log(text: string, tone: Tone = 'info') {
  system.set({ events: [{ id: ++seq, at: Date.now(), text, tone }, ...state.events].slice(0, 80) })
}

export function setLink(link: Link) {
  if (state.link !== link) system.set({ link })
}

// Re-renders the caller every `ms` so relative times ("2h ago") don't freeze between other updates.
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function ago(at: number | string) {
  const s = Math.max(0, (Date.now() - new Date(at).getTime()) / 1000)
  if (s < 60) return `${Math.round(s)}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}
