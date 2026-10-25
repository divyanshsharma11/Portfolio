export const profile = {
  name: 'Divyansh Sharma',
  role: 'Backend & Integration Engineer',
  tagline:
    'I build the plumbing between products: OAuth flows, webhooks, queues and data sync that keep systems talking reliably.',
  location: 'Bengaluru, India · Open to remote',
  github: 'https://github.com/divyanshsharma11',
  linkedin: 'https://www.linkedin.com/in/divyansh-sharma1121/',
  email: 'divyanshsharma1121@gmail.com',
}

export const stats = [
  { value: '4+', label: 'Years building backends' },
  { value: '30%', label: 'Performance gain from Redis + BullMQ' },
  { value: '15+', label: 'Third-party integrations shipped' },
  { value: 'GCP', label: 'Certified' },
]

export const experience = [
  {
    company: 'M32 AI',
    title: 'Integration Engineer',
    points: [
      'Built integrations for an AI voice receptionist, chat agent and workflow builder.',
      'Shipped a Make.com connector app, Stripe Connect, Clio, Cloudbeds and Gmail via Pub/Sub.',
      'Connected Athenahealth and eClinicalWorks through NexHealth for healthcare workflows.',
      'Added Google Ads / Meta conversion tracking and Instagram, Facebook and YouTube automation.',
    ],
    tags: ['Node.js', 'OAuth 2.0', 'Webhooks', 'GCP Pub/Sub', 'Stripe'],
  },
  {
    company: 'Vodex AI',
    title: 'Software Developer',
    points: [
      'Built Cal.com, Gmail, Google Sheets and HubSpot integrations for a voice AI sales platform.',
      'Introduced Redis caching and BullMQ queues, improving performance by 30%.',
    ],
    tags: ['Node.js', 'Redis', 'BullMQ', 'HubSpot', 'MongoDB'],
  },
  {
    company: 'Capgemini Engineering',
    title: 'Associate → Associate II Software Engineer',
    points: [
      'Developed Node.js microservices and REST APIs.',
      'Implemented BigQuery audit logging and Python automation.',
    ],
    tags: ['Node.js', 'REST', 'BigQuery', 'Python'],
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

export const education = {
  school: 'Presidency University, Bangalore',
  degree: 'B.Tech',
}
