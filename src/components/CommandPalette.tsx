import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export type Command = { id: string; label: string; hint?: string; run: () => void }

export default function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useMemo(
    () => commands.filter((c) => (c.label + (c.hint ?? '')).toLowerCase().includes(q.toLowerCase())),
    [commands, q],
  )
  useEffect(() => input.current?.focus(), [])
  useEffect(() => setI(0), [q])

  const run = (c?: Command) => {
    if (c) {
      onClose()
      c.run()
    }
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setI((x) => Math.min(x + 1, list.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setI((x) => Math.max(x - 1, 0))
    } else if (e.key === 'Enter') run(list[i])
    else if (e.key === 'Escape') onClose()
  }

  return (
    <motion.div
      className="palette-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="palette"
        role="dialog"
        aria-label="Command palette"
        initial={{ y: -16, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: -16, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a command or search…"
        />
        <ul>
          {list.map((c, n) => (
            <li key={c.id} className={n === i ? 'sel' : ''} onMouseEnter={() => setI(n)} onClick={() => run(c)}>
              {c.label}
              <span>{c.hint}</span>
            </li>
          ))}
          {list.length === 0 && <li className="none">No matches</li>}
        </ul>
      </motion.div>
    </motion.div>
  )
}
