import type { SectionId } from './sections'

export const profile = {
  name: 'Divyansh Sharma',
  role: 'Backend & Integration Engineer',
  tagline:
    'I build the plumbing between products: OAuth flows, webhooks, queues and data sync that keep systems talking reliably.',
  location: 'Bengaluru, India · Pune · Gurgaon · Open to remote',
  github: 'https://github.com/divyanshsharma11',
  linkedin: 'https://www.linkedin.com/in/divyansh-sharma1121/',
  email: 'divyanshsharma1121@gmail.com',
  resume: '/Divyansh-Sharma-Resume.pdf',
}

export const certification = {
  name: 'Cloud Digital Leader',
  issuer: 'Google Cloud',
  url: 'https://www.credly.com/badges/6144319d-d69b-4468-98b6-0e0e71f4b3ff/public_url',
}

export const experience = [
  {
    id: 'exp-m32',
    company: 'M32.ai',
    title: 'Integrations Engineer',
    period: 'Dec 2025 – Aug 2026',
    location: 'Remote',
    points: [
      'Built a Make.com connector app from scratch: OAuth2 authorization, webhook and polling triggers, and actions exposing M32 capabilities to automated workflows.',
      'Built the Gmail channel for the AI front desk, using Pub/Sub notifications for event-driven email processing and AI replies inside existing threads.',
      'Integrated Stripe with Connect OAuth, webhook signature verification and multi-account support, exposing subscription, invoice and plan actions to the chat agent.',
      'Integrated Athenahealth and eClinicalWorks through NexHealth for patient lookup, availability and booking across AI Voice Reception and Chat Agent.',
      'Integrated Cloudbeds (guest lookup, availability, reservations) and Clio (two-way contact sync, booking, rescheduling, cancellation).',
      'Added server-side conversion tracking to Google Ads and Meta Conversions API, and built Instagram, Facebook and YouTube comment automation.',
    ],
    tags: ['Node.js', 'OAuth 2.0', 'Webhooks', 'Pub/Sub', 'Polling workers', 'Stripe Connect'],
  },
  {
    id: 'exp-vodex',
    company: 'Vodex.AI',
    title: 'Software Developer',
    period: 'Aug 2024 – Nov 2025',
    location: '',
    points: [
      'Built Cal.com APIs to fetch events, verify users, check available slots and book meetings.',
      'Integrated Gmail OAuth and Google Sheets APIs for batched account-wide reads and updates, and connected HubSpot CRM for data syncing.',
      'Implemented Redis caching with BullMQ task queues to reduce database load, improving system performance by 30%.',
      'Developed JWT authentication middleware and dynamic workflows for booking, API calls, post-processing and email notifications.',
    ],
    tags: ['Node.js', 'Redis', 'BullMQ', 'JWT', 'HubSpot', 'Google APIs'],
  },
  {
    id: 'exp-capgemini',
    company: 'Capgemini Engineering',
    title: 'Associate II Software Engineer',
    period: 'Jul 2022 – Aug 2024',
    location: '',
    points: [
      'Added asynchronous message auditing and monitoring in Node.js.',
      'Moved audit data to BigQuery for easier analysis and lower logging costs.',
      'Built and optimized JSON REST APIs, standardized API templates and wrote utilities for data transformation and backward compatibility.',
      'Migrated data from text files to databases using Java and SQL, improving data access times, and added automated schedulers for periodic updates.',
      'Led the Node.js upgrade across microservices, resolving compatibility issues with minimal downtime.',
      'Built event-driven Python functions on BigQuery data to automate email processing and blacklist management.',
    ],
    tags: ['Node.js', 'REST', 'BigQuery', 'Async processing', 'Python', 'SQL'],
  },
]

export const projects = [
  {
    id: 'calendlyIntegration',
    name: 'calendlyIntegration',
    tagline: 'OAuth2, webhooks and a BullMQ worker',
    blurb:
      'Calendly backend with OAuth2 token exchange/refresh, paginated idempotent event sync, and a webhook receiver that acknowledges fast and processes in a separate BullMQ worker with exponential-backoff retries.',
    tags: ['Node.js', 'Express', 'MongoDB', 'BullMQ', 'Redis', 'Docker', 'Swagger'],
    href: 'https://github.com/divyanshsharma11/calendlyIntegration',
  },
  {
    id: 'luduscore',
    name: 'luduscore',
    tagline: 'explainable game-recommendation package',
    blurb:
      'Explainable, rule-based game recommender published as a pip package. Scores titles across difficulty, genre, playstyle, multiplayer and story weight, and returns the reasons behind every score.',
    tags: ['Python', 'pytest', 'pyproject', 'MIT'],
    href: 'https://github.com/divyanshsharma11/luduscore',
  },
  {
    id: 'hubSpot-Integration',
    name: 'hubSpot-Integration',
    tagline: 'HubSpot CRM sync to MongoDB',
    blurb:
      'Syncs HubSpot CRM contacts into MongoDB, sends welcome emails, and optionally writes conditional notes back to HubSpot. Deployed on Vercel.',
    tags: ['Node.js', 'HubSpot API', 'MongoDB', 'Vercel'],
    href: 'https://github.com/divyanshsharma11/hubSpot-Integration',
  },
  {
    id: 'fetchAndSendStock',
    name: 'fetchAndSendStock',
    tagline: 'Express API that fetches stock data and emails it as JSON or CSV',
    blurb:
      'Express API with endpoints to fetch stock data for a symbol and to email it as a JSON or CSV attachment using Nodemailer. Includes Vercel deployment config.',
    tags: ['Node.js', 'Express', 'Nodemailer', 'Vercel'],
    href: 'https://github.com/divyanshsharma11/fetchAndSendStock',
  },
]

