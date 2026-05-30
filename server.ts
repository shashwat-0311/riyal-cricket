/**
 * Custom server: Next.js + Socket.IO on a single HTTP/HTTPS server.
 *
 * HTTPS mode (required for phone motion sensors):
 *   1. brew install mkcert && mkcert -install
 *   2. mkcert localhost 192.168.x.x  (use your actual LAN IP)
 *   3. Add to .env.local:
 *        SSL_CERT=./localhost+1.pem
 *        SSL_KEY=./localhost+1-key.pem
 *   4. npm run dev  →  https://192.168.x.x:3000
 *
 * Without cert files the server falls back to plain HTTP (fine for laptop-only).
 */

import { createServer as createHttpServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import { readFileSync, existsSync } from 'fs'
import { parse } from 'url'
import { networkInterfaces } from 'os'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types/socket'
import { setupSocketHandlers } from './server/socketHandlers'

const dev  = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT ?? '3000', 10)
const certPath = process.env.SSL_CERT ?? ''
const keyPath  = process.env.SSL_KEY  ?? ''

function getPrimaryLanIp(): string {
  const nets = networkInterfaces()
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return 'localhost'
}

function tryLoadCerts(): { cert: Buffer; key: Buffer } | null {
  if (!certPath || !keyPath) return null
  if (!existsSync(certPath) || !existsSync(keyPath)) {
    console.warn(`[ssl] cert files not found (${certPath}, ${keyPath}) — falling back to HTTP`)
    return null
  }
  return { cert: readFileSync(certPath), key: readFileSync(keyPath) }
}

async function main(): Promise<void> {
  const nextApp = next({ dev, hostname: '0.0.0.0', port })
  const handle  = nextApp.getRequestHandler()
  await nextApp.prepare()

  const requestHandler = (req: Parameters<typeof handle>[0], res: Parameters<typeof handle>[1]) => {
    if (!req.url) return
    handle(req, res, parse(req.url, true))
  }

  const certs   = tryLoadCerts()
  const useHttps = certs !== null
  const server  = useHttps
    ? createHttpsServer(certs!, requestHandler)
    : createHttpServer(requestHandler)

  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors:               { origin: '*', methods: ['GET', 'POST'] },
    transports:         ['websocket', 'polling'],
    maxHttpBufferSize:  64 * 1_024,
  })

  setupSocketHandlers(io)

  server.listen(port, '0.0.0.0', () => {
    const lanIp   = getPrimaryLanIp()
    const scheme  = useHttps ? 'https' : 'http'
    const warning = useHttps ? '' : '  ⚠  HTTP only — phone sensors need HTTPS'

    console.log('\n╔══════════════════════════════════════════╗')
    console.log('║          🏏 Cricket Game Server           ║')
    console.log('╠══════════════════════════════════════════╣')
    console.log(`║  Local   → ${scheme}://localhost:${port}         ║`)
    console.log(`║  Network → ${scheme}://${lanIp}:${port}  ║`)
    if (warning) console.log(`║${warning.padEnd(44)}║`)
    console.log('╚══════════════════════════════════════════╝\n')

    if (!useHttps) {
      console.log('  To enable HTTPS (needed for phone motion sensors):')
      console.log('    brew install mkcert && mkcert -install')
      console.log(`    mkcert localhost ${lanIp}`)
      console.log('    # Then set SSL_CERT and SSL_KEY in .env.local\n')
    }
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
