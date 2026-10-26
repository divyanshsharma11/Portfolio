import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { FileText, RotateCcw } from 'lucide-react'
import { useResume } from '../lib/resume'
import { profile, certification, workPlatforms } from '../data'
import { ago, log, setLink, system, useNow, useSystem } from '../lib/system'
import { TITLES, type SectionId } from '../sections'

type Kind = 'string' | 'number' | 'string[]' | 'status'
type FieldKey = 'name' | 'role' | 'yoe' | 'connected' | 'certified' | 'status'
type SlotId = 'title' | 'headline' | 'experience' | 'stack' | 'credentials' | 'availability'

// Transforms from raw value to what a human reads. `call` on each field is the exact expression used for `display`,
// and is what the card shows on hover.
const ROLE_LABELS: Record<string, string> = { 'backend.integrations': profile.role }
const CREDENTIALS: Record<string, string> = { 'gcp-cdl': `${certification.name} · ${certification.issuer}` }
const AVAILABILITY: Record<string, string> = { open_to_work: `Open to roles · ${profile.location}` }
const formatYears = (n: number) => `${n}+ years in production backends`
const summarize = (list: { label: string }[]) =>
  `${list.length} platforms, incl. ${list
    .slice(0, 3)
    .map((i) => i.label)
    .join(' · ')}`

type Field = {
  kind: Kind
  raw: string
  call: string
  display: string
  opens: { section: SectionId; target?: string } // where clicking the slot that shows this field leads
}
const FIELDS: Record<FieldKey, Field> = {
  name: {
    kind: 'string',
    raw: `"${profile.name}"`,
    call: 'name, as-is',
    display: profile.name,
    opens: { section: 'about' },
  },
  role: {
    kind: 'string',
    raw: '"backend.integrations"',
    call: 'ROLE_LABELS["backend.integrations"]',
    display: ROLE_LABELS['backend.integrations'],
    opens: { section: 'about' },
  },
  yoe: { kind: 'number', raw: '4', call: 'formatYears(4)', display: formatYears(4), opens: { section: 'experience' } },
  connected: {
    kind: 'string[]',
    raw: `["${workPlatforms
      .slice(0, 2)
      .map((i) => i.key)
      .join('", "')}", +${workPlatforms.length - 2}]`,
    call: `summarize(connected[${workPlatforms.length}])`,
    display: summarize(workPlatforms),
    opens: { section: 'experience' },
  },
  certified: {
    kind: 'string[]',
    raw: '["gcp-cdl"]',
    call: 'CREDENTIALS["gcp-cdl"]',
    display: CREDENTIALS['gcp-cdl'],
    opens: { section: 'about', target: 'credentials' },
  },
  status: {
    kind: 'status',
    raw: '"open_to_work"',
    call: 'AVAILABILITY["open_to_work"]',
    display: AVAILABILITY.open_to_work,
    opens: { section: 'contact' },
  },
}
const ORDER: FieldKey[] = ['name', 'role', 'yoe', 'connected', 'certified', 'status']

const SLOTS: { id: SlotId; label: string; accepts: Kind; def: FieldKey }[] = [
  { id: 'title', label: 'name', accepts: 'string', def: 'name' },
  { id: 'headline', label: 'role', accepts: 'string', def: 'role' },
  { id: 'experience', label: 'experience', accepts: 'number', def: 'yoe' },
  { id: 'stack', label: 'integrations', accepts: 'string[]', def: 'connected' },
  { id: 'credentials', label: 'credentials', accepts: 'string[]', def: 'certified' },
  { id: 'availability', label: 'availability', accepts: 'status', def: 'status' },
]
const DEFAULT = Object.fromEntries(SLOTS.map((s) => [s.id, s.def])) as Record<SlotId, FieldKey>

// The one-time drag demo: which field travels to which slot, and the key that remembers it already ran.
const DEMO_FIELD: FieldKey = 'yoe'
const DEMO_SLOT: SlotId = 'experience'
const DEMO_SEEN_KEY = 'hero-drag-demo-v1'

