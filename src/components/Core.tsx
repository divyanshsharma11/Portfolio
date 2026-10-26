import { useEffect, useRef, useState } from 'react'
import { SECTIONS, type SectionId } from '../sections'
import { integrations } from '../data'
import { setLink, system } from '../lib/system'
import { heroWidth, panelWidth } from '../layout'
import { isPointerFocus } from '../lib/focus'
import { clampTipX } from '../lib/tooltip'

const TAU = Math.PI * 2
const SPAN = TAU / SECTIONS.length
const GAP = 0.06
const POWER_MS = 1800
const FLARE_MS = 700
const BAD = '#ff5d73'
const WARN = '#ffcf5c'
const OK = '#3ee6c4'
const MONO = '"JetBrains Mono Variable", ui-monospace, monospace'
const COLOR = Object.fromEntries(SECTIONS.map((s) => [s.id, s.color])) as Record<SectionId, string>

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1)
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

type Packet = { node: number; t: number; speed: number; drop: number }
type Box = { l: number; r: number; t: number; b: number }
type Readout = {
  k: string
  v: string
  col: string
  right: boolean
  x0: number
  y0: number
  x1: number
  y1: number
  x2: number
  tx: number
  box: Box
}
type Props = { active: SectionId | null; onOpen: (s: SectionId, target?: string) => void; compact: boolean }

