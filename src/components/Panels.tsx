import { useEffect, useState } from 'react'
import { ArrowUpRight, Mail, GraduationCap, Copy, Check } from 'lucide-react'
import { profile, experience, projects, skills, education, stats } from '../data'
import PipelineLab from './PipelineLab'
import type { SectionId } from './Graph'

export const TITLES: Record<SectionId, string> = {
  about: 'About',
  experience: 'Experience',
  projects: 'Projects',
  lab: 'Pipeline Lab',
  contact: 'Contact',
}

type Repo = { name: string; pushed_at: string; html_url: string; language: string | null }

function LiveGithub() {
  const [data, setData] = useState<{ repos: number; followers: number; recent: Repo[] } | null>(null)
  useEffect(() => {
    const ctl = new AbortController()
    Promise.all([
      fetch('https://api.github.com/users/divyanshsharma11', { signal: ctl.signal }).then((r) => r.json()),
      fetch('https://api.github.com/users/divyanshsharma11/repos?sort=pushed&per_page=4', { signal: ctl.signal }).then((r) => r.json()),
    ])
      .then(([u, r]) => {
        if (typeof u.public_repos === 'number' && Array.isArray(r))
          setData({ repos: u.public_repos, followers: u.followers, recent: r })
      })
      .catch(() => {})
    return () => ctl.abort()
  }, [])
  if (!data) return null
  return (
    <div className="card live">
      <h3><i className="dot" /> Live from GitHub <span>{data.repos} public repos · {data.followers} followers</span></h3>
      <ul>
        {data.recent.map((r) => (
          <li key={r.name}>
            <a href={r.html_url} target="_blank" rel="noreferrer">{r.name}</a>
            <span>{r.language ?? ''} · pushed {new Date(r.pushed_at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Tags({ items }: { items: string[] }) {
  return <div className="tags">{items.map((t) => <span key={t}>{t}</span>)}</div>
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(profile.email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <>
      <p className="lead-sm">Open to backend and integration engineering roles in Bengaluru or remote.</p>
      <div className="card contact">
        <a className="btn primary" href={`mailto:${profile.email}`}><Mail size={18} /> {profile.email}</a>
        <button className="btn" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}</button>
      </div>
      <div className="card contact">
        <a className="btn" href={profile.github} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={16} /></a>
        <a className="btn" href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={16} /></a>
      </div>
    </>
  )
}

export function PanelBody({ id }: { id: SectionId }) {
  switch (id) {
    case 'about':
      return (
        <>
          <p className="lead-sm">{profile.tagline}</p>
          <p className="muted">
            I'm a backend engineer with 4+ years of experience, focused on connecting products to each other: OAuth
            flows, webhooks, polling workers, queues and data sync. Node.js is my home turf, and I'm GCP certified.
          </p>
          <div className="stat-row">
            {stats.map((s) => <div key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}
          </div>
          <h4>Toolbox</h4>
          {skills.map((g) => (
            <div key={g.group} className="skill-group"><span>{g.group}</span><Tags items={g.items} /></div>
          ))}
          <p className="edu"><GraduationCap size={18} /> {education.degree}, {education.school}</p>
        </>
      )
    case 'experience':
      return (
        <div className="stack">
          {experience.map((e) => (
            <article key={e.company} className="card">
              <h3>{e.title} <span>@ {e.company}</span></h3>
              <ul>{e.points.map((p) => <li key={p}>{p}</li>)}</ul>
              <Tags items={e.tags} />
            </article>
          ))}
        </div>
      )
    case 'projects':
      return (
        <div className="stack">
          <LiveGithub />
          {projects.map((p) => (
            <a key={p.name} className="card project" href={p.href} target="_blank" rel="noreferrer">
              <h3>{p.name} <ArrowUpRight size={18} /></h3>
              <p className="muted">{p.blurb}</p>
              <Tags items={p.tags} />
            </a>
          ))}
        </div>
      )
    case 'lab':
      return <PipelineLab />
    case 'contact':
      return <Contact />
  }
}
