import { useEffect, useRef, useState } from 'react'

const STAGES = ['Webhook', 'API', 'Queue', 'Worker', 'MongoDB']
type Status = 'running' | 'retrying' | 'done' | 'deduped' | 'dead'
type Job = { id: number; key: string; stage: number; attempt: number; status: Status }
type Line = { n: number; text: string; tone: 'ok' | 'warn' | 'err' | 'info' }

const MAX_ATTEMPTS = 4
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function PipelineLab() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [log, setLog] = useState<Line[]>([])
  const [outage, setOutage] = useState(false)
  const outageRef = useRef(false)
  const seq = useRef(0)
  const lines = useRef(0)
  const lastKey = useRef<string | null>(null)
  const processed = useRef(new Set<string>())
  const alive = useRef(true)
  const [stats, setStats] = useState({ done: 0, retries: 0, deduped: 0, dead: 0 })

  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { outageRef.current = outage }, [outage])

  const say = (text: string, tone: Line['tone'] = 'info') =>
    alive.current && setLog((l) => [{ n: ++lines.current, text, tone }, ...l].slice(0, 40))
  const patch = (id: number, p: Partial<Job>) =>
    alive.current && setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j)))
  const bump = (k: keyof typeof stats) => alive.current && setStats((s) => ({ ...s, [k]: s[k] + 1 }))

  const fire = async (dupOf?: string) => {
    const id = ++seq.current
    const key = dupOf ?? `invitee.created#${1000 + id}`
    lastKey.current = key
    setJobs((js) => [{ id, key, stage: 0, attempt: 1, status: 'running' as Status }, ...js].slice(0, 5))
    say(`POST /webhooks/calendly  ${key}`)
    await sleep(350)
    patch(id, { stage: 1 }); say('API: persisted WebhookLog, returned 200 in <50ms', 'ok')
    await sleep(500)
    patch(id, { stage: 2 }); say('Enqueued BullMQ job (attempts: 4, backoff: exponential)')
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await sleep(550)
      patch(id, { stage: 3, attempt, status: 'running' })
      say(`Worker: processing attempt ${attempt}/${MAX_ATTEMPTS}`)
      await sleep(650)
      if (outageRef.current) {
        if (attempt === MAX_ATTEMPTS) {
          patch(id, { status: 'dead', stage: 3 }); bump('dead')
          say('MongoDB unavailable. Retries exhausted, moved to failed set for inspection', 'err')
          return
        }
        const wait = 600 * 2 ** (attempt - 1)
        patch(id, { status: 'retrying', stage: 2 }); bump('retries')
        say(`MongoDB unavailable. Retry in ${wait}ms (exponential backoff)`, 'warn')
        await sleep(wait)
        continue
      }
      patch(id, { stage: 4 })
      await sleep(400)
      if (processed.current.has(key)) {
        patch(id, { status: 'deduped' }); bump('deduped')
        say('Idempotent upsert matched an existing event. No duplicate written', 'ok')
      } else {
        processed.current.add(key)
        patch(id, { status: 'done' }); bump('done')
        say('Event upserted, WebhookLog marked processed', 'ok')
      }
      return
    }
  }

  return (
    <div className="lab">
      <p className="sim-badge">
        <b>Simulation</b> runs in your browser, no real servers involved. Modeled on my{' '}
        <a href="https://github.com/divyanshsharma11/calendlyIntegration" target="_blank" rel="noreferrer">
          Calendly integration service
        </a>.
      </p>
      <p className="muted">
        The architecture: acknowledge the webhook fast, process in a separate worker, retry with backoff, upsert
        idempotently. Break it and watch it recover.
      </p>
      <div className="lab-controls">
        <button className="btn primary" onClick={() => fire()}>Fire webhook</button>
        <button className="btn" onClick={() => lastKey.current && fire(lastKey.current)} disabled={!lastKey.current}>
          Send duplicate
        </button>
        <label className={`switch ${outage ? 'on' : ''}`}>
          <input type="checkbox" checked={outage} onChange={(e) => setOutage(e.target.checked)} />
          <span /> Simulate MongoDB outage
        </label>
      </div>

      <div className="lab-stats">
        <div><b>{stats.done}</b> processed</div>
        <div><b>{stats.retries}</b> retries</div>
        <div><b>{stats.deduped}</b> deduped</div>
        <div><b className={stats.dead ? 'bad' : ''}>{stats.dead}</b> failed</div>
      </div>

      <div className="jobs">
        {jobs.length === 0 && <div className="empty">No events yet. Fire a webhook.</div>}
        {jobs.map((j) => (
          <div key={j.id} className={`job ${j.status}`}>
            <div className="job-head"><code>{j.key}</code><em>{j.status}{j.status === 'retrying' ? ` (attempt ${j.attempt})` : ''}</em></div>
            <div className="track">
              {STAGES.map((s, i) => (
                <div key={s} className={`stage ${i <= j.stage ? 'lit' : ''} ${i === j.stage ? 'cur' : ''}`}>
                  <i />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="log" aria-live="polite">
        {log.map((l) => <div key={l.n} className={l.tone}><span>{String(l.n).padStart(3, '0')}</span> {l.text}</div>)}
      </div>
    </div>
  )
}
