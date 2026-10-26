import { useRef } from 'react'
import { integrations } from '../data'
import { SECTIONS, type SectionId } from '../sections'

const COLOR = Object.fromEntries(SECTIONS.map((s) => [s.id, s.color])) as Record<SectionId, string>

// Phones have no hover and no room for labels on the core, so every connector's name is listed here instead.
// A chip does what tapping its dot does: open the section and jump to the matching card.
export default function PlatformChips({ onOpen }: { onOpen: (s: SectionId, target?: string) => void }) {
  const taps = useRef<Record<string, number>>({}) // Gmail belongs to two roles: repeated taps alternate, as on the core

  return (
    <nav className="chips" aria-label="Platforms and projects">
      {integrations.map((it) => (
        <button
          key={it.key}
          className="chip"
          onClick={() => {
            const n = taps.current[it.key] ?? 0
            taps.current[it.key] = n + 1
            onOpen(it.section, it.targets[n % it.targets.length])
          }}
        >
          <i style={{ background: COLOR[it.section] }} />
          {it.label}
        </button>
      ))}
    </nav>
  )
}
