import { NextResponse } from 'next/server'
import { networkInterfaces } from 'os'

interface NetworkInfoResponse {
  localIps: string[]
  primaryIp: string
  port: number
}

/**
 * Returns the server's LAN IP addresses so the game screen can construct
 * a QR code URL that the phone (on the same Wi-Fi) can actually reach.
 *
 * Example response:
 *   { "localIps": ["192.168.1.42"], "primaryIp": "192.168.1.42", "port": 3000 }
 */
export function GET(): NextResponse<NetworkInfoResponse> {
  const nets = networkInterfaces()
  const localIps: string[] = []

  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIps.push(iface.address)
      }
    }
  }

  const port = parseInt(process.env.PORT ?? '3000', 10)

  return NextResponse.json({
    localIps,
    primaryIp: localIps[0] ?? 'localhost',
    port,
  })
}
