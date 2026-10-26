import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Command as CmdIcon, X } from 'lucide-react'
import Core from './components/Core'
import Hero from './components/Hero'
import PlatformChips from './components/PlatformChips'
import StatusBar from './components/StatusBar'
import { PanelBody } from './components/Panels'
import CommandPalette, { type Command } from './components/CommandPalette'
import { SECTIONS, TITLES, type SectionId } from './sections'
import { log, system } from './lib/system'
import { setChaos, startGithub } from './lib/github'
import { useResume } from './lib/resume'
import { profile } from './data'
import { coreBesideHero } from './layout'

const IDS = SECTIONS.map((s) => s.id)
const external = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')
const fromHash = (): SectionId | null => {
  const h = window.location.hash.slice(1) as SectionId
  return IDS.includes(h) ? h : null
}

export default function App() {
  const [active, setActive] = useState<SectionId | null>(fromHash)
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null)
  const [palette, setPalette] = useState(false)
  // On small screens the hero covers the screen and the core becomes a dimmed backdrop (see layout.ts).
  const [coreBeside, setCoreBeside] = useState(coreBesideHero)
  const resume = useResume()

  useEffect(() => startGithub(), [])
  useEffect(() => {
    const onResize = () => setCoreBeside(coreBesideHero())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // `target` is the id of a card inside the section; `n` makes repeated clicks on the same target fire again.
  const open = useCallback((s: SectionId | null, target?: string) => {
    setActive(s)
    setFocus(target ? { id: target, n: Date.now() } : null)
    // Only the hash changes; the path and any query string (e.g. ?utm_source=…) are kept.
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}${s ? `#${s}` : ''}`)
    if (s) log(`section.opened: ${s}${target ? ` → ${target}` : ''}`)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
      } else if (e.key === 'Escape' && !palette) open(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, palette])

  const commands: Command[] = useMemo(
    () => [
      ...IDS.map((id) => ({ id, label: `Open ${TITLES[id]}`, hint: 'section', run: () => open(id) })),
      { id: 'home', label: 'Back to the core', hint: 'close panel', run: () => open(null) },
      {
        id: 'chaos',
        label: 'Toggle "Break it" mode',
        hint: 'cut GitHub, watch recovery',
        run: () => setChaos(!system.get().chaos),
      },
      ...(resume ? [{ id: 'cv', label: 'Download résumé', hint: 'PDF', run: () => external(resume) }] : []),
      { id: 'gh', label: 'Open GitHub', hint: 'external', run: () => external(profile.github) },
      { id: 'li', label: 'Open LinkedIn', hint: 'external', run: () => external(profile.linkedin) },
      {
        id: 'mail',
        label: 'Send an email',
        hint: profile.email,
        run: () => (window.location.href = `mailto:${profile.email}`),
      },
      {
        id: 'copy',
        label: 'Copy email address',
        hint: 'clipboard',
        run: () => navigator.clipboard?.writeText(profile.email),
      },
    ],
    [open, resume],
  )

  return (
    <div className="app">
      <Core active={active} onOpen={open} compact={!coreBeside} />

      <header className="topbar">
        <button className="brand" onClick={() => open(null)}>
          divyansh<span>.</span>sharma
        </button>
        <nav className="topnav" aria-label="Sections">
          {SECTIONS.map((s) => (
            <button key={s.id} className={active === s.id ? 'on' : ''} onClick={() => open(s.id)}>
              <i style={{ background: s.color }} />
              {s.title}
            </button>
          ))}
        </nav>
        <button className="kbd-btn" onClick={() => setPalette(true)} aria-label="Open command palette">
          <CmdIcon size={14} /> <kbd>Ctrl</kbd>
          <kbd>K</kbd>
        </button>
      </header>

      <p className="core-hint" aria-hidden>
        Drag the core to spin it · tap a section or a dot to open it
      </p>
      {!coreBeside && <PlatformChips onOpen={open} />}

      <div className="hero-wrap">
        <AnimatePresence>{!active && <Hero key="hero" onOpen={open} />}</AnimatePresence>
      </div>

      <AnimatePresence>
        {active && (
          <motion.aside
            key="panel"
            className="panel"
            role="dialog"
            aria-label={TITLES[active]}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <div className="panel-top">
              <span className="panel-path">core / {active}</span>
              <button className="close" onClick={() => open(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="panel-body">
              <h2>{TITLES[active]}</h2>
              <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <PanelBody id={active} focus={focus} />
              </motion.div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <StatusBar />

      <AnimatePresence>
        {palette && <CommandPalette commands={commands} onClose={() => setPalette(false)} />}
      </AnimatePresence>
    </div>
  )
}
