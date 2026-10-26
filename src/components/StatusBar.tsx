import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ago, useSystem } from '../lib/system'
import { setChaos } from '../lib/github'

const FEED_LABEL = { connecting: 'connecting', live: 'live', cached: 'cached', offline: 'offline' } as const

export default function StatusBar() {
  const s = useSystem()
  const [open, setOpen] = useState(false)
  const opened = useRef(false)
  const lastPush = s.github?.recent[0]?.pushed_at

  // The first time someone breaks the site, show them the log so they can watch it recover.
  useEffect(() => {
    if (s.chaos && !opened.current) {
      opened.current = true
      setOpen(true)
    }
  }, [s.chaos])

  return (
    <>
      <footer className="statusbar">
        <div className="sb-left">
          <span className={`feed ${s.feed}`}>
            <i /> GitHub {FEED_LABEL[s.feed]}
          </span>
          <span className="sb-dim">breaker {s.breaker}</span>
          {lastPush && <span className="sb-dim hide-sm">last push {ago(lastPush)}</span>}
        </div>
        <div className="sb-right">
          <label
            className={`switch ${s.chaos ? 'on' : ''}`}
            title="Cuts this site's live GitHub connection on purpose. The recovery you see is real code."
          >
            <input type="checkbox" checked={s.chaos} onChange={(e) => setChaos(e.target.checked)} />
            <span /> Break it
          </label>
          <button className="sb-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            Event log <b>{s.events.length}</b>
          </button>
        </div>
      </footer>
      <AnimatePresence>
        {open && (
          <motion.div
            className="console"
            role="log"
            aria-label="Event log"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="console-head">
              <span>event stream · this session only, not tracked or stored</span>
              <button onClick={() => setOpen(false)} aria-label="Close event log">
                ×
              </button>
            </div>
            {s.events.map((e) => (
              <div key={e.id} className={e.tone}>
                <span>{new Date(e.at).toLocaleTimeString([], { hour12: false })}</span> {e.text}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
