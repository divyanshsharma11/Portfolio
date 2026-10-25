import { useEffect, useRef, useState } from 'react'

export type SectionId = 'about' | 'experience' | 'projects' | 'lab' | 'contact'

type Node = {
  id: string
  label: string
  kind: 'hub' | 'section' | 'int'
  section?: SectionId
  note?: string
  r: number
  base: number
  x: number
  y: number
  color: string
}

const SECTIONS: { id: SectionId; label: string; color: string }[] = [
  { id: 'about', label: 'About', color: '#7c8cff' },
  { id: 'experience', label: 'Experience', color: '#38e1c6' },
  { id: 'projects', label: 'Projects', color: '#ffb86b' },
  { id: 'lab', label: 'Pipeline Lab', color: '#ff7ab8' },
  { id: 'contact', label: 'Contact', color: '#8be28b' },
]

const INTS: { label: string; to: SectionId; note: string }[] = [
  { label: 'Calendly', to: 'projects', note: 'OAuth2 + webhooks + BullMQ worker backend' },
  { label: 'HubSpot', to: 'projects', note: 'CRM contact sync to MongoDB with email notifications' },
  { label: 'Stripe Connect', to: 'experience', note: 'Payments integration at M32 AI' },
  { label: 'Gmail', to: 'experience', note: 'Inbox sync via Google Pub/Sub push notifications' },
  { label: 'Pub/Sub', to: 'experience', note: 'GCP certified, event-driven pipelines' },
  { label: 'Redis', to: 'lab', note: 'Caching and BullMQ queues, 30% faster at Vodex AI' },
  { label: 'MongoDB', to: 'lab', note: 'Idempotent upserts for synced events' },
  { label: 'Cal.com', to: 'experience', note: 'Scheduling integration at Vodex AI' },
  { label: 'Make.com', to: 'experience', note: 'Connector app for the workflow builder' },
  { label: 'NexHealth', to: 'experience', note: 'Athenahealth + eClinicalWorks bridge' },
]

type Packet = { from: Node; to: Node; t: number; speed: number; color: string; chain: boolean }

