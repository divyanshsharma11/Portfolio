import { useEffect, useRef, useState } from 'react'
import { SECTIONS, type SectionId } from '../sections'
import { integrations } from '../data'
import { system } from '../lib/system'

const TAU = Math.PI * 2
const SPAN = TAU / SECTIONS.length
const GAP = 0.06
const POWER_MS = 1800
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
type Props = { active: SectionId | null; onOpen: (s: SectionId) => void; dim: boolean }

export default function Core({ active, onOpen, dim }: Props) {
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
    const packets: Packet[] = []
    const arrivals: number[] = []

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

    // The core sits beside the hero on wide screens, beside an open panel, or centred behind everything on small screens.
    const layout = () => {
      const panel = !!activeRef.current
      const heroW = !panel && w >= 1280 ? Math.min(780, w * 0.5) : 0
      const panelW = panel && w >= 1000 ? Math.min(600, w) : 0
      const areaW = w - heroW - panelW
      const tx = heroW + areaW / 2
      const ty = h * 0.5
      const tR = Math.max(120, Math.min(areaW / 2 - 110, (h - 110) / 2 - 40))
      const k = placed ? 0.08 : 1
      placed = true
      cx += (tx - cx) * k
      cy += (ty - cy) * k
      R += (tR - R) * k
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
      layout()

      const s = system.get()
      const down = s.breaker === 'open' || s.feed === 'offline'
      const recovering = s.breaker === 'half-open'
      intensity += ((down ? 0.38 : recovering ? 0.68 : 1) * ease(p * 1.4) - intensity) * 0.06
      const I = intensity * (down ? 0.85 + Math.random() * 0.15 : 1)
      const fs = Math.max(9, Math.min(11, R * 0.035))

      if (!reduced) {
        outerRot -= dt * 0.00005
        tickRot += dt * 0.00014
      }
      const act = activeRef.current
      if (act) {
        const idx = SECTIONS.findIndex((x) => x.id === act)
        let target = -Math.PI / 2 - (idx + 0.5) * SPAN
        target += TAU * Math.round((rot - target) / TAU)
        rot += (target - rot) * 0.08
      } else if (!reduced) rot += dt * 0.00003

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

      // integration connectors and their conduits
      for (let n = 0; n < N; n++) {
        const a = ease((p - 0.7 - n * 0.02) / 0.12)
        if (a <= 0) continue
        const { x, y, a: ang } = nodePos(n)
        const it = integrations[n]
        const col = COLOR[it.section]
        const hot = hoverNode === n || (hoverSeg >= 0 && SECTIONS[hoverSeg].id === it.section)
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
        ctx.textAlign = c > 0.35 ? 'left' : c < -0.35 ? 'right' : 'center'
        ctx.textBaseline = sn > 0.35 ? 'top' : sn < -0.35 ? 'bottom' : 'middle'
        ctx.font = `500 ${fs}px ${MONO}`
        ctx.fillStyle = hot ? '#ecebe6' : 'rgba(154,160,173,0.85)'
        ctx.fillText(it.label, cx + c * (R * 0.82 + 14), cy + sn * (R * 0.82 + 14))
      }
      ctx.globalAlpha = 1

      // energy packets flowing inward; while degraded, most of them fail on the way
      if (p >= 1 && !reduced) {
        spawn -= dt
        if (spawn <= 0) {
          packets.push({
            node: Math.floor(Math.random() * N),
            t: 0,
            speed: 0.35 + Math.random() * 0.25,
            drop: down && Math.random() < 0.65 ? 0.25 + Math.random() * 0.35 : 2,
          })
          spawn = (down ? 520 : 240) * (hoverSeg >= 0 || hoverNode >= 0 ? 0.5 : 1)
        }
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i]
        pk.t += (dt / 1000) * pk.speed * (down ? 0.6 : 1)
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
        const broken = down && sec.id === 'projects'
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
        const hue = down ? '255,93,115' : '255,181,71'
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

      // readouts: every value here is the site's real state
      const hudA = ease((p - 0.85) / 0.15)
      if (hudA > 0 && R > 150) {
        ctx.globalAlpha = hudA
        const feedCol = s.feed === 'live' ? OK : s.feed === 'cached' ? WARN : s.feed === 'offline' ? BAD : '#9aa0ad'
        const rows: [number, string, string, string][] = [
          [
            -2.35,
            'CORE',
            down ? 'DEGRADED' : recovering ? 'RECOVERING' : 'STABLE',
            down ? BAD : recovering ? WARN : OK,
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
          ctx.strokeStyle = 'rgba(150,160,190,0.35)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x0, y0)
          ctx.lineTo(x1, y1)
          ctx.lineTo(x2, y1)
          ctx.stroke()
          const tx = x2 + (right ? 6 : -6)
          ctx.textAlign = right ? 'left' : 'right'
          ctx.textBaseline = 'middle'
          ctx.font = `500 ${fs}px ${MONO}`
          ctx.fillStyle = 'rgba(154,160,173,0.9)'
          ctx.fillText(k, tx, y1 - fs * 0.7)
          ctx.font = `600 ${fs + 1}px ${MONO}`
          ctx.fillStyle = col
          ctx.fillText(v, tx, y1 + fs * 0.6)
        }
        ctx.globalAlpha = 1
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame((t) => {
      last = t
      frame(t)
    })

    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect()
      mouse.x = e.clientX - b.left
      mouse.y = e.clientY - b.top
      hit()
      canvas.style.cursor = hoverSeg >= 0 || hoverNode >= 0 ? 'pointer' : 'default'
      if (hoverNode !== tipNode) {
        tipNode = hoverNode
        if (hoverNode < 0) setTip(null)
        else {
          const { x, y } = nodePos(hoverNode)
          setTip({ label: integrations[hoverNode].label, note: integrations[hoverNode].note, x, y })
        }
      }
    }
    const onLeave = () => {
      mouse.x = mouse.y = -1e4
      hoverSeg = hoverNode = tipNode = -1
      setTip(null)
    }
    const onClick = () => {
      if (hoverSeg >= 0) openRef.current(SECTIONS[hoverSeg].id)
      else if (hoverNode >= 0) openRef.current(integrations[hoverNode].section)
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <>
      <canvas
        ref={ref}
        className={`core ${dim ? 'dim' : ''}`}
        role="img"
        aria-label="Integration core: sections and integrations orbiting a central core"
      />
      {tip && (
        <div className="tip" style={{ left: tip.x, top: tip.y - 18 }}>
          <b>{tip.label}</b>
          <span>{tip.note}</span>
        </div>
      )}
    </>
  )
}