// Per-frame easing factor tuned for 60fps, converted so the motion takes the same time at any frame rate.
const smooth = (k: number, dt: number) => 1 - Math.pow(1 - k, dt / 16.7)
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export default function Core({ active, onOpen, compact }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [tip, setTip] = useState<{ label: string; note: string; x: number; y: number } | null>(null)
  const [live, setLive] = useState('') // screen-reader announcement for the keyboard selection
  const activeRef = useRef(active)
  const openRef = useRef(onOpen)
  const compactRef = useRef(compact)
  activeRef.current = active
  openRef.current = onOpen
  compactRef.current = compact

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const N = integrations.length
    let w = 0,
      h = 0,
      raf = 0,
      last = 0,
      start = -1
    let cx = 0,
      cy = 0,
      R = 0,
      placed = false
    let rot = -Math.PI / 2 - SPAN / 2
    let outerRot = 0,
      tickRot = 0,
      intensity = 0,
      pulse = 0,
      spawn = 0
    let hoverSeg = -1,
      hoverNode = -1,
      tipNode = -1
    const mouse = { x: -1e4, y: -1e4 }
    // Drag-to-spin: the whole core turns with the pointer and keeps its momentum after release.
    let pressed = false,
      dragging = false,
      suppressClick = false,
      snap = false,
      lastAct: SectionId | null | undefined,
      flare = -1, // ms into the ring that travels out when a section opens and back in when it closes; -1 = idle
      flareOpen = true,
      flareCol = '#ffb547',
      vel = 0,
      lastAng = 0,
      lastMoveT = 0
    let lastPointerAt = -Infinity // when the last press/release on the canvas happened (see lib/focus.ts)
    let touchLeaveTimer = 0 // pending hover release after a touch ends (see onLeave)
    const TOUCH_RELEASE_MS = 400 // far longer than the gap between pointerleave and click, short enough to look instant
    const pressAt = { x: 0, y: 0 }
    const packets: Packet[] = []
    const arrivals: number[] = []
    const cycle: number[] = new Array(N).fill(0) // per-connector click counter, for connectors with several targets
    const workNodes = integrations.flatMap((it, i) => (it.section === 'experience' ? [i] : []))
    let areaL = 0, // horizontal space actually visible to the core (not under the hero card or the panel)
      areaR = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // The core sits beside the hero (see layout.ts), beside an open panel, or centred behind everything on small screens.
    const layout = (dt: number) => {
      const panel = !!activeRef.current
      const heroW = panel ? 0 : heroWidth(w)
      const panelW = panel ? panelWidth(w) : 0
      const areaW = w - heroW - panelW
      const phone = compactRef.current
      const tx = heroW + areaW / 2
      const ty = h * 0.5
      // Phone: the canvas is its own block, so use all of it. Connector dots sit at 0.82R and there are no text labels.
      const tR = phone ? (Math.min(w, h) / 2 - 10) / 0.86 : Math.max(120, Math.min(areaW / 2 - 110, (h - 110) / 2 - 40))
      const k = placed ? smooth(0.08, dt) : 1
      placed = true
      cx += (tx - cx) * k
      cy += (ty - cy) * k
      R += (tR - R) * k
      areaL = heroW
      areaR = w - panelW
    }

    const nodeAngle = (n: number) => outerRot + (n * TAU) / N
    const nodePos = (n: number) => {
      const a = nodeAngle(n)
      return { x: cx + Math.cos(a) * R * 0.82, y: cy + Math.sin(a) * R * 0.82, a }
    }

    const hit = () => {
      hoverSeg = -1
      hoverNode = -1
      for (let n = 0; n < N; n++) {
        const p = nodePos(n)
        if (Math.hypot(p.x - mouse.x, p.y - mouse.y) < 16) {
          hoverNode = n
          return
        }
      }
      const dx = mouse.x - cx,
        dy = mouse.y - cy,
        d = Math.hypot(dx, dy)
      if (d > R * 0.33 && d < R * 0.48) {
        const rel = (((Math.atan2(dy, dx) - rot) % TAU) + TAU) % TAU
        const i = Math.floor(rel / SPAN)
        const within = rel - i * SPAN
        if (within > GAP / 2 && within < SPAN - GAP / 2) hoverSeg = i
      }
    }

    const frame = (now: number) => {
      if (start < 0) start = now
      const dt = Math.min(now - last, 50)
      last = now
      const p = reduced ? 1 : clamp01((now - start) / POWER_MS)
      layout(dt)

      const s = system.get()
      const linkCard = s.link === 'card' // the hero card's platform list is being pointed at
      const degraded = s.breaker === 'open' || s.feed === 'offline'
      const recovering = s.breaker === 'half-open'
      intensity += ((degraded ? 0.38 : recovering ? 0.68 : 1) * ease(p * 1.4) - intensity) * smooth(0.06, dt)
      const I = intensity * (degraded ? 0.85 + Math.random() * 0.15 : 1)
      const fs = Math.max(9, Math.min(11, R * 0.035))

      if (!reduced) {
        if (!dragging) outerRot -= dt * 0.00005
        tickRot += dt * 0.00014
      }
      const act = activeRef.current
      if (act !== lastAct) {
        // Not on first load (a #section link), not for reduced motion, and not on phones, where the panel covers the core.
        if (lastAct !== undefined && !reduced && !compactRef.current) {
          flare = 0
          flareOpen = !!act
          flareCol = act ? COLOR[act] : '#ffb547'
        }
        lastAct = act
        snap = true // a newly opened section rotates to the top, unless the user spins the core afterwards
        vel = 0
      }
      if (!dragging && vel !== 0) {
        rot += vel * dt
        outerRot += vel * dt
        vel *= Math.pow(0.94, dt / 16)
        if (Math.abs(vel) < 0.00002) vel = 0
      }
      if (act && snap && !dragging) {
        const idx = SECTIONS.findIndex((x) => x.id === act)
        let target = -Math.PI / 2 - (idx + 0.5) * SPAN
        target += TAU * Math.round((rot - target) / TAU)
        rot += (target - rot) * smooth(0.08, dt)
      } else if (!act && !reduced && !dragging) rot += dt * 0.00003

      ctx.clearRect(0, 0, w, h)

      // polar grid
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(150,160,190,0.06)'
      for (const k of [1.12, 1.45, 1.85]) {
        ctx.beginPath()
        ctx.arc(cx, cy, R * k, 0, TAU)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(150,160,190,0.035)'
      for (let i = 0; i < 24; i++) {
        const a = (i * TAU) / 24
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
        ctx.lineTo(cx + Math.cos(a) * R * 2.4, cy + Math.sin(a) * R * 2.4)
        ctx.stroke()
      }

      // outer housing
      ctx.globalAlpha = ease((p - 0.6) / 0.3)
      ctx.strokeStyle = 'rgba(150,160,190,0.18)'
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.82, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([2, 9])
      ctx.lineDashOffset = -tickRot * R * 2
      ctx.strokeStyle = 'rgba(255,181,71,0.25)'
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.62, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1

      // Readouts show the real state of the site. Their boxes are worked out first so node labels can steer clear.
      // On phones the core shows no connector labels or readouts: there is no hover, and they would clip at this size.
      const quiet = compactRef.current
      const hudA = ease((p - 0.85) / 0.15)
      const hud: Readout[] = []
      if (hudA > 0 && R > 150 && !quiet) {
        const feedCol = s.feed === 'live' ? OK : s.feed === 'cached' ? WARN : s.feed === 'offline' ? BAD : '#9aa0ad'
        const rows: [number, string, string, string][] = [
          [
            -2.35,
            'CORE',
            degraded ? 'DEGRADED' : recovering ? 'RECOVERING' : 'STABLE',
            degraded ? BAD : recovering ? WARN : OK,
          ],
          [-0.79, 'GITHUB', s.feed.toUpperCase(), feedCol],
          [
            0.79,
            'BREAKER',
            s.breaker.toUpperCase(),
            s.breaker === 'open' ? BAD : s.breaker === 'half-open' ? WARN : OK,
          ],
          [2.35, 'FLUX', `${arrivals.length} pkt/s`, '#ecebe6'],
        ]
        for (const [ang, k, v, col] of rows) {
          const right = Math.cos(ang) > 0
          const x0 = cx + Math.cos(ang) * R * 0.98,
            y0 = cy + Math.sin(ang) * R * 0.98
          const x1 = cx + Math.cos(ang) * R * 1.06,
            y1 = cy + Math.sin(ang) * R * 1.06
          const x2 = x1 + (right ? 22 : -22)
          const tx = x2 + (right ? 6 : -6)
          ctx.font = `500 ${fs}px ${MONO}`
          const wk = ctx.measureText(k).width
          ctx.font = `600 ${fs + 1}px ${MONO}`
          const wid = Math.max(wk, ctx.measureText(v).width)
          hud.push({
            k,
            v,
            col,
            right,
            x0,
            y0,
            x1,
            y1,
            x2,
            tx,
            box: {
              l: right ? Math.min(x0, x1) : tx - wid,
              r: right ? tx + wid : Math.max(x0, x1),
              t: Math.min(y0, y1 - fs * 1.4),
              b: Math.max(y0, y1 + fs * 1.3),
            },
          })
        }
      }
      // A label is drawn only if it is fully inside the visible area and touches neither a readout nor another label;
      // the node itself is always drawn, and its name still shows in the tooltip.
      const taken: Box[] = hud.map((o) => o.box)
      const labelFits = (l: number, r: number, t: number, b: number) =>
        !quiet &&
        l >= areaL + 4 &&
        r <= areaR - 4 &&
        !taken.some((o) => l < o.r + 4 && r > o.l - 4 && t < o.b + 4 && b > o.t - 4)

      // integration connectors and their conduits
      for (let n = 0; n < N; n++) {
        const a = ease((p - 0.7 - (n * 0.18) / (N - 1)) / 0.12) // staggered, but the last one is fully in by p = 1
        if (a <= 0) continue
        const { x, y, a: ang } = nodePos(n)
        const it = integrations[n]
        const col = COLOR[it.section]
        const hot =
          hoverNode === n ||
          (hoverSeg >= 0 && SECTIONS[hoverSeg].id === it.section) ||
          (linkCard && it.section === 'experience')
        ctx.globalAlpha = a
        ctx.strokeStyle = hot ? col : 'rgba(150,160,190,0.12)'
        ctx.lineWidth = hot ? 1.5 : 1
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(ang) * R * 0.48, cy + Math.sin(ang) * R * 0.48)
        ctx.lineTo(x, y)
        ctx.stroke()

        const sz = hoverNode === n ? 9 : 7
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(ang + Math.PI / 4)
        ctx.fillStyle = hoverNode === n ? col : '#0d1016'
        ctx.strokeStyle = col
        ctx.lineWidth = 1.5
        ctx.shadowColor = col
        ctx.shadowBlur = hot ? 14 : 6 * I
        ctx.beginPath()
        ctx.rect(-sz / 2, -sz / 2, sz, sz)
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        const c = Math.cos(ang),
          sn = Math.sin(ang)
        const align = c > 0.35 ? 'left' : c < -0.35 ? 'right' : 'center'
        const baseline = sn > 0.35 ? 'top' : sn < -0.35 ? 'bottom' : 'middle'
        const lx = cx + c * (R * 0.82 + 14),
          ly = cy + sn * (R * 0.82 + 14)
        ctx.font = `500 ${fs}px ${MONO}`
        const lw = ctx.measureText(it.label).width
        const ll = align === 'left' ? lx : align === 'right' ? lx - lw : lx - lw / 2
        const lt = baseline === 'top' ? ly : baseline === 'bottom' ? ly - fs : ly - fs / 2
        if (labelFits(ll, ll + lw, lt, lt + fs)) {
          taken.push({ l: ll, r: ll + lw, t: lt, b: lt + fs })
          ctx.textAlign = align
          ctx.textBaseline = baseline
          ctx.fillStyle = hot ? '#ecebe6' : 'rgba(154,160,173,0.85)'
          ctx.fillText(it.label, lx, ly)
        }
      }
      ctx.globalAlpha = 1

      // energy packets flowing inward; while degraded, most of them fail on the way
      if (p >= 1 && !reduced) {
        spawn -= dt
        if (spawn <= 0) {
          packets.push({
            node: linkCard ? workNodes[Math.floor(Math.random() * workNodes.length)] : Math.floor(Math.random() * N),
            t: 0,
            speed: 0.35 + Math.random() * 0.25,
            drop: degraded && Math.random() < 0.65 ? 0.25 + Math.random() * 0.35 : 2,
          })
          spawn = (degraded ? 520 : 240) * (hoverSeg >= 0 || hoverNode >= 0 || linkCard ? 0.5 : 1)
        }
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i]
        pk.t += (dt / 1000) * pk.speed * (degraded ? 0.6 : 1)
        if (pk.t >= pk.drop + 0.12) {
          packets.splice(i, 1)
          continue
        }
        if (pk.t >= 1) {
          packets.splice(i, 1)
          pulse = 1
          arrivals.push(now)
          continue
        }
        const ang = nodeAngle(pk.node)
        const r = R * 0.82 + (R * 0.17 - R * 0.82) * pk.t
        const failing = pk.t > pk.drop
        const col = failing ? BAD : COLOR[integrations[pk.node].section]
        ctx.globalAlpha = failing ? 1 - (pk.t - pk.drop) / 0.12 : 1
        ctx.beginPath()
        ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, failing ? 3.5 : 2.6, 0, TAU)
        ctx.fillStyle = col
        ctx.shadowColor = col
        ctx.shadowBlur = 12
        ctx.fill()
        ctx.shadowBlur = 0
      }
      ctx.globalAlpha = 1
      while (arrivals.length && now - arrivals[0] > 1000) arrivals.shift()
      pulse *= 0.93

      // section ring
      const rIn = R * 0.33,
        rOut = R * 0.46
      SECTIONS.forEach((sec, i) => {
        const a = ease((p - 0.3 - i * 0.07) / 0.15)
        if (a <= 0) return
        const isAct = act === sec.id
        const isHov = hoverSeg === i
        const broken = degraded && sec.id === 'projects'
        const col = broken ? BAD : sec.color
        const a0 = rot + i * SPAN + GAP / 2
        const a1 = rot + (i + 1) * SPAN - GAP / 2
        const mid = (a0 + a1) / 2
        const off = isHov || isAct ? R * 0.015 : 0
        const ox = cx + Math.cos(mid) * off,
          oy = cy + Math.sin(mid) * off
        ctx.globalAlpha = a * (broken && Math.random() < 0.25 ? 0.3 : 1)
        ctx.beginPath()
        ctx.arc(ox, oy, rOut, a0, a1)
        ctx.arc(ox, oy, rIn, a1, a0, true)
        ctx.closePath()
        ctx.fillStyle = rgba(col, isAct ? 0.85 : isHov ? 0.32 : 0.12 + 0.06 * I)
        ctx.shadowColor = col
        ctx.shadowBlur = (isHov || isAct ? 24 : 10) * I
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = rgba(col, 0.9)
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(ox, oy, rOut + R * 0.025, a0 + 0.02, a1 - 0.02)
        ctx.strokeStyle = rgba(col, 0.35)
        ctx.lineWidth = 1
        ctx.stroke()
        const lr = (rIn + rOut) / 2
        ctx.fillStyle = isAct ? '#0b0d12' : '#ecebe6'
        ctx.font = `600 ${fs}px ${MONO}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(broken ? 'DEGRADED' : sec.title.toUpperCase(), ox + Math.cos(mid) * lr, oy + Math.sin(mid) * lr)
      })
      ctx.globalAlpha = 1

      // tick ring
      const tr = R * 0.26
      ctx.globalAlpha = ease((p - 0.15) / 0.2) * (0.3 + 0.4 * I)
      ctx.strokeStyle = '#ffd9a0'
      ctx.lineWidth = 1
      for (let i = 0; i < 96; i++) {
        const a = tickRot + (i * TAU) / 96
        const len = i % 8 === 0 ? R * 0.035 : R * 0.015
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * tr, cy + Math.sin(a) * tr)
        ctx.lineTo(cx + Math.cos(a) * (tr - len), cy + Math.sin(a) * (tr - len))
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // core
      const rc = R * 0.17 * ease(p * 1.6) * (1 + pulse * 0.04)
      if (rc > 1) {
        const hue = degraded ? '255,93,115' : '255,181,71'
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rc * 2.4)
        g.addColorStop(0, `rgba(255,246,230,${0.95 * I})`)
        g.addColorStop(0.28, `rgba(${hue},${0.85 * I})`)
        g.addColorStop(0.5, `rgba(${hue},${0.22 * I})`)
        g.addColorStop(1, `rgba(${hue},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, rc * 2.4, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = `rgba(${hue},0.9)`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, rc, 0, TAU)
        ctx.stroke()
        ctx.beginPath()
        for (let k = 0; k <= 6; k++) {
          const a = -tickRot * 1.5 + (k * TAU) / 6
          const x = cx + Math.cos(a) * rc * 0.66,
            y = cy + Math.sin(a) * rc * 0.66
          if (k) ctx.lineTo(x, y)
          else ctx.moveTo(x, y)
        }
        ctx.strokeStyle = `rgba(255,240,220,${0.75 * I})`
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = 'rgba(26,18,6,0.9)'
        ctx.font = `700 ${rc * 0.42}px ${MONO}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('DS', cx, cy + 1)
      }

      if (flare >= 0) {
        flare += dt
        const f = clamp01(flare / FLARE_MS)
        if (f >= 1) flare = -1
        else {
          const e = ease(f)
          ctx.save()
          ctx.globalAlpha = (1 - f) * 0.7
          ctx.strokeStyle = flareCol
          ctx.shadowColor = flareCol
          ctx.shadowBlur = 18
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(cx, cy, R * (flareOpen ? 0.2 + 1.3 * e : 1.5 - 1.3 * e), 0, TAU)
          ctx.stroke()
          ctx.restore()
        }
      }

      if (hud.length) {
        ctx.globalAlpha = hudA
        for (const o of hud) {
          ctx.strokeStyle = 'rgba(150,160,190,0.35)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(o.x0, o.y0)
          ctx.lineTo(o.x1, o.y1)
          ctx.lineTo(o.x2, o.y1)
          ctx.stroke()
          ctx.textAlign = o.right ? 'left' : 'right'
          ctx.textBaseline = 'middle'
          ctx.font = `500 ${fs}px ${MONO}`
          ctx.fillStyle = 'rgba(154,160,173,0.9)'
          ctx.fillText(o.k, o.tx, o.y1 - fs * 0.7)
          ctx.font = `600 ${fs + 1}px ${MONO}`
          ctx.fillStyle = o.col
          ctx.fillText(o.v, o.tx, o.y1 + fs * 0.6)
        }
        ctx.globalAlpha = 1
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame((t) => {
      last = t
      frame(t)
    })

    const track = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect()
      mouse.x = e.clientX - b.left
      mouse.y = e.clientY - b.top
    }
    const angleOf = () => Math.atan2(mouse.y - cy, mouse.x - cx)
    // Hovering a work-platform connector lights the matching slot on the hero card.
    const syncLink = () => {
      if (hoverNode >= 0 && integrations[hoverNode].section === 'experience') setLink('core')
      else if (system.get().link === 'core') setLink(null)
    }
    const showTip = () => {
      syncLink()
      if (hoverNode !== tipNode) {
        tipNode = hoverNode
        if (hoverNode < 0) setTip(null)
        else {
          const { x, y } = nodePos(hoverNode)
          setTip({ label: integrations[hoverNode].label, note: integrations[hoverNode].note, x, y })
        }
      }
    }
    const setCursor = () => {
      const near = Math.hypot(mouse.x - cx, mouse.y - cy) < R * 1.1
      canvas.style.cursor = dragging
        ? 'grabbing'
        : hoverSeg >= 0 || hoverNode >= 0
          ? 'pointer'
          : near
            ? 'grab'
            : 'default'
    }
    const onDown = (e: PointerEvent) => {
      window.clearTimeout(touchLeaveTimer) // a new touch cancels the pending release from the previous one
      lastPointerAt = performance.now()
      if (e.button !== 0) return
      track(e)
      hit() // taps on touch screens never produce a hover first
      pressed = true
      dragging = false
      suppressClick = false
      pressAt.x = mouse.x
      pressAt.y = mouse.y
      lastAng = angleOf()
      lastMoveT = e.timeStamp
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      track(e)
      if (pressed) {
        if (!dragging && Math.hypot(mouse.x - pressAt.x, mouse.y - pressAt.y) >= 6) {
          dragging = true
          snap = false
          vel = 0
          hoverSeg = hoverNode = -1
          showTip()
        }
        if (dragging) {
          const ang = angleOf()
          const d = Math.hypot(mouse.x - cx, mouse.y - cy) > 14 ? wrapAngle(ang - lastAng) : 0
          lastAng = ang
          rot += d
          outerRot += d
          const dtMs = Math.max(e.timeStamp - lastMoveT, 1)
          vel = Math.max(-0.02, Math.min(0.02, vel * 0.5 + (d / dtMs) * 0.5))
          lastMoveT = e.timeStamp
          setCursor()
          return
        }
      }
      hit()
      setCursor()
      showTip()
    }
    const onUp = (e: PointerEvent) => {
      lastPointerAt = performance.now()
      if (!pressed) return
      pressed = false
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
      if (dragging) {
        dragging = false
        suppressClick = true // the click that follows a drag must not open anything
        if (e.timeStamp - lastMoveT > 80) vel = 0 // held still before letting go: no fling
      }
      setCursor()
    }
    const release = () => {
      mouse.x = mouse.y = -1e4
      hoverSeg = hoverNode = tipNode = -1
      setTip(null)
      syncLink()
    }
    const onLeave = (e: PointerEvent) => {
      if (pressed) return
      // A finger lifting fires pointerleave right after pointerup and BEFORE the click (Pointer Events spec, 4.2.6 and
      // 11.3). Clearing the hover here would leave the click with nothing to open, so for touch let go a moment later.
      // A mouse never takes this path, so the desktop behaviour is unchanged.
      if (e.pointerType === 'touch') {
        window.clearTimeout(touchLeaveTimer)
        touchLeaveTimer = window.setTimeout(release, TOUCH_RELEASE_MS)
        return
      }
      release()
    }
    const onClick = () => {
      if (suppressClick) {
        suppressClick = false
        return
      }
      activate()
    }
    // Opens whatever is currently hovered or keyboard-selected.
    const activate = () => {
      if (hoverSeg >= 0) {
        snap = true
        openRef.current(SECTIONS[hoverSeg].id)
      } else if (hoverNode >= 0) {
        const it = integrations[hoverNode]
        snap = true
        openRef.current(it.section, it.targets[cycle[hoverNode]++ % it.targets.length])
      }
    }

    // Keyboard: Left/Right spin the core, Up/Down step through the sections then the connectors, Enter/Space open.
    const ITEMS = SECTIONS.length + N
    let kb = -1
    const select = (i: number) => {
      kb = i
      hoverSeg = i < SECTIONS.length ? i : -1
      hoverNode = i >= SECTIONS.length ? i - SECTIONS.length : -1
      showTip()
      const what =
        hoverSeg >= 0
          ? `${SECTIONS[hoverSeg].title} section`
          : `${integrations[hoverNode].label}: ${integrations[hoverNode].note}`
      setLive(`${what.replace(/\.$/, '')}. ${i + 1} of ${ITEMS}. Press Enter to open.`)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        snap = false
        vel += e.key === 'ArrowRight' ? 0.0015 : -0.0015
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        select((Math.max(kb, 0) + (e.key === 'ArrowDown' ? 1 : -1) + ITEMS) % ITEMS)
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (kb >= 0) activate()
      } else return
      e.preventDefault()
    }
    // Only keyboard focus (Tab) starts the keyboard selection. Focus caused by a click or tap must leave the hover alone.
    const onFocus = () => {
      if (isPointerFocus(performance.now(), lastPointerAt)) return
      select(Math.max(kb, 0))
    }
    const onBlur = () => {
      hoverSeg = hoverNode = -1
      showTip()
      setLive('')
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('keydown', onKey)
    canvas.addEventListener('focus', onFocus)
    canvas.addEventListener('blur', onBlur)
    return () => {
      window.clearTimeout(touchLeaveTimer)
      canvas.removeEventListener('keydown', onKey)
      canvas.removeEventListener('focus', onFocus)
      canvas.removeEventListener('blur', onBlur)
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <div className="core-wrap">
      <canvas
        ref={ref}
        className="core"
        tabIndex={0}
        role="application"
        aria-roledescription="interactive diagram"
        aria-label="Integration core. Up and Down arrows step through sections and connectors, Enter opens one, Left and Right arrows spin the core."
      />
      <span className="sr-only" aria-live="polite">
        {live}
      </span>
      {tip && (
        <div
          className="tip"
          style={{ left: compact ? clampTipX(tip.x, ref.current?.clientWidth ?? 0) : tip.x, top: tip.y - 18 }}
        >
          <b>{tip.label}</b>
          <span>{tip.note}</span>
        </div>
      )}
    </div>
  )
}