export const skills = [
  { group: 'Languages', items: ['JavaScript / Node.js', 'Python', 'SQL', 'Java'] },
  { group: 'Backend', items: ['Express.js', 'REST APIs', 'OAuth 2.0', 'Webhooks', 'JWT'] },
  { group: 'Data & Queues', items: ['MongoDB', 'MySQL', 'Oracle', 'Supabase', 'Redis', 'BullMQ', 'BigQuery'] },
  { group: 'Cloud & Tools', items: ['GCP Pub/Sub', 'Docker', 'Git', 'GitHub', 'Postman'] },
]

// Connectors on the core's outer ring. Clicking one opens its section and scrolls to a matching card.
// `targets` lists the card ids it can jump to; with more than one, repeated clicks cycle through them.
type Connector = { key: string; label: string; section: SectionId; targets: string[]; note: string }

const m32 = (key: string, label: string, note: string): Connector => ({
  key,
  label,
  section: 'experience',
  targets: ['exp-m32'],
  note: `${note} (M32.ai)`,
})
const vodex = (key: string, label: string, note: string): Connector => ({
  key,
  label,
  section: 'experience',
  targets: ['exp-vodex'],
  note: `${note} (Vodex.AI)`,
})

export const integrations: Connector[] = [
  m32('stripe', 'Stripe Connect', 'Connect OAuth, signed webhooks, multi-account billing actions'),
  {
    key: 'gmail',
    label: 'Gmail',
    section: 'experience',
    targets: ['exp-m32', 'exp-vodex'],
    note: 'M32.ai: event-driven email channel via Pub/Sub. Vodex.AI: Gmail OAuth for sign-in. Click again for the other role.',
  },
  m32('make', 'Make.com', 'Connector app from scratch: OAuth2, webhook + polling triggers'),
  m32('clio', 'Clio', 'Two-way contact sync and appointment booking'),
  m32('cloudbeds', 'Cloudbeds', 'Guest lookup, room availability and reservations'),
  m32('nexhealth', 'NexHealth', 'Integration layer used to reach Athenahealth and eClinicalWorks'),
  m32('athenahealth', 'Athenahealth', 'Patient lookup, appointment booking and availability checks, via NexHealth'),
  m32('eclinicalworks', 'eClinicalWorks', 'Patient lookup, appointment booking and availability checks, via NexHealth'),
  m32('googleads', 'Google Ads', 'Server-side conversion tracking with OAuth onboarding and async postbacks'),
  m32('meta', 'Meta Ads', 'Server-side conversion tracking via the Conversions API'),
  m32('instagram', 'Instagram', 'Keyword comment triggers, public replies, DMs and scheduled follow-ups'),
  m32('facebook', 'Facebook', 'Keyword comment triggers, public replies, DMs and scheduled follow-ups'),
  m32('youtube', 'YouTube', 'Comment automation with a polling worker'),
  vodex('calcom', 'Cal.com', 'Events, slot checks and meeting booking APIs'),
  vodex('hubspot', 'HubSpot', 'OAuth CRM sync'),
  vodex('sheets', 'Google Sheets', 'Batched account-wide reads and updates'),
  ...projects.map((p): Connector => ({
    key: p.id,
    label: p.name,
    section: 'projects',
    targets: [p.id],
    note: `Personal project: ${p.tagline}`,
  })),
]

// Platforms integrated at work are exactly the experience connectors on the ring, so the count can't drift from it.
export const workPlatforms = integrations.filter((i) => i.section === 'experience')

export const stats = [
  { value: '4+', label: 'Years in production backends (since Jul 2022)' },
  { value: String(workPlatforms.length), label: 'Third-party platforms integrated at work' },
  { value: '30%', label: 'Performance gain from Redis + BullMQ' },
  { value: '3', label: 'Companies, from enterprise to AI startups' },
]

export const education = {
  school: 'Presidency University, Bengaluru',
  degree: 'B.Tech',
  period: '2018 – 2022',
  cgpa: '7.81',
}
