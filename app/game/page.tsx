import { GameScreen } from '@/components/game/GameScreen'

/**
 * Laptop game screen.
 * GameScreen is a client component (uses Socket.IO hooks), so this page
 * is a thin server-component wrapper — keeps metadata on the server side.
 */
export default function GamePage() {
  return <GameScreen />
}
