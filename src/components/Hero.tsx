import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { FileText, RotateCcw } from 'lucide-react'
import { useResume } from '../lib/resume'
import { profile, integrations, certification, stats } from '../data'
import { log } from '../lib/system'
import type { SectionId } from '../sections'

type Kind = 'string' | 'number' | 'string[]' | 'status'
type FieldKey = 'name' | 'role' | 'yoe' | 'connected' | 'certified' | 'status'
type SlotId = 'title' | 'headline' | 'experience' | 'stack' | 'credentials' | 'availability'

const keys = integrations.map((i) => i.key)
const WORK_PLATFORMS = Number(stats[1].value)

// The raw payload (source) and how each field reads to a human (destination).
const FIELDS: Record<FieldKey, { kind: Kind; raw: string; display: string }> = {
  name: { kind: 'string', raw: `"${profile.name}"`, display: profile.name },
  role: { kind: 'string', raw: '"backend.integrations"', display: profile.role },
  yoe: { kind: 'number', raw: '4', display: '4+ years in production backends' },
  connected: {
    kind: 'string[]',
    raw: `["${keys.slice(0, 2).join('", "')}", +${WORK_PLATFORMS - 2}]`,
    display: `${WORK_PLATFORMS} platforms, incl. ${integrations
      .slice(0, 3)
      .map((i) => i.label)
      .join(' · ')}`,
  },
  certified: { kind: 'string[]', raw: '["gcp-cdl"]', display: `${certification.name} · ${certification.issuer}` },
  status: {
    kind: 'status',
    raw: '"open_to_work"',
    display: 'Open to roles · Bengaluru, India · Pune · Gurgaon · Open to remote',
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

type Wire = { slot: SlotId; field: FieldKey; d: string }
type Drag = { key: FieldKey; x: number; y: number; over: SlotId | null; d: string }

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
}

export default function Hero({ onOpen }: { onOpen: (s: SectionId) => void }) {
  const [map, setMap] = useState(DEFAULT)
  const [picked, setPicked] = useState<FieldKey | null>(null)
  const [hotField, setHotField] = useState<FieldKey | null>(null)
  const [hotSlot, setHotSlot] = useState<SlotId | null>(null)
  const [err, setErr] = useState<{ slot: SlotId; msg: string; n: number } | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [wires, setWires] = useState<Wire[]>([])
  const [wide, setWide] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const fieldEls = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({})
  const slotEls = useRef<Partial<Record<SlotId, HTMLElement | null>>>({})
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const resume = useResume()

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

  const reset = () => {
    setMap(DEFAULT)
    setErr(null)
    log('mapping reset to defaults')
  }
  const changed = SLOTS.some((s) => map[s.id] !== s.def)
  const mapped = new Set(Object.values(map))
  const litFields = new Set<FieldKey>(
    [hotField, picked, drag?.key, hotSlot && map[hotSlot]].filter(Boolean) as FieldKey[],
  )

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
              onClick={(e) => e.detail === 0 && setPicked((p) => (p === k ? null : k))}
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
          {SLOTS.map((s) => (
            <button
              key={s.id}
              data-slot={s.id}
              ref={(el) => {
                slotEls.current[s.id] = el
              }}
              className={`slot ${s.id} ${drag?.over === s.id ? 'over' : ''} ${err?.slot === s.id ? 'err' : ''} ${
                hotSlot === s.id || litFields.has(map[s.id]) ? 'lit' : ''
              }`}
              onClick={() => picked && connect(s.id, picked)}
              onMouseEnter={() => setHotSlot(s.id)}
              onMouseLeave={() => setHotSlot(null)}
              tabIndex={picked ? 0 : -1}
            >
              <small>
                {s.label}
                {map[s.id] !== s.def && <em> ← {map[s.id]}</em>}
              </small>
              <span className="val">{FIELDS[map[s.id]].display}</span>
              {err?.slot === s.id && (
                <span key={err.n} className="slot-err">
                  {err.msg}
                </span>
              )}
            </button>
          ))}
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

      <div className="hero-foot">
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
    </motion.div>
  )
}
