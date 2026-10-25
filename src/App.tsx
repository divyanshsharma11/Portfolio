import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Command as CmdIcon, X } from 'lucide-react'
import Graph, { type SectionId } from './components/Graph'
import { PanelBody, TITLES } from './components/Panels'
import CommandPalette, { type Command } from './components/CommandPalette'
import { profile } from './data'

const IDS = Object.keys(TITLES) as SectionId[]
const fromHash = (): SectionId | null => {
  const h = window.location.hash.slice(1) as SectionId
  return IDS.includes(h) ? h : null
}

export default function App() {
  const [active, setActive] = useState<SectionId | null>(fromHash)
  const [palette, setPalette] = useState(false)

  const open = useCallback((s: SectionId | null) => {
    setActive(s)
    history.replaceState(null, '', s ? `#${s}` : window.location.pathname)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
      else if (e.key === 'Escape' && !palette) open(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, palette])

  const commands: Command[] = useMemo(() => [
    ...IDS.map((id) => ({ id, label: `Open ${TITLES[id]}`, hint: 'section', run: () => open(id) })),
    { id: 'home', label: 'Back to the map', hint: 'close panel', run: () => open(null) },
    { id: 'gh', label: 'Open GitHub', hint: 'external', run: () => window.open(profile.github, '_blank') },
    { id: 'li', label: 'Open LinkedIn', hint: 'external', run: () => window.open(profile.linkedin, '_blank') },
    { id: 'mail', label: 'Send an email', hint: profile.email, run: () => (window.location.href = `mailto:${profile.email}`) },
    { id: 'copy', label: 'Copy email address', hint: 'clipboard', run: () => navigator.clipboard?.writeText(profile.email) },
  ], [open])

  return (
    <div className="app">
      <Graph onOpen={open} active={active} />

      <header className="hud">
        <div>
          <p className="eyebrow">{profile.location}</p>
          <h1>{profile.name}</h1>
          <p className="role">{profile.role}</p>
        </div>
        <button className="kbd-btn" onClick={() => setPalette(true)} aria-label="Open command palette">
          <CmdIcon size={14} /> <kbd>Ctrl</kbd><kbd>K</kbd>
        </button>
      </header>

      <AnimatePresence>
        {!active && (
          <motion.p className="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            This is a live map of the systems I connect. Click a node, or hover the outer ones.
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && (
          <motion.aside
            key="panel" className="panel" role="dialog" aria-label={TITLES[active]}
            initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <div className="panel-top">
              <nav>
                {IDS.map((id) => (
                  <button key={id} className={id === active ? 'on' : ''} onClick={() => open(id)}>{TITLES[id]}</button>
                ))}
              </nav>
              <button className="close" onClick={() => open(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="panel-body">
              <h2>{TITLES[active]}</h2>
              <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <PanelBody id={active} />
              </motion.div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {palette && <CommandPalette commands={commands} onClose={() => setPalette(false)} />}
      </AnimatePresence>
    </div>
  )
}
