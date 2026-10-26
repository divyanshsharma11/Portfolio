import { useEffect, useState } from 'react'
import { ArrowUpRight, Mail, GraduationCap, Copy, Check, BadgeCheck, FileText } from 'lucide-react'
import { useResume } from '../lib/resume'
import { profile, experience, projects, skills, education, stats, certification } from '../data'
import { ago, useNow, useSystem } from '../lib/system'
import PipelineLab from './PipelineLab'
import type { SectionId } from '../sections'

function LiveGithub() {
  const { github, feed, breaker } = useSystem()
  useNow() // keeps the "… ago" times current
  return (
    <div className={`card live ${feed}`}>
      <h3>
        <i className="dot" /> GitHub <b className="badge">{feed}</b>
        {github && (
          <span>
            {github.repos} public repos · {github.followers} followers
          </span>
        )}
      </h3>
      {feed === 'cached' && github && (
        <p className="note">
          GitHub is unreachable (circuit breaker {breaker}). Showing data cached {ago(github.fetchedAt)}.
        </p>
      )}
      {feed === 'offline' && (
        <p className="note">GitHub is unreachable and nothing is cached yet. The rest of the site keeps working.</p>
      )}
      {github && (
        <ul>
          {github.recent.map((r) => (
            <li key={r.name}>
              <a href={r.html_url} target="_blank" rel="noreferrer">
                {r.name}
              </a>
              <span>
                {r.language ?? ''} · pushed {ago(r.pushed_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="tags">
      {items.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  )
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const resume = useResume()
  const copy = () => {
    navigator.clipboard?.writeText(profile.email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <>
      <p className="lead-sm">Open to backend and integration engineering roles in Bengaluru Pune Gurgaon or remote.</p>
      <div className="card contact">
        <a className="btn primary" href={`mailto:${profile.email}`}>
          <Mail size={18} /> {profile.email}
        </a>
        <button className="btn" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="card contact">
        <a className="btn" href={profile.github} target="_blank" rel="noreferrer">
          GitHub <ArrowUpRight size={16} />
        </a>
        <a className="btn" href={profile.linkedin} target="_blank" rel="noreferrer">
          LinkedIn <ArrowUpRight size={16} />
        </a>
        {resume && (
          <a className="btn" href={resume} target="_blank" rel="noreferrer">
            <FileText size={16} /> Résumé (PDF)
          </a>
        )}
      </div>
    </>
  )
}

// Opening a section from a core connector scrolls to the matching card and flashes it; otherwise start at the top.
function useFocusCard(section: SectionId, focus: { id: string; n: number } | null) {
  useEffect(() => {
    const scroller = document.querySelector('.panel-body')
    const card = focus ? document.getElementById(focus.id) : null
    if (!card) return void scroller?.scrollTo({ top: 0 })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => {
      card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      card.classList.remove('flash')
      void card.offsetWidth // restart the animation when the same card is targeted twice
      card.classList.add('flash')
    }, 120) // let the panel finish mounting before measuring
    return () => clearTimeout(t)
  }, [section, focus])
}

export function PanelBody({ id, focus }: { id: SectionId; focus: { id: string; n: number } | null }) {
  useFocusCard(id, focus)
  switch (id) {
    case 'about':
      return (
        <>
          <p className="lead-sm">{profile.tagline}</p>
          <p className="muted">
            I'm a backend engineer with 4+ years of experience, focused on connecting products to each other: OAuth
            flows, webhooks, polling workers, queues and data sync. Most recently I built integrations for AI voice and
            chat agents across healthcare, hospitality, legal and payments. Node.js is my home turf.
          </p>
          <div className="stat-row">
            {stats.map((s) => (
              <div key={s.label}>
                <b>{s.value}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <h4>Toolbox</h4>
          {skills.map((g) => (
            <div key={g.group} className="skill-group">
              <span>{g.group}</span>
              <Tags items={g.items} />
            </div>
          ))}
          <h4>Credentials</h4>
          <a id="credentials" className="edu cert" href={certification.url} target="_blank" rel="noreferrer">
            <BadgeCheck size={18} /> {certification.name} · {certification.issuer} <ArrowUpRight size={14} />
          </a>
          <p className="edu">
            <GraduationCap size={18} /> {education.degree}, {education.school} · {education.period} · CGPA{' '}
            {education.cgpa}
          </p>
        </>
      )
    case 'experience':
      return (
        <div className="stack">
          {experience.map((e) => (
            <article key={e.company} id={e.id} className="card">
              <h3>
                {e.title} <span>@ {e.company}</span>
              </h3>
              <p className="period">
                {e.period}
                {e.location && ` · ${e.location}`}
              </p>
              <ul>
                {e.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
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
            <a key={p.name} id={p.id} className="card project" href={p.href} target="_blank" rel="noreferrer">
              <h3>
                {p.name} <ArrowUpRight size={18} />
              </h3>
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
