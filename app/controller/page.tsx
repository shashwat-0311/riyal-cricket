import { ControllerScreen } from '@/components/controller/ControllerScreen'

/**
 * Manual entry point: phone navigates here and types the room code.
 * No initialRoomCode → ControllerScreen renders JoinRoom first.
 */
export default function ControllerPage() {
  return <ControllerScreen />
}
