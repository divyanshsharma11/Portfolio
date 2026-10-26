import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Production-only: the dev server needs inline scripts and a websocket for hot reload, so it can't run under this policy.
// vercel.json sends the same policy as a response header (plus frame-ancestors, which only works as a header):
// change both together.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // framer-motion and the SVG wires set inline styles
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://api.github.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-csp',
      apply: 'build',
      transformIndexHtml: () => [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
      ],
    },
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