export default function Graph({ onOpen, active }: { onOpen: (s: SectionId) => void; active: SectionId | null }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [tip, setTip] = useState<{ label: string; note: string; x: number; y: number } | null>(null)
  const activeRef = useRef(active)
  const openRef = useRef(onOpen)
  activeRef.current = active
  openRef.current = onOpen

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, raf = 0, last = 0, spawn = 0, pulse = 0
    const mouse = { x: -999, y: -999, in: false }
    let hovered: Node | null = null
    let tipId = ''

    const hub: Node = { id: 'hub', label: 'DS', kind: 'hub', r: 38, base: 0, x: 0, y: 0, color: '#ffffff' }
    const sections: Node[] = SECTIONS.map((s, i) => ({
      id: s.id, label: s.label, kind: 'section', section: s.id, r: 30,
      base: -Math.PI / 2 + (i * Math.PI * 2) / SECTIONS.length, x: 0, y: 0, color: s.color,
    }))
    const ints: (Node & { to: Node })[] = INTS.map((n, i) => ({
      id: n.label, label: n.label, kind: 'int', note: n.note, r: 9,
      base: (i * Math.PI * 2) / INTS.length + 0.3, x: 0, y: 0,
      color: SECTIONS.find((s) => s.id === n.to)!.color,
      to: sections.find((s) => s.section === n.to)!,
    }))
    const all = [hub, ...sections, ...ints]
    const packets: Packet[] = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const layout = (t: number) => {
      const narrow = w < 700
      const cx = w / 2 - (activeRef.current && !narrow ? Math.min(310, w * 0.2) : 0)
      const cy = h * (narrow ? 0.6 : 0.54)
      const m = Math.min(w, h)
      const r1 = m * (narrow ? 0.2 : 0.24)
      const r2 = m * (narrow ? 0.38 : 0.43)
      const sx = narrow ? 1 : Math.min(1.5, w / h)
      const px = mouse.in ? (mouse.x - w / 2) / w : 0
      const py = mouse.in ? (mouse.y - h / 2) / h : 0
      const move = (n: Node, tx: number, ty: number, depth: number) => {
        tx += px * depth; ty += py * depth
        n.x += (tx - n.x) * 0.12 || 0; n.y += (ty - n.y) * 0.12 || 0
      }
      if (hub.x === 0) { hub.x = cx; hub.y = cy }
      move(hub, cx, cy, 10)
      sections.forEach((n) => {
        const a = n.base + t * 0.00004
        move(n, cx + Math.cos(a) * r1 * sx, cy + Math.sin(a) * r1, 22)
      })
      ints.forEach((n) => {
        const a = n.base - t * 0.00007
        move(n, cx + Math.cos(a) * r2 * sx, cy + Math.sin(a) * r2, 40)
      })
    }

    const emit = (from: Node, to: Node, color: string, chain: boolean) =>
      packets.push({ from, to, t: 0, speed: 0.6 + Math.random() * 0.5, color, chain })

    const frame = (now: number) => {
      const dt = Math.min(now - last, 50); last = now
      layout(now)
      ctx.clearRect(0, 0, w, h)

      spawn -= dt
      if (spawn <= 0 && !reduced) {
        const n = ints[Math.floor(Math.random() * ints.length)]
        emit(n, n.to, n.color, true)
        spawn = hovered ? 120 : 380
      }

      // edges
      const hi = hovered
      const edge = (a: Node, b: Node, on: boolean, c: string) => {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = on ? c : 'rgba(150,160,190,0.13)'
        ctx.lineWidth = on ? 1.6 : 1
        ctx.globalAlpha = on ? 0.9 : 1
        ctx.stroke(); ctx.globalAlpha = 1
      }
      sections.forEach((s) => edge(hub, s, hi === s || activeRef.current === s.section, s.color))
      ints.forEach((n) => edge(n, n.to, hi === n || hi === n.to, n.color))

      // packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i]
        p.t += (dt / 1000) * p.speed
        if (p.t >= 1) {
          packets.splice(i, 1)
          if (p.chain) emit(p.to, hub, p.to.color, false)
          else pulse = 1
          continue
        }
        const x = p.from.x + (p.to.x - p.from.x) * p.t
        const y = p.from.y + (p.to.y - p.from.y) * p.t
        ctx.beginPath(); ctx.arc(x, y, 3, 0, 7)
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 12
        ctx.fill(); ctx.shadowBlur = 0
      }
      pulse *= 0.94

      // nodes
      for (const n of all) {
        const isHover = hovered === n
        const isActive = n.section && activeRef.current === n.section
        const r = n.r * (isHover ? 1.18 : 1) + (n.kind === 'hub' ? pulse * 6 : 0)
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7)
        if (n.kind === 'hub') {
          const g = ctx.createRadialGradient(n.x, n.y, 2, n.x, n.y, r)
          g.addColorStop(0, '#7c8cff'); g.addColorStop(1, '#38e1c6')
          ctx.fillStyle = g; ctx.shadowColor = '#7c8cff'; ctx.shadowBlur = 24 + pulse * 30
          ctx.fill(); ctx.shadowBlur = 0
          ctx.fillStyle = '#0b0d12'; ctx.font = '800 20px Inter, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText('DS', n.x, n.y + 1)
        } else if (n.kind === 'section') {
          ctx.fillStyle = isActive ? n.color : '#12151c'
          ctx.strokeStyle = n.color; ctx.lineWidth = isHover || isActive ? 3 : 2
          ctx.shadowColor = n.color; ctx.shadowBlur = isHover ? 26 : 10
          ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0
          ctx.fillStyle = isActive ? '#0b0d12' : '#e8eaf0'
          ctx.font = '600 12px Inter, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          const words = n.label.split(' ')
          words.forEach((wd, i) => ctx.fillText(wd, n.x, n.y + (i - (words.length - 1) / 2) * 13))
        } else {
          ctx.fillStyle = isHover ? n.color : '#12151c'
          ctx.strokeStyle = n.color; ctx.lineWidth = 2
          ctx.fill(); ctx.stroke()
          ctx.fillStyle = isHover ? '#fff' : '#9aa1b2'
          ctx.font = '500 11px Inter, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
          ctx.fillText(n.label, n.x, n.y + r + 5)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame((t) => { last = t; frame(t) })

    const pick = (x: number, y: number) => {
      let best: Node | null = null
      for (const n of all) {
        if (n.kind === 'hub') continue
        if (Math.hypot(n.x - x, n.y - y) < n.r + 8) best = n
      }
      return best
    }
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect()
      mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; mouse.in = true
      hovered = pick(mouse.x, mouse.y)
      canvas.style.cursor = hovered && hovered.kind === 'section' ? 'pointer' : 'default'
      const id = hovered?.kind === 'int' ? hovered.id : ''
      if (id !== tipId) {
        tipId = id
        setTip(hovered && hovered.kind === 'int' ? { label: hovered.label, note: hovered.note!, x: hovered.x, y: hovered.y } : null)
      }
    }
    const onLeave = () => { mouse.in = false; hovered = null; tipId = ''; setTip(null) }
    const onClick = () => {
      if (!hovered) return
      if (hovered.kind === 'section') openRef.current(hovered.section!)
      else openRef.current((hovered as (typeof ints)[number]).to.section!)
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <>
      <canvas ref={ref} className="graph" role="img" aria-label="Interactive map of integrations and portfolio sections" />
      {tip && (
        <div className="tip" style={{ left: tip.x, top: tip.y - 18 }}>
          <b>{tip.label}</b>
          <span>{tip.note}</span>
        </div>
      )}
    </>
  )
}
