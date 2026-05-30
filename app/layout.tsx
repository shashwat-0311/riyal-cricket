import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cricket Game',
  description: 'Browser-based cricket game with smartphone motion controls',
  // Prevent the phone browser from prompting to add to home screen in odd ways
  applicationName: 'Cricket Game',
}

export const viewport: Viewport = {
  // Critical for the phone controller: prevents zoom on input focus
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Keeps the status bar dark on iOS
  themeColor: '#020617',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
