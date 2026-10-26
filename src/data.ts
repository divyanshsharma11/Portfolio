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

export const stats = [
  { value: '4+', label: 'Years in production backends (since Jul 2022)' },
  { value: '16', label: 'Third-party platforms integrated at work' },
  { value: '30%', label: 'Performance gain from Redis + BullMQ' },
  { value: '3', label: 'Companies, from enterprise to AI startups' },
]

export const experience = [
  {
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
    company: 'Capgemini Engineering',
    title: 'Associate II Software Engineer',
    period: 'Jul 2022 – Aug 2024',
    location: '',
    points: [
      'Added asynchronous message auditing and monitoring in Node.js.',
      'Moved audit data to BigQuery for easier analysis and lower logging costs.',
      'Built and optimized JSON REST APIs, standardized API templates and wrote utilities for data transformation and backward compatibility.',
    ],
    tags: ['Node.js', 'REST', 'BigQuery', 'Async processing'],
  },
]

export const projects = [
  {
    name: 'calendlyIntegration',
    blurb:
      'Calendly backend with OAuth2 token exchange/refresh, paginated idempotent event sync, and a webhook receiver that acknowledges fast and processes in a separate BullMQ worker with exponential-backoff retries.',
    tags: ['Node.js', 'Express', 'MongoDB', 'BullMQ', 'Redis', 'Docker', 'Swagger'],
    href: 'https://github.com/divyanshsharma11/calendlyIntegration',
  },
  {
    name: 'luduscore',
    blurb:
      'Explainable, rule-based game recommender published as a pip package. Scores titles across difficulty, genre, playstyle, multiplayer and story weight, and returns the reasons behind every score.',
    tags: ['Python', 'pytest', 'pyproject', 'MIT'],
    href: 'https://github.com/divyanshsharma11/luduscore',
  },
  {
    name: 'hubSpot-Integration',
    blurb:
      'Syncs HubSpot CRM contacts into MongoDB, sends welcome emails, and optionally writes conditional notes back to HubSpot. Deployed on Vercel.',
    tags: ['Node.js', 'HubSpot API', 'MongoDB', 'Vercel'],
    href: 'https://github.com/divyanshsharma11/hubSpot-Integration',
  },
  {
    name: 'fetchAndSendStock',
    blurb: 'Web scraper that fetches stock data and emails it on a schedule.',
    tags: ['Node.js', 'Scraping', 'Email'],
    href: 'https://github.com/divyanshsharma11/fetchAndSendStock',
  },
]

export const skills = [
  { group: 'Languages', items: ['JavaScript / Node.js', 'Python', 'SQL', 'Java'] },
  { group: 'Backend', items: ['Express.js', 'REST APIs', 'OAuth 2.0', 'Webhooks', 'JWT'] },
  { group: 'Data & Queues', items: ['MongoDB', 'MySQL', 'Oracle', 'Supabase', 'Redis', 'BullMQ', 'BigQuery'] },
  { group: 'Cloud & Tools', items: ['GCP Pub/Sub', 'Docker', 'Git', 'GitHub', 'Postman'] },
]

// Shown on the core's outer ring. All from work experience except Calendly, which is a personal project.
export const integrations: { key: string; label: string; section: SectionId; note: string }[] = [
  {
    key: 'stripe',
    label: 'Stripe Connect',
    section: 'experience',
    note: 'Connect OAuth, signed webhooks, multi-account billing actions (M32.ai)',
  },
  {
    key: 'gmail',
    label: 'Gmail',
    section: 'experience',
    note: 'Event-driven email channel via Pub/Sub with AI replies in-thread (M32.ai)',
  },
  {
    key: 'make',
    label: 'Make.com',
    section: 'experience',
    note: 'Connector app from scratch: OAuth2, webhook + polling triggers (M32.ai)',
  },
  { key: 'clio', label: 'Clio', section: 'experience', note: 'Two-way contact sync and appointment booking (M32.ai)' },
  {
    key: 'cloudbeds',
    label: 'Cloudbeds',
    section: 'experience',
    note: 'Guest lookup, room availability and reservations (M32.ai)',
  },
  {
    key: 'nexhealth',
    label: 'NexHealth',
    section: 'experience',
    note: 'Athenahealth + eClinicalWorks patient lookup and booking (M32.ai)',
  },
  {
    key: 'meta',
    label: 'Meta Ads',
    section: 'experience',
    note: 'Server-side conversion tracking via Conversions API (M32.ai)',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    section: 'experience',
    note: 'Comment automation with a polling worker (M32.ai)',
  },
  {
    key: 'calcom',
    label: 'Cal.com',
    section: 'experience',
    note: 'Events, slot checks and meeting booking APIs (Vodex.AI)',
  },
  {
    key: 'hubspot',
    label: 'HubSpot',
    section: 'experience',
    note: 'OAuth CRM sync (Vodex.AI) and a personal sync project',
  },
  {
    key: 'sheets',
    label: 'Google Sheets',
    section: 'experience',
    note: 'Batched account-wide reads and updates (Vodex.AI)',
  },
  {
    key: 'calendly',
    label: 'Calendly',
    section: 'projects',
    note: 'Personal project: OAuth2 + webhooks + BullMQ worker backend',
  },
]

export const education = {
  school: 'Presidency University, Bengaluru',
  degree: 'B.Tech',
  period: '2018 – 2022',
  cgpa: '7.81',
}
