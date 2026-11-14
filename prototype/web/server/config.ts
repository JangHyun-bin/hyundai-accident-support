import { existsSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, resolve, sep } from 'node:path'

export type ServerConfig = { origin: string; databasePath: string; staticDir: string; hostname: string; port: number;
  tls: { cert: string; key: string } | null; trustProxy: boolean }

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  if (!env.CHABUN_ORIGIN) throw new Error('CHABUN_ORIGIN must be the public HTTPS origin')
  const origin = new URL(env.CHABUN_ORIGIN)
  if (origin.protocol !== 'https:' || origin.origin !== env.CHABUN_ORIGIN || origin.username || origin.password) {
    throw new Error('CHABUN_ORIGIN must be an exact HTTPS origin without a trailing slash')
  }
  const staticDir = resolve(env.CHABUN_STATIC_DIR ?? new URL('../dist', import.meta.url).pathname)
  const databasePath = env.CHABUN_DB_PATH ?? resolve(homedir(), '.local/share/chabun/cases.sqlite')
  if (!isAbsolute(databasePath)) throw new Error('CHABUN_DB_PATH must be absolute and outside the public web directory')
  const publicPath = existingRealPath(staticDir)
  const privatePath = existingRealPath(databasePath)
  if (privatePath === publicPath || privatePath.startsWith(`${publicPath}${sep}`)) throw new Error('Database must not be inside CHABUN_STATIC_DIR')
  const sourcePublic = existingRealPath(new URL('../public', import.meta.url).pathname)
  if (privatePath === sourcePublic || privatePath.startsWith(`${sourcePublic}${sep}`)) throw new Error('Database must not be inside the web public directory')
  const port = Number(env.PORT ?? 8787)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535')
  if (!!env.CHABUN_TLS_CERT !== !!env.CHABUN_TLS_KEY) throw new Error('CHABUN_TLS_CERT and CHABUN_TLS_KEY must be supplied together')
  return { origin: origin.origin, databasePath, staticDir, hostname: env.HOST ?? '127.0.0.1', port,
    tls: env.CHABUN_TLS_CERT && env.CHABUN_TLS_KEY ? { cert: env.CHABUN_TLS_CERT, key: env.CHABUN_TLS_KEY } : null,
    trustProxy: env.CHABUN_TRUST_PROXY === 'true' }
}

function existingRealPath(path: string): string {
  const absolute = resolve(path)
  if (existsSync(absolute)) return realpathSync(absolute)
  const parent = dirname(absolute)
  return parent === absolute ? absolute : resolve(existingRealPath(parent), absolute.slice(parent.length + 1))
}
