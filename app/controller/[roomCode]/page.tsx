import { ControllerScreen } from '@/components/controller/ControllerScreen'

interface Props {
  params: Promise<{ roomCode: string }>
}

/**
 * QR-scan entry point.
 * URL pattern: /controller/ABC123
 * The roomCode param is passed to ControllerScreen which auto-joins on mount.
 */
export default async function ControllerRoomPage({ params }: Props) {
  const { roomCode } = await params
  return <ControllerScreen initialRoomCode={roomCode.toUpperCase()} />
}
