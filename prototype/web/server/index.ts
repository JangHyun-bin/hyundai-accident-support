import { createApp } from './app'
import { readConfig } from './config'
import { CaseDatabase } from './database'
import { MAX_BODY_BYTES } from './requests'

process.umask(0o077)
const config = readConfig()
const store = new CaseDatabase(config.databasePath)
const app = createApp(config, store)
const server = Bun.serve({ hostname: config.hostname, port: config.port, maxRequestBodySize: MAX_BODY_BYTES,
  idleTimeout: 60,
  ...(config.tls ? { tls: { cert: Bun.file(config.tls.cert), key: Bun.file(config.tls.key) } } : {}),
  fetch(request, connection) {
    const direct = connection.requestIP(request)?.address ?? 'unknown'
    const peer = config.trustProxy ? request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Real-IP') ?? direct : direct
    return app.fetch(request, peer)
  },
  error() { return new Response('Service unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } }) },
})

async function stop(): Promise<void> {
  await server.stop(false)
  store.close()
}
process.once('SIGINT', () => { void stop() })
process.once('SIGTERM', () => { void stop() })
process.stdout.write(`${JSON.stringify({ event: 'listening', hostname: config.hostname, port: server.port, origin: config.origin })}\n`)