type Wire = { slot: SlotId; field: FieldKey; d: string }
type Drag = { key: FieldKey; x: number; y: number; over: SlotId | null; d: string }
type Demo = { from: { x: number; y: number }; to: { x: number; y: number } }

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
}

export default function Hero({ onOpen }: { onOpen: (s: SectionId, target?: string) => void }) {
  const [map, setMap] = useState(DEFAULT)
  const [picked, setPicked] = useState<FieldKey | null>(null)
  const [hotField, setHotField] = useState<FieldKey | null>(null)
  const [hotSlot, setHotSlot] = useState<SlotId | null>(null)
  const [err, setErr] = useState<{ slot: SlotId; msg: string; n: number } | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [wires, setWires] = useState<Wire[]>([])
  const [wide, setWide] = useState(false)
  const [demo, setDemo] = useState<Demo | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const fieldEls = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({})
  const slotEls = useRef<Partial<Record<SlotId, HTMLElement | null>>>({})
  const interacted = useRef(false)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const resume = useResume()
  const { github, feed, link } = useSystem()
  useNow() // keeps "last push … ago" current

  const anchor = useCallback((key: FieldKey) => {
    const b = root.current!.getBoundingClientRect()
    const f = fieldEls.current[key]!.getBoundingClientRect()
    return { x: f.right - b.left + 6, y: f.top + f.height / 2 - b.top, b }
  }, [])

  const measure = useCallback(() => {
    const el = root.current
    if (!el || el.clientWidth < 600) return setWires([])
    setWires(
      SLOTS.map((s) => {
        const from = anchor(map[s.id])
        const t = slotEls.current[s.id]!.getBoundingClientRect()
        return {
          slot: s.id,
          field: map[s.id],
          d: curve(from.x, from.y, t.left - from.b.left - 4, t.top + t.height / 2 - from.b.top),
        }
      }),
    )
  }, [map, anchor])

  useLayoutEffect(() => {
    const el = root.current!
    const ro = new ResizeObserver(() => {
      setWide(el.clientWidth >= 600)
      measure()
    })
    ro.observe(el)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [measure])
  useLayoutEffect(measure, [measure, wide, err])

  useEffect(() => {
    if (!err) return
    const t = setTimeout(() => setErr(null), 2600)
    return () => clearTimeout(t)
  }, [err])

  // If the hero unmounts while it is pointing at the core (e.g. a slot click opened a panel), let go of the link.
  useEffect(
    () => () => {
      if (system.get().link === 'card') setLink(null)
    },
    [],
  )

  // One-time demo of dragging: a field chip travels to its slot. Skipped with reduced motion, on the stacked layout,
  // or once the visitor has already touched the payload or the card.
  useEffect(() => {
    if (!wide || reduced) return
    let seen = false
    try {
      seen = localStorage.getItem(DEMO_SEEN_KEY) === '1'
    } catch {
      // storage unavailable: show the demo once per page load
    }
    if (seen) return
    const t = setTimeout(() => {
      const f = fieldEls.current[DEMO_FIELD]?.getBoundingClientRect()
      const s = slotEls.current[DEMO_SLOT]?.getBoundingClientRect()
      if (interacted.current || !f || !s) return
      setDemo({ from: { x: f.left + 24, y: f.top + f.height / 2 }, to: { x: s.left + 24, y: s.top + s.height / 2 } })
      try {
        localStorage.setItem(DEMO_SEEN_KEY, '1')
      } catch {
        // ignore
      }
    }, 2600)
    return () => clearTimeout(t)
  }, [wide, reduced])

  const connect = (slotId: SlotId, key: FieldKey) => {
    const slot = SLOTS.find((s) => s.id === slotId)!
    const field = FIELDS[key]
    setPicked(null)
    if (field.kind !== slot.accepts) {
      setErr({
        slot: slotId,
        msg: `TypeError: ${slot.label} expects ${slot.accepts}, got ${field.kind}`,
        n: Date.now(),
      })
      log(`mapping rejected: ${key} → ${slot.label} (${field.kind} is not ${slot.accepts})`, 'err')
      return
    }
    if (map[slotId] === key) return
    setErr(null)
    setMap((m) => ({ ...m, [slotId]: key }))
    log(`mapping updated: ${key} → ${slot.label}`, 'ok')
  }

  const onFieldDown = (key: FieldKey) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    interacted.current = true
    const sx = e.clientX,
      sy = e.clientY
    let moved = false
    const slotAt = (x: number, y: number) =>
      ((document.elementFromPoint(x, y)?.closest('[data-slot]') as HTMLElement | null)?.dataset.slot as
        SlotId | undefined) ?? null
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return
      moved = true
      const from = anchor(key)
      setDrag({
        key,
        x: ev.clientX,
        y: ev.clientY,
        over: slotAt(ev.clientX, ev.clientY),
        d: curve(from.x, from.y, ev.clientX - from.b.left, ev.clientY - from.b.top),
      })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDrag(null)
      if (!moved) return setPicked((p) => (p === key ? null : key))
      const slot = slotAt(ev.clientX, ev.clientY)
      if (slot) connect(slot, key)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // A slot is a drop target while a field is picked; otherwise it is a shortcut to where its data comes from.
  const onSlotClick = (slotId: SlotId) => {
    interacted.current = true
    if (picked) return connect(slotId, picked)
    const { section, target } = FIELDS[map[slotId]].opens
    setLink(null)
    onOpen(section, target)
  }
  // Pointing at the slot that shows the platform list lights the matching connectors on the core.
  const pointAt = (slotId: SlotId | null) => {
    setHotSlot(slotId)
    if (slotId && map[slotId] === 'connected') setLink('card')
    else if (system.get().link === 'card') setLink(null)
  }

  const reset = () => {
    setMap(DEFAULT)
    setErr(null)
    log('mapping reset to defaults')
  }
  const changed = SLOTS.some((s) => map[s.id] !== s.def)
  const mapped = new Set(Object.values(map))
  const litFields = new Set<FieldKey>(
    [hotField, picked, drag?.key, hotSlot && map[hotSlot], link === 'core' && 'connected'].filter(
      Boolean,
    ) as FieldKey[],
  )
  const lastPush = github?.recent[0]?.pushed_at

  return (
    <motion.div
      ref={root}
      className={`hero ${wide ? 'wide' : ''} ${picked || drag ? 'picking' : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.45, delay: 0.15 }}
    >
      <svg className="wires" aria-hidden>
        {wires.map((wr) => {
          const hot = litFields.has(wr.field) || hotSlot === wr.slot
          const bad = err?.slot === wr.slot
          return (
            <g key={wr.slot} className={`wire ${hot ? 'hot' : ''} ${bad ? 'bad' : ''}`}>
              <path d={wr.d} />
              {!reduced && (
                <circle r={hot ? 3 : 2}>
                  <animateMotion dur={hot ? '1.1s' : '2.6s'} repeatCount="indefinite" path={wr.d} />
                </circle>
              )}
            </g>
          )
        })}
        {drag && <path className="wire-drag" d={drag.d} />}
      </svg>

      <div className="hero-head">
        <span>source: profile.json</span>
        <i>→</i>
        <span>destination: you</span>
      </div>

      <div className="map-grid">
        <div className="payload" aria-label="Raw profile payload">
          <div className="brace">{'{'}</div>
          {ORDER.map((k, i) => (
            <button
              key={k}
              ref={(el) => {
                fieldEls.current[k] = el
              }}
              className={`field ${litFields.has(k) ? 'lit' : ''} ${mapped.has(k) ? '' : 'unmapped'} ${picked === k ? 'picked' : ''}`}
              onPointerDown={onFieldDown(k)}
              onClick={(e) => {
                if (e.detail !== 0) return
                interacted.current = true
                setPicked((p) => (p === k ? null : k))
              }}
              onMouseEnter={() => setHotField(k)}
              onMouseLeave={() => setHotField(null)}
              aria-pressed={picked === k}
              title={`${FIELDS[k].kind}: drag onto the card`}
            >
              <span className="k">"{k}"</span>:{' '}
              <span className={`v ${FIELDS[k].kind.replace('[]', '-list')}`}>{FIELDS[k].raw}</span>
              {i < ORDER.length - 1 ? ',' : ''}
            </button>
          ))}
          <div className="brace">{'}'}</div>
        </div>

        <div className="gutter" aria-hidden />

        <div className="dest">
          {SLOTS.map((s) => {
            const f = FIELDS[map[s.id]]
            return (
              <button
                key={s.id}
                data-slot={s.id}
                ref={(el) => {
                  slotEls.current[s.id] = el
                }}
                className={`slot ${s.id} ${drag?.over === s.id || (demo && s.id === DEMO_SLOT) ? 'over' : ''} ${
                  err?.slot === s.id ? 'err' : ''
                } ${hotSlot === s.id || litFields.has(map[s.id]) ? 'lit' : ''}`}
                onClick={() => onSlotClick(s.id)}
                onMouseEnter={() => pointAt(s.id)}
                onMouseLeave={() => pointAt(null)}
                onFocus={() => pointAt(s.id)}
                onBlur={() => pointAt(null)}
              >
                <small>
                  <span className="lbl">
                    {s.label}
                    {map[s.id] !== s.def && <em> ← {map[s.id]}</em>}
                  </span>
                  <span className="fn">← {f.call}</span>
                  <span className="go">open {TITLES[f.opens.section]} ↗</span>
                </small>
                <span className="val">{f.display}</span>
                {err?.slot === s.id && (
                  <span key={err.n} className="slot-err">
                    {err.msg}
                  </span>
                )}
              </button>
            )
          })}
          {lastPush && (
            <button className="activity" onClick={() => onOpen('projects')}>
              <i className={feed} /> Active on GitHub · last push {ago(lastPush)}
              {feed === 'cached' && ' (cached)'}
            </button>
          )}
          <div className="cta">
            <button className="btn primary" onClick={() => onOpen('projects')}>
              Explore projects
            </button>
            <button className="btn" onClick={() => onOpen('lab')}>
              Try the pipeline lab
            </button>
            {resume && (
              <a className="btn" href={resume} target="_blank" rel="noreferrer">
                <FileText size={15} /> Résumé
              </a>
            )}
          </div>
        </div>
      </div>

      <div className={`hero-foot ${demo ? 'nudge' : ''}`}>
        <span>
          {picked
            ? `Now pick a slot on the card for "${picked}".`
            : 'Drag a field onto the card, or click a field and then a slot. Types are validated.'}
        </span>
        {changed && (
          <button className="reset" onClick={reset}>
            <RotateCcw size={12} /> Reset mapping
          </button>
        )}
      </div>

      {drag &&
        createPortal(
          <div className="ghost" style={{ left: drag.x, top: drag.y }}>
            "{drag.key}"
          </div>,
          document.body,
        )}
      {demo &&
        createPortal(
          <motion.div
            className="ghost demo"
            aria-hidden
            initial={{ left: demo.from.x, top: demo.from.y, opacity: 0 }}
            animate={{
              left: [demo.from.x, demo.from.x, demo.to.x, demo.to.x],
              top: [demo.from.y, demo.from.y, demo.to.y, demo.to.y],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 2.2, times: [0, 0.15, 0.7, 1], ease: 'easeInOut' }}
            onAnimationComplete={() => setDemo(null)}
          >
            "{DEMO_FIELD}"
          </motion.div>,
          document.body,
        )}
    </motion.div>
  )
}
