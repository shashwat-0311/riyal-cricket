/**
 * Crease markings for one end of the pitch.
 *
 * Each end has:
 *  - Bowling / batting crease  — at the stump line (z = ±STUMP_Z)
 *  - Popping crease            — 1.22 m in front (towards centre)
 *  - Return creases            — connect the two across the pitch
 *
 * `endZ`    : signed Z position of the stump line  (+STUMP_Z or -STUMP_Z)
 * `facing`  : +1 if stumps are at positive Z (popping crease extends towards -Z),
 *             -1 for the other end
 */

interface Props {
  endZ: number
  facing: 1 | -1
}

const LINE_W      = 0.05   // width of each painted line
const CREASE_HALF = 1.83   // half-width of batting crease (1.83 m each side = 12 ft)
const POPPING_OFFSET = 1.22 // metres forward of stump line (actual rule: 4 ft)
const RETURN_HALF = 2.44   // length of return crease towards bowling end

export function Crease({ endZ, facing }: Props) {
  const poppingZ = endZ + facing * -POPPING_OFFSET
  // Return crease runs from popping crease back past batting crease
  const returnCentreZ = endZ + facing * (RETURN_HALF / 2 - POPPING_OFFSET)

  return (
    <group position={[0, 0.003, 0]}>
      {/* Batting / bowling crease */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, endZ]}>
        <planeGeometry args={[CREASE_HALF * 2, LINE_W]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Popping crease */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, poppingZ]}>
        <planeGeometry args={[CREASE_HALF * 2 + 1, LINE_W]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Left return crease */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-CREASE_HALF, 0, returnCentreZ]}>
        <planeGeometry args={[LINE_W, RETURN_HALF]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Right return crease */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CREASE_HALF, 0, returnCentreZ]}>
        <planeGeometry args={[LINE_W, RETURN_HALF]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  )
}
